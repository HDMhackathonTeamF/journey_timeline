import httpx
import asyncio
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from app.schemas.transit import TransitPlanResponse, TransitRoute, TransitLeg
from app.core.config import settings

JST = timezone(timedelta(hours=9))

async def resolve_location_to_id(client: httpx.AsyncClient, base_url: str, location: str) -> str:
    """Resolve a text location to an ID or geo coordinate using the suggest API."""
    if ":" in location:
        return location # Already an ID or geo:lat,lng

    url = f"{base_url}/locations/suggest"
    query = location.removesuffix("駅").strip() or location
    try:
        res = await client.get(url, params={"q": query, "limit": 20}, timeout=5.0)
        res.raise_for_status()
        data = res.json()
        stations = data.get("stations", [])
        rail_stations = [station for station in stations if station.get("kind") == "station"]
        candidates = rail_stations or stations
        if candidates:
            return candidates[0].get("id", location)

        return location
    except Exception:
        return location # Fallback to original text

def _format_secs(secs: int, service_date: str) -> str:
    if not secs and secs != 0:
        return ""
    base = datetime.strptime(service_date, "%Y%m%d").replace(tzinfo=JST)
    return (base + timedelta(seconds=secs)).isoformat()

async def fetch_single_plan(client: httpx.AsyncClient, url: str, params: dict, strategy: str, service_date: str) -> list[TransitRoute]:
    """Fetch a single plan with a specific strategy."""
    req_params = {**params, "strategy": strategy}
    try:
        res = await client.get(url, params=req_params, timeout=10.0)
        if res.status_code != 200:
            return []
        data = res.json()
        
        extracted_routes = []
        options = data.get("options", [])
             
        for opt in options:
            journey = opt.get("journey", {})
            legs = []
            
            for ext_leg in journey.get("legs", []):
                # Extract line name (may be under 'line', 'route', or we just use 'kind')
                line_name = ext_leg.get("routeName") or ext_leg.get("kind", "transit")
                if "line" in ext_leg and isinstance(ext_leg["line"], dict):
                    line_name = ext_leg["line"].get("name", line_name)
                
                legs.append(TransitLeg(
                    line_name=line_name,
                    platform=None,
                    from_station=ext_leg.get("from", {}).get("name", ""),
                    to_station=ext_leg.get("to", {}).get("name", ""),
                    departure_time=_format_secs(ext_leg.get("departureSecs"), service_date),
                    arrival_time=_format_secs(ext_leg.get("arrivalSecs"), service_date)
                ))
            
            summary_labels = {
                "fastest": "最速ルート",
                "lowestFare": "料金が安いルート",
                "fewestTransfers": "乗換が少ないルート",
            }
            extracted_routes.append(TransitRoute(
                summary=summary_labels.get(strategy, "おすすめルート"),
                strategy_type=strategy,
                departure_time=_format_secs(journey.get("departureSecs"), service_date),
                arrival_time=_format_secs(journey.get("arrivalSecs"), service_date),
                duration_minutes=int(journey.get("durationSecs", 0) // 60),
                transfers_count=int(journey.get("transferCount", 0)),
                total_fare=0, # Fare was empty in tests, placeholder for now
                legs=legs
            ))
            
            # We only need the top 1 route per strategy for the "simple" BFF approach
            break
            
        return extracted_routes
    except Exception as e:
         print(f"Error fetching strategy {strategy}: {e}")
         return []

async def fetch_transit_plan(
    from_location: str, 
    to_location: str, 
    time_str: str | None = None,
    date_str: str | None = None,
    type_str: str | None = None,
    allow_modes: str | None = None,
    avoid_modes: str | None = None,
    via_str: str | None = None,
    max_transfers: int | None = None,
    avoid_walk: bool | None = None
) -> TransitPlanResponse:
    # Get the base URL without /plan
    base_url = settings.TRANSIT_API_BASE_URL.replace("/plan", "")
    plan_url = f"{base_url}/guidance/plan"
    
    headers = {}
    if settings.TRANSIT_API_KEY:
         headers["Authorization"] = f"Bearer {settings.TRANSIT_API_KEY}"

    try:
        async with httpx.AsyncClient(headers=headers) as client:
            # 1. Resolve locations
            from_id = await resolve_location_to_id(client, base_url, from_location)
            to_id = await resolve_location_to_id(client, base_url, to_location)
            
            # 2. Convert the browser's ISO datetime to the Transit API format.
            service_date = date_str
            service_time = time_str
            if time_str and "T" in time_str:
                parsed = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=JST)
                parsed = parsed.astimezone(JST)
                service_date = parsed.strftime("%Y%m%d")
                service_time = parsed.strftime("%H:%M")
            if not service_date:
                service_date = datetime.now(JST).strftime("%Y%m%d")

            # 3. Prepare base parameters
            params = {
                "from": from_id,
                "to": to_id,
                "date": service_date,
            }
            if service_time:
                params["time"] = service_time
            if type_str:
                params["type"] = type_str
            if allow_modes:
                params["allowModes"] = allow_modes
            if avoid_modes:
                params["avoidModes"] = avoid_modes
            if via_str:
                params["via"] = via_str
            if max_transfers is not None:
                params["maxTransfers"] = max_transfers
            if avoid_walk is not None:
                params["avoidWalk"] = str(avoid_walk).lower()

                
            # 4. Parallel fetching for different strategies
            strategies = ["fastest", "lowestFare", "fewestTransfers"]
            tasks = [fetch_single_plan(client, plan_url, params, s, service_date) for s in strategies]
            
            results = await asyncio.gather(*tasks)
            
            # Flatten and remove identical routes returned for multiple strategies.
            all_routes = []
            seen_routes = set()
            for r in results:
                for route in r:
                    route_key = (
                        route.departure_time,
                        route.arrival_time,
                        tuple((leg.line_name, leg.from_station, leg.to_station) for leg in route.legs),
                    )
                    if route_key in seen_routes:
                        continue
                    seen_routes.add(route_key)
                    all_routes.append(route)

            return TransitPlanResponse(routes=all_routes)
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Transit API error: {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail="Failed to connect to Transit API")


import httpx
import asyncio
from fastapi import HTTPException
from app.schemas.transit import TransitPlanResponse, TransitRoute, TransitLeg
from app.core.config import settings

async def resolve_location_to_id(client: httpx.AsyncClient, base_url: str, location: str) -> str:
    """Resolve a text location to an ID or geo coordinate using the suggest API."""
    if ":" in location:
        return location # Already an ID or geo:lat,lng
    
    url = f"{base_url}/places/suggest"
    try:
        res = await client.get(url, params={"q": location, "limit": 1}, timeout=5.0)
        res.raise_for_status()
        data = res.json()
        
        places = data.get("places", [])
        if places and len(places) > 0:
            return places[0].get("id", location)
            
        stations = data.get("stations", [])
        if stations and len(stations) > 0:
            return stations[0].get("id", location)
            
        return location
    except Exception:
        return location # Fallback to original text

def _format_secs(secs: int) -> str:
    if not secs and secs != 0:
        return ""
    hours = (secs // 3600) % 24
    minutes = (secs % 3600) // 60
    return f"{hours:02d}:{minutes:02d}"

async def fetch_single_plan(client: httpx.AsyncClient, url: str, params: dict, strategy: str) -> list[TransitRoute]:
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
                line_name = ext_leg.get("kind", "transit")
                if "line" in ext_leg and isinstance(ext_leg["line"], dict):
                    line_name = ext_leg["line"].get("name", line_name)
                
                legs.append(TransitLeg(
                    line_name=line_name,
                    platform=None,
                    from_station=ext_leg.get("from", {}).get("name", ""),
                    to_station=ext_leg.get("to", {}).get("name", ""),
                    departure_time=_format_secs(ext_leg.get("departureSecs")),
                    arrival_time=_format_secs(ext_leg.get("arrivalSecs"))
                ))
            
            extracted_routes.append(TransitRoute(
                summary=f"Route via {strategy}",
                strategy_type=strategy,
                departure_time=_format_secs(journey.get("departureSecs")),
                arrival_time=_format_secs(journey.get("arrivalSecs")),
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

async def fetch_transit_plan(from_location: str, to_location: str, time_str: str | None = None) -> TransitPlanResponse:
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
            
            # 2. Prepare base parameters
            params = {
                "from": from_id,
                "to": to_id,
            }
            if time_str:
                params["time"] = time_str
                
            # 3. Parallel fetching for different strategies
            strategies = ["fastest", "lowestFare", "fewestTransfers"]
            tasks = [fetch_single_plan(client, plan_url, params, s) for s in strategies]
            
            results = await asyncio.gather(*tasks)
            
            # Flatten the list of routes
            all_routes = []
            for r in results:
                all_routes.extend(r)
                
            # Deduplicate by summary/time if necessary, but returning all for now
            return TransitPlanResponse(routes=all_routes)
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Transit API error: {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail="Failed to connect to Transit API")


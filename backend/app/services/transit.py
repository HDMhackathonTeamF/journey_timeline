import httpx
from fastapi import HTTPException
from app.schemas.transit import TransitPlanResponse, TransitRoute, TransitLeg

async def fetch_transit_plan(from_location: str, to_location: str, time_str: str | None = None) -> TransitPlanResponse:
    url = "https://api.transit.ls8h.com/api/v1/plan"
    params = {
        "from": from_location,
        "to": to_location,
    }
    if time_str:
        params["time"] = time_str

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            # Since we don't have the exact API response shape for the proxy, 
            # we'll mock the extraction logic or pass through if it matches our schema roughly.
            # In a real scenario, we would map `data` fields to our TransitPlanResponse model.
            # Here is a placeholder for the actual mapping logic.
            # We assume for now the external API returns something we can loosely map or we just return it.
            
            # Example mapping if external data needs transformation:
            routes = []
            for ext_route in data.get("routes", []):
                legs = []
                for ext_leg in ext_route.get("legs", []):
                    legs.append(TransitLeg(
                        line_name=ext_leg.get("line_name", "Unknown Line"),
                        platform=ext_leg.get("platform"),
                        from_station=ext_leg.get("from_station", ""),
                        to_station=ext_leg.get("to_station", ""),
                        departure_time=ext_leg.get("departure_time"),
                        arrival_time=ext_leg.get("arrival_time")
                    ))
                routes.append(TransitRoute(
                    summary=ext_route.get("summary", ""),
                    departure_time=ext_route.get("departure_time"),
                    arrival_time=ext_route.get("arrival_time"),
                    duration_minutes=ext_route.get("duration_minutes", 0),
                    transfers_count=ext_route.get("transfers_count", 0),
                    total_fare=ext_route.get("total_fare", 0),
                    legs=legs
                ))
            
            return TransitPlanResponse(routes=routes)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Transit API error: {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail="Failed to connect to Transit API")

from typing import Any
from uuid import uuid4

import httpx

from app.core.config import get_settings


def _value(data: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return default


def normalize_routes(payload: dict[str, Any]) -> list[dict[str, Any]]:
    candidates = payload.get("routes") or payload.get("plans") or payload.get("results") or []
    routes = []
    for candidate in candidates:
        legs_raw = candidate.get("legs") or candidate.get("segments") or []
        legs = [{
            "line_name": _value(leg, "line_name", "line", "route_name", default="移動"),
            "platform": _value(leg, "platform", "track"),
            "from_station": _value(leg, "from_station", "from", "departure_location", default=""),
            "to_station": _value(leg, "to_station", "to", "arrival_location", default=""),
            "departure_time": _value(leg, "departure_time", "departure"),
            "arrival_time": _value(leg, "arrival_time", "arrival"),
        } for leg in legs_raw]
        routes.append({
            "id": str(_value(candidate, "id", default=uuid4())),
            "summary": _value(candidate, "summary", "name", default="経路候補"),
            "departure_time": _value(candidate, "departure_time", "departure"),
            "arrival_time": _value(candidate, "arrival_time", "arrival"),
            "duration_minutes": int(_value(candidate, "duration_minutes", "duration", default=0)),
            "transfers_count": int(_value(candidate, "transfers_count", "transfers", default=0)),
            "total_fare": int(_value(candidate, "total_fare", "fare", default=0)),
            "legs": legs,
        })
    return routes


async def search_transit(from_location: str, to_location: str, time: str | None) -> list[dict[str, Any]]:
    params = {"from": from_location, "to": to_location}
    if time:
        params["time"] = time
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(get_settings().transit_api_url, params=params)
        response.raise_for_status()
        return normalize_routes(response.json())

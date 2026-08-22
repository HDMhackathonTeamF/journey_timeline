import asyncio
import json
import httpx
import os
import sys

# Ensure backend dir is in sys.path so we can import app.core.config
sys.path.insert(0, os.getcwd())

# Try to load settings if running from within backend/
try:
    from app.core.config import settings
    BASE_URL = settings.TRANSIT_API_BASE_URL.replace("/plan", "") # get the base /api/v1
    API_KEY = settings.TRANSIT_API_KEY
except ImportError as e:
    print(f"Warning: Could not import app.core.config ({e}). Ensure you run this from the backend directory.")
    BASE_URL = "https://api.transit.ls8h.com/api/v1"
    API_KEY = None


HEADERS = {}
if API_KEY:
    HEADERS["Authorization"] = f"Bearer {API_KEY}"

# Extract base root url for health check (assuming it's at /api/health)
ROOT_URL = BASE_URL.replace("/v1", "")

async def fetch_endpoint(client: httpx.AsyncClient, name: str, url: str, params: dict = None):
    print(f"Testing {name} ... ", end="")
    try:
        res = await client.get(url, params=params, headers=HEADERS, timeout=10.0)
        status = res.status_code
        try:
            data = res.json()
        except ValueError:
            data = res.text
            
        print(f"Status: {status}")
        return {
            "endpoint": name,
            "url": str(res.url),
            "status_code": status,
            "response": data
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            "endpoint": name,
            "url": url,
            "error": str(e)
        }

async def main():
    print(f"Using BASE_URL: {BASE_URL}")
    
    # We will need a valid station ID for some tests. 
    # We'll try to get one from the suggest API first.
    dummy_station_id = "unknown"
    
    results = {}
    
    async with httpx.AsyncClient() as client:
        # 6. System Health
        results["health"] = await fetch_endpoint(client, "Health Check", f"{ROOT_URL}/health")
        
        # 2. Search & Suggest (Get a valid station ID for later tests)
        suggest_res = await fetch_endpoint(client, "Locations Suggest", f"{BASE_URL}/locations/suggest", {"q": "東京", "limit": 1})
        results["locations_suggest"] = suggest_res
        
        if suggest_res.get("status_code") == 200 and isinstance(suggest_res.get("response"), list) and len(suggest_res["response"]) > 0:
            dummy_station_id = suggest_res["response"][0].get("id", dummy_station_id)
        elif suggest_res.get("status_code") == 200 and isinstance(suggest_res.get("response"), dict) and "locations" in suggest_res["response"]:
             locations = suggest_res["response"]["locations"]
             if len(locations) > 0:
                 dummy_station_id = locations[0].get("id", dummy_station_id)
                 
        results["places_suggest"] = await fetch_endpoint(client, "Places Suggest", f"{BASE_URL}/places/suggest", {"q": "東京タワー", "limit": 2})
        results["places_reverse"] = await fetch_endpoint(client, "Places Reverse (Geocoding)", f"{BASE_URL}/places/reverse", {"lat": 35.6812, "lon": 139.7671})

        # 1. Planning
        plan_params = {"from": "東京", "to": "新宿", "date": "20260830", "time": "10:00"}
        results["plan_basic"] = await fetch_endpoint(client, "Plan (Basic)", f"{BASE_URL}/plan", plan_params)
        results["plan_guidance"] = await fetch_endpoint(client, "Plan Guidance", f"{BASE_URL}/guidance/plan", {**plan_params, "strategy": "fastest"})

        # 3. Stations
        results["station_detail"] = await fetch_endpoint(client, "Station Detail", f"{BASE_URL}/stations/{dummy_station_id}")
        results["station_departures"] = await fetch_endpoint(client, "Station Departures", f"{BASE_URL}/stations/{dummy_station_id}/departures", {"limit": 5})

        # 4. Catalog
        results["feeds"] = await fetch_endpoint(client, "Feeds (Catalog)", f"{BASE_URL}/feeds")
        results["operators"] = await fetch_endpoint(client, "Operators (Catalog)", f"{BASE_URL}/operators")

        # 5. Map Data
        results["route_map"] = await fetch_endpoint(client, "Route Map", f"{BASE_URL}/route-map")
        results["3d_scene"] = await fetch_endpoint(client, "3D Scene", f"{BASE_URL}/map/3d-scene")

    # Save to file
    output_file = "transit_api_test_results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
        
    print(f"\nAll endpoints tested. Results saved to {output_file}")
    print("Please open this file to review the raw JSON responses and structure.")

if __name__ == "__main__":
    asyncio.run(main())

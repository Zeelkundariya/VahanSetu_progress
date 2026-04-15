import requests
import json

def test_overpass():
    url = 'https://overpass-api.de/api/interpreter'
    # 20km around Ahmedabad (23.0225, 72.5714)
    query = """
    [out:json];
    (
      node["amenity"="charging_station"](around:50000, 23.0225, 72.5714);
      way["amenity"="charging_station"](around:50000, 23.0225, 72.5714);
    );
    out center;
    """
    try:
        r = requests.post(url, data={'data': query}, timeout=15)
        print(f"Status: {r.status_code}")
        data = r.json()
        elements = data.get('elements', [])
        print(f"Found {len(elements)} stations.")
        for e in elements[:3]:
            name = e.get('tags', {}).get('name', 'Unknown')
            lat = e.get('lat') or e.get('center', {}).get('lat')
            lon = e.get('lon') or e.get('center', {}).get('lon')
            print(f"- {name} at ({lat}, {lon})")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_overpass()

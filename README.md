# Project documentation
# VahanSetu – EV Station Finder

VahanSetu is a real‑time EV charging station discovery platform. It shows nearby stations with availability, queue length, and user ratings. Data is simulated, making it a perfect software‑only MVP.

## Features
- Map view of EV stations with color‑coded markers
- Filters: connector type, power, rating
- Voice search (Hindi)
- Crowdsourced queue reports and ratings
- Real‑time simulation (updates every 30 seconds)

## How to Run
1. Install Python dependencies: `pip install -r requirements.txt`
2. Create database: `python create_db.py`
3. Start simulation: `python simulate.py` (keep it running)
4. Start Flask API: `python app.py`
5. Open `static/index.html` in a browser

## Tech Stack
- Backend: Flask, SQLite
- Frontend: Leaflet, vanilla JS
- Simulation: Python script

## Future Plans
- Integrate real EV network APIs
- Add IoT sensors for true real‑time data
- Build mobile app
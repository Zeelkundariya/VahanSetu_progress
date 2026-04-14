# 💠 VahanSetu: Unified EV Infrastructure Ecosystem 



**VahanSetu** is a high-fidelity, industrial-grade EV charging and logistics ecosystem designed to bridge the gap between electric ambition and infrastructure reality. Built for the Indian EV landscape, it serves as a unified command center for drivers, fleet managers, and infrastructure hosts.

---

## ⚡ The Problem Statement

Despite the rapid growth of Electric Vehicles (EVs), several critical barriers prevent mass adoption:

1.  **Range Anxiety & Blind Navigation**: Drivers lack intelligent routing that considers EV-specific needs (charger types, station availability, and battery forensics) along long-distance corridors.
2.  **Infrastructure Fragmentation**: Charge Point Operators (CPOs) struggle with siloed management tools, making it difficult to monitor real-time utilization and revenue across multiple stations.
3.  **Fleet Logic Gap**: Commercial EV fleets lack a telemetry-driven dashboard to monitor vehicle health, charging costs, and real-time battery status in a single view.
4.  **Identity & Trust**: Fragmented authentication leads to security vulnerabilities in charging networks and payment gateways.

---

## 🚀 The VahanSetu Solution: A Triple-Axe Ecosystem

VahanSetu solves these challenges through three specialized portals integrated into one seamless platform:

### 1. The Navigator (Intelligent Routing)
*   **Neural Route Intelligence**: Implements OSRM-based routing with custom "Corridor Geofencing" logic to identify optimal charging stops within a strict 50km radius of the driving path.
*   **Adaptive Telemetry**: Calculates CO2 savings and predicts arrival energy based on real-world traffic multipliers.
*   **Live Discovery**: Real-time filtering of stations by connector types (CCS2, Type 2, CHAdeMO) and power output (KW).

### 2. CPO Portal (Infrastructure Stewardship)
*   **Hardware Command Center**: Empowers station owners to provision, monitor, and manage charging hardware remotely.
*   **Revenue Analytics**: Real-time tracking of kWh throughput and financial performance.
*   **Session Forensics**: Detailed history of every charging event, including energy delivered and cost metrics.

### 3. Fleet Analytics (Logistics Hub)
*   **Unified Telemetry**: Monitor entire EV fleets with real-time battery percentages, location tracking, and status monitoring (Idle, Charging, Low Battery).
*   **Asset Health Scoring**: Proprietary algorithms calculate "Fleet Health Scores" based on vehicle uptime and battery degradation metrics.
*   **Cost Optimization**: Aggregates charging expenses to help fleet managers optimize logistics and reduce operational overhead.

---

## 🏗️ Deep Dive: Full-Stack Architecture

### ⚛️ Frontend: React (The Face)
VahanSetu is transitioning to a **Single Page Application (SPA)** architecture powered by **React.js**. This shift enables:
*   **Real-time UI Synchronization**: Instant dashboard updates without page reloads.
*   **Component-Driven Design**: Reusable atomic elements for gauges, maps, and fleet cards.
*   **Optimized State Management**: Efficient handling of live telemetry streams.

### 🐍 Backend: Python / Flask (The Brain)
The backend serves as a high-performance **RESTful API Engine**:
*   **OSRM Routing Engine**: Complex geospatial math and corridor geofencing.
*   **Multi-Store Persistence**: Orchestrating data between SQLite (Relational) and MongoDB (NoSQL).
*   **Security & Auth**: JWT issuance and Gmail-specific identity verification.

---

## 💾 Data Schema Architecture

VahanSetu utilizes a hybrid persistence model:

| Entity | Storage | Purpose |
| :--- | :--- | :--- |
| **Identity & Auth** | SQLite (WAL) | ACID-compliant user and station records. |
| **Vehicle Telemetry** | MongoDB | High-velocity, unstructured sensor logs. |
| **Fleet Ops** | SQLite (WAL) | Relational mapping of vehicles to owners. |
| **Financials** | SQLite (WAL) | Transactional integrity for payments (Razorpay). |

---

## 🛡️ Security Perimeter Protocol

VahanSetu is hardened with enterprise-grade defense layers:
*   **Restricted Identity Protocol**: Mandatory **@gmail.com** enforcement ensures a verified user base and mitigates anonymous bot traffic.
*   **The Nexus Vault (JWT)** : Hardened HTTP-Only session cookies with JWT integrity checks prevent session hijacking and unauthorized API access.
*   **Anti-Brute Force Sentinel**: Server-side artificial latency (sleep protocols) on failed login attempts to thwart automated credential stuffing.

---

## 🛠️ Industrial Tech Stack (MERN+P)

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | **React.js, Vite, Tailwind CSS** |
| **Core Backend** | Python 3.x, Flask (RESTful API) |
| **Relational DB** | SQLite (Write-Ahead Logging / WAL-Mode) |
| **NoSQL Telemetry**| MongoDB (Atlas / Community Edition) |
| **Security** | PyJWT, Werkzeug (PBKDF2-SHA256), Flask-Login |
| **Analytics** | Chart.js (Flux-Synchronized Data Visualization) |
| **Geospatial** | OSRM (Routing Engine), Nominatim (Geocoding), Haversine Geometry |
| **Communications** | Custom SMTP-Mailer for Identity Alerts & Notifications |

---

## 🔌 Core API Reference

| Endpoint | Method | Description | Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/trip_plan` | `GET` | AI recruitment of route-side stations. | `from`, `to`, `range_km` |
| `/api/stations` | `GET` | Discovery of proximal infrastructure. | `lat`, `lng`, `radius` |
| `/api/fleet/status`| `GET` | Real-time telemetry for commercial assets.| `fleet_id`, `vehicle_id` |

---

## 🚀 Getting Started

### 🛠️ Installation
1.  **Backend Setup**:
    ```bash
    cd server
    pip install -r requirements.txt
    python app.py
    ```
2.  **Frontend Setup**:
    ```bash
    cd client
    npm install
    npm run dev
    ```

---

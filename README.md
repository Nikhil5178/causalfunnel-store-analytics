# CausalFunnel — Store Analytics Platform

A full-stack product analytics application that tracks storefront activity and visualizes visitor behavior through session analytics, event timelines, conversion metrics, and a click heatmap.

## Live Demo

- **Storefront:** https://causalfunnel-store-analytics.netlify.app/demo.html
- **Analytics Dashboard:** https://causalfunnel-store-analytics.netlify.app
- **Backend API:** https://causalfunnel-api-dvi3.onrender.com

## Overview

CausalFunnel is a lightweight analytics platform built around a sample FORME e-commerce storefront. It collects visitor interaction events and displays them in an analytics dashboard.

The project demonstrates event tracking, REST API development, database integration, frontend visualization, and cloud deployment.

## Features

### Storefront Analytics
- Track page views and click events.
- Generate and reuse browser session IDs.
- Record event timestamps, page URLs, viewport dimensions, and click coordinates.
- Track commerce-related events such as adding items to the cart and starting checkout.

### Analytics Dashboard
- View visitor sessions and event counts.
- Inspect individual session journeys and event timestamps.
- Visualize activity over time using page-view and click counts.
- Display commerce conversion metrics.
- Select a page URL to inspect recorded click locations in a heatmap.

### Backend and Storage
- REST API built with Node.js and Express.
- MongoDB Atlas for event storage.
- Separate API endpoints for sessions, events, analytics summaries, and heatmap data.
- CORS configuration for the deployed frontend.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| UI icons | Lucide React |
| Storefront | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Database | MongoDB Atlas |
| Deployment | Netlify, Render |
| Event transport | HTTP POST requests |

## Architecture

```text
Visitor
   |
   v
FORME Storefront
   |
   v
Analytics Tracker
   |
   | POST /api/events
   v
Express REST API
   |
   v
MongoDB Atlas
   |
   v
Analytics API Endpoints
   |
   v
React Dashboard
   |
   +--> Session Analytics
   +--> Event Timeline
   +--> Activity Chart
   +--> Conversion Metrics
   +--> Click Heatmap
```

## Project Structure

```text
causalfunnel-store-analytics/
└── cf-live-working/
    ├── client/
    │   ├── public/
    │   │   ├── demo.html
    │   │   └── checkout.html
    │   ├── src/
    │   │   └── App.jsx
    │   ├── package.json
    │   └── vite.config.js
    └── server/
        ├── public/
        │   └── tracker.js
        ├── src/
        │   └── routes/
        │       └── events.js
        └── package.json
```

*Update this structure if your actual repository contains additional or differently named files.*

## Local Setup

### Prerequisites

- Node.js and npm
- A MongoDB Atlas database or local MongoDB instance
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Nikhil5178/causalfunnel-store-analytics.git
cd causalfunnel-store-analytics/cf-live-working
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

Configure the backend environment variables using your server's existing configuration.

Example `.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_ORIGIN=http://localhost:5173
```

Use your actual database name and connection settings. Never commit `.env` files or real credentials.

Start the backend using the script defined in `server/package.json`, for example:

```bash
npm run dev
```

### 3. Install frontend dependencies

Open another terminal:

```bash
cd cf-live-working/client
npm install
```

Create a `.env` file in the client directory:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite.

> Run commands using the scripts defined in your actual `package.json` files. If a `dev` script is unavailable, use the configured start script.

## Production Configuration

### Frontend

Configure the following Netlify environment variable:

```env
VITE_API_BASE_URL=https://causalfunnel-api-dvi3.onrender.com
```

Build settings:

- Base directory: `cf-live-working/client`
- Build command: `npm run build`
- Publish directory: `dist`

### Backend

Configure the following environment variables in Render:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_ORIGIN=https://causalfunnel-store-analytics.netlify.app
```

Render can provide its own port through the `PORT` environment variable. The application should listen on `process.env.PORT`.

Use the actual backend start command defined in `server/package.json`. Keep MongoDB credentials in Render environment settings, not in source code.

## Event Data

The analytics tracker records information such as:

- `session_id`: identifier associated with a visitor session
- `event_type`: event name, such as `page_view` or `click`
- `page_url`: URL where the event occurred
- `timestamp`: event timestamp
- `viewport`: browser viewport dimensions
- `click`: click coordinates, when applicable
- `metadata`: optional event-specific information

The backend stores these events for use in session analytics and heatmap calculations.

## API Overview

The dashboard uses the following API routes:

| Endpoint | Purpose |
|---|---|
| `POST /api/events` | Submit an analytics event |
| `GET /api/sessions` | Retrieve visitor sessions |
| `GET /api/sessions/:session_id/events` | Retrieve events for a session |
| `GET /api/pages` | Retrieve tracked page URLs |
| `GET /api/analytics/summary` | Retrieve analytics summary |
| `GET /api/heatmap?url=...` | Retrieve click data for a page |

Confirm each route against the current backend implementation before relying on this table.

## Assumptions and Trade-offs

- Browser-generated session IDs are used to associate events with sessions; they are not verified user identities.
- Click coordinates are viewport-relative, so the heatmap preview may differ across viewport sizes and responsive layouts.
- The storefront simulates checkout for demonstration purposes and does not process real payments.
- The dashboard refreshes analytics periodically rather than using a real-time streaming connection.
- MongoDB Atlas provides persistent event storage, while Netlify and Render host the frontend and backend separately.
- A live iframe preview can navigate independently of the dashboard. A static screenshot-based preview would be more stable if screenshot capture is implemented.

## Security Considerations

- Store database credentials and production configuration in environment variables.
- Never commit `.env` files, API keys, passwords, or private connection strings.
- Configure CORS for the intended frontend origin.
- Restrict MongoDB network access where practical.
- Avoid collecting sensitive personal information in analytics events.

## Future Improvements

- Add date-range filtering and funnel breakdowns.
- Support device and browser segmentation.
- Improve heatmap rendering across responsive layouts.
- Introduce event validation, rate limiting, and pagination.
- Add automated tests for API endpoints and analytics calculations.

## Author

**Sajja Nikhil Harsha**

GitHub: https://github.com/Nikhil5178

## License

Add the license appropriate for your intended use and distribution.

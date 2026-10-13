# FORME Store + CausalFunnel User Analytics

A full-stack user analytics demo built around a premium, responsive e-commerce storefront. The storefront is instrumented with a JavaScript tracker and feeds events into an Express API backed by MongoDB. The React dashboard displays visitor sessions, ordered user journeys, and a click-position heatmap.

## Features

### Storefront (`/demo.html`)
- Premium editorial design with responsive layouts
- Product grid with category filters and search
- Quick-add shopping bag, quantity count, remove-item action, and demo checkout
- Story section, newsletter demo form, responsive navigation, toast feedback
- Tracking for page views and clicks, including interactions with storefront controls
- Uses demo product data and image URLs; no real payments or orders are processed

### Analytics dashboard (`/`)
- Session list with event totals, pages visited, and last-seen timestamp
- Ordered session journey with page URLs, event types, timestamps, and click coordinates
- Page URL selector and click-position heatmap
- Summary metrics and manual refresh

### Backend and tracker
- `POST /api/events` receives and validates page-view and click events
- `GET /api/sessions` lists sessions with aggregated event counts
- `GET /api/sessions/:sessionId/events` returns the selected session's ordered journey
- `GET /api/pages` returns distinct tracked URLs
- `GET /api/heatmap?url=<encoded-page-url>` returns click coordinates for a page
- `GET /api/health` reports API health
- `GET /tracker.js` serves the embeddable vanilla JavaScript tracking script
- MongoDB stores individual event documents

## Tech stack
- React 18 + Vite
- Node.js + Express
- MongoDB + Mongoose
- Vanilla JavaScript tracker
- CSS, Lucide React icons

## Requirements
- Node.js 18 or newer
- MongoDB local instance or a MongoDB Atlas database

## Run locally

### 1. Start MongoDB

Start a local MongoDB service, or create an Atlas database and obtain its connection string.

### 2. Configure and start the backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env` if needed:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/causalfunnel_analytics
CLIENT_ORIGIN=http://localhost:5173
```

Then install dependencies and start the API:

```bash
npm install
npm run dev
```

The API should be available at `http://localhost:5000`. Check `http://localhost:5000/api/health`.

### 3. Start the frontend in another terminal

From the project root:

```bash
cd client
npm install
npm run dev
```

Vite serves the dashboard at `http://localhost:5173` and the storefront at `http://localhost:5173/demo.html`.

### 4. Generate and inspect events

1. Open `http://localhost:5173/demo.html`.
2. Browse categories, search for products, add an item to the bag, open the bag, and click other elements.
3. Open `http://localhost:5173` or click **Open storefront** in the dashboard.
4. Select the new session to inspect its event journey.
5. Open **Click heatmap**, select the storefront URL, and refresh if needed.

The tracker sends events to `http://localhost:5000/api/events` in local development. A `session_id` is persisted in browser `localStorage` and reused across visits in that browser.

## API example

```json
{
  "session_id": "session_abc123",
  "event_type": "click",
  "page_url": "http://localhost:5173/demo.html",
  "timestamp": "2026-10-12T12:00:00.000Z",
  "click": { "x": 250, "y": 480 },
  "viewport": { "width": 1440, "height": 900 }
}
```

## Embed the tracker on another website

The script listens for page loads and clicks. For a local site, add this before the tracker script:

```html
<script>
  window.ANALYTICS_API_URL = "http://localhost:5000/api/events";
</script>
<script src="http://localhost:5000/tracker.js" defer></script>
```

When embedding on another origin, configure the backend's `CLIENT_ORIGIN` to allow that origin. For production, replace both local URLs with your deployed API's HTTPS URL and tracker URL.

## Deployment notes

- Deploy the Express backend to a Node.js host such as Render and set `MONGODB_URI`, `CLIENT_ORIGIN`, and `PORT`.
- Deploy the React/Vite frontend to a static host such as Vercel and set `VITE_API_BASE_URL` to the backend URL, without a trailing slash.
- For the storefront, edit the `window.ANALYTICS_API_URL` value and the `<script src=".../tracker.js">` URL in `client/public/demo.html` to use your deployed backend domain. The current file is configured for local development.
- Set `CLIENT_ORIGIN` to the exact deployed frontend origin. If multiple origins are required, the server's CORS configuration accepts a comma-separated list.
- Ensure HTTPS is used for both frontend and backend in production.

## Assumptions and trade-offs

- This is a demonstration storefront; it does not process payments, create real orders, or subscribe emails to a mailing list.
- The store's products are static sample data; product images load from Unsplash URLs and require internet access in the browser.
- Session identity is stored in localStorage. Session expiration and consent management are not implemented.
- Click coordinates are viewport-relative (`clientX`, `clientY`), so heatmap positions can vary with screen size and page layout.
- Events are stored as individual MongoDB documents to simplify filtering and aggregation.
- The dashboard fetches data on load or manual refresh; streaming updates are out of scope.
- For production, add rate limiting, stronger validation, authentication, privacy/consent controls, retention policies, CSP, and tighter CORS settings.

## Project structure

```text
causalfunnel-user-analytics/
├── client/
│   ├── public/demo.html
│   ├── src/App.jsx
│   ├── src/main.jsx
│   ├── src/styles.css
│   └── package.json
├── server/
│   ├── public/tracker.js
│   ├── src/models/Event.js
│   ├── src/routes/events.js
│   ├── src/index.js
│   └── package.json
└── README.md
```


## Event activity chart and click heatmap troubleshooting

The Sessions tab includes an event activity bar chart grouped into 10-minute intervals. After interacting with the storefront, click **Refresh data** in the dashboard. The chart uses actual events returned by the API; it does not generate sample values.

If the heatmap shows no clicks:
1. Keep the backend running at `http://localhost:5000`.
2. Open the storefront at `http://localhost:5173/demo.html` (not by opening the HTML file directly).
3. Click several places in the storefront.
4. Check `http://localhost:5000/api/health`, then refresh the dashboard.
5. In MongoDB Compass, open `causalfunnel_analytics` → `events` and verify documents with `event_type: "click"` and `click.x` / `click.y` values.
6. In browser DevTools → Network, look for POST requests to `http://localhost:5000/api/events`; successful requests return HTTP 201.

The heatmap overlays click dots relative to recorded viewport dimensions. It is a coordinate visualization rather than a screenshot of the original page.


## Storefront checkout and richer analytics

The FORME storefront now has a separate `/checkout.html` page. The bag is saved in localStorage, so products persist when navigating from the store to checkout. The checkout validates contact/shipping details, shows subtotal, shipping and estimated tax, and displays a simulated order confirmation. **It is a portfolio demo only**: it does not process payments or send address details to the backend.

Additional tracked events:
- `add_to_cart`
- `remove_from_cart`
- `checkout_start`
- `purchase` (simulated order confirmation)
- `search`
- `newsletter_signup`

The dashboard now includes an event activity chart and a commerce conversion funnel. Refresh the dashboard after trying the full flow. The heatmap page preview uses an iframe under the click hotspots; the dots are based on viewport coordinates and may be approximate if the visitor scrolled before clicking.

### Suggested end-to-end test
1. Start MongoDB, then the API from `server` with `npm install` and `npm run dev`.
2. Start Vite from `client` with `npm install` and `npm run dev`.
3. Open `http://localhost:5173/demo.html`, add an item to the bag, and choose **Continue to checkout**.
4. Fill the checkout form and place a test order.
5. Open `http://localhost:5173`, select Sessions, and click **Refresh data**. The journey should include click events and commerce actions; the funnel should count product adds, checkout starts, and simulated orders.
6. In Click heatmap, select the exact URL you interacted with and refresh.

The custom analytics event endpoint accepts only the documented event types in the backend schema. Keep `.env` local and never commit credentials.


## Testing a new visitor and live dashboard updates

- Keep the backend on port 5000 and Vite on the port it reports (for example 5174).
- Open the dashboard in your normal browser window.
- Open the storefront in a separate Chrome Incognito window. Incognito has its own localStorage, so the tracker creates a different session ID.
- Interact with the storefront. The dashboard polls the API every 5 seconds and should show the new session and its events.
- Headline totals are cumulative across all sessions in the database. Historical events are intentionally retained; select a session in the Sessions table to inspect that visitor's journey.
- This demo has no account-login feature. A “new user” for this assignment means a separate browser session, such as a different browser or Incognito window.

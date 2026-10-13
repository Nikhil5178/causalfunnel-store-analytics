import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, MousePointer2, Users, Clock3, RefreshCw, ExternalLink, BarChart3 } from 'lucide-react';

const API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function buildActivityBuckets(events) {
  const buckets = new Map();
  for (const event of events) {
    const date = new Date(event.timestamp);
    if (Number.isNaN(date.getTime())) continue;
    date.setMinutes(Math.floor(date.getMinutes() / 10) * 10, 0, 0);
    const key = date.toISOString();
    if (!buckets.has(key)) buckets.set(key, { time: date, page_view: 0, click: 0 });
    if (event.event_type === 'page_view' || event.event_type === 'click') buckets.get(key)[event.event_type] += 1;
  }
  return [...buckets.values()].sort((a, b) => a.time - b.time).slice(-12);
}

function App() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState({ event_counts: {}, funnel: {} });
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [clicks, setClicks] = useState([]);
  const [tab, setTab] = useState('sessions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const knownSessionIds = useRef(new Set());

  async function getJson(path) {
    const response = await fetch(`${API}/api${path}`);
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    return response.json();
  }

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [sessionData, pageData, summaryData] = await Promise.all([
        getJson('/sessions'), getJson('/pages'), getJson('/analytics/summary').catch(() => ({ event_counts: {}, funnel: {} }))
      ]);
      setAnalyticsSummary(summaryData);
      setSessions(sessionData);
      setPages(pageData);
      const newSessionArrived = sessionData.some(s => !knownSessionIds.current.has(s.session_id));
      sessionData.forEach(s => knownSessionIds.current.add(s.session_id));
      const eventGroups = await Promise.all(sessionData.map(s => getJson(`/sessions/${encodeURIComponent(s.session_id)}/events`).catch(() => [])));
      setAllEvents(eventGroups.flat().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      if (sessionData.length && newSessionArrived) {
        setSelectedSession(sessionData[0].session_id);
      }
      if (!selectedPage && pageData.length) setSelectedPage(pageData[0]);
      // Refresh heatmap data along with the dashboard metrics so the click
      // count and dots update without requiring the page dropdown to change.
      const pageForHeatmap = selectedPage || pageData[0] || '';
      if (pageForHeatmap) {
        const clickData = await getJson(`/heatmap?url=${encodeURIComponent(pageForHeatmap)}`).catch(() => []);
        setClicks(clickData);
      } else {
        setClicks([]);
      }
    } catch (e) {
      setError(`${e.message}. Check that the backend and MongoDB are running.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const pollId = window.setInterval(() => refresh(), 5000);
    return () => window.clearInterval(pollId);
  }, []);
  useEffect(() => {
    if (!selectedSession) { setEvents([]); return; }
    getJson(`/sessions/${encodeURIComponent(selectedSession)}/events`)
      .then(setEvents).catch(e => setError(e.message));
  }, [selectedSession]);
  useEffect(() => {
    if (!selectedPage) { setClicks([]); return; }
    getJson(`/heatmap?url=${encodeURIComponent(selectedPage)}`)
      .then(setClicks).catch(e => setError(e.message));
  }, [selectedPage]);

  const totalEvents = useMemo(() => sessions.reduce((sum, s) => sum + s.total_events, 0), [sessions]);
  const totalClicks = useMemo(() => clicks.length, [clicks]);
  const activityBuckets = useMemo(() => buildActivityBuckets(allEvents), [allEvents]);
  const eventTypeCounts = useMemo(() => ({ page_view: allEvents.filter(e => e.event_type === 'page_view').length, click: allEvents.filter(e => e.event_type === 'click').length }), [allEvents]);
  // Use one real recorded viewport (largest area) for the page preview.
  // Combining max width and max height independently can create a viewport
  // that no visitor actually used and misalign the hotspot overlay.
  const maxViewport = useMemo(() => {
    const viewports = clicks.map(c => c.viewport).filter(v => Number(v?.width) > 0 && Number(v?.height) > 0);
    if (!viewports.length) return { width: 1280, height: 800 };
    return viewports.reduce((best, current) => current.width * current.height > best.width * best.height ? current : best);
  }, [clicks]);
  
const preview = useMemo(() => {
  if (!selectedPage) return '';

  try {
    const url = new URL(selectedPage);

    // Keep the actual selected page and section.
    // Only rewrite old localhost URLs for the deployed storefront.
    if (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1'
    ) {
      url.protocol = 'https:';
      url.host = 'causalfunnel-store-analytics.netlify.app';
    }

    // The tracker already ignores preview-mode events.
    url.searchParams.set('analytics_preview', '1');

    return url.toString();
  } catch {
    return '';
  }
}, [selectedPage]);





  const previewScale = Math.min(850 / maxViewport.width, 520 / maxViewport.height, 1);
  const previewWidth = Math.round(maxViewport.width * previewScale);
  const previewHeight = Math.round(maxViewport.height * previewScale);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark">cf</div>
      <div className="brand-copy"><strong>causalfunnel</strong><span>PRODUCT ANALYTICS</span></div>
      <div className="side-label">WORKSPACE</div>
      <button className={`nav-item ${tab === 'sessions' ? 'active' : ''}`} onClick={() => setTab('sessions')}><Users size={17}/> Sessions</button>
      <button className={`nav-item ${tab === 'heatmap' ? 'active' : ''}`} onClick={() => setTab('heatmap')}><MousePointer2 size={17}/> Click heatmap</button>
      <div className="sidebar-bottom"><span className="status-dot"/> API dashboard <span className="version">v1.0</span></div>
    </aside>
    <main className="main-content">
      <header className="topbar">
        <div><div className="eyebrow">OVERVIEW / {tab === 'sessions' ? 'SESSIONS' : 'HEATMAP'}</div><h1>{tab === 'sessions' ? 'User analytics' : 'Click heatmap'}</h1><p className="subtitle">Understand how visitors interact with your product.</p></div>
        <div className="header-actions"><a className="refresh-btn storefront-link" href="/demo.html" target="_blank" rel="noreferrer"><ExternalLink size={15}/> Open storefront</a><button className="refresh-btn" onClick={refresh} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>{loading ? 'Refreshing' : 'Refresh data'}</button></div>
      </header>
      {error && <div className="error-banner">{error}</div>}
      <section className="metrics">
        <div className="metric-card"><div className="metric-icon violet"><Users size={18}/></div><span className="metric-label">Total sessions</span><strong>{sessions.length}</strong><small>Tracked browser sessions</small></div>
        <div className="metric-card"><div className="metric-icon blue"><Activity size={18}/></div><span className="metric-label">Total events</span><strong>{totalEvents}</strong><small>Page views and clicks</small></div>
        <div className="metric-card"><div className="metric-icon orange"><MousePointer2 size={18}/></div><span className="metric-label">Clicks on selected page</span><strong>{totalClicks}</strong><small>{tab === 'heatmap' ? 'For current page selection' : 'Select Heatmap to explore'}</small></div>
      </section>

      {tab === 'sessions' && <section className="panel activity-panel">
        <div className="panel-heading"><div><h2><BarChart3 size={16} style={{display:'inline', marginRight:8, verticalAlign:'-3px'}}/>Event activity</h2><p>Events recorded in 10-minute intervals · updates automatically every 5 seconds</p></div><span className="count-pill">{allEvents.length} tracked</span></div>
        {allEvents.length === 0 ? <Empty title="No analytics data yet" text="Open the storefront, interact with it, then refresh this dashboard."/> :
          <div className="activity-chart"><div className="chart-legend"><span><i className="legend-view"/> Page views <b>{eventTypeCounts.page_view}</b></span><span><i className="legend-click"/> Clicks <b>{eventTypeCounts.click}</b></span></div>
            <div className="chart-bars" role="img" aria-label="Bar chart showing page views and clicks in ten-minute intervals">
              {activityBuckets.map(bucket => { const max = Math.max(1, ...activityBuckets.map(b => b.page_view + b.click)); return <div className="bar-group" key={bucket.time.toISOString()} title={`${bucket.time.toLocaleString()}: ${bucket.page_view} page views, ${bucket.click} clicks`}><div className="bar-stack"><span className="bar-view" style={{height:`${bucket.page_view / max * 100}%`}}/><span className="bar-click" style={{height:`${bucket.click / max * 100}%`}}/></div><small>{bucket.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small></div>; })}
            </div></div>}
      </section>}

      {tab === 'sessions' && <section className="panel funnel-panel">
        <div className="panel-heading"><div><h2>Commerce conversion funnel</h2><p>Real tracked storefront actions · simulated checkout only, no payment processing</p></div><span className="count-pill">Live events</span></div>
        <div className="funnel-grid">
          {[
            ['Product adds', 'add_to_cart', 'Items added to bag'],
            ['Checkout starts', 'checkout_start', 'Visitors entering checkout'],
            ['Test orders', 'purchase', 'Simulated order confirmations']
          ].map(([label, key, hint]) => <div className="funnel-step" key={key}><span>{label}</span><strong>{analyticsSummary.event_counts?.[key] || 0}</strong><small>{hint}</small></div>)}
        </div>
      </section>}

      {tab === 'sessions' ? <section className="content-grid">
        <div className="panel sessions-panel">
          <div className="panel-heading"><div><h2>Sessions</h2><p>Recent visitor activity</p></div><span className="count-pill">{sessions.length} sessions</span></div>
          {sessions.length === 0 ? <Empty title="No sessions yet" text="Open the demo page and click around to generate analytics events."/> :
            <div className="table-wrap"><table><thead><tr><th>SESSION</th><th>EVENTS</th><th>LAST SEEN</th></tr></thead><tbody>
              {sessions.map(s => <tr key={s.session_id} className={selectedSession === s.session_id ? 'selected-row' : ''} onClick={() => setSelectedSession(s.session_id)}>
                <td><button className="session-link">{s.session_id.slice(0, 19)}…</button><small className="subcell">{s.pages?.length || 0} page(s)</small></td><td><span className="event-count">{s.total_events}</span></td><td className="date-cell">{formatDate(s.last_seen)}</td>
              </tr>)}
            </tbody></table></div>}
        </div>
        <div className="panel journey-panel">
          <div className="panel-heading"><div><h2>Session journey</h2><p>Ordered events for selected session</p></div><Clock3 size={18} className="muted-icon"/></div>
          {!selectedSession ? <Empty title="Choose a session" text="Select a session to inspect its journey."/> :
            events.length === 0 ? <Empty title="No events found" text="Events for this session will appear here."/> :
              <div className="timeline">{events.map((event, i) => <div className="timeline-item" key={event._id || `${event.timestamp}-${i}`}><div className={`timeline-icon ${event.event_type}`}><span>{event.event_type === 'page_view' ? '↗' : '•'}</span></div><div className="timeline-body"><div className="event-title">{event.event_type.replace('_', ' ')} <time>{formatDate(event.timestamp)}</time></div><div className="event-url">{event.page_url}</div>{event.click && <div className="coordinates">x: {Math.round(event.click.x)} · y: {Math.round(event.click.y)}</div>}</div></div>)}</div>}
        </div>
      </section> : <section className="panel heatmap-panel">
        <div className="panel-heading"><div><h2>Click positions</h2><p>Click locations recorded for a selected page URL</p></div><span className="count-pill">{clicks.length} clicks</span></div>
        <label className="select-label" htmlFor="page-select">PAGE URL</label>
        <select id="page-select" value={selectedPage} onChange={e => setSelectedPage(e.target.value)}><option value="">Select a page</option>{pages.map(p => <option value={p} key={p}>{p}</option>)}</select>
        <div className="heatmap-stage">
          {!selectedPage ? <Empty title="Select a page" text="Choose a tracked URL to view click positions."/> : clicks.length === 0 ? <Empty title="No click data yet" text="Open the demo page and click a few places, then refresh."/> :
          <div className="viewport-canvas" style={{width: `${previewWidth}px`, height: `${previewHeight}px`}}>


<iframe
  key={preview}
  className="heatmap-page-preview"
  src={preview}
  title="Selected page preview"
  tabIndex={-1}
  aria-hidden="true"
  sandbox="allow-scripts allow-same-origin"
  onLoad={(e) => {
    try {
      const frame = e.currentTarget;
      frame.contentWindow.addEventListener('beforeunload', (event) => {
        event.preventDefault();
      });
    } catch {
      // Cross-origin restrictions are expected.
    }
  }}
  style={{
    width: `${maxViewport.width}px`,
    height: `${maxViewport.height}px`,
    transform: `scale(${previewScale})`,
    transformOrigin: 'top left',
    border: 0,
    pointerEvents: 'none'
  }}
/>

            <div className="heatmap-preview-tint"/>
            <div className="canvas-label">CLICK DISTRIBUTION · {maxViewport.width} × {maxViewport.height} REFERENCE VIEWPORT</div>
            {clicks.map((c, i) => {
              const w = c.viewport?.width || maxViewport.width;
              const h = c.viewport?.height || maxViewport.height;
              const left = Math.max(0, Math.min(100, (c.click.x / w) * 100));
              const top = Math.max(0, Math.min(100, (c.click.y / h) * 100));
              return <span key={`${c.timestamp}-${i}`} className="heat-dot" title={`x:${c.click.x}, y:${c.click.y} · viewport ${w}×${h}`} style={{left: `${left}%`, top: `${top}%`}}/>;
            })}
          </div>}
        </div>
        <p className="heatmap-note"><MousePointer2 size={14}/> Each dot represents a recorded viewport-relative click. The preview uses a real recorded viewport size; responsive layouts may still vary across devices.</p>
      </section>}
      <footer>Built for the CausalFunnel Full Stack Engineer Intern assignment <span><ExternalLink size={13}/> Demo analytics</span></footer>
    </main>
  </div>;
}

function Empty({ title, text }) {
  return <div className="empty-state"><div className="empty-icon"><Activity size={20}/></div><strong>{title}</strong><p>{text}</p></div>;
}

export default App;

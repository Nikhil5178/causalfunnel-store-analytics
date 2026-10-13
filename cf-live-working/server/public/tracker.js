(() => {
  const API_URL = window.ANALYTICS_API_URL || 'http://localhost:5000/api/events';
  const STORAGE_KEY = 'cf_analytics_session_id';

  function getSessionId() {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = (window.crypto?.randomUUID?.() || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
  }

  // Heatmap previews load pages inside an iframe. Do not count those loads
  // as visitor activity or the dashboard will pollute its own analytics.
  if (new URLSearchParams(window.location.search).has('analytics_preview')) return;

  const sessionId = getSessionId();

  function send(eventType, click, metadata) {
    const payload = {
      session_id: sessionId,
      event_type: eventType,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
    if (click) payload.click = click;
    if (metadata && typeof metadata === 'object') payload.metadata = metadata;

    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        // sendBeacon does not consistently set CORS/content-type behavior for JSON;
        // use fetch as the primary path and beacon only as a fallback.
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true
        }).catch(() => navigator.sendBeacon(API_URL, blob));
      } else {
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true
        }).catch(() => {});
      }
    } catch (error) {
      console.warn('Analytics event could not be sent:', error);
    }
  }

  // Storefront code calls this for commerce events such as add_to_cart and
  // checkout_start. Expose the same validated transport used by page/click.
  window.trackAnalyticsEvent = (eventType, metadata = {}) => {
    if (typeof eventType !== 'string') return;
    send(eventType, null, metadata);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => send('page_view'), { once: true });
  } else {
    send('page_view');
  }

  // Hash-based storefront navigation (Shop, Story, Journal) is a virtual page
  // change even though the browser does not perform a full document reload.
  window.addEventListener('hashchange', () => send('page_view'));

  document.addEventListener('click', (event) => {
    send('click', { x: event.clientX, y: event.clientY });
  }, true);
})();

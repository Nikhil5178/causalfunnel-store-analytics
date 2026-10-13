import { Router } from 'express';
import Event from '../models/Event.js';

const router = Router();

router.post('/events', async (req, res, next) => {
  try {
    const { session_id, event_type, page_url, timestamp, click, viewport, metadata } = req.body ?? {};
    if (!session_id || !['page_view', 'click', 'add_to_cart', 'remove_from_cart', 'checkout_start', 'purchase', 'search', 'newsletter_signup'].includes(event_type) || !page_url) {
      return res.status(400).json({ error: 'session_id, valid event_type, and page_url are required.' });
    }
    if (event_type === 'click' &&
        (!Number.isFinite(click?.x) || !Number.isFinite(click?.y))) {
      return res.status(400).json({ error: 'Click events require numeric click.x and click.y.' });
    }

    const event = await Event.create({
      session_id: String(session_id).slice(0, 200),
      event_type,
      page_url: String(page_url).slice(0, 2048),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      ...(event_type === 'click' ? { click: { x: click.x, y: click.y } } : {}),
      ...(metadata && typeof metadata === 'object' ? { metadata } : {}),
      ...(viewport ? { viewport: {
        width: Number.isFinite(viewport.width) ? viewport.width : undefined,
        height: Number.isFinite(viewport.height) ? viewport.height : undefined
      }} : {})
    });
    res.status(201).json({ success: true, event_id: event._id });
  } catch (err) {
    next(err);
  }
});

router.get('/sessions', async (_req, res, next) => {
  try {
    const sessions = await Event.aggregate([
      { $group: {
        _id: '$session_id',
        total_events: { $sum: 1 },
        first_seen: { $min: '$timestamp' },
        last_seen: { $max: '$timestamp' },
        pages: { $addToSet: '$page_url' }
      }},
      { $sort: { last_seen: -1 } },
      { $limit: 200 },
      { $project: {
        _id: 0,
        session_id: '$_id',
        total_events: 1,
        first_seen: 1,
        last_seen: 1,
        pages: 1
      }}
    ]);
    res.json(sessions);
  } catch (err) { next(err); }
});

router.get('/sessions/:sessionId/events', async (req, res, next) => {
  try {
    const events = await Event.find({ session_id: req.params.sessionId })
      .sort({ timestamp: 1, _id: 1 }).lean();
    res.json(events);
  } catch (err) { next(err); }
});


router.get('/analytics/summary', async (_req, res, next) => {
  try {
    const [eventCounts, daily, funnel] = await Promise.all([
      Event.aggregate([{ $group: { _id: '$event_type', count: { $sum: 1 } } }]),
      Event.aggregate([
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 }, clicks: { $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } }, views: { $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] } } } },
        { $sort: { _id: 1 } }, { $limit: 14 }
      ]),
      Event.aggregate([{ $group: { _id: '$event_type', sessions: { $addToSet: '$session_id' }, count: { $sum: 1 } } }])
    ]);
    res.json({
      event_counts: Object.fromEntries(eventCounts.map(x => [x._id, x.count])),
      daily,
      funnel: Object.fromEntries(funnel.map(x => [x._id, { sessions: x.sessions.length, events: x.count }]))
    });
  } catch (err) { next(err); }
});

router.get('/pages', async (_req, res, next) => {
  try {
    const pages = await Event.distinct('page_url');
    res.json(pages.sort());
  } catch (err) { next(err); }
});

router.get('/heatmap', async (req, res, next) => {
  try {
    const pageUrl = req.query.url;
    if (!pageUrl) return res.status(400).json({ error: 'Query parameter url is required.' });
    const clicks = await Event.find({
      page_url: pageUrl,
      event_type: 'click',
      'click.x': { $exists: true },
      'click.y': { $exists: true }
    }).select({ _id: 0, click: 1, viewport: 1, timestamp: 1, session_id: 1 }).lean();
    res.json(clicks);
  } catch (err) { next(err); }
});

export default router;

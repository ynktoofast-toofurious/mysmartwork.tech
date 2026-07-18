// Lightweight client-side page-view tracking for the admin "SEO Stats" tab.
// This demo has no real backend analytics service, so visit counts are kept
// entirely in localStorage (consistent with the other mock/demo data in this app).

const PAGE_VIEWS_KEY = 'alkashPageViews';
const MAX_RECENT_ENTRIES = 200;

export const PAGE_VIEW_LABELS = {
    home: 'Home',
    about: 'About',
    services: 'Services',
    schedule: 'Schedule',
    quote: 'Quote',
    tracking: 'Tracking',
    gallery: 'Gallery',
    contact: 'Contact',
    ask: 'Ask Alkash',
    register: 'Register',
    login: 'Login',
    dashboard: 'Client Dashboard',
    admin: 'Admin Dashboard'
};

export function loadPageViewStats() {
    try {
        const parsed = JSON.parse(localStorage.getItem(PAGE_VIEWS_KEY) || '{}');
        return {
            totalViews: Number(parsed.totalViews) || 0,
            byPage: parsed.byPage && typeof parsed.byPage === 'object' ? parsed.byPage : {},
            recent: Array.isArray(parsed.recent) ? parsed.recent : []
        };
    } catch {
        return { totalViews: 0, byPage: {}, recent: [] };
    }
}

export function trackPageView(pageKey) {
    if (!pageKey) {
        return;
    }

    const stats = loadPageViewStats();
    const now = new Date().toISOString();
    const existing = stats.byPage[pageKey] || { count: 0, lastVisited: null };

    stats.byPage[pageKey] = { count: existing.count + 1, lastVisited: now };
    stats.totalViews += 1;
    stats.recent = [...stats.recent.slice(-(MAX_RECENT_ENTRIES - 1)), { pageKey, timestamp: now }];

    localStorage.setItem(PAGE_VIEWS_KEY, JSON.stringify(stats));
}

export function getViewsInLastHours(stats, hours) {
    const cutoffMs = Date.now() - hours * 60 * 60 * 1000;
    return stats.recent.filter((entry) => new Date(entry.timestamp).getTime() >= cutoffMs).length;
}

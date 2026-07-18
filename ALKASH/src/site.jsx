import { useEffect, useMemo, useState } from 'react';
import { trackingData, translations } from './content.js';
import { getAssetHref, getMaskedHref } from './routes.js';
import { EditModeProvider } from './edit-context.jsx';
import { EditModeToggle, EditableContent, AnnouncementQuickEdit } from './edit-components.jsx';
import { TrackingMap } from './tracking-map.jsx';
import {
    addSupportCase,
    clearSession,
    featureCatalog,
    getCases,
    getPlatformHealthSummary,
    getSession,
    getUserPackages,
    getUsers,
    initializePortalData,
    isAdminRole,
    login,
    registerUser,
    removeUser,
    setUserEnabled,
    setUserFeature,
    setUserRole
} from './portal.js';
import { DashboardSidebar, InventoryPage, AnnouncementsPage, SEOPage, DashboardOverview, UsersPage } from './dashboard-components.jsx';

const routes = [
    { key: 'home', href: getMaskedHref('home') },
    { key: 'about', href: getMaskedHref('about') },
    { key: 'services', href: getMaskedHref('services') },
    { key: 'schedule', href: getMaskedHref('schedule') },
    { key: 'quote', href: getMaskedHref('quote') },
    { key: 'tracking', href: getMaskedHref('tracking') },
    { key: 'gallery', href: getMaskedHref('gallery') },
    { key: 'contact', href: getMaskedHref('contact') }
];

const navPrimary = [
    { key: 'home', href: getMaskedHref('home') },
    { key: 'about', href: getMaskedHref('about') },
    {
        key: 'operations',
        label: 'Operations',
        children: [
            { key: 'services', href: getMaskedHref('services') },
            { key: 'schedule', href: getMaskedHref('schedule') },
            { key: 'quote', href: getMaskedHref('quote') },
            { key: 'tracking', href: getMaskedHref('tracking') },
            { key: 'gallery', href: getMaskedHref('gallery') }
        ]
    },
    { key: 'contact', href: getMaskedHref('contact') }
];

const socialLinks = [
    ['Facebook', 'https://www.facebook.com/'],
    ['Instagram', 'https://www.instagram.com/'],
    ['TikTok', 'https://www.tiktok.com/'],
    ['WhatsApp', 'https://wa.me/18178846898']
];

const QUOTE_DRAFT_KEY = 'alkashQuoteDraft';
const SERVICE_IMAGE_VERSION = '20260715b';

const quoteBuilderItems = [
    { key: 'small_box', label: 'Small 16x12x12', price: 50, category: 'Boxes', icon: 'BX', rating: 4.8, image: 'assets/services/small_box.png' },
    { key: 'medium_box', label: 'Medium 18x18x16', price: 80, category: 'Boxes', icon: 'BX', rating: 4.9, image: 'assets/services/medium_box.png' },
    { key: 'large_small_box', label: 'Large (small) 18x18x24', price: 100, category: 'Boxes', icon: 'BX', rating: 4.8, image: 'assets/services/large_small_box.png' },
    { key: 'large_box', label: 'Large 18x18x24', price: 120, category: 'Boxes', icon: 'BX', rating: 4.9, image: 'assets/services/large_box.png' },
    { key: 'xlarge_box', label: 'XLarge 24x18x24', price: 150, category: 'Boxes', icon: 'BX', rating: 4.7, image: 'assets/services/xlarge_box.png' },
    { key: 'xxlarge_box', label: 'XXLarge 18x21x46', price: 200, category: 'Boxes', icon: 'BX', rating: 4.7, image: 'assets/services/xxlarge_box.png' },
    { key: 'suitcase_medium', label: 'Suitcase Medium', price: 50, category: 'Travel', icon: 'BG', rating: 4.6, image: 'assets/services/suitcase_medium.png' },
    { key: 'suitcase_large', label: 'Suitcase Large', price: 80, category: 'Travel', icon: 'BG', rating: 4.7, image: 'assets/services/suitcase_large.png' },
    { key: 'drum_50', label: 'Drum 50"', price: 220, category: 'Barrels', icon: 'DR', rating: 4.8, image: 'assets/services/drum_50.png' },
    { key: 'drum_53', label: 'Drum 53"', price: 280, category: 'Barrels', icon: 'DR', rating: 4.8, image: 'assets/services/drum_53.png' },
    { key: 'pickup_small', label: 'Pick up the box', price: 20, category: 'Travel', icon: 'PK', rating: 4.5, image: 'assets/services/pickup_small.png' },
    { key: 'large_cooler', label: 'Large Cooler', price: 80, category: 'Travel', icon: 'CL', rating: 4.5, image: 'assets/services/large_cooler.png' },
    { key: 'sedan_vehicle', label: 'Sedan', price: 2700, category: 'Vehicles', icon: 'VH', rating: 4.9, image: 'assets/services/sedan_vehicle.png' },
    { key: 'suv_vehicle', label: 'SUV', price: 3000, category: 'Vehicles', icon: 'VH', rating: 4.9, image: 'assets/services/suv_vehicle.png' },
    { key: 'big_suv_4x4', label: 'Big Size 4x4', price: 3500, category: 'Vehicles', icon: 'VH', rating: 4.9, image: 'assets/services/big_suv_4x4.png' }
];

const serviceShopTabs = ['All', 'Boxes', 'Travel', 'Barrels', 'Vehicles'];
const WEBCHAT_USER_ID_KEY = 'alkashWebchatUserId';
const PROD_API_ORIGINS = ['https://api.mysmartwork.tech'];
const ALB_API_ORIGIN = 'http://mwangaza-api-alb-942251842.us-east-1.elb.amazonaws.com';

function getWebchatUserId() {
    const existing = localStorage.getItem(WEBCHAT_USER_ID_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
        return existing;
    }

    const generated = `demo_${Math.random().toString(36).slice(2, 14)}`;
    localStorage.setItem(WEBCHAT_USER_ID_KEY, generated);
    return generated;
}

function buildApiUrl(pathname) {
    const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim();
    if (!apiBase) {
        return pathname;
    }

    const base = apiBase.replace(/\/$/, '');
    const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${base}${path}`;
}

function getWebchatCandidates() {
    const localHosts = ['localhost', '127.0.0.1'];
    const isLocalBrowser = localHosts.includes(window.location.hostname);
    const isHTTPS = window.location.protocol === 'https:';
    const envBase = String(import.meta.env.VITE_API_BASE_URL || '').trim();
    const candidates = [];

    if (envBase) {
        candidates.push(buildApiUrl('/api/whatsapp/webchat'));
    }

    if (isLocalBrowser) {
        candidates.push('http://localhost:4000/api/whatsapp/webchat');
        candidates.push(`${ALB_API_ORIGIN}/api/whatsapp/webchat`);
    } else if (isHTTPS) {
        candidates.push(...PROD_API_ORIGINS.map((origin) => `${origin}/api/whatsapp/webchat`));
        candidates.push('/api/whatsapp/webchat');
    } else {
        candidates.push(`${ALB_API_ORIGIN}/api/whatsapp/webchat`);
        candidates.push(...PROD_API_ORIGINS.map((origin) => `${origin}/api/whatsapp/webchat`));
        candidates.push('/api/whatsapp/webchat');
    }

    return Array.from(new Set(candidates));
}

function readQuoteDraft() {
    try {
        const parsed = JSON.parse(localStorage.getItem(QUOTE_DRAFT_KEY) || '[]');
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((item) => item && typeof item.key === 'string' && Number(item.quantity) > 0);
    } catch {
        return [];
    }
}

function writeQuoteDraft(items) {
    localStorage.setItem(QUOTE_DRAFT_KEY, JSON.stringify(items));
}

function addItemToQuoteDraft(item) {
    const draft = readQuoteDraft();
    const index = draft.findIndex((entry) => entry.key === item.key);

    if (index >= 0) {
        draft[index] = { ...draft[index], quantity: draft[index].quantity + 1 };
    } else {
        draft.push({ key: item.key, label: item.label, price: item.price, quantity: 1 });
    }

    writeQuoteDraft(draft);
    return draft;
}

function clearQuoteDraft() {
    localStorage.removeItem(QUOTE_DRAFT_KEY);
}

function getServiceImageHref(imagePath) {
    const href = getAssetHref(imagePath);
    const separator = href.includes('?') ? '&' : '?';
    return `${href}${separator}v=${SERVICE_IMAGE_VERSION}`;
}

function navItemIcon(key) {
    if (key === 'services') {
        return (
            <svg className="dropdown-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 8h18M6 8v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    if (key === 'schedule') {
        return (
            <svg className="dropdown-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    if (key === 'quote') {
        return (
            <svg className="dropdown-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h9l3 3v13H6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M15 4v3h3M9 12h6M9 16h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    if (key === 'tracking') {
        return (
            <svg className="dropdown-icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
        );
    }

    if (key === 'gallery') {
        return (
            <svg className="dropdown-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="9" cy="10" r="1.4" fill="currentColor" />
                <path d="M6 16l4-4 3 3 2-2 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    return null;
}

function lookupTracking(reference, language) {
    const normalized = reference.trim().toUpperCase();

    if (!normalized) {
        return { key: 'empty' };
    }

    const item = trackingData[normalized];
    if (!item) {
        return { key: 'missing' };
    }

    return { key: 'found', record: { ...item[language], journey: item.journey } };
}

function useLanguage() {
    const [language, setLanguage] = useState(() => localStorage.getItem('alkashLang') || 'en');

    function setAndPersistLanguage(value) {
        localStorage.setItem('alkashLang', value);
        document.documentElement.lang = value;
        setLanguage(value);
    }

    return [language, setAndPersistLanguage];
}

function Header({ copy, pageKey, language, setLanguage, session, onLogout }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [languageOpen, setLanguageOpen] = useState(false);

    function selectLanguage(nextLanguage) {
        setLanguage(nextLanguage);
        setLanguageOpen(false);
    }

    return (
        <header className="site-header">
            <div className="container header-top-row">
                {session && isAdminRole(session.role) && (
                    <div style={{ position: 'absolute', left: '1rem', top: '0.8rem' }}>
                        <EditModeToggle />
                    </div>
                )}
                <a className="brand" href={getMaskedHref('home')}>
                    <img src={getAssetHref('Logo/logo-1.png')} alt="Alkash-Trans logo" />
                    <div>
                        <strong>Alkash-Trans</strong>
                        <span>{copy.brandTagline}</span>
                    </div>
                </a>

                <div className="header-actions">
                    <div className="portal-links">
                        <a className="button button-secondary portal-button ask-icon-link" href={getMaskedHref('ask')} aria-label="Ask Alkash">
                            <svg className="ask-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M10 3a7 7 0 1 0 4.45 12.4l3.57 3.57a1.1 1.1 0 0 0 1.56-1.56l-3.57-3.57A7 7 0 0 0 10 3zm0 2.3A4.7 4.7 0 1 1 5.3 10 4.7 4.7 0 0 1 10 5.3z" fill="currentColor"></path>
                                <path d="M17.8 3.6l.55-1.15.55 1.15 1.15.55-1.15.55-.55 1.15-.55-1.15-1.15-.55z" fill="currentColor"></path>
                            </svg>
                            <span className="hover-label">Ask Alkash</span>
                        </a>
                        {!session ? <a className="button button-secondary portal-button" href={getMaskedHref('register')}>Register</a> : null}
                        {!session ? <a className="button button-secondary portal-button" href={getMaskedHref('login')}>Login</a> : null}
                        {session ? (
                            <a
                                className="button button-secondary portal-button"
                                href={isAdminRole(session.role) ? getMaskedHref('admin') : getMaskedHref('dashboard')}
                            >
                                Dashboard
                            </a>
                        ) : null}
                    </div>

                    <div className={`language-menu ${languageOpen ? 'open' : ''}`}>
                        <button
                            className="icon-button globe-button"
                            type="button"
                            aria-expanded={languageOpen}
                            aria-haspopup="menu"
                            onClick={() => setLanguageOpen((value) => !value)}
                        >
                            <span className="globe-icon" aria-hidden="true">◎</span>
                            <span>{language.toUpperCase()}</span>
                        </button>
                        <div className="language-dropdown" role="menu">
                            <button type="button" onClick={() => selectLanguage('en')}>English</button>
                            <button type="button" onClick={() => selectLanguage('fr')}>Francais</button>
                        </div>
                    </div>

                    <a className="button button-primary header-cta" href={getMaskedHref('quote')}>{copy.ctaQuote}</a>

                    {session ? (
                        <button className="button button-secondary portal-button" type="button" onClick={onLogout}>
                            Logout
                        </button>
                    ) : null}

                    <button
                        className="nav-toggle"
                        type="button"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((value) => !value)}
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>

            <div className="container nav-row">
                <nav className={`site-nav ${menuOpen ? 'open' : ''}`} aria-label="Primary navigation">
                    {navPrimary.map((route) => {
                        if (route.children) {
                            const childActive = route.children.some((child) => child.key === pageKey);
                            return (
                                <div key={route.key} className={`nav-dropdown-group${childActive ? ' active' : ''}`}>
                                    <button className="nav-link nav-dropdown-trigger" type="button" aria-haspopup="menu" aria-expanded="false">
                                        {route.label}
                                        <span className="dropdown-arrow" aria-hidden="true">▾</span>
                                    </button>
                                    <div className="nav-dropdown-menu" role="menu">
                                        {route.children.map((child) => (
                                            <a key={child.key} href={child.href} className={`dropdown-item${pageKey === child.key ? ' active' : ''}`}>
                                                {navItemIcon(child.key)}
                                                {copy.nav[child.key]}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <a
                                key={route.key}
                                href={route.href}
                                className={`nav-link${route.key === pageKey ? ' active' : ''}`}
                            >
                                {copy.nav[route.key]}
                            </a>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}

function PageFrame({ eyebrow, title, intro, children, compact = false }) {
    return (
        <main className={`page-shell page-enter${compact ? ' compact' : ''}`}>
            <section className="page-hero">
                <div className="container page-hero-inner">
                    {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
                    <h1 className="page-title">{title}</h1>
                    {intro ? <p className="page-intro">{intro}</p> : null}
                </div>
            </section>
            <section className="page-content">
                <div className="container">{children}</div>
            </section>
        </main>
    );
}

function HomeAnnouncementCarousel() {
    const [slides, setSlides] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [editingSlide, setEditingSlide] = useState(null);

    useEffect(() => {
        try {
            const now = new Date();
            const stored = JSON.parse(localStorage.getItem('announcements') || '[]');
            const activeSlides = stored.filter((item) => {
                if (!item.active) return false;
                if (item.startDate && new Date(item.startDate) > now) return false;
                if (item.endDate && new Date(item.endDate) < now) return false;
                return true;
            });
            setSlides(activeSlides);
        } catch {
            setSlides([]);
        }
    }, []);

    function handleSaveSlide(updatedSlide) {
        const stored = JSON.parse(localStorage.getItem('announcements') || '[]');
        const updated = stored.map(s => s.id === updatedSlide.id ? updatedSlide : s);
        localStorage.setItem('announcements', JSON.stringify(updated));
        
        const now = new Date();
        const activeSlides = updated.filter((item) => {
            if (!item.active) return false;
            if (item.startDate && new Date(item.startDate) > now) return false;
            if (item.endDate && new Date(item.endDate) < now) return false;
            return true;
        });
        setSlides(activeSlides);
        setEditingSlide(null);
    }

    useEffect(() => {
        if (slides.length <= 1) {
            return;
        }

        const timer = window.setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => window.clearInterval(timer);
    }, [slides]);

    if (!slides.length) {
        return null;
    }

    const activeSlide = slides[activeIndex] || slides[0];
    const bgStyle = activeSlide.backgroundStyle || 'brand-wave';
    const customUrl = activeSlide.customBackgroundUrl || '';
    const isImageSlide = activeSlide.slideType === 'image' && activeSlide.imageUrl;

    const sectionClass = `announcement-carousel-slide ${bgStyle}`;
    const style = bgStyle === 'custom-image' && customUrl
        ? { backgroundImage: `linear-gradient(90deg, rgba(9,27,52,0.55), rgba(9,27,52,0.25)), url(${customUrl})` }
        : undefined;

    return (
        <>
        <section className="announcement-carousel-wrap snap-section">
            <div className="container">
                <EditableContent
                    id={activeSlide.id}
                    type="announcement"
                    onEdit={() => setEditingSlide(activeSlide)}
                >
                    <div className={sectionClass} style={style}>
                        {isImageSlide ? (
                            <img
                                src={activeSlide.imageUrl}
                                alt={activeSlide.title || 'Announcement banner'}
                                className="announcement-carousel-image"
                            />
                        ) : null}

                        <div className="announcement-carousel-overlay">
                            <p className="announcement-carousel-kicker">Latest Announcement</p>
                            <h2>{activeSlide.title || 'Announcement'}</h2>
                            {activeSlide.content ? <p>{activeSlide.content}</p> : null}
                        </div>
                    </div>
                </EditableContent>

                {slides.length > 1 ? (
                    <div className="announcement-carousel-dots">
                        {slides.map((item, index) => (
                            <button
                                key={item.id || index}
                                className={`announcement-carousel-dot${index === activeIndex ? ' active' : ''}`}
                                onClick={() => setActiveIndex(index)}
                                aria-label={`View announcement ${index + 1}`}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </section>
        {editingSlide && (
            <AnnouncementQuickEdit
                slide={editingSlide}
                onSave={handleSaveSlide}
                onCancel={() => setEditingSlide(null)}
            />
        )}
        </>
    );
}

function WhatsAppIslandDemo() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: 'Hello, I am your Alkash shipping assistant. I can help with shipment updates and quote requests.'
        }
    ]);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [apiError, setApiError] = useState('');
    const userId = useMemo(() => getWebchatUserId(), []);

    function appendMessage(message) {
        setMessages((current) => {
            const next = [...current, message];
            return next.slice(-8);
        });
    }

    async function handleSend(event) {
        event.preventDefault();
        const text = draft.trim();
        if (!text || busy) {
            return;
        }

        setDraft('');
        setApiError('');
        appendMessage({ role: 'user', text });
        setBusy(true);

        try {
            let payload = null;
            const endpoints = getWebchatCandidates();

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            text,
                            history: messages.map((item) => ({ role: item.role, content: item.text }))
                        })
                    });

                    if (!response.ok) {
                        continue;
                    }

                    payload = await response.json();
                    break;
                } catch {
                    // Try next endpoint candidate.
                }
            }

            if (!payload) {
                throw new Error('WEBCHAT_UNREACHABLE');
            }

            const reply = String(payload.responseText || '').trim() || 'Thanks. I am ready for your next message.';
            appendMessage({ role: 'assistant', text: reply });
        } catch {
            appendMessage({
                role: 'assistant',
                text: 'Demo fallback: API not reachable. Start the backend API to test live shipment and quote responses.'
            });
            setApiError('Live API unavailable. Using fallback response.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="quick-track-card whatsapp-island-card">
            <div className="island-phone-shell" aria-label="WhatsApp AI demo phone">
                <div className="island-phone-notch">
                    <span>WhatsApp Island Demo</span>
                    <strong>OpenAI</strong>
                </div>

                <div className="island-phone-screen">
                    <div className="island-chat-header">Demo conversation</div>
                    <div className="island-chat-thread">
                        {messages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className={`island-bubble ${message.role}`}>
                                {message.text}
                            </div>
                        ))}
                    </div>
                </div>

                <form className="island-composer" onSubmit={handleSend}>
                    <input
                        type="text"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Type your WhatsApp demo message..."
                        maxLength={500}
                    />
                    <button className="button button-primary" type="submit" disabled={busy}>
                        {busy ? 'Sending...' : 'Send'}
                    </button>
                </form>

                {apiError ? <p className="island-error-note">{apiError}</p> : null}
            </div>
        </div>
    );
}

function HomePage({ copy, language }) {
    const [quickReference, setQuickReference] = useState('');
    const [quickResult, setQuickResult] = useState(null);
    const [quickResultData, setQuickResultData] = useState(null);
    const [showQuickMap, setShowQuickMap] = useState(false);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            return undefined;
        }

        const parallaxNodes = Array.from(document.querySelectorAll('[data-parallax-speed]'));
        if (!parallaxNodes.length) {
            return undefined;
        }

        let ticking = false;
        const updateParallax = () => {
            const scrollY = window.scrollY || window.pageYOffset || 0;
            parallaxNodes.forEach((node) => {
                const speed = Number(node.getAttribute('data-parallax-speed') || 0);
                const offset = Math.round(scrollY * speed);
                node.style.transform = `translate3d(0, ${offset}px, 0)`;
            });
            ticking = false;
        };

        const handleScroll = () => {
            if (ticking) {
                return;
            }
            ticking = true;
            window.requestAnimationFrame(updateParallax);
        };

        updateParallax();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            parallaxNodes.forEach((node) => {
                node.style.transform = '';
            });
        };
    }, []);

    function handleQuickTrack() {
        const result = lookupTracking(quickReference, language);

        if (result.key === 'empty') {
            setQuickResult({ message: copy.tracking.empty });
            setQuickResultData(null);
            return;
        }

        if (result.key === 'missing') {
            setQuickResult({ message: copy.tracking.missing });
            setQuickResultData(null);
            return;
        }

        setQuickResult({
            title: result.record.title,
            message: result.record.message,
            detail: result.record.detail
        });
        setQuickResultData(result.record);
    }

    function handleViewQuickMap() {
        if (quickResultData) {
            setShowQuickMap(true);
        }
    }

    return (
        <main className="page-enter home-scroll-experience">
            <HomeAnnouncementCarousel />

            <section className="hero-section hero-home snap-section">
                <div className="hero-media" data-parallax-speed="0.14"></div>
                <div className="container hero-grid">
                    <div className="hero-copy">
                        <p className="eyebrow">{copy.heroEyebrow}</p>
                        <h1>{copy.heroTitle}</h1>
                        <p className="hero-text">{copy.heroText}</p>
                        <div className="hero-actions">
                            <a className="button button-primary" href={getMaskedHref('quote')}>{copy.ctaQuote}</a>
                            <a className="button button-secondary" href={getMaskedHref('contact')}>{copy.ctaContact}</a>
                        </div>
                    </div>

                    <div className="hero-panel hero-panel-sticky slide-up-card">
                        <div className="quick-track-card hero-quick-track">
                            <h2>Quick Tracking</h2>
                            <p>Track your package instantly from the home page.</p>
                            <div className="tracking-actions">
                                <input
                                    value={quickReference}
                                    onChange={(event) => setQuickReference(event.target.value)}
                                    placeholder="ATX-2047"
                                />
                                <button className="button button-primary" type="button" onClick={handleQuickTrack}>Track Now</button>
                            </div>
                            <div className="tracking-result quick-tracking-result">
                                {quickResult?.title ? (
                                    <>
                                        <h2>{quickResult.title}</h2>
                                        <p>{quickResult.message}</p>
                                        <p>{quickResult.detail}</p>
                                        <button className="button button-primary tracking-map-btn" onClick={handleViewQuickMap}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', marginRight: '0.5rem'}}><circle cx="12" cy="12" r="9"/><path d="M12 2v20M2 12h20"/><path d="M12 6v12M6 12h12"/></svg>
                                            View Shipment Map
                                        </button>
                                    </>
                                ) : <p>{quickResult?.message || copy.tracking.helper}</p>}
                            </div>
                        </div>

                        <div className="floating-card">
                            <span className="card-kicker">{copy.routeKicker}</span>
                            <h2>USA <span>to</span> Kinshasa</h2>
                            <p>{copy.routeText}</p>
                            <div className="route-points">
                                {copy.routePoints.map((point) => <span key={point}>{point}</span>)}
                            </div>
                        </div>
                        <img className="hero-logo" src={getAssetHref('Logo/logo-1.png')} alt="Alkash-Trans brand mark" />
                    </div>
                </div>
            </section>

            <section className="section trust-strip snap-section">
                <div className="container home-metrics">
                    {copy.heroPoints.map((point) => (
                        <article className="metric-card" key={point.value}>
                            <strong>{point.value}</strong>
                            <span>{point.label}</span>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section snap-section">
                <div className="container home-story-grid">
                    <article className="story-card">
                        <h2>{copy.homeSections.introTitle}</h2>
                        <p>{copy.homeSections.introText}</p>
                    </article>
                    <article className="story-card quote-card">
                        <h2>{copy.homeSections.reviewTitle}</h2>
                        <p>"{copy.homeSections.reviewQuote}"</p>
                        <strong>{copy.homeSections.reviewAuthor}</strong>
                    </article>
                </div>
            </section>
            {showQuickMap && quickResultData && (
                <TrackingMap
                    trackingData={quickResultData}
                    language={language}
                    onClose={() => setShowQuickMap(false)}
                />
            )}
        </main>
    );
}

function AboutPage({ copy }) {
    return (
        <PageFrame eyebrow={copy.about.eyebrow} title={copy.about.title}>
            <div className="content-grid">
                <div className="content-stack">
                    {copy.about.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                <div className="content-sidebar">
                    <article className="info-card">
                        <h2>{copy.about.reasonsTitle}</h2>
                        <ul>
                            {copy.about.reasons.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    </article>
                    <article className="info-card accent-card">
                        <h2>{copy.about.promiseTitle}</h2>
                        <p>{copy.about.promiseText}</p>
                    </article>
                </div>
            </div>
        </PageFrame>
    );
}

function ServicesPage({ copy }) {
    const [draftCount, setDraftCount] = useState(() => readQuoteDraft().reduce((sum, item) => sum + item.quantity, 0));
    const [activeTab, setActiveTab] = useState('All');

    const visibleItems = useMemo(
        () => quoteBuilderItems.filter((item) => activeTab === 'All' || item.category === activeTab),
        [activeTab]
    );

    function handleAddToQuote(item) {
        const updated = addItemToQuoteDraft(item);
        setDraftCount(updated.reduce((sum, entry) => sum + entry.quantity, 0));
    }

    return (
        <PageFrame eyebrow={copy.services.eyebrow} title={copy.services.title} intro={copy.services.intro}>
            <section className="service-shop-shell">
                <div className="service-shop-head">
                    <h2>Top Savings for You</h2>
                    <p>Tap + to build your quote cart instantly.</p>
                </div>
                <div className="service-shop-tabs" role="tablist" aria-label="Service categories">
                    {serviceShopTabs.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={`service-tab${activeTab === tab ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <p className="service-image-note">Item images are loaded from <strong>ALKASH/public/assets/services/</strong>.</p>

                <div className="service-track" role="list">
                    {visibleItems.map((item) => {
                        const comparePrice = Math.round(item.price * 1.35);
                        const savings = comparePrice - item.price;
                        return (
                            <article className="shop-card" role="listitem" key={item.key}>
                                <div className="shop-thumb" data-missing="false">
                                    <img
                                        src={getServiceImageHref(item.image)}
                                        alt={item.label}
                                        loading="lazy"
                                        onError={(event) => {
                                            event.currentTarget.parentElement?.setAttribute('data-missing', 'true');
                                        }}
                                    />
                                    <span className="shop-thumb-fallback" aria-hidden="true">{item.icon}</span>
                                </div>
                                <h3>{item.label}</h3>
                                <p className="shop-rating">{'★'.repeat(5)} <span>{item.rating.toFixed(1)}</span></p>
                                <div className="shop-price-line">
                                    <strong>${item.price.toLocaleString()}</strong>
                                    <s>${comparePrice.toLocaleString()}</s>
                                </div>
                                <p className="shop-save">Save ${savings.toLocaleString()}</p>
                                <button className="shop-add" type="button" onClick={() => handleAddToQuote(item)} aria-label={`Add ${item.label} to quote`}>
                                    +
                                </button>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="quote-builder-panel">
                <div className="quote-builder-header">
                    <h2>Build your quote instantly</h2>
                    <p>Use the + button to add items from the official price list. Items in draft: <strong>{draftCount}</strong></p>
                    <a className="button button-primary" href={getMaskedHref('quote')}>Open Quote Builder</a>
                </div>

                <div className="quote-item-grid">
                    {quoteBuilderItems.map((item) => (
                        <article className="quote-item-card" key={item.key}>
                            <div className="quote-item-main">
                                <img
                                    className="quote-item-image"
                                    src={getServiceImageHref(item.image)}
                                    alt={item.label}
                                    loading="lazy"
                                />
                                <div>
                                <h3>{item.label}</h3>
                                <p>${item.price.toLocaleString()}</p>
                                </div>
                            </div>
                            <button className="quote-add-btn" type="button" onClick={() => handleAddToQuote(item)} aria-label={`Add ${item.label} to quote`}>
                                +
                            </button>
                        </article>
                    ))}
                </div>
            </section>
        </PageFrame>
    );
}

function SchedulePage({ copy }) {
    return (
        <PageFrame eyebrow={copy.schedule.eyebrow} title={copy.schedule.title} intro={copy.schedule.intro}>
            <div className="schedule-table-wrapper">
                <table className="schedule-table">
                    <thead>
                        <tr>
                            {copy.schedule.columns.map((column) => <th key={column}>{column}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {copy.schedule.rows.map((row) => (
                            <tr key={row.join('-')}>
                                {row.map((value, index) => (
                                    <td key={`${value}-${index}`}>
                                        {index === 3 ? (
                                            <span className={`status-pill ${value.toLowerCase().includes('limited') || value.toLowerCase().includes('limitees') ? 'status-limited' : 'status-open'}`}>
                                                {value}
                                            </span>
                                        ) : value}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="announcement-grid">
                {copy.schedule.notices.map(([title, text]) => (
                    <article className="notice-card" key={title}>
                        <h2>{title}</h2>
                        <p>{text}</p>
                    </article>
                ))}
            </div>
        </PageFrame>
    );
}

function QuotePage({ copy }) {
    const [feedback, setFeedback] = useState('');
    const [draftItems, setDraftItems] = useState(() => readQuoteDraft());

    const draftTotal = draftItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    function handleClearDraft() {
        clearQuoteDraft();
        setDraftItems([]);
    }

    return (
        <PageFrame eyebrow={copy.quote.eyebrow} title={copy.quote.title} intro={copy.quote.intro}>
            {draftItems.length ? (
                <section className="quote-draft-summary">
                    <div>
                        <h2>Selected pricing items</h2>
                        <p>These items were added from Services using the + button.</p>
                    </div>
                    <ul>
                        {draftItems.map((item) => (
                            <li key={item.key}>
                                <span>{item.label} x {item.quantity}</span>
                                <strong>${(item.price * item.quantity).toLocaleString()}</strong>
                            </li>
                        ))}
                    </ul>
                    <div className="quote-draft-total">
                        <span>Estimated subtotal</span>
                        <strong>${draftTotal.toLocaleString()}</strong>
                    </div>
                    <button type="button" className="button button-secondary" onClick={handleClearDraft}>Clear Builder</button>
                </section>
            ) : null}

            <form className="form-card form-layout" onSubmit={(event) => {
                event.preventDefault();
                setFeedback(copy.quote.success);
                clearQuoteDraft();
                setDraftItems([]);
                event.currentTarget.reset();
            }}>
                <div className="field-grid">
                    <label><span>{copy.quote.fields.name}</span><input type="text" required /></label>
                    <label><span>{copy.quote.fields.phone}</span><input type="tel" required /></label>
                    <label><span>{copy.quote.fields.email}</span><input type="email" required /></label>
                    <label><span>{copy.quote.fields.destination}</span><input type="text" defaultValue="Kinshasa, DRC" required /></label>
                    <label>
                        <span>{copy.quote.fields.cargoType}</span>
                        <select required defaultValue="">
                            <option value="" disabled>Select</option>
                            {copy.quote.cargoOptions.map((option) => <option key={option}>{option}</option>)}
                        </select>
                    </label>
                    <label><span>{copy.quote.fields.weight}</span><input type="text" required /></label>
                </div>
                <label><span>{copy.quote.fields.notes}</span><textarea rows="6"></textarea></label>
                <button className="button button-primary form-button" type="submit">{copy.quote.fields.send}</button>
                <p className="form-feedback">{feedback}</p>
            </form>
        </PageFrame>
    );
}

function TrackingPage({ copy, language }) {
    const [reference, setReference] = useState('');
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState(copy.tracking.helper);
    const [showMap, setShowMap] = useState(false);

    useEffect(() => {
        setResult(null);
        setMessage(copy.tracking.helper);
    }, [copy.tracking.helper]);

    function handleTrack() {
        const lookup = lookupTracking(reference, language);

        if (lookup.key === 'empty') {
            setResult(null);
            setMessage(copy.tracking.empty);
            return;
        }

        if (lookup.key === 'missing') {
            setResult(null);
            setMessage(copy.tracking.missing);
            return;
        }

        setResult(lookup.record);
        setMessage('');
    }

    function handleViewMap() {
        if (result) {
            setShowMap(true);
        }
    }

    return (
        <PageFrame eyebrow={copy.tracking.eyebrow} title={copy.tracking.title} intro={copy.tracking.intro}>
            <div className="tracking-layout-box">
                <label className="tracking-label">
                    <span>{copy.tracking.label}</span>
                    <div className="tracking-actions">
                        <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="ATX-2047" />
                        <button className="button button-primary" type="button" onClick={handleTrack}>{copy.tracking.button}</button>
                    </div>
                </label>
                <div className="tracking-result">
                            {result ? (
                        <>
                            <h2>{result.title}</h2>
                            <p>{result.message}</p>
                            <p><strong>{copy.tracking.updateLabel}:</strong> {result.detail}</p>
                            <button className="button button-primary tracking-map-btn" onClick={handleViewMap}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', marginRight: '0.5rem'}}><circle cx="12" cy="12" r="9"/><path d="M12 2v20M2 12h20"/><path d="M12 6v12M6 12h12"/></svg>
                                View Shipment Map
                            </button>
                        </>
                    ) : <p>{message}</p>}
                </div>
            </div>
            
            {showMap && result && (
                <TrackingMap 
                    trackingData={result} 
                    language={language} 
                    onClose={() => setShowMap(false)} 
                />
            )}
        </PageFrame>
    );
}

function QuickTrackingMapModal({ trackingData, language, onClose }) {
    return <TrackingMap trackingData={trackingData} language={language} onClose={onClose} />;
}

function GalleryPage({ copy }) {
    return (
        <PageFrame eyebrow={copy.gallery.eyebrow} title={copy.gallery.title} intro={copy.gallery.intro}>
            <div className="gallery-grid">
                <figure className="gallery-card gallery-card-wide">
                    <img src={getAssetHref('Logo/logo-2.png')} alt="Alkash-Trans premium logo" />
                    <figcaption>
                        <strong>{copy.gallery.cards[0][0]}</strong>
                        <span>{copy.gallery.cards[0][1]}</span>
                    </figcaption>
                </figure>
                <figure className="gallery-card">
                    <div className="gallery-placeholder cargo-one"></div>
                    <figcaption>
                        <strong>{copy.gallery.cards[1][0]}</strong>
                        <span>{copy.gallery.cards[1][1]}</span>
                    </figcaption>
                </figure>
                <figure className="gallery-card">
                    <div className="gallery-placeholder cargo-two"></div>
                    <figcaption>
                        <strong>{copy.gallery.cards[2][0]}</strong>
                        <span>{copy.gallery.cards[2][1]}</span>
                    </figcaption>
                </figure>
                <figure className="gallery-card gallery-card-tall">
                    <img src={getAssetHref('Logo/logo-1.png')} alt="Alkash-Trans classic logo" />
                    <figcaption>
                        <strong>{copy.gallery.cards[3][0]}</strong>
                        <span>{copy.gallery.cards[3][1]}</span>
                    </figcaption>
                </figure>
            </div>
        </PageFrame>
    );
}

function ContactPage({ copy }) {
    const [feedback, setFeedback] = useState('');
    const [showIslandPhone, setShowIslandPhone] = useState(false);

    return (
        <PageFrame eyebrow={copy.contact.eyebrow} title={copy.contact.title}>
            <div className="contact-layout-grid">
                <div className="contact-sidebar">
                    <article className="contact-card"><span className="label">{copy.contact.phone}</span><a href="tel:+18178846898">+1 817 884 6898</a></article>
                    <article className="contact-card"><span className="label">{copy.contact.email}</span><a href="mailto:info@alkashtrans.com">info@alkashtrans.com</a></article>
                    <article className="contact-card"><span className="label">{copy.contact.whatsapp}</span><a href="https://wa.me/18178846898" target="_blank" rel="noreferrer">Chat now</a></article>
                    <div className="social-links">
                        {socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>)}
                    </div>
                </div>

                <form className="form-card" onSubmit={(event) => {
                    event.preventDefault();
                    setFeedback(copy.contact.success);
                    event.currentTarget.reset();
                }}>
                    <label><span>{copy.contact.form.name}</span><input type="text" required /></label>
                    <label><span>{copy.contact.form.email}</span><input type="email" required /></label>
                    <label><span>{copy.contact.form.phone}</span><input type="tel" /></label>
                    <label><span>{copy.contact.form.message}</span><textarea rows="6" required></textarea></label>
                    <button className="button button-primary form-button" type="submit">{copy.contact.form.send}</button>
                    <p className="form-feedback">{feedback}</p>
                </form>
            </div>

            <div className="map-wrapper">
                <iframe title="Kinshasa map" src="https://www.google.com/maps?q=Kinshasa%2C%20Democratic%20Republic%20of%20the%20Congo&z=10&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
            </div>

            <button className="whatsapp-float" type="button" onClick={() => setShowIslandPhone(true)}>
                WhatsApp
            </button>

            {showIslandPhone ? (
                <div className="island-overlay" role="dialog" aria-modal="true" aria-label="WhatsApp AI chat">
                    <div className="island-overlay-panel">
                        <button className="island-overlay-close" type="button" onClick={() => setShowIslandPhone(false)}>Close</button>
                        <WhatsAppIslandDemo />
                    </div>
                </div>
            ) : null}
        </PageFrame>
    );
}

function AskPage() {
    const [issue, setIssue] = useState('');
    const [feedback, setFeedback] = useState('');
    const session = getSession();

    function submitCase(event) {
        event.preventDefault();

        if (!session) {
            setFeedback('Please login first so we can attach this request to your account.');
            return;
        }

        const id = addSupportCase(session.email, issue.trim());
        setFeedback(`Case ${id} has been created and sent to the support queue.`);
        setIssue('');
    }

    return (
        <PageFrame eyebrow="Ask Alkash" title="Need help right now?" intro="Ask Alkash for support and open a case when your shipment needs attention.">
            <div className="dashboard-grid-single">
                <article className="info-card">
                    <h2>Quick help</h2>
                    <p>For shipment references, start with the quick tracking search on the home page or the dedicated tracking page.</p>
                    <p>For billing, customs, delivery coordination, or package exceptions, open a support case below.</p>
                </article>
                <form className="form-card" onSubmit={submitCase}>
                    <label>
                        <span>Issue details</span>
                        <textarea value={issue} onChange={(event) => setIssue(event.target.value)} rows="6" required></textarea>
                    </label>
                    <button className="button button-primary" type="submit">Open Case</button>
                    <p className="form-feedback">{feedback}</p>
                </form>
            </div>
        </PageFrame>
    );
}

function RegisterPage() {
    const [feedback, setFeedback] = useState('');

    function onSubmit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const result = registerUser({
            name: String(form.get('name') || ''),
            email: String(form.get('email') || ''),
            password: String(form.get('password') || '')
        });

        if (!result.ok) {
            setFeedback(result.message);
            return;
        }

        setFeedback('Registration successful. You can now login.');
        event.currentTarget.reset();
    }

    return (
        <PageFrame eyebrow="Account" title="Register" intro="Create your Alkash portal account to track shipments and manage your support requests.">
            <form className="form-card dashboard-form" onSubmit={onSubmit}>
                <label><span>Full name</span><input name="name" type="text" required /></label>
                <label><span>Email</span><input name="email" type="email" required /></label>
                <label><span>Password</span><input name="password" type="password" required /></label>
                <button className="button button-primary" type="submit">Create Account</button>
                <p className="form-feedback">{feedback}</p>
            </form>
        </PageFrame>
    );
}

function LoginPage({ onSessionChange }) {
    const [feedback, setFeedback] = useState('');

    function onSubmit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const email = String(form.get('email') || '');
        const password = String(form.get('password') || '');

        const result = login(email, password);
        if (!result.ok) {
            setFeedback(result.message);
            return;
        }

        onSessionChange(result.session);
        if (isAdminRole(result.session.role)) {
            window.location.href = getMaskedHref('admin');
            return;
        }

        window.location.href = getMaskedHref('dashboard');
    }

    return (
        <PageFrame eyebrow="Account" title="Login" intro="Login to view your shipment history and current package status.">
            <form className="form-card dashboard-form" onSubmit={onSubmit}>
                <label><span>Email</span><input name="email" type="email" required /></label>
                <label><span>Password</span><input name="password" type="password" required /></label>
                <button className="button button-primary" type="submit">Login</button>
                <p className="form-feedback">{feedback}</p>
                <p className="hint-note">Demo admin credentials: admin@alkashtrans.com / admin123</p>
            </form>
        </PageFrame>
    );
}

function UserDashboardPage({ session }) {
    const packages = useMemo(() => (session ? getUserPackages(session.email) : []), [session]);

    return (
        <PageFrame eyebrow="Portal" title="My Shipments" intro="Review your historical packages and check the current package status.">
            {!session ? (
                <article className="info-card">
                    <h2>Login required</h2>
                    <p>Please login to access this page.</p>
                    <a className="button button-primary" href={getMaskedHref('login')}>Go to login</a>
                </article>
            ) : (
                <div className="dashboard-grid-single">
                    <article className="info-card">
                        <h2>Welcome, {session.name}</h2>
                        <p>Email: {session.email}</p>
                        <p>Role: {session.role}</p>
                    </article>

                    <div className="schedule-table-wrapper">
                        <table className="schedule-table">
                            <thead>
                                <tr>
                                    <th>Reference</th>
                                    <th>Route</th>
                                    <th>Status</th>
                                    <th>Last Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                {packages.length ? packages.map((item) => (
                                    <tr key={item.reference}>
                                        <td>{item.reference}</td>
                                        <td>{item.route}</td>
                                        <td><span className="status-pill status-open">{item.status}</span></td>
                                        <td>{item.updatedAt}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4">No packages found for this account yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </PageFrame>
    );
}

function AdminDashboardPage({ session }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [health] = useState(() => getPlatformHealthSummary());

    if (!session || !isAdminRole(session.role)) {
        return (
            <PageFrame eyebrow="Portal" title="Admin Dashboard" intro="Administrator access required.">
                <article className="info-card">
                    <h2>Access denied</h2>
                    <p>This page is only available to admin or co-admin accounts.</p>
                    <a className="button button-primary" href={getMaskedHref('login')}>Go to login</a>
                </article>
            </PageFrame>
        );
    }

    return (
        <PageFrame compact eyebrow="Admin" title="Platform Dashboard" intro="Manage inventory, announcements, and SEO settings from one compact view.">
            <div className="admin-dashboard-layout">
                <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} session={session} />
                <main className="dashboard-main">
                    {activeTab === 'overview' && <DashboardOverview session={session} health={health} />}
                    {activeTab === 'inventory' && (
                        <InventoryPage
                            quoteBuilderItems={quoteBuilderItems}
                            session={session}
                            getServiceImageHref={getServiceImageHref}
                        />
                    )}
                    {activeTab === 'announcements' && <AnnouncementsPage session={session} />}
                    {activeTab === 'seo' && <SEOPage session={session} />}
                    {activeTab === 'users' && (
                        <UsersPage
                            session={session}
                            getUsers={getUsers}
                            getCases={getCases}
                            featureCatalog={featureCatalog}
                            setUserRole={setUserRole}
                            setUserEnabled={setUserEnabled}
                            setUserFeature={setUserFeature}
                            removeUser={removeUser}
                            registerUser={registerUser}
                        />
                    )}
                </main>
            </div>
        </PageFrame>
    );
}

function Footer({ copy }) {
    return (
        <footer className="site-footer">
            <div className="container footer-grid">
                <div>
                    <img className="footer-logo" src={getAssetHref('Logo/logo-1.png')} alt="Alkash-Trans logo" />
                    <p>{copy.footerText}</p>
                </div>
                <div>
                    <h2>{copy.nav.services}</h2>
                    <a href={getMaskedHref('services')}>{copy.nav.services}</a>
                    <a href={getMaskedHref('schedule')}>{copy.nav.schedule}</a>
                    <a href={getMaskedHref('tracking')}>{copy.nav.tracking}</a>
                </div>
                <div>
                    <h2>{copy.nav.contact}</h2>
                    <a href="tel:+18178846898">+1 817 884 6898</a>
                    <a href="mailto:info@alkashtrans.com">info@alkashtrans.com</a>
                </div>
            </div>
        </footer>
    );
}

const pageComponentMap = {
    home: HomePage,
    about: AboutPage,
    services: ServicesPage,
    schedule: SchedulePage,
    quote: QuotePage,
    tracking: TrackingPage,
    gallery: GalleryPage,
    contact: ContactPage,
    ask: AskPage,
    register: RegisterPage,
    login: LoginPage,
    dashboard: UserDashboardPage,
    admin: AdminDashboardPage
};

function SiteApp({ pageKey }) {
    const [language, setLanguage] = useLanguage();
    const [session, setSession] = useState(() => getSession());
    const [showLoader, setShowLoader] = useState(false);
    const copy = translations[language];
    const PageComponent = pageComponentMap[pageKey] || HomePage;

    useEffect(() => {
        initializePortalData();
        setSession(getSession());

        const loaderSeen = localStorage.getItem('alkashLandingLoaderSeen');
        if (!loaderSeen) {
            setShowLoader(true);
            const timer = window.setTimeout(() => {
                setShowLoader(false);
                localStorage.setItem('alkashLandingLoaderSeen', 'true');
            }, 1800);

            return () => window.clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const isHome = pageKey === 'home';

        html.classList.toggle('scroll-enhanced-home', isHome);
        body.classList.toggle('scroll-enhanced-home', isHome);

        return () => {
            html.classList.remove('scroll-enhanced-home');
            body.classList.remove('scroll-enhanced-home');
        };
    }, [pageKey]);

    useEffect(() => {
        const header = document.querySelector('.site-header');
        if (!header) {
            return undefined;
        }

        const setOffset = () => {
            document.documentElement.style.setProperty('--header-offset', `${header.offsetHeight + 16}px`);
        };

        setOffset();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(setOffset);
            observer.observe(header);
            return () => observer.disconnect();
        }

        window.addEventListener('resize', setOffset);
        return () => window.removeEventListener('resize', setOffset);
    }, []);

    useEffect(() => {
        if (pageKey === 'dashboard' && (!session || isAdminRole(session.role))) {
            window.location.href = getMaskedHref('login');
            return;
        }

        if (pageKey === 'admin' && (!session || !isAdminRole(session.role))) {
            window.location.href = getMaskedHref('login');
        }
    }, [pageKey, session]);

    function handleLogout() {
        clearSession();
        setSession(null);
        window.location.href = getMaskedHref('home');
    }

    return (
        <div className="app-shell">
            {showLoader ? (
                <div className="landing-loader" role="status" aria-live="polite" aria-label="Loading Alkash-Trans website">
                    <div className="landing-loader-card">
                        <div className="landing-loader-ring" aria-hidden="true"></div>
                        <img className="landing-loader-logo" src={getAssetHref('Logo/logo-1.png')} alt="Alkash-Trans logo" />
                        <p>Welcome to Alkash-Trans</p>
                    </div>
                </div>
            ) : null}
            <Header copy={copy} pageKey={pageKey} language={language} setLanguage={setLanguage} session={session} onLogout={handleLogout} />
            <PageComponent copy={copy} language={language} session={session} onSessionChange={setSession} />
            <Footer copy={copy} />
        </div>
    );
}

export function renderPageApp(pageKey) {
    const app = <SiteApp pageKey={pageKey} />;
    const session = getSession();
    return (
        <EditModeProvider isLoggedIn={session && isAdminRole(session.role)}>
            {app}
        </EditModeProvider>
    );
}

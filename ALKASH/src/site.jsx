import { useEffect, useMemo, useState } from 'react';
import { trackingData, translations } from './content.js';
import { getAssetHref, getMaskedHref } from './routes.js';
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

const quoteBuilderItems = [
    { key: 'small_box', label: 'Small Box (16x12x12)', price: 50, category: 'Boxes', icon: 'BX', rating: 4.8, image: 'assets/services/small_box.png' },
    { key: 'medium_box', label: 'Medium Box (18x18x16)', price: 80, category: 'Boxes', icon: 'BX', rating: 4.9, image: 'assets/services/medium_box.png' },
    { key: 'large_small_box', label: 'Large (Small) Box (18x18x24)', price: 100, category: 'Boxes', icon: 'BX', rating: 4.8, image: 'assets/services/large_small_box.png' },
    { key: 'large_box', label: 'Large Box (24x18x24)', price: 120, category: 'Boxes', icon: 'BX', rating: 4.9, image: 'assets/services/large_box.png' },
    { key: 'xlarge_box', label: 'XLarge Box (24x18x24)', price: 150, category: 'Boxes', icon: 'BX', rating: 4.7, image: 'assets/services/xlarge_box.png' },
    { key: 'xxlarge_box', label: 'XXLarge Box (18x21x16)', price: 200, category: 'Boxes', icon: 'BX', rating: 4.7, image: 'assets/services/xxlarge_box.png' },
    { key: 'suitcase_medium', label: 'Suitcase Medium', price: 50, category: 'Travel', icon: 'BG', rating: 4.6, image: 'assets/services/suitcase_medium.png' },
    { key: 'suitcase_large', label: 'Suitcase Large', price: 80, category: 'Travel', icon: 'BG', rating: 4.7, image: 'assets/services/suitcase_large.png' },
    { key: 'drum_50', label: 'Drum 50"', price: 220, category: 'Barrels', icon: 'DR', rating: 4.8, image: 'assets/services/drum_50.png' },
    { key: 'drum_53', label: 'Drum 53"', price: 280, category: 'Barrels', icon: 'DR', rating: 4.8, image: 'assets/services/drum_53.png' },
    { key: 'pickup_small', label: 'Pickup the Box', price: 20, category: 'Travel', icon: 'PK', rating: 4.5, image: 'assets/services/pickup_small.png' },
    { key: 'large_cooler', label: 'Large Cooler', price: 80, category: 'Travel', icon: 'CL', rating: 4.5, image: 'assets/services/large_cooler.png' },
    { key: 'sedan_vehicle', label: 'Sedan Vehicle', price: 2700, category: 'Vehicles', icon: 'VH', rating: 4.9, image: 'assets/services/sedan_vehicle.png' },
    { key: 'suv_vehicle', label: 'SUV Vehicle', price: 3000, category: 'Vehicles', icon: 'VH', rating: 4.9, image: 'assets/services/suv_vehicle.png' },
    { key: 'big_suv_4x4', label: 'Big SUV 4x4', price: 3500, category: 'Vehicles', icon: 'VH', rating: 4.9, image: 'assets/services/big_suv_4x4.png' }
];

const serviceShopTabs = ['All', 'Boxes', 'Travel', 'Barrels', 'Vehicles'];

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

    return { key: 'found', record: item[language] };
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

function PageFrame({ eyebrow, title, intro, children }) {
    return (
        <main className="page-shell page-enter">
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

function HomePage({ copy, language }) {
    const [quickReference, setQuickReference] = useState('');
    const [quickResult, setQuickResult] = useState(null);

    function handleQuickTrack() {
        const result = lookupTracking(quickReference, language);

        if (result.key === 'empty') {
            setQuickResult({ message: copy.tracking.empty });
            return;
        }

        if (result.key === 'missing') {
            setQuickResult({ message: copy.tracking.missing });
            return;
        }

        setQuickResult({
            title: result.record.title,
            message: result.record.message,
            detail: result.record.detail
        });
    }

    return (
        <main className="page-enter">
            <section className="hero-section hero-home">
                <div className="hero-media"></div>
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

                    <div className="hero-panel slide-up-card">
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

            <section className="section trust-strip">
                <div className="container home-metrics">
                    {copy.heroPoints.map((point) => (
                        <article className="metric-card" key={point.value}>
                            <strong>{point.value}</strong>
                            <span>{point.label}</span>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section">
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
                                        src={getAssetHref(item.image)}
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
                                    src={getAssetHref(item.image)}
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
                        </>
                    ) : <p>{message}</p>}
                </div>
            </div>
        </PageFrame>
    );
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
    const [users, setUsers] = useState(() => getUsers());
    const [cases, setCases] = useState(() => getCases());
    const [health, setHealth] = useState(() => getPlatformHealthSummary());

    function refreshData() {
        setUsers(getUsers());
        setCases(getCases());
        setHealth(getPlatformHealthSummary());
    }

    function updateRole(email, role) {
        setUserRole(email, role);
        refreshData();
    }

    function updateEnabled(email, enabled) {
        setUserEnabled(email, enabled);
        refreshData();
    }

    function updateFeature(email, feature, enabled) {
        setUserFeature(email, feature, enabled);
        refreshData();
    }

    function deleteUser(email) {
        if (email.toLowerCase() === session.email.toLowerCase()) {
            return;
        }
        removeUser(email);
        refreshData();
    }

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
        <PageFrame eyebrow="Admin" title="Platform Dashboard" intro="Monitor user accounts, open/problem cases, and platform health.">
            <div className="admin-health-grid">
                <article className="metric-card"><strong>{health.totalUsers}</strong><span>Total users</span></article>
                <article className="metric-card"><strong>{health.activeUsers}</strong><span>Active users</span></article>
                <article className="metric-card"><strong>{health.openCases}</strong><span>Open/problem cases</span></article>
                <article className="metric-card"><strong>{health.uptime}</strong><span>Platform uptime</span></article>
            </div>

            <div className="dashboard-grid-single">
                <div className="schedule-table-wrapper">
                    <table className="schedule-table admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Privileges</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.email}>
                                    <td>
                                        <strong>{user.name}</strong>
                                        <div>{user.email}</div>
                                    </td>
                                    <td>
                                        <select value={user.role} onChange={(event) => updateRole(user.email, event.target.value)}>
                                            <option value="user">user</option>
                                            <option value="co-admin">co-admin</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button
                                            className="button button-secondary tiny-action"
                                            type="button"
                                            onClick={() => updateEnabled(user.email, !user.enabled)}
                                        >
                                            {user.enabled ? 'Disable' : 'Enable'}
                                        </button>
                                    </td>
                                    <td>
                                        <div className="feature-chips">
                                            {featureCatalog.map((feature) => {
                                                const granted = (user.features || []).includes(feature.key);
                                                return (
                                                    <button
                                                        key={feature.key}
                                                        className={`button button-secondary tiny-action ${granted ? 'granted' : ''}`}
                                                        type="button"
                                                        onClick={() => updateFeature(user.email, feature.key, !granted)}
                                                    >
                                                        {feature.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td>
                                        <button className="button button-secondary tiny-action" type="button" onClick={() => deleteUser(user.email)}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="schedule-table-wrapper">
                    <table className="schedule-table">
                        <thead>
                            <tr>
                                <th>Case ID</th>
                                <th>User</th>
                                <th>Issue</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>{item.userEmail}</td>
                                    <td>{item.issue}</td>
                                    <td>
                                        <span className={`status-pill ${item.severity === 'problem' ? 'status-limited' : 'status-open'}`}>
                                            {item.severity}
                                        </span>
                                    </td>
                                    <td>{item.createdAt}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
            {pageKey === 'contact' ? (
                <a className="whatsapp-float" href="https://wa.me/18178846898" target="_blank" rel="noreferrer">WhatsApp</a>
            ) : null}
        </div>
    );
}

export function renderPageApp(pageKey) {
    return <SiteApp pageKey={pageKey} />;
}

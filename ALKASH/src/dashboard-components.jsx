// Dashboard Components for Alkash-Trans Admin Portal
// Includes Sidebar, Inventory, Announcements, and SEO management

import { useState, useEffect, useRef } from 'react';
import { uploadToS3, archiveAnnouncementToS3 } from './s3-utils.js';
import { processImage, saveImageToLibrary, getImageLibrary, deleteImageFromLibrary, incrementImageUsage } from './image-utils.js';
import { loadPageViewStats, PAGE_VIEW_LABELS, getViewsInLastHours } from './analytics.js';

const sidebarSections = [
    {
        label: 'Overview',
        items: [
            { id: 'overview', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
        ]
    },
    {
        label: 'Content',
        items: [
            { id: 'inventory', label: 'Inventory', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
            { id: 'announcements', label: 'Announcements', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
        ]
    },
    {
        label: 'Users',
        items: [
            { id: 'users', label: 'Manage Users', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
        ]
    },
    {
        label: 'Settings',
        items: [
            { id: 'seo', label: 'SEO Stats', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> }
        ]
    }
];

/**
 * Sidebar Navigation for Admin Dashboard
 */
export function DashboardSidebar({ activeTab, onTabChange, session }) {
    const [collapsed, setCollapsed] = useState({});

    function toggleSection(label) {
        setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
    }

    return (
        <aside className="dashboard-sidebar">
            <div className="sidebar-brand">
                <span className="sidebar-brand-icon">⚙</span>
                <span className="sidebar-brand-name">Admin Portal</span>
            </div>

            <nav className="sidebar-nav">
                {sidebarSections.map(section => (
                    <div key={section.label} className="sidebar-section">
                        <button
                            className="sidebar-section-header"
                            onClick={() => toggleSection(section.label)}
                        >
                            <span>{section.label}</span>
                            <span className={`sidebar-chevron ${collapsed[section.label] ? 'collapsed' : ''}`}>›</span>
                        </button>
                        {!collapsed[section.label] && section.items.map(item => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => onTabChange(item.id)}
                            >
                                <span className="sidebar-icon">{item.icon}</span>
                                <span className="sidebar-label">{item.label}</span>
                                {activeTab === item.id && <span className="sidebar-active-dot" />}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user-avatar">{(session?.name || 'A')[0].toUpperCase()}</div>
                <div className="sidebar-user-info">
                    <p className="sidebar-user-name">{session?.name || 'Admin'}</p>
                    <p className="sidebar-user-role">{session?.role}</p>
                </div>
            </div>
        </aside>
    );
}

/**
 * Dashboard Overview - Summary Statistics
 */
export function DashboardOverview({ session, health }) {
    const metrics = [
        { value: health?.totalUsers ?? 42, label: 'Total Users', icon: '👥', trend: '+4%' },
        { value: health?.activeUsers ?? 28, label: 'Active Users', icon: '✅', trend: '+2%' },
        { value: health?.openCases ?? 156, label: 'Open Cases', icon: '📋', trend: 'stable' },
        { value: health?.uptime ?? '99.7%', label: 'Uptime', icon: '🟢', trend: '' },
    ];

    return (
        <div className="dash-page">
            <div className="dash-breadcrumb">
                <span className="dash-breadcrumb-root">Alkash-Trans Admin</span>
                <span className="dash-breadcrumb-sep">›</span>
                <span className="dash-breadcrumb-current">Overview</span>
            </div>

            <div className="dash-page-header">
                <h2 className="dash-page-title">Dashboard</h2>
                <p className="dash-page-sub">Platform health and activity overview</p>
            </div>

            <div className="dash-metrics-grid">
                {metrics.map(m => (
                    <div key={m.label} className="dash-metric-card">
                        <div className="dash-metric-icon">{m.icon}</div>
                        <div className="dash-metric-body">
                            <div className="dash-metric-value">{m.value}</div>
                            <div className="dash-metric-label">{m.label}</div>
                        </div>
                        {m.trend && <div className={`dash-metric-trend ${m.trend === 'stable' ? 'neutral' : 'up'}`}>{m.trend}</div>}
                    </div>
                ))}
            </div>

            <div className="dash-section-header">Account</div>

            <div className="dash-info-card">
                <div className="dash-info-row">
                    <span className="dash-info-label">Logged in as</span>
                    <span className="dash-info-value">{session?.name}</span>
                </div>
                <div className="dash-info-row">
                    <span className="dash-info-label">Role</span>
                    <span className="dash-info-badge">{session?.role}</span>
                </div>
                <div className="dash-info-row">
                    <span className="dash-info-label">Email</span>
                    <span className="dash-info-value">{session?.email}</span>
                </div>
            </div>
        </div>
    );
}

const INVENTORY_IMAGE_OVERRIDES_KEY = 'alkashInventoryImageOverrides';

export function loadInventoryImageOverrides() {
    try {
        return JSON.parse(localStorage.getItem(INVENTORY_IMAGE_OVERRIDES_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveInventoryImageOverrides(overrides) {
    localStorage.setItem(INVENTORY_IMAGE_OVERRIDES_KEY, JSON.stringify(overrides));
}

/**
 * Inventory Management - Service Images Editor
 */
export function InventoryPage({ quoteBuilderItems, session, getServiceImageHref }) {
    const [services] = useState(quoteBuilderItems);
    const [uploading, setUploading] = useState(null);
    const [uploadMessage, setUploadMessage] = useState('');
    const [imageOverrides, setImageOverrides] = useState(() => loadInventoryImageOverrides());

    async function handleImageUpload(event, serviceKey) {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(serviceKey);
        setUploadMessage('');

        const processed = await processImage(file);
        if (!processed.success) {
            setUploadMessage(`✗ ${processed.error}`);
            setUploading(null);
            return;
        }

        // Show the picked picture immediately as the item's preview and keep it
        // persisted locally, since AWS S3 upload below is only a mock endpoint.
        setImageOverrides(prev => {
            const next = { ...prev, [serviceKey]: processed.base64 };
            saveInventoryImageOverrides(next);
            return next;
        });

        const path = `services/${serviceKey}.png`;
        const result = await uploadToS3(file, path);

        setUploadMessage(result.success
            ? `✓ ${serviceKey} preview updated and uploaded to S3`
            : `✓ ${serviceKey} preview updated (S3 upload failed: ${result.error})`);

        setTimeout(() => {
            setUploading(null);
            setUploadMessage('');
        }, 3000);
    }

    function resetImage(serviceKey) {
        setImageOverrides(prev => {
            const next = { ...prev };
            delete next[serviceKey];
            saveInventoryImageOverrides(next);
            return next;
        });
    }

    return (
        <div className="dash-page">
            <div className="dash-breadcrumb">
                <span className="dash-breadcrumb-root">Alkash-Trans Admin</span>
                <span className="dash-breadcrumb-sep">›</span>
                <span className="dash-breadcrumb-current">Inventory</span>
            </div>
            <div className="dash-page-header">
                <h2 className="dash-page-title">Service Inventory</h2>
                <p className="dash-page-sub">Tap the edit button on any item to preview and set a new picture from your device.</p>
            </div>
        <div className="dashboard-panel inventory-panel">
            
            {uploadMessage && (
                <div className={`upload-message ${uploadMessage.startsWith('✓') ? 'success' : 'error'}`}>
                    {uploadMessage}
                </div>
            )}

            <div className="inventory-grid">
                {services.map(service => {
                    const previewSrc = imageOverrides[service.key] || getServiceImageHref(service.image);
                    return (
                    <div key={service.key} className="inventory-card">
                        <div className="inventory-image-wrapper">
                            <img
                                src={previewSrc}
                                alt={service.label}
                                className="inventory-image"
                            />
                            <label className="image-upload-overlay" aria-label={`Edit picture for ${service.label}`}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, service.key)}
                                    disabled={uploading === service.key}
                                    hidden
                                />
                                <span>{uploading === service.key ? '⏳ Uploading…' : '📷 Edit picture'}</span>
                            </label>
                            {imageOverrides[service.key] && (
                                <button
                                    type="button"
                                    className="inventory-reset-image"
                                    onClick={() => resetImage(service.key)}
                                    title="Reset to default picture"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                        <div className="inventory-info">
                            <h4>{service.label}</h4>
                            <p className="inventory-price">${service.price}</p>
                            <p className="inventory-category">{service.category}</p>
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
        </div>
    );
}

/**
 * Image upload dialog with preview
 */
function ImageUploadDialog({ onImageReady, onCancel }) {
    const [preview, setPreview] = useState(null);
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    async function handleFileSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setMessage('');
        const result = await processImage(file);

        if (!result.success) {
            setMessage(result.error);
            setIsProcessing(false);
            return;
        }

        setPreview({ base64: result.base64, name: file.name, size: result.size });
        setIsProcessing(false);
    }

    function handleConfirm() {
        if (!preview) return;
        const imgId = saveImageToLibrary(preview.base64, preview.name);
        onImageReady(preview.base64, imgId);
        onCancel();
    }

    return (
        <div className="img-upload-dialog">
            <div className="img-upload-overlay" onClick={onCancel}></div>
            <div className="img-upload-modal">
                <button className="img-upload-close" onClick={onCancel}>✕</button>
                <h3>Upload Banner Image</h3>

                <div className="img-upload-area" onClick={() => fileInputRef.current?.click()}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        hidden
                    />
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p>Drop image here or click to select</p>
                    <small>Max 2MB · JPG, PNG, WebP</small>
                </div>

                {message && <div className="message warning" style={{ margin: '0.75rem 0' }}>{message}</div>}

                {preview && (
                    <>
                        <div className="img-preview">
                            <img src={preview.base64} alt="preview" />
                        </div>
                        <div className="img-preview-info">
                            <p><strong>{preview.name}</strong></p>
                            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>{Math.round(preview.size / 1024)}KB</p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button type="button" className="ann-submit-btn" onClick={handleConfirm}>
                                Use This Image
                            </button>
                            <button
                                type="button"
                                onClick={() => { setPreview(null); fileInputRef.current?.click(); }}
                                style={{ flex: 1, background: '#f3f4f6', color: 'var(--navy)', border: '1px solid #d1d5db', padding: '0.7rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Choose Different
                            </button>
                        </div>
                    </>
                )}

                {!preview && !isProcessing && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ marginTop: '1rem', width: '100%', background: 'var(--blue)', color: '#fff', border: 'none', padding: '0.7rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Select Image
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Image library/gallery browser
 */
function ImageGallery({ onSelect, onClose }) {
    const [library] = useState(() => getImageLibrary());

    if (!library.length) {
        return (
            <div className="img-gallery-modal">
                <button className="img-upload-close" onClick={onClose} style={{ right: '1rem', top: '1rem' }}>✕</button>
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    <p>No images in library yet. Upload your first image above.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="img-gallery-modal">
            <button className="img-upload-close" onClick={onClose} style={{ right: '1rem', top: '1rem' }}>✕</button>
            <h3 style={{ margin: '0 0 1rem' }}>Image Library</h3>
            <div className="img-gallery-grid">
                {library.map(img => (
                    <button
                        key={img.id}
                        className="img-gallery-item"
                        onClick={() => { onSelect(img.data, img.id); onClose(); }}
                        title={img.name}
                    >
                        <img src={img.data} alt={img.name} />
                        <div className="img-gallery-info">
                            <span className="img-gallery-name">{img.name}</span>
                            <span className="img-gallery-usage">{img.usageCount || 0} uses</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Mini carousel preview (same logic as homepage)
 */
function AnnouncementPreview({ slides }) {
    const active = slides.filter(s => s.active);
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        if (active.length <= 1) return;
        const t = setInterval(() => setIdx(p => (p + 1) % active.length), 3500);
        return () => clearInterval(t);
    }, [active.length]);

    if (!active.length) {
        return (
            <div className="ann-preview-empty">
                No active slides — activate at least one to see a preview.
            </div>
        );
    }

    const slide = active[idx % active.length];
    const isImg = slide.slideType === 'image' && slide.imageUrl;
    const bgStyle = slide.backgroundStyle || 'brand-wave';
    const customUrl = slide.customBackgroundUrl || '';

    const inlineStyle = bgStyle === 'custom-image' && customUrl
        ? { backgroundImage: `linear-gradient(90deg,rgba(9,27,52,.55),rgba(9,27,52,.25)),url(${customUrl})` }
        : undefined;

    return (
        <div className="ann-preview-wrap">
            <div className="ann-preview-label">Homepage Preview</div>
            <div className={`announcement-carousel-slide ${bgStyle} ann-preview-slide`} style={inlineStyle}>
                {isImg && <img src={slide.imageUrl} alt={slide.title} className="announcement-carousel-image" />}
                <div className="announcement-carousel-overlay">
                    <p className="announcement-carousel-kicker">Latest Announcement</p>
                    <h2>{slide.title || 'Announcement'}</h2>
                    {slide.content && <p>{slide.content}</p>}
                </div>
            </div>
            {active.length > 1 && (
                <div className="announcement-carousel-dots">
                    {active.map((_, i) => (
                        <button key={i} className={`announcement-carousel-dot${i === idx % active.length ? ' active' : ''}`} onClick={() => setIdx(i)} />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Announcements Management
 */
export function AnnouncementsPage({ session }) {
    const STORAGE_KEY = 'announcements';
    const [announcements, setAnnouncements] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch { return []; }
    });

    const emptyForm = {
        title: '', content: '', active: true,
        slideType: 'text',
        backgroundStyle: 'brand-wave',
        customBackgroundUrl: '',
        imageUrl: '',
        startDate: '',
        endDate: ''
    };
    const [formData, setFormData] = useState({ ...emptyForm });
    const [isSaving, setIsSaving] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [showImageGallery, setShowImageGallery] = useState(false);

    /* drag state */
    const dragItem = useRef(null);
    const dragOver = useRef(null);

    const brandedBackgrounds = [
        { value: 'brand-wave', label: 'ALKASH Wave (Blue)' },
        { value: 'brand-navy', label: 'ALKASH Navy Gradient' },
        { value: 'brand-sky', label: 'ALKASH Sky Blue' },
        { value: 'custom-image', label: 'Custom Background URL' }
    ];

    function save(updated) {
        setAnnouncements(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    /* ── drag-and-drop handlers ── */
    function onDragStart(e, index) {
        dragItem.current = index;
        e.currentTarget.classList.add('dragging');
    }

    function onDragEnter(e, index) {
        dragOver.current = index;
        e.preventDefault();
    }

    function onDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) {
            dragItem.current = null;
            dragOver.current = null;
            return;
        }
        const reordered = [...announcements];
        const [moved] = reordered.splice(dragItem.current, 1);
        reordered.splice(dragOver.current, 0, moved);
        dragItem.current = null;
        dragOver.current = null;
        save(reordered);
    }

    /* ── form submit ── */
    async function handleAddAnnouncement(e) {
        e.preventDefault();
        setIsSaving(true);
        setFormMessage('');

        if (formData.slideType === 'image' && !formData.imageUrl) {
            setFormMessage('Please select a banner image.');
            setIsSaving(false);
            return;
        }

        const newSlide = {
            id: Date.now(),
            title: formData.title.trim(),
            content: formData.content.trim(),
            active: formData.active,
            slideType: formData.slideType,
            backgroundStyle: formData.backgroundStyle,
            customBackgroundUrl: formData.customBackgroundUrl.trim(),
            imageUrl: formData.imageUrl, // Now base64
            startDate: formData.startDate || null,
            endDate: formData.endDate || null,
            createdBy: session?.name || 'Admin',
            createdAt: new Date().toISOString()
        };

        await archiveAnnouncementToS3(newSlide);
        save([...announcements, newSlide]);
        setFormData({ ...emptyForm });
        setFormMessage('Announcement slide added successfully. ✓');
        setIsSaving(false);
    }

    function toggleActive(id) {
        save(announcements.map(a => a.id === id ? { ...a, active: !a.active } : a));
    }

    function handleDelete(id) {
        save(announcements.filter(a => a.id !== id));
    }

    /* ── schedule status helper ── */
    function scheduleStatus(slide) {
        const now = new Date();
        if (slide.startDate && new Date(slide.startDate) > now) return 'scheduled';
        if (slide.endDate && new Date(slide.endDate) < now) return 'expired';
        return slide.active ? 'live' : 'inactive';
    }

    const statusColor = { live: '#15803d', scheduled: '#b45309', expired: '#dc2626', inactive: '#6b7280' };

    return (
        <>
        <div className="dash-page">
            <div className="dash-breadcrumb">
                <span className="dash-breadcrumb-root">Alkash-Trans Admin</span>
                <span className="dash-breadcrumb-sep">›</span>
                <span className="dash-breadcrumb-current">Announcements</span>
            </div>
            <div className="dash-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2 className="dash-page-title">Announcements</h2>
                    <p className="dash-page-sub">Drag rows to reorder · Set dates to schedule · Preview before publishing.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowPreview(p => !p)}
                    style={{ background: showPreview ? 'var(--navy)' : '#f3f4f6', color: showPreview ? '#fff' : 'var(--navy)', border: '1px solid #d1d5db', borderRadius: 'var(--radius-sm)', padding: '0.55rem 1rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                    {showPreview ? '✕ Close Preview' : '👁 Preview Carousel'}
                </button>
            </div>

            {showPreview && <AnnouncementPreview slides={announcements} />}

        <div className="dashboard-panel announcements-panel">

            <div className="announcement-form">
                <h3>New Slide</h3>
                <form onSubmit={handleAddAnnouncement}>
                    {formMessage && <div className="message success">{formMessage}</div>}

                    <div className="ann-form-row">
                        <label style={{ flex: 1 }}>
                            <span>Slide Type</span>
                            <select value={formData.slideType} onChange={e => setFormData({ ...formData, slideType: e.target.value })}>
                                <option value="text">Text Banner</option>
                                <option value="image">Image Banner</option>
                            </select>
                        </label>
                        <label style={{ flex: 2 }}>
                            <span>Title</span>
                            <input type="text" placeholder="Slide title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                        </label>
                    </div>

                    <label>
                        <span>Content / Caption</span>
                        <textarea placeholder="Announcement message" rows="3" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required />
                    </label>

                    {formData.slideType === 'text' ? (
                        <div className="ann-form-row">
                            <label style={{ flex: 1 }}>
                                <span>Background Preset</span>
                                <select value={formData.backgroundStyle} onChange={e => setFormData({ ...formData, backgroundStyle: e.target.value })}>
                                    {brandedBackgrounds.map(bg => <option key={bg.value} value={bg.value}>{bg.label}</option>)}
                                </select>
                            </label>
                            {formData.backgroundStyle === 'custom-image' && (
                                <label style={{ flex: 2 }}>
                                    <span>Custom Background URL</span>
                                    <input type="url" placeholder="https://..." value={formData.customBackgroundUrl} onChange={e => setFormData({ ...formData, customBackgroundUrl: e.target.value })} />
                                </label>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '1.25rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ flex: 1, minHeight: '60px', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                {formData.imageUrl ? (
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
                                        <img src={formData.imageUrl} alt="preview" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', fontWeight: 500, color: 'var(--navy)' }}>Image selected</p>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Click buttons below to change</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', textAlign: 'center', color: '#9ca3af' }}>
                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>No image selected yet</p>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="button" onClick={() => setShowImageUpload(true)} style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                    📤 Upload
                                </button>
                                <button type="button" onClick={() => setShowImageGallery(true)} style={{ background: '#f3f4f6', color: 'var(--navy)', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                    📚 Library
                                </button>
                                {formData.imageUrl && (
                                    <button type="button" onClick={() => setFormData({ ...formData, imageUrl: '' })} style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                        ✕ Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="ann-form-row">
                        <label style={{ flex: 1 }}>
                            <span>Start Date (optional)</span>
                            <input type="datetime-local" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                        </label>
                        <label style={{ flex: 1 }}>
                            <span>End Date (optional)</span>
                            <input type="datetime-local" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                        </label>
                    </div>

                    <label className="checkbox-label">
                        <input type="checkbox" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                        <span>Publish immediately (Active)</span>
                    </label>

                    <button type="submit" disabled={isSaving} className="ann-submit-btn">
                        {isSaving ? 'Saving…' : '+ Add Slide'}
                    </button>
                </form>
            </div>

            <div className="announcements-list">
                <h3>Slides ({announcements.length}) — drag to reorder</h3>
                {!announcements.length ? (
                    <div className="empty-state">No slides yet. Create one above.</div>
                ) : (
                    <div className="announcement-items-container">
                        {announcements.map((slide, index) => {
                            const status = scheduleStatus(slide);
                            return (
                                <div
                                    key={slide.id}
                                    className="announcement-item ann-drag-item"
                                    draggable
                                    onDragStart={e => onDragStart(e, index)}
                                    onDragEnter={e => onDragEnter(e, index)}
                                    onDragEnd={onDragEnd}
                                    onDragOver={e => e.preventDefault()}
                                >
                                    <span className="ann-drag-handle" title="Drag to reorder">⠿</span>
                                    <div className="ann-item-body">
                                        <div className="announcement-header">
                                            <div>
                                                <h4>{slide.title}</h4>
                                                <p>{slide.content}</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleActive(slide.id)}
                                                    style={{ background: slide.active ? '#dcfce7' : '#f3f4f6', color: slide.active ? '#15803d' : '#6b7280', border: 'none', padding: '0.35rem 0.7rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                                                >
                                                    {slide.active ? 'Active' : 'Inactive'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(slide.id)}
                                                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.35rem 0.7rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <div className="announcement-meta">
                                            <span className="status-badge" style={{ background: statusColor[status] + '22', color: statusColor[status] }}>{status}</span>
                                            <span className="creator">{slide.slideType || 'text'}</span>
                                            {slide.startDate && <span className="creator">From: {new Date(slide.startDate).toLocaleDateString()}</span>}
                                            {slide.endDate && <span className="creator">Until: {new Date(slide.endDate).toLocaleDateString()}</span>}
                                            <span className="creator">By: {slide.createdBy}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
        </div>

        {showImageUpload && (
            <ImageUploadDialog
                onImageReady={(base64, imgId) => {
                    setFormData({ ...formData, imageUrl: base64 });
                    incrementImageUsage(imgId);
                }}
                onCancel={() => setShowImageUpload(false)}
            />
        )}

        {showImageGallery && (
            <ImageGallery
                onSelect={(base64, imgId) => {
                    setFormData({ ...formData, imageUrl: base64 });
                    incrementImageUsage(imgId);
                }}
                onClose={() => setShowImageGallery(false)}
            />
        )}
    </>
    );
}

/**
 * Users Management Page
 */
export function UsersPage({ session, getUsers, getCases, featureCatalog, setUserRole, setUserEnabled, setUserFeature, removeUser, registerUser }) {
    const [users, setUsers] = useState(() => getUsers());
    const [cases] = useState(() => getCases());
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [expandedUser, setExpandedUser] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [addMsg, setAddMsg] = useState('');
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

    function refresh() { setUsers(getUsers()); }

    function handleRole(email, role) { setUserRole(email, role); refresh(); }
    function handleEnabled(email, enabled) { setUserEnabled(email, enabled); refresh(); }
    function handleFeature(email, key, enabled) { setUserFeature(email, key, enabled); refresh(); }

    function handleRemove(email) {
        if (email.toLowerCase() === session?.email?.toLowerCase()) return;
        if (!window.confirm(`Remove user ${email}? This cannot be undone.`)) return;
        removeUser(email);
        refresh();
    }

    function handleAddUser(e) {
        e.preventDefault();
        const result = registerUser({ name: newUser.name.trim(), email: newUser.email.trim(), password: newUser.password });
        if (!result.ok) { setAddMsg(result.message); return; }
        if (newUser.role !== 'user') { setUserRole(newUser.email.trim().toLowerCase(), newUser.role); }
        setNewUser({ name: '', email: '', password: '', role: 'user' });
        setAddMsg('');
        setShowAddForm(false);
        refresh();
    }

    const caseCountFor = (email) => cases.filter(c => c.userEmail?.toLowerCase() === email.toLowerCase()).length;

    const filtered = users.filter(u => {
        const matchRole = filterRole === 'all' || u.role === filterRole;
        const q = search.toLowerCase();
        const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
        return matchRole && matchSearch;
    });

    const roleColors = { admin: '#1e40af', 'co-admin': '#7c3aed', user: '#374151' };
    const roleBg    = { admin: '#dbeafe', 'co-admin': '#ede9fe', user: '#f3f4f6' };

    return (
        <div className="dash-page">
            <div className="dash-breadcrumb">
                <span className="dash-breadcrumb-root">Alkash-Trans Admin</span>
                <span className="dash-breadcrumb-sep">›</span>
                <span className="dash-breadcrumb-current">Manage Users</span>
            </div>

            <div className="dash-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2 className="dash-page-title">Users</h2>
                    <p className="dash-page-sub">{users.length} accounts · manage roles, features and access.</p>
                </div>
                <button className="um-add-btn" onClick={() => { setShowAddForm(p => !p); setAddMsg(''); }}>
                    {showAddForm ? '✕ Cancel' : '+ Add User'}
                </button>
            </div>

            {showAddForm && (
                <div className="um-add-form">
                    <h3>New User</h3>
                    {addMsg && <div className="message warning">{addMsg}</div>}
                    <form onSubmit={handleAddUser} className="um-add-form-grid">
                        <label><span>Full Name</span><input required placeholder="Jane Doe" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} /></label>
                        <label><span>Email</span><input required type="email" placeholder="jane@example.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} /></label>
                        <label><span>Password</span><input required type="password" placeholder="Temporary password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} /></label>
                        <label><span>Role</span>
                            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="user">User</option>
                                <option value="co-admin">Co-Admin</option>
                                <option value="admin">Admin</option>
                            </select>
                        </label>
                        <button type="submit" className="ann-submit-btn">Create Account</button>
                    </form>
                </div>
            )}

            <div className="um-toolbar">
                <input className="um-search" type="search" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
                <select className="um-filter" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="co-admin">Co-Admin</option>
                    <option value="user">User</option>
                </select>
            </div>

            <div className="um-table-wrap">
                <table className="um-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Cases</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="um-empty">No users match your search.</td></tr>
                        )}
                        {filtered.map(user => {
                            const isMe = user.email.toLowerCase() === session?.email?.toLowerCase();
                            const open = expandedUser === user.email;
                            return (
                                <>
                                    <tr key={user.email} className={`um-row${open ? ' expanded' : ''}`}>
                                        <td>
                                            <div className="um-user-cell">
                                                <div className="um-avatar">{(user.name || user.email)[0].toUpperCase()}</div>
                                                <div>
                                                    <div className="um-user-name">{user.name} {isMe && <span className="um-you">you</span>}</div>
                                                    <div className="um-user-email">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <select
                                                className="um-role-select"
                                                value={user.role}
                                                disabled={isMe}
                                                onChange={e => handleRole(user.email, e.target.value)}
                                                style={{ background: roleBg[user.role] || '#f3f4f6', color: roleColors[user.role] || '#374151' }}
                                            >
                                                <option value="user">User</option>
                                                <option value="co-admin">Co-Admin</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                className={`um-status-btn ${user.enabled ? 'enabled' : 'disabled'}`}
                                                disabled={isMe}
                                                onClick={() => handleEnabled(user.email, !user.enabled)}
                                            >
                                                {user.enabled ? '● Active' : '○ Disabled'}
                                            </button>
                                        </td>
                                        <td>
                                            <span className="um-case-count">{caseCountFor(user.email)}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button className="um-expand-btn" onClick={() => setExpandedUser(open ? null : user.email)}>
                                                    {open ? '▲' : '▼'} Features
                                                </button>
                                                <button
                                                    className="um-delete-btn"
                                                    disabled={isMe}
                                                    onClick={() => handleRemove(user.email)}
                                                    title={isMe ? 'Cannot remove yourself' : 'Remove user'}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {open && (
                                        <tr key={`${user.email}-feat`} className="um-features-row">
                                            <td colSpan={5}>
                                                <div className="um-features-panel">
                                                    <p className="um-features-label">Feature Access</p>
                                                    <div className="um-features-grid">
                                                        {featureCatalog.map(feat => {
                                                            const granted = (user.features || []).includes(feat.key);
                                                            return (
                                                                <button
                                                                    key={feat.key}
                                                                    className={`um-feat-chip ${granted ? 'granted' : ''}`}
                                                                    onClick={() => handleFeature(user.email, feat.key, !granted)}
                                                                >
                                                                    {granted ? '✓ ' : ''}{feat.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * SEO Stats - Meta Tag Settings + Page Visit Statistics
 */
export function SEOPage({ session }) {
    const [seoData, setSeoData] = useState(() => {
        const saved = localStorage.getItem('seoSettings');
        return saved ? JSON.parse(saved) : {
            metaTitle: 'Alkash-Trans | Logistics & Transportation',
            metaDescription: 'Professional logistics and transportation services',
            metaKeywords: 'logistics, transportation, shipping',
            ogImageUrl: '',
            canonicalUrl: 'https://www.mysmartwork.tech/ALKASH-TRANS'
        };
    });
    const [viewStats, setViewStats] = useState(() => loadPageViewStats());

    useEffect(() => {
        function refreshStats() {
            setViewStats(loadPageViewStats());
        }

        window.addEventListener('storage', refreshStats);
        window.addEventListener('focus', refreshStats);
        return () => {
            window.removeEventListener('storage', refreshStats);
            window.removeEventListener('focus', refreshStats);
        };
    }, []);

    function handleSave(e) {
        e.preventDefault();
        localStorage.setItem('seoSettings', JSON.stringify(seoData));
    }

    const pageRows = Object.entries(viewStats.byPage)
        .map(([pageKey, entry]) => ({
            pageKey,
            label: PAGE_VIEW_LABELS[pageKey] || pageKey,
            count: entry.count || 0,
            lastVisited: entry.lastVisited
        }))
        .sort((a, b) => b.count - a.count);

    const maxCount = pageRows.reduce((max, row) => Math.max(max, row.count), 0) || 1;
    const viewsToday = getViewsInLastHours(viewStats, 24);
    const viewsThisWeek = getViewsInLastHours(viewStats, 24 * 7);

    return (
        <div className="dash-page">
            <div className="dash-breadcrumb">
                <span className="dash-breadcrumb-root">Alkash-Trans Admin</span>
                <span className="dash-breadcrumb-sep">›</span>
                <span className="dash-breadcrumb-current">SEO Stats</span>
            </div>
            <div className="dash-page-header">
                <h2 className="dash-page-title">SEO Stats</h2>
                <p className="dash-page-sub">Page visit statistics and meta tags for search engine visibility.</p>
            </div>

            <div className="dash-metrics-grid">
                <div className="dash-metric-card">
                    <div className="dash-metric-icon">👁</div>
                    <div className="dash-metric-body">
                        <div className="dash-metric-value">{viewStats.totalViews}</div>
                        <div className="dash-metric-label">Total Page Views</div>
                    </div>
                </div>
                <div className="dash-metric-card">
                    <div className="dash-metric-icon">📅</div>
                    <div className="dash-metric-body">
                        <div className="dash-metric-value">{viewsToday}</div>
                        <div className="dash-metric-label">Views (24h)</div>
                    </div>
                </div>
                <div className="dash-metric-card">
                    <div className="dash-metric-icon">📈</div>
                    <div className="dash-metric-body">
                        <div className="dash-metric-value">{viewsThisWeek}</div>
                        <div className="dash-metric-label">Views (7 days)</div>
                    </div>
                </div>
                <div className="dash-metric-card">
                    <div className="dash-metric-icon">📄</div>
                    <div className="dash-metric-body">
                        <div className="dash-metric-value">{pageRows.length}</div>
                        <div className="dash-metric-label">Pages Tracked</div>
                    </div>
                </div>
            </div>

            <div className="dash-section-header">Page Visit Breakdown</div>

            <div className="seo-stats-table">
                {pageRows.length ? pageRows.map((row) => (
                    <div className="seo-stats-row" key={row.pageKey}>
                        <div className="seo-stats-row-head">
                            <span className="seo-stats-page-name">{row.label}</span>
                            <span className="seo-stats-page-count">{row.count} views</span>
                        </div>
                        <div className="seo-stats-bar-track">
                            <div className="seo-stats-bar-fill" style={{ width: `${Math.max(4, (row.count / maxCount) * 100)}%` }} />
                        </div>
                        <span className="seo-stats-last-visited">
                            Last visited: {row.lastVisited ? new Date(row.lastVisited).toLocaleString() : '—'}
                        </span>
                    </div>
                )) : (
                    <p className="dash-page-sub">No page visits recorded yet.</p>
                )}
            </div>

        <div className="dashboard-panel seo-panel">

            <div className="seo-form">
                <form onSubmit={handleSave}>
                    <label>
                        <span>Meta Title</span>
                        <input
                            type="text"
                            placeholder="Page title for search results"
                            maxLength="60"
                            value={seoData.metaTitle}
                            onChange={(e) => setSeoData({...seoData, metaTitle: e.target.value})}
                        />
                        <small>{seoData.metaTitle.length}/60 characters</small>
                    </label>

                    <label>
                        <span>Meta Description</span>
                        <textarea
                            placeholder="Brief description for search results"
                            maxLength="160"
                            rows="3"
                            value={seoData.metaDescription}
                            onChange={(e) => setSeoData({...seoData, metaDescription: e.target.value})}
                        />
                        <small>{seoData.metaDescription.length}/160 characters</small>
                    </label>

                    <label>
                        <span>Meta Keywords</span>
                        <input
                            type="text"
                            placeholder="Comma-separated keywords"
                            value={seoData.metaKeywords}
                            onChange={(e) => setSeoData({...seoData, metaKeywords: e.target.value})}
                        />
                    </label>

                    <label>
                        <span>OG Image URL</span>
                        <input
                            type="url"
                            placeholder="URL for social media preview image"
                            value={seoData.ogImageUrl}
                            onChange={(e) => setSeoData({...seoData, ogImageUrl: e.target.value})}
                        />
                    </label>

                    <label>
                        <span>Canonical URL</span>
                        <input
                            type="url"
                            placeholder="Canonical URL for this page"
                            value={seoData.canonicalUrl}
                            onChange={(e) => setSeoData({...seoData, canonicalUrl: e.target.value})}
                        />
                    </label>

                    <button type="submit" style={{ 
                        backgroundColor: 'var(--blue)', 
                        color: 'white', 
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}>
                        Save SEO Settings
                    </button>
                </form>

                <div className="seo-preview">
                    <h3>Google Search Result Preview</h3>
                    <div className="search-result">
                        <h4 className="preview-title">{seoData.metaTitle || 'Your page title'}</h4>
                        <p className="preview-url">www.mysmartwork.tech/ALKASH-TRANS</p>
                        <p className="preview-description">{seoData.metaDescription || 'Your meta description will appear here...'}</p>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}

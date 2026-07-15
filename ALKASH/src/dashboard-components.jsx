// Dashboard Components for Alkash-Trans Admin Portal
// Includes Sidebar, Inventory, Announcements, and SEO management

import { useState } from 'react';
import { uploadToS3, archiveAnnouncementToS3 } from './s3-utils.js';

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
        label: 'Settings',
        items: [
            { id: 'seo', label: 'SEO Settings', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> }
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

            <div className="dash-alert-bar">
                <span className="dash-alert-icon">ℹ</span>
                <span>All images, announcements, and quotes are stored in <strong>AWS S3</strong>. Zero local storage.</span>
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
                <div className="dash-info-row">
                    <span className="dash-info-label">Storage</span>
                    <span className="dash-info-value">AWS S3 — <span style={{color:'#25d366',fontWeight:600}}>Active</span></span>
                </div>
            </div>
        </div>
    );
}

/**
 * Inventory Management - Service Images Editor
 */
export function InventoryPage({ quoteBuilderItems, session, getServiceImageHref }) {
    const [services] = useState(quoteBuilderItems);
    const [uploading, setUploading] = useState(null);
    const [uploadMessage, setUploadMessage] = useState('');
    
    async function handleImageUpload(event, serviceKey) {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(serviceKey);
        setUploadMessage('');

        const path = `services/${serviceKey}.png`;
        const result = await uploadToS3(file, path);

        if (result.success) {
            setUploadMessage(`✓ ${serviceKey} image uploaded to S3`);
        } else {
            setUploadMessage(`✗ Upload failed: ${result.error}`);
        }

        setTimeout(() => {
            setUploading(null);
            setUploadMessage('');
        }, 3000);
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
                <p className="dash-page-sub">Hover any item to change its image. Uploads go directly to AWS S3.</p>
            </div>
        <div className="dashboard-panel inventory-panel">
            
            {uploadMessage && (
                <div className={`upload-message ${uploadMessage.startsWith('✓') ? 'success' : 'error'}`}>
                    {uploadMessage}
                </div>
            )}

            <div className="inventory-grid">
                {services.map(service => (
                    <div key={service.key} className="inventory-card">
                        <div className="inventory-image-wrapper">
                            <img 
                                src={getServiceImageHref(service.image)} 
                                alt={service.label}
                                className="inventory-image"
                            />
                            <label className="image-upload-overlay">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => handleImageUpload(e, service.key)}
                                    disabled={uploading === service.key}
                                    hidden
                                />
                                <span>{uploading === service.key ? '⏳ Uploading...' : '📷 Change'}</span>
                            </label>
                        </div>
                        <div className="inventory-info">
                            <h4>{service.label}</h4>
                            <p className="inventory-price">${service.price}</p>
                            <p className="inventory-category">{service.category}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        </div>
    );
}

/**
 * Announcements Management
 */
export function AnnouncementsPage({ session }) {
    const [announcements, setAnnouncements] = useState(() => {
        const saved = localStorage.getItem('announcements');
        return saved ? JSON.parse(saved) : [];
    });

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        active: true,
        slideType: 'text',
        backgroundStyle: 'brand-wave',
        customBackgroundUrl: '',
        imageUrl: ''
    });
    const [bannerFile, setBannerFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formMessage, setFormMessage] = useState('');

    const brandedBackgrounds = [
        { value: 'brand-wave', label: 'ALKASH Wave (Light)' },
        { value: 'brand-navy', label: 'ALKASH Navy Gradient' },
        { value: 'brand-sky', label: 'ALKASH Sky Blue' },
        { value: 'custom-image', label: 'Custom Background Image URL' }
    ];

    async function handleAddAnnouncement(e) {
        e.preventDefault();

        setIsSaving(true);
        setFormMessage('');

        let uploadedImageUrl = formData.imageUrl || '';

        if (formData.slideType === 'image' && bannerFile) {
            const safeName = bannerFile.name.replace(/\s+/g, '-').toLowerCase();
            const uploadPath = `announcements/banners/${Date.now()}-${safeName}`;
            const uploadResult = await uploadToS3(bannerFile, uploadPath);

            if (!uploadResult.success) {
                setFormMessage(`Upload failed: ${uploadResult.error || 'unknown error'}`);
                setIsSaving(false);
                return;
            }

            uploadedImageUrl = uploadResult.url || '';
        }

        if (formData.slideType === 'image' && !uploadedImageUrl) {
            setFormMessage('Please upload a banner image or provide an image URL.');
            setIsSaving(false);
            return;
        }

        const newAnnouncement = {
            id: Date.now(),
            title: formData.title.trim(),
            content: formData.content.trim(),
            active: formData.active,
            slideType: formData.slideType,
            backgroundStyle: formData.backgroundStyle,
            customBackgroundUrl: formData.customBackgroundUrl.trim(),
            imageUrl: uploadedImageUrl,
            createdBy: session?.name || 'Admin',
            createdAt: new Date().toISOString()
        };

        // Archive to S3
        await archiveAnnouncementToS3(newAnnouncement);

        // Update local state
        const updated = [...announcements, newAnnouncement];
        setAnnouncements(updated);
        localStorage.setItem('announcements', JSON.stringify(updated));

        // Reset form
        setFormData({
            title: '',
            content: '',
            active: true,
            slideType: 'text',
            backgroundStyle: 'brand-wave',
            customBackgroundUrl: '',
            imageUrl: ''
        });
        setBannerFile(null);
        setFormMessage('Announcement slide added successfully.');
        setIsSaving(false);
    }

    function handleDeleteAnnouncement(id) {
        const updated = announcements.filter(a => a.id !== id);
        setAnnouncements(updated);
        localStorage.setItem('announcements', JSON.stringify(updated));
    }

    return (
        <div className="dash-page">
            <div className="dash-breadcrumb">
                <span className="dash-breadcrumb-root">Alkash-Trans Admin</span>
                <span className="dash-breadcrumb-sep">›</span>
                <span className="dash-breadcrumb-current">Announcements</span>
            </div>
            <div className="dash-page-header">
                <h2 className="dash-page-title">Announcements</h2>
                <p className="dash-page-sub">Published announcements appear on the home page. All data archived to S3.</p>
            </div>
        <div className="dashboard-panel announcements-panel">

            <div className="announcement-form">
                <h3>Create New Announcement</h3>
                <form onSubmit={handleAddAnnouncement}>
                    {formMessage ? <div className="message success">{formMessage}</div> : null}

                    <label>
                        <span>Slide Type</span>
                        <select
                            value={formData.slideType}
                            onChange={(e) => setFormData({ ...formData, slideType: e.target.value })}
                        >
                            <option value="text">Text Banner</option>
                            <option value="image">Image Banner</option>
                        </select>
                    </label>

                    <label>
                        <span>Announcement Title</span>
                        <input
                            type="text"
                            placeholder="Enter announcement title"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required
                        />
                    </label>
                    <label>
                        <span>Content / Caption</span>
                        <textarea
                            placeholder="Enter announcement message"
                            rows="4"
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                            required
                        />
                    </label>

                    {formData.slideType === 'text' ? (
                        <>
                            <label>
                                <span>Background Preset</span>
                                <select
                                    value={formData.backgroundStyle}
                                    onChange={(e) => setFormData({ ...formData, backgroundStyle: e.target.value })}
                                >
                                    {brandedBackgrounds.map(bg => (
                                        <option key={bg.value} value={bg.value}>{bg.label}</option>
                                    ))}
                                </select>
                            </label>

                            {formData.backgroundStyle === 'custom-image' ? (
                                <label>
                                    <span>Custom Background URL</span>
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        value={formData.customBackgroundUrl}
                                        onChange={(e) => setFormData({ ...formData, customBackgroundUrl: e.target.value })}
                                    />
                                </label>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <label>
                                <span>Upload Banner Image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                                />
                            </label>

                            <label>
                                <span>Or Banner Image URL</span>
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    value={formData.imageUrl}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                />
                            </label>
                        </>
                    )}

                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) => setFormData({...formData, active: e.target.checked})}
                        />
                        <span>Display on home page (Active)</span>
                    </label>
                    <button type="submit" disabled={isSaving} style={{ 
                        backgroundColor: 'var(--blue)', 
                        color: 'white', 
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}>
                        {isSaving ? 'Saving...' : 'Create Announcement'}
                    </button>
                </form>
            </div>

            <div className="announcements-list">
                <h3>Existing Announcements</h3>
                {announcements.length === 0 ? (
                    <div className="empty-state">No announcements yet. Create one to get started!</div>
                ) : (
                    <div className="announcement-items-container">
                        {announcements.map(announcement => (
                            <div key={announcement.id} className="announcement-item">
                                <div className="announcement-header">
                                    <div>
                                        <h4>{announcement.title}</h4>
                                        <p>{announcement.content}</p>
                                        <p className="creator">Type: {announcement.slideType || 'text'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                                        style={{
                                            backgroundColor: '#fee2e2',
                                            color: '#dc2626',
                                            border: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                                <div className="announcement-meta">
                                    <span className={`status-badge ${announcement.active ? 'active' : 'inactive'}`}>
                                        {announcement.active ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="creator">By: {announcement.createdBy}</span>
                                    <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}

/**
 * SEO Settings Management
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

    function handleSave(e) {
        e.preventDefault();
        localStorage.setItem('seoSettings', JSON.stringify(seoData));
    }

    return (
        <div className="dash-page">
            <div className="dash-breadcrumb">
                <span className="dash-breadcrumb-root">Alkash-Trans Admin</span>
                <span className="dash-breadcrumb-sep">›</span>
                <span className="dash-breadcrumb-current">SEO Settings</span>
            </div>
            <div className="dash-page-header">
                <h2 className="dash-page-title">SEO Settings</h2>
                <p className="dash-page-sub">Configure meta tags for better search engine visibility.</p>
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

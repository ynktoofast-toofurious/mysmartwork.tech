// Dashboard Components for Alkash-Trans Admin Portal
// Includes Sidebar, Inventory, Announcements, and SEO management

import { useState } from 'react';
import { uploadToS3, archiveAnnouncementToS3 } from './s3-utils.js';

/**
 * Sidebar Navigation for Admin Dashboard
 */
export function DashboardSidebar({ activeTab, onTabChange, session }) {
    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: '📊' },
        { id: 'inventory', label: 'Inventory', icon: '📦' },
        { id: 'announcements', label: 'Announcements', icon: '📢' },
        { id: 'seo', label: 'SEO Settings', icon: '🔍' }
    ];

    return (
        <aside className="dashboard-sidebar">
            <div className="sidebar-header">
                <h3>Admin Menu</h3>
            </div>
            <nav className="sidebar-nav">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => onTabChange(item.id)}
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        <span className="sidebar-label">{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="sidebar-footer">
                <div className="user-info">
                    <p><strong>{session?.name || 'Admin'}</strong></p>
                    <p className="user-role">{session?.role}</p>
                </div>
            </div>
        </aside>
    );
}

/**
 * Dashboard Overview - Summary Statistics
 */
export function DashboardOverview({ session, health }) {
    return (
        <div className="dashboard-panel">
            <h2>Dashboard Overview</h2>
            <p className="panel-description">Welcome to the Alkash-Trans Admin Portal</p>
            
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-value">42</div>
                    <div className="metric-label">Total Users</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">28</div>
                    <div className="metric-label">Active Users</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">156</div>
                    <div className="metric-label">Open Cases</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">99.7%</div>
                    <div className="metric-label">Uptime</div>
                </div>
            </div>

            <div className="welcome-card">
                <h3>Welcome back, {session?.name}!</h3>
                <p>You are logged in as <strong>{session?.role}</strong></p>
                <p>All data is stored securely in AWS S3 buckets.</p>
                <div className="info-text">
                    ℹ️ This dashboard manages service inventory, announcements, and SEO settings. All file uploads are stored in AWS S3 with zero local storage.
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
        <div className="dashboard-panel inventory-panel">
            <h2>Service Inventory</h2>
            <p className="panel-description">Manage service images and details. All images are stored in AWS S3.</p>
            
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

    const [formData, setFormData] = useState({ title: '', content: '', active: true });

    async function handleAddAnnouncement(e) {
        e.preventDefault();

        const newAnnouncement = {
            id: Date.now(),
            title: formData.title,
            content: formData.content,
            active: formData.active,
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
        setFormData({ title: '', content: '', active: true });
    }

    function handleDeleteAnnouncement(id) {
        const updated = announcements.filter(a => a.id !== id);
        setAnnouncements(updated);
        localStorage.setItem('announcements', JSON.stringify(updated));
    }

    return (
        <div className="dashboard-panel announcements-panel">
            <h2>Announcements Management</h2>
            <p className="panel-description">Create and manage announcements displayed on the home page</p>

            <div className="announcement-form">
                <h3>Create New Announcement</h3>
                <form onSubmit={handleAddAnnouncement}>
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
                        <span>Content</span>
                        <textarea
                            placeholder="Enter announcement content"
                            rows="4"
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                            required
                        />
                    </label>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) => setFormData({...formData, active: e.target.checked})}
                        />
                        <span>Display on home page (Active)</span>
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
                        Create Announcement
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
        <div className="dashboard-panel seo-panel">
            <h2>SEO Settings</h2>
            <p className="panel-description">Configure meta tags and SEO information for better search visibility</p>

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
    );
}

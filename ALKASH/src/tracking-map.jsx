import { useState, useEffect } from 'react';

/**
 * TrackingMap - Interactive map showing shipment journey with animated current location
 * @param {Object} trackingData - Journey data with stages and coordinates
 * @param {string} language - 'en' or 'fr' for labels
 * @param {Function} onClose - Callback to close map modal
 */
export function TrackingMap({ trackingData, language = 'en', onClose }) {
    const [mapBounds, setMapBounds] = useState({ minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 });
    const [scale, setScale] = useState({ lat: 1, lon: 1, offsetLat: 0, offsetLon: 0 });

    // Calculate map bounds and scaling
    useEffect(() => {
        if (!trackingData?.journey || trackingData.journey.length === 0) return;

        const lats = trackingData.journey.map(j => j.lat);
        const lons = trackingData.journey.map(j => j.lon);

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        setMapBounds({ minLat, maxLat, minLon, maxLon });

        // Calculate scale to fit 500x600 viewBox with padding
        const padding = 40;
        const mapWidth = 500 - padding * 2;
        const mapHeight = 600 - padding * 2;

        const latRange = maxLat - minLat || 1;
        const lonRange = maxLon - minLon || 1;

        const latScale = mapHeight / latRange;
        const lonScale = mapWidth / lonRange;

        setScale({
            lat: latScale,
            lon: lonScale,
            offsetLat: minLat,
            offsetLon: minLon
        });
    }, [trackingData]);

    // Convert lat/lon to SVG coordinates
    function coordToSvg(lat, lon) {
        const padding = 40;
        const x = (lon - scale.offsetLon) * scale.lon + padding;
        const y = 600 - padding - (lat - scale.offsetLat) * scale.lat;
        return { x, y };
    }

    if (!trackingData?.journey || trackingData.journey.length === 0) {
        return (
            <div className="tracking-map-overlay" onClick={onClose}>
                <div className="tracking-map-modal" onClick={e => e.stopPropagation()}>
                    <p>No tracking data available</p>
                    <button className="button button-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    const currentLocation = trackingData.journey.find(j => j.stage === 'current');
    const currentCoord = currentLocation ? coordToSvg(currentLocation.lat, currentLocation.lon) : null;

    return (
        <div className="tracking-map-overlay" onClick={onClose}>
            <div className="tracking-map-modal" onClick={e => e.stopPropagation()}>
                <div className="tracking-map-header">
                    <h2>📍 Shipment Journey Map</h2>
                    <button className="tracking-map-close" onClick={onClose}>✕</button>
                </div>

                <div className="tracking-map-container">
                    <svg viewBox="0 0 500 600" className="tracking-map-svg">
                        {/* Grid background */}
                        <defs>
                            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e7ff" strokeWidth="0.5" />
                            </pattern>
                            {/* Blinking animation */}
                            <style>{`
                                @keyframes blink-location {
                                    0%, 100% { r: 12px; opacity: 1; }
                                    50% { r: 8px; opacity: 0.6; }
                                }
                                .current-location-blink {
                                    animation: blink-location 1.2s ease-in-out infinite;
                                }
                                @keyframes pulse-glow {
                                    0%, 100% { r: 20px; opacity: 0.3; }
                                    50% { r: 28px; opacity: 0; }
                                }
                                .current-location-glow {
                                    animation: pulse-glow 1.2s ease-out infinite;
                                }
                            `}</style>
                        </defs>

                        <rect width="500" height="600" fill="url(#grid)" />

                        {/* Journey line connecting all points */}
                        <polyline
                            points={trackingData.journey
                                .map(j => {
                                    const coord = coordToSvg(j.lat, j.lon);
                                    return `${coord.x},${coord.y}`;
                                })
                                .join(' ')}
                            fill="none"
                            stroke="#42b0d5"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            opacity="0.5"
                        />

                        {/* Journey stages as circles */}
                        {trackingData.journey.map((journey, idx) => {
                            const coord = coordToSvg(journey.lat, journey.lon);
                            const isCurrent = journey.stage === 'current';
                            const isCompleted = journey.completed;

                            return (
                                <g key={idx}>
                                    {/* Stage circle */}
                                    <circle
                                        cx={coord.x}
                                        cy={coord.y}
                                        r="8"
                                        fill={isCurrent ? '#ef4444' : isCompleted ? '#22c55e' : '#9ca3af'}
                                        stroke="#fff"
                                        strokeWidth="2"
                                    />

                                    {/* Location label */}
                                    <text
                                        x={coord.x}
                                        y={coord.y + 28}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="#333"
                                        fontWeight={isCurrent ? '600' : '400'}
                                        className="tracking-location-label"
                                    >
                                        {journey.name[language] || journey.name.en}
                                    </text>

                                    {/* Date label */}
                                    <text
                                        x={coord.x}
                                        y={coord.y + 40}
                                        textAnchor="middle"
                                        fontSize="9"
                                        fill="#666"
                                        className="tracking-date-label"
                                    >
                                        {journey.date}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Current location blinking indicator */}
                        {currentCoord && (
                            <g>
                                <circle
                                    cx={currentCoord.x}
                                    cy={currentCoord.y}
                                    className="current-location-glow"
                                    fill="none"
                                    stroke="#ef4444"
                                    strokeWidth="1"
                                />
                                <circle
                                    cx={currentCoord.x}
                                    cy={currentCoord.y}
                                    className="current-location-blink"
                                    fill="#ef4444"
                                    stroke="#fff"
                                    strokeWidth="2"
                                />
                            </g>
                        )}
                    </svg>
                </div>

                {/* Legend */}
                <div className="tracking-map-legend">
                    <div className="legend-item">
                        <span className="legend-dot completed"></span>
                        <span>Completed</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot current"></span>
                        <span>Current Location</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot pending"></span>
                        <span>Pending</span>
                    </div>
                </div>

                {/* Journey details list */}
                <div className="tracking-map-details">
                    <h3>Journey Timeline</h3>
                    <div className="journey-timeline">
                        {trackingData.journey.map((journey, idx) => (
                            <div key={idx} className={`timeline-item ${journey.stage} ${journey.completed ? 'completed' : ''}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <h4>{journey.name[language] || journey.name.en}</h4>
                                    <p className="timeline-date">{journey.date}</p>
                                    <p className="timeline-status">
                                        {journey.stage === 'current' && '📍 Current Location'}
                                        {journey.stage === 'origin' && '📦 Origin'}
                                        {journey.stage === 'destination' && '🎯 Destination'}
                                        {journey.stage === 'transit' && '🚢 In Transit'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button className="button button-primary tracking-map-close-btn" onClick={onClose}>
                    Close Map
                </button>
            </div>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { fetchThumbnailBlob } from '../services/driveService';
import { formatCoordinates } from '../utils/exifUtils';
import styles from './MapView.module.css';

// Leaflet default icon fix for Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component to smoothly re-center map when active photo changes
function MapRecenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 14, { animate: true });
    }
  }, [position, map]);
  return null;
}

/**
 * MapView — Geospatial intelligence workspace:
 *  - Primary viewport: Leaflet OpenStreetMap with pin markers for all geotagged photos.
 *  - Side panel: Selected photo preview, precise coordinates, 1-click copy, and external shortcuts.
 */
function MapView({ photo, allPhotos = [], onSelectPhoto, onBack }) {
  const { token } = useAuth();
  const [activePhoto, setActivePhoto] = useState(photo);
  const [imgBlobUrl, setImgBlobUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  // Sync active photo if prop changes
  useEffect(() => {
    if (photo) setActivePhoto(photo);
  }, [photo]);

  // Load authenticated preview image for active photo
  useEffect(() => {
    let active = true;
    let url = null;

    if (activePhoto?.fileId && token) {
      fetchThumbnailBlob(activePhoto.fileId, token)
        .then((blob) => {
          if (active) {
            url = blob;
            setImgBlobUrl(blob);
          }
        })
        .catch(() => {});
    } else {
      setImgBlobUrl(null);
    }

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [activePhoto?.fileId, token]);

  const geotaggedPhotos = allPhotos.filter((p) => p.lat != null && p.lng != null);
  const currentPhoto = activePhoto || geotaggedPhotos[0];

  if (!currentPhoto || currentPhoto.lat == null || currentPhoto.lng == null) {
    return (
      <div className={styles.noGpsContainer}>
        <div className={styles.noGpsIconCircle}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h3 className={styles.noGpsTitle}>No GPS Locations to Display</h3>
        <p className={styles.noGpsDesc}>
          None of your uploaded records currently contain embedded GPS coordinates. Upload or capture photos with location tagging enabled to display them on the map.
        </p>
        <button id="back-to-gallery-btn" className={styles.btnSecondary} onClick={onBack}>
          &larr; Back to Photo Library
        </button>
      </div>
    );
  }

  const position = [currentPhoto.lat, currentPhoto.lng];

  const handleCopyCoords = () => {
    const text = `${currentPhoto.lat}, ${currentPhoto.lng}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${currentPhoto.lat},${currentPhoto.lng}`;

  return (
    <div className={styles.wrapper}>
      {/* Top Header */}
      <div className={styles.topHeader}>
        <div className={styles.headerLeft}>
          <button id="back-to-gallery-btn" className={styles.backBtn} onClick={onBack}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Photos</span>
          </button>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>Map View</h1>
            <span className={styles.pageSubtitle}>
              {geotaggedPhotos.length} mapped {geotaggedPhotos.length === 1 ? 'location' : 'locations'}
            </span>
          </div>
        </div>

        {geotaggedPhotos.length > 1 && (
          <div className={styles.photoPicker}>
            <label htmlFor="photo-select" className={styles.pickerLabel}>Record:</label>
            <select
              id="photo-select"
              className={styles.pickerSelect}
              value={currentPhoto.fileId}
              onChange={(e) => {
                const selected = geotaggedPhotos.find((p) => p.fileId === e.target.value);
                if (selected) {
                  setActivePhoto(selected);
                  if (onSelectPhoto) onSelectPhoto(selected);
                }
              }}
            >
              {geotaggedPhotos.map((p) => (
                <option key={p.fileId} value={p.fileId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Split layout: Map (left) + Detail Panel (right) */}
      <div className={styles.splitLayout}>
        {/* Map Container */}
        <div className={styles.mapColumn}>
          <MapContainer
            center={position}
            zoom={14}
            className={styles.map}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapRecenter position={position} />

            {/* Render markers for all geotagged photos */}
            {geotaggedPhotos.map((p) => (
              <Marker
                key={p.fileId}
                position={[p.lat, p.lng]}
                eventHandlers={{
                  click: () => {
                    setActivePhoto(p);
                    if (onSelectPhoto) onSelectPhoto(p);
                  },
                }}
              >
                <Popup>
                  <div className={styles.popupContent}>
                    <strong>{p.name}</strong>
                    <p style={{ fontFamily: 'var(--font-mono)', margin: '4px 0 0' }}>
                      {formatCoordinates(p.lat, p.lng)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Detail Panel */}
        <aside className={styles.detailColumn}>
          <div className={styles.detailCard}>
            <div className={styles.detailHeading}>
              <span>Location Record</span>
              <span className={styles.statusBadge}>GPS Locked</span>
            </div>

            {/* Photo Preview */}
            <div className={styles.previewWrap}>
              {imgBlobUrl || currentPhoto.thumbnailLink ? (
                <img
                  src={imgBlobUrl || currentPhoto.thumbnailLink}
                  alt={currentPhoto.name}
                  className={styles.previewImg}
                />
              ) : (
                <div className={styles.previewFallback}>📸</div>
              )}
            </div>

            <div className={styles.infoSection}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Document / Photo Name</span>
                <span className={styles.infoValue} title={currentPhoto.name}>
                  {currentPhoto.name}
                </span>
              </div>

              <div className={styles.coordsBox}>
                <div className={styles.coordsPair}>
                  <div>
                    <span className={styles.infoSubLabel}>Latitude</span>
                    <span className={styles.codeText}>{Number(currentPhoto.lat).toFixed(6)}°</span>
                  </div>
                  <div>
                    <span className={styles.infoSubLabel}>Longitude</span>
                    <span className={styles.codeText}>{Number(currentPhoto.lng).toFixed(6)}°</span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={handleCopyCoords}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copied ? 'Copied Coordinates' : 'Copy Coordinates'}</span>
                </button>
              </div>

              <div className={styles.actionButtons}>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnExternal}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>Open in Google Maps</span>
                </a>

                {currentPhoto.webViewLink && (
                  <a
                    href={currentPhoto.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnDrive}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>View in Google Drive</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default MapView;

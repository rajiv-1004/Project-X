import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import styles from './MapView.module.css';

// Fix leaflet's default icon path issue with Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * MapView — renders a react-leaflet map centered on the selected photo's GPS coords.
 * Uses OpenStreetMap tiles only — no paid/billed map API.
 *
 * OSM tile attribution is required by the tile provider terms.
 */
function MapView({ photo, onBack }) {
  if (!photo || photo.lat == null || photo.lng == null) {
    return (
      <div className={styles.noGps}>
        <p>This photo has no GPS data to display.</p>
        <button id="back-to-gallery-btn" className={styles.backBtn} onClick={onBack}>
          ← Back to Gallery
        </button>
      </div>
    );
  }

  const position = [photo.lat, photo.lng];

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button id="back-to-gallery-btn" className={styles.backBtn} onClick={onBack}>
          ← Gallery
        </button>
        <p className={styles.photoName}>{photo.name}</p>
      </div>

      <MapContainer
        center={position}
        zoom={14}
        className={styles.map}
        scrollWheelZoom
      >
        {/* Standard OSM tiles — free, no API key required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>{photo.name}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapView;

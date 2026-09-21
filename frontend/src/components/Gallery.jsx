import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { listPhotos } from '../services/driveService';
import PhotoCard from './PhotoCard';
import styles from './Gallery.module.css';

/**
 * Gallery — fetches all photos from the backend (Drive + Sheet metadata)
 * and renders a responsive thumbnail grid.
 *
 * Photos are fetched once on mount; no polling or auto-refresh.
 * A full re-fetch is triggered only after an upload (via onUpload callback
 * passed down from Dashboard in a later phase).
 */
function Gallery({ onPhotoClick }) {
  const { token } = useAuth();
  const [photos, setPhotos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchPhotos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listPhotos(token);
      setPhotos(data ?? []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Gallery] fetch error:', err);
      setError('We couldn\'t load your photos. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  if (loading) {
    return (
      <div className={styles.state} aria-live="polite">
        <div className="spinner" />
        <p>Loading your photos…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.state}>
        <p className={styles.error} role="alert">{error}</p>
        <button className={styles.retryBtn} onClick={fetchPhotos}>Retry</button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={styles.state}>
        <p className={styles.empty}>No photos yet. Upload your first photo above!</p>
      </div>
    );
  }

  return (
    <section className={styles.grid} aria-label="Photo gallery">
      {photos.map((photo) => (
        <PhotoCard key={photo.fileId} photo={photo} onClick={() => onPhotoClick(photo)} />
      ))}
    </section>
  );
}

export default Gallery;

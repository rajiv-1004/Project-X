import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { listPhotos } from '../services/driveService';
import PhotoCard from './PhotoCard';
import PhotoDetailModal from './PhotoDetailModal';
import ShareModal from './ShareModal';
import UploadButton from './UploadButton';
import styles from './Gallery.module.css';

/**
 * Gallery — Professional geospatial photo library:
 *  - Toolbar: Instant client-side search, GPS status filtering, sorting
 *  - Photo inspection via PhotoDetailModal
 *  - Sharing workflow via ShareModal
 *  - Quick jump to Map view for geotagged records
 */
function Gallery({ onPhotoClick, refreshTrigger, onUploaded }) {
  const { token } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharingPhoto, setSharingPhoto] = useState(null);
  const [inspectingPhoto, setInspectingPhoto] = useState(null);

  // Filter & sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'gps' | 'nogps'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name'

  const fetchPhotos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listPhotos(token);
      setPhotos(data ?? []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Gallery] fetch error:', err);
      setError("We couldn't load your photos. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos, refreshTrigger]);

  const handleUploadSuccess = (result) => {
    fetchPhotos();
    if (onUploaded) onUploaded(result);
  };

  // Filter & sort logic
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => p.name?.toLowerCase().includes(q));
    }

    // 2. Status filter
    if (filterType === 'gps') {
      result = result.filter((p) => p.lat != null && p.lng != null);
    } else if (filterType === 'nogps') {
      result = result.filter((p) => p.lat == null || p.lng == null);
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      const timeA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const timeB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      if (sortBy === 'oldest') {
        return timeA - timeB;
      }
      return timeB - timeA; // newest first default
    });

    return result;
  }, [photos, searchQuery, filterType, sortBy]);

  const gpsCount = useMemo(
    () => photos.filter((p) => p.lat != null && p.lng != null).length,
    [photos]
  );
  const noGpsCount = photos.length - gpsCount;

  if (loading) {
    return (
      <div className={styles.loadingContainer} aria-live="polite">
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Synchronising photos from Google Drive…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className={styles.errorMessage} role="alert">{error}</p>
        <button className={styles.retryBtn} onClick={fetchPhotos}>Try Again</button>
      </div>
    );
  }

  return (
    <div className={styles.galleryPage}>
      {/* Header bar */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Photos</h1>
          <p className={styles.pageSubtitle}>
            Geotagged documentation, field records, and application scans stored in Google Drive.
          </p>
        </div>

        <div className={styles.headerActions}>
          <UploadButton variant="compact" onUploaded={handleUploadSuccess} />
        </div>
      </div>

      {photos.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIconCircle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>No photos uploaded yet</h3>
          <p className={styles.emptyDesc}>
            Upload a document or take a field photo with your device camera to extract GPS coordinates and sync with Google Drive.
          </p>
          <UploadButton variant="compact" onUploaded={handleUploadSuccess} />
        </div>
      ) : (
        <>
          {/* Toolbar with Search, Filter & Sort */}
          <div className={styles.toolbar}>
            {/* Search */}
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by filename…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search photos by filename"
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className={styles.filterControls}>
              <div className={styles.filterTabs} role="tablist" aria-label="Filter photos">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterType === 'all'}
                  className={`${styles.filterTab} ${filterType === 'all' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All ({photos.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterType === 'gps'}
                  className={`${styles.filterTab} ${filterType === 'gps' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilterType('gps')}
                >
                  GPS ({gpsCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterType === 'nogps'}
                  className={`${styles.filterTab} ${filterType === 'nogps' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilterType('nogps')}
                >
                  No GPS ({noGpsCount})
                </button>
              </div>

              {/* Sort selector */}
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort photos"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A–Z)</option>
              </select>

              <span className={styles.countLabel}>
                Showing {filteredPhotos.length} of {photos.length}
              </span>
            </div>
          </div>

          {/* Grid or Filtered Empty State */}
          {filteredPhotos.length === 0 ? (
            <div className={styles.emptyCard}>
              <h3 className={styles.emptyTitle}>No matching records found</h3>
              <p className={styles.emptyDesc}>
                No photos match your current search query or active filter.
              </p>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <section className={styles.grid} aria-label="Photo library">
              {filteredPhotos.map((photo) => (
                <PhotoCard
                  key={photo.fileId}
                  photo={photo}
                  onClick={() => onPhotoClick(photo)}
                  onInspect={(p) => setInspectingPhoto(p)}
                  onShare={(p) => setSharingPhoto(p)}
                />
              ))}
            </section>
          )}
        </>
      )}

      {/* Photo Detail Modal */}
      {inspectingPhoto && (
        <PhotoDetailModal
          photo={inspectingPhoto}
          onClose={() => setInspectingPhoto(null)}
          onOpenMap={(p) => {
            setInspectingPhoto(null);
            onPhotoClick(p);
          }}
          onShare={(p) => {
            setInspectingPhoto(null);
            setSharingPhoto(p);
          }}
        />
      )}

      {/* Share Modal */}
      {sharingPhoto && (
        <ShareModal
          photo={sharingPhoto}
          onClose={() => setSharingPhoto(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}

export default Gallery;

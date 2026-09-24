import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { listPhotos, fetchDriveInfo } from '../services/driveService';
import Gallery from '../components/Gallery';
import MapView from '../components/MapView';
import UploadButton from '../components/UploadButton';
import StatsCards from '../components/StatsCards';
import SheetView from '../components/SheetView';
import PhotoCard from '../components/PhotoCard';
import PhotoDetailModal from '../components/PhotoDetailModal';
import ShareModal from '../components/ShareModal';
import styles from './Dashboard.module.css';

/**
 * Dashboard — Geospatial Field Documentation App Shell:
 *  - Compact dark sidebar: Brand logo, user workspace badge, navigation (Overview, Photos, Map, GPS Log), and user profile.
 *  - Top header: Dynamic section title, breadcrumb context, quick upload CTA, and sign-out.
 *  - Overview tab:
 *      • Compact metrics row (Photos, GPS Tagged, No GPS, Drive status)
 *      • Purpose-built Upload Workspace (file drag-and-drop & camera)
 *      • Recent Photos section with direct inspection & map jump
 *      • Drive & Sheet synchronization status card
 */
function Dashboard() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'gallery' | 'map' | 'sheet'
  const [photos, setPhotos] = useState([]);
  const [driveInfo, setDriveInfo] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [inspectingPhoto, setInspectingPhoto] = useState(null);
  const [sharingPhoto, setSharingPhoto] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load photos and drive info
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [photosData, infoData] = await Promise.allSettled([
        listPhotos(token),
        fetchDriveInfo(token),
      ]);
      if (photosData.status === 'fulfilled') setPhotos(photosData.value ?? []);
      if (infoData.status === 'fulfilled') setDriveInfo(infoData.value);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Dashboard] loadData error:', err);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleUploadSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  const openMapForPhoto = (photo) => {
    setSelectedPhoto(photo);
    setActiveTab('map');
  };

  const navItems = [
    {
      id: 'home',
      label: 'Overview',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      id: 'gallery',
      label: 'Photos',
      badge: photos.length > 0 ? photos.length : null,
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
    },
    {
      id: 'map',
      label: 'Map',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      ),
    },
    {
      id: 'sheet',
      label: 'GPS Log',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
  ];

  const currentFolder = driveInfo?.folderName || (user?.name ? user.name : 'Connected');
  const recentPhotos = photos.slice(0, 4);

  return (
    <div className={styles.appContainer}>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand */}
        <div className={styles.brandRow}>
          <div className={styles.brandLogo}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <div className={styles.brandName}>Project X</div>
            <div className={styles.brandTagline}>Field Intelligence</div>
          </div>
        </div>

        {/* Workspace Context Badge */}
        <div className={styles.workspaceBadge}>
          <svg className={styles.workspaceIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className={styles.workspaceText} title={currentFolder}>
            Drive: <strong>{currentFolder}</strong>
          </span>
        </div>

        {/* Nav Items */}
        <nav className={styles.navMenu} aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {item.badge != null && (
                  <span className={styles.navBadge}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className={styles.userAvatar} />
            ) : (
              <div className={styles.userAvatarFallback}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className={styles.userDetails}>
              <span className={styles.userName} title={user?.name}>{user?.name}</span>
              <span className={styles.userEmail} title={user?.email}>{user?.email}</span>
            </div>
          </div>
          <button
            id="sidebar-logout-btn"
            className={styles.logoutIconBtn}
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        {/* Top Header Bar */}
        <header className={styles.topHeader}>
          <div className={styles.topHeaderLeft}>
            <button
              className={styles.mobileHamburger}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <span className={styles.headerTitle}>
                {activeTab === 'home' && 'Field Operations Overview'}
                {activeTab === 'gallery' && 'Field Photo Library'}
                {activeTab === 'map' && 'Geospatial Location Map'}
                {activeTab === 'sheet' && 'Google Sheets GPS Log'}
              </span>
              <div className={styles.headerBreadcrumb}>
                Workspace: {currentFolder}
              </div>
            </div>
          </div>

          <div className={styles.topHeaderRight}>
            {activeTab !== 'home' && activeTab !== 'gallery' && (
              <button
                id="header-upload-btn"
                className={styles.quickUploadBtn}
                onClick={() => setActiveTab('home')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload</span>
              </button>
            )}

            <button id="logout-btn" className={styles.headerLogoutBtn} onClick={logout}>
              Sign out
            </button>
          </div>
        </header>

        {/* Dynamic View Content */}
        <main className={styles.contentBody}>
          {activeTab === 'home' && (
            <div className={styles.homeTab}>
              {/* Compact Metrics Row */}
              <StatsCards
                photos={photos}
                driveInfo={driveInfo}
                userName={user?.name}
              />

              {/* Purpose-Built Upload Workspace */}
              <UploadButton onUploaded={handleUploadSuccess} variant="hero" />

              {/* Recent Field Photos Section */}
              {recentPhotos.length > 0 && (
                <div>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>Recent Field Records</h3>
                    <button
                      type="button"
                      className={styles.viewAllLink}
                      onClick={() => setActiveTab('gallery')}
                    >
                      <span>View all {photos.length} photos</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>

                  <div className={styles.recentGrid}>
                    {recentPhotos.map((photo) => (
                      <PhotoCard
                        key={photo.fileId}
                        photo={photo}
                        onClick={() => openMapForPhoto(photo)}
                        onInspect={(p) => setInspectingPhoto(p)}
                        onShare={(p) => setSharingPhoto(p)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gallery' && (
            <Gallery
              onPhotoClick={openMapForPhoto}
              refreshTrigger={refreshKey}
              onUploaded={handleUploadSuccess}
            />
          )}

          {activeTab === 'map' && (
            <MapView
              photo={selectedPhoto}
              allPhotos={photos}
              onSelectPhoto={(p) => setSelectedPhoto(p)}
              onBack={() => setActiveTab('gallery')}
            />
          )}

          {activeTab === 'sheet' && (
            <SheetView />
          )}
        </main>
      </div>

      {/* Photo Detail Inspection Modal */}
      {inspectingPhoto && (
        <PhotoDetailModal
          photo={inspectingPhoto}
          onClose={() => setInspectingPhoto(null)}
          onOpenMap={(p) => {
            setInspectingPhoto(null);
            openMapForPhoto(p);
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

export default Dashboard;

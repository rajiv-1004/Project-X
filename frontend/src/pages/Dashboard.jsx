import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { listPhotos, fetchDriveInfo } from '../services/driveService';
import Gallery from '../components/Gallery';
import MapView from '../components/MapView';
import UploadButton from '../components/UploadButton';
import StatsCards from '../components/StatsCards';
import SheetView from '../components/SheetView';
import SettingsView from '../components/SettingsView';
import styles from './Dashboard.module.css';

/**
 * Dashboard — SaaS photo management dashboard matching reference design:
 *  - Fixed dark sidebar with brand, navigation links, and profile badge.
 *  - Top header with greeting, mobile hamburger toggle, and quick actions.
 *  - Tab switching between:
 *      • 'home'     : Stats metrics + Hero upload card
 *      • 'gallery'  : 3-column photo grid with coordinates & Share modal
 *      • 'map'      : Split Leaflet map + photo metadata inspector
 *      • 'sheet'    : Live Google Sheet GPS table
 *      • 'settings' : Account & Google Drive integration settings
 *  - Real data from authenticated session, zero hardcoding.
 */
function Dashboard() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'gallery' | 'map' | 'sheet' | 'settings'
  const [photos, setPhotos] = useState([]);
  const [driveInfo, setDriveInfo] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
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
      label: 'Home',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
    },
    {
      id: 'gallery',
      label: 'My Photos',
      badge: photos.length > 0 ? photos.length : null,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      ),
    },
    {
      id: 'map',
      label: 'Map View',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
          <line x1="8" y1="2" x2="8" y2="18"></line>
          <line x1="16" y1="6" x2="16" y2="22"></line>
        </svg>
      ),
    },
    {
      id: 'sheet',
      label: 'Google Sheet',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
    },
  ];

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

      {/* Dark Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand */}
        <div className={styles.brandRow}>
          <div className={styles.brandLogo}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </div>
          <div>
            <div className={styles.brandName}>Project X</div>
            <div className={styles.brandTagline}>Drive & GPS Suite</div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className={styles.navMenu}>
          <div className={styles.navGroupLabel}>Menu</div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div>
              <span className={styles.greeting}>Welcome, {user?.name?.split(' ')[0] || 'User'} 👋</span>
              <div className={styles.subGreeting}>
                Folder: <strong>{driveInfo?.folderName || (user?.name ? user.name : 'Connected')}</strong>
              </div>
            </div>
          </div>

          <div className={styles.topHeaderRight}>
            {activeTab !== 'home' && (
              <button
                id="header-upload-btn"
                className={styles.quickUploadBtn}
                onClick={() => setActiveTab('home')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
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
              <StatsCards
                photos={photos}
                driveInfo={driveInfo}
                userName={user?.name}
              />
              <UploadButton onUploaded={handleUploadSuccess} variant="hero" />
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

          {activeTab === 'settings' && (
            <SettingsView driveInfo={driveInfo} />
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Gallery from '../components/Gallery';
import MapView from '../components/MapView';
import UploadButton from '../components/UploadButton';
import styles from './Dashboard.module.css';

/**
 * Dashboard — the main authenticated view.
 * Manages which "tab" is shown (gallery vs map) and which photo
 * is selected for the map view.
 */
function Dashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('gallery'); // 'gallery' | 'map'
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const openMap = (photo) => {
    setSelectedPhoto(photo);
    setView('map');
  };

  const backToGallery = () => {
    setView('gallery');
    setSelectedPhoto(null);
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.brand}>Project X</span>
        <nav className={styles.nav}>
          <button
            id="nav-gallery"
            className={view === 'gallery' ? styles.navBtnActive : styles.navBtn}
            onClick={() => setView('gallery')}
          >
            Gallery
          </button>
        </nav>
        <div className={styles.user}>
          {user?.picture && (
            <img src={user.picture} alt={user.name} className={styles.avatar} />
          )}
          <span className={styles.userName}>{user?.name}</span>
          <button id="logout-btn" className={styles.logoutBtn} onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {view === 'gallery' && (
          <>
            <UploadButton />
            <Gallery onPhotoClick={openMap} />
          </>
        )}
        {view === 'map' && (
          <MapView photo={selectedPhoto} onBack={backToGallery} />
        )}
      </main>
    </div>
  );
}

export default Dashboard;

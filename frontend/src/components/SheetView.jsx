import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSheetData } from '../services/driveService';
import styles from './SheetView.module.css';

/**
 * SheetView — Real-time Google Sheets GPS Activity Log:
 *  - Header with prominent 'Open in Google Sheets' external shortcut
 *  - Summary metrics: Total rows, GPS-tagged count, sync mode
 *  - High-density data table with monospace coordinates and Drive links
 */
function SheetView() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSheet = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSheetData(token);
      setData(res);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[SheetView] error:', err);
      setError("We couldn't retrieve the Google Sheet log. Please verify your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const rows = data?.rows ?? [];
  const dataRows = rows.slice(1);

  const gpsTaggedCount = useMemo(() => {
    return dataRows.filter((r) => {
      const lat = r[2];
      const lng = r[3];
      return lat && lng && lat !== '—' && lng !== '—' && !isNaN(Number(lat));
    }).length;
  }, [dataRows]);

  if (loading) {
    return (
      <div className={styles.loadingState} aria-live="polite">
        <div className={styles.spinner} />
        <p>Synchronising GPS Activity Log from Google Sheets…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className={styles.errorMsg} role="alert">{error}</p>
        <button className={styles.retryBtn} onClick={loadSheet}>Try Again</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>GPS Activity Log</h1>
          <p className={styles.pageSubtitle}>
            Location metadata automatically synchronised with Google Sheets in your Drive folder.
          </p>
        </div>

        {data?.spreadsheetUrl && (
          <a
            href={data.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.openSheetBtn}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Open in Google Sheets</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
      </div>

      {/* Summary Metrics */}
      <div className={styles.sheetMetaCard}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Total Entries</span>
          <span className={styles.metaVal}>{dataRows.length}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>GPS Tagged</span>
          <span className={styles.metaVal}>{gpsTaggedCount}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Spreadsheet Tab</span>
          <span className={styles.metaVal} style={{ fontSize: '1rem', marginTop: '3px' }}>Locations</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Sync Engine</span>
          <span className={styles.metaBadge}>Automatic Append</span>
        </div>
      </div>

      {/* Data Table */}
      {dataRows.length === 0 ? (
        <div className={styles.emptyTable}>
          <div className={styles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <h3>No GPS activity records yet</h3>
          <p>When photos with GPS coordinates are uploaded, their metadata rows will automatically record here.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Document / Photo</th>
                <th>Status</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Logged Timestamp</th>
                <th>Google Drive</th>
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => {
                const name = row[0] || 'Untitled';
                const driveLink = row[1];
                const lat = row[2];
                const lng = row[3];
                const timestamp = row[4];
                const hasCoordinates = lat && lng && lat !== '—' && lng !== '—' && !isNaN(Number(lat));

                return (
                  <tr key={rIdx}>
                    {/* Name */}
                    <td className={styles.tdName} title={name}>
                      {name}
                    </td>

                    {/* Status */}
                    <td className={styles.tdStatus}>
                      {hasCoordinates ? (
                        <span className={styles.badgeGps}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          GPS Logged
                        </span>
                      ) : (
                        <span className={styles.badgeNoGps}>No GPS</span>
                      )}
                    </td>

                    {/* Latitude */}
                    <td>
                      {hasCoordinates ? (
                        <span className={styles.tdCoord}>{Number(lat).toFixed(6)}°</span>
                      ) : (
                        <span className={styles.tdCoordEmpty}>—</span>
                      )}
                    </td>

                    {/* Longitude */}
                    <td>
                      {hasCoordinates ? (
                        <span className={styles.tdCoord}>{Number(lng).toFixed(6)}°</span>
                      ) : (
                        <span className={styles.tdCoordEmpty}>—</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className={styles.tdTime}>
                      {timestamp ? new Date(timestamp).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }) : '—'}
                    </td>

                    {/* Drive Link */}
                    <td className={styles.tdLink}>
                      {driveLink ? (
                        <a
                          href={driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkAnchor}
                        >
                          <span>Open File</span>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SheetView;

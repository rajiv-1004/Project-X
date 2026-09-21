import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSheetData } from '../services/driveService';
import styles from './SheetView.module.css';

/**
 * SheetView — renders real Google Sheet metadata and rows:
 *  - Header with direct 'Open in Google Sheets' link.
 *  - Responsive data table showing Photo Name, Drive Link, Latitude, Longitude, Timestamp.
 *  - Handles loading, error, and empty states.
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
  const headerRow = rows[0] || ['Photo Name', 'Drive Link', 'Latitude', 'Longitude', 'Timestamp'];
  const dataRows = rows.slice(1);

  if (loading) {
    return (
      <div className={styles.loadingState} aria-live="polite">
        <div className={styles.spinner} />
        <p>Loading Google Sheet data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
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
          <h1 className={styles.pageTitle}>Google Sheet Log</h1>
          <p className={styles.pageSubtitle}>
            Live GPS metadata automatically recorded to your Google Sheet in Drive.
          </p>
        </div>

        {data?.spreadsheetUrl && (
          <a
            href={data.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.openSheetBtn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Open in Google Sheets</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        )}
      </div>

      {/* Info card */}
      <div className={styles.sheetMetaCard}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Spreadsheet</span>
          <span className={styles.metaVal}>GPS Log</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Sheet Tab</span>
          <span className={styles.metaVal}>Locations</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Total Entries</span>
          <span className={styles.metaVal}>{dataRows.length}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Sync Mode</span>
          <span className={styles.metaBadge}>Automatic Append</span>
        </div>
      </div>

      {/* Table */}
      {dataRows.length === 0 ? (
        <div className={styles.emptyTable}>
          <div className={styles.emptyIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <h3>No GPS logs recorded yet</h3>
          <p>When photos with GPS coordinates are uploaded, their metadata will appear here.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {headerRow.map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {/* Photo Name */}
                  <td className={styles.tdName} title={row[0] || ''}>
                    {row[0] || '—'}
                  </td>

                  {/* Drive Link */}
                  <td className={styles.tdLink}>
                    {row[1] ? (
                      <a
                        href={row[1]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkAnchor}
                      >
                        <span>View in Drive</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Latitude */}
                  <td className={styles.tdCoord}>
                    {row[2] ? parseFloat(row[2]).toFixed(6) : '—'}
                  </td>

                  {/* Longitude */}
                  <td className={styles.tdCoord}>
                    {row[3] ? parseFloat(row[3]).toFixed(6) : '—'}
                  </td>

                  {/* Timestamp */}
                  <td className={styles.tdTime}>
                    {row[4] ? new Date(row[4]).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SheetView;

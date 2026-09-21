import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId) {
  // Fail loudly in development; production builds should catch this in CI.
  console.error('[main] VITE_GOOGLE_CLIENT_ID is not set. Check your .env file.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId ?? ''}>
      {/* AuthProvider must wrap App so useAuth() has a context to read */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { authFetch } from '../utils/api';

export default function DashboardLayout() {
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkSystemAndAuth();
  }, []);

  const checkSystemAndAuth = async () => {
    try {
      // 1. Check System Installation Status
      const sysRes = await fetch('/api/status');
      const sysData = await sysRes.json();

      if (!sysData.installed) {
        // System not installed? Kick user to Setup
        navigate('/setup');
        return;
      }

      // 2. Check Authentication & Token Validity
      const token = localStorage.getItem('access_token');
      if (!token) {
        redirectToLogin();
        return;
      }

      // Verify the token with the backend
      // authFetch handles 401s automatically by redirecting to login
      const authRes = await authFetch('/api/auth/me');

      if (authRes && authRes.ok) {
        // ✅ Token is valid (Backend confirmed it)
        setIsReady(true);
      } else {
        // ❌ Token invalid or expired (handled inside authFetch usually, but safe fallback)
        console.warn("Token verification failed");
        // Handled by authFetch utility redirect
      }

    } catch (e) {
      console.error("Guard check failed", e);
      // If critical failure, safe default is setup or login
      navigate('/setup');
    }
  };

  const redirectToLogin = () => {
    const domain = window.location.hostname.replace('dashboard.', ''); 
    const authUrl = `http://auth.${domain}/realms/startup-stack/protocol/openid-connect/auth?client_id=manager-client&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=openid`;
    window.location.href = authUrl;
  };

  // Show a loader while checking
  if (!isReady) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#f4f4f9', color: '#6b7280', fontFamily: 'sans-serif' }}>
        <div style={{textAlign: 'center'}}>
          <p>Verifying security...</p>
        </div>
      </div>
    );
  }

  // Render Layout
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f4f9' }}>
      <Sidebar />
      <main style={{ marginLeft: '250px', flex: 1, padding: '40px' }}>
        <Outlet />
      </main>
    </div>
  );
}
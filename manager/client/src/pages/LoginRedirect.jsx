// manager/client/src/pages/LoginRedirect.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function LoginRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Checking system status...');

  useEffect(() => {
    const checkSystem = async () => {
      try {
        // 1. Check if system is installed
        const res = await fetch('/api/status');
        const data = await res.json();

        if (!data.installed) {
          // 🛑 Not installed? Go to Setup immediately
          navigate('/setup');
          return;
        }

        // ✅ Installed? Proceed with Authentication Logic
        handleAuth();
      } catch (e) {
        console.error("Status check failed", e);
        // Fallback: If API fails, usually means server is down or networking issue.
        setStatus("Error connecting to server.");
      }
    };

    const handleAuth = () => {
      const code = searchParams.get('code');
      const token = localStorage.getItem('access_token');

      // A. Exchange Code
      if (code) {
        setStatus('Exchanging code for token...');
        fetch('/api/auth/api/token', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri: window.location.origin })
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            localStorage.setItem('access_token', data.auth.accessToken);
            navigate('/dashboard');
          } else {
            setStatus('Login failed. Redirecting...');
            setTimeout(() => navigate('/dashboard'), 2000); // Retry login
          }
        });
        return;
      }

      // B. Already Logged In?
      if (token) {
        navigate('/dashboard');
        return;
      }

      // C. Installed but not logged in -> Dashboard (which triggers Keycloak redirect)
      navigate('/dashboard');
    };

    checkSystem();
  }, []);

  return <div style={{textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif', color: '#666'}}>{status}</div>;
}
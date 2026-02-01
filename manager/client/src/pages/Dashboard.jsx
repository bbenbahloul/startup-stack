import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { authFetch } from '../utils/api';

export default function Dashboard() {
  const [services, setServices] = useState([]);
  const [statuses, setStatuses] = useState({});
  const domain = window.location.hostname.replace('dashboard.', ''); 

  useEffect(() => {
    // 1. Load services first
    authFetch('/api/auth/services')
      .then(res => res && res.json())
      .then(data => {
        if (data) {
          setServices(data);
          // 2. Once loaded, check health immediately
          checkHealth();
        }
      })
      .catch(err => console.error("Failed to load services", err));

    // 3. Poll health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = () => {
    authFetch('/api/auth/status')
      .then(res => res && res.json())
      .then(data => {
        if (data) setStatuses(data);
      })
      .catch(e => console.warn("Health check failed", e));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' }}>
        {services.length === 0 ? (
          <p style={{color: '#666'}}>Loading services...</p>
        ) : (
          services.map(service => {
            const IconComponent = Icons[service.icon] || Icons.Box; 
            const status = statuses[service.slug] || 'loading';

            // 👇 NEW: Clean URL Builder
            // If the DB has a login_path, append it. Otherwise use the base URL.
            let href = service.url;
            if (service.login_path) {
                // Remove trailing slash from base to avoid double slashes
                const baseUrl = service.url.replace(/\/$/, '');
                // Ensure login_path has a leading slash
                const path = service.login_path.startsWith('/') ? service.login_path : `/${service.login_path}`;
                href = `${baseUrl}${path}`;
            }

            return (
              <ExternalLink 
                key={service.slug}
                href={href} 
                icon={<IconComponent size={32} color="#444" />} 
                title={service.name} 
                desc={service.description} 
                status={status}
              />
            );
          })
        )}
      </div>
  );
}

const ExternalLink = ({ href, icon, title, desc, status }) => {
  let statusColor = '#e5e7eb'; // loading (grey)
  let statusText = 'Checking...';
  
  if (status === 'online') {
    statusColor = '#22c55e'; // Green
    statusText = 'Operational';
  } else if (status === 'offline') {
    statusColor = '#ef4444'; // Red
    statusText = 'Offline';
  } else if (status === 'error') {
    statusColor = '#f59e0b'; // Amber
    statusText = 'Issue Detected';
  }

  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noreferrer" 
      style={{ 
        padding: '30px', 
        background: 'white',
        border: '1px solid #eaeaea', 
        borderRadius: '12px', 
        textDecoration: 'none', 
        color: '#333', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        position: 'relative'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#6b7280',
        background: '#f9fafb',
        padding: '4px 8px',
        borderRadius: '20px',
        border: '1px solid #f3f4f6'
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          display: 'block'
        }}></span>
        {statusText}
      </div>

      <div style={{ marginBottom: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '50%' }}>
        {icon}
      </div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{title}</h3>
      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{desc}</p>
    </a>
  );
};
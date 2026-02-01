import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Terminal, LogOut, UserCircle } from 'lucide-react';
import { authFetch } from '../utils/api'; // Import helper

export default function Sidebar() {
  const [user, setUser] = useState({ username: 'Loading...', email: '' });

  useEffect(() => {
    // Fetch current user info
    authFetch('/api/auth/me')
      .then(res => res && res.json())
      .then(data => {
        if (data && data.user) {
          // Keycloak returns 'preferred_username' or 'name' usually
          setUser({
            username: data.user.preferred_username || data.user.name || 'Admin',
            email: data.user.email
          });
        }
      })
      .catch(err => console.error("Failed to load user info", err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    
    // Redirect to Keycloak Logout
    const domain = window.location.hostname.replace('dashboard.', '');
    const logoutUrl = `http://auth.${domain}/realms/startup-stack/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
    
    window.location.href = logoutUrl;
  };

  return (
    <div style={{
      width: '250px',
      height: '100vh',
      background: '#1f2937',
      color: 'white',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
    }}>
      {/* Brand */}
      <div style={{ padding: '25px', borderBottom: '1px solid #374151' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', letterSpacing: '1px' }}>
          Manager<span style={{color: '#3b82f6'}}>.io</span>
        </h2>
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        
        <SidebarLink 
          to="/dashboard" 
          icon={<LayoutDashboard size={20} />} 
          label="Overview" 
        />
        
        <SidebarLink 
          to="/users" 
          icon={<Users size={20} />} 
          label="Users" 
        />
        
        <SidebarLink 
          to="/logs" 
          icon={<Terminal size={20} />} 
          label="System Logs" 
        />

      </nav>

      {/* Footer / User Profile */}
      <div style={{ padding: '20px', borderTop: '1px solid #374151', background: 'rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
          <div style={{ background: '#374151', borderRadius: '50%', padding: '8px', display: 'flex' }}>
            <UserCircle size={24} color="#9ca3af" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.username}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email || 'Administrator'}
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: '#374151',
            border: 'none',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: '13px',
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#374151';
            e.currentTarget.style.color = '#e5e7eb';
          }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}

// Helper Component
function SidebarLink({ to, icon, label }) {
  return (
    <NavLink 
      to={to}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 15px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s',
        color: isActive ? 'white' : '#9ca3af',
        background: isActive ? '#3b82f6' : 'transparent',
      })}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
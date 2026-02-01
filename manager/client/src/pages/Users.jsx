import { useState, useEffect } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { authFetch } from '../utils/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await authFetch('/api/users/list');
      if (res && res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try {
      const res = await authFetch(`/api/users/delete/${id}`, { method: 'DELETE' });
      if (res && res.ok) {
        loadUsers();
      }
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/users/create', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (res && res.ok) {
        setIsModalOpen(false);
        setFormData({ username: '', email: '', password: '' });
        loadUsers();
      } else {
        alert("Failed to create user");
      }
    } catch (e) {
      alert("Error creating user");
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>User Management</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Manage Keycloak identities</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}
        >
          <UserPlus size={18} /> Create User
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #eaeaea' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left', borderBottom: '1px solid #eaeaea' }}>
              <th style={{ padding: '15px 20px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Username</th>
              <th style={{ padding: '15px 20px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Email</th>
              <th style={{ padding: '15px 20px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Status</th>
              <th style={{ padding: '15px 20px', fontWeight: '600', color: '#4b5563', fontSize: '14px', width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>No users found.</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '15px 20px', color: '#1f2937' }}>{user.username}</td>
                  <td style={{ padding: '15px 20px', color: '#4b5563' }}>{user.email || '-'}</td>
                  <td style={{ padding: '15px 20px' }}>
                    {user.enabled ? 
                      <span style={{background: '#dcfce7', color: '#15803d', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'}}>Active</span> : 
                      <span style={{background: '#fee2e2', color: '#b91c1c', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'}}>Disabled</span>
                    }
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <button 
                      onClick={() => handleDelete(user.id)}
                      style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', transition: '0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', marginBottom: '20px', color: '#1f2937' }}>Add New User</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151'}}>Username</label>
                <input 
                  required 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151'}}>Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '25px' }}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151'}}>Password</label>
                <input 
                  type="password" 
                  required 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
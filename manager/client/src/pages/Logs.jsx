import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Play, Pause } from 'lucide-react';
import { authFetch } from '../utils/api';

const CONTAINERS = ['manager', 'keycloak', 'postgres', 'mattermost', 'forgejo', 'traefik'];

export default function Logs() {
  const [selectedContainer, setSelectedContainer] = useState('manager');
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false); 

  // Initial load when container changes
  useEffect(() => {
    fetchLogs();
  }, [selectedContainer]);

  // Live Mode Interval Logic
  useEffect(() => {
    let interval;
    if (isLive) {
      // Poll faster (2s) when in Live Mode
      interval = setInterval(() => {
        fetchLogs(true); // pass true to skip loading spinner
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLive, selectedContainer]);

  const fetchLogs = async (background = false) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/logs/${selectedContainer}`);
      if (res && res.ok) {
        const data = await res.json();
        
        // REVERSE LOGIC: Split lines, reverse array, join back
        const rawLogs = data.logs || '';
        const reversedLogs = rawLogs.trim().split('\n').reverse().join('\n');
        
        setLogs(reversedLogs);
      } else {
        if (!background) setError("Failed to fetch logs");
      }
    } catch (e) {
      if (!background) setError(e.message);
    } finally {
      if (!background) setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', height: '80vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>System Logs</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Real-time container monitoring</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          
          {/* Live Toggle Button */}
          <button
            onClick={() => setIsLive(!isLive)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: isLive ? '#dcfce7' : 'white',
              color: isLive ? '#166534' : '#374151',
              border: isLive ? '1px solid #86efac' : '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            {isLive ? <Pause size={16} /> : <Play size={16} />}
            {isLive ? 'Live On' : 'Live Off'}
          </button>

          <select 
            value={selectedContainer} 
            // Removed setIsLive(false) here to persist state
            onChange={(e) => { setSelectedContainer(e.target.value); setLogs(''); }}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', minWidth: '150px' }}
          >
            {CONTAINERS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          
          <button 
            onClick={() => fetchLogs(false)}
            style={{ padding: '10px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}
            title="Manual Refresh"
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Terminal Window */}
      <div style={{ 
        flex: 1, 
        background: '#1e1e1e', 
        borderRadius: '8px', 
        padding: '20px', 
        overflowY: 'auto',
        fontFamily: '"Fira Code", monospace',
        fontSize: '13px',
        color: '#d4d4d4',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}>
        {/* Live Indicator Dot */}
        {isLive && (
          <div style={{
            position: 'sticky', // Sticky ensures it stays visible even if you scroll
            top: '0',
            float: 'right',
            background: 'rgba(30,30,30, 0.8)',
            padding: '5px 10px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#4ade80',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '10px'
          }}>
            <span className="pulse">●</span> LIVE
          </div>
        )}

        {error ? (
          <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <AlertCircle size={16} /> {error}
          </div>
        ) : (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {logs || "Waiting for logs..."}
          </pre>
        )}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 
          0%, 100% { opacity: 1; } 
          50% { opacity: .2; } 
        }
      `}</style>
    </div>
  );
}
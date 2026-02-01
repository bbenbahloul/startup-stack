import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, CheckCircle, Loader2 } from 'lucide-react';

export default function Setup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const logContainerRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const startInstall = async (e) => {
    e.preventDefault();
    setIsInstalling(true);
    setLogs(['> Starting installation stream...']);
    setStatus(null);

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            if (msg.log) {
              setLogs(prev => [...prev, `> ${msg.log}`]);
            }
            
            // ✅ SUCCESS HANDLER
            if (msg.result && msg.result.status === 'success') {
              setLogs(prev => [...prev, '✅ INSTALLATION COMPLETE']);
              setStatus('success');
              
              // 1. Capture Token Programmatically
              if (msg.result.auth && msg.result.auth.accessToken) {
                localStorage.setItem('access_token', msg.result.auth.accessToken);
                localStorage.setItem('user_email', email);
                
                setLogs(prev => [...prev, '🚀 Authenticated! Entering Dashboard...']);
                
                // 2. Go to Dashboard immediately
                setTimeout(() => navigate('/dashboard'), 1500);
              }
            }

            if (msg.error) {
              setLogs(prev => [...prev, `❌ ERROR: ${msg.error}`]);
              setStatus('error');
            }
          } catch (err) {
            console.error("Parse error", err);
          }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, '❌ Network Error']);
      setStatus('error');
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f4f4f4', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '500px' }}>
        
        <h2 style={{ textAlign: 'center', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Terminal /> Initialize System
        </h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Create the Master Admin account to configure all services.
        </p>

        <form onSubmit={startInstall} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Admin Email</label>
            <input 
              type="email" 
              required 
              placeholder="admin@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isInstalling || status === 'success'}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Admin Password</label>
            <input 
              type="password" 
              required 
              placeholder="StrongPassword123"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isInstalling || status === 'success'}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isInstalling || status === 'success'}
            style={{ 
              padding: '12px', 
              background: status === 'success' ? '#28a745' : '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: isInstalling ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isInstalling ? <Loader2 className="animate-spin" /> : status === 'success' ? <CheckCircle /> : null}
            {isInstalling ? 'Installing...' : status === 'success' ? 'Entering Dashboard...' : 'Install System'}
          </button>
        </form>

        {logs.length > 0 && (
          <div 
            ref={logContainerRef}
            style={{ 
              marginTop: '20px', 
              background: '#1e1e1e', 
              color: '#0f0', 
              padding: '15px', 
              borderRadius: '4px', 
              height: '200px', 
              overflowY: 'auto', 
              fontFamily: 'monospace', 
              fontSize: '12px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '4px', color: log.includes('❌') ? '#ff4d4d' : '#0f0' }}>
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
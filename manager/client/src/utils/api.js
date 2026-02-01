// manager/client/src/utils/api.js

export async function authFetch(url, options = {}) {
  // 1. Get the token
  const token = localStorage.getItem('access_token');

  // 2. Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers, // Allow overriding headers if needed
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. Perform the request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 4. Centralized Error Handling
  if (response.status === 401) {
    console.warn("Session expired. Redirecting...");
    localStorage.removeItem('access_token');
    
    const domain = window.location.hostname.replace('dashboard.', ''); 
    const authUrl = `http://auth.${domain}/realms/startup-stack/protocol/openid-connect/auth?client_id=manager-client&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=openid`;
    
    window.location.href = authUrl;
    return null;
  }

  return response;
}
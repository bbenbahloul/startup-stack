import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Setup from './pages/Setup';
import LoginRedirect from './pages/LoginRedirect';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Logs from './pages/Logs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* -----------------------------------------------------------------
            PUBLIC ROUTES
            These pages render standalone, without the Sidebar layout.
        ------------------------------------------------------------------ */}
        
        {/* The Installation Wizard */}
        <Route path="/setup" element={<Setup />} />
        
        {/* The Auth Handler (Redirects from Keycloak land here) */}
        <Route path="/" element={<LoginRedirect />} />


        {/* -----------------------------------------------------------------
            PROTECTED ROUTES (WITH SIDEBAR)
            Any route nested here will automatically have the Sidebar 
            and the Authentication check from DashboardLayout.
        ------------------------------------------------------------------ */}
        <Route element={<DashboardLayout />}>
          
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route path="/users" element={<Users />} />

          <Route path="/logs" element={<Logs />} />
          
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
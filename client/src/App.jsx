import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Log from './pages/Log';
import Campers from './pages/Campers';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Reports from './pages/Reports';
import Calculator from './pages/Calculator';
import Logout from './pages/Logout';

// Shows Login when logged out, Landing when logged in — no redirect dance
function Home() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  return session ? <Landing /> : <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root: login page when logged out, landing page when logged in */}
          <Route path="/" element={<Home />} />

          {/* /login always shows the login form */}
          <Route path="/login" element={<Login />} />

          <Route
            path="/log"
            element={
              <ProtectedRoute>
                <Log />
              </ProtectedRoute>
            }
          />

          <Route
            path="/campers"
            element={
              <ProtectedRoute>
                <Campers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['nurse', 'admin', 'director']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['nurse', 'admin', 'director']}>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/calculator"
            element={
              <ProtectedRoute>
                <Calculator />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route path="/logout" element={<Logout />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

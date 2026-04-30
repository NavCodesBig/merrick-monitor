import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function NavItem({ to, label, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
          isActive ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
        }`
      }
    >
      {children}
      <span>{label}</span>
    </NavLink>
  );
}

export default function NavBar() {
  const { isNurse, isAdmin } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200">
      <div className="flex items-stretch max-w-lg mx-auto">

        <NavItem to="/" label="Home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </NavItem>

        <NavItem to="/log" label="Log">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </NavItem>

        <NavItem to="/campers" label="Campers">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </NavItem>

        {isNurse && (
          <NavItem to="/dashboard" label="Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </NavItem>
        )}

        {isNurse && (
          <NavItem to="/reports" label="Reports">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </NavItem>
        )}

        <NavItem to="/calculator" label="Calc">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="8" y2="10" strokeWidth={3} strokeLinecap="round" />
            <line x1="12" y1="10" x2="12" y2="10" strokeWidth={3} strokeLinecap="round" />
            <line x1="16" y1="10" x2="16" y2="10" strokeWidth={3} strokeLinecap="round" />
            <line x1="8" y1="14" x2="8" y2="14" strokeWidth={3} strokeLinecap="round" />
            <line x1="12" y1="14" x2="12" y2="14" strokeWidth={3} strokeLinecap="round" />
            <line x1="16" y1="14" x2="16" y2="14" strokeWidth={3} strokeLinecap="round" />
          </svg>
        </NavItem>

        {isAdmin && (
          <NavItem to="/admin" label="Admin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
          </NavItem>
        )}

      </div>
    </nav>
  );
}

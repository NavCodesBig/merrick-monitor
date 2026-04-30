import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NavBar from '../components/NavBar';

const QUICK_LINKS = [
  {
    to: '/log',
    label: 'Hourly Log',
    description: 'Record BG, insulin, and carbs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    bg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    roles: ['nurse', 'counselor', 'admin'],
  },
  {
    to: '/campers',
    label: 'Campers',
    description: 'View and manage camper profiles',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    bg: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
    roles: ['nurse', 'counselor', 'admin'],
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    description: 'All-cabin summary and alerts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    bg: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
    roles: ['nurse', 'admin', 'director'],
  },
  {
    to: '/reports',
    label: 'Reports',
    description: 'Export weekly PDF logs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    bg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    roles: ['nurse', 'admin', 'director'],
  },
  {
    to: '/calculator',
    label: 'Calculator',
    description: 'Insulin dose calculator',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="8" y2="10" strokeWidth={3} strokeLinecap="round" />
        <line x1="12" y1="10" x2="12" y2="10" strokeWidth={3} strokeLinecap="round" />
        <line x1="16" y1="10" x2="16" y2="10" strokeWidth={3} strokeLinecap="round" />
        <line x1="8" y1="14" x2="8" y2="14" strokeWidth={3} strokeLinecap="round" />
        <line x1="12" y1="14" x2="12" y2="14" strokeWidth={3} strokeLinecap="round" />
        <line x1="16" y1="14" x2="16" y2="14" strokeWidth={3} strokeLinecap="round" />
      </svg>
    ),
    bg: 'bg-teal-50 border-teal-200',
    iconColor: 'text-teal-600',
    roles: ['nurse', 'admin', 'director', 'counselor'],
  },
  {
    to: '/admin',
    label: 'Admin',
    description: 'Manage user accounts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 1 0-16 0" />
        <path d="M16 11l2 2 4-4" />
      </svg>
    ),
    bg: 'bg-gray-50 border-gray-200',
    iconColor: 'text-gray-600',
    roles: ['admin'],
  },
];

export default function Landing() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const role = profile?.role ?? 'counselor';
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const cabinName = profile?.cabins?.name;

  const ROLE_LABELS = { admin: 'Admin', nurse: 'Nurse', director: 'Camp Director', counselor: 'Counselor' };
  const roleLabel = ROLE_LABELS[role] ?? role;

  const visibleLinks = QUICK_LINKS.filter(l => l.roles.includes(role));

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-700 to-blue-900 max-w-lg mx-auto">
      {/* Header */}
      <header className="px-5 pt-10 pb-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Lions Camp Merrick Nanjemoy</p>
            <h1 className="text-3xl font-bold tracking-tight">Merrick Monitor</h1>
          </div>
          <img src="/logo.png" alt="Merrick Monitor" className="w-16 h-16 rounded-xl" />
        </div>

        {/* User greeting */}
        <div className="mt-6 bg-white/10 rounded-3xl px-4 py-3">
          <p className="text-white font-semibold text-base">Welcome back, {firstName}</p>
          <p className="text-blue-200 text-xs mt-0.5">
            {roleLabel}{cabinName ? ` · ${cabinName}` : ''}
          </p>
        </div>
      </header>

      {/* Quick links */}
      <main className="flex-1 px-4 py-5 pb-24 space-y-3">
        <h2 className="text-xs font-semibold text-blue-200 uppercase tracking-widest px-1 mb-4">
          Quick access
        </h2>

        {visibleLinks.map(link => (
          <button
            key={link.to}
            onClick={() => navigate(link.to)}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border ${link.bg} text-left hover:shadow-sm active:scale-[0.98] transition-all`}
          >
            <span className={`${link.iconColor} shrink-0`}>{link.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{link.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-gray-400 shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}

        {/* Log out */}
        <button
          onClick={() => navigate('/logout')}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border border-red-200 bg-red-50 text-left hover:shadow-sm active:scale-[0.98] transition-all"
        >
          <span className="text-red-500 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Log Out</p>
            <p className="text-xs text-gray-500 mt-0.5">Sign out of your account</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-gray-400 shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </main>

      <NavBar />
    </div>
  );
}

import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/weekly-plan', label: 'Weekly Plan' },
  { to: '/courses', label: 'Courses' },
  { to: '/log-session', label: 'Log Session' },
  { to: '/timetable', label: 'Timetable' },
  { to: '/assessments', label: 'Assessments' },
  { to: '/resources', label: 'Resources' },
];

export default function Sidebar({ isOpen, onClose }) {
  const clerk = useClerk();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await clerk.signOut();
    navigate('/sign-in');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:w-56 md:shrink-0 md:z-auto md:h-auto
        `}
      >
        {/* Close button — mobile only */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 md:hidden">
          <span className="text-sm font-semibold text-gray-300">Menu</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-4 mt-2">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-gray-800 flex flex-col gap-3">
          <Link
            to="/onboarding"
            onClick={onClose}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Setup Guide
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 100-2H4V5h6a1 1 0 100-2H3zm11.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L15.586 11H9a1 1 0 110-2h6.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

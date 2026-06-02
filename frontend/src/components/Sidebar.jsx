import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/weekly-plan', label: 'Weekly Plan' },
  { to: '/courses', label: 'Courses' },
  { to: '/log-session', label: 'Log Session' },
  { to: '/timetable', label: 'Timetable' },
  { to: '/assessments', label: 'Assessments' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      <nav className="flex flex-col gap-1 p-4 mt-2">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
    </aside>
  );
}

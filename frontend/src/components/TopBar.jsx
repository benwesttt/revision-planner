import TimerWidget from './TimerWidget';

export default function TopBar({ onMenuToggle }) {
  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0">
      <button
        onClick={onMenuToggle}
        className="mr-3 flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors md:hidden"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="text-lg font-bold text-white tracking-tight">RevisionAI</span>
      <TimerWidget />
    </header>
  );
}

import TimerWidget from './TimerWidget';

export default function TopBar({ onMenuToggle }) {
  return (
    <header className="h-14 bg-surface border-b border-border flex items-center px-4 shrink-0">
      <button
        onClick={onMenuToggle}
        className="mr-3 flex items-center justify-center w-10 h-10 rounded-lg text-ink-muted hover:text-ink hover:bg-white/5 transition-colors md:hidden"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="text-lg font-bold text-ink font-headline tracking-tight">Revisr</span>
      <TimerWidget />
    </header>
  );
}

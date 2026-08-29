import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api';
import { useApi } from '../lib/api';
import { useTimer } from '../context/useTimer';
import StartSessionModal from './StartSessionModal';
import StopSessionModal from './StopSessionModal';

function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function TimerWidget() {
  const fetchWithAuth = useApi();
  const { session, loading, elapsedSeconds, pause, resume } = useTimer();
  const [topicName, setTopicName] = useState('');
  const [showStart, setShowStart] = useState(false);
  const [showStop, setShowStop] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Resolve the topic's name for display — the session only carries topic_id.
  useEffect(() => {
    if (!session?.topic_id) return;
    let cancelled = false;
    fetchWithAuth(`${API_BASE_URL}/topics/${session.topic_id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(t => {
        if (!cancelled && t) setTopicName(t.name);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.topic_id, fetchWithAuth]);

  if (loading) return <div className="ml-auto w-32" />;

  if (!session) {
    return (
      <>
        <button
          onClick={() => setShowStart(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Start Session
        </button>
        {showStart && <StartSessionModal onClose={() => setShowStart(false)} />}
      </>
    );
  }

  const isPaused = Boolean(session.paused_at);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await (isPaused ? resume() : pause());
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      <div className="ml-auto flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-1.5 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
          <span className="text-sm font-mono text-white tabular-nums">{formatElapsed(elapsedSeconds)}</span>
          <span className="text-sm text-gray-400 truncate max-w-[10rem] hidden sm:inline">{topicName}</span>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-label={isPaused ? 'Resume session' : 'Pause session'}
          className="flex items-center justify-center w-8 h-8 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isPaused ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <button
          onClick={() => setShowStop(true)}
          aria-label="Stop session"
          className="flex items-center justify-center w-8 h-8 rounded-md text-gray-300 hover:text-white hover:bg-red-900/50 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {showStop && <StopSessionModal topicName={topicName} onClose={() => setShowStop(false)} />}
    </>
  );
}

import { useState } from 'react';
import { useTimer } from '../context/useTimer';

const METHODS = ['flashcards', 'practice questions', 'past papers', 'blurting', 'review notes'];

// My own default for "flag this as unusually long, worth double-checking"
// — not specified anywhere, just a guess. Say if you want it different.
const LONG_SESSION_MINUTES = 180;

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="focus:outline-none"
          aria-label={`Confidence ${n}`}
        >
          <svg
            className={`w-7 h-7 transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-700 hover:text-gray-500'}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function StopSessionModal({ topicName, onClose }) {
  const { session, elapsedSeconds, stop } = useTimer();

  // Snapshotted once, when this screen mounts — the session keeps running
  // in the background until submit, so this must not keep re-deriving
  // from the live elapsedSeconds tick, or the field would jump around
  // under the user's cursor while they're still trying to edit it.
  const [durationMinutes, setDurationMinutes] = useState(() => Math.max(Math.round(elapsedSeconds / 60), 1));
  const [method, setMethod] = useState(session?.method ?? METHODS[0]);
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isLong = Number(durationMinutes) > LONG_SESSION_MINUTES;

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await stop({
        durationMinutes: Number(durationMinutes),
        confidence,
        notes: notes.trim(),
        method,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const inputCls = 'bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full';
  const labelCls = 'flex flex-col gap-1';
  const labelTextCls = 'text-xs text-gray-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 w-full max-w-sm">
        <h2 className="text-lg font-semibold text-white mb-1">Finish Session</h2>
        {topicName && <p className="text-sm text-gray-400 mb-4">{topicName}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isLong && (
            <p className="text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-800 rounded-lg px-3 py-2">
              That's over {Math.floor(LONG_SESSION_MINUTES / 60)} hours — worth double-checking the
              duration below in case the timer kept running in the background.
            </p>
          )}

          <label className={labelCls}>
            <span className={labelTextCls}>Duration (minutes)</span>
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
              className={inputCls}
              required
            />
          </label>

          <label className={labelCls}>
            <span className={labelTextCls}>Method</span>
            <select value={method} onChange={e => setMethod(e.target.value)} className={inputCls}>
              {METHODS.map(m => (
                <option key={m} value={m} className="capitalize">{m}</option>
              ))}
            </select>
          </label>

          <div className={labelCls}>
            <span className={labelTextCls}>Confidence</span>
            <div className="mt-0.5 flex items-center gap-2">
              <Stars value={confidence} onChange={setConfidence} />
              <span className="text-sm text-gray-400">{confidence} / 5</span>
            </div>
          </div>

          <label className={labelCls}>
            <span className={labelTextCls}>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Anything worth remembering about this session…"
            />
          </label>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Keep going
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

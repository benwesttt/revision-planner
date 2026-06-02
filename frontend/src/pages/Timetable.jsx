import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';

const USER_ID = 1;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function Timetable() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', start_time: '', end_time: '', recurring: false });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/calendar-events/?user_id=${USER_ID}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      setEvents(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.start_time || !form.end_time) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/calendar-events/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          title: form.title.trim(),
          start_time: form.start_time,
          end_time: form.end_time,
          recurring: form.recurring,
        }),
      });
      if (!res.ok) throw new Error('Failed to create event');
      setForm({ title: '', start_time: '', end_time: '', recurring: false });
      setShowForm(false);
      await fetchEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await fetch(`${API_BASE_URL}/calendar-events/${id}`, { method: 'DELETE' });
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const byDay = {};
  for (const event of events) {
    const day = new Date(event.start_time).getDay();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(event);
  }
  for (const day of Object.keys(byDay)) {
    byDay[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  if (loading) {
    return <p className="text-gray-400">Loading timetable…</p>;
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Timetable</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Add Event form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-xl flex flex-col gap-3"
        >
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">New Event</h2>
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            autoFocus
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Start time</span>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">End time</span>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                required
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
              className="w-4 h-4 rounded accent-indigo-500"
            />
            Repeats every week
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Event'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">No events yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Click <span className="text-indigo-400">+ Add Event</span> to block out your week
          </p>
        </div>
      )}

      {/* Days */}
      {events.length > 0 && (
        <div className="flex flex-col gap-6">
          {DAY_ORDER.map(dayIndex => {
            const dayEvents = byDay[dayIndex];
            if (!dayEvents) return null;
            return (
              <section key={dayIndex}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                  {DAYS[dayIndex]}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm"
                    >
                      <span className="text-white font-medium">{event.title}</span>
                      <span className="text-gray-400 tabular-nums">
                        {formatTime(event.start_time)}–{formatTime(event.end_time)}
                      </span>
                      {event.recurring && (
                        <span className="text-xs text-indigo-400" title="Recurring">↻</span>
                      )}
                      <button
                        onClick={() => handleDelete(event.id)}
                        disabled={deleting === event.id}
                        className="ml-0.5 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                        aria-label="Delete event"
                      >
                        {deleting === event.id ? (
                          <span className="text-xs leading-none">…</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

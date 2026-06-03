import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';

const USER_ID = 1;
const TOTAL_STEPS = 6;

const COURSE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

const METHOD_OPTIONS = [
  { label: 'Flashcards',          value: 'flashcards' },
  { label: 'Active Recall',       value: 'active recall' },
  { label: 'Practice Questions',  value: 'practice questions' },
  { label: 'Past Papers',         value: 'past papers' },
  { label: 'Notes Review',        value: 'review notes' },
];

const SESSION_LENGTHS = [25, 50, 75];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEK_OPTIONS = [
  { value: 'A',    label: 'Week A' },
  { value: 'B',    label: 'Week B' },
  { value: 'both', label: 'Every Week' },
];

const inputCls = 'bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-full';
const btnPrimary = 'px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors';
const btnSecondary = 'px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nextDateForDay(dayName, timeStr) {
  const idx = DAYS_OF_WEEK.indexOf(dayName);
  const jsDay = idx === 6 ? 0 : idx + 1; // Mon=1…Sun=0
  const today = new Date();
  let daysUntil = jsDay - today.getDay();
  if (daysUntil <= 0) daysUntil += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + daysUntil);
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 justify-center">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s === step ? 'w-8 bg-indigo-500' :
            s < step  ? 'w-4 bg-indigo-700' :
                        'w-4 bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);

  // Step 2
  const [courses, setCourses] = useState([]);
  const [courseInput, setCourseInput] = useState('');
  const [addingCourse, setAddingCourse] = useState(false);

  // Step 3
  const [courseTopics, setCourseTopics] = useState({});
  const [topicForms, setTopicForms] = useState({});
  const [addingTopic, setAddingTopic] = useState(null);

  // Step 4
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [customMethods, setCustomMethods] = useState([]);
  const [customMethodInput, setCustomMethodInput] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [sessionLength, setSessionLength] = useState(50);
  const [isCustomLength, setIsCustomLength] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Step 5
  const [events, setEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '', day: 'Monday', start_time: '09:00', end_time: '10:00', week: 'both',
  });
  const [addingEvent, setAddingEvent] = useState(false);

  // Step 6
  const [generating, setGenerating] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddCourse = async (e) => {
    e?.preventDefault();
    const name = courseInput.trim();
    if (!name) return;
    setAddingCourse(true);
    setError(null);
    try {
      const color = COURSE_COLORS[courses.length % COURSE_COLORS.length];
      const res = await fetch(`${API_BASE_URL}/courses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID, name, color }),
      });
      if (!res.ok) throw new Error('Failed to add course');
      const created = await res.json();
      setCourses(prev => [...prev, created]);
      setCourseInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingCourse(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    await fetch(`${API_BASE_URL}/courses/${id}`, { method: 'DELETE' }).catch(() => {});
    setCourses(prev => prev.filter(c => c.id !== id));
    setCourseTopics(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleAddTopic = async (e, courseId) => {
    e?.preventDefault();
    const name = (topicForms[courseId] || '').trim();
    if (!name) return;
    setAddingTopic(courseId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/topics/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, name }),
      });
      if (!res.ok) throw new Error('Failed to add topic');
      const created = await res.json();
      setCourseTopics(prev => ({ ...prev, [courseId]: [...(prev[courseId] || []), created] }));
      setTopicForms(prev => ({ ...prev, [courseId]: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingTopic(null);
    }
  };

  const handleDeleteTopic = async (topicId, courseId) => {
    await fetch(`${API_BASE_URL}/topics/${topicId}`, { method: 'DELETE' }).catch(() => {});
    setCourseTopics(prev => ({
      ...prev,
      [courseId]: (prev[courseId] || []).filter(t => t.id !== topicId),
    }));
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    setError(null);
    try {
      const payload = {
        user_id: USER_ID,
        preferred_methods: selectedMethods,
        min_session_minutes: sessionLength,
        max_session_minutes: sessionLength,
        daily_hours_target: hoursPerDay,
      };

      console.log('POST /revision-preferences/ payload:', JSON.stringify(payload, null, 2));

      const postRes = await fetch(`${API_BASE_URL}/revision-preferences/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('POST /revision-preferences/ status:', postRes.status);

      if (!postRes.ok) {
        const postBody = await postRes.text();
        console.error('POST /revision-preferences/ error body:', postBody);

        // Preference already exists — look up the correct record ID then PUT
        const listRes = await fetch(`${API_BASE_URL}/revision-preferences/?user_id=${USER_ID}`);
        if (!listRes.ok) throw new Error('Failed to fetch existing preferences');
        const prefs = await listRes.json();
        if (!prefs.length) throw new Error('No existing preference record found');
        const prefId = prefs[0].id;

        console.log(`PUT /revision-preferences/${prefId} payload:`, JSON.stringify(payload, null, 2));

        const putRes = await fetch(`${API_BASE_URL}/revision-preferences/${prefId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        console.log(`PUT /revision-preferences/${prefId} status:`, putRes.status);

        if (!putRes.ok) {
          const putBody = await putRes.text();
          console.error(`PUT /revision-preferences/${prefId} error body:`, putBody);
          throw new Error(`Failed to save preferences (PUT ${putRes.status}): ${putBody}`);
        }

        const putData = await putRes.json().catch(() => null);
        console.log(`PUT /revision-preferences/${prefId} response body:`, JSON.stringify(putData, null, 2));
      }

      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleAddEvent = async (e) => {
    e?.preventDefault();
    if (!eventForm.title.trim()) return;
    setAddingEvent(true);
    setError(null);
    try {
      const start = nextDateForDay(eventForm.day, eventForm.start_time);
      const end   = nextDateForDay(eventForm.day, eventForm.end_time);
      const res = await fetch(`${API_BASE_URL}/calendar-events/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          title: eventForm.title.trim(),
          start_time: start,
          end_time: end,
          recurring: true,
          week: eventForm.week,
        }),
      });
      if (!res.ok) throw new Error('Failed to add event');
      const created = await res.json();
      setEvents(prev => [...prev, { ...created, dayLabel: eventForm.day }]);
      setEventForm({ title: '', day: 'Monday', start_time: '09:00', end_time: '10:00', week: 'both' });
      setShowEventForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingEvent(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    await fetch(`${API_BASE_URL}/calendar-events/${id}`, { method: 'DELETE' }).catch(() => {});
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/planner/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID, start_date: todayISO() }),
      });
      if (!res.ok) throw new Error('Failed to generate plan');
      localStorage.setItem('onboarding_complete', 'true');
      navigate('/weekly-plan');
    } catch (err) {
      setError(err.message);
      setGenerating(false);
    }
  };

  const finishWithoutPlan = () => {
    localStorage.setItem('onboarding_complete', 'true');
    navigate('/');
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const canProceedStep2 = courses.length > 0;
  const canProceedStep3 = courses.length > 0 &&
    courses.every(c => (courseTopics[c.id] || []).length > 0);
  const totalTopics = Object.values(courseTopics).flat().length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-lg">
        <ProgressBar step={step} />
        <p className="text-center text-xs text-gray-700 mb-6">Step {step} of {TOTAL_STEPS}</p>

        {error && (
          <p className="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-8">

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Welcome to Revision Planner</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Revision Planner builds personalised 7-day study schedules around your courses, topics, and weekly commitments — then tracks your progress as you go.
              </p>
              <p className="text-gray-600 text-xs mb-8">This quick setup takes about 2 minutes.</p>
              <button onClick={() => setStep(2)} className={`${btnPrimary} w-full py-3`}>
                Get started →
              </button>
            </div>
          )}

          {/* ── Step 2: Courses ── */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Add your courses</h2>
              <p className="text-sm text-gray-400 mb-5">Add the courses or modules you're studying this term.</p>

              <form onSubmit={handleAddCourse} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="e.g. Mathematics, Biology A"
                  value={courseInput}
                  onChange={e => setCourseInput(e.target.value)}
                  className={inputCls}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={addingCourse || !courseInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
                >
                  {addingCourse ? '…' : 'Add'}
                </button>
              </form>

              {courses.length > 0 ? (
                <ul className="flex flex-col gap-2 mb-6">
                  {courses.map(c => (
                    <li key={c.id} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="flex-1 text-sm text-white">{c.name}</span>
                      <button onClick={() => handleDeleteCourse(c.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors" aria-label="Remove">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600 mb-6">Add at least one course to continue.</p>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className={btnSecondary}>← Back</button>
                <button onClick={() => setStep(3)} disabled={!canProceedStep2} className={btnPrimary}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Topics ── */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Add topics</h2>
              <p className="text-sm text-gray-400 mb-5">
                Add at least one topic per course. The planner uses these to build your schedule.
              </p>

              <div className="flex flex-col gap-5 mb-6">
                {courses.map(c => {
                  const topics = courseTopics[c.id] || [];
                  return (
                    <div key={c.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-sm font-medium text-gray-300">{c.name}</span>
                        {topics.length === 0 && (
                          <span className="text-xs text-amber-500 ml-1">add at least 1</span>
                        )}
                      </div>

                      {topics.length > 0 && (
                        <ul className="flex flex-col gap-1 mb-2 pl-4">
                          {topics.map(t => (
                            <li key={t.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 rounded-lg">
                              <span className="flex-1 text-sm text-gray-200">{t.name}</span>
                              <button onClick={() => handleDeleteTopic(t.id, c.id)}
                                className="text-gray-600 hover:text-red-400 transition-colors" aria-label="Remove">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <form onSubmit={e => handleAddTopic(e, c.id)} className="flex gap-2 pl-4">
                        <input
                          type="text"
                          placeholder="Topic name"
                          value={topicForms[c.id] || ''}
                          onChange={e => setTopicForms(prev => ({ ...prev, [c.id]: e.target.value }))}
                          className={inputCls}
                        />
                        <button
                          type="submit"
                          disabled={addingTopic === c.id || !(topicForms[c.id] || '').trim()}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors shrink-0"
                        >
                          {addingTopic === c.id ? '…' : '+'}
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className={btnSecondary}>← Back</button>
                <button onClick={() => setStep(4)} disabled={!canProceedStep3} className={btnPrimary}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Preferences ── */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Revision preferences</h2>
              <p className="text-sm text-gray-400 mb-5">Customise how the planner builds your sessions.</p>

              <div className="mb-5">
                <p className="text-xs text-gray-400 mb-2">Which revision methods do you like to use?</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {METHOD_OPTIONS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setSelectedMethods(prev =>
                        prev.includes(m.value) ? prev.filter(v => v !== m.value) : [...prev, m.value]
                      )}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        selectedMethods.includes(m.value)
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                  {customMethods.map(m => (
                    <span key={m} className={`flex items-center gap-1 pl-3 pr-1.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      selectedMethods.includes(m)
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setSelectedMethods(prev =>
                          prev.includes(m) ? prev.filter(v => v !== m) : [...prev, m]
                        )}
                        className="capitalize"
                      >
                        {m}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomMethods(prev => prev.filter(v => v !== m));
                          setSelectedMethods(prev => prev.filter(v => v !== m));
                        }}
                        className="ml-0.5 hover:text-red-300 transition-colors"
                        aria-label="Remove method"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const val = customMethodInput.trim().toLowerCase();
                    if (!val) return;
                    const allExisting = [...METHOD_OPTIONS.map(m => m.value), ...customMethods];
                    if (!allExisting.includes(val)) {
                      setCustomMethods(prev => [...prev, val]);
                      setSelectedMethods(prev => [...prev, val]);
                    }
                    setCustomMethodInput('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Add custom method…"
                    value={customMethodInput}
                    onChange={e => setCustomMethodInput(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!customMethodInput.trim()}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
                  >
                    + Add
                  </button>
                </form>
              </div>

              <div className="mb-5">
                <p className="text-xs text-gray-400 mb-2">How many hours per day do you want to revise?</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={hoursPerDay}
                    onChange={e => setHoursPerDay(Number(e.target.value))}
                    className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-sm text-gray-500">hours</span>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-gray-400 mb-2">Preferred study session length?</p>
                <div className="flex flex-wrap gap-2">
                  {SESSION_LENGTHS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => { setSessionLength(l); setIsCustomLength(false); }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        !isCustomLength && sessionLength === l
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {l} min
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomLength(true)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      isCustomLength
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {isCustomLength && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={sessionLength}
                      onChange={e => setSessionLength(Math.max(5, Number(e.target.value) || 50))}
                      className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    <span className="text-sm text-gray-500">minutes</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(3)} className={btnSecondary}>← Back</button>
                <button onClick={handleSavePrefs} disabled={savingPrefs} className={btnPrimary}>
                  {savingPrefs ? 'Saving…' : 'Next →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Events ── */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Weekly commitments</h2>
              <p className="text-sm text-gray-400 mb-5">
                Add regular commitments so the planner can schedule around them. This step is optional.
              </p>

              {events.length > 0 && (
                <ul className="flex flex-col gap-2 mb-4">
                  {events.map(ev => (
                    <li key={ev.id} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <span className="text-sm text-white">{ev.title}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {ev.dayLabel} · {ev.start_time.slice(11, 16)}–{ev.end_time.slice(11, 16)}
                          {ev.week !== 'both' && ` · Wk ${ev.week}`}
                        </span>
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showEventForm ? (
                <form onSubmit={handleAddEvent} className="flex flex-col gap-3 mb-4 p-3 bg-gray-800 rounded-xl border border-gray-700">
                  <input
                    type="text"
                    placeholder="Event name (e.g. Maths Lecture)"
                    value={eventForm.title}
                    onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                    className={inputCls}
                    autoFocus
                    required
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400">Day</span>
                      <select
                        value={eventForm.day}
                        onChange={e => setEventForm(f => ({ ...f, day: e.target.value }))}
                        className={inputCls}
                      >
                        {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400">Start</span>
                      <input type="time" value={eventForm.start_time}
                        onChange={e => setEventForm(f => ({ ...f, start_time: e.target.value }))}
                        className={`${inputCls} [color-scheme:dark]`} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400">End</span>
                      <input type="time" value={eventForm.end_time}
                        onChange={e => setEventForm(f => ({ ...f, end_time: e.target.value }))}
                        className={`${inputCls} [color-scheme:dark]`} />
                    </label>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Week</span>
                    <div className="flex gap-2">
                      {WEEK_OPTIONS.map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => setEventForm(f => ({ ...f, week: opt.value }))}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            eventForm.week === opt.value
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowEventForm(false)} className={btnSecondary}>
                      Cancel
                    </button>
                    <button type="submit" disabled={addingEvent} className={btnPrimary}>
                      {addingEvent ? '…' : 'Add Event'}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowEventForm(true)}
                  className="w-full py-2 mb-4 border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 rounded-xl text-sm transition-colors"
                >
                  + Add commitment
                </button>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep(4)} className={btnSecondary}>← Back</button>
                <div className="flex gap-2">
                  <button onClick={() => setStep(6)} className={btnSecondary}>Skip for now</button>
                  <button onClick={() => setStep(6)} className={btnPrimary}>Next →</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: All set ── */}
          {step === 6 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-900/50 border border-green-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">You're all set!</h2>
              <p className="text-sm text-gray-400 mb-6">Here's what you've configured:</p>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { value: courses.length,  label: courses.length  === 1 ? 'course'  : 'courses' },
                  { value: totalTopics,     label: totalTopics      === 1 ? 'topic'   : 'topics' },
                  { value: events.length,   label: events.length   === 1 ? 'event'   : 'events' },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-3">
                    <p className="text-2xl font-semibold text-white">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`${btnPrimary} w-full py-3 mb-3`}
              >
                {generating ? 'Generating…' : 'Generate my first plan →'}
              </button>
              <button onClick={finishWithoutPlan} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Skip for now, go to dashboard
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

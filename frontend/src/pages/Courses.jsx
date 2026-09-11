import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';
import { useApi } from '../lib/api';

const USER_ID = 1;

export default function Courses() {
  const fetchWithAuth = useApi();
  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({ name: '', color: '#D4A017' });
  const [courseSubmitting, setCourseSubmitting] = useState(false);

  const [expandedTopic, setExpandedTopic] = useState(null);
  const [topicForms, setTopicForms] = useState({});
  const [topicSubmitting, setTopicSubmitting] = useState(null);

  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseMode, setEditCourseMode] = useState('revision');
  const [courseEditSaving, setCourseEditSaving] = useState(false);

  const [pendingDeleteCourse, setPendingDeleteCourse] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState(null);

  const [editingTopicId, setEditingTopicId] = useState(null);
  const [editTopicForm, setEditTopicForm] = useState({
    name: '',
    description: '',
    sequence_order: '',
    status: 'not_started',
    expected_taught_by: '',
  });
  const [topicEditSaving, setTopicEditSaving] = useState(false);

  const [pendingDeleteTopic, setPendingDeleteTopic] = useState(null);
  const [deletingTopic, setDeletingTopic] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth(`${API_BASE_URL}/courses/?user_id=${USER_ID}`);
      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();
      setCourses(data);
      const topicMap = {};
      await Promise.all(
        data.map(async (course) => {
          const tr = await fetchWithAuth(`${API_BASE_URL}/topics/?course_id=${course.id}`);
          topicMap[course.id] = tr.ok ? await tr.json() : [];
        })
      );
      setTopics(topicMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.name.trim()) return;
    setCourseSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/courses/`, {
        method: 'POST',
        body: JSON.stringify({ user_id: USER_ID, name: courseForm.name.trim(), color: courseForm.color }),
      });
      if (!res.ok) throw new Error('Failed to create course');
      setCourseForm({ name: '', color: '#D4A017' });
      setShowAddCourse(false);
      await fetchCourses();
    } catch (err) {
      setError(err.message);
    } finally {
      setCourseSubmitting(false);
    }
  };

  const handleAddTopic = async (e, courseId) => {
    e.preventDefault();
    const form = topicForms[courseId] || { name: '', description: '' };
    if (!form.name.trim()) return;
    setTopicSubmitting(courseId);
    try {
      const body = { course_id: courseId, name: form.name.trim() };
      if (form.description.trim()) body.description = form.description.trim();
      const res = await fetchWithAuth(`${API_BASE_URL}/topics/`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create topic');
      const newTopic = await res.json();
      setTopics(prev => ({ ...prev, [courseId]: [...(prev[courseId] || []), newTopic] }));
      setTopicForms(prev => ({ ...prev, [courseId]: { name: '', description: '' } }));
      setExpandedTopic(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setTopicSubmitting(null);
    }
  };

  const startEditCourse = (course) => {
    setPendingDeleteCourse(null);
    setEditingCourseId(course.id);
    setEditCourseName(course.name);
    setEditCourseMode(course.mode ?? 'revision');
  };

  const cancelEditCourse = () => setEditingCourseId(null);

  const handleSaveCourse = async (e, courseId) => {
    e.preventDefault();
    if (!editCourseName.trim()) return;
    setCourseEditSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editCourseName.trim(), mode: editCourseMode }),
      });
      if (!res.ok) throw new Error('Failed to update course');
      setEditingCourseId(null);
      await fetchCourses();
    } catch (err) {
      setError(err.message);
    } finally {
      setCourseEditSaving(false);
    }
  };

  const handleToggleActive = async (course) => {
    const nextActive = !course.is_active;
    setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_active: nextActive } : c));
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/courses/${course.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (!res.ok) throw new Error('Failed to update course');
    } catch (err) {
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_active: !nextActive } : c));
      setError(err.message);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    setDeletingCourse(courseId);
    try {
      await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}`, { method: 'DELETE' });
      setCourses(prev => prev.filter(c => c.id !== courseId));
      setPendingDeleteCourse(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingCourse(null);
    }
  };

  const startEditTopic = (topic) => {
    setPendingDeleteTopic(null);
    setEditingTopicId(topic.id);
    setEditTopicForm({
      name: topic.name,
      description: topic.description ?? '',
      sequence_order: topic.sequence_order ?? '',
      status: topic.status ?? 'not_started',
      expected_taught_by: topic.expected_taught_by ?? '',
    });
  };

  const cancelEditTopic = () => setEditingTopicId(null);

  const handleSaveTopic = async (e, topic, courseId) => {
    e.preventDefault();
    if (!editTopicForm.name.trim()) return;
    setTopicEditSaving(true);
    try {
      const body = { name: editTopicForm.name.trim() };
      if (editTopicForm.description.trim()) body.description = editTopicForm.description.trim();
      else body.description = null;
      const course = courses.find(c => c.id === courseId);
      if (course?.mode === 'learning') {
        body.sequence_order = editTopicForm.sequence_order === '' ? null : Number(editTopicForm.sequence_order);
        body.status = editTopicForm.status;
        body.expected_taught_by = editTopicForm.expected_taught_by || null;
      }
      const res = await fetchWithAuth(`${API_BASE_URL}/topics/${topic.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update topic');
      const updated = await res.json();
      setTopics(prev => ({
        ...prev,
        [courseId]: prev[courseId].map(t => t.id === topic.id ? updated : t),
      }));
      setEditingTopicId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setTopicEditSaving(false);
    }
  };

  const handleDeleteTopic = async (topicId, courseId) => {
    setDeletingTopic(topicId);
    try {
      await fetchWithAuth(`${API_BASE_URL}/topics/${topicId}`, { method: 'DELETE' });
      setTopics(prev => ({
        ...prev,
        [courseId]: prev[courseId].filter(t => t.id !== topicId),
      }));
      setPendingDeleteTopic(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingTopic(null);
    }
  };

  const toggleTopicForm = (courseId) => {
    setExpandedTopic(prev => prev === courseId ? null : courseId);
    setTopicForms(prev => ({ ...prev, [courseId]: prev[courseId] || { name: '', description: '' } }));
  };

  if (loading) {
    return <p className="text-ink-secondary">Loading courses…</p>;
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-ink">Courses</h1>
        <button
          onClick={() => setShowAddCourse(v => !v)}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-background text-sm font-medium rounded-lg transition-colors"
        >
          {showAddCourse ? 'Cancel' : '+ Add Course'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-danger bg-danger-bg border border-danger/40 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Add course form */}
      {showAddCourse && (
        <form
          onSubmit={handleAddCourse}
          className="mb-6 p-4 bg-surface border border-border rounded-xl flex flex-col gap-3"
        >
          <h2 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide">New Course</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Course name"
              value={courseForm.name}
              onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-accent"
              autoFocus
            />
            <label className="flex items-center gap-2 text-sm text-ink-secondary">
              <span>Color</span>
              <input
                type="color"
                value={courseForm.color}
                onChange={e => setCourseForm(f => ({ ...f, color: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={courseSubmitting}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-background text-sm font-medium rounded-lg transition-colors"
            >
              {courseSubmitting ? 'Saving…' : 'Save Course'}
            </button>
          </div>
        </form>
      )}

      {/* Course grid */}
      {courses.length === 0 ? (
        <p className="text-ink-muted text-sm">No courses yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {courses.map(course => {
            const courseTopics = topics[course.id] || [];
            const isExpanded = expandedTopic === course.id;
            const topicForm = topicForms[course.id] || { name: '', description: '' };

            return (
              <div
                key={course.id}
                className={`bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 transition-opacity ${!course.is_active ? 'opacity-50' : ''}`}
              >
                {/* Course header */}
                {editingCourseId === course.id ? (
                  <form onSubmit={e => handleSaveCourse(e, course.id)} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                    <input
                      type="text"
                      value={editCourseName}
                      onChange={e => setEditCourseName(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-sm text-ink focus:outline-none focus:border-accent"
                      autoFocus
                      required
                    />
                    <select
                      value={editCourseMode}
                      onChange={e => setEditCourseMode(e.target.value)}
                      className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:border-accent"
                    >
                      <option value="revision">Revision</option>
                      <option value="learning">Learning</option>
                    </select>
                    <button
                      type="submit"
                      disabled={courseEditSaving}
                      className="px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-background text-xs font-medium rounded-lg transition-colors"
                    >
                      {courseEditSaving ? '…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditCourse}
                      className="px-2 py-1 text-xs text-ink-secondary hover:text-ink transition-colors"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                    <span className="font-semibold text-ink text-sm flex-1">{course.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-border text-ink-secondary select-none shrink-0 uppercase tracking-wide">
                      {course.mode === 'learning' ? 'Learning' : 'Revision'}
                    </span>
                    <span className="text-[10px] text-ink-muted select-none shrink-0">
                      {course.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(course)}
                      role="switch"
                      aria-checked={course.is_active}
                      aria-label={course.is_active ? 'Set course inactive' : 'Set course active'}
                      title={course.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                      className={`flex items-center w-7 h-4 rounded-full px-0.5 transition-colors shrink-0 ${course.is_active ? 'bg-accent justify-end' : 'bg-border justify-start'}`}
                    >
                      <span className="w-3 h-3 rounded-full bg-white" />
                    </button>
                    {pendingDeleteCourse === course.id ? (
                      <>
                        <span className="text-xs text-ink-secondary">Delete?</span>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          disabled={deletingCourse === course.id}
                          className="text-xs px-2 py-1 bg-danger hover:bg-danger/90 disabled:opacity-50 text-ink rounded-lg transition-colors"
                        >
                          {deletingCourse === course.id ? '…' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setPendingDeleteCourse(null)}
                          className="text-xs px-2 py-1 bg-border hover:bg-white/5 text-ink-secondary rounded-lg transition-colors"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditCourse(course)}
                          className="text-ink-muted hover:text-accent transition-colors"
                          aria-label="Edit course"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setPendingDeleteCourse(course.id)}
                          className="text-ink-muted hover:text-danger transition-colors"
                          aria-label="Delete course"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Topics list */}
                {courseTopics.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {courseTopics.map(topic => {
                      const isEditingTopic = editingTopicId === topic.id;
                      const isPendingDelete = pendingDeleteTopic === topic.id;

                      if (isEditingTopic) {
                        return (
                          <li key={topic.id} className="bg-background rounded-lg px-2 py-2 flex flex-col gap-2">
                            <input
                              type="text"
                              value={editTopicForm.name}
                              onChange={e => setEditTopicForm(f => ({ ...f, name: e.target.value }))}
                              className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-ink focus:outline-none focus:border-accent"
                              autoFocus
                              required
                            />
                            <input
                              type="text"
                              placeholder="Description (optional)"
                              value={editTopicForm.description}
                              onChange={e => setEditTopicForm(f => ({ ...f, description: e.target.value }))}
                              className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-accent"
                            />
                            {course.mode === 'learning' && (
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Order"
                                  value={editTopicForm.sequence_order}
                                  onChange={e => setEditTopicForm(f => ({ ...f, sequence_order: e.target.value }))}
                                  className="w-20 bg-surface border border-border rounded-lg px-2 py-1 text-sm text-ink focus:outline-none focus:border-accent"
                                />
                                <select
                                  value={editTopicForm.status}
                                  onChange={e => setEditTopicForm(f => ({ ...f, status: e.target.value }))}
                                  className="flex-1 bg-surface border border-border rounded-lg px-2 py-1 text-sm text-ink focus:outline-none focus:border-accent"
                                >
                                  <option value="not_started">Not started</option>
                                  <option value="pre_learned">Pre-learned</option>
                                  <option value="taught">Taught</option>
                                </select>
                                <input
                                  type="date"
                                  value={editTopicForm.expected_taught_by}
                                  onChange={e => setEditTopicForm(f => ({ ...f, expected_taught_by: e.target.value }))}
                                  className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-ink focus:outline-none focus:border-accent"
                                />
                              </div>
                            )}
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={cancelEditTopic}
                                className="px-2 py-1 text-xs text-ink-secondary hover:text-ink transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={topicEditSaving}
                                onClick={e => handleSaveTopic(e, topic, course.id)}
                                className="px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-background text-xs font-medium rounded-lg transition-colors"
                              >
                                {topicEditSaving ? '…' : 'Save'}
                              </button>
                            </div>
                          </li>
                        );
                      }

                      return (
                        <li key={topic.id} className="flex items-start gap-2 px-2 py-1.5 bg-background rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-ink-secondary">{topic.name}</p>
                            {topic.description && (
                              <p className="text-xs text-ink-muted mt-0.5">{topic.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            {isPendingDelete ? (
                              <>
                                <span className="text-xs text-ink-secondary">Delete?</span>
                                <button
                                  onClick={() => handleDeleteTopic(topic.id, course.id)}
                                  disabled={deletingTopic === topic.id}
                                  className="text-xs px-1.5 py-0.5 bg-danger hover:bg-danger/90 disabled:opacity-50 text-ink rounded transition-colors"
                                >
                                  {deletingTopic === topic.id ? '…' : 'Yes'}
                                </button>
                                <button
                                  onClick={() => setPendingDeleteTopic(null)}
                                  className="text-xs px-1.5 py-0.5 bg-border hover:bg-white/5 text-ink-secondary rounded transition-colors"
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditTopic(topic)}
                                  className="text-ink-muted hover:text-accent transition-colors"
                                  aria-label="Edit topic"
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setPendingDeleteTopic(topic.id)}
                                  className="text-ink-muted hover:text-danger transition-colors"
                                  aria-label="Delete topic"
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Add topic inline form */}
                {isExpanded && (
                  <form
                    onSubmit={e => handleAddTopic(e, course.id)}
                    className="flex flex-col gap-2 pt-1 border-t border-border"
                  >
                    <input
                      type="text"
                      placeholder="Topic name"
                      value={topicForm.name}
                      onChange={e =>
                        setTopicForms(prev => ({
                          ...prev,
                          [course.id]: { ...topicForm, name: e.target.value },
                        }))
                      }
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-accent"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={topicForm.description}
                      onChange={e =>
                        setTopicForms(prev => ({
                          ...prev,
                          [course.id]: { ...topicForm, description: e.target.value },
                        }))
                      }
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-accent"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedTopic(null)}
                        className="px-3 py-1.5 text-xs text-ink-secondary hover:text-ink transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={topicSubmitting === course.id}
                        className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-background text-xs font-medium rounded-lg transition-colors"
                      >
                        {topicSubmitting === course.id ? 'Saving…' : 'Add Topic'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Add topic button */}
                {!isExpanded && (
                  <button
                    onClick={() => toggleTopicForm(course.id)}
                    className="text-xs text-accent hover:text-accent-hover text-left transition-colors"
                  >
                    + Add Topic
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

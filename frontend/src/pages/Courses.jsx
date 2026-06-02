import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';

const USER_ID = 1;

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({ name: '', color: '#6366f1' });
  const [courseSubmitting, setCourseSubmitting] = useState(false);

  const [expandedTopic, setExpandedTopic] = useState(null);
  const [topicForms, setTopicForms] = useState({});
  const [topicSubmitting, setTopicSubmitting] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/courses/?user_id=${USER_ID}`);
      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();
      setCourses(data);
      const topicMap = {};
      await Promise.all(
        data.map(async (course) => {
          const tr = await fetch(`${API_BASE_URL}/topics/?course_id=${course.id}`);
          topicMap[course.id] = tr.ok ? await tr.json() : [];
        })
      );
      setTopics(topicMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.name.trim()) return;
    setCourseSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/courses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID, name: courseForm.name.trim(), color: courseForm.color }),
      });
      if (!res.ok) throw new Error('Failed to create course');
      setCourseForm({ name: '', color: '#6366f1' });
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
      const res = await fetch(`${API_BASE_URL}/topics/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const toggleTopicForm = (courseId) => {
    setExpandedTopic(prev => prev === courseId ? null : courseId);
    setTopicForms(prev => ({ ...prev, [courseId]: prev[courseId] || { name: '', description: '' } }));
  };

  if (loading) {
    return <p className="text-gray-400">Loading courses…</p>;
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Courses</h1>
        <button
          onClick={() => setShowAddCourse(v => !v)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showAddCourse ? 'Cancel' : '+ Add Course'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Add course form */}
      {showAddCourse && (
        <form
          onSubmit={handleAddCourse}
          className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-xl flex flex-col gap-3"
        >
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">New Course</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Course name"
              value={courseForm.name}
              onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <label className="flex items-center gap-2 text-sm text-gray-400">
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {courseSubmitting ? 'Saving…' : 'Save Course'}
            </button>
          </div>
        </form>
      )}

      {/* Course grid */}
      {courses.length === 0 ? (
        <p className="text-gray-500 text-sm">No courses yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {courses.map(course => {
            const courseTopics = topics[course.id] || [];
            const isExpanded = expandedTopic === course.id;
            const topicForm = topicForms[course.id] || { name: '', description: '' };

            return (
              <div
                key={course.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3"
              >
                {/* Course header */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: course.color }}
                  />
                  <span className="font-semibold text-white text-sm">{course.name}</span>
                </div>

                {/* Topics list */}
                {courseTopics.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {courseTopics.map(topic => (
                      <li key={topic.id} className="flex flex-col px-2 py-1.5 bg-gray-900 rounded-lg">
                        <span className="text-sm text-gray-200">{topic.name}</span>
                        {topic.description && (
                          <span className="text-xs text-gray-500 mt-0.5">{topic.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add topic inline form */}
                {isExpanded && (
                  <form
                    onSubmit={e => handleAddTopic(e, course.id)}
                    className="flex flex-col gap-2 pt-1 border-t border-gray-700"
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
                      className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
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
                      className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedTopic(null)}
                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={topicSubmitting === course.id}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
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
                    className="text-xs text-indigo-400 hover:text-indigo-300 text-left transition-colors"
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

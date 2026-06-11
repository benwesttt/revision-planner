import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import WeeklyPlan from './pages/WeeklyPlan';
import Courses from './pages/Courses';
import LogSession from './pages/LogSession';
import Timetable from './pages/Timetable';
import Assessments from './pages/Assessments';
import Resources from './pages/Resources';
import Onboarding from './pages/Onboarding';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

function AuthGuard({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) return <div className="min-h-screen bg-gray-950" />;
  if (!isSignedIn) return null;

  return children;
}

function OnboardingGuard({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname !== '/onboarding' && !localStorage.getItem('onboarding_complete')) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate, pathname]);

  return children;
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <TopBar onMenuToggle={() => setSidebarOpen(v => !v)} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/weekly-plan" element={<WeeklyPlan />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/log-session" element={<LogSession />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/resources" element={<Resources />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <OnboardingGuard>
                <Routes>
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/*" element={<AppShell />} />
                </Routes>
              </OnboardingGuard>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

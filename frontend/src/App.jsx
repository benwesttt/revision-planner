import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import WeeklyPlan from './pages/WeeklyPlan';
import Courses from './pages/Courses';
import LogSession from './pages/LogSession';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/weekly-plan" element={<WeeklyPlan />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/log-session" element={<LogSession />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

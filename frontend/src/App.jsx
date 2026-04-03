import { Suspense, lazy } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useGeoPulseData } from './app/useGeoPulseData';

const LiveDeskPage = lazy(() => import('./pages/LiveDeskPage'));
const ValidationLabPage = lazy(() => import('./pages/ValidationLabPage'));
const ExplainStudioPage = lazy(() => import('./pages/ExplainStudioPage'));

export default function App() {
  const data = useGeoPulseData();

  return (
    <div className="relative min-h-screen bg-bg-primary">
      <Suspense
        fallback={
          <div className="min-h-screen bg-bg-primary flex items-center justify-center">
            <div className="text-text-secondary">Loading page...</div>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/live" replace />} />
          <Route path="/live" element={<LiveDeskPage data={data} />} />
          <Route path="/validation" element={<ValidationLabPage data={data} />} />
          <Route path="/explain" element={<ExplainStudioPage data={data} />} />
          <Route path="*" element={<Navigate to="/live" replace />} />
        </Routes>
      </Suspense>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120] px-1 py-1 rounded-xl border border-gray-700 bg-bg-card/90 backdrop-blur-sm flex items-center gap-1">
        <NavLink
          to="/live"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg text-xs transition-colors ${
              isActive ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:text-white'
            }`
          }
        >
          Live Desk
        </NavLink>
        <NavLink
          to="/validation"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg text-xs transition-colors ${
              isActive ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:text-white'
            }`
          }
        >
          Validation Lab
        </NavLink>
        <NavLink
          to="/explain"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg text-xs transition-colors ${
              isActive ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:text-white'
            }`
          }
        >
          Explain Studio
        </NavLink>
      </div>
    </div>
  );
}

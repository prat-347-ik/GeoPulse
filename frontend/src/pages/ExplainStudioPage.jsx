import { useEffect, useState } from 'react';
import ReasoningChainVisualizer from '../components/ReasoningChainVisualizer';
import { fetchEventExplanation } from '../lib/api';
import { selectRecentEvents } from '../app/selectors';

export default function ExplainStudioPage({ data }) {
  const { events, activeEventId, setActiveEventId, wsConnected } = data;
  const [explanationData, setExplanationData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeEventId) {
      return;
    }

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const detail = await fetchEventExplanation(activeEventId);
        if (isMounted) {
          setExplanationData(detail);
        }
      } catch (error) {
        console.error('Failed to load explanation:', error);
        if (isMounted) {
          setExplanationData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [activeEventId]);

  const list = selectRecentEvents(events, 20);

  return (
    <div className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-8 py-6">
      <div className="max-w-[1920px] mx-auto">
        <div className="bg-bg-card-alt border border-gray-800 rounded-card p-4 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Explain Studio</h1>
            <p className="text-sm text-text-secondary">Deep dive into event reasoning chains from backend explain endpoint.</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${wsConnected ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'}`}>
            {wsConnected ? 'Realtime Connected' : 'Realtime Disconnected'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 bg-bg-card-alt border border-gray-800 rounded-card p-3 max-h-[calc(100vh-180px)] overflow-y-auto">
            <h2 className="text-sm font-semibold text-white mb-3">Recent Events</h2>
            <div className="space-y-2">
              {list.map((event) => (
                <button
                  key={event.event_id}
                  onClick={() => setActiveEventId(event.event_id)}
                  className={`w-full text-left p-2 rounded-lg border transition-colors ${
                    activeEventId === event.event_id
                      ? 'bg-accent-blue/20 border-accent-blue text-white'
                      : 'bg-bg-card border-gray-800 text-text-secondary hover:text-white hover:border-gray-700'
                  }`}
                >
                  <div className="text-xs font-semibold line-clamp-2">{event.headline}</div>
                  <div className="text-[11px] mt-1 opacity-80">{event.event_type || 'Unknown type'}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-9 bg-bg-card-alt border border-gray-800 rounded-card p-4">
            {loading && (
              <div className="h-[60vh] flex items-center justify-center text-text-secondary">Loading explanation...</div>
            )}

            {!loading && !explanationData && (
              <div className="h-[60vh] flex items-center justify-center text-text-secondary">Select an event to view explanation chain.</div>
            )}

            {!loading && explanationData && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">{explanationData.headline}</h2>
                <div className="bg-bg-card border border-gray-800 rounded-lg overflow-hidden" style={{ height: '520px' }}>
                  <ReasoningChainVisualizer reasoningData={explanationData} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

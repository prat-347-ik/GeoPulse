import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import TopBar from './components/TopBar';
import EventFeed from './components/EventFeed';
import ImpactCard from './components/ImpactCard';
import RippleGraph from './components/RippleGraph';
import ValidationPanel from './components/ValidationPanel';
import { AssetModal } from './components/AssetCard';
import BackendControlPanel from './components/BackendControlPanel';
import RightPanel, { MobileRightPanel } from './components/RightPanel';
import {
  getEvents,
  getValidations,
  connectWebSocket,
  fetchEvent,
  fetchPrice,
  validateEvent,
  analyzeNews,
  simulateScenario,
  getHealth,
  getLlmHealth,
  getServiceInfo,
} from './lib/api';

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[120] w-[min(92vw,360px)] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm ${
              toast.type === 'success'
                ? 'bg-accent-green/20 border-accent-green/40 text-accent-green'
                : toast.type === 'error'
                  ? 'bg-accent-red/20 border-accent-red/40 text-accent-red'
                  : 'bg-accent-blue/20 border-accent-blue/40 text-accent-blue'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-white">{toast.title}</p>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-xs text-text-secondary hover:text-white"
                aria-label="Dismiss notification"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs mt-1 text-text-secondary">{toast.message}</p>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [demoMode, setDemoMode] = useState(true);
  const [events, setEvents] = useState([]);
  const [validations, setValidations] = useState([]);
  const [activeEventId, setActiveEventId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileActiveTab, setMobileActiveTab] = useState('dashboard');
  const [backendHealth, setBackendHealth] = useState(null);
  const [llmHealth, setLlmHealth] = useState(null);
  const [serviceInfo, setServiceInfo] = useState(null);
  const [priceDataByTicker, setPriceDataByTicker] = useState({});
  const [healthPollMs, setHealthPollMs] = useState(15000);
  const [llmPollMs, setLlmPollMs] = useState(30000);
  const [toasts, setToasts] = useState([]);
  const [backendActions, setBackendActions] = useState([]);
  const [liveWsMessage, setLiveWsMessage] = useState(null);

  const pushToast = useCallback((type, title, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const recordBackendAction = useCallback((actionType, ok, details) => {
    setBackendActions((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        actionType,
        status: ok ? 'success' : 'error',
        details,
        at: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 25));
  }, []);

  const buildValidationRowsFromEvent = useCallback((eventPayload) => {
    if (!eventPayload || !Array.isArray(eventPayload.affected_assets)) {
      return [];
    }

    return eventPayload.affected_assets
      .filter((asset) => asset && asset.validation_status)
      .map((asset) => ({
        event_id: eventPayload.event_id,
        headline: eventPayload.headline || '',
        predicted_direction: asset.prediction || 'NEUTRAL',
        predicted_ticker: asset.ticker || '',
        predicted_confidence: asset.confidence ?? 0.5,
        predicted_move_percent: asset.predicted_move_percent ?? null,
        horizon: '1d',
        price_at_event: 0.0,
        price_at_validation: 0.0,
        actual_change_percent: asset.actual_move_24h ?? asset.actual_move_pct ?? 0,
        actual_move_24h: asset.actual_move_24h ?? asset.actual_move_pct ?? null,
        status: asset.validation_status,
        validated_at: asset.validated_at,
      }));
  }, []);

  // Get active event object
  const activeEvent = events.find((e) => e.event_id === activeEventId) || null;

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Close right panel when switching to mobile
      if (mobile) {
        setRightPanelExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [evts, vals, health, llm, service] = await Promise.all([
        getEvents(50),
        getValidations(20),
        getHealth(),
        getLlmHealth(),
        getServiceInfo(),
      ]);
      setEvents(evts);
      setValidations(vals);
      setBackendHealth(health);
      setLlmHealth(llm);
      setServiceInfo(service);
      if (evts.length > 0 && !activeEventId) {
        setActiveEventId(evts[0].event_id);
      }
    } catch (error) {
      console.error('Failed to load data from API:', error);
      setEvents([]);
      setValidations([]);
    } finally {
      setLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    loadData();
  }, [activeEventId]);

  const refreshBackendHealth = useCallback(async () => {
    const health = await getHealth();
    setBackendHealth(health);
  }, []);

  const refreshLlmHealth = useCallback(async () => {
    const llm = await getLlmHealth();
    setLlmHealth(llm);
  }, []);

  useEffect(() => {
    refreshBackendHealth();
    const timer = setInterval(refreshBackendHealth, healthPollMs);
    return () => clearInterval(timer);
  }, [refreshBackendHealth, healthPollMs]);

  useEffect(() => {
    refreshLlmHealth();
    const timer = setInterval(refreshLlmHealth, llmPollMs);
    return () => clearInterval(timer);
  }, [refreshLlmHealth, llmPollMs]);

  // WebSocket connection for real-time events
  useEffect(() => {
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;

    const connect = () => {
      try {
        ws = connectWebSocket();

        ws.onopen = () => {
          console.log('✅ WebSocket connected for real-time events');
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            setLiveWsMessage(message);

            if (message.type === 'new_event' && message.event) {
              setEvents((prevEvents) => {
                if (prevEvents.find((e) => e.event_id === message.event.event_id)) {
                  return prevEvents;
                }
                return [message.event, ...prevEvents];
              });

              const rows = buildValidationRowsFromEvent(message.event);
              if (rows.length > 0) {
                setValidations((prev) => {
                  const rest = prev.filter((v) => v.event_id !== message.event.event_id);
                  return [...rows, ...rest].slice(0, 100);
                });
              }

              console.log('📡 New event received via WebSocket:', message.event.headline);
            } else if (message.type === 'validation_update' && message.event) {
              setEvents((prevEvents) => {
                const withoutCurrent = prevEvents.filter((e) => e.event_id !== message.event.event_id);
                return [message.event, ...withoutCurrent];
              });

              const rows = buildValidationRowsFromEvent(message.event);
              setValidations((prev) => {
                const rest = prev.filter((v) => v.event_id !== message.event.event_id);
                return [...rows, ...rest].slice(0, 100);
              });

              console.log('✅ Validation update received via WebSocket:', message.event.event_id);
            } else if (message.type === 'status') {
              console.log('📊 Server status:', message.message);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('⚠️ WebSocket disconnected');
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
            setTimeout(connect, reconnectDelay);
          }
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [buildValidationRowsFromEvent]);

  const handleRefresh = () => {
    loadData();
  };

  const handleSelectEvent = (eventId) => {
    setActiveEventId(eventId);
  };

  const handleAssetClick = async (asset) => {
    setSelectedAsset(asset);
    if (!asset?.ticker || priceDataByTicker[asset.ticker]) {
      return;
    }

    try {
      const prices = await fetchPrice(asset.ticker, '1d');
      setPriceDataByTicker((prev) => ({ ...prev, [asset.ticker]: prices }));
    } catch (error) {
      console.error(`Failed to load price data for ${asset.ticker}:`, error);
    }
  };

  const handleCloseModal = () => {
    setSelectedAsset(null);
  };

  const handleOpenRightPanel = () => {
    setRightPanelExpanded(true);
  };

  const refreshSelectedEvent = useCallback(async () => {
    if (!activeEventId) {
      return;
    }
    try {
      const latest = await fetchEvent(activeEventId);
      setEvents((prev) => prev.map((evt) => (evt.event_id === activeEventId ? latest : evt)));
    } catch (error) {
      console.error(`Failed to refresh event ${activeEventId}:`, error);
    }
  }, [activeEventId]);

  useEffect(() => {
    refreshSelectedEvent();
  }, [refreshSelectedEvent]);

  const handleValidateActiveEvent = async () => {
    if (!activeEventId) {
      return false;
    }
    setActionBusy(true);
    try {
      await validateEvent(activeEventId, '1h');
      await loadData();
      pushToast('success', 'Validation Complete', 'Validation finished and data was refreshed.');
      recordBackendAction('validate', true, `Validated ${activeEventId}`);
      return true;
    } catch (error) {
      console.error('Validation failed:', error);
      pushToast('error', 'Validation Failed', 'Could not validate the selected event.');
      recordBackendAction('validate', false, error?.message || 'Unknown validation error');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleAnalyzeHeadline = async (headline) => {
    setActionBusy(true);
    try {
      const created = await analyzeNews({
        headline,
        text: headline,
        source: 'Frontend Control Panel',
      });
      if (created?.event_id) {
        setEvents((prev) => [created, ...prev]);
        setActiveEventId(created.event_id);
      }
      await loadData();
      pushToast('success', 'Analyze Complete', 'A new event was generated from the headline.');
      recordBackendAction('analyze', true, headline);
      return true;
    } catch (error) {
      console.error('Analyze failed:', error);
      pushToast('error', 'Analyze Failed', 'The analyze request did not complete successfully.');
      recordBackendAction('analyze', false, error?.message || 'Unknown analyze error');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleSimulateScenario = async (scenario) => {
    setActionBusy(true);
    try {
      const result = await simulateScenario(scenario);
      if (result) {
        pushToast('success', 'Simulation Complete', 'Scenario simulation completed successfully.');
        recordBackendAction('simulate', true, scenario);
      } else {
        pushToast('error', 'Simulation Failed', 'Scenario simulation did not return data.');
        recordBackendAction('simulate', false, 'Empty simulate response');
      }
      return Boolean(result);
    } catch (error) {
      console.error('Simulate failed:', error);
      pushToast('error', 'Simulation Failed', 'The simulate request failed.');
      recordBackendAction('simulate', false, error?.message || 'Unknown simulate error');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  // Calculate events per minute (mock value for demo)
  const eventsPerMin = demoMode ? 12 : Math.floor(events.length / 5) || 1;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Top Bar */}
      <TopBar
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        onRefresh={handleRefresh}
        eventsPerMin={eventsPerMin}
        onOpenRightPanel={handleOpenRightPanel}
        backendHealthy={Boolean(backendHealth)}
        llmHealthy={Boolean(llmHealth?.ollama_reachable && llmHealth?.model_found)}
        serviceVersion={serviceInfo?.version || 'unknown'}
      />

      {/* Main Content */}
      <main 
        className={`pt-16 pb-8 px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto transition-all duration-300 ${
          rightPanelExpanded && !isMobile ? 'pr-80' : ''
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-text-secondary">Loading GeoPulse AI...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
              {/* Left Column: Event Feed */}
              <div className="lg:col-span-3 bg-bg-card-alt border border-gray-800 rounded-card p-4 lg:h-[calc(100vh-180px)] lg:sticky lg:top-20">
                <EventFeed
                  events={events}
                  activeEventId={activeEventId}
                  onSelectEvent={handleSelectEvent}
                />
              </div>

              {/* Right Column: Impact Analysis */}
              <div className="lg:col-span-9 space-y-6">
                {/* Impact Card */}
                <div className="bg-bg-card-alt border border-gray-800 rounded-card p-6">
                  <ImpactCard
                    event={activeEvent}
                    onAssetClick={handleAssetClick}
                  />
                </div>

                {/* Ripple Graph */}
                {activeEvent && (
                  <RippleGraph
                    event={activeEvent}
                    logicChain={activeEvent.logic_chain}
                    severity={activeEvent.severity}
                  />
                )}
              </div>
            </div>

            {/* Bottom Row: Validation Panel */}
            <div className="bg-bg-card-alt border border-gray-800 rounded-card p-6">
              <ValidationPanel
                validations={validations}
                demoMode={demoMode}
              />
            </div>

            {/* Backend Control Panel */}
            <BackendControlPanel
              activeEvent={activeEvent}
              backendHealth={backendHealth}
              llmHealth={llmHealth}
              onValidateActive={handleValidateActiveEvent}
              onAnalyzeHeadline={handleAnalyzeHeadline}
              onSimulateScenario={handleSimulateScenario}
              healthPollMs={healthPollMs}
              llmPollMs={llmPollMs}
              onSetHealthPollMs={setHealthPollMs}
              onSetLlmPollMs={setLlmPollMs}
              busy={actionBusy}
            />
          </div>
        )}
      </main>

      {/* Right Panel - Desktop */}
      {!isMobile && (
        <RightPanel
          isExpanded={rightPanelExpanded}
          setIsExpanded={setRightPanelExpanded}
          events={events}
          validations={validations}
          backendActions={backendActions}
          liveMessage={liveWsMessage}
        />
      )}

      {/* Right Panel - Mobile */}
      {isMobile && (
        <MobileRightPanel
          isExpanded={rightPanelExpanded}
          setIsExpanded={setRightPanelExpanded}
          activeTab={mobileActiveTab}
          setActiveTab={setMobileActiveTab}
          events={events}
          validations={validations}
          backendActions={backendActions}
          liveMessage={liveWsMessage}
        />
      )}

      {/* Asset Modal */}
      <AnimatePresence>
        {selectedAsset && (
          <AssetModal
            asset={selectedAsset}
            onClose={handleCloseModal}
            priceData={selectedAsset ? priceDataByTicker[selectedAsset.ticker] : null}
          />
        )}
      </AnimatePresence>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

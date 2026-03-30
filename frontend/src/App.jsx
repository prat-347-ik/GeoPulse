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

            if (message.type === 'new_event' && message.event) {
              setEvents((prevEvents) => {
                if (prevEvents.find((e) => e.event_id === message.event.event_id)) {
                  return prevEvents;
                }
                return [message.event, ...prevEvents];
              });
              console.log('📡 New event received via WebSocket:', message.event.headline);
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
  }, []);

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
      return true;
    } catch (error) {
      console.error('Validation failed:', error);
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
      return true;
    } catch (error) {
      console.error('Analyze failed:', error);
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleSimulateScenario = async (scenario) => {
    setActionBusy(true);
    try {
      const result = await simulateScenario(scenario);
      return Boolean(result);
    } catch (error) {
      console.error('Simulate failed:', error);
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
        />
      )}

      {/* Right Panel - Mobile */}
      {isMobile && (
        <MobileRightPanel
          isExpanded={rightPanelExpanded}
          setIsExpanded={setRightPanelExpanded}
          activeTab={mobileActiveTab}
          setActiveTab={setMobileActiveTab}
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
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import TopBar from './components/TopBar';
import EventFeed from './components/EventFeed';
import ImpactCard from './components/ImpactCard';
import RippleGraph from './components/RippleGraph';
import ValidationPanel from './components/ValidationPanel';
import { AssetModal } from './components/AssetCard';
import RightPanel, { MobileRightPanel } from './components/RightPanel';
import { getMockEvents, getMockValidations, fetchEvents, fetchValidations, connectWebSocket } from './lib/api';

export default function App() {
  const [demoMode, setDemoMode] = useState(true);
  const [events, setEvents] = useState([]);
  const [validations, setValidations] = useState([]);
  const [activeEventId, setActiveEventId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileActiveTab, setMobileActiveTab] = useState('dashboard');

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
      if (demoMode) {
        const mockEvts = getMockEvents();
        const mockVals = getMockValidations();
        setEvents(mockEvts);
        setValidations(mockVals);
        if (mockEvts.length > 0 && !activeEventId) {
          setActiveEventId(mockEvts[0].event_id);
        }
      } else {
        const [evts, vals] = await Promise.all([fetchEvents(), fetchValidations()]);
        setEvents(evts);
        setValidations(vals);
        if (evts.length > 0 && !activeEventId) {
          setActiveEventId(evts[0].event_id);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // Fallback to mock
      const mockEvts = getMockEvents();
      const mockVals = getMockValidations();
      setEvents(mockEvts);
      setValidations(mockVals);
      if (mockEvts.length > 0) {
        setActiveEventId(mockEvts[0].event_id);
      }
    } finally {
      setLoading(false);
    }
  }, [demoMode, activeEventId]);

  useEffect(() => {
    loadData();
  }, [demoMode]);

  // WebSocket connection for real-time events
  useEffect(() => {
    if (demoMode) return;

    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds

    const connect = () => {
      try {
        ws = connectWebSocket();

        ws.onopen = () => {
          console.log('✅ WebSocket connected for real-time events');
          reconnectAttempts = 0; // Reset reconnect counter on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'new_event' && message.event) {
              // Prepend new event to the beginning of the events array
              setEvents((prevEvents) => {
                // Avoid duplicates
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
          console.log('⚠️  WebSocket disconnected');
          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts && !demoMode) {
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
  }, [demoMode]);

  const handleRefresh = () => {
    loadData();
  };

  const handleSelectEvent = (eventId) => {
    setActiveEventId(eventId);
  };

  const handleAssetClick = (asset) => {
    setSelectedAsset(asset);
  };

  const handleCloseModal = () => {
    setSelectedAsset(null);
  };

  const handleOpenRightPanel = () => {
    setRightPanelExpanded(true);
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}

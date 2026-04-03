import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import TopBar from '../components/TopBar';
import EventFeed from '../components/EventFeed';
import ImpactCard from '../components/ImpactCard';
import RippleGraph from '../components/RippleGraph';
import ValidationPanel from '../components/ValidationPanel';
import { AssetModal } from '../components/AssetCard';
import RightPanel, { MobileRightPanel } from '../components/RightPanel';

export default function LiveDeskPage({ data }) {
  const {
    events,
    validations,
    activeEvent,
    activeEventId,
    setActiveEventId,
    loading,
    refreshAll,
    fetchPriceForTicker,
    priceDataByTicker,
    liveWsMessage,
  } = data;

  const [demoMode, setDemoMode] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileActiveTab, setMobileActiveTab] = useState('dashboard');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setRightPanelExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAssetClick = async (asset) => {
    setSelectedAsset(asset);
    if (!asset?.ticker) {
      return;
    }
    await fetchPriceForTicker(asset.ticker);
  };

  const eventsPerMin = demoMode ? 12 : Math.floor(events.length / 5) || 1;

  return (
    <div className="min-h-screen bg-bg-primary">
      <TopBar
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        onRefresh={refreshAll}
        eventsPerMin={eventsPerMin}
        onOpenRightPanel={() => setRightPanelExpanded(true)}
      />

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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
              <div className="lg:col-span-3 bg-bg-card-alt border border-gray-800 rounded-card p-4 lg:h-[calc(100vh-180px)] lg:sticky lg:top-20">
                <EventFeed
                  events={events}
                  activeEventId={activeEventId}
                  onSelectEvent={setActiveEventId}
                />
              </div>

              <div className="lg:col-span-9 space-y-6">
                <div className="bg-bg-card-alt border border-gray-800 rounded-card p-6">
                  <ImpactCard
                    event={activeEvent}
                    onAssetClick={handleAssetClick}
                  />
                </div>

                {activeEvent && (
                  <RippleGraph
                    event={activeEvent}
                    logicChain={activeEvent.logic_chain}
                    severity={activeEvent.severity}
                  />
                )}
              </div>
            </div>

            <div className="bg-bg-card-alt border border-gray-800 rounded-card p-6">
              <ValidationPanel
                validations={validations}
                demoMode={demoMode}
              />
            </div>
          </div>
        )}
      </main>

      {!isMobile && (
        <RightPanel
          isExpanded={rightPanelExpanded}
          setIsExpanded={setRightPanelExpanded}
          events={events}
          validations={validations}
          liveMessage={liveWsMessage}
        />
      )}

      {isMobile && (
        <MobileRightPanel
          isExpanded={rightPanelExpanded}
          setIsExpanded={setRightPanelExpanded}
          activeTab={mobileActiveTab}
          setActiveTab={setMobileActiveTab}
          events={events}
          validations={validations}
          liveMessage={liveWsMessage}
        />
      )}

      <AnimatePresence>
        {selectedAsset && (
          <AssetModal
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
            priceData={selectedAsset ? priceDataByTicker[selectedAsset.ticker] : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

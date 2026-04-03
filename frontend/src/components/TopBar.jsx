import { Activity, RefreshCw, User, Zap, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TopBar({
  demoMode,
  setDemoMode,
  onRefresh,
  eventsPerMin = 12,
  onOpenRightPanel,
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary border-b border-gray-800 px-6 py-3">
      <div className="flex items-center justify-between max-w-[1920px] mx-auto">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-white">GeoPulse AI</span>
        </div>

        {/* Center: Live Status */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2.5 h-2.5 bg-accent-green rounded-full"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-sm font-medium text-white">LIVE</span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Activity className="w-4 h-4" />
            <span>{eventsPerMin} events/min</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-4">
          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              demoMode
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50'
                : 'bg-gray-800 text-text-secondary hover:text-white'
            }`}
          >
            {demoMode ? 'Demo Mode' : 'Live Mode'}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-md bg-gray-800 text-text-secondary hover:text-white transition-colors"
            aria-label="Refresh events"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Right Panel Toggle */}
          <button
            onClick={onOpenRightPanel}
            className="p-2 rounded-md bg-gray-800 text-text-secondary hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-800">
            <User className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">Demo User</span>
          </div>
        </div>
      </div>
    </header>
  );
}

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Compass,
  TrendingUp,
  Heart,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Star,
  BookmarkPlus,
  Bell,
  User,
  Filter,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  X,
  ArrowUpRight,
  Globe,
  Zap,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Eye,
  Share2,
  Bookmark,
  MoreHorizontal,
  Lightbulb,
} from 'lucide-react';
import ReasoningChainVisualizer from './ReasoningChainVisualizer';
import { fetchEventExplanation } from '../lib/api';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'interests', label: 'My Interests', icon: Heart },
  { id: 'predictions', label: 'My Predictions', icon: Target },
  { id: 'explanation', label: 'Explain', icon: Lightbulb },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Mock data for different tabs
const mockTrendingTopics = [
  { label: 'AI Regulation', events: 12, change: '+24%' },
  { label: 'Oil Prices', events: 8, change: '+18%' },
  { label: 'Fed Policy', events: 15, change: '+8%' },
  { label: 'Crypto ETFs', events: 6, change: '+45%' },
  { label: 'China Stimulus', events: 4, change: '+12%' },
];

const mockInterests = [
  { tag: 'Energy', weight: 85, notifications: true },
  { tag: 'Technology', weight: 72, notifications: true },
  { tag: 'Federal Reserve', weight: 68, notifications: false },
  { tag: 'Cryptocurrency', weight: 45, notifications: true },
  { tag: 'Trade Policy', weight: 32, notifications: false },
];

const mockPredictions = [
  { asset: 'XOM', prediction: 'BULLISH', confidence: 92, status: 'ACTIVE', timeLeft: '2h 15m' },
  { asset: 'MSFT', prediction: 'BEARISH', confidence: 65, status: 'PENDING', timeLeft: '8h 45m' },
  { asset: 'BTC', prediction: 'BULLISH', confidence: 78, status: 'ACTIVE', timeLeft: '1d 3h' },
  { asset: 'SPY', prediction: 'BULLISH', confidence: 88, status: 'VALIDATED', accuracy: 'CORRECT' },
];

// Extended mock data for fullscreen views
const extendedTrendingTopics = [
  { label: 'AI Regulation', events: 12, change: '+24%', category: 'Technology', severity: 'HIGH', regions: ['US', 'EU'], description: 'New legislative proposals for AI governance' },
  { label: 'Oil Prices', events: 8, change: '+18%', category: 'Energy', severity: 'HIGH', regions: ['ME', 'US'], description: 'OPEC+ production cuts affecting global markets' },
  { label: 'Fed Policy', events: 15, change: '+8%', category: 'Finance', severity: 'CRITICAL', regions: ['US'], description: 'Federal Reserve interest rate decisions' },
  { label: 'Crypto ETFs', events: 6, change: '+45%', category: 'Crypto', severity: 'MEDIUM', regions: ['US', 'EU'], description: 'Bitcoin ETF approval speculation' },
  { label: 'China Stimulus', events: 4, change: '+12%', category: 'Economy', severity: 'HIGH', regions: ['CN', 'APAC'], description: 'Economic stimulus measures announced' },
  { label: 'Climate Summit', events: 9, change: '+15%', category: 'Environment', severity: 'MEDIUM', regions: ['GLOBAL'], description: 'COP30 negotiations and commitments' },
  { label: 'Tech Layoffs', events: 7, change: '-5%', category: 'Employment', severity: 'MEDIUM', regions: ['US', 'EU'], description: 'Continued workforce reductions in tech sector' },
  { label: 'Bank Earnings', events: 11, change: '+22%', category: 'Finance', severity: 'HIGH', regions: ['US', 'EU'], description: 'Q4 earnings reports from major banks' },
];

const extendedDiscoverTopics = [
  { title: 'European Central Bank Policy', description: 'Based on your interest in monetary policy', match: 92, followers: '12.4K', events24h: 8 },
  { title: 'Renewable Energy Sector', description: 'High activity detected', match: 87, followers: '45.2K', events24h: 15 },
  { title: 'China Trade Relations', description: 'Trending in your region', match: 78, followers: '8.9K', events24h: 6 },
  { title: 'Semiconductor Industry', description: 'Related to your watchlist', match: 85, followers: '32.1K', events24h: 12 },
  { title: 'Healthcare Innovation', description: 'Emerging sector activity', match: 72, followers: '18.7K', events24h: 9 },
  { title: 'Defense Spending', description: 'Geopolitical relevance', match: 68, followers: '6.3K', events24h: 4 },
];

const extendedInterests = [
  { tag: 'Energy', weight: 85, notifications: true, events: 24, predictions: 8, accuracy: 82 },
  { tag: 'Technology', weight: 72, notifications: true, events: 45, predictions: 12, accuracy: 76 },
  { tag: 'Federal Reserve', weight: 68, notifications: false, events: 18, predictions: 5, accuracy: 90 },
  { tag: 'Cryptocurrency', weight: 45, notifications: true, events: 32, predictions: 15, accuracy: 65 },
  { tag: 'Trade Policy', weight: 32, notifications: false, events: 12, predictions: 3, accuracy: 78 },
  { tag: 'Commodities', weight: 58, notifications: true, events: 28, predictions: 7, accuracy: 71 },
  { tag: 'Healthcare', weight: 25, notifications: false, events: 15, predictions: 2, accuracy: 80 },
];

const extendedPredictions = [
  { asset: 'XOM', prediction: 'BULLISH', confidence: 92, status: 'ACTIVE', timeLeft: '2h 15m', entry: '$104.50', target: '$112.00', stopLoss: '$101.00', pnl: '+3.2%' },
  { asset: 'MSFT', prediction: 'BEARISH', confidence: 65, status: 'PENDING', timeLeft: '8h 45m', entry: '$378.00', target: '$365.00', stopLoss: '$385.00', pnl: '0%' },
  { asset: 'BTC', prediction: 'BULLISH', confidence: 78, status: 'ACTIVE', timeLeft: '1d 3h', entry: '$42,500', target: '$48,000', stopLoss: '$40,000', pnl: '+5.8%' },
  { asset: 'SPY', prediction: 'BULLISH', confidence: 88, status: 'VALIDATED', accuracy: 'CORRECT', entry: '$475.00', target: '$490.00', pnl: '+3.7%' },
  { asset: 'NVDA', prediction: 'BULLISH', confidence: 85, status: 'ACTIVE', timeLeft: '4h 30m', entry: '$485.00', target: '$520.00', stopLoss: '$470.00', pnl: '+2.1%' },
  { asset: 'AAPL', prediction: 'BEARISH', confidence: 72, status: 'VALIDATED', accuracy: 'INCORRECT', entry: '$188.00', target: '$175.00', pnl: '-1.5%' },
];

const dashboardStats = {
  totalEvents: 156,
  predictionsAccuracy: 78,
  activePredictions: 12,
  highSeverityAlerts: 3,
  portfolioChange: '+4.2%',
  weeklyPredictions: 24,
  successRate: '18/24',
};

// Fullscreen/Expanded Tab Components
function FullscreenDashboard({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-bg-primary overflow-auto"
    >
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-accent-blue" />
            <h1 className="text-xl font-bold text-white">Dashboard Overview</h1>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-6 h-6 text-text-secondary hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-accent-blue" />
                <span className="text-xs text-text-secondary">Total Events</span>
              </div>
              <p className="text-2xl font-bold text-white">{dashboardStats.totalEvents}</p>
              <p className="text-xs text-accent-green">+12 from yesterday</p>
            </div>
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-accent-green" />
                <span className="text-xs text-text-secondary">Accuracy</span>
              </div>
              <p className="text-2xl font-bold text-accent-green">{dashboardStats.predictionsAccuracy}%</p>
              <p className="text-xs text-text-secondary">Last 7 days</p>
            </div>
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-accent-amber" />
                <span className="text-xs text-text-secondary">Active</span>
              </div>
              <p className="text-2xl font-bold text-white">{dashboardStats.activePredictions}</p>
              <p className="text-xs text-text-secondary">Predictions</p>
            </div>
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-accent-red" />
                <span className="text-xs text-text-secondary">High Severity</span>
              </div>
              <p className="text-2xl font-bold text-accent-red">{dashboardStats.highSeverityAlerts}</p>
              <p className="text-xs text-text-secondary">Alerts</p>
            </div>
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent-green" />
                <span className="text-xs text-text-secondary">Portfolio</span>
              </div>
              <p className="text-2xl font-bold text-accent-green">{dashboardStats.portfolioChange}</p>
              <p className="text-xs text-text-secondary">This week</p>
            </div>
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-accent-blue" />
                <span className="text-xs text-text-secondary">Success Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">{dashboardStats.successRate}</p>
              <p className="text-xs text-text-secondary">This week</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-bg-card rounded-xl border border-gray-800 p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent-blue" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {[
                  { title: 'XOM Prediction Validated', type: 'success', time: '15 min ago', detail: '+2.4% return' },
                  { title: 'Fed Rate Decision Event', type: 'alert', time: '32 min ago', detail: 'HIGH severity' },
                  { title: 'MSFT Alert Triggered', type: 'warning', time: '1h ago', detail: '-1.2% movement' },
                  { title: 'New prediction: NVDA', type: 'info', time: '2h ago', detail: 'BULLISH 85%' },
                  { title: 'BTC target reached', type: 'success', time: '3h ago', detail: '+5.8% return' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.type === 'success' ? 'bg-accent-green' :
                        item.type === 'alert' ? 'bg-accent-red' :
                        item.type === 'warning' ? 'bg-accent-amber' : 'bg-accent-blue'
                      }`} />
                      <div>
                        <p className="text-sm text-white">{item.title}</p>
                        <p className="text-xs text-text-secondary">{item.time}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.type === 'success' ? 'bg-accent-green/20 text-accent-green' :
                      item.type === 'alert' ? 'bg-accent-red/20 text-accent-red' :
                      item.type === 'warning' ? 'bg-accent-amber/20 text-accent-amber' : 'bg-accent-blue/20 text-accent-blue'
                    }`}>{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Predictions */}
            <div className="bg-bg-card rounded-xl border border-gray-800 p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-accent-amber" />
                Active Predictions
              </h3>
              <div className="space-y-3">
                {extendedPredictions.filter(p => p.status === 'ACTIVE').map((pred, i) => (
                  <div key={i} className="p-4 bg-bg-primary rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-mono text-accent-blue">{pred.asset}</span>
                      <span className={`text-sm font-semibold ${pred.prediction === 'BULLISH' ? 'text-accent-green' : 'text-accent-red'}`}>
                        {pred.prediction === 'BULLISH' ? '↑' : '↓'} {pred.prediction}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-text-secondary">Entry</span>
                        <p className="text-white">{pred.entry}</p>
                      </div>
                      <div>
                        <span className="text-text-secondary">Target</span>
                        <p className="text-accent-green">{pred.target}</p>
                      </div>
                      <div>
                        <span className="text-text-secondary">P&L</span>
                        <p className={pred.pnl.startsWith('+') ? 'text-accent-green' : 'text-accent-red'}>{pred.pnl}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <Clock className="w-3 h-3" />
                        {pred.timeLeft}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-text-secondary">{pred.confidence}%</span>
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-blue rounded-full" style={{ width: `${pred.confidence}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-accent-blue/20 text-accent-blue rounded-xl text-left hover:bg-accent-blue/30 transition-colors">
              <Zap className="w-5 h-5 mb-2" />
              <span className="font-medium">Create Alert</span>
            </button>
            <button className="p-4 bg-bg-card text-white rounded-xl text-left hover:bg-gray-800 transition-colors border border-gray-800">
              <BarChart3 className="w-5 h-5 mb-2" />
              <span className="font-medium">View Analytics</span>
            </button>
            <button className="p-4 bg-bg-card text-white rounded-xl text-left hover:bg-gray-800 transition-colors border border-gray-800">
              <Share2 className="w-5 h-5 mb-2" />
              <span className="font-medium">Export Report</span>
            </button>
            <button className="p-4 bg-bg-card text-white rounded-xl text-left hover:bg-gray-800 transition-colors border border-gray-800">
              <Target className="w-5 h-5 mb-2" />
              <span className="font-medium">New Prediction</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FullscreenDiscover({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-bg-primary overflow-auto"
    >
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Compass className="w-6 h-6 text-accent-blue" />
            <h1 className="text-xl font-bold text-white">Discover Topics</h1>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-6 h-6 text-text-secondary hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Search/Filter Bar */}
          <div className="flex gap-4 flex-wrap">
            <input 
              type="text" 
              placeholder="Search topics..." 
              className="flex-1 min-w-64 px-4 py-2 bg-bg-card border border-gray-700 rounded-lg text-white placeholder-text-secondary focus:outline-none focus:border-accent-blue"
            />
            <button className="px-4 py-2 bg-bg-card border border-gray-700 rounded-lg text-text-secondary hover:text-white transition-colors flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Recommended Topics Grid */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-amber" />
              Recommended for You
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {extendedDiscoverTopics.map((topic, i) => (
                <div key={i} className="p-5 bg-bg-card rounded-xl border border-gray-800 hover:border-accent-blue/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-medium text-white">{topic.title}</h4>
                    <span className="text-xs px-2 py-1 bg-accent-blue/20 text-accent-blue rounded">{topic.match}% match</span>
                  </div>
                  <p className="text-sm text-text-secondary mb-4">{topic.description}</p>
                  <div className="flex items-center justify-between text-xs text-text-secondary mb-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {topic.followers} followers
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {topic.events24h} events/24h
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/80 transition-colors">
                      + Follow
                    </button>
                    <button className="p-2 bg-bg-primary rounded-lg hover:bg-gray-700 transition-colors">
                      <Bookmark className="w-4 h-4 text-text-secondary" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Browse by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {['Technology', 'Finance', 'Energy', 'Crypto', 'Politics', 'Healthcare', 'Commodities', 'Trade', 'Environment', 'Employment', 'Real Estate', 'Defense'].map((cat, i) => (
                <button key={i} className="p-4 bg-bg-card rounded-xl border border-gray-800 text-center hover:border-accent-blue/50 transition-colors">
                  <Globe className="w-5 h-5 mx-auto mb-2 text-accent-blue" />
                  <span className="text-sm text-white">{cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FullscreenTrending({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-bg-primary overflow-auto"
    >
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-accent-green" />
            <h1 className="text-xl font-bold text-white">Trending Topics</h1>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-3 py-2 bg-bg-card border border-gray-700 rounded-lg text-white text-sm">
              <option>Last 24 hours</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-6 h-6 text-text-secondary hover:text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats Banner */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-accent-green/20 to-transparent rounded-xl border border-accent-green/30">
              <p className="text-2xl font-bold text-accent-green">+18%</p>
              <p className="text-sm text-text-secondary">Average momentum</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-accent-blue/20 to-transparent rounded-xl border border-accent-blue/30">
              <p className="text-2xl font-bold text-accent-blue">67</p>
              <p className="text-sm text-text-secondary">Active topics</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-accent-amber/20 to-transparent rounded-xl border border-accent-amber/30">
              <p className="text-2xl font-bold text-accent-amber">12</p>
              <p className="text-sm text-text-secondary">New today</p>
            </div>
          </div>

          {/* Trending Table */}
          <div className="bg-bg-card rounded-xl border border-gray-800 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-800 text-xs text-text-secondary uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Topic</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Regions</div>
              <div className="col-span-1">Events</div>
              <div className="col-span-1">Severity</div>
              <div className="col-span-2 text-right">Change</div>
            </div>
            {extendedTrendingTopics.map((topic, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors items-center">
                <div className="col-span-1">
                  <span className="text-lg font-bold text-text-secondary">{index + 1}</span>
                </div>
                <div className="col-span-3">
                  <p className="text-white font-medium">{topic.label}</p>
                  <p className="text-xs text-text-secondary">{topic.description}</p>
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-1 bg-bg-primary rounded text-xs text-text-secondary">{topic.category}</span>
                </div>
                <div className="col-span-2 flex gap-1 flex-wrap">
                  {topic.regions.map((r, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue text-xs rounded">{r}</span>
                  ))}
                </div>
                <div className="col-span-1">
                  <span className="text-white">{topic.events}</span>
                </div>
                <div className="col-span-1">
                  <span className={`px-2 py-1 rounded text-xs ${
                    topic.severity === 'CRITICAL' ? 'bg-accent-red/20 text-accent-red' :
                    topic.severity === 'HIGH' ? 'bg-accent-amber/20 text-accent-amber' : 'bg-accent-blue/20 text-accent-blue'
                  }`}>{topic.severity}</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className={`text-lg font-semibold ${topic.change.startsWith('+') ? 'text-accent-green' : 'text-accent-red'}`}>
                    {topic.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FullscreenInterests({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-bg-primary overflow-auto"
    >
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-accent-red" />
            <h1 className="text-xl font-bold text-white">My Interests</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/80 transition-colors">
              + Add Interest
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-6 h-6 text-text-secondary hover:text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Interest Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extendedInterests.map((interest, i) => (
              <div key={i} className="p-5 bg-bg-card rounded-xl border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-white">{interest.tag}</h4>
                  <div className="flex items-center gap-2">
                    <button className={`p-2 rounded-lg transition-colors ${interest.notifications ? 'bg-accent-blue/20 text-accent-blue' : 'bg-gray-700 text-text-secondary'}`}>
                      <Bell className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-gray-700 text-text-secondary hover:text-white transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Weight Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-secondary">Interest Weight</span>
                    <span className="text-xs text-accent-blue">{interest.weight}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-blue rounded-full" style={{ width: `${interest.weight}%` }} />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-700">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{interest.events}</p>
                    <p className="text-xs text-text-secondary">Events</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{interest.predictions}</p>
                    <p className="text-xs text-text-secondary">Predictions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-accent-green">{interest.accuracy}%</p>
                    <p className="text-xs text-text-secondary">Accuracy</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Suggested Interests */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Suggested Interests</h3>
            <div className="flex flex-wrap gap-3">
              {['Artificial Intelligence', 'Electric Vehicles', 'Gold', 'Japanese Yen', 'Interest Rates', 'Supply Chain'].map((tag, i) => (
                <button key={i} className="px-4 py-2 bg-bg-card border border-gray-700 rounded-lg text-text-secondary hover:text-white hover:border-accent-blue/50 transition-colors flex items-center gap-2">
                  <span>{tag}</span>
                  <span className="text-accent-blue">+</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FullscreenPredictions({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-bg-primary overflow-auto"
    >
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-accent-blue" />
            <h1 className="text-xl font-bold text-white">My Predictions</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/80 transition-colors">
              + New Prediction
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-6 h-6 text-text-secondary hover:text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <p className="text-2xl font-bold text-white">{extendedPredictions.filter(p => p.status === 'ACTIVE').length}</p>
              <p className="text-sm text-text-secondary">Active</p>
            </div>
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <p className="text-2xl font-bold text-accent-amber">{extendedPredictions.filter(p => p.status === 'PENDING').length}</p>
              <p className="text-sm text-text-secondary">Pending</p>
            </div>
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <p className="text-2xl font-bold text-accent-green">{extendedPredictions.filter(p => p.accuracy === 'CORRECT').length}</p>
              <p className="text-sm text-text-secondary">Correct</p>
            </div>
            <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
              <p className="text-2xl font-bold text-accent-red">{extendedPredictions.filter(p => p.accuracy === 'INCORRECT').length}</p>
              <p className="text-sm text-text-secondary">Incorrect</p>
            </div>
          </div>

          {/* Predictions Table */}
          <div className="bg-bg-card rounded-xl border border-gray-800 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-800 text-xs text-text-secondary uppercase tracking-wider">
              <div className="col-span-2">Asset</div>
              <div className="col-span-2">Direction</div>
              <div className="col-span-2">Entry</div>
              <div className="col-span-2">Target</div>
              <div className="col-span-1">Confidence</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">P&L</div>
            </div>
            {extendedPredictions.map((pred, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors items-center">
                <div className="col-span-2">
                  <span className="text-lg font-mono text-accent-blue">{pred.asset}</span>
                </div>
                <div className="col-span-2">
                  <span className={`flex items-center gap-1 font-medium ${pred.prediction === 'BULLISH' ? 'text-accent-green' : 'text-accent-red'}`}>
                    {pred.prediction === 'BULLISH' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {pred.prediction}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-white">{pred.entry}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-accent-green">{pred.target}</span>
                </div>
                <div className="col-span-1">
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-blue rounded-full" style={{ width: `${pred.confidence}%` }} />
                    </div>
                    <span className="text-xs text-text-secondary">{pred.confidence}%</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    pred.status === 'ACTIVE' ? 'bg-accent-green/20 text-accent-green' :
                    pred.status === 'PENDING' ? 'bg-accent-amber/20 text-accent-amber' :
                    'bg-accent-blue/20 text-accent-blue'
                  }`}>
                    {pred.status}
                    {pred.timeLeft && <span className="ml-1 opacity-75">• {pred.timeLeft}</span>}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <span className={`text-lg font-semibold ${pred.pnl.startsWith('+') ? 'text-accent-green' : pred.pnl === '0%' ? 'text-text-secondary' : 'text-accent-red'}`}>
                    {pred.pnl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FullscreenExplanation({ onClose, events = [], liveMessage = null }) {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelectEvent = async (eventId) => {
    if (selectedEventId === eventId && explanationData) {
      setSelectedEventId(null);
      setExplanationData(null);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchEventExplanation(eventId);
      setExplanationData(data);
      setSelectedEventId(eventId);
    } catch (error) {
      console.error('Failed to fetch explanation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedEventId || !liveMessage?.event?.event_id) {
      return;
    }
    if (liveMessage.event.event_id !== selectedEventId) {
      return;
    }

    let isMounted = true;
    const refreshReasoning = async () => {
      try {
        const data = await fetchEventExplanation(selectedEventId);
        if (isMounted) {
          setExplanationData(data);
        }
      } catch (error) {
        console.error('Failed to refresh explanation from live update:', error);
      }
    };

    refreshReasoning();
    return () => {
      isMounted = false;
    };
  }, [liveMessage, selectedEventId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-bg-primary overflow-hidden"
    >
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-accent-amber" />
            <h1 className="text-xl font-bold text-white">XAI - Reasoning Chain Explainer</h1>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-6 h-6 text-text-secondary hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Event Selector */}
          <div className="w-80 max-w-sm border-r border-gray-800 flex flex-col bg-bg-card/50">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-3">Events</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.slice(0, 20).map((event) => (
                  <button
                    key={event.event_id}
                    onClick={() => handleSelectEvent(event.event_id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedEventId === event.event_id
                        ? 'bg-accent-amber/20 border border-accent-amber'
                        : 'bg-bg-primary border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white line-clamp-2 mb-1">
                      {event.headline?.substring(0, 60)}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">{event.event_type}</span>
                      <span className="px-2 py-1 bg-accent-blue/20 text-accent-blue rounded text-xs">
                        {Math.round(event.confidence * 100)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visualization Area */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-text-secondary">Loading reasoning chain...</p>
                </div>
              </div>
            ) : selectedEventId && explanationData ? (
              <div className="space-y-4 max-w-6xl">
                {/* Title */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{explanationData.headline}</h2>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">Event Type:</span>
                      <span className="px-3 py-1 bg-accent-blue/20 text-accent-blue rounded-lg text-sm font-semibold">
                        {explanationData.event_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">Confidence:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-green rounded-full transition-all"
                            style={{ width: `${explanationData.confidence * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-accent-green">{Math.round(explanationData.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* React Flow Visualization */}
                <div className="bg-bg-card rounded-xl border border-gray-800 overflow-hidden" style={{ height: '400px' }}>
                  <ReasoningChainVisualizer reasoningData={explanationData} />
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Extraction Details */}
                  <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-accent-amber" />
                      Geopolitical Extraction
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-text-secondary">Trigger Type:</span>
                        <p className="text-white font-semibold">
                          {explanationData.reasoning_chain?.extraction?.trigger_type || 'None'}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-secondary">Regions:</span>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {(explanationData.reasoning_chain?.extraction?.regions || []).map((r, i) => (
                            <span key={i} className="px-2 py-1 bg-accent-blue/20 text-accent-blue rounded text-xs">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-700">
                        <div>
                          <span className="text-text-secondary">Risk Sentiment</span>
                          <p className={`font-semibold ${
                            explanationData.reasoning_chain?.extraction?.risk_sentiment === 'RISK_OFF' ? 'text-accent-red' :
                            explanationData.reasoning_chain?.extraction?.risk_sentiment === 'RISK_ON' ? 'text-accent-green' :
                            'text-text-secondary'
                          }`}>
                            {explanationData.reasoning_chain?.extraction?.risk_sentiment}
                          </p>
                        </div>
                        <div>
                          <span className="text-text-secondary">Safe Haven</span>
                          <p className={`font-semibold ${
                            explanationData.reasoning_chain?.extraction?.safe_haven_demand === 'UP' ? 'text-accent-green' :
                            'text-text-secondary'
                          }`}>
                            {explanationData.reasoning_chain?.extraction?.safe_haven_demand}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reasoning Details */}
                  <div className="p-4 bg-bg-card rounded-xl border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-accent-green" />
                      Second-Order Reasoning
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-text-secondary">Reasoning Strength:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-green rounded-full transition-all"
                              style={{ width: `${Math.min(explanationData.reasoning_chain?.reasoning?.reasoning_strength || 0, 1) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-accent-green">
                            {Math.round((explanationData.reasoning_chain?.reasoning?.reasoning_strength || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                        <span className="text-text-secondary">Second-Order Effects:</span>
                        <div className="mt-2 space-y-1">
                          {(explanationData.reasoning_chain?.reasoning?.second_order_effects || []).map((effect, i) => (
                            <div key={i} className="text-xs text-text-secondary line-clamp-2">• {effect}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asset Predictions */}
                  <div className="p-4 bg-bg-card rounded-xl border border-gray-800 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-accent-blue" />
                      Asset Predictions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(explanationData.reasoning_chain?.output?.asset_predictions || []).map((pred, i) => (
                        <div key={i} className="p-3 bg-bg-primary rounded-lg border border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-accent-blue text-lg">{pred.ticker}</span>
                            <span className={`font-semibold text-xs px-2 py-1 rounded ${
                              pred.prediction === 'BULLISH' ? 'bg-accent-green/20 text-accent-green' :
                              pred.prediction === 'BEARISH' ? 'bg-accent-red/20 text-accent-red' :
                              'bg-gray-700 text-text-secondary'
                            }`}>
                              {pred.prediction === 'BULLISH' ? '↑' : '↓'} {pred.prediction}
                            </span>
                          </div>
                          <div className="text-xs text-text-secondary mb-2">{pred.sector}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent-blue rounded-full"
                                style={{ width: `${pred.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-accent-blue">{Math.round(pred.confidence * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Lightbulb className="w-16 h-16 text-accent-amber/30 mx-auto mb-4" />
                  <p className="text-text-secondary text-lg">Select an event to view its reasoning chain</p>
                  <p className="text-text-secondary/60 text-sm mt-2">Choose from the list on the left to explore the "why"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardTab({ events = [], validations = [], backendActions = [] }) {
  const now = Date.now();
  const recentWindowMs = 24 * 60 * 60 * 1000;
  const eventsLast24h = events.filter((evt) => {
    const t = Date.parse(evt.timestamp || evt.ingested_at || '');
    return Number.isFinite(t) && now - t <= recentWindowMs;
  }).length;

  const resolvedValidations = validations.filter(
    (v) => v.status === 'CORRECT' || v.status === 'INCORRECT',
  );
  const correctCount = resolvedValidations.filter((v) => v.status === 'CORRECT').length;
  const accuracy = resolvedValidations.length
    ? Math.round((correctCount / resolvedValidations.length) * 100)
    : 0;

  const activePredictions = events.reduce((sum, evt) => {
    const assets = Array.isArray(evt.affected_assets) ? evt.affected_assets : [];
    return sum + assets.filter((a) => !a.validation_status).length;
  }, 0);

  const highSeverityAlerts = events.filter((evt) => evt.severity === 'HIGH' || evt.severity === 'CRITICAL').length;

  const recentActivity = backendActions.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-white">Dashboard</h3>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-bg-primary rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3 h-3 text-accent-blue" />
            <span className="text-xs text-text-secondary">Today</span>
          </div>
          <p className="text-lg font-bold text-white">{eventsLast24h}</p>
          <p className="text-xs text-text-secondary">Events (24h)</p>
        </div>
        <div className="p-3 bg-bg-primary rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3 h-3 text-accent-green" />
            <span className="text-xs text-text-secondary">Accuracy</span>
          </div>
          <p className="text-lg font-bold text-accent-green">{accuracy}%</p>
          <p className="text-xs text-text-secondary">From validations</p>
        </div>
        <div className="p-3 bg-bg-primary rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3 h-3 text-accent-amber" />
            <span className="text-xs text-text-secondary">Active</span>
          </div>
          <p className="text-lg font-bold text-white">{activePredictions}</p>
          <p className="text-xs text-text-secondary">Pending assets</p>
        </div>
        <div className="p-3 bg-bg-primary rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-3 h-3 text-accent-red" />
            <span className="text-xs text-text-secondary">Alerts</span>
          </div>
          <p className="text-lg font-bold text-accent-red">{highSeverityAlerts}</p>
          <p className="text-xs text-text-secondary">High Sev</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-2">
        <h4 className="text-xs text-text-secondary uppercase tracking-wider">Recent Activity</h4>
        <div className="space-y-2">
          {recentActivity.length === 0 && (
            <div className="p-3 bg-bg-primary rounded-lg text-xs text-text-secondary">
              Run analyze, simulate, or validate to populate backend activity.
            </div>
          )}
          {recentActivity.map((action) => (
            <div key={action.id} className="p-3 bg-bg-primary rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white capitalize">{action.actionType}</span>
                <span
                  className={`text-xs ${
                    action.status === 'success' ? 'text-accent-green' : 'text-accent-red'
                  }`}
                >
                  {action.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-text-secondary line-clamp-1">{action.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-xs text-text-secondary uppercase tracking-wider">Quick Actions</h4>
        <div className="space-y-2">
          <button className="w-full p-3 bg-accent-blue/20 text-accent-blue rounded-lg text-left text-sm hover:bg-accent-blue/30 transition-colors">
            Create Custom Alert
          </button>
          <button className="w-full p-3 bg-bg-primary text-white rounded-lg text-left text-sm hover:bg-gray-800 transition-colors">
            Export Today's Data
          </button>
          <button className="w-full p-3 bg-bg-primary text-white rounded-lg text-left text-sm hover:bg-gray-800 transition-colors">
            View Full Analytics
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscoverTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-white">Discover</h3>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-xs text-text-secondary uppercase tracking-wider">Recommended for you</h4>
        <div className="space-y-3">
          <div className="p-3 bg-bg-primary rounded-lg">
            <p className="text-sm text-white mb-1">European Central Bank Policy</p>
            <p className="text-xs text-text-secondary mb-2">Based on your interest in monetary policy</p>
            <button className="text-xs text-accent-blue">+ Follow Topic</button>
          </div>
          <div className="p-3 bg-bg-primary rounded-lg">
            <p className="text-sm text-white mb-1">Renewable Energy Sector</p>
            <p className="text-xs text-text-secondary mb-2">High activity detected</p>
            <button className="text-xs text-accent-blue">+ Follow Topic</button>
          </div>
          <div className="p-3 bg-bg-primary rounded-lg">
            <p className="text-sm text-white mb-1">China Trade Relations</p>
            <p className="text-xs text-text-secondary mb-2">Trending in your region</p>
            <button className="text-xs text-accent-blue">+ Follow Topic</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendingTab({ events = [] }) {
  const topicMap = new Map();
  events.forEach((evt) => {
    const key = evt.event_type || evt.market_pressure || 'Unknown';
    const current = topicMap.get(key) || { label: key, events: 0, score: 0 };
    current.events += 1;
    current.score += Number(evt.confidence || 0);
    topicMap.set(key, current);
  });

  const topics = Array.from(topicMap.values())
    .sort((a, b) => b.events - a.events || b.score - a.score)
    .slice(0, 5)
    .map((topic, index) => {
      const prev = index < 4 ? topic.events - 1 : topic.events - 2;
      const change = Math.max(0, Math.round(((topic.events - Math.max(1, prev)) / Math.max(1, prev)) * 100));
      return {
        label: topic.label,
        events: topic.events,
        change: `+${change}%`,
      };
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent-green" />
        <h3 className="text-sm font-semibold text-white">Trending</h3>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-xs text-text-secondary uppercase tracking-wider">Hot Topics</h4>
        <div className="space-y-2">
          {topics.length === 0 && (
            <div className="p-3 bg-bg-primary rounded-lg text-xs text-text-secondary">
              No events yet to derive trending topics.
            </div>
          )}
          {topics.map((topic, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg hover:bg-gray-800 cursor-pointer">
              <div>
                <p className="text-sm text-white">{topic.label}</p>
                <p className="text-xs text-text-secondary">{topic.events} events</p>
              </div>
              <span className="text-xs text-accent-green font-semibold">{topic.change}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InterestsTab({ events = [] }) {
  const sectorMap = new Map();
  events.forEach((evt) => {
    const assets = Array.isArray(evt.affected_assets) ? evt.affected_assets : [];
    assets.forEach((asset) => {
      const tag = asset.sector || 'Uncategorized';
      sectorMap.set(tag, (sectorMap.get(tag) || 0) + 1);
    });
  });
  const maxWeight = Math.max(...Array.from(sectorMap.values()), 1);
  const interests = Array.from(sectorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, score], idx) => ({
      tag,
      weight: Math.round((score / maxWeight) * 100),
      notifications: idx % 2 === 0,
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-accent-red" />
          <h3 className="text-sm font-semibold text-white">My Interests</h3>
        </div>
        <button className="text-xs text-accent-blue">+ Add</button>
      </div>
      
      <div className="space-y-3">
        {interests.length === 0 && (
          <div className="p-3 bg-bg-primary rounded-lg text-xs text-text-secondary">
            No impacted sectors yet to build interest profile.
          </div>
        )}
        {interests.map((interest, index) => (
          <div key={index} className="p-3 bg-bg-primary rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">{interest.tag}</span>
              <div className="flex items-center gap-2">
                <Bell className={`w-4 h-4 ${interest.notifications ? 'text-accent-blue' : 'text-gray-600'}`} />
                <span className="text-xs text-text-secondary">{interest.weight}%</span>
              </div>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-blue rounded-full"
                style={{ width: `${interest.weight}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictionsTab({ events = [] }) {
  const rows = [];
  events.forEach((evt) => {
    const assets = Array.isArray(evt.affected_assets) ? evt.affected_assets : [];
    assets.forEach((asset) => {
      rows.push({
        asset: asset.ticker || 'N/A',
        prediction: asset.prediction || 'NEUTRAL',
        confidence: Math.round(Number(asset.confidence || 0) * 100),
        status: asset.validation_status ? 'VALIDATED' : 'ACTIVE',
        timeLeft: asset.validation_status ? null : 'Pending',
        accuracy: asset.validation_status === 'CORRECT' ? 'CORRECT' : asset.validation_status === 'INCORRECT' ? 'INCORRECT' : null,
      });
    });
  });

  const predictions = rows.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-white">My Predictions</h3>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-xs text-text-secondary uppercase tracking-wider">Active & Recent</h4>
        <div className="space-y-3">
          {predictions.length === 0 && (
            <div className="p-3 bg-bg-primary rounded-lg text-xs text-text-secondary">
              No prediction records available yet.
            </div>
          )}
          {predictions.map((pred, index) => (
            <div key={index} className="p-3 bg-bg-primary rounded-lg border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-accent-blue">{pred.asset}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  pred.status === 'ACTIVE' ? 'bg-accent-green/20 text-accent-green' :
                  pred.status === 'PENDING' ? 'bg-accent-amber/20 text-accent-amber' :
                  'bg-accent-blue/20 text-accent-blue'
                }`}>
                  {pred.status}
                </span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${
                  pred.prediction === 'BULLISH' ? 'text-accent-green' : 'text-accent-red'
                }`}>
                  {pred.prediction}
                </span>
                <span className="text-xs text-text-secondary">{pred.confidence}% conf</span>
              </div>
              {pred.timeLeft && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-text-secondary" />
                  <span className="text-xs text-text-secondary">{pred.timeLeft}</span>
                </div>
              )}
              {pred.accuracy && (
                <div className="text-xs text-accent-green mt-1">
                  ✓ {pred.accuracy}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExplanationTab({ events = [], liveMessage = null }) {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleSelectEvent = async (eventId) => {
    if (selectedEventId === eventId && explanationData) {
      setSelectedEventId(null);
      setExplanationData(null);
      return;
    }

    setLoadingId(eventId);
    try {
      const data = await fetchEventExplanation(eventId);
      setExplanationData(data);
      setSelectedEventId(eventId);
    } catch (error) {
      console.error('Failed to fetch explanation:', error);
    } finally {
      setLoadingId(null);
    }
  };

  useEffect(() => {
    if (!selectedEventId || !liveMessage?.event?.event_id) {
      return;
    }
    if (liveMessage.event.event_id !== selectedEventId) {
      return;
    }

    let isMounted = true;
    const refreshReasoning = async () => {
      try {
        const data = await fetchEventExplanation(selectedEventId);
        if (isMounted) {
          setExplanationData(data);
        }
      } catch (error) {
        console.error('Failed to refresh explanation from live update:', error);
      }
    };

    refreshReasoning();
    return () => {
      isMounted = false;
    };
  }, [liveMessage, selectedEventId]);

  const displayEvents = events.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-accent-amber" />
        <h3 className="text-sm font-semibold text-white">Explanation</h3>
      </div>

      {selectedEventId && explanationData ? (
        <div className="space-y-3">
          <button
            onClick={() => handleSelectEvent(selectedEventId)}
            className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-1"
          >
            ← Back to Events
          </button>
          
          <div className="p-3 bg-bg-primary rounded-lg border border-gray-700">
            <div className="text-xs text-text-secondary mb-2">Reasoning Chain for</div>
            <div className="text-sm font-semibold text-white mb-3 line-clamp-2">
              {explanationData.headline}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="text-xs">
                <span className="text-text-secondary">Event Type</span>
                <p className="text-accent-blue font-semibold">{explanationData.event_type}</p>
              </div>
              <div className="text-xs">
                <span className="text-text-secondary">Confidence</span>
                <p className="text-accent-green font-semibold">{Math.round(explanationData.confidence * 100)}%</p>
              </div>
            </div>

            {/* Extraction Summary */}
            {explanationData.reasoning_chain?.extraction?.trigger_type && (
              <div className="text-xs mb-3 p-2 bg-accent-amber/10 rounded border border-accent-amber/30">
                <div className="text-accent-amber font-semibold mb-1">Trigger Detected</div>
                <div className="text-text-secondary">
                  {explanationData.reasoning_chain.extraction.trigger_type.replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>
            )}

            {/* Second Order Effects */}
            {explanationData.reasoning_chain?.reasoning?.second_order_effects?.length > 0 && (
              <div className="text-xs">
                <div className="text-text-secondary mb-1 font-semibold">Market Effects</div>
                <div className="space-y-1">
                  {explanationData.reasoning_chain.reasoning.second_order_effects.slice(0, 2).map((effect, i) => (
                    <div key={i} className="text-text-secondary text-[11px]">• {effect.substring(0, 60)}...</div>
                  ))}
                </div>
              </div>
            )}

            <button className="w-full text-xs text-accent-blue hover:text-accent-blue/80 font-semibold mt-2 py-1 transition-colors">
              View Full Reasoning Chain →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-text-secondary mb-2">Recent Events</div>
          {displayEvents.length > 0 ? (
            displayEvents.map((event) => (
              <button
                key={event.event_id}
                onClick={() => handleSelectEvent(event.event_id)}
                disabled={loadingId === event.event_id}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  loadingId === event.event_id
                    ? 'opacity-50 cursor-wait'
                    : 'hover:bg-gray-700'
                } bg-bg-primary border border-gray-700`}
              >
                <div className="text-xs font-semibold text-white line-clamp-1 mb-1">
                  {event.headline?.substring(0, 50)}...
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{event.event_type}</span>
                  <span className="text-accent-blue">{Math.round(event.confidence * 100)}%</span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-xs text-text-secondary py-4 text-center">No events available</div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-text-secondary" />
        <h3 className="text-sm font-semibold text-white">Settings</h3>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-xs text-text-secondary uppercase tracking-wider">Notifications</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
              <span className="text-sm text-white">High Severity Events</span>
              <button className="w-10 h-5 bg-accent-blue rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
              <span className="text-sm text-white">Prediction Updates</span>
              <button className="w-10 h-5 bg-gray-600 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-xs text-text-secondary uppercase tracking-wider">Display</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
              <span className="text-sm text-white">Auto-refresh</span>
              <select className="bg-gray-700 text-white text-sm rounded px-2 py-1">
                <option>5 seconds</option>
                <option>10 seconds</option>
                <option>30 seconds</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
              <span className="text-sm text-white">Confidence threshold</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                defaultValue="60"
                className="w-16"
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-xs text-text-secondary uppercase tracking-wider">Account</h4>
          <div className="space-y-2">
            <button className="w-full p-3 bg-bg-primary rounded-lg text-left text-sm text-white hover:bg-gray-800">
              Profile Settings
            </button>
            <button className="w-full p-3 bg-bg-primary rounded-lg text-left text-sm text-white hover:bg-gray-800">
              Export Data
            </button>
            <button className="w-full p-3 bg-accent-red/20 rounded-lg text-left text-sm text-accent-red hover:bg-accent-red/30">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RightPanel({ isExpanded, setIsExpanded, events = [], validations = [], backendActions = [], liveMessage = null }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle tab click - double-tap on same tab opens fullscreen (except settings)
  const handleTabClick = (tabId) => {
    if (activeTab === tabId && tabId !== 'settings') {
      // Double-tap on same tab - open fullscreen
      setIsFullscreen(true);
    } else {
      setActiveTab(tabId);
    }
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab events={events} validations={validations} backendActions={backendActions} />;
      case 'discover':
        return <DiscoverTab />;
      case 'trending':
        return <TrendingTab events={events} />;
      case 'interests':
        return <InterestsTab events={events} />;
      case 'predictions':
        return <PredictionsTab events={events} />;
      case 'explanation':
        return <ExplanationTab events={events} liveMessage={liveMessage} />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <DashboardTab />;
    }
  };

  const renderFullscreenContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <FullscreenDashboard onClose={closeFullscreen} />;
      case 'discover':
        return <FullscreenDiscover onClose={closeFullscreen} />;
      case 'trending':
        return <FullscreenTrending onClose={closeFullscreen} />;
      case 'interests':
        return <FullscreenInterests onClose={closeFullscreen} />;
      case 'predictions':
        return <FullscreenPredictions onClose={closeFullscreen} />;
      case 'explanation':
        return <FullscreenExplanation onClose={closeFullscreen} events={events} liveMessage={liveMessage} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {isFullscreen && renderFullscreenContent()}
      </AnimatePresence>

      <div className="fixed right-0 top-16 bottom-0 z-40 flex">
        {/* Toggle Button */}
        <button
          onClick={toggleExpanded}
          className="w-10 h-16 bg-bg-card border-l border-t border-b border-gray-800 rounded-l-lg flex items-center justify-center text-text-secondary hover:text-white transition-colors hover:bg-bg-card-alt"
          aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
        >
          {isExpanded ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>

        {/* Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-bg-card-alt border-l border-gray-800 overflow-hidden"
            >
              <div className="flex flex-col h-full">
                {/* Tab Navigation */}
                <div className="border-b border-gray-800 px-4 py-3">
                  <div className="grid grid-cols-3 gap-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabClick(tab.id)}
                          className={`p-2 rounded-lg transition-colors text-xs flex flex-col items-center gap-1 ${
                            activeTab === tab.id
                              ? 'bg-accent-blue/20 text-accent-blue'
                              : 'text-text-secondary hover:text-white hover:bg-gray-700'
                          }`}
                          title={tab.id !== 'settings' ? `${tab.label} (click again to expand)` : tab.label}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="truncate w-full">{tab.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expand hint for active tab */}
                {activeTab !== 'settings' && (
                  <div className="px-4 py-2 border-b border-gray-800/50">
                    <button 
                      onClick={() => setIsFullscreen(true)}
                      className="w-full text-xs text-text-secondary hover:text-accent-blue flex items-center justify-center gap-1 transition-colors"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      Click tab again or here to expand
                    </button>
                  </div>
                )}

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderTabContent()}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Overlay */}
        {isExpanded && (
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </div>
    </>
  );
}

// Mobile-optimized version that slides up from bottom
export function MobileRightPanel({
  isExpanded,
  setIsExpanded,
  activeTab,
  setActiveTab,
  events = [],
  validations = [],
  backendActions = [],
  liveMessage = null,
}) {
  const [showContent, setShowContent] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab events={events} validations={validations} backendActions={backendActions} />;
      case 'discover':
        return <DiscoverTab />;
      case 'trending':
        return <TrendingTab events={events} />;
      case 'interests':
        return <InterestsTab events={events} />;
      case 'predictions':
        return <PredictionsTab events={events} />;
      case 'explanation':
        return <ExplanationTab events={events} liveMessage={liveMessage} />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <AnimatePresence>
      {isExpanded && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setIsExpanded(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card-alt border-t border-gray-800 rounded-t-2xl max-h-[80vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center py-2">
              <div className="w-12 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-800 px-4 pb-3">
              <div className="flex overflow-x-auto gap-2 scrollbar-hide">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 p-3 rounded-lg transition-colors text-xs flex flex-col items-center gap-2 min-w-[70px] ${
                        activeTab === tab.id
                          ? 'bg-accent-blue/20 text-accent-blue'
                          : 'text-text-secondary hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] leading-none">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderTabContent()}
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
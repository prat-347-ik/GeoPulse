import { motion } from 'framer-motion';
import { Clock, ExternalLink, AlertTriangle, TrendingUp, Info, Zap, TrendingDown, Sparkles, Cog } from 'lucide-react';
import AssetCard from './AssetCard';

function getSeverityColor(severity) {
  switch (severity) {
    case 'HIGH':
      return 'bg-accent-red/20 text-accent-red border-accent-red/50';
    case 'MEDIUM':
      return 'bg-accent-orange/20 text-accent-orange border-accent-orange/50';
    case 'LOW':
      return 'bg-accent-amber/20 text-accent-amber border-accent-amber/50';
    default:
      return 'bg-gray-700/20 text-gray-400 border-gray-600';
  }
}

function getHorizonLabel(horizon) {
  switch (horizon) {
    case 'SHORT_TERM':
      return '0-24h';
    case 'MEDIUM_TERM':
      return '1-7d';
    case 'LONG_TERM':
      return '>7d';
    default:
      return horizon;
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }) + ' UTC';
}

function getConfidenceBadgeColor(confidence) {
  if (confidence >= 0.8) return 'bg-accent-green/20 text-accent-green border-accent-green/50';
  if (confidence >= 0.5) return 'bg-accent-orange/20 text-accent-orange border-accent-orange/50';
  return 'bg-accent-red/20 text-accent-red border-accent-red/50';
}

function getEventTypeColor(eventType) {
  const colors = {
    'ENERGY': 'bg-yellow-900/50 text-yellow-300',
    'REGULATION': 'bg-purple-900/50 text-purple-300',
    'EARNINGS': 'bg-blue-900/50 text-blue-300',
    'TECH': 'bg-cyan-900/50 text-cyan-300',
    'SUPPLY_CHAIN': 'bg-orange-900/50 text-orange-300',
    'GEOPOLITICAL': 'bg-red-900/50 text-red-300',
    'MACRO': 'bg-indigo-900/50 text-indigo-300',
  };
  return colors[eventType] || 'bg-gray-700/50 text-gray-300';
}

function getSectorDirectionIcon(direction) {
  switch (direction) {
    case 'UP':
      return <TrendingUp className="w-4 h-4 text-accent-green" />;
    case 'DOWN':
      return <TrendingDown className="w-4 h-4 text-accent-red" />;
    default:
      return <Zap className="w-4 h-4 text-text-secondary" />;
  }
}

function getExplanationSourceBadge(source) {
  if (source === 'llm') {
    return {
      icon: <Sparkles className="w-3.5 h-3.5" />,
      text: '✨ AI Synthesized',
      bgClass: 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/50',
    };
  }
  if (source === 'deterministic_fallback') {
    return {
      icon: <Cog className="w-3.5 h-3.5" />,
      text: '⚙️ Rule Engine Fallback',
      bgClass: 'bg-slate-700/40 text-slate-300 border border-slate-600/50',
    };
  }
  return {
    icon: <Info className="w-3.5 h-3.5" />,
    text: 'Analysis',
    bgClass: 'bg-gray-700/40 text-gray-300 border border-gray-600/50',
  };
}

function ConfidenceRing({ confidence }) {
  const percentage = Math.round(confidence * 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r="40"
          stroke="#1f2937"
          strokeWidth="6"
          fill="none"
        />
        <motion.circle
          cx="48"
          cy="48"
          r="40"
          stroke="#1E90FF"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-white">{percentage}%</span>
      </div>
    </div>
  );
}

export default function ImpactCard({ event, onAssetClick }) {
  if (!event) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        <p>Select an event to view impact analysis</p>
      </div>
    );
  }

  // Calculate average confidence from event or affected_assets
  const eventConfidence = event.confidence || 0.5;
  const avgConfidence = event.affected_assets?.length > 0
    ? event.affected_assets.reduce((sum, a) => sum + (a.confidence || 0.5), 0) / event.affected_assets.length
    : eventConfidence;

  return (
    <motion.div
      key={event.event_id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header with event type and confidence badges */}
      <div className="space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-bold text-white mb-2"
            >
              {event.headline}
            </motion.h1>
            
            {/* Tags: Event Type + Confidence Badge */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {event.event_type && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                  {event.event_type}
                </span>
              )}
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getConfidenceBadgeColor(avgConfidence)}`}>
                Confidence: {Math.round(avgConfidence * 100)}%
              </span>
            </div>

            {/* NLP Transparency Badge */}
            {event.explanation_source && (
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getExplanationSourceBadge(event.explanation_source).bgClass}`}>
                  {getExplanationSourceBadge(event.explanation_source).icon}
                  {getExplanationSourceBadge(event.explanation_source).text}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <div className="flex items-center gap-1">
                <ExternalLink className="w-4 h-4" />
                <span>{event.source}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatTime(event.timestamp)}</span>
              </div>
            </div>
          </div>
          <ConfidenceRing confidence={avgConfidence} />
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`px-3 py-2 rounded-card border ${getSeverityColor(event.severity)}`}>
          <p className="text-xs opacity-70 mb-1">Severity</p>
          <p className="font-semibold">{event.severity}</p>
        </div>
        <div className="px-3 py-2 rounded-card bg-bg-card border border-gray-800">
          <p className="text-xs text-text-secondary mb-1">Macro Effect</p>
          <p className="font-semibold text-white">{event.macro_effect}</p>
        </div>
        <div className="px-3 py-2 rounded-card bg-bg-card border border-gray-800">
          <p className="text-xs text-text-secondary mb-1">Horizon</p>
          <p className="font-semibold text-white">{getHorizonLabel(event.prediction_horizon)}</p>
        </div>
        <div className="px-3 py-2 rounded-card bg-bg-card border border-gray-800">
          <p className="text-xs text-text-secondary mb-1">Market Pressure</p>
          <p className="font-semibold text-white">{event.market_pressure}</p>
        </div>
      </div>

      {/* Why Explanation with NLP Source */}
      <div className="flex items-start gap-3 p-4 bg-accent-blue/10 border border-accent-blue/30 rounded-card">
        <Info className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs text-accent-blue font-semibold mb-1">Analysis Summary</p>
          <p className="text-sm text-white">{event.summary_explanation || event.why}</p>
        </div>
      </div>

      {/* Sector Impacts (New Schema) */}
      {event.sector_impacts && event.sector_impacts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Sector Impact Analysis
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {event.sector_impacts.map((impact, idx) => (
              <motion.div
                key={`${impact.sector}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-3 rounded-card bg-bg-card border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white text-sm">{impact.sector}</span>
                  {getSectorDirectionIcon(impact.direction)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Impact Weight:</span>
                  <span className={`text-sm font-semibold ${
                    impact.weight > 0 ? 'text-accent-green' : 
                    impact.weight < 0 ? 'text-accent-red' : 'text-text-secondary'
                  }`}>
                    {impact.weight > 0 ? '+' : ''}{(impact.weight * 100).toFixed(1)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Affected Assets */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Affected Assets
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {event.affected_assets?.map((asset) => (
            <AssetCard
              key={asset.ticker}
              asset={asset}
              onClick={() => onAssetClick(asset)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react';

function getPredictionColor(prediction) {
  switch (prediction) {
    case 'BULLISH':
      return 'text-accent-green';
    case 'BEARISH':
      return 'text-accent-red';
    default:
      return 'text-text-secondary';
  }
}

function getPredictionIcon(prediction) {
  switch (prediction) {
    case 'BULLISH':
      return <TrendingUp className="w-5 h-5" />;
    case 'BEARISH':
      return <TrendingDown className="w-5 h-5" />;
    default:
      return <Minus className="w-5 h-5" />;
  }
}

function getAssetClassBadge(assetClass) {
  const colors = {
    'Equity': 'bg-blue-900/50 text-blue-300',
    'Commodity': 'bg-yellow-900/50 text-yellow-300',
    'Crypto': 'bg-purple-900/50 text-purple-300',
    'Forex': 'bg-green-900/50 text-green-300'
  };
  return colors[assetClass] || 'bg-gray-700 text-gray-300';
}

export default function AssetCard({ asset, onClick }) {
  // Handle missing or invalid data from live backend
  if (!asset || !asset.ticker) {
    return null;
  }

  const confidence = typeof asset.confidence === 'number' ? asset.confidence : 0.5;
  const confidencePercent = Math.round(confidence * 100);
  const prediction = asset.prediction || 'NEUTRAL';
  const assetClass = asset.asset_class || 'Unknown';
  const name = asset.name || asset.ticker;
  const reason = asset.reason || 'No analysis available';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className="bg-bg-card border border-gray-800 rounded-card p-4 cursor-pointer hover:border-accent-blue transition-colors"
      tabIndex={0}
      role="button"
      aria-label={`${name} (${asset.ticker}): ${prediction}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Header: Ticker + Asset Class */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{asset.ticker}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getAssetClassBadge(assetClass)}`}>
            {assetClass}
          </span>
        </div>
        <div className={`${getPredictionColor(prediction)}`}>
          {getPredictionIcon(prediction)}
        </div>
      </div>

      {/* Company Name */}
      <p className="text-sm text-text-secondary mb-3">{name}</p>

      {/* Confidence Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-text-secondary">Confidence</span>
          <span className={`font-semibold ${getPredictionColor(prediction)}`}>
            {confidencePercent}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              prediction === 'BULLISH' ? 'bg-accent-green' :
              prediction === 'BEARISH' ? 'bg-accent-red' : 'bg-text-secondary'
            }`}
          />
        </div>
      </div>

      {/* Reason */}
      <p className="text-xs text-text-secondary line-clamp-2">{reason}</p>
    </motion.div>
  );
}

// Modal component for asset details
export function AssetModal({ asset, onClose, priceData }) {
  if (!asset || !asset.ticker) return null;

  const confidence = typeof asset.confidence === 'number' ? asset.confidence : 0.5;
  const confidencePercent = Math.round(confidence * 100);
  const prediction = asset.prediction || 'NEUTRAL';
  const assetClass = asset.asset_class || 'Unknown';
  const name = asset.name || asset.ticker;
  const sector = asset.sector || 'Unknown';
  const reason = asset.reason || 'No analysis available';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-bg-card border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              prediction === 'BULLISH' ? 'bg-accent-green/20' :
              prediction === 'BEARISH' ? 'bg-accent-red/20' : 'bg-gray-700'
            }`}>
              {getPredictionIcon(prediction)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{asset.ticker}</h3>
              <p className="text-sm text-text-secondary">{name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-text-secondary">Asset Class</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getAssetClassBadge(assetClass)}`}>
              {assetClass}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-text-secondary">Sector</span>
            <span className="text-white">{sector}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-text-secondary">Prediction</span>
            <span className={`font-semibold ${getPredictionColor(prediction)}`}>
              {prediction}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-text-secondary">Confidence</span>
            <span className="text-white font-semibold">{confidencePercent}%</span>
          </div>
        </div>

        {/* Sparkline placeholder */}
        <div className="mt-4 p-4 bg-bg-primary rounded-lg">
          <p className="text-xs text-text-secondary mb-2">Price (Last 24h)</p>
          <div className="h-16 flex items-end gap-0.5">
            {/* Mock sparkline */}
            {Array.from({ length: 24 }, (_, i) => {
              const height = 20 + Math.sin(i * 0.5) * 15 + Math.random() * 20;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${
                    prediction === 'BULLISH' ? 'bg-accent-green/60' : 'bg-accent-red/60'
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Reason */}
        <div className="mt-4 p-3 bg-bg-primary rounded-lg">
          <p className="text-xs text-text-secondary mb-1">Analysis</p>
          <p className="text-sm text-white">{reason}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

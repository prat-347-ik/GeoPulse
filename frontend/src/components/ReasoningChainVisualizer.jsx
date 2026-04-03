import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Cpu,
  Gauge,
  GitBranch,
  Globe,
  Radar,
  Rows3,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { getUserSettings, updateUserSettings } from '../lib/api';

function meterColor(value) {
  if (value >= 0.75) return 'bg-accent-green';
  if (value >= 0.45) return 'bg-accent-amber';
  return 'bg-accent-red';
}

function MetricBar({ label, value }) {
  const bounded = Math.max(0, Math.min(1, Number(value || 0)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semibold text-white">{Math.round(bounded * 100)}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${meterColor(bounded)}`} style={{ width: `${bounded * 100}%` }} />
      </div>
    </div>
  );
}

function StageCard({ title, subtitle, icon: Icon, children, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={`rounded-xl border p-4 ${accent}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-text-secondary">{subtitle}</p>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <Icon className="w-4 h-4 text-white/80" />
      </div>
      {children}
    </motion.div>
  );
}

function GraphNode({ title, subtitle, value, icon: Icon, tone = 'blue' }) {
  const toneMap = {
    blue: 'border-accent-blue/50 bg-accent-blue/10',
    amber: 'border-accent-amber/50 bg-accent-amber/10',
    green: 'border-accent-green/50 bg-accent-green/10',
    red: 'border-accent-red/50 bg-accent-red/10',
  };

  return (
    <div className={`rounded-lg border p-3 ${toneMap[tone] || toneMap.blue}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] uppercase tracking-wider text-text-secondary">{subtitle}</p>
        <Icon className="w-3.5 h-3.5 text-white/80" />
      </div>
      <h4 className="text-sm font-semibold text-white mb-1 line-clamp-2">{title}</h4>
      <p className="text-xs text-text-secondary line-clamp-2">{value}</p>
    </div>
  );
}

export default function ReasoningChainVisualizer({ reasoningData }) {
  const [viewMode, setViewMode] = useState('narrative');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const settings = await getUserSettings();
        const mode = settings?.explain_visualization_mode;
        if (isMounted && (mode === 'narrative' || mode === 'graph')) {
          setViewMode(mode);
        }
      } catch (error) {
        console.error('Failed to load explain visualization mode:', error);
      } finally {
        if (isMounted) {
          setSettingsLoaded(true);
        }
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    updateUserSettings({ explain_visualization_mode: viewMode }).catch((error) => {
      console.error('Failed to persist explain visualization mode:', error);
    });
  }, [viewMode, settingsLoaded]);

  const chain = reasoningData?.reasoning_chain || {};
  const extraction = chain.extraction || {};
  const reasoning = chain.reasoning || {};
  const analysis = chain.analysis || {};
  const output = chain.output || {};

  const sectors = Object.entries(analysis.sector_impacts || {})
    .sort(([, a], [, b]) => Math.abs(Number(b || 0)) - Math.abs(Number(a || 0)))
    .slice(0, 4);

  const predictions = (output.asset_predictions || [])
    .slice()
    .sort((a, b) => Number(b?.confidence || 0) - Number(a?.confidence || 0))
    .slice(0, 6);

  const secondOrder = (reasoning.second_order_effects || []).slice(0, 4);

  return (
    <div className="w-full h-full rounded-xl border border-gray-800 bg-bg-primary/70 overflow-auto">
      <div className="p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-accent-blue" />
            <h4 className="text-xs uppercase tracking-wider text-text-secondary">Explain Visualization</h4>
          </div>
          <div className="inline-flex p-1 bg-bg-card border border-gray-800 rounded-lg">
            <button
              onClick={() => setViewMode('narrative')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                viewMode === 'narrative' ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:text-white'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
              Narrative
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                viewMode === 'graph' ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-secondary hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Graph
            </button>
          </div>
        </div>

        {viewMode === 'narrative' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-800 bg-bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-accent-blue" />
                  <h4 className="text-xs uppercase tracking-wider text-text-secondary">Telemetry</h4>
                </div>
                <div className="space-y-2">
                  <MetricBar label="Extraction Confidence" value={extraction.confidence || 0} />
                  <MetricBar label="Reasoning Strength" value={reasoning.reasoning_strength || 0} />
                  <MetricBar label="Base Confidence" value={analysis.base_confidence || 0} />
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-bg-card p-3 lg:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Radar className="w-4 h-4 text-accent-amber" />
                  <h4 className="text-xs uppercase tracking-wider text-text-secondary">Signal Snapshot</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-accent-blue/20 text-accent-blue text-xs">
                    Trigger: {extraction.trigger_type || 'None'}
                  </span>
                  <span className="px-2 py-1 rounded bg-gray-800 text-text-secondary text-xs">
                    Risk: {extraction.risk_sentiment || 'NEUTRAL'}
                  </span>
                  <span className="px-2 py-1 rounded bg-gray-800 text-text-secondary text-xs">
                    Safe Haven: {extraction.safe_haven_demand || 'NEUTRAL'}
                  </span>
                  {(extraction.regions || []).slice(0, 3).map((region) => (
                    <span key={region} className="px-2 py-1 rounded bg-accent-amber/20 text-accent-amber text-xs">
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 items-stretch">
              <StageCard
                title={chain.input?.headline || 'No headline'}
                subtitle="Input"
                icon={Globe}
                accent="border-accent-blue/50 bg-accent-blue/10"
              >
                <p className="text-xs text-text-secondary line-clamp-3">Event Type: {chain.input?.event_type || 'UNKNOWN'}</p>
              </StageCard>

              <div className="hidden xl:flex items-center justify-center text-text-secondary">
                <ArrowRight className="w-4 h-4" />
              </div>

              <StageCard
                title="Extraction"
                subtitle="Signal Parsing"
                icon={AlertTriangle}
                accent="border-accent-amber/50 bg-accent-amber/10"
              >
                <div className="space-y-1">
                  <p className="text-xs text-white">Trigger: <span className="text-accent-amber">{extraction.trigger_type || 'None'}</span></p>
                  <p className="text-xs text-text-secondary">Regions: {(extraction.regions || []).join(', ') || 'N/A'}</p>
                  <p className="text-xs text-text-secondary">Energy Risk: {extraction.energy_supply_risk || 'NEUTRAL'}</p>
                </div>
              </StageCard>

              <div className="hidden xl:flex items-center justify-center text-text-secondary">
                <ArrowRight className="w-4 h-4" />
              </div>

              <StageCard
                title="Reasoning + Analysis"
                subtitle="Second-Order Impact"
                icon={Cpu}
                accent="border-accent-green/50 bg-accent-green/10"
              >
                <div className="space-y-2">
                  {secondOrder.length === 0 && <p className="text-xs text-text-secondary">No second-order effects available.</p>}
                  {secondOrder.map((effect, idx) => (
                    <p key={`${effect}-${idx}`} className="text-xs text-text-secondary line-clamp-2">• {effect}</p>
                  ))}
                  {sectors.length > 0 && (
                    <div className="pt-2 border-t border-gray-700 space-y-1">
                      {sectors.map(([sector, weight]) => {
                        const value = Number(weight || 0);
                        const up = value >= 0;
                        return (
                          <div key={sector} className="flex items-center justify-between text-xs">
                            <span className="text-text-secondary">{sector}</span>
                            <span className={up ? 'text-accent-green' : 'text-accent-red'}>
                              {up ? '+' : ''}{(value * 100).toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </StageCard>
            </div>

            <div className="rounded-xl border border-gray-800 bg-bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent-blue" />
                  <h4 className="text-sm font-semibold text-white">Prediction Evidence Board</h4>
                </div>
                {(output.validation_summary?.correct || 0) > 0 && (
                  <div className="inline-flex items-center gap-1 text-xs text-accent-green">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {output.validation_summary.correct} validated
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {predictions.length === 0 && (
                  <p className="text-xs text-text-secondary">No asset predictions available.</p>
                )}
                {predictions.map((pred, idx) => {
                  const confidence = Math.max(0, Math.min(1, Number(pred.confidence || 0)));
                  const isBull = pred.prediction === 'BULLISH';
                  const isBear = pred.prediction === 'BEARISH';
                  return (
                    <motion.div
                      key={`${pred.ticker}-${idx}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="rounded-lg border border-gray-800 bg-bg-primary p-2.5"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="text-sm font-semibold text-white">{pred.ticker || 'N/A'}</p>
                          <p className="text-[11px] text-text-secondary">{pred.sector || 'Unknown sector'}</p>
                        </div>
                        <div className={`inline-flex items-center gap-1 text-xs font-semibold ${isBull ? 'text-accent-green' : isBear ? 'text-accent-red' : 'text-text-secondary'}`}>
                          {isBull && <TrendingUp className="w-3.5 h-3.5" />}
                          {isBear && <TrendingDown className="w-3.5 h-3.5" />}
                          {pred.prediction || 'NEUTRAL'}
                        </div>
                      </div>

                      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full ${meterColor(confidence)}`}
                          style={{ width: `${confidence * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-text-secondary">
                        <span>Confidence</span>
                        <span className="text-white font-medium">{Math.round(confidence * 100)}%</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {viewMode === 'graph' && (
          <>
            <div className="rounded-xl border border-gray-800 bg-bg-card p-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-3 items-stretch">
                <GraphNode
                  title={chain.input?.event_type || 'UNKNOWN'}
                  subtitle="Input"
                  icon={Globe}
                  value={(chain.input?.headline || 'No headline provided').slice(0, 120)}
                  tone="blue"
                />

                <div className="hidden lg:flex items-center justify-center text-text-secondary">
                  <ArrowRight className="w-4 h-4" />
                </div>

                <GraphNode
                  title={extraction.trigger_type || 'None'}
                  subtitle="Extraction"
                  icon={AlertTriangle}
                  value={`Risk ${extraction.risk_sentiment || 'NEUTRAL'} | Regions ${(extraction.regions || []).slice(0, 2).join(', ') || 'N/A'}`}
                  tone="amber"
                />

                <div className="hidden lg:flex items-center justify-center text-text-secondary">
                  <ArrowRight className="w-4 h-4" />
                </div>

                <GraphNode
                  title={`Strength ${Math.round(Number(reasoning.reasoning_strength || 0) * 100)}%`}
                  subtitle="Reasoning"
                  icon={Cpu}
                  value={(secondOrder[0] || 'No second-order effect derived').slice(0, 120)}
                  tone="green"
                />

                <div className="hidden lg:flex items-center justify-center text-text-secondary">
                  <ArrowRight className="w-4 h-4" />
                </div>

                <GraphNode
                  title={`${predictions.length} Predictions`}
                  subtitle="Output"
                  icon={Target}
                  value={predictions[0] ? `${predictions[0].ticker || 'N/A'} ${predictions[0].prediction || 'NEUTRAL'} ${Math.round(Number(predictions[0].confidence || 0) * 100)}%` : 'No predictions available'}
                  tone="blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-800 bg-bg-card p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Impact Map</h4>
                <div className="space-y-2">
                  {sectors.length === 0 && <p className="text-xs text-text-secondary">No sector impact data available.</p>}
                  {sectors.map(([sector, weight]) => {
                    const value = Math.abs(Number(weight || 0));
                    const isUp = Number(weight || 0) >= 0;
                    return (
                      <div key={sector} className="rounded-lg border border-gray-800 bg-bg-primary p-2.5">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-white">{sector}</span>
                          <span className={isUp ? 'text-accent-green' : 'text-accent-red'}>
                            {isUp ? '+' : ''}{(Number(weight || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${isUp ? 'bg-accent-green' : 'bg-accent-red'}`} style={{ width: `${Math.min(1, value) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-bg-card p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Asset Signal Graph</h4>
                <div className="space-y-2">
                  {predictions.length === 0 && <p className="text-xs text-text-secondary">No asset predictions available.</p>}
                  {predictions.map((pred, idx) => {
                    const confidence = Math.max(0, Math.min(1, Number(pred.confidence || 0)));
                    const isBull = pred.prediction === 'BULLISH';
                    const isBear = pred.prediction === 'BEARISH';
                    return (
                      <div key={`${pred.ticker}-${idx}`} className="grid grid-cols-[72px_1fr_auto] gap-2 items-center text-xs">
                        <span className="font-semibold text-white truncate">{pred.ticker || 'N/A'}</span>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${meterColor(confidence)}`} style={{ width: `${confidence * 100}%` }} />
                        </div>
                        <span className={isBull ? 'text-accent-green' : isBear ? 'text-accent-red' : 'text-text-secondary'}>
                          {pred.prediction || 'NEUTRAL'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

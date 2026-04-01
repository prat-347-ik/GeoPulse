import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { ChevronRight, AlertTriangle, TrendingUp, Target, CheckCircle } from 'lucide-react';

// Custom node components
const InputNode = ({ data }) => (
  <div className="px-4 py-3 bg-gradient-to-r from-accent-blue/20 to-accent-blue/10 border-2 border-accent-blue rounded-lg shadow-lg text-white w-64">
    <div className="text-xs font-semibold text-accent-blue uppercase mb-1">Input</div>
    <div className="text-sm font-bold mb-1">{data.headline?.substring(0, 50)}...</div>
    <div className="text-xs text-text-secondary">Event Type: {data.event_type}</div>
  </div>
);

const ExtractionNode = ({ data }) => (
  <div className="px-4 py-3 bg-gradient-to-r from-accent-amber/20 to-accent-amber/10 border-2 border-accent-amber rounded-lg shadow-lg text-white w-72">
    <div className="text-xs font-semibold text-accent-amber uppercase mb-2 flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" /> Extraction
    </div>
    {data.trigger_type && data.trigger_type !== 'None' && (
      <div className="mb-2">
        <div className="text-xs text-text-secondary">Trigger Type</div>
        <div className="text-sm font-semibold text-accent-amber">{data.trigger_type}</div>
      </div>
    )}
    {data.regions?.length > 0 && (
      <div className="mb-2">
        <div className="text-xs text-text-secondary">Regions</div>
        <div className="flex gap-1 flex-wrap">
          {data.regions.map((r, i) => (
            <span key={i} className="px-2 py-0.5 bg-accent-amber/30 text-accent-amber rounded text-xs">
              {r}
            </span>
          ))}
        </div>
      </div>
    )}
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div>
        <span className="text-text-secondary">Risk</span>
        <p className={`font-semibold ${data.risk_sentiment === 'RISK_OFF' ? 'text-accent-red' : data.risk_sentiment === 'RISK_ON' ? 'text-accent-green' : 'text-text-secondary'}`}>
          {data.risk_sentiment}
        </p>
      </div>
      <div>
        <span className="text-text-secondary">Confidence</span>
        <p className="font-semibold text-accent-blue">{Math.round(data.confidence * 100)}%</p>
      </div>
    </div>
  </div>
);

const ReasoningNode = ({ data }) => (
  <div className="px-4 py-3 bg-gradient-to-r from-accent-green/20 to-accent-green/10 border-2 border-accent-green rounded-lg shadow-lg text-white w-80">
    <div className="text-xs font-semibold text-accent-green uppercase mb-2 flex items-center gap-1">
      <TrendingUp className="w-3 h-3" /> Reasoning
    </div>
    {data.second_order_effects?.length > 0 && (
      <div className="mb-2">
        <div className="text-xs text-text-secondary mb-1">Second-Order Effects</div>
        <div className="space-y-1">
          {data.second_order_effects.slice(0, 2).map((effect, i) => (
            <div key={i} className="text-xs text-accent-green/80 line-clamp-2">
              • {effect}
            </div>
          ))}
          {data.second_order_effects.length > 2 && (
            <div className="text-xs text-text-secondary italic">+{data.second_order_effects.length - 2} more</div>
          )}
        </div>
      </div>
    )}
    {Object.keys(data.overlay_impacts || {}).length > 0 && (
      <div className="mb-2">
        <div className="text-xs text-text-secondary mb-1">Sector Overlays</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(data.overlay_impacts).slice(0, 4).map(([sector, weight]) => (
            <div key={sector} className="flex justify-between">
              <span className="text-text-secondary">{sector}</span>
              <span className={weight > 0 ? 'text-accent-green' : 'text-accent-red'}>
                {weight > 0 ? '+' : ''}{(weight * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
    <div className="pt-2 border-t border-accent-green/30">
      <div className="text-xs text-text-secondary">Strength</div>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-green rounded-full transition-all"
            style={{ width: `${Math.min(data.reasoning_strength, 1) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-accent-green">{Math.round(data.reasoning_strength * 100)}%</span>
      </div>
    </div>
  </div>
);

const AnalysisNode = ({ data }) => (
  <div className="px-4 py-3 bg-gradient-to-r from-accent-blue/20 to-accent-blue/10 border-2 border-accent-blue rounded-lg shadow-lg text-white w-72">
    <div className="text-xs font-semibold text-accent-blue uppercase mb-2">Analysis</div>
    {Object.keys(data.sector_impacts || {}).length > 0 && (
      <div>
        <div className="text-xs text-text-secondary mb-1">Top Sector Impacts</div>
        <div className="space-y-1">
          {Object.entries(data.sector_impacts)
            .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
            .slice(0, 3)
            .map(([sector, weight]) => (
              <div key={sector} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{sector}</span>
                <div className="flex items-center gap-1">
                  <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${weight > 0 ? 'bg-accent-green' : 'bg-accent-red'}`}
                      style={{ width: `${Math.abs(weight) * 100}%` }}
                    />
                  </div>
                  <span className={`font-semibold ${weight > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {weight > 0 ? '+' : ''}{(weight * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    )}
    <div className="mt-2 pt-2 border-t border-accent-blue/30">
      <div className="text-xs text-text-secondary">Base Confidence</div>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-blue rounded-full transition-all"
            style={{ width: `${data.base_confidence * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-accent-blue">{Math.round(data.base_confidence * 100)}%</span>
      </div>
    </div>
  </div>
);

const OutputNode = ({ data }) => (
  <div className="px-4 py-3 bg-gradient-to-r from-accent-green/20 to-accent-green/10 border-2 border-accent-green rounded-lg shadow-lg text-white w-64">
    <div className="text-xs font-semibold text-accent-green uppercase mb-2 flex items-center gap-1">
      <Target className="w-3 h-3" /> Output
    </div>
    {data.asset_predictions?.length > 0 && (
      <div>
        <div className="text-xs text-text-secondary mb-2">Top Predictions</div>
        <div className="space-y-1.5">
          {data.asset_predictions.slice(0, 3).map((pred, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 bg-bg-primary rounded">
              <div>
                <div className="font-semibold text-sm">{pred.ticker}</div>
                <div className="text-xs text-text-secondary">{pred.sector}</div>
              </div>
              <div className="text-right">
                <div
                  className={`text-xs font-bold ${
                    pred.prediction === 'BULLISH'
                      ? 'text-accent-green'
                      : pred.prediction === 'BEARISH'
                        ? 'text-accent-red'
                        : 'text-text-secondary'
                  }`}
                >
                  {pred.prediction === 'BULLISH' ? '↑' : '↓'} {pred.prediction}
                </div>
                <div className="text-xs text-accent-blue">{Math.round(pred.confidence * 100)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
    {data.validation_summary?.correct > 0 && (
      <div className="mt-2 pt-2 border-t border-accent-green/30 flex items-center gap-1 text-xs text-accent-green">
        <CheckCircle className="w-3 h-3" />
        {data.validation_summary.correct} validated
      </div>
    )}
  </div>
);

const nodeTypes = {
  input: InputNode,
  extraction: ExtractionNode,
  reasoning: ReasoningNode,
  analysis: AnalysisNode,
  output: OutputNode,
};

export default function ReasoningChainVisualizer({ reasoningData }) {
  // Build nodes from reasoning chain
  const initialNodes = useMemo(() => {
    const chain = reasoningData?.reasoning_chain || {};
    const nodes = [];

    // Input node
    nodes.push({
      id: 'input',
      data: {
        headline: chain.input?.headline || '',
        event_type: chain.input?.event_type || 'UNKNOWN',
      },
      position: { x: 0, y: 0 },
      type: 'input',
    });

    // Extraction node
    nodes.push({
      id: 'extraction',
      data: {
        trigger_type: chain.extraction?.trigger_type || 'None',
        regions: chain.extraction?.regions || [],
        risk_sentiment: chain.extraction?.risk_sentiment || 'NEUTRAL',
        safe_haven_demand: chain.extraction?.safe_haven_demand || 'NEUTRAL',
        energy_supply_risk: chain.extraction?.energy_supply_risk || 'NEUTRAL',
        confidence: chain.extraction?.confidence || 0.5,
      },
      position: { x: 350, y: 0 },
      type: 'extraction',
    });

    // Reasoning node
    nodes.push({
      id: 'reasoning',
      data: {
        second_order_effects: chain.reasoning?.second_order_effects || [],
        overlay_impacts: chain.reasoning?.overlay_sector_impacts || {},
        reasoning_strength: chain.reasoning?.reasoning_strength || 0.0,
      },
      position: { x: 750, y: 0 },
      type: 'reasoning',
    });

    // Analysis node
    nodes.push({
      id: 'analysis',
      data: {
        sector_impacts: chain.analysis?.sector_impacts || {},
        base_confidence: chain.analysis?.base_confidence || 0.5,
      },
      position: { x: 1150, y: 0 },
      type: 'analysis',
    });

    // Output node
    nodes.push({
      id: 'output',
      data: {
        asset_predictions: chain.output?.asset_predictions || [],
        validation_summary: chain.output?.validation_summary || {},
      },
      position: { x: 1550, y: 0 },
      type: 'output',
    });

    return nodes;
  }, [reasoningData]);

  const initialEdges = [
    {
      id: 'e-input-extraction',
      source: 'input',
      target: 'extraction',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' },
    },
    {
      id: 'e-extraction-reasoning',
      source: 'extraction',
      target: 'reasoning',
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' },
    },
    {
      id: 'e-reasoning-analysis',
      source: 'reasoning',
      target: 'analysis',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' },
    },
    {
      id: 'e-analysis-output',
      source: 'analysis',
      target: 'output',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' },
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-full bg-bg-primary/50 rounded-xl overflow-hidden border border-gray-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#374151" gap={16} />
        <Controls className="bg-bg-card border border-gray-700 rounded-lg shadow-lg" />
        <MiniMap
          className="bg-bg-card border border-gray-700 rounded-lg shadow-lg"
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>
    </div>
  );
}

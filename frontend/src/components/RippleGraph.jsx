import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { Zap, Globe, Building2, TrendingUp } from 'lucide-react';

const nodeColors = {
  event: { bg: '#1E90FF', border: '#60A5FA' },
  macro: { bg: '#A855F7', border: '#C084FC' },
  sector: { bg: '#F59E0B', border: '#FBBF24' },
  asset: { bg: '#22C55E', border: '#4ADE80' },
};

const nodeIcons = {
  event: Zap,
  macro: Globe,
  sector: Building2,
  asset: TrendingUp,
};

function CustomNode({ data }) {
  const Icon = nodeIcons[data.nodeType] || Zap;
  const colors = nodeColors[data.nodeType] || nodeColors.event;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0, duration: 0.3 }}
      className="relative"
    >
      <motion.div
        animate={{
          boxShadow: [
            `0 0 0 0 ${colors.bg}40`,
            `0 0 20px 10px ${colors.bg}20`,
            `0 0 0 0 ${colors.bg}40`,
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="px-4 py-3 rounded-lg border-2 min-w-[120px] text-center"
        style={{
          backgroundColor: `${colors.bg}20`,
          borderColor: colors.border,
          opacity: data.opacity !== undefined ? data.opacity : 1,
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Icon className="w-4 h-4" style={{ color: colors.border }} />
          <span className="text-xs uppercase tracking-wide" style={{ color: colors.border }}>
            {data.nodeType}
          </span>
        </div>
        <p className="text-sm font-medium text-white">{data.label}</p>
        {data.weight !== undefined && (
          <p className="text-xs text-white/70 mt-1">
            Weight: {(data.weight * 100).toFixed(1)}%
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

function buildGraphFromLogicChain(logicChain) {
  if (!logicChain || logicChain.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes = logicChain.map((item, index) => ({
    id: `node-${index}`,
    type: 'custom',
    position: { x: index * 200, y: 100 + Math.sin(index) * 30 },
    data: {
      label: item.text,
      nodeType: item.type,
      delay: index * 0.2,
    },
  }));

  const edges = logicChain.slice(0, -1).map((_, index) => ({
    id: `edge-${index}`,
    source: `node-${index}`,
    target: `node-${index + 1}`,
    animated: true,
    style: { stroke: '#4B5563', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#4B5563',
    },
  }));

  return { nodes, edges };
}

/**
 * Build a graph from sector impacts and affected assets
 * Shows: Event → Top Sectors → Top Assets
 */
function buildGraphFromSectorData(event) {
  if (!event) {
    return { nodes: [], edges: [] };
  }

  const nodes = [];
  const edges = [];
  let nodeIndex = 0;
  let yOffset = 0;

  // Event node (root)
  const eventNodeId = `node-${nodeIndex}`;
  nodes.push({
    id: eventNodeId,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      label: event.headline?.substring(0, 20) + '...' || 'Event',
      nodeType: 'event',
      delay: 0,
    },
  });
  nodeIndex++;

  // Sector nodes from sector_impacts
  const sectorNodes = [];
  const maxSectors = Math.min(event.sector_impacts?.length || 0, 3);
  
  if (maxSectors > 0) {
    yOffset = (maxSectors - 1) * -60;
    event.sector_impacts.slice(0, maxSectors).forEach((impact, idx) => {
      const sectorNodeId = `node-${nodeIndex}`;
      const opacity = Math.max(0.5, Math.abs(impact.weight));
      
      nodes.push({
        id: sectorNodeId,
        type: 'custom',
        position: { x: 250, y: yOffset + idx * 120 },
        data: {
          label: impact.sector,
          nodeType: 'sector',
          weight: impact.weight,
          delay: (idx + 1) * 0.15,
          opacity,
        },
      });

      const strokeWidth = Math.max(1, Math.abs(impact.weight) * 4);
      const strokeColor = impact.weight > 0 ? '#22C55E' : impact.weight < 0 ? '#F87171' : '#6B7280';

      edges.push({
        id: `edge-${nodeIndex}`,
        source: eventNodeId,
        target: sectorNodeId,
        animated: true,
        style: { stroke: strokeColor, strokeWidth },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
        },
      });

      sectorNodes.push({ id: sectorNodeId, sectorIndex: idx });
      nodeIndex++;
    });
  }

  // Asset nodes from affected_assets
  const maxAssets = Math.min(event.affected_assets?.length || 0, 3);
  
  if (maxAssets > 0 && sectorNodes.length > 0) {
    event.affected_assets.slice(0, maxAssets).forEach((asset, assetIdx) => {
      const assetNodeId = `node-${nodeIndex}`;
      const confidence = asset.confidence || 0.5;
      const opacity = Math.max(0.6, confidence);

      // Connect to a sector node (round-robin)
      const sectorNodeIndex = assetIdx % sectorNodes.length;
      const sourceNodeId = sectorNodes[sectorNodeIndex].id;

      nodes.push({
        id: assetNodeId,
        type: 'custom',
        position: { 
          x: 500, 
          y: sectorNodes[sectorNodeIndex].id.match(/\d+/) 
            ? (parseInt(sectorNodes[sectorNodeIndex].id.match(/\d+/)[0]) * 120 - 250 + assetIdx * 40)
            : 0 
        },
        data: {
          label: asset.ticker,
          nodeType: 'asset',
          weight: confidence,
          delay: (sectorNodes.length + assetIdx + 1) * 0.15,
          opacity,
        },
      });

      const strokeColor = asset.prediction === 'BULLISH' ? '#22C55E' : 
                          asset.prediction === 'BEARISH' ? '#F87171' : '#6B7280';

      edges.push({
        id: `edge-asset-${assetIdx}`,
        source: sourceNodeId,
        target: assetNodeId,
        animated: true,
        style: { stroke: strokeColor, strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
        },
      });

      nodeIndex++;
    });
  }

  return { nodes, edges };
}

export default function RippleGraph({ logicChain, event, severity }) {
  // Use sector_impacts data if available, otherwise fall back to logicChain
  const hasEventData = event && (event.sector_impacts?.length > 0 || event.affected_assets?.length > 0);
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (hasEventData) {
      return buildGraphFromSectorData(event);
    }
    return buildGraphFromLogicChain(logicChain);
  }, [event, logicChain, hasEventData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    if (hasEventData) {
      const { nodes: newNodes, edges: newEdges } = buildGraphFromSectorData(event);
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      const { nodes: newNodes, edges: newEdges } = buildGraphFromLogicChain(logicChain);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [event, logicChain, hasEventData, setNodes, setEdges]);

  // Don't show graph for LOW severity events
  if (severity === 'LOW' || (initialNodes.length === 0)) {
    return (
      <div className="bg-bg-card border border-gray-800 rounded-card p-6 h-[300px] flex items-center justify-center">
        <p className="text-text-secondary text-sm">
          {severity === 'LOW'
            ? 'Ripple visualization hidden for LOW severity events'
            : 'No ripple data available'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-gray-800 rounded-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          {hasEventData ? 'Event → Sector → Asset' : 'Event → Macro → Sector → Asset'}
        </h3>
      </div>
      <div className="h-[280px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.4 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          zoomOnScroll={false}
        >
          <Background color="#1f2937" gap={16} size={1} />
          <Controls
            showInteractive={false}
            className="bg-bg-card border border-gray-700 rounded"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

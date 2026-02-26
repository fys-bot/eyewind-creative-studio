import React from 'react';
import { WorkflowNode, WorkflowEdge } from '../../types';
import { getExactHandlePosition } from '../../utils/nodeUtils';

interface ConnectionLayerProps {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    viewport: { x: number, y: number, zoom: number };
    theme: 'light' | 'dark';
    hoveredEdgeId: string | null;
    selectedEdgeId: string | null;
    setHoveredEdgeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
    setEdgeMenuOpenId: (id: string | null) => void;
    expandedNodeId: string | null;
    performanceMode?: boolean; // Add performanceMode prop
    connectingState: { nodeId: string, handleId: string, type: 'source' | 'target' } | null;
    mousePos: { x: number, y: number };
}

const ConnectionLayer: React.FC<ConnectionLayerProps> = ({
    nodes, edges, viewport, theme,
    hoveredEdgeId, selectedEdgeId, setHoveredEdgeId, setSelectedEdgeId, setEdgeMenuOpenId,
    expandedNodeId, performanceMode, connectingState, mousePos
}) => {

    const renderConnectionLine = () => {
        if (!connectingState || !mousePos) return null;
        
        const { nodeId, handleId, type } = connectingState;
        const start = getExactHandlePosition(nodes, nodeId, handleId, type, expandedNodeId, viewport.zoom);
        const end = mousePos;
        
        let path = '';
        if (type === 'source') {
            const dX = Math.abs(end.x - start.x) * 0.5;
            path = `M ${start.x} ${start.y} C ${start.x + dX} ${start.y}, ${end.x - dX} ${end.y}, ${end.x} ${end.y}`;
        } else {
            const dX = Math.abs(end.x - start.x) * 0.5;
            path = `M ${start.x} ${start.y} C ${start.x - dX} ${start.y}, ${end.x + dX} ${end.y}, ${end.x} ${end.y}`;
        }

        return (
            <path 
                d={path} 
                stroke={theme === 'dark' ? '#9ca3af' : '#64748b'} 
                strokeWidth="2" 
                fill="none" 
                strokeDasharray="5,5" 
                className="pointer-events-none animate-pulse"
            />
        );
    };

    const renderEdges = () => {
        return edges.map(edge => {
           const source = nodes.find(n => n.id === edge.source);
           const target = nodes.find(n => n.id === edge.target);
           if (!source || !target) return null;
           
           const start = getExactHandlePosition(nodes, source.id, edge.sourceHandle, 'source', expandedNodeId, viewport.zoom);
           const end = getExactHandlePosition(nodes, target.id, edge.targetHandle, 'target', expandedNodeId, viewport.zoom);
           
           const dX = Math.abs(end.x - start.x) * 0.5;
           const dY = Math.abs(end.y - start.y) * 0.1;
           const path = `M ${start.x} ${start.y} C ${start.x + dX} ${start.y}, ${end.x - dX} ${end.y}, ${end.x} ${end.y}`;
           
           const isRunning = target.status === 'running';
           const isHovered = hoveredEdgeId === edge.id;
           const isSelected = selectedEdgeId === edge.id;
           const midX = (start.x + end.x) / 2;
           const midY = (start.y + end.y) / 2;
           const displayColor = isSelected ? '#3b82f6' : (theme === 'dark' ? '#4b5563' : '#cbd5e1');
           const displayWidth = isSelected ? 3 : (isHovered ? 3 : 2);
           const displayOpacity = isSelected ? 1 : (isHovered ? 0.8 : 0.8);
   
           return (
             <g 
               key={edge.id} 
               onMouseEnter={() => setHoveredEdgeId(edge.id)} 
               onMouseLeave={() => setHoveredEdgeId(null)}
               onClick={(e) => { e.stopPropagation(); setSelectedEdgeId(edge.id); setEdgeMenuOpenId(null); }}
               className="group/edge"
             >
                <path d={path} stroke="transparent" strokeWidth="20" fill="none" className="cursor-pointer" />
                <path d={path} stroke={displayColor} strokeWidth={displayWidth} fill="none" style={{ transitionProperty: 'stroke, stroke-width, opacity', transitionDuration: '200ms' }} opacity={displayOpacity} pointerEvents="none" />
                {(isRunning) && (
                    <path d={path} stroke={'#3b82f6'} strokeWidth="3" fill="none" strokeDasharray="10,10" className="animate-flow-fast" opacity={1} pointerEvents="none" />
                )}
                <circle cx={start.x} cy={start.y} r="3" fill={displayColor} pointerEvents="none" />
                <circle cx={end.x} cy={end.y} r="3" fill={displayColor} pointerEvents="none" />
                {(isHovered || isSelected) && (
                    <g className="cursor-pointer transition-transform duration-200">
                       <circle cx={midX} cy={midY} r="8" fill={theme === 'dark' ? '#1f2937' : 'white'} fillOpacity="1" />
                       <circle cx={midX} cy={midY} r="5" fill={theme === 'dark' ? '#1f2937' : 'white'} stroke="#3b82f6" strokeWidth="2" />
                    </g>
                )}
             </g>
           );
        });
    };

    return (
        <svg className="absolute -top-[50000px] -left-[50000px] w-[100000px] h-[100000px] overflow-visible pointer-events-none z-0">
           <g transform="translate(50000, 50000)">
              {renderEdges()}
              {renderConnectionLine()}
           </g>
        </svg>
    );
};

export default ConnectionLayer;
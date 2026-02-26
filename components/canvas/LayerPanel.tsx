import React, { useMemo, useState } from 'react';
import { WorkflowNode, WorkflowEdge } from '../../types';
import { Layers, Box, Network, Square, MousePointer2 } from 'lucide-react';

interface LayerPanelProps {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    onFocusNodes: (nodeIds: string[]) => void;
    onUpdateNodeData?: (id: string, data: any) => void;
    lang: string;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ nodes, edges, onFocusNodes, onUpdateNodeData, lang }) => {
    
    // Analyze Structure
    const { groups, workflows, singleNodes } = useMemo(() => {
        const groups: WorkflowNode[] = [];
        const nonGroupNodes: WorkflowNode[] = [];
        const nodeMap = new Map<string, WorkflowNode>();

        nodes.forEach(n => {
            if (n.type === 'group') {
                groups.push(n);
            } else {
                nonGroupNodes.push(n);
                nodeMap.set(n.id, n);
            }
        });

        // Union-Find for Clustering
        const parent = new Map<string, string>();
        const find = (id: string): string => {
            if (!parent.has(id)) parent.set(id, id);
            if (parent.get(id) !== id) parent.set(id, find(parent.get(id)!));
            return parent.get(id)!;
        };
        const union = (id1: string, id2: string) => {
            const root1 = find(id1);
            const root2 = find(id2);
            if (root1 !== root2) parent.set(root1, root2);
        };

        // Initialize sets for all non-group nodes
        nonGroupNodes.forEach(n => find(n.id));

        // Process edges
        edges.forEach(e => {
            if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
                union(e.source, e.target);
            }
        });

        // Group by root
        const clusters = new Map<string, WorkflowNode[]>();
        nonGroupNodes.forEach(n => {
            const root = find(n.id);
            if (!clusters.has(root)) clusters.set(root, []);
            clusters.get(root)!.push(n);
        });

        const workflows: WorkflowNode[][] = [];
        const singleNodes: WorkflowNode[] = [];

        clusters.forEach(cluster => {
            if (cluster.length > 1) {
                workflows.push(cluster);
            } else {
                singleNodes.push(cluster[0]);
            }
        });

        // Sort by y position (visual order)
        groups.sort((a, b) => a.y - b.y);
        workflows.sort((a, b) => Math.min(...a.map(n => n.y)) - Math.min(...b.map(n => n.y)));
        singleNodes.sort((a, b) => a.y - b.y);

        return { groups, workflows, singleNodes };
    }, [nodes, edges]);

    const isZh = lang === 'zh' || lang === 'tw';

    // --- Renaming Logic ---
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const startRenaming = (id: string, currentLabel: string) => {
        setRenamingId(id);
        setRenameValue(currentLabel || '');
    };

    const submitRename = () => {
        if (renamingId && onUpdateNodeData) {
            const newVal = renameValue.trim();
            if (newVal) {
                onUpdateNodeData(renamingId, { label: newVal });
            }
        }
        setRenamingId(null);
        setRenameValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') submitRename();
        if (e.key === 'Escape') {
            setRenamingId(null);
            setRenameValue('');
        }
    };

    // Helper to render editable item
    const renderItem = (
        id: string, 
        label: string, 
        iconColorClass: string, 
        onClick: () => void, 
        extraInfo?: React.ReactNode,
        isRenamingTarget: boolean = false
    ) => {
        if (isRenamingTarget) {
            return (
                 <div className="w-full px-2 py-1.5 rounded-lg bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/20 dark:border-white/10 flex items-center gap-2 shadow-sm">
                    <div className={`w-1.5 h-1.5 rounded-full ${iconColorClass}`}></div>
                    <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={submitRename}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-gray-900 dark:text-gray-100 p-0"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            );
        }

        return (
            <button
                key={id}
                onClick={onClick}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateNodeData) startRenaming(id, label);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white/40 dark:hover:bg-white/10 hover:backdrop-blur-md flex items-center gap-2 transition-all duration-200 group border border-transparent hover:border-white/20 dark:hover:border-white/5"
                title={isZh ? "双击重命名" : "Double click to rename"}
            >
                <div className={`w-1.5 h-1.5 rounded-full ${iconColorClass}`}></div>
                <span className="truncate flex-1">{label} {extraInfo}</span>
                <MousePointer2 size={10} className="opacity-0 group-hover:opacity-50" />
            </button>
        );
    };

    return (
        <div className="flex flex-col gap-2 p-1">
            
            {/* Groups Section */}
            {groups.length > 0 && (
                <div className="mb-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1">
                        <Box size={10} />
                        {isZh ? '群组' : 'Groups'}
                    </div>
                    <div className="space-y-0.5">
                        {groups.map(g => renderItem(
                            g.id,
                            g.data.label || (isZh ? '未命名群组' : 'Untitled Group'),
                            "bg-blue-500/50",
                            () => onFocusNodes([g.id]),
                            null,
                            renamingId === g.id
                        ))}
                    </div>
                </div>
            )}

            {/* Workflows Section */}
            {workflows.length > 0 && (
                <div className="mb-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1">
                        <Network size={10} />
                        {isZh ? '工作流' : 'Workflows'}
                    </div>
                    <div className="space-y-0.5">
                        {workflows.map((flow, idx) => {
                            const mainNode = flow.find(n => n.type === 'video_gen' || n.type === 'image_gen') || flow[0];
                            const label = mainNode.data.label || (isZh ? `流程 ${idx + 1}` : `Flow ${idx + 1}`);
                            
                            return renderItem(
                                mainNode.id, // Use main node ID for renaming
                                label,
                                "bg-emerald-500/50",
                                () => onFocusNodes(flow.map(n => n.id)),
                                <span className="text-[10px] text-gray-400">({flow.length})</span>,
                                renamingId === mainNode.id
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Single Nodes Section */}
            {singleNodes.length > 0 && (
                <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1">
                        <Square size={10} />
                        {isZh ? '独立节点' : 'Single Nodes'}
                    </div>
                    <div className="space-y-0.5">
                        {singleNodes.map(n => renderItem(
                            n.id,
                            n.data.label || (isZh ? '未命名' : 'Untitled'),
                            "bg-gray-400/50",
                            () => onFocusNodes([n.id]),
                            null,
                            renamingId === n.id
                        ))}
                    </div>
                </div>
            )}
            
            {groups.length === 0 && workflows.length === 0 && singleNodes.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400 italic">
                    {isZh ? '暂无内容' : 'Empty Canvas'}
                </div>
            )}
        </div>
    );
};

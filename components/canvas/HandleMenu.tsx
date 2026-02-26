import React from 'react';
import { createPortal } from 'react-dom';
import { WorkflowNode, WorkflowEdge, WorkflowNodeType } from '../../types';
import { nodeRegistry, ResourceType, ResourceSubtype } from '../../services/nodeEngine';
import { Language } from '../../utils/translations';
import { Trash2, Command, Clapperboard, Palette, Video, Music, Layers, StickyNote, Ghost, Eye, ImageIcon, Wand2 } from 'lucide-react';

interface HandleMenuState {
    nodeId: string;
    handleType: 'source' | 'target';
    x: number;
    y: number;
    handleId?: string;
}

interface HandleMenuProps {
  activeHandleMenu: HandleMenuState | null;
  setActiveHandleMenu: (state: HandleMenuState | null) => void;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onAddConnectedNode?: (sourceNodeId: string, handleType: 'source' | 'target', newNodeType: WorkflowNodeType, sourceHandle?: string, targetHandle?: string) => void;
  onDeleteEdge?: (id: string) => void;
  lang: Language;
  t: any;
}

export const HandleMenu: React.FC<HandleMenuProps> = ({
  activeHandleMenu,
  setActiveHandleMenu,
  nodes,
  edges,
  onAddConnectedNode,
  onDeleteEdge,
  lang,
  t
}) => {
  if (!activeHandleMenu) return null;
  const { nodeId, handleType, x, y, handleId } = activeHandleMenu;
  const connectedEdges = edges.filter(e => (handleType === 'source' && e.source === nodeId) || (handleType === 'target' && e.target === nodeId));
  
  const quickAdd = (type: WorkflowNodeType) => {
      const sourceHandle = handleType === 'source' ? handleId : undefined;
      const targetHandle = handleType === 'target' ? handleId : undefined;
      onAddConnectedNode && onAddConnectedNode(nodeId, handleType, type, sourceHandle, targetHandle); 
      setActiveHandleMenu(null);
  };

  // Determine Source Port Type for Filtering
  const sourceNode = nodes.find(n => n.id === nodeId);
  let portType: ResourceType = 'any';
  let portSubtype: ResourceSubtype | undefined = undefined;

  if (sourceNode) {
      const nodeDef = nodeRegistry.get(sourceNode.type);
      const ports = handleType === 'source' ? nodeDef.getOutputs() : nodeDef.getInputs();
      if (handleId) {
          const port = ports.find(p => p.id === handleId);
          if (port) {
              portType = port.type;
              portSubtype = port.subtype;
          }
      } else if (ports.length > 0) {
           portType = ports[0].type; // Fallback
           portSubtype = ports[0].subtype;
      }
  }

  // Helper to check compatibility
  const isCompatible = (targetType: WorkflowNodeType) => {
      if ((portType as string) === 'any') return true; 
      const targetDef = nodeRegistry.get(targetType);
      
      if (handleType === 'source') {
          // Output -> Input
          return targetDef.getInputs().some(p => {
              if ((p.type as string) === 'any') return true;
              if (p.type !== portType) return false;
              if (p.subtype && portSubtype && p.subtype !== portSubtype) return false;
              return true;
          }); 
      } else {
          // Input <- Output
          return targetDef.getOutputs().some(p => {
              if ((portType as string) === 'any') return true;
              if ((p.type as string) === 'any') return true;
              if (p.type !== portType) return false;
              if (portSubtype && p.subtype && p.subtype !== portSubtype) return false;
              return true;
          });
      }
  };

  return createPortal(
      <>
        <div className="fixed inset-0 z-[9998] bg-transparent" onMouseDown={(e) => { e.stopPropagation(); setActiveHandleMenu(null); }} />
        <div className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 flex flex-col gap-0.5 w-64 animate-in fade-in zoom-in-95 duration-150 max-h-[400px] overflow-y-auto custom-scrollbar" style={{ left: handleType === 'target' ? x - 260 : x + 20, top: y - 20 }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 text-xs text-gray-400 italic mb-1 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
                {connectedEdges.length > 0 
                    ? (lang === 'zh' || lang === 'tw' ? `${connectedEdges.length} 个连接` : `${connectedEdges.length} connections`) 
                    : (lang === 'zh' || lang === 'tw' ? '无活跃连接' : 'No active connections')}
            </div>
            
            {/* Delete Connection Button (New) */}
            {connectedEdges.length > 0 && (
                <button 
                    onClick={() => {
                        // Delete all connections from this handle
                        connectedEdges.forEach(edge => onDeleteEdge?.(edge.id));
                        setActiveHandleMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 transition-colors mb-1"
                >
                    <Trash2 size={14} />
                    {lang === 'zh' || lang === 'tw' ? '断开所有连接' : 'Disconnect All'}
                </button>
            )}

            {/* --- Collapsible Quick Add Menu --- */}
            {/* 1. Agents & Logic */}
            <div className="relative mb-1">
                 {/* Header (Static) */}
                 <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                       <Command size={12} />
                       <span>{lang === 'zh' || lang === 'tw' ? '智能体 & 逻辑' : 'Agents & Logic'}</span>
                    </div>
                 </div>

                 {/* Content (Always Visible) */}
                 <div className="flex flex-col gap-0.5 pl-2">
                    {isCompatible('script_agent') && (
                        <button onClick={() => quickAdd('script_agent')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-lg flex items-center gap-2 transition-all group">
                            <Clapperboard size={14} className="text-indigo-500 group-hover:text-white dark:group-hover:text-black transition-colors"/> 
                            {t.nodeTypes.script_agent}
                        </button>
                    )}
                 </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

            {/* 2. Generators */}
            <div className="relative mb-1">
                 <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                       <Wand2 size={12} />
                       <span>{lang === 'zh' || lang === 'tw' ? '生成器' : 'Generators'}</span>
                    </div>
                 </div>
                 
                 <div className="flex flex-col gap-0.5 pl-2">
                    {isCompatible('image_gen') && (
                        <button onClick={() => quickAdd('image_gen')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-lg flex items-center gap-2 transition-all group">
                            <Palette size={14} className="text-purple-500 group-hover:text-white dark:group-hover:text-black transition-colors"/> 
                            {t.nodeTypes.image_gen}
                        </button>
                    )}
                    {isCompatible('video_gen') && (
                        <button onClick={() => quickAdd('video_gen')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-lg flex items-center gap-2 transition-all group">
                            <Video size={14} className="text-emerald-500 group-hover:text-white dark:group-hover:text-black transition-colors"/> 
                            {t.nodeTypes.video_gen}
                        </button>
                    )}
                    {isCompatible('audio_gen') && (
                        <button onClick={() => quickAdd('audio_gen')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-lg flex items-center gap-2 transition-all group">
                            <Music size={14} className="text-pink-500 group-hover:text-white dark:group-hover:text-black transition-colors"/> 
                            {t.nodeTypes.audio_gen}
                        </button>
                    )}
                    {isCompatible('video_composer') && (
                        <button onClick={() => quickAdd('video_composer')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors">
                            <Layers size={14} className="text-gray-500 dark:text-gray-400"/> {t.nodeTypes.video_composer}
                        </button>
                    )}
                    {isCompatible('sticky_note') && (
                        <button onClick={() => quickAdd('sticky_note')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors">
                            <StickyNote size={14} className="text-yellow-500"/> {t.nodeTypes.sticky_note}
                        </button>
                    )}
                    {isCompatible('image_receiver') && (
                        <button onClick={() => quickAdd('image_receiver')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors">
                            <ImageIcon size={14} className="text-teal-500"/> 图片接收器 (Receiver)
                        </button>
                    )}
                 </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

            {/* 3. Utility */}
             <div className="relative mb-1">
                 <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                       <Ghost size={12} />
                       <span>{lang === 'zh' || lang === 'tw' ? '工具' : 'Utility'}</span>
                    </div>
                 </div>
                 
                 <div className="flex flex-col gap-0.5 pl-2">
                    {isCompatible('preview') && (
                        <button onClick={() => quickAdd('preview')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-lg flex items-center gap-2 transition-all group">
                            <Eye size={14} className="text-teal-500 group-hover:text-white dark:group-hover:text-black transition-colors"/> 
                            {t.nodeTypes.preview}
                        </button>
                    )}
                 </div>
            </div>
        </div>
      </>,
      document.body
  );
};

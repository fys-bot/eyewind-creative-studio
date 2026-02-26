
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { WorkflowNode, WorkflowEdge, WorkflowNodeType, AppSettings, CommentThread, CommentMessage } from '../../types';
import { X, MousePointer2, FileText, Image as ImageIcon, Clapperboard, Palette, Video, Music, Trash2, Layers, Command, Wand2, Ghost, ScanLine, Eye, StickyNote, FolderPlus, MessageSquare, ArrowRightToLine, Sparkles, Workflow } from 'lucide-react';
import ConnectionLayer from './ConnectionLayer';
import CanvasControls from './CanvasControls';
import { translations, Language } from '../../utils/translations';
import { uploadAsset } from '../../services/storageService';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { getNodeContentHeight, getNodeWidth } from '../../utils/nodeUtils';
import { getNodePortPosition, nodeRegistry, ResourceType, ResourceSubtype } from '../../services/nodeEngine';
import NodeItem from './NodeItem';
import GroupNodeItem from './GroupNodeItem'; // Import GroupNodeItem
import ConfirmDialog from '../ui/ConfirmDialog'; // Import ConfirmDialog
import FloatingToolbar from './FloatingToolbar'; // Import FloatingToolbar
import { getCurrentUser, getProjectCommentThreads, createProjectCommentThread, addProjectCommentMessage, saveProjectCommentThreads } from '../../services/storageService';

// --- 类型定义 ---
interface CanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onConnect: (sourceId: string, targetId: string, sourceHandle?: string, targetHandle?: string) => void;
  onDeleteNode: (id: string | string[]) => void;
    onAddNode: (type: WorkflowNodeType, x: number, y: number, initialValue?: string, extraData?: any) => void;
    onDeleteEdge?: (id: string) => void;
  onInsertNode?: (edgeId: string, type: WorkflowNodeType) => void;
  onAddConnectedNode?: (sourceNodeId: string, handleType: 'source' | 'target', newNodeType: WorkflowNodeType, sourceHandle?: string, targetHandle?: string) => void;
  onUpdateNodeData: (id: string, data: any) => void;
  lang: Language;
  viewport: { x: number, y: number, zoom: number };
  onViewportChange: (newViewport: { x: number, y: number, zoom: number }) => void;
  expandedNodeId: string | null;
  onToggleExpand: (id: string) => void;
  theme: 'light' | 'dark';
  settings?: AppSettings; // Add settings prop
  onUngroupNode?: (id: string) => void; // New prop for ungrouping
  onNodeDragStateChange?: (isDragging: boolean) => void;
  onRun?: (id: string) => void; // Add onRun for toolbar
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  
  // Layer Panel Props
  isLayerPanelOpen?: boolean;
  onToggleLayerPanel?: () => void;
  focusNodes?: { ids: string[], timestamp: number } | null;
  onCreateGroup?: (nodeIds: string[]) => WorkflowNode | undefined;
  commentModeActive?: boolean;
  currentProjectId?: string | null;
  onOpenTemplates?: () => void;
  onSaveToMyWorkflows?: () => void;
  onSetCover?: (id: string, url: string) => void; // New prop
}

// --- 内部状态定义 ---
interface HandleMenuState {
    nodeId: string;
    handleType: 'source' | 'target';
    x: number;
    y: number;
    handleId?: string;
}

// --- 主画布组件 ---
const Canvas: React.FC<CanvasProps> = ({ 
  nodes, edges, selectedNodeId, onSelectNode, onMoveNode, onBatchUpdateNodes, onConnect, onDeleteNode, onAddNode, onDeleteEdge, onInsertNode, onAddConnectedNode, onUpdateNodeData, lang,
  viewport, onViewportChange, expandedNodeId, onToggleExpand, theme, settings, onUngroupNode, onNodeDragStateChange, onRun,
  onUndo, onRedo, canUndo, canRedo,
  isLayerPanelOpen, onToggleLayerPanel, focusNodes, onCreateGroup, commentModeActive = false, currentProjectId, onOpenTemplates, onSaveToMyWorkflows, onSetCover
}) => {
  const t = translations[lang];
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  
  // 连接状态
  const [connectingState, setConnectingState] = useState<{ nodeId: string, handleId: string, type: 'source' | 'target' } | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoveredHandleRef = useRef<{ nodeId: string, handleId: string, type: 'source' | 'target' } | null>(null);

  const onPortEnter = useCallback((nodeId: string, handleId: string, type: 'source' | 'target', x: number, y: number) => {
      hoveredHandleRef.current = { nodeId, handleId, type };
      if (connectingState) {
          setMousePos({ x, y });
      }
  }, [connectingState]);

  const onPortLeave = useCallback((nodeId: string, handleId: string) => {
      if (hoveredHandleRef.current?.nodeId === nodeId && hoveredHandleRef.current?.handleId === handleId) {
          hoveredHandleRef.current = null;
      }
  }, []);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, worldX: number, worldY: number } | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeMenuOpenId, setEdgeMenuOpenId] = useState<string | null>(null);
  
  // Zoom Menu State
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  
  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Welcome State Logic
  const [hasHadContent, setHasHadContent] = useState(false);

  // Reset/Init when project changes
  useEffect(() => {
      setHasHadContent(nodes.length > 0);
      setMultiSelectedIds(new Set());
      onSelectNode(null);
  }, [currentProjectId]);

  // Update when nodes exist
  useEffect(() => {
      if (nodes.length > 0 && !hasHadContent) {
          setHasHadContent(true);
      }
  }, [nodes.length]);
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadInput, setThreadInput] = useState('');
  const [draggingThreadId, setDraggingThreadId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ dx: number, dy: number } | null>(null);

  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  useEffect(() => {
    if (currentProjectId) {
      setCommentThreads(getProjectCommentThreads(currentProjectId));
    } else {
      setCommentThreads([]);
    }
  }, [currentProjectId]);
  
  useEffect(() => {
    if (!draggingThreadId) return;
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const worldX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const worldY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      const off = dragOffsetRef.current || { dx: 0, dy: 0 };
      setCommentThreads(prev => prev.map(t => t.id === draggingThreadId ? { ...t, x: worldX - off.dx, y: worldY - off.dy } : t));
    };
    const onUp = () => {
      if (currentProjectId) saveProjectCommentThreads(currentProjectId, commentThreads);
      setDraggingThreadId(null);
      dragOffsetRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingThreadId, viewport, commentThreads, currentProjectId]);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((e) => {
              console.error(`Error attempting to enable fullscreen mode: ${e.message}`);
          });
      } else {
          if (document.exitFullscreen) {
              document.exitFullscreen();
          }
      }
  };
  
  // Handle 菜单状态
  const [activeHandleMenu, setActiveHandleMenu] = useState<HandleMenuState | null>(null);
  const [deleteConfirmEdgeId, setDeleteConfirmEdgeId] = useState<string | null>(null); 

  // --- Multi-selection & Grouping State ---
  const [selectionRect, setSelectionRect] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());
  
  // Space Key State for Panning
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false); // Add Ref
  const [isShiftPressed, setIsShiftPressed] = useState(false); 
  const isShiftPressedRef = useRef(false); 
  
  // Ctrl/Meta Key State for Multi-selection
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const isCtrlPressedRef = useRef(false);

  // Highlighted Group State for Drag & Drop
  const [highlightedGroupId, setHighlightedGroupId] = useState<string | null>(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
      isOpen: boolean;
      title?: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  // Long Press Visual Indicator State
  const [longPressIndicator, setLongPressIndicator] = useState<{ x: number, y: number } | null>(null);

  // Refs for Global Listener to access latest state
  const selectionRectRef = useRef(selectionRect);
  const multiSelectedIdsRef = useRef(multiSelectedIds);
  const nodesRef = useRef(nodes);
  const expandedNodeIdRef = useRef(expandedNodeId);
  
  // Track if a drag operation just finished to prevent auto-pan
  const justFinishedDragRef = useRef(false);



  useEffect(() => {
      selectionRectRef.current = selectionRect;
      multiSelectedIdsRef.current = multiSelectedIds;
      nodesRef.current = nodes;
      expandedNodeIdRef.current = expandedNodeId;
  }, [selectionRect, multiSelectedIds, nodes, expandedNodeId]);

  const {
    draggingNodeId,
    setDraggingNodeId,
    handleMoveNodes,
    handleMouseDown,
    startDragging
  } = useCanvasInteraction({
      containerRef,
      viewport,
      onViewportChange,
      nodesRef,
      expandedNodeIdRef,
      multiSelectedIdsRef,
      selectionRectRef,
      onSelectNode,
      setMultiSelectedIds,
      setSelectionRect,
      onMoveNode,
      onBatchUpdateNodes,
      onUpdateNodeData,
      setConnectingState,
      setContextMenu,
      setActiveHandleMenu,
      setLongPressIndicator,
      setIsPinching,
      setIsZoomMenuOpen,
      isSpacePressedRef,
      isShiftPressedRef,
      isCtrlPressedRef,
      settings,
      commentModeActive,
      currentProjectId,
      createProjectCommentThread,
      setCommentThreads,
      setActiveThreadId,
      setThreadInput,
      setIsPanning
  });

  // 动画引用，用于取消
  const animationFrameRef = useRef<number | null>(null);

  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Global listener for connection dragging to ensure smooth updates even over blocking elements
  useEffect(() => {
    if (!connectingState) return;

    const handleGlobalMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Calculate world coordinates
      const worldX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const worldY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      setMousePos({ x: worldX, y: worldY });
    };

    const handleGlobalUp = (e: MouseEvent) => {
       let targetHandle = hoveredHandleRef.current;

       // Fallback: Manual hit test if no handle is hovered (e.g. mouse moved too fast)
       if (!targetHandle && connectingState) {
           const elements = document.elementsFromPoint(e.clientX, e.clientY);
           const handleEl = elements.find(el => el.classList.contains('node-handle'));
           if (handleEl) {
               const nodeId = handleEl.getAttribute('data-node-id');
               const handleId = handleEl.getAttribute('data-handle-id');
               const type = handleEl.getAttribute('data-handle-type') as 'source' | 'target';
               if (nodeId && handleId && type) {
                   targetHandle = { nodeId, handleId, type };
               }
           }
       }

       if (connectingState && targetHandle) {
           const { nodeId, handleId, type } = targetHandle;
           // Ensure valid connection (Source -> Target or Target -> Source)
           // connectingState.type is the STARTING point type.
           const isValid = (connectingState.type === 'source' && type === 'target') ||
                           (connectingState.type === 'target' && type === 'source');
           
           if (isValid) {
                if (connectingState.type === 'source') {
                    onConnect(connectingState.nodeId, nodeId, connectingState.handleId, handleId);
                } else {
                    onConnect(nodeId, connectingState.nodeId, handleId, connectingState.handleId);
                }
           }
       }
       setConnectingState(null);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [connectingState, viewport]);

  useEffect(() => {
    // Clean up multiSelectedIds if nodes are deleted
    if (multiSelectedIds.size > 0) {
        const existingIds = new Set(nodes.map(n => n.id));
        const validSelectedIds = new Set(
            Array.from(multiSelectedIds).filter(id => existingIds.has(id))
        );
        
        if (validSelectedIds.size !== multiSelectedIds.size) {
            setMultiSelectedIds(validSelectedIds);
        }
    }
  }, [nodes]); // Depend on nodes array

  useEffect(() => {
      onNodeDragStateChange?.(!!draggingNodeId);
  }, [draggingNodeId]);

  // Handle External Focus Requests
  useEffect(() => {
      if (focusNodes && focusNodes.ids.length > 0) {
          // Filter out IDs that don't exist in current nodes
          const validIds = focusNodes.ids.filter(id => nodes.some(n => n.id === id));
          
          if (validIds.length > 0) {
              smoothFitNodes(validIds);
              
              // Handle Selection
              if (validIds.length === 1) {
                  onSelectNode(validIds[0]);
                  setMultiSelectedIds(new Set([validIds[0]]));
              } else {
                  onSelectNode(null);
                  setMultiSelectedIds(new Set(validIds));
              }
          }
      }
  }, [focusNodes, nodes]);

  // 全局事件监听
  useEffect(() => {
    const handleGlobalMouseUp = (e?: any) => {
       // Selection Logic handled by useCanvasInteraction hook
       // We only keep necessary cleanup here

       setIsPanning(false);
       
       if (draggingNodeId) {
           justFinishedDragRef.current = true;
           // Reset after a short delay to allow re-selection to trigger pan if user clicks again
           setTimeout(() => { justFinishedDragRef.current = false; }, 500);
       }
       setDraggingNodeId(null);
       // setConnectingState(null); // Handled by handleGlobalUp in the connecting effect
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mouseleave', handleGlobalMouseUp);
    window.addEventListener('blur', handleGlobalMouseUp);
    
    return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mouseleave', handleGlobalMouseUp);
        window.removeEventListener('blur', handleGlobalMouseUp);
    };
  }, [draggingNodeId]); // Added draggingNodeId dependency as we use it

  // 快捷键监听
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Track Shift Key
          if (e.key === 'Shift') {
              setIsShiftPressed(true);
              isShiftPressedRef.current = true;
          }
          
          // Track Ctrl/Meta Key
          if (e.key === 'Control' || e.key === 'Meta') {
              setIsCtrlPressed(true);
              isCtrlPressedRef.current = true;
          }

          if (e.code === 'Space' && !e.repeat) {
              // Only trigger if not typing in an input
              const target = e.target as HTMLElement;
              if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
                  e.preventDefault(); // Prevent scroll
                  setIsSpacePressed(true);
                  isSpacePressedRef.current = true; // Sync ref
              }
          }

          // 检查 Ctrl 或 Command 键是否按下
          if (e.ctrlKey || e.metaKey) {
              if (e.key === '=' || e.key === '+') {
                  e.preventDefault();
                  smoothZoomTo(viewportRef.current.zoom * 1.6); // 加大幅度到 60%
              } else if (e.key === '-') {
                  e.preventDefault();
                  smoothZoomTo(viewportRef.current.zoom / 1.6); // 加大幅度
              } else if (e.key === '0') {
                  e.preventDefault();
                  smoothFitView();
              } else if (e.key === '1') {
                  e.preventDefault();
                  smoothZoomTo(1);
              }
          }
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.key === 'Shift') {
              setIsShiftPressed(false);
              isShiftPressedRef.current = false;
          }
          
          if (e.key === 'Control' || e.key === 'Meta') {
              setIsCtrlPressed(false);
              isCtrlPressedRef.current = false;
          }

          if (e.code === 'Space') {
              setIsSpacePressed(false);
              isSpacePressedRef.current = false; // Sync ref
              setIsPanning(false); // Stop panning if space released
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [nodes]); 

  const getExactHandlePosition = (nodeId: string, handleId: string | undefined, type: 'source' | 'target') => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const isExpanded = expandedNodeId === nodeId;
    // Pass current zoom to handle position calculator
    const pos = getNodePortPosition(node, handleId, type, isExpanded, viewport.zoom);
    
    let x = node.x + pos.x;
    let y = node.y + pos.y;

    // Apply offset correction for Expanded nodes (visual CSS transform shift)
    if (isExpanded) {
        const normalWidth = getNodeWidth(node, false);
        const expandedWidth = 600; // Matches nodeUtils.ts
        const deltaW = expandedWidth - normalWidth;
        
        // NodeItem applies transform: translate(-deltaW/2, -20px)
        x -= deltaW / 2;
        y -= 20;
    }

    return { x, y };
  };

  const onHandleClick = (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => {
    setActiveHandleMenu({ nodeId, handleType, x: clientX, y: clientY, handleId });
    setDeleteConfirmEdgeId(null);
  };

  // --- 丝滑缩放逻辑 ---

  const smoothZoomTo = (targetZoom: number, center?: { x: number, y: number }) => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      const rect = containerRef.current?.getBoundingClientRect();
      const w = rect ? rect.width : window.innerWidth;
      const h = rect ? rect.height : window.innerHeight;
      
      const cX = center ? center.x : w / 2;
      const cY = center ? center.y : h / 2;

      const startZoom = viewportRef.current.zoom;
      const startX = viewportRef.current.x;
      const startY = viewportRef.current.y;

      const clampedTargetZoom = Math.min(Math.max(targetZoom, 0.1), 5);
      
      const ratio = clampedTargetZoom / startZoom;
      const targetX = cX - (cX - startX) * ratio;
      const targetY = cY - (cY - startY) * ratio;

      const startTime = performance.now();
      const duration = 250; 

      const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3); 

          const nextZoom = startZoom + (clampedTargetZoom - startZoom) * ease;
          const nextX = startX + (targetX - startX) * ease;
          const nextY = startY + (targetY - startY) * ease;

          onViewportChange({ x: nextX, y: nextY, zoom: nextZoom });

          if (progress < 1) {
              animationFrameRef.current = requestAnimationFrame(animate);
          }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
  };

  const smoothPanTo = (targetX: number, targetY: number) => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      const startX = viewportRef.current.x;
      const startY = viewportRef.current.y;
      
      const startTime = performance.now();
      const duration = 300;

      const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);

          onViewportChange({
              x: startX + (targetX - startX) * ease,
              y: startY + (targetY - startY) * ease,
              zoom: viewportRef.current.zoom
          });

          if (progress < 1) {
              animationFrameRef.current = requestAnimationFrame(animate);
          }
      };
      requestAnimationFrame(animate);
  };

  // Auto-pan logic removed as per user request ("点击NODE的时候还是不要移动画布，会很乱")
  /*
  useEffect(() => {
      if (!selectedNodeId) return;
      if (draggingNodeId) return;
      if (justFinishedDragRef.current) return; 

      const node = nodesRef.current.find(n => n.id === selectedNodeId);
      if (!node) return;
      
      if (multiSelectedIds.size > 1) return;

      const currentViewport = viewportRef.current;
      const zoom = currentViewport.zoom;
      
      const nodeW = getNodeWidth(node, expandedNodeIdRef.current === node.id);
      const nodeH = getNodeContentHeight(node, nodeW) + 40;

      const screenNodeTop = node.y * zoom + currentViewport.y;
      const screenNodeBottom = (node.y + nodeH) * zoom + currentViewport.y;
      const screenNodeLeft = node.x * zoom + currentViewport.x;
      const screenNodeRight = (node.x + nodeW) * zoom + currentViewport.x;

      const winH = window.innerHeight;
      const winW = window.innerWidth;

      const REQUIRED_BOTTOM_SPACE = 380; 
      const REQUIRED_TOP_SPACE = 100;
      const REQUIRED_SIDE_SPACE = 220; 

      let targetX = currentViewport.x;
      let targetY = currentViewport.y;
      let needsPan = false;

      if (winH - screenNodeBottom < REQUIRED_BOTTOM_SPACE) {
          targetY = winH - REQUIRED_BOTTOM_SPACE - ((node.y + nodeH) * zoom);
          needsPan = true;
      }
      
      if (screenNodeTop < REQUIRED_TOP_SPACE) {
           const proposedY = REQUIRED_TOP_SPACE - (node.y * zoom);
           const screenH = nodeH * zoom;
           if (screenH + REQUIRED_TOP_SPACE + REQUIRED_BOTTOM_SPACE <= winH) {
               if (!needsPan || (needsPan && targetY > proposedY)) { 
                   targetY = proposedY;
                   needsPan = true;
               }
           }
      }

      if (screenNodeLeft < REQUIRED_SIDE_SPACE) {
           targetX = REQUIRED_SIDE_SPACE - (node.x * zoom);
           needsPan = true;
      } else if (winW - screenNodeRight < REQUIRED_SIDE_SPACE) {
           targetX = winW - REQUIRED_SIDE_SPACE - ((node.x + nodeW) * zoom);
           needsPan = true;
      }

      if (needsPan) {
          if (Math.abs(targetX - currentViewport.x) > 5 || Math.abs(targetY - currentViewport.y) > 5) {
              smoothPanTo(targetX, targetY);
          }
      }

  }, [selectedNodeId, nodes, draggingNodeId]); 
  */

  const smoothFitView = () => {
      if (nodes.length === 0) {
          smoothZoomTo(1);
          return;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(node => {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          maxX = Math.max(maxX, node.x + 400); 
          maxY = Math.max(maxY, node.y + 300);
      });

      fitBounds(minX, minY, maxX, maxY);
  };

  const smoothFitNodes = (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      
      const targetNodes = nodes.filter(n => nodeIds.includes(n.id));
      if (targetNodes.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      targetNodes.forEach(node => {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          
          const w = node.type === 'group' ? (node.data.settings?.width || 400) : getNodeWidth(node, expandedNodeIdRef.current === node.id);
          const h = node.type === 'group' ? (node.data.settings?.height || 300) : (getNodeContentHeight(node, w) + 40);
          
          maxX = Math.max(maxX, node.x + w);
          maxY = Math.max(maxY, node.y + h);
      });

      fitBounds(minX, minY, maxX, maxY);
  };

  const fitBounds = (minX: number, minY: number, maxX: number, maxY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const w = rect ? rect.width : window.innerWidth;
      const h = rect ? rect.height : window.innerHeight;
      const padding = 100;

      const boundsW = maxX - minX;
      const boundsH = maxY - minY;

      if (boundsW <= 0 || boundsH <= 0) return;

      const scaleX = (w - padding * 2) / boundsW;
      const scaleY = (h - padding * 2) / boundsH;
      const targetScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 2);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const targetX = (w / 2) - (centerX * targetScale);
      const targetY = (h / 2) - (centerY * targetScale);

      const startZoom = viewportRef.current.zoom;
      const startX = viewportRef.current.x;
      const startY = viewportRef.current.y;
      
      const startTime = performance.now();
      const duration = 350;

      const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);

          onViewportChange({
              x: startX + (targetX - startX) * ease,
              y: startY + (targetY - startY) * ease,
              zoom: startZoom + (targetScale - startZoom) * ease
          });

          if (progress < 1) {
              requestAnimationFrame(animate);
          }
      };
      requestAnimationFrame(animate);
  };




  // --- Drag & Drop from Sidebar ---
  const onDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      const types = Array.from(event.dataTransfer.types || []);
      const isFileDragging = types.includes('Files');
      event.dataTransfer.dropEffect = isFileDragging ? 'copy' : 'move';

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const currentViewport = viewportRef.current;
      const currentNodes = nodesRef.current;
      
      const worldX = (event.clientX - rect.left - currentViewport.x) / currentViewport.zoom;
      const worldY = (event.clientY - rect.top - currentViewport.y) / currentViewport.zoom;

      // Find intersecting group
      // Logic: Find all groups containing the point, pick the smallest one (most specific)
      const groups = currentNodes.filter(n => n.type === 'group');
      
      let targetGroupId: string | null = null;
      let minArea = Infinity;

      groups.forEach(g => {
          const w = g.data.settings?.width || 400;
          const h = g.data.settings?.height || 300;
          
          // Add a small buffer (hitbox padding) to make it easier to trigger
          const buffer = 20;
          
          if (
              worldX >= g.x - buffer && 
              worldX <= g.x + w + buffer && 
              worldY >= g.y - buffer && 
              worldY <= g.y + h + buffer
          ) {
              const area = w * h;
              if (area < minArea) {
                  minArea = area;
                  targetGroupId = g.id;
              }
          }
      });

      // Only update state if it changed to avoid excessive re-renders
      setHighlightedGroupId(prev => (prev !== targetGroupId ? targetGroupId : prev));
  }, []);
  
  const onDragLeave = useCallback((event: React.DragEvent) => {
      // Avoid clearing if entering a child element within the canvas
      if (event.relatedTarget && containerRef.current?.contains(event.relatedTarget as Node)) {
          return;
      }
      setHighlightedGroupId(null);
  }, []);

  const onDrop = useCallback(
      async (event: React.DragEvent) => {
          event.preventDefault();
          setHighlightedGroupId(null);

          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;

          const baseX = (event.clientX - rect.left - viewport.x) / viewport.zoom;
          const baseY = (event.clientY - rect.top - viewport.y) / viewport.zoom;

          const fileList = event.dataTransfer.files as FileList;
          const files: File[] = fileList ? Array.from(fileList) : [];
          const imageFiles: File[] = files.filter((f: File) => f && typeof (f as any).type === 'string' && (f as any).type.startsWith('image/'));

          if (imageFiles.length > 0) {
              let offset = 0;
              for (const file of imageFiles) {
                  try {
                      const url = await uploadAsset(file);
                      // Try to compute image ratio to improve sizing
                      let extraData: any = undefined;
                      try {
                          const img = new Image();
                          img.src = url;
                          await new Promise<void>((resolve) => {
                              img.onload = () => resolve();
                              img.onerror = () => resolve();
                          });
                          if (img.width && img.height) {
                              extraData = { settings: { imageRatio: img.width / img.height } };
                          }
                      } catch {}

                      onAddNode('image_input', baseX + offset, baseY + offset, url, extraData);
                      offset += 24;
                  } catch (e) {
                      console.error('Failed to handle dropped image', e);
                  }
              }
              return;
          }

          const type = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;
          if (typeof type === 'undefined' || !type) {
              return;
          }

          onAddNode(type, baseX, baseY);
      },
      [viewport, onAddNode]
  );

  // Figma 级滚轮逻辑
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        const currentViewport = viewportRef.current;

        if (e.ctrlKey || e.metaKey) {
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let delta = e.deltaY;
            if (e.deltaMode === 1) delta *= 40;
            if (e.deltaMode === 2) delta *= 800;

            const baseSensitivity = 0.006;
            const sensitivity = settings?.zoomSensitivity || 1.0;
            const factor = Math.exp(-delta * baseSensitivity * sensitivity);
            
            const newZoom = Math.min(Math.max(currentViewport.zoom * factor, 0.1), 10);

            const scaleFactor = newZoom / currentViewport.zoom;
            const newX = mouseX - (mouseX - currentViewport.x) * scaleFactor;
            const newY = mouseY - (mouseY - currentViewport.y) * scaleFactor;

            onViewportChange({ x: newX, y: newY, zoom: newZoom });
        } else {
            onViewportChange({ 
                ...currentViewport, 
                x: currentViewport.x - e.deltaX, 
                y: currentViewport.y - e.deltaY 
            });
        }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [onViewportChange]); 

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const worldY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
    setMousePos({ x: worldX, y: worldY });
  };



  const renderContextMenu = () => {
      if (!contextMenu) return null;
      
      const add = (type: WorkflowNodeType) => {
          onAddNode(type, contextMenu.worldX, contextMenu.worldY); 
          setContextMenu(null);
      }

      return createPortal(
        <>
           <div className="fixed inset-0 z-[9998] bg-transparent" onMouseDown={(e) => { e.stopPropagation(); setContextMenu(null); }} />
           <div className="fixed bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-64 z-[9999] animate-in fade-in zoom-in-95 duration-100 overflow-hidden p-2 flex flex-col gap-0.5 max-h-[400px] overflow-y-auto custom-scrollbar" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
              <div className="bg-white dark:bg-gray-800 px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t.addNode}</div>
              
              <button onClick={() => add('text_input')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"><FileText size={14} className="text-blue-500"/> {t.nodeTypes.text_input}</button>
              <button onClick={() => add('image_input')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"><ImageIcon size={14} className="text-amber-500"/> {t.nodeTypes.image_input}</button>
              
              <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
              
              <button onClick={() => add('script_agent')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"><Clapperboard size={14} className="text-indigo-500"/> {t.nodeTypes.script_agent}</button>
              <button onClick={() => add('image_gen')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"><Palette size={14} className="text-purple-500"/> {t.nodeTypes.image_gen}</button>
              <button onClick={() => add('video_gen')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"><Video size={14} className="text-emerald-500"/> {t.nodeTypes.video_gen}</button>
              <button onClick={() => add('audio_gen')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"><Music size={14} className="text-pink-500"/> {t.nodeTypes.audio_gen}</button>

              <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

              <button onClick={() => add('video_composer')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"><Layers size={14} className="text-gray-500 dark:text-gray-400"/> {t.nodeTypes.video_composer}</button>
              <button onClick={() => add('sticky_note')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"><StickyNote size={14} className="text-yellow-500"/> {t.nodeTypes.sticky_note}</button>
              <button onClick={() => add('image_receiver')} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"><ImageIcon size={14} className="text-teal-500"/> 图片接收器 (Receiver)</button>
              
              <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
              {onSaveToMyWorkflows && (
                <button onClick={() => { onSaveToMyWorkflows(); setContextMenu(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg flex items-center gap-2 transition-colors">
                  <FolderPlus size={14} className="text-purple-500"/> {lang === 'zh' || lang === 'tw' ? '保存为模板' : 'Save as Template'}
                </button>
              )}
           </div>
        </>,
        document.body
      );
  };

  const renderHandleMenu = () => {
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

  const gridOpacity = settings?.gridOpacity || 0.05;
  const gridColor = theme === 'dark' ? `rgba(255,255,255,${gridOpacity})` : `rgba(0,0,0,${gridOpacity})`;
  const showGrid = settings?.showGrid !== false; // Default true
  const gridType = settings?.gridType || 'dots';

  let backgroundImage = 'none';
  if (showGrid) {
      if (gridType === 'dots') backgroundImage = `radial-gradient(${gridColor} 1.5px, transparent 1.5px)`;
      else if (gridType === 'lines') backgroundImage = `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`;
      else if (gridType === 'cross') backgroundImage = `radial-gradient(${gridColor} 1px, transparent 1px)`; // Simple cross approximation or use SVG
  }
  
  // Refined Grid Logic
  const getGridBackground = () => {
      if (!showGrid) return 'none';
      if (gridType === 'lines') {
          return `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`;
      } else if (gridType === 'cross') {
         // Plus pattern
         return `
            linear-gradient(90deg, ${gridColor} 1px, transparent 0, transparent 19px, ${gridColor} 20px),
            linear-gradient(0deg, ${gridColor} 1px, transparent 0, transparent 19px, ${gridColor} 20px)
         `; 
      } else if (gridType === 'texture') {
          return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`;
      } else if (gridType === 'blueprint') {
          return `
              linear-gradient(${gridColor} 0.5px, transparent 0.5px),
              linear-gradient(90deg, ${gridColor} 0.5px, transparent 0.5px),
              linear-gradient(${gridColor} 1px, transparent 1px),
              linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
          `;
      }
      return `radial-gradient(${gridColor} 1.5px, transparent 1.5px)`;
  };

  const performanceThreshold = settings?.performanceModeThreshold ?? 1.0;
  const isPerformanceMode = viewport.zoom > performanceThreshold;

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 z-0 overflow-hidden ${isPinching ? 'pinch-zoom-active' : ''} ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : (isPanning ? 'cursor-grabbing' : 'cursor-default')}`}
      style={{
          backgroundColor: theme === 'dark' ? '#09090b' : '#f8f9fa',
          backgroundImage: getGridBackground(),
          backgroundSize: gridType === 'lines' ? '24px 24px' : gridType === 'blueprint' ? '100px 100px, 100px 100px, 20px 20px, 20px 20px' : '24px 24px', 
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          touchAction: 'none', // CRITICAL: Force disable browser gestures
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div 
        className="origin-top-left absolute top-0 left-0"
        style={{ 
            transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
            backfaceVisibility: 'hidden',
            // Revert imageRendering to 'auto' or 'high-quality' (default) as 'pixelated' causes jaggies on text/vectors
            // 'optimizeQuality' is deprecated but standard browser behavior is usually best for mixed content
            // The real fix for blurriness is often ensuring initial scale is 1 and using high-res assets, 
            // or just letting the browser do its bicubic interpolation. 
            // 'pixelated' is only good for pixel art.
            imageRendering: isPerformanceMode ? 'pixelated' : 'auto',
            willChange: isPerformanceMode ? 'transform' : 'auto',
        }}
      >
        <ConnectionLayer
            nodes={nodes}
            edges={edges}
            viewport={viewport}
            theme={theme}
            hoveredEdgeId={hoveredEdgeId}
            selectedEdgeId={selectedEdgeId}
            setHoveredEdgeId={setHoveredEdgeId}
            setSelectedEdgeId={setSelectedEdgeId}
            setEdgeMenuOpenId={setEdgeMenuOpenId}
            connectingState={connectingState}
            mousePos={mousePos}
            expandedNodeId={expandedNodeId}
            performanceMode={isPerformanceMode}
        />



        {/* 1. Render Group Nodes First (Bottom Layer) */}
        {nodes.filter(n => n.type === 'group').map(node => (
            <GroupNodeItem
                key={node.id}
                node={node}
                zoom={viewport.zoom}
                selected={multiSelectedIds.has(node.id) || selectedNodeId === node.id}
                isHighlighted={highlightedGroupId === node.id}
                isMultiSelection={multiSelectedIds.size > 1} // Pass multi-selection state
                onStartDrag={startDragging}
                onClick={(e) => {
                    e.stopPropagation();
                    
                    // Group selection logic
                    const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey || isShiftPressedRef.current || isCtrlPressedRef.current;
                    
                    if (isMultiSelect) {
                        const newSet = new Set(multiSelectedIds);
                        if (newSet.has(node.id)) newSet.delete(node.id);
                        else newSet.add(node.id);
                        setMultiSelectedIds(newSet);

                        // If multiple items selected, hide global toolbar
                        if (newSet.size > 1) {
                            onSelectNode(null);
                        } else if (newSet.size === 1) {
                            onSelectNode(Array.from(newSet)[0]);
                        } else {
                            onSelectNode(null);
                        }
                    } else {
                         onSelectNode(node.id);
                         setMultiSelectedIds(new Set([node.id]));
                    }
                }}
                onUpdateLabel={(id, newLabel) => onUpdateNodeData(id, { label: newLabel })}
                onUngroup={onUngroupNode}
                onDelete={(id) => onDeleteNode(id)} 
                onDeleteGroupContent={(groupId) => {
                    // Find all children
                    const children = nodes.filter(n => n.parentId === groupId);
                    const childrenIds = children.map(n => n.id);
                    
                    const confirmMsg = lang === 'zh' || lang === 'tw' 
                        ? `确定要删除该群组吗？\n将删除群组框及其内部的 ${childrenIds.length} 个节点。`
                        : `Are you sure you want to delete this group?\nThis will delete the group frame and ${childrenIds.length} nodes inside.`;
                    
                    setConfirmDialog({
                        isOpen: true,
                        title: lang === 'zh' || lang === 'tw' ? '删除群组' : 'Delete Group',
                        message: confirmMsg,
                        onConfirm: () => {
                            // Delete group AND children
                            onDeleteNode([...childrenIds, groupId]);
                            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        }
                    });
                }}
                settings={settings}
            />
        ))}

        {/* 2. Render Pro Nodes (Headless, Direct Child) - REMOVED */}
        {/* Regular nodes will handle these types now */}

        {/* 3. Render Regular Nodes */}
        <AnimatePresence>
        {nodes.filter(n => n.type !== 'group').map(node => (
          <NodeItem
            key={node.id}
            node={node}
            zoom={viewport.zoom} 
            viewport={viewport} // Pass viewport for delete animation
            selected={multiSelectedIds.has(node.id) || selectedNodeId === node.id} 
            isExpanded={expandedNodeId === node.id}
            isConnecting={!!connectingState}
            isMultiSelection={multiSelectedIds.size > 1} // Pass multi-selection state
            onToggleExpand={onToggleExpand}
            onRegisterHandles={() => {}} 
            onSelect={(id, e) => {
                if (id) {
                    // Check Shift OR Ctrl/Meta Key
                    const isMultiSelect = e?.shiftKey || e?.ctrlKey || e?.metaKey || isShiftPressedRef.current || isCtrlPressedRef.current;
                    
                    if (isMultiSelect) {
                        const newSet = new Set(multiSelectedIds);
                        if (newSet.has(id)) newSet.delete(id);
                        else newSet.add(id);
                        setMultiSelectedIds(newSet);
                        
                        // If multiple items selected, hide global toolbar (by selecting null)
                        if (newSet.size > 1) {
                            onSelectNode(null);
                        } else if (newSet.size === 1) {
                            onSelectNode(Array.from(newSet)[0]);
                        } else {
                            onSelectNode(null);
                        }
                    } else {
                        onSelectNode(id);
                        if (!multiSelectedIds.has(id)) {
                             setMultiSelectedIds(new Set([id]));
                        }
                    }
                } else {
                    onSelectNode(null);
                    if (!isShiftPressedRef.current && !isCtrlPressedRef.current) {
                        setMultiSelectedIds(new Set());
                    }
                }
            }}
            onDelete={onDeleteNode}
            onStartDrag={startDragging}
            onStartConnect={(id, handleId, clientX, clientY) => {
                setConnectingState({ nodeId: id, handleId, type: 'source' });
                // Initialize mousePos immediately to avoid jump
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const worldX = (clientX - rect.left - viewport.x) / viewport.zoom;
                    const worldY = (clientY - rect.top - viewport.y) / viewport.zoom;
                    setMousePos({ x: worldX, y: worldY });
                }
            }}
            onConnectTo={(targetId, targetHandleId) => {
                if(connectingState) {
                    onConnect(connectingState.nodeId, targetId, connectingState.handleId, targetHandleId);
                    setConnectingState(null);
                }
            }}
            onHandleClick={onHandleClick} 
            onUpdateData={(id, data) => onUpdateNodeData(id, data)}
            t={t}
            settings={settings}
            onSetCover={onSetCover}
            onAddNode={onAddNode}
            onPortEnter={onPortEnter}
            onPortLeave={onPortLeave}
            />
          ))}
        </AnimatePresence>
        
        {commentThreads.map(thread => (
          <div 
            key={thread.id}
            className="absolute group"
            style={{ left: thread.x, top: thread.y }}
          >
            <button
              onMouseEnter={(e) => { e.stopPropagation(); setActiveThreadId(thread.id); }}
              onMouseLeave={(e) => { e.stopPropagation(); if (!draggingThreadId) setActiveThreadId(prev => prev === thread.id ? null : prev); }}
              onMouseDown={(e) => {
                e.stopPropagation();
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const worldX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
                const worldY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
                dragOffsetRef.current = { dx: worldX - thread.x, dy: worldY - thread.y };
                setDraggingThreadId(thread.id);
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 ${activeThreadId === thread.id ? 'bg-black text-white border-black shadow-lg scale-110' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:shadow-md hover:scale-110'}`}
              title="Comment"
            >
              <MessageSquare size={12}/>
            </button>
            {activeThreadId === thread.id && (
              <div className="mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{lang === 'zh' || lang === 'tw' ? '评论' : 'Comments'}</span>
                  <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" onClick={(e) => { e.stopPropagation(); setActiveThreadId(null); }}><X size={12} className="text-gray-400"/></button>
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                  {thread.messages.length === 0 && (
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-2">{lang === 'zh' || lang === 'tw' ? '暂无消息' : 'No messages'}</div>
                  )}
                  {thread.messages.map(m => (
                    <div key={m.id} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300">{m.authorName.slice(0,1).toUpperCase()}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{m.authorName}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(m.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">{m.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative mt-2">
                  <input 
                    value={threadInput}
                    onChange={(e) => setThreadInput(e.target.value.slice(0,200))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && currentProjectId && threadInput.trim()) {
                        const user = getCurrentUser();
                        const msg: CommentMessage = { id: Math.random().toString(36).slice(2), authorId: user?.id, authorName: user?.name || 'Guest', text: threadInput.trim(), timestamp: Date.now() };
                        const updated = addProjectCommentMessage(currentProjectId, thread.id, msg);
                        setCommentThreads(updated);
                        setThreadInput('');
                      }
                    }}
                    placeholder={lang === 'zh' || lang === 'tw' ? '回复...' : 'Reply...'}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs px-2 py-1 pr-8 outline-none text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">{threadInput.length}/200</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentProjectId && threadInput.trim()) {
                        const user = getCurrentUser();
                        const msg: CommentMessage = { id: Math.random().toString(36).slice(2), authorId: user?.id, authorName: user?.name || 'Guest', text: threadInput.trim(), timestamp: Date.now() };
                        const updated = addProjectCommentMessage(currentProjectId, thread.id, msg);
                        setCommentThreads(updated);
                        setThreadInput('');
                      }
                    }}
                    disabled={!threadInput.trim()}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center disabled:opacity-50"
                  >
                    <ArrowRightToLine size={12}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Render Toolbar Inside Canvas World for Perfect Sync */}
        {(() => {
            const selectedNode = nodes.find(n => n.id === selectedNodeId);
            // Hide FloatingToolbar for Pro Nodes (pro_icon_gen, pro_art_director) and Text Input nodes (now inline)
            if (selectedNode && 
                selectedNode.type !== 'group' && 
                selectedNode.type !== 'pro_icon_gen' && 
                selectedNode.type !== 'pro_art_director' && 
                selectedNode.type !== 'text_input' &&
                selectedNode.type !== 'icon_prompt' &&
                onRun) {
                return (
                    <FloatingToolbar 
                        node={selectedNode}
                        nodes={nodes}
                        edges={edges}
                        updateNodeData={(data) => onUpdateNodeData(selectedNode.id, data)}
                        onRun={() => onRun?.(selectedNode.id)}
                        lang={lang}
                        viewport={viewport}
                        isExpanded={expandedNodeId === selectedNode.id}
                        onAddConnectedNode={onAddConnectedNode}
                        isConnecting={!!connectingState}
                        onAddNode={onAddNode}
                        onDeleteEdge={onDeleteEdge}
                        onConnect={onConnect}
                    />
                );
            }
            return null;
        })()}


         {/* 5. Global Style for Touch Action & Pinch Guard */}
       <style>{`
           .react-flow__node, .node-item, .node-handle, input, textarea, button, .group-node {
               touch-action: none !important;
           }
           .pinch-zoom-active input,
           .pinch-zoom-active textarea,
           .pinch-zoom-active button,
           .pinch-zoom-active [contenteditable="true"] {
               pointer-events: none !important;
           }
       `}</style>

      {/* 3. Render Selection Rect */}
        {/* Render OUTSIDE the scaled container to avoid double transform issues */}
      </div>
        {/* Welcome Empty State Overlay */}
        {nodes.length === 0 && !hasHadContent && (
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30 bg-transparent">
                <div className="flex flex-col items-center gap-12 animate-in fade-in zoom-in-95 duration-500">
                     {/* Double Click Hint */}
                     <div className="pointer-events-auto flex items-center gap-4 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl pl-1 pr-6 py-1.5 rounded-full shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full text-xs font-bold">
                            <MousePointer2 size={12} className="fill-current" />
                            {lang === 'zh' || lang === 'tw' ? '双击' : 'Double Click'}
                        </div>
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300 tracking-wide">
                            {lang === 'zh' || lang === 'tw' ? '画布自由生成，或查看工作流模板' : 'Double click to generate, or view templates'}
                        </span>
                     </div>

                     {/* Quick Action Buttons - Horizontal Cards, Grey/White Theme */}
                     <div className="pointer-events-auto flex items-center gap-4">
                         {[
                             { icon: <Video size={24}/>, label: lang === 'zh' || lang === 'tw' ? '文字生视频' : 'Text to Video', type: 'video_gen' },
                             { icon: <ScanLine size={24}/>, label: lang === 'zh' || lang === 'tw' ? '图片换背景' : 'Remove BG', type: 'image_gen' },
                             { icon: <Sparkles size={24}/>, label: lang === 'zh' || lang === 'tw' ? '首帧生成视频' : 'Img to Video', type: 'video_gen' },
                             { icon: <Music size={24}/>, label: lang === 'zh' || lang === 'tw' ? '音频生视频' : 'Audio to Video', type: 'audio_gen' },
                             { icon: <Workflow size={24}/>, label: lang === 'zh' || lang === 'tw' ? '工作流' : 'Workflow', action: 'workflow' }
                         ].map((item, i) => (
                             <button 
                                key={i}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.action === 'workflow') {
                                        if (onOpenTemplates) onOpenTemplates();
                                    } else if (item.type) {
                                        const rect = containerRef.current?.getBoundingClientRect();
                                        if (rect) {
                                            const cx = (rect.width / 2 - viewport.x) / viewport.zoom;
                                            const cy = (rect.height / 2 - viewport.y) / viewport.zoom;
                                            onAddNode(item.type as WorkflowNodeType, cx, cy);
                                        }
                                    }
                                }}
                                className="group relative flex flex-col items-center justify-center gap-4 w-40 h-40 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                             >
                                 <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors duration-300">
                                     {item.icon}
                                 </div>
                                 <span 
                                     className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors tracking-widest px-2 text-center"
                                 >
                                     {item.label}
                                 </span>
                             </button>
                         ))}

                     </div>
                </div>
            </div>
        )}
      
      {selectionRect && (
            <div 
                className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-[50]"
                style={{
                    left: Math.min(selectionRect.startX * viewport.zoom + viewport.x, selectionRect.currentX * viewport.zoom + viewport.x),
                    top: Math.min(selectionRect.startY * viewport.zoom + viewport.y, selectionRect.currentY * viewport.zoom + viewport.y),
                    width: Math.abs((selectionRect.currentX - selectionRect.startX) * viewport.zoom),
                    height: Math.abs((selectionRect.currentY - selectionRect.startY) * viewport.zoom),
                }}
            />
        )}

      {/* 4. Group Action Menu */}
      {renderContextMenu()}
      {renderHandleMenu()}
      
      <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          isDanger={true}
          confirmText={lang === 'zh' || lang === 'tw' ? '确认' : 'Confirm'}
          cancelText={lang === 'zh' || lang === 'tw' ? '取消' : 'Cancel'}
      />

      {/* --- Layer Panel Trigger (Top Left) --- */}
      {/* Moved to Sidebar, removing from here */}
      <div className="fixed top-24 left-6 z-[100] flex flex-col gap-2 pointer-events-auto select-none" onMouseDown={(e) => e.stopPropagation()}>
          <div className="relative">
              
              {/* Layer Panel Popover - Removed from here, moved to Sidebar */}
          </div>
      </div>

      {/* 4. Multi-Select Actions Toolbar */}
      {multiSelectedIds.size > 1 && !draggingNodeId && (
        <div 
            key={`selection-toolbar-${multiSelectedIds.size}`}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-200 pointer-events-none"
        >
             {/* Group Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    const groupNode = onCreateGroup(Array.from(multiSelectedIds));
                    if (groupNode) {
                         setMultiSelectedIds(new Set([groupNode.id]));
                         onSelectNode(groupNode.id);
                    }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="pointer-events-auto flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-black dark:bg-white dark:text-black rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
                <Layers size={16} />
                {lang === 'zh' ? '编组' : 'Group'}
                <span className="opacity-60 text-xs ml-0.5 font-normal">({multiSelectedIds.size})</span>
            </button>

             {/* Delete Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    const count = multiSelectedIds.size;
                    const confirmMsg = lang === 'zh' || lang === 'tw' 
                        ? `确定要删除这 ${count} 个节点吗？\n此操作无法恢复！`
                        : `Are you sure you want to delete these ${count} nodes?\nThis action cannot be undone!`;
                    
                    const title = lang === 'zh' || lang === 'tw' ? '确认删除' : 'Confirm Delete';

                    setConfirmDialog({
                        isOpen: true,
                        title,
                        message: confirmMsg,
                        onConfirm: () => {
                            onDeleteNode(Array.from(multiSelectedIds));
                            setMultiSelectedIds(new Set());
                            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        }
                    });
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="pointer-events-auto flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-red-500 rounded-full shadow-2xl shadow-red-500/20 hover:bg-red-600 hover:scale-105 active:scale-95 transition-all"
            >
                <Trash2 size={16} />
                {lang === 'zh' ? '删除' : 'Delete'}
                <span className="opacity-80 text-xs ml-0.5 font-normal">({multiSelectedIds.size})</span>
            </button>
        </div>
      )}

      {/* --- Zoom Controls (Fixed z-index and interaction) --- */}
      <CanvasControls
          lang={lang}
          viewport={viewport}
          onZoom={(z) => smoothZoomTo(z)}
          onFitView={smoothFitView}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          isZoomMenuOpen={isZoomMenuOpen}
          setZoomMenuOpen={setIsZoomMenuOpen}
      />

      {/* Long Press Indicator */}
      {longPressIndicator && (
          <div 
            className="fixed w-16 h-16 rounded-full bg-blue-500/30 border-2 border-blue-500 animate-ping pointer-events-none z-[9999]"
            style={{ 
                left: longPressIndicator.x - 32, 
                top: longPressIndicator.y - 32 
            }}
          />
      )}
    </div>
  );
};

export default Canvas;

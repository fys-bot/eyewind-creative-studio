import React, { useRef, useEffect, useState, useCallback, MutableRefObject } from 'react';
import { WorkflowNode, WorkflowNodeType, AppSettings } from '../../../types';
import { getNodeWidth, getNodeContentHeight } from '../../../utils/nodeUtils';

interface UseCanvasInteractionProps {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  viewport: { x: number; y: number; zoom: number };
  onViewportChange: (newViewport: { x: number; y: number; zoom: number }) => void;
  nodesRef: MutableRefObject<WorkflowNode[]>;
  expandedNodeIdRef: MutableRefObject<string | null>;
  multiSelectedIdsRef: MutableRefObject<Set<string>>;
  selectionRectRef: MutableRefObject<{ startX: number, startY: number, currentX: number, currentY: number } | null>;
  
  onSelectNode: (id: string | null) => void;
  setMultiSelectedIds: (ids: Set<string>) => void;
  setSelectionRect: React.Dispatch<React.SetStateAction<{ startX: number, startY: number, currentX: number, currentY: number } | null>>;
  
  onMoveNode: (id: string, x: number, y: number) => void;
  onBatchUpdateNodes?: (updates: { id: string; x?: number; y?: number; data?: any }[]) => void;
  onUpdateNodeData: (id: string, data: any) => void;
  
  setConnectingState: (state: any) => void;
  setContextMenu: (menu: any) => void;
  setActiveHandleMenu: (menu: any) => void;
  setLongPressIndicator: (indicator: { x: number; y: number } | null) => void;
  setIsPinching: (isPinching: boolean) => void;
  setIsZoomMenuOpen: (isOpen: boolean) => void;
  
  isSpacePressedRef: MutableRefObject<boolean>;
  isShiftPressedRef: MutableRefObject<boolean>;
  isCtrlPressedRef: MutableRefObject<boolean>;
  
  settings?: AppSettings;
  
  commentModeActive?: boolean;
  currentProjectId?: string | null;
  createProjectCommentThread?: any;
  setCommentThreads?: any;
  setActiveThreadId?: any;
  setThreadInput?: any;
  setIsPanning: (isPanning: boolean) => void;
}

export const useCanvasInteraction = ({
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
}: UseCanvasInteractionProps) => {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Animation frame ref for zoom/pan
  const animationFrameRef = useRef<number | null>(null);

  // Drag State Cache
  const dragStateRef = useRef<{
      movingNodeIds: Set<string>;
      affectedGroupIds: Set<string>;
      groupChildren: Map<string, string[]>;
  } | null>(null);

  const prepareDrag = useCallback((nodeId: string) => {
      const currentNodes = nodesRef.current;
      const currentMultiSelectedIds = multiSelectedIdsRef.current;
      
      const nodesToMove = new Set<string>();
      
      // 1. Determine moving nodes
      if (currentMultiSelectedIds.has(nodeId)) {
          currentMultiSelectedIds.forEach((id: string) => nodesToMove.add(id));
      } else {
          nodesToMove.add(nodeId);
      }
      
      // 2. Expand groups (include children)
      const initialIds = Array.from(nodesToMove);
      initialIds.forEach(id => {
          const node = currentNodes.find((n: WorkflowNode) => n.id === id);
          if (node && node.type === 'group') {
              for (const child of currentNodes) {
                  if (child.parentId === node.id) {
                      nodesToMove.add(child.id);
                  }
              }
          }
      });
      
      // 3. Find affected groups (parents of moving nodes)
      const affectedGroupIds = new Set<string>();
      nodesToMove.forEach(id => {
           const node = currentNodes.find((n: WorkflowNode) => n.id === id);
           if (node && node.parentId) affectedGroupIds.add(node.parentId);
      });
      
      // 4. Cache children for affected groups (to avoid searching on every move)
      const groupChildren = new Map<string, string[]>();
      affectedGroupIds.forEach((gId: string) => {
          const childrenIds: string[] = [];
          for (const n of currentNodes) {
              if (n.parentId === gId) childrenIds.push(n.id);
          }
          groupChildren.set(gId, childrenIds);
      });

      dragStateRef.current = {
          movingNodeIds: nodesToMove,
          affectedGroupIds: affectedGroupIds,
          groupChildren: groupChildren
      };
  }, [nodesRef, multiSelectedIdsRef]);

  const startDragging = useCallback((id: string) => {
      prepareDrag(id);
      setDraggingNodeId(id);
  }, [prepareDrag]);

  const handleMoveNodes = useCallback((dx: number, dy: number) => {
      if (dx === 0 && dy === 0) return;
      if (!dragStateRef.current) return;

      const { movingNodeIds, affectedGroupIds, groupChildren } = dragStateRef.current;
      const currentNodes = nodesRef.current;
      const expandedId = expandedNodeIdRef.current;

      const updates: { id: string, x?: number, y?: number, data?: any }[] = [];
      
      // 1. Move nodes
      movingNodeIds.forEach((id: string) => {
          const node = currentNodes.find((n: WorkflowNode) => n.id === id);
          if (node) {
              updates.push({ id, x: node.x + dx, y: node.y + dy });
          }
      });

      // 2. Resize Groups (Only affected ones)
      affectedGroupIds.forEach((groupId: string) => {
          if (movingNodeIds.has(groupId)) return; // Group itself is moving, no resize logic needed

          const groupNode = currentNodes.find((n: WorkflowNode) => n.id === groupId);
          if (!groupNode) return;

          const childrenIds = groupChildren.get(groupId);
          if (!childrenIds || childrenIds.length === 0) return;

          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          
          childrenIds.forEach((childId: string) => {
              const update = updates.find(u => u.id === childId);
              // Optimistic lookup for child node data
              const childNode = currentNodes.find((n: WorkflowNode) => n.id === childId);
              if (!childNode) return;

              const childX = update?.x !== undefined ? update.x : childNode.x;
              const childY = update?.y !== undefined ? update.y : childNode.y;
              
              const w = getNodeWidth(childNode, expandedId === childId);
              const h = getNodeContentHeight(childNode, w) + 40; 
              
              minX = Math.min(minX, childX);
              minY = Math.min(minY, childY);
              maxX = Math.max(maxX, childX + w);
              maxY = Math.max(maxY, childY + h);
          });
          
          const padding = 40;
          const newGroupX = minX - padding;
          const newGroupY = minY - padding; 
          const newWidth = maxX - minX + padding * 2;
          const newHeight = maxY - minY + padding * 2;

          if (
              Math.abs(newGroupX - groupNode.x) > 0.1 ||
              Math.abs(newGroupY - groupNode.y) > 0.1 ||
              Math.abs(newWidth - (groupNode.data.settings?.width || 0)) > 0.1 ||
              Math.abs(newHeight - (groupNode.data.settings?.height || 0)) > 0.1
          ) {
              updates.push({
                  id: groupId,
                  x: newGroupX,
                  y: newGroupY,
                  data: {
                      settings: {
                          ...groupNode.data.settings,
                          width: newWidth,
                          height: newHeight
                      }
                  }
              });
          }
      });

      if (onBatchUpdateNodes && updates.length > 0) {
          onBatchUpdateNodes(updates);
      } else {
          // Fallback for non-batch mode (should generally use batch)
          updates.forEach(u => {
              if (u.x !== undefined && u.y !== undefined) onMoveNode(u.id, u.x, u.y);
              if (u.data) onUpdateNodeData(u.id, u.data);
          });
      }
  }, [nodesRef, expandedNodeIdRef, onBatchUpdateNodes, onMoveNode, onUpdateNodeData]);

  // Pointer State Logic
  const pointerStateRef = useRef<{
      pointers: Map<number, { x: number, y: number }>;
      mode: 'idle' | 'pan' | 'zoom' | 'dragNode' | 'select' | 'waiting';
      lastDist: number | null;
      lastCenter: { x: number, y: number } | null;
      startPan: { x: number, y: number } | null;
      dragNodeId: string | null;
      lastDragPos: { x: number, y: number } | null;
      longPressTimer: NodeJS.Timeout | null;
      longPressStart: { x: number, y: number } | null;
  }>({
      pointers: new Map(),
      mode: 'idle',
      lastDist: null,
      lastCenter: null,
      startPan: null,
      dragNodeId: null,
      lastDragPos: null,
      longPressTimer: null,
      longPressStart: null
  });

  useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const getPointerCenterAndDist = (pMap: Map<number, {x:number,y:number}>) => {
          const arr = Array.from(pMap.values());
          if (arr.length < 2) return { center: null as any, dist: null as any };
          const p1 = arr[0], p2 = arr[1];
          const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          return { center, dist };
      };

      const onPointerDown = (e: PointerEvent) => {
          // Priority 0: Check for interactive elements
          const target = e.target as Element;
          if (target.closest('button, input, textarea, select, label, [contenteditable="true"], .node-handle, .react-flow__handle, .node-editable-title')) {
               return;
          }

          if (e.pointerType !== 'mouse') e.preventDefault();
          container.setPointerCapture?.(e.pointerId);

          pointerStateRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

          // Priority 1: Multi-touch zoom (2+ fingers)
          if (pointerStateRef.current.pointers.size >= 2) {
              const { center, dist } = getPointerCenterAndDist(pointerStateRef.current.pointers);
              pointerStateRef.current.mode = 'zoom';
              pointerStateRef.current.lastCenter = center;
              pointerStateRef.current.lastDist = dist;
              setDraggingNodeId(null);
              setConnectingState(null);
              setSelectionRect(null);
              setIsPinching(true);
              return;
          }

          // Priority 2: Mouse Right Click / Middle Click -> Context Menu or Pan
          if (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1)) {
              pointerStateRef.current.mode = 'idle';
              // Handle MouseDown handles ContextMenu/Pan separately via React event
              return;
          }
          
          // Priority 3: Mouse Left Click + Space -> Pan
          if (e.pointerType === 'mouse' && isSpacePressedRef.current && !e.shiftKey) {
              pointerStateRef.current.mode = 'pan';
              pointerStateRef.current.startPan = { x: e.clientX, y: e.clientY };
              return;
          }

          // Priority 4: Dragging Node
          const nodeEl = target.closest('[id^="node-"]');
          if (nodeEl) {
              const nodeId = nodeEl.id.replace('node-', '');
              pointerStateRef.current.mode = 'dragNode';
              pointerStateRef.current.dragNodeId = nodeId;
              pointerStateRef.current.lastDragPos = { x: e.clientX, y: e.clientY };
              startDragging(nodeId);
              
              const isMultiSelect = multiSelectedIdsRef.current.size > 1;
              if (!isMultiSelect) {
                   if (!multiSelectedIdsRef.current.has(nodeId)) {
                        onSelectNode(nodeId);
                        setMultiSelectedIds(new Set([nodeId]));
                   }
              } else {
                  setDraggingNodeId(nodeId);
              }
              return;
          }

          // Priority 5: Canvas Interaction (Selection vs Pan)
          if (e.pointerType === 'mouse') {
               // Mouse: Immediate Selection
               pointerStateRef.current.mode = 'select';
               const rect = container.getBoundingClientRect();
               const currentViewport = viewportRef.current;
               const startX = (e.clientX - rect.left - currentViewport.x) / currentViewport.zoom;
               const startY = (e.clientY - rect.top - currentViewport.y) / currentViewport.zoom;
               setSelectionRect({ startX, startY, currentX: startX, currentY: startY });
               
               setContextMenu(null);
               setActiveHandleMenu(null);
          } else {
              // Touch: Wait logic
              pointerStateRef.current.mode = 'waiting';
              pointerStateRef.current.startPan = { x: e.clientX, y: e.clientY };
              pointerStateRef.current.longPressStart = { x: e.clientX, y: e.clientY };
              if (pointerStateRef.current.longPressTimer) {
                  clearTimeout(pointerStateRef.current.longPressTimer);
              }
              pointerStateRef.current.longPressTimer = setTimeout(() => {
                  if (pointerStateRef.current.mode !== 'waiting') return;
                  pointerStateRef.current.mode = 'select';
                  pointerStateRef.current.longPressTimer = null;
                  if (navigator.vibrate) navigator.vibrate(50);
                  const rect = container.getBoundingClientRect();
                  const currentViewport = viewportRef.current;
                  const startX = (e.clientX - rect.left - currentViewport.x) / currentViewport.zoom;
                  const startY = (e.clientY - rect.top - currentViewport.y) / currentViewport.zoom;
                  setSelectionRect({ startX, startY, currentX: startX, currentY: startY });
                  setMultiSelectedIds(new Set());
              }, 600);
              setIsZoomMenuOpen(false);
              onSelectNode(null);
              setContextMenu(null);
              setActiveHandleMenu(null);
          }
      };

      const onPointerMove = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') e.preventDefault();
          const ps = pointerStateRef.current;
          if (!ps.pointers.has(e.pointerId)) return;
          ps.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

          if (ps.pointers.size >= 2) {
              const { center, dist } = getPointerCenterAndDist(ps.pointers);
              if (!ps.lastCenter || !ps.lastDist) {
                  ps.mode = 'zoom';
                  ps.lastCenter = center;
                  ps.lastDist = dist;
                  setDraggingNodeId(null);
                  setConnectingState(null);
                  setSelectionRect(null);
                  setIsPinching(true);
                  return;
              }
              const currentViewport = viewportRef.current;
              let factor = dist / ps.lastDist;
              const sensitivity = settings?.zoomSensitivity || 1.0;
              if (sensitivity !== 1) factor = 1 + (factor - 1) * sensitivity;
              const newZoom = Math.min(Math.max(currentViewport.zoom * factor, 0.1), 10);
              const scaleFactor = newZoom / currentViewport.zoom;
              const vx = ps.lastCenter.x - currentViewport.x;
              const vy = ps.lastCenter.y - currentViewport.y;
              const nvx = vx * scaleFactor;
              const nvy = vy * scaleFactor;
              let newX = ps.lastCenter.x - nvx;
              let newY = ps.lastCenter.y - nvy;
              newX += (center.x - ps.lastCenter.x);
              newY += (center.y - ps.lastCenter.y);
              onViewportChange({ x: newX, y: newY, zoom: newZoom });
              ps.lastCenter = center;
              ps.lastDist = dist;
              return;
          }

          if (ps.longPressTimer) {
              const start = ps.longPressStart;
              if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
                  clearTimeout(ps.longPressTimer);
                  ps.longPressTimer = null;
                  setLongPressIndicator(null);
                  if (ps.mode === 'waiting') {
                      ps.mode = 'pan';
                      ps.startPan = { x: e.clientX, y: e.clientY };
                  }
              }
          }

          if (ps.mode === 'zoom') {
              ps.mode = 'pan';
              ps.startPan = { x: e.clientX, y: e.clientY };
              return;
          }

          if (ps.mode === 'dragNode' && ps.dragNodeId && ps.lastDragPos) {
              const dx = (e.clientX - ps.lastDragPos.x) / viewportRef.current.zoom;
              const dy = (e.clientY - ps.lastDragPos.y) / viewportRef.current.zoom;
              handleMoveNodes(dx, dy);
              ps.lastDragPos = { x: e.clientX, y: e.clientY };
              return;
          }

          if (ps.mode === 'pan' && ps.startPan) {
              const currentViewport = viewportRef.current;
              const dx = e.clientX - ps.startPan.x;
              const dy = e.clientY - ps.startPan.y;
              onViewportChange({ ...currentViewport, x: currentViewport.x + dx, y: currentViewport.y + dy });
              ps.startPan = { x: e.clientX, y: e.clientY };
              return;
          }

          if (ps.mode === 'select') {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                  const currentViewport = viewportRef.current;
                  const curX = (e.clientX - rect.left - currentViewport.x) / currentViewport.zoom;
                  const curY = (e.clientY - rect.top - currentViewport.y) / currentViewport.zoom;
                  setSelectionRect((prev: any) => prev ? ({ ...prev, currentX: curX, currentY: curY }) : null);
              }
          }
      };

      const onPointerUp = (e: PointerEvent) => {
          const ps = pointerStateRef.current;
          ps.pointers.delete(e.pointerId);
          if (ps.longPressTimer) {
              clearTimeout(ps.longPressTimer);
              ps.longPressTimer = null;
          }
          setLongPressIndicator(null);

          if (ps.pointers.size >= 2) {
              return; 
          }
          if (ps.pointers.size < 2) setIsPinching(false);

          if (ps.mode === 'dragNode') {
              setDraggingNodeId(null);
          } else if (ps.mode === 'select') {
              const currentSelectionRect = selectionRectRef.current;
              const currentViewport = viewportRef.current;
              const currentNodes = nodesRef.current;
              
              if (currentSelectionRect) {
                  const x1 = Math.min(currentSelectionRect.startX, currentSelectionRect.currentX);
                  const y1 = Math.min(currentSelectionRect.startY, currentSelectionRect.currentY);
                  const x2 = Math.max(currentSelectionRect.startX, currentSelectionRect.currentX);
                  const y2 = Math.max(currentSelectionRect.startY, currentSelectionRect.currentY);
                  
                  // Transform screen rect to world rect
                  const worldX1 = x1;
                  const worldY1 = y1;
                  const worldX2 = x2;
                  const worldY2 = y2;

                  // Check for drag vs click
                  const isDrag = Math.abs(currentSelectionRect.currentX - currentSelectionRect.startX) > 5 || 
                                 Math.abs(currentSelectionRect.currentY - currentSelectionRect.startY) > 5;
                  
                  // Note: e.shiftKey etc might not be available on pointercancel or some synthetic events
                  // We use the refs we have
                  const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey || isShiftPressedRef.current || isCtrlPressedRef.current;
                  
                  let selected: Set<string>;
                  // Changed: Remove !isDrag check so clicking background clears selection (unless MultiSelect key held)
                  if (isMultiSelect) {
                       selected = new Set(multiSelectedIdsRef.current);
                  } else {
                       selected = new Set<string>();
                  }
                  
                  currentNodes.forEach((node: WorkflowNode) => {
                      const isExpanded = expandedNodeIdRef.current === node.id;
                      const nodeW = node.type === 'group' ? (node.data.settings?.width || 400) : getNodeWidth(node, isExpanded);
                      // Use accurate height calculation instead of fixed 150
                      const nodeH = node.type === 'group' ? (node.data.settings?.height || 300) : (getNodeContentHeight(node, nodeW) + 40);
                      
                      if (
                          node.x < worldX2 && 
                          node.x + nodeW > worldX1 && 
                          node.y < worldY2 && 
                          node.y + nodeH > worldY1
                      ) {
                          selected.add(node.id);
                      }
                  });
                  
                  setMultiSelectedIds(selected);
                  setSelectionRect(null);
                  
                  // Update single selection state properly
                  if (selected.size === 1) {
                      onSelectNode(Array.from(selected)[0]);
                  } else {
                      onSelectNode(null);
                  }
              }
          }
          
          ps.mode = 'idle';
          ps.dragNodeId = null;
          ps.lastDragPos = null;
          ps.longPressStart = null;
          // setConnectingState(null); // Handled by Canvas/index.tsx handleGlobalUp
          setIsPanning(false);
      };

      const opts = { passive: false, capture: true } as AddEventListenerOptions;
      container.addEventListener('pointerdown', onPointerDown as any, opts);
      container.addEventListener('pointermove', onPointerMove as any, opts);
      
      // Use window listeners for up/cancel to catch release outside canvas
      window.addEventListener('pointerup', onPointerUp as any, true);
      window.addEventListener('pointercancel', onPointerUp as any, true);
      window.addEventListener('blur', onPointerUp as any, true);

      return () => {
          container.removeEventListener('pointerdown', onPointerDown as any, true);
          container.removeEventListener('pointermove', onPointerMove as any, true);
          window.removeEventListener('pointerup', onPointerUp as any, true);
          window.removeEventListener('pointercancel', onPointerUp as any, true);
          window.removeEventListener('blur', onPointerUp as any, true);
      };
  }, [onViewportChange, settings, handleMoveNodes, startDragging, onSelectNode, setMultiSelectedIds, setSelectionRect, setDraggingNodeId, setConnectingState, setContextMenu, setActiveHandleMenu, setLongPressIndicator, setIsPinching, setIsZoomMenuOpen, containerRef, viewportRef, isSpacePressedRef, isShiftPressedRef, isCtrlPressedRef, multiSelectedIdsRef, nodesRef]);

  // Handle Wheel
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
  }, [onViewportChange, settings, containerRef]);

  // Handle MouseDown (for React event, mainly context menu and pan)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
      setIsZoomMenuOpen(false); 
  
      if (e.button === 2 || e.button === 1) { // Right or Middle click -> Pan or Context
        if (e.button === 2) {
             e.preventDefault();
             const rect = containerRef.current?.getBoundingClientRect();
             if(rect) {
                 const worldX = (e.clientX - rect.left - viewportRef.current.x) / viewportRef.current.zoom;
                 const worldY = (e.clientY - rect.top - viewportRef.current.y) / viewportRef.current.zoom;
                 setContextMenu({ x: e.clientX, y: e.clientY, worldX, worldY });
             }
        } else {
             // Middle click -> Pan
             setIsPanning(true);
        }
        return;
      }

      if (e.button === 0) {
        if (commentModeActive && currentProjectId && createProjectCommentThread) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
               const worldX = (e.clientX - rect.left - viewportRef.current.x) / viewportRef.current.zoom;
               const worldY = (e.clientY - rect.top - viewportRef.current.y) / viewportRef.current.zoom;
               const t = createProjectCommentThread(currentProjectId, worldX, worldY);
               setCommentThreads((prev: any) => [...prev, t]);
               setActiveThreadId(t.id);
               setThreadInput('');
            }
            return;
        }
        
        if (isSpacePressedRef.current && !e.shiftKey) {
            setIsPanning(true);
            return;
        }

        // Selection Start Logic is handled by onPointerDown (Priority 5)
        // We just ensure menus are closed here as a backup for React events
        onSelectNode(null);
        setContextMenu(null);
        setActiveHandleMenu(null);
      }
  }, [commentModeActive, currentProjectId, createProjectCommentThread, setCommentThreads, setActiveThreadId, setThreadInput, isSpacePressedRef, onSelectNode, setContextMenu, setActiveHandleMenu, containerRef, setIsZoomMenuOpen, setIsPanning]);

  return {
    draggingNodeId,
    setDraggingNodeId,
    handleMoveNodes,
    handleMouseDown,
    startDragging
  };
};
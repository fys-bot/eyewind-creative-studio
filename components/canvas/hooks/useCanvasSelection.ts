import { useState, useRef, useEffect, MutableRefObject, Dispatch, SetStateAction } from 'react';
import { WorkflowNode } from '../../types';
import { getNodeWidth } from '../../utils/nodeUtils';

interface UseCanvasSelectionProps {
  nodes: WorkflowNode[];
  viewport: { x: number; y: number; zoom: number };
  expandedNodeIdRef: MutableRefObject<string | null>;
  onSelectNode: (id: string | null) => void;
  isShiftPressedRef: MutableRefObject<boolean>;
  isCtrlPressedRef: MutableRefObject<boolean>;
}

export const useCanvasSelection = ({
  nodes,
  viewport,
  expandedNodeIdRef,
  onSelectNode,
  isShiftPressedRef,
  isCtrlPressedRef,
}: UseCanvasSelectionProps) => {
  const [selectionRect, setSelectionRect] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());
  
  // Refs to access latest state in event listeners
  const selectionRectRef = useRef(selectionRect);
  const multiSelectedIdsRef = useRef(multiSelectedIds);
  const nodesRef = useRef(nodes);

  useEffect(() => {
    selectionRectRef.current = selectionRect;
    multiSelectedIdsRef.current = multiSelectedIds;
    nodesRef.current = nodes;
  }, [selectionRect, multiSelectedIds, nodes]);

  // Clean up multiSelectedIds if nodes are deleted
  useEffect(() => {
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

  const startSelection = (startX: number, startY: number, isMultiSelectModifier: boolean) => {
    setSelectionRect({ startX, startY, currentX: startX, currentY: startY });
    
    if (!isMultiSelectModifier) {
      setMultiSelectedIds(new Set());
      onSelectNode(null);
    }
  };

  const updateSelectionRect = (currentX: number, currentY: number) => {
    setSelectionRect(prev => prev ? ({ ...prev, currentX, currentY }) : null);
  };

  const endSelection = (isMultiSelectModifier: boolean) => {
    const currentSelectionRect = selectionRectRef.current;
    if (currentSelectionRect) {
      const x1 = Math.min(currentSelectionRect.startX, currentSelectionRect.currentX);
      const y1 = Math.min(currentSelectionRect.startY, currentSelectionRect.currentY);
      const x2 = Math.max(currentSelectionRect.startX, currentSelectionRect.currentX);
      const y2 = Math.max(currentSelectionRect.startY, currentSelectionRect.currentY);
      
      // Transform screen rect to world rect
      const worldX1 = (x1 - viewport.x) / viewport.zoom;
      const worldY1 = (y1 - viewport.y) / viewport.zoom;
      const worldX2 = (x2 - viewport.x) / viewport.zoom;
      const worldY2 = (y2 - viewport.y) / viewport.zoom;

      // Check for drag vs click
      const isDrag = Math.abs(currentSelectionRect.currentX - currentSelectionRect.startX) > 5 || 
                     Math.abs(currentSelectionRect.currentY - currentSelectionRect.startY) > 5;
      
      let selected: Set<string>;
      if (isMultiSelectModifier || !isDrag) {
           // Preserve existing selection if modifier held OR if it's just a click
           selected = new Set(multiSelectedIdsRef.current);
      } else {
           // Dragging new selection without modifiers -> Replace
           selected = new Set<string>();
      }
      
      nodesRef.current.forEach(node => {
          // Simple AABB intersection
          const nodeW = node.type === 'group' ? (node.data.settings?.width || 400) : getNodeWidth(node, expandedNodeIdRef.current === node.id);
          const nodeH = node.type === 'group' ? (node.data.settings?.height || 300) : 150; 
          
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
      
      if (selected.size > 1) {
          onSelectNode(null);
      }
    }
  };

  return {
    selectionRect,
    setSelectionRect,
    multiSelectedIds,
    setMultiSelectedIds,
    multiSelectedIdsRef,
    selectionRectRef,
    startSelection,
    updateSelectionRect,
    endSelection
  };
};

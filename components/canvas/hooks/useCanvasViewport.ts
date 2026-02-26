import { useRef, useCallback, MutableRefObject } from 'react';
import { WorkflowNode } from '../../types';
import { getNodeWidth, getNodeContentHeight } from '../../utils/nodeUtils';

interface UseCanvasViewportProps {
  viewport: { x: number; y: number; zoom: number };
  onViewportChange: (newViewport: { x: number; y: number; zoom: number }) => void;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  nodes: WorkflowNode[];
  expandedNodeIdRef: MutableRefObject<string | null>;
}

export const useCanvasViewport = ({
  viewport,
  onViewportChange,
  containerRef,
  nodes,
  expandedNodeIdRef,
}: UseCanvasViewportProps) => {
  const animationFrameRef = useRef<number | null>(null);
  const viewportRef = useRef(viewport);

  // Sync ref with prop
  viewportRef.current = viewport;

  const smoothZoomTo = useCallback((targetZoom: number, center?: { x: number; y: number }) => {
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
  }, [onViewportChange, containerRef]);

  const smoothPanTo = useCallback((targetX: number, targetY: number) => {
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
  }, [onViewportChange]);

  const fitBounds = useCallback((minX: number, minY: number, maxX: number, maxY: number) => {
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
  }, [containerRef, onViewportChange]);

  const smoothFitView = useCallback(() => {
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
  }, [nodes, smoothZoomTo, fitBounds]);

  const smoothFitNodes = useCallback((nodeIds: string[]) => {
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
  }, [nodes, expandedNodeIdRef, fitBounds]);

  return {
    smoothZoomTo,
    smoothPanTo,
    smoothFitView,
    smoothFitNodes,
    fitBounds
  };
};

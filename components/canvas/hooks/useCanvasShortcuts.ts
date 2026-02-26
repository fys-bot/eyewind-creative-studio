import { useEffect, useRef, useState, MutableRefObject } from 'react';
import { WorkflowNode } from '../../types';

interface UseCanvasShortcutsProps {
  nodes: WorkflowNode[];
  viewport: { x: number; y: number; zoom: number };
  smoothZoomTo: (zoom: number) => void;
  smoothFitView: () => void;
}

export const useCanvasShortcuts = ({
  nodes,
  viewport,
  smoothZoomTo,
  smoothFitView
}: UseCanvasShortcutsProps) => {
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false); 
  const isShiftPressedRef = useRef(false); 
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const isCtrlPressedRef = useRef(false);
  
  // Use a ref for viewport to avoid stale closure in event listener
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

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
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [nodes, smoothZoomTo, smoothFitView]); 

  return {
    isSpacePressed,
    isSpacePressedRef,
    isShiftPressed,
    isShiftPressedRef,
    isCtrlPressed,
    isCtrlPressedRef
  };
};

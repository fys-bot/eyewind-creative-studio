
import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { WorkflowNode, WorkflowNodeType, AppSettings } from '../../types';
import { FileText, Image as ImageIcon, Wand2, Video, Music, Clapperboard, Layers, Palette, Trash2, Maximize2, X, Clock, ScanLine, Eye, StickyNote, Scissors, Ghost, Mic, Cpu, Monitor, Copy } from 'lucide-react';
import { getNodeContentHeight, getNodeWidth } from '../../utils/nodeUtils';
import { nodeRegistry, ResourceType, PortDefinition, getNodePortPosition } from '../../services/nodeEngine';
import { NodeContent } from './NodeContent';
import { isMobileDevice } from '../../utils/deviceUtils';

interface NodeItemProps {
  node: WorkflowNode;
  selected: boolean;
  zoom: number; 
  isExpanded: boolean;
  isConnecting?: boolean; // Add optional prop
  onToggleExpand: (id: string) => void;
  onRegisterHandles: (id: string, offsets: { inX: number, inY: number, outX: number, outY: number }) => void;
  onSelect: (id: string, event?: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onStartDrag: (id: string) => void;
  onStartConnect: (id: string, handleId: string, clientX: number, clientY: number) => void; 
  onConnectTo: (id: string, handleId: string) => void;   
  onHandleClick?: (id: string, type: 'source' | 'target', x: number, y: number, handleId?: string) => void;
  onUpdateData: (id: string, data: any) => void; 
  t: any;
  onRun?: (id: string) => void;
  settings?: AppSettings;
  viewport?: { x: number, y: number, zoom: number };
  onNodeTouchStart?: (id: string, e: React.TouchEvent) => void; // Add prop
  onSetCover?: (id: string, url: string) => void; // New prop for setting cover
  isMultiSelection?: boolean;
  onAddNode?: (type: WorkflowNodeType, x: number, y: number, initialValue?: string, extraData?: any) => void;
  onPortEnter?: (nodeId: string, handleId: string, type: 'source' | 'target', x: number, y: number) => void;
  onPortLeave?: (nodeId: string, handleId: string) => void;
}

const getPortColor = (type: ResourceType) => {
    // Pure monochrome logic for ports, or very subtle grays
    return '#888888'; 
};

const NodeItemComponent = forwardRef<HTMLDivElement, NodeItemProps>(({ 
  node, selected, isExpanded, isConnecting, isMultiSelection, onToggleExpand, onRegisterHandles, onSelect, onDelete, onStartDrag, onStartConnect, onConnectTo, onHandleClick, onUpdateData, t, onRun, zoom, settings, viewport, onNodeTouchStart, onSetCover, onAddNode, onPortEnter, onPortLeave
}, ref) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  // Defensive check for node.data
  const [renameValue, setRenameValue] = useState(node.data?.label || "");
  const [isMobile, setIsMobile] = useState(false);
  
  const localNodeRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Merge refs using callback to ensure updates
  const setRefs = React.useCallback(
    (el: HTMLDivElement | null) => {
        localNodeRef.current = el;
        if (typeof ref === 'function') {
            ref(el);
        } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
    },
    [ref]
  );

  useEffect(() => {
      setIsMobile(isMobileDevice());
  }, []);
  
  const processor = nodeRegistry.get(node.type);
  const inputPorts = processor.getInputs();
  const outputPorts = processor.getOutputs();

  const layoutK = 1; 
  
  const isMediaNode = ['video_gen', 'image_gen', 'video_composer', 'preview', 'image_input', 'image_matting', 'pro_icon_gen', 'pro_art_director', 'icon_prompt', 'icon_ref_image', 'image_receiver'].includes(node.type);
  const isInteractiveNode = false; // Pro nodes are now handled by ProNodeItem, this legacy check is disabled for NodeItem
  const isSticky = node.type === 'sticky_note';

  const borderWidth = selected ? 2 * layoutK : 1 * layoutK;
  // Adaptive radius: starts at 20px (1x), dampened growth to ~55px max visually
  // Formula derived to satisfy: Zoom=1 -> 20px, Zoom=Inf -> 60px
  const borderRadius = (60 * layoutK) / (Math.max(1, zoom) + 2); 

  const hasContent = () => {
    if (!node.data) return false;
    if (node.data.outputResult) return true;
    if (node.data.outputList && node.data.outputList.length > 0) return true;
    if (node.data.value && String(node.data.value).trim().length > 0) return true;
    if (node.type === 'video_gen') {
       if (node.data.settings?.startImageBase64 || node.data.settings?.endImageBase64) return true;
    }
    return false;
  };

  // Hide content if multiple nodes are selected and this node is not expanded
  const shouldHideContent = isMultiSelection && !isExpanded;

  useEffect(() => {
    if (isConfirmingDelete) {
        const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
        return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);
  
  useEffect(() => {
      if (!isRenaming) {
          setRenameValue(node.data?.label || "");
      }
  }, [node.data?.label, isRenaming]);

  const submitRename = () => {
      if (renameValue.trim()) {
          onUpdateData(node.id, { label: renameValue.trim() });
      } else {
          setRenameValue(node.data?.label || ""); 
      }
      setIsRenaming(false);
  };
  
  // --- Adaptive Title Scaling ---
  // Range [min, max] from settings, default [0.4, 2.5]
  const minScale = settings?.adaptiveZoomMin ?? 0.4;
  const maxScale = settings?.adaptiveZoomMax ?? 2.5;
  const adaptiveScale = Math.min(Math.max(1 / zoom, minScale), maxScale);
  
  const HEADER_HEIGHT_VISUAL = 40 * layoutK * adaptiveScale;
  
  const currentWidth = getNodeWidth(node, isExpanded);
  
  const contentH = getNodeContentHeight(node, currentWidth);
  
  const containerStyle: React.CSSProperties = {
    left: Math.round(node.x),
    top: Math.round(node.y),
    width: `${currentWidth}px`, 
    // Unified uniform border radius for all corners
    borderRadius: `${borderRadius}px`,
    zIndex: isExpanded ? 50 : (selected ? 20 : 10),
    // Pure black/white selection styles -> CHANGED: Blue for selected state
    boxShadow: `0 0 0 ${borderWidth}px ${selected ? (node.type === 'sticky_note' ? '#3b82f6' : '#3b82f6') : 'rgba(0,0,0,0.1)'}, 0 10px 30px -10px rgba(0,0,0,0.15)`,
    transformOrigin: 'center center', // Ensure scaling happens from center
    position: 'absolute',
    // Force GPU rasterization to avoid blur during scale? Or avoid it to prevent subpixel blur?
    // Often backface-visibility: hidden helps with edge antialiasing during transforms
    backfaceVisibility: 'hidden', 
    WebkitFontSmoothing: 'subpixel-antialiased',
    // Add grayscale filter if being replaced (checked via props or data)
    filter: node.data?.isReplacing ? 'grayscale(100%)' : 'none',
    transition: 'filter 0.3s ease',
    // FIX: Add transform translate3d(0,0,0) to force GPU layer and prevent subpixel rendering issues
    // OPTIMIZATION: In performance mode (zoomed in), disable individual layer promotion to allow global bitmap scaling
    transform: (zoom > (settings?.performanceModeThreshold ?? 1.0)) ? 'none' : 'translate3d(0,0,0)',
  };
  
  const expandedX = isExpanded 
    ? Math.round((node.type === 'sticky_note' || node.type === 'text_input') ? -(400 - getNodeWidth(node, false))/2 : -(600 - getNodeWidth(node, false))/2) 
    : 0;

  const expandedY = isExpanded
    ? Math.round((node.type === 'sticky_note' || node.type === 'text_input') ? -(400 - getNodeWidth(node, false))/2 : -20)
    : 0;

  const headerStyle: React.CSSProperties = {
    width: '100%',
    height: `${HEADER_HEIGHT_VISUAL}px`,
    borderTopLeftRadius: `${borderRadius}px`,
    borderTopRightRadius: `${borderRadius}px`,
  };

  const bodyStyle: React.CSSProperties = {
    padding: isMediaNode || isSticky ? '0' : `${16 * layoutK}px`, 
    backgroundColor: isMediaNode ? undefined : undefined,
    height: isMediaNode ? 'auto' : undefined,
    borderBottomLeftRadius: `${borderRadius}px`,
    borderBottomRightRadius: `${borderRadius}px`,
    overflow: 'hidden'
  };

  const renderPort = (port: PortDefinition, index: number, total: number, isOutput: boolean) => {
      // Ports are now purely monochrome or grayscale
      const color = '#999'; 
      const pos = getNodePortPosition(node, port.id, isOutput ? 'source' : 'target', isExpanded, zoom);
      const relativeY = pos.y; 

      const tooltipClass = isOutput 
        ? "right-full mr-3 origin-right" 
        : "left-full ml-3 origin-left";
        
      const portLabel = t.portLabels?.[port.label] || port.label;

      const shouldShowHandles = !settings?.autoHideHandles || isConnecting || isMobile; // Always show handles on mobile
      const autoHideClass = shouldShowHandles 
        ? 'opacity-100' 
        : 'opacity-0 group-hover/node:opacity-100';

      return (
          <div 
            key={port.id}
            data-node-id={node.id}
            data-handle-id={port.id}
            data-handle-type={isOutput ? 'source' : 'target'}
            className={`group/port node-handle absolute z-30 flex items-center justify-center transition-opacity duration-200 ${autoHideClass}`}
            style={{
                top: `${relativeY - (8 * layoutK)}px`, 
                [isOutput ? 'right' : 'left']: `-${8 * layoutK}px`,
                width: `${16 * layoutK}px`,
                height: `${16 * layoutK}px`,
            }}
            onMouseDown={(e) => {
                if(isOutput) { 
                    e.stopPropagation(); 
                    onStartConnect(node.id, port.id, e.clientX, e.clientY); 
                }
                else { e.stopPropagation(); }
            }}
            onClick={(e) => { 
                e.stopPropagation(); 
                if(onHandleClick) onHandleClick(node.id, isOutput ? 'source' : 'target', e.clientX, e.clientY, port.id); 
            }}
            onMouseEnter={(e) => {
                if (onPortEnter) {
                     // Calculate exact world position for snapping
                     const worldX = node.x + expandedX + pos.x;
                     const worldY = node.y + expandedY + pos.y;
                     onPortEnter(node.id, port.id, isOutput ? 'source' : 'target', worldX, worldY);
                }
            }}
            onMouseLeave={(e) => {
                if (onPortLeave) {
                    onPortLeave(node.id, port.id);
                }
            }}
          >
              <div 
                  className="w-full h-full rounded-full bg-white dark:bg-black border-[2px] flex items-center justify-center transition-transform group-hover/port:scale-150 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                  style={{ borderColor: color, borderWidth: `${2 * layoutK}px` }}
              >
              </div>
              
              <div 
                  className={`absolute ${tooltipClass} px-2.5 py-1.5 bg-black/90 dark:bg-white/90 backdrop-blur text-white dark:text-black text-[11px] font-bold rounded-xl opacity-0 group-hover/port:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl flex items-center gap-1.5 z-50 scale-95 group-hover/port:scale-100`}
                  style={{ transform: `scale(${layoutK})` }}
              >
                  {portLabel}
              </div>
          </div>
      );
  };

  // Pure Monochrome Visuals Config
  const getNodeVisuals = (type: WorkflowNodeType) => {
    switch (type) {
        case 'sticky_note': 
            const color = node.data.settings?.color || 'yellow';
            let bgClass = 'bg-yellow-100 dark:bg-yellow-900/40';
            let iconClass = 'bg-yellow-200/50 dark:bg-yellow-800/50';
            let borderClass = 'border-yellow-200 dark:border-yellow-800/30';
            
            if (color === 'blue') { 
                bgClass = 'bg-blue-100 dark:bg-blue-900/40'; 
                iconClass = 'bg-blue-200/50 dark:bg-blue-800/50';
                borderClass = 'border-blue-200 dark:border-blue-800/30';
            }
            if (color === 'green') {
                bgClass = 'bg-green-100 dark:bg-green-900/40';
                iconClass = 'bg-green-200/50 dark:bg-green-800/50';
                borderClass = 'border-green-200 dark:border-green-800/30';
            }
            if (color === 'pink') {
                bgClass = 'bg-pink-100 dark:bg-pink-900/40';
                iconClass = 'bg-pink-200/50 dark:bg-pink-800/50';
                borderClass = 'border-pink-200 dark:border-pink-800/30';
            }
            if (color === 'purple') {
                bgClass = 'bg-purple-100 dark:bg-purple-900/40';
                iconClass = 'bg-purple-200/50 dark:bg-purple-800/50';
                borderClass = 'border-purple-200 dark:border-purple-800/30';
            }
            if (color === 'gray') {
                bgClass = 'bg-gray-100 dark:bg-gray-800';
                iconClass = 'bg-gray-200/50 dark:bg-gray-700/50';
                borderClass = 'border-gray-200 dark:border-gray-700';
            }

            return { 
                icon: StickyNote, 
                text: 'text-black dark:text-gray-100', 
                bg: bgClass,
                iconBg: iconClass,
                borderColor: borderClass
            };
        default: 
            // Unified monochrome style for ALL other nodes
            return { icon: getNodeIcon(type), text: 'text-gray-900 dark:text-gray-100', bg: 'bg-white dark:bg-gray-900', iconBg: 'bg-gray-50 dark:bg-gray-800', borderColor: 'border-gray-100 dark:border-gray-800' };
    }
  };

  const getNodeIcon = (type: WorkflowNodeType) => {
      switch (type) {
        case 'text_input': return FileText;
        case 'image_input': return ImageIcon;
        case 'image_gen': return Palette;
        case 'script_agent': return Clapperboard;
        case 'audio_gen': return Music;
        case 'video_gen': return Video;
        case 'video_composer': return Layers;
        case 'preview': return Eye;
        case 'image_matting': return Scissors;
        case 'icon_prompt': return FileText;
        case 'icon_ref_image': return ImageIcon;
        case 'image_receiver': return ImageIcon;
        default: return FileText;
      }
  };

  const visuals = getNodeVisuals(node.type);
  const Icon = visuals.icon;

  const renderSettingsBadges = () => {
    // Media nodes have their own UI, so skip them
    if (isMediaNode || node.type === 'pro_icon_gen' || node.type === 'pro_art_director') return null; 
    
    // Check if we have any valid settings to show
    const settings = node.data?.settings;
    if (!settings) return null;

    const badges: { icon?: any, label: string }[] = [];
    
    // 1. Audio Voice
    if (settings.voice && ['audio_gen'].includes(node.type)) {
        badges.push({ icon: Mic, label: settings.voice });
    }

    // 2. Model Name (Generic)
    if (settings.model && ['script_agent', 'audio_gen'].includes(node.type)) {
         // Simplify model name for badge (e.g. "Gemini 1.5 Pro" -> "Gemini")
         let label = settings.model;
         // You might want a lookup map here if model IDs are complex
         badges.push({ icon: Cpu, label });
    }

    // 3. Aspect Ratio
    if (settings.aspectRatio && !['text_input', 'sticky_note', 'script_agent', 'audio_gen'].includes(node.type)) {
        badges.push({ icon: Monitor, label: settings.aspectRatio });
    }

    // 4. Resolution
    if (settings.resolution && !['text_input', 'sticky_note', 'script_agent', 'audio_gen'].includes(node.type)) {
        badges.push({ icon: Maximize2, label: settings.resolution });
    }

    // 5. Duration
    if (settings.duration && ['audio_gen'].includes(node.type)) {
        badges.push({ icon: Clock, label: `${settings.duration}s` });
    }

    if (badges.length === 0) return null;

    return (
        <div 
            className="absolute -bottom-3 left-4 flex gap-1.5 z-30 pointer-events-none origin-top-left"
            style={{ 
                width: '100%',
                transform: `scale(${layoutK})`,
                bottom: `-${12 * layoutK}px`
            }}
        >
            {badges.map((b, i) => (
                <div key={i} className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-1 rounded-full shadow-sm text-[10px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {b.icon && <b.icon size={10} className="text-gray-400 dark:text-gray-500" />}
                    <span>{b.label}</span>
                </div>
            ))}
        </div>
    );
  };

  // Simple Physics Pop & Vanish Animation
  const getExitAnimation = () => {
      return { 
          scale: [1, 1.2, 0], // Scale up to 1.2 then shrink to 0
          opacity: [1, 1, 0],
          zIndex: 100, // Ensure it's on top
          transition: { 
              duration: 0.3, // Faster!
              times: [0, 0.4, 1], // 40% time growing, 60% shrinking
              ease: ["easeOut", "easeInOut"] 
          }
      };
  };

  // --- Headless Render for Pro Nodes (Removed - Handled by ProNodeItem) ---
  // if (isInteractiveNode) { ... }

  return (
    <motion.div
      id={`node-${node.id}`}
      ref={setRefs}
      className={`absolute flex flex-col select-none group/node bg-white dark:bg-gray-900`}
      style={containerStyle}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
          opacity: 1, 
          scale: 1,
          x: expandedX,
          y: expandedY,
          width: `${currentWidth}px`,
          borderRadius: `${borderRadius}px`
      }}
      exit={getExitAnimation()}
      transition={{ 
          duration: 0.4, 
          ease: [0.175, 0.885, 0.32, 1.275]
      }}
      // Use onAnimationStart to force transform origin for correct scaling
      onAnimationStart={() => {
         if (localNodeRef.current) localNodeRef.current.style.transformOrigin = "center center";
      }}
      // Explicit Touch Start to fix Mobile Dragging
      // onTouchStart={(e) => {
      //    if (onNodeTouchStart) onNodeTouchStart(node.id, e);
      // }}
      onMouseDown={(e) => { 
          e.stopPropagation(); 
          if (node.type === 'sticky_note' && isExpanded) {
             // Allow interaction if clicking on scrollbar/text area if expanded? 
             // Actually, StickyNoteView stops propagation. 
             // If this fires, it means user clicked on header or border.
          }
          // Avoid redundant selection updates if already selected (unless multi-selecting)
          if (!selected || e.shiftKey || e.metaKey || e.ctrlKey) {
             onSelect(node.id, e); 
          }
          onStartDrag(node.id); 
      }}
    >
        {/* Render Ports */}
        {inputPorts.map((port, idx) => renderPort(port, idx, inputPorts.length, false))}
        {outputPorts.map((port, idx) => renderPort(port, idx, outputPorts.length, true))}

        {/* Clean Stacked Header - Pure Monochrome */}
        <div 
            className={`shrink-0 flex items-center justify-between ${visuals.bg} border-b ${visuals.borderColor}`}
            style={{
                ...headerStyle,
                paddingLeft: `${16 * layoutK * adaptiveScale}px`,
                paddingRight: `${12 * layoutK * adaptiveScale}px`,
            }}
            onMouseDown={(e) => {
                onStartDrag(node.id);
            }}
        >
            <div 
                className={`flex items-center ${visuals.text} flex-1 mr-2 overflow-hidden min-w-0`}
                style={{ gap: `${8 * layoutK * adaptiveScale}px` }}
            >
                <div 
                    className={`flex items-center justify-center ${visuals.iconBg} shrink-0`}
                    style={{ 
                        padding: `${4 * layoutK * adaptiveScale}px`, 
                        borderRadius: `${8 * layoutK * adaptiveScale}px`,
                        minWidth: `${28 * layoutK * adaptiveScale}px`, 
                        minHeight: `${28 * layoutK * adaptiveScale}px`
                    }}
                >
                    <Icon size={16 * layoutK * adaptiveScale} className="shrink-0" />
                </div>
                {isRenaming ? (
                    <input 
                        ref={renameInputRef}
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={submitRename}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRename();
                            if (e.key === 'Escape') {
                                setRenameValue(node.data.label || "");
                                setIsRenaming(false);
                            }
                        }}
                        onMouseDown={(e) => e.stopPropagation()} 
                        className="bg-transparent outline-none border-b border-black dark:border-white w-full min-w-[50px] text-black dark:text-white p-0 font-bold"
                        style={{ 
                            fontSize: `${13 * layoutK * adaptiveScale}px`,
                            marginLeft: `-${5 * layoutK * adaptiveScale}px`
                        }}
                    />
                ) : (
                    <span 
                        className={`node-editable-title truncate max-w-[180px] cursor-text transition-colors font-bold hover:bg-black/5 dark:hover:bg-white/10`}
                        style={{ 
                            fontSize: `${13 * layoutK * adaptiveScale}px`,
                            padding: `${2 * layoutK * adaptiveScale}px ${6 * layoutK * adaptiveScale}px`,
                            borderRadius: `${6 * layoutK * adaptiveScale}px`,
                            lineHeight: 1.2,
                            marginLeft: `-${5 * layoutK * adaptiveScale}px`,
                            minHeight: `${20 * layoutK * adaptiveScale}px`, // Ensure height even if empty
                            display: 'inline-block' // Ensure layout
                        }}
                        // Ensure pointerDown/mouseDown doesn't drag the node, allowing click to pass through
                        onPointerDown={(e) => e.stopPropagation()} 
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { 
                            e.stopPropagation();
                            // Allow rename even if selected, as long as it's a direct click on the title
                            if (!isMultiSelection) { 
                                setIsRenaming(true);
                            }
                        }}
                        title={t.actions.rename_tooltip}
                    >
                        {node.data?.label || "Node"} 
                    </span>
                )}
            </div>
            
            <div 
                className={`flex items-center shrink-0 transition-opacity ${selected || isMobile ? 'opacity-100' : 'opacity-0 group-hover/node:opacity-100'}`}
                style={{ gap: `${4 * layoutK * adaptiveScale}px` }}
            >
                {/* Duplicate Button (Replaces Set Cover) */}
                {isMediaNode && hasContent() && onAddNode && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Create a copy of the node data
                            const copyData = { ...node.data };
                            // Pass as extraData to onAddNode with checkCollision flag
                            onAddNode(node.type, node.x, node.y, undefined, { ...copyData, checkCollision: true });
                        }}
                        className={`text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 rounded-lg transition-colors flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800`}
                        style={{ 
                            width: `${24 * layoutK}px`,
                            height: `${24 * layoutK}px`
                        }}
                        title={t.actions?.duplicate || "Duplicate"}
                    >
                        <Copy size={12 * layoutK} />
                    </button>
                )}

                {/* Hide expand button for text input nodes to prevent modal behavior - RESTORED: User wants manual expand back */}
                {/* {!['text_input', 'icon_prompt'].includes(node.type) && ( */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
                        className={`text-gray-400 hover:text-black dark:hover:text-white rounded-lg transition-colors flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800`}
                        style={{ 
                            width: `${24 * layoutK}px`,
                            height: `${24 * layoutK}px`
                        }}
                    >
                        {isExpanded ? <X size={14 * layoutK} /> : <Maximize2 size={12 * layoutK} />}
                    </button>
                {/* )} */}
                
                {!isExpanded && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!hasContent() && !isSticky) {
                                onDelete(node.id);
                                return;
                            }
                            if (isConfirmingDelete) {
                                onDelete(node.id);
                            } else {
                                setIsConfirmingDelete(true);
                            }
                        }} 
                        className={`rounded-lg transition-all flex items-center justify-center ${isConfirmingDelete ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        style={{ 
                            width: `${24 * layoutK}px`,
                            height: `${24 * layoutK}px`
                        }}
                    >
                        {isConfirmingDelete ? <Trash2 size={12 * layoutK} /> : <X size={14 * layoutK}/>}
                    </button>
                )}
            </div>
        </div>

        {/* Content Body */}
        <div 
            className="relative" 
            style={bodyStyle}
        >
            <NodeContent 
                node={node}
                isExpanded={isExpanded}
                layoutK={layoutK}
                t={t}
                onUpdateData={onUpdateData}
                contentHeight={contentH}
                borderRadius={borderRadius}
                zoom={zoom} // Pass zoom
                settings={settings} // Pass settings
            />
        </div>

        {renderSettingsBadges()}
    </motion.div>
  );
});

const NodeItem = React.memo(NodeItemComponent);
export default NodeItem;

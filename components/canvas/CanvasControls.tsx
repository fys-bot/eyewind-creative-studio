import React, { useState } from 'react';
import { Minus, Plus, Maximize, Minimize, Undo, Redo } from 'lucide-react';
import { translations, Language } from '../../utils/translations';

interface CanvasControlsProps {
    lang: Language;
    viewport: { x: number, y: number, zoom: number };
    onZoom: (targetZoom: number) => void;
    onFitView: () => void;
    onUndo: (() => void) | undefined;
    onRedo: (() => void) | undefined;
    canUndo: boolean | undefined;
    canRedo: boolean | undefined;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
    isZoomMenuOpen: boolean;
    setZoomMenuOpen: (open: boolean) => void;
}

const CanvasControls: React.FC<CanvasControlsProps> = ({
    lang, viewport, onZoom, onFitView, onUndo, onRedo, canUndo, canRedo, isFullscreen, toggleFullscreen,
    isZoomMenuOpen, setZoomMenuOpen
}) => {
    const t = translations[lang];

    return (
        <div className="fixed bottom-6 left-28 z-[100] flex gap-4 pointer-events-auto select-none" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
         
            {/* Undo / Redo Group */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/50 dark:border-gray-700/50 rounded-full p-1.5 flex items-center gap-1">
                <button 
                   onClick={onUndo}
                   disabled={!canUndo}
                   className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                   title={`${lang === 'zh' || lang === 'tw' ? '撤销' : 'Undo'} (Ctrl Z)`}
                >
                   <Undo size={18} strokeWidth={2.5}/>
                </button>
                <button 
                   onClick={onRedo}
                   disabled={!canRedo}
                   className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                   title={`${lang === 'zh' || lang === 'tw' ? '重做' : 'Redo'} (Ctrl Shift Z)`}
                >
                   <Redo size={18} strokeWidth={2.5}/>
                </button>
            </div>
            
            {/* Fullscreen Toggle */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/50 dark:border-gray-700/50 rounded-full p-1.5 flex items-center">
                <button 
                   onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                   className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors active:scale-90"
                   title={isFullscreen ? (lang === 'zh' || lang === 'tw' ? '退出全屏' : 'Exit Fullscreen') : (lang === 'zh' || lang === 'tw' ? '全屏' : 'Fullscreen')}
                >
                   {isFullscreen ? <Minimize size={18} strokeWidth={2.5} /> : <Maximize size={18} strokeWidth={2.5} />}
                </button>
            </div>
   
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/50 dark:border-gray-700/50 rounded-full p-1.5 flex items-center gap-1 relative">
               
               {/* Zoom Out */}
               <button 
                   onClick={(e) => { e.stopPropagation(); onZoom(viewport.zoom / 1.6); }}
                   className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors active:scale-90"
                   title={`${t.zoom.out} (Ctrl -)`}
               >
                   <Minus size={18} strokeWidth={2.5}/>
               </button>
   
               {/* Percentage / Menu Trigger */}
               <div className="relative">
                   <button 
                       onClick={(e) => { e.stopPropagation(); setZoomMenuOpen(!isZoomMenuOpen); }}
                       className="px-3 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors min-w-[50px] text-center"
                   >
                       {Math.round(viewport.zoom * 100)}%
                   </button>
   
                   {/* Dropdown Menu */}
                   {isZoomMenuOpen && (
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-gray-700/50 p-2 animate-in fade-in zoom-in-95 origin-bottom">
                            <button 
                               onClick={(e) => { e.stopPropagation(); onZoom(viewport.zoom * 1.6); setZoomMenuOpen(false); }}
                               className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl flex items-center justify-between transition-colors"
                           >
                               <span>{t.zoom.in}</span>
                               <span className="text-[10px] text-gray-400 dark:text-gray-500">Ctrl +</span>
                           </button>
                           <button 
                               onClick={(e) => { e.stopPropagation(); onZoom(viewport.zoom / 1.6); setZoomMenuOpen(false); }}
                               className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl flex items-center justify-between transition-colors"
                           >
                               <span>{t.zoom.out}</span>
                               <span className="text-[10px] text-gray-400 dark:text-gray-500">Ctrl -</span>
                           </button>
                           <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                           <button 
                               onClick={(e) => { e.stopPropagation(); onFitView(); setZoomMenuOpen(false); }}
                               className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl flex items-center justify-between transition-colors"
                           >
                               <span>{t.zoom.fit}</span>
                               <span className="text-[10px] text-gray-400 dark:text-gray-500">Ctrl 0</span>
                           </button>
                           <button 
                               onClick={(e) => { e.stopPropagation(); onZoom(1); setZoomMenuOpen(false); }}
                               className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl flex items-center justify-between transition-colors"
                           >
                               <span>{t.zoom.reset}</span>
                               <span className="text-[10px] text-gray-400 dark:text-gray-500">Ctrl 1</span>
                           </button>
                       </div>
                   )}
               </div>
   
               {/* Zoom In */}
               <button 
                   onClick={(e) => { e.stopPropagation(); onZoom(viewport.zoom * 1.6); }} 
                   className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors active:scale-90"
                   title={`${t.zoom.in} (Ctrl +)`}
               >
                   <Plus size={18} strokeWidth={2.5}/>
               </button>
            </div>
         </div>
    );
};

export default CanvasControls;
import React from 'react';
import { createPortal } from 'react-dom';
import { WorkflowNodeType } from '../../types';
import { translations, Language } from '../../utils/translations';
import { FileText, Image as ImageIcon, Clapperboard, Palette, Video, Music, Layers, StickyNote, FolderPlus } from 'lucide-react';

interface ContextMenuProps {
  contextMenu: { x: number, y: number, worldX: number, worldY: number } | null;
  setContextMenu: (menu: { x: number, y: number, worldX: number, worldY: number } | null) => void;
  onAddNode: (type: WorkflowNodeType, x: number, y: number) => void;
  lang: Language;
  onSaveToMyWorkflows?: () => void;
  t: any;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  contextMenu, 
  setContextMenu, 
  onAddNode, 
  lang,
  onSaveToMyWorkflows,
  t
}) => {
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

import React, { useEffect, useState } from 'react';
import { X, Keyboard, MousePointer2, Command, HelpCircle, Smartphone } from 'lucide-react';
import { Language } from '../utils/translations';
import { isMobileDevice, isMac } from '../utils/deviceUtils';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, lang }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isMacDevice, setIsMacDevice] = useState(false);

  useEffect(() => {
      setIsMobile(isMobileDevice());
      setIsMacDevice(isMac());
  }, []);

  if (!isOpen) return null;

  const isZh = lang === 'zh' || lang === 'tw';

  const t = {
    title: isZh ? '帮助与快捷键' : 'Help & Shortcuts',
    keyboard: isZh ? '键盘快捷键' : 'Keyboard Shortcuts',
    mouse: isZh ? '鼠标操作' : 'Mouse Actions',
    touch: isZh ? '触控操作' : 'Touch Gestures',
    chat: {
      title: isZh ? 'AI 助手' : 'AI Assistant',
      toggle: isZh ? '打开/关闭/切换全屏' : 'Toggle / Fullscreen / Close',
    },
    general: {
        save: isZh ? '保存项目' : 'Save Project',
        undo: isZh ? '撤销' : 'Undo',
        redo: isZh ? '重做' : 'Redo',
        delete: isZh ? '删除选中节点' : 'Delete Selected Node'
    },
    canvas: {
        pan: isZh ? '平移画布' : 'Pan Canvas',
        zoom: isZh ? '缩放画布' : 'Zoom Canvas',
        select: isZh ? '多选' : 'Multi-select',
        move: isZh ? '移动节点' : 'Move Node'
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <HelpCircle size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.title}</h2>
            </div>
            <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
            
            {/* Section: Controls based on Device */}
            <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                    {isMobile ? <Smartphone size={16} /> : <MousePointer2 size={16} />}
                    {isMobile ? t.touch : t.mouse}
                </h3>
                
                <div className="space-y-3">
                    {isMobile ? (
                        // Mobile / Tablet Instructions
                        <>
                             <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t.canvas.move}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                        {isZh ? '按住节点拖动' : 'Drag Node Directly'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t.canvas.pan}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                        {isZh ? '单指拖动空白处' : 'Drag Empty Space'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t.canvas.zoom}</span>
                                <div className="flex items-center gap-2">
                                     <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                         {isZh ? '双指捏合' : 'Two-finger Pinch'}
                                     </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        // Desktop Instructions
                        <>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t.canvas.pan}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Middle Click Drag</span>
                                    <span className="text-xs text-gray-400">or</span>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Space + Drag</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t.canvas.zoom}</span>
                                <div className="flex items-center gap-2">
                                     <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Mouse Wheel</span>
                                     <span className="text-xs text-gray-400">or</span>
                                     <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Trackpad Pinch</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t.canvas.select}</span>
                                <div className="flex items-center gap-2">
                                     <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Shift + Click</span>
                                     <span className="text-xs text-gray-400">or</span>
                                     <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Drag Selection Box</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            {/* Section: Keyboard (Always visible, but maybe simplified for mobile?) */}
            {!isMobile && (
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                        <Keyboard size={16} />
                        {t.keyboard}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Chat Shortcut */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-800">
                            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t.chat.title}</span>
                            <div className="flex flex-col items-end gap-1.5">
                                 {isMacDevice ? (
                                     <div className="flex items-center gap-2">
                                        <kbd className="px-2 py-1 min-w-[60px] justify-center rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Command size={10} /> K
                                        </kbd>
                                     </div>
                                 ) : (
                                     <div className="flex items-center gap-2">
                                        <kbd className="px-2 py-1 min-w-[60px] justify-center rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            Ctrl + K
                                        </kbd>
                                     </div>
                                 )}
                                 <span className="text-[10px] text-gray-400 mt-0.5">({t.chat.toggle})</span>
                            </div>
                        </div>

                        {/* Delete Shortcut */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-800">
                            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t.general.delete}</span>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                                    Delete / Backspace
                                </kbd>
                            </div>
                        </div>

                        {/* Undo/Redo Shortcut */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-800 md:col-span-2">
                            <div className="flex gap-8">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t.general.undo}</span>
                                    <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {isMacDevice ? '⌘' : 'Ctrl'} + Z
                                    </kbd>
                                </div>
                                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t.general.redo}</span>
                                    <div className="flex gap-2">
                                        <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                                            {isMacDevice ? '⌘' : 'Ctrl'} + Shift + Z
                                        </kbd>
                                        <span className="text-xs text-gray-400 self-center">or</span>
                                        <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                                            {isMacDevice ? '⌘' : 'Ctrl'} + Y
                                        </kbd>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">
                Desora.Art v1.0 • {isZh ? '按 ESC 关闭' : 'Press ESC to close'}
            </p>
        </div>

      </div>
    </div>
  );
};

export default HelpModal;

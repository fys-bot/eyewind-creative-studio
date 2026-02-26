
import React from 'react';
import { X, Settings2, CheckCircle2, Grid, MousePointerClick, Moon, Sun, Monitor } from 'lucide-react';
import { AppSettings, ThemeMode } from '../../types';
import { translations, Language } from '../../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  lang: Language;
  themeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, settings, onUpdateSettings, lang, themeMode, onSetThemeMode 
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const handleToggle = (key: keyof AppSettings) => {
      onUpdateSettings({ ...settings, [key]: !settings[key] });
  };

  const getThemeLabel = (mode: ThemeMode) => {
      if (mode === 'system') return lang === 'zh' || lang === 'tw' ? '跟随系统' : 'System';
      if (mode === 'dark') return lang === 'zh' || lang === 'tw' ? '深色模式' : 'Dark';
      return lang === 'zh' || lang === 'tw' ? '浅色模式' : 'Light';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-black rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
         <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
             <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 <Settings2 size={18} className="text-gray-900 dark:text-white"/>
                 {t.settings?.title || "Preferences"}
             </h3>
             <button onClick={onClose} className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                 <X size={18}/>
             </button>
         </div>

         <div className="p-6 space-y-6">
             {/* Appearance Section */}
             <div>
                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t.settings?.appearance || "Appearance"}</h4>
                 
                 {/* Theme Selector */}
                 <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-xl flex">
                     {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                         <button
                            key={mode}
                            onClick={() => onSetThemeMode(mode)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                                themeMode === mode 
                                ? 'bg-white dark:bg-gray-800 shadow-sm text-black dark:text-white' 
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                         >
                             {mode === 'light' && <Sun size={14}/>}
                             {mode === 'dark' && <Moon size={14}/>}
                             {mode === 'system' && <Monitor size={14}/>}
                             {getThemeLabel(mode)}
                         </button>
                     ))}
                 </div>
             </div>

             <div className="h-px bg-gray-100 dark:bg-gray-800"></div>

             {/* Interaction Section */}
             <div>
                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t.settings?.interaction || "Canvas & Interaction"}</h4>
                 
                 {/* Auto-hide Handles */}
                 <button 
                    onClick={() => handleToggle('autoHideHandles')}
                    className="w-full flex items-center justify-between group"
                 >
                     <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${settings.autoHideHandles ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-900 text-gray-400'}`}>
                             <MousePointerClick size={16}/>
                         </div>
                         <div className="flex flex-col text-left">
                             <span className={`text-sm font-medium transition-colors ${settings.autoHideHandles ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                 {t.settings?.auto_hide_handles || "Auto-hide Connections"}
                             </span>
                             <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                 {t.settings?.auto_hide_desc || "Only show connection points on hover"}
                             </span>
                         </div>
                     </div>
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${settings.autoHideHandles ? 'bg-black dark:bg-white border-transparent text-white dark:text-black' : 'border-gray-300 dark:border-gray-600 text-transparent'}`}>
                         <CheckCircle2 size={12} fill="currentColor" className="text-white dark:text-black"/>
                     </div>
                 </button>

                 {/* Show Grid */}
                 <button 
                    onClick={() => handleToggle('showGrid')}
                    className="w-full flex items-center justify-between group mt-4"
                 >
                     <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${settings.showGrid ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-900 text-gray-400'}`}>
                             <Grid size={16}/>
                         </div>
                         <div className="flex flex-col text-left">
                             <span className={`text-sm font-medium transition-colors ${settings.showGrid ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                 {t.settings?.show_grid || "Show Grid"}
                             </span>
                         </div>
                     </div>
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${settings.showGrid ? 'bg-black dark:bg-white border-transparent text-white dark:text-black' : 'border-gray-300 dark:border-gray-600 text-transparent'}`}>
                         <CheckCircle2 size={12} fill="currentColor" className="text-white dark:text-black"/>
                     </div>
                 </button>
             </div>
         </div>
      </div>
    </div>
  );
};

export default SettingsModal;

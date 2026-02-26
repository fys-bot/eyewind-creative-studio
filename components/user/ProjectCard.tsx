
import React, { useRef, memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Folder, MoreVertical, Edit3, Tag, Copy, FileInput, Trash2, Clock } from 'lucide-react';
import { Project } from '../../types';
import { translations, Language } from '../../utils/translations';

interface ProjectCardProps {
  project: Project;
  lang: Language;
  activeMenuId: string | null;
  renamingId: string | null;
  renameValue: string;
  isMobile: boolean;
  onOpen: (project: Project) => void;
  onMenuAction: (e: React.MouseEvent, action: string, projectId: string) => void;
  onSetMenu: (id: string | null) => void;
  onSetRenameValue: (val: string) => void;
  onSubmitRename: () => void;
}

const ProjectCard = memo(forwardRef<HTMLDivElement, ProjectCardProps>(({
  project,
  lang,
  activeMenuId,
  renamingId,
  renameValue,
  isMobile,
  onOpen,
  onMenuAction,
  onSetMenu,
  onSetRenameValue,
  onSubmitRename
}, ref) => {
  const t = translations[lang];
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus effect for rename input
  React.useEffect(() => {
    if (renamingId === project.id && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingId, project.id]);

  return (
    <motion.div 
       ref={ref}
       layout
       initial={{ opacity: 0, scale: 0.9 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
       transition={{ duration: 0.3 }}
       className="group flex flex-col gap-2 w-full"
    >
        {/* 缩略图 + 绝对定位菜单的包装器 */}
        <div className="relative w-full aspect-video">
            {/* 卡片图像容器 */}
            <div 
               onClick={() => onOpen(project)}
               className="absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm group-hover:shadow-md transition-shadow cursor-pointer isolate transform-gpu"
            >
                {project.thumbnail ? (
                   <img 
                       src={project.thumbnail} 
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
                       loading="lazy"
                       style={{ objectPosition: project.thumbnailPosition || 'center' }}
                       onLoad={(e) => {
                           // Only apply auto-adjustment if no custom position is saved
                           if (!project.thumbnailPosition) {
                               const img = e.currentTarget;
                               if (img.naturalHeight > img.naturalWidth) {
                                   img.style.objectPosition = 'top';
                               }
                           }
                       }}
                   />
               ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                        <Folder size={48} className="text-gray-200 dark:text-gray-700"/>
                    </div>
                )}
                
                {/* 标签覆盖层 */}
                {project.tags && project.tags.length > 0 && (
                    <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[80%] z-10">
                        {project.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] bg-black/40 dark:bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full truncate max-w-[80px] shadow-sm border border-white/10 hover:bg-black/60 dark:hover:bg-black/80 transition-colors">
                                {tag}
                            </span>
                        ))}
                        {project.tags.length > 3 && (
                            <span className="text-[10px] bg-black/40 dark:bg-black/60 backdrop-blur-md text-white px-1.5 py-0.5 rounded-full shadow-sm border border-white/10">+{project.tags.length - 3}</span>
                        )}
                    </div>
                )}
            </div>

            {/* 更多按钮 */}
            <div 
               className={`absolute top-2 right-2 z-20 transition-opacity ${activeMenuId === project.id || isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} 
               onClick={e => e.stopPropagation()}
            >
                <button 
                   onClick={(e) => { e.stopPropagation(); onSetMenu(activeMenuId === project.id ? null : project.id); }}
                   className={`p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 ${activeMenuId === project.id ? 'opacity-100 ring-2 ring-blue-100 dark:ring-blue-900' : ''}`}
                >
                    <MoreVertical size={16} className="text-gray-600 dark:text-gray-300"/>
                </button>

                {/* 下拉菜单 */}
                {activeMenuId === project.id && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                        <button onClick={(e) => onMenuAction(e, 'rename', project.id)} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2">
                            <Edit3 size={14} className="text-gray-400"/> {t.dashboard.menu.rename}
                        </button>
                        <button onClick={(e) => onMenuAction(e, 'tags', project.id)} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2">
                            <Tag size={14} className="text-gray-400"/> {t.dashboard.menu.tags}
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                        <button onClick={(e) => onMenuAction(e, 'duplicate', project.id)} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2">
                            <Copy size={14} className="text-gray-400"/> {t.dashboard.menu.duplicate}
                        </button>
                        <button onClick={(e) => onMenuAction(e, 'duplicate_workflow', project.id)} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2">
                            <FileInput size={14} className="text-gray-400"/> {t.dashboard.menu.duplicateWorkflow}
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                        <button onClick={(e) => onMenuAction(e, 'delete', project.id)} className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2">
                            <Trash2 size={14}/> {t.dashboard.menu.delete}
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* 信息 / 重命名输入框 */}
        <div className="px-1 relative">
            {renamingId === project.id ? (
                <div className="flex items-center gap-1">
                    <input 
                        ref={renameInputRef}
                        type="text" 
                        value={renameValue}
                        onChange={(e) => onSetRenameValue(e.target.value)}
                        onBlur={onSubmitRename}
                        onKeyDown={(e) => e.key === 'Enter' && onSubmitRename()}
                        className="w-full text-sm font-bold bg-white dark:bg-gray-800 border border-blue-500 rounded px-1 py-0.5 outline-none appearance-none text-gray-900 dark:text-white"
                    />
                </div>
            ) : (
                <h3 
                   className="font-bold text-gray-800 dark:text-gray-200 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
                   onClick={(e) => onMenuAction(e, 'rename', project.id)}
                >
                    {project.name || t.dashboard.untitled}
                </h3>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                <Clock size={10}/>
                {t.dashboard.lastUpdated} {new Date(project.updatedAt).toLocaleDateString()}
            </p>
        </div>
    </motion.div>
  );
}), (prev, next) => {
    // Custom comparison to ensure strict memoization
    return (
        prev.project === next.project &&
        prev.lang === next.lang &&
        prev.activeMenuId === next.activeMenuId &&
        prev.renamingId === next.renamingId &&
        prev.renameValue === next.renameValue &&
        prev.isMobile === next.isMobile
    );
});

export default ProjectCard;

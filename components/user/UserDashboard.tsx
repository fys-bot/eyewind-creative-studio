import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project, User } from '../../types';
import { Plus, Search, Folder, Clock, MoreVertical, LogOut, Crown, User as UserIcon, Trash2, Copy, FileInput, Edit3, X, AlertTriangle, Tag, Filter, Upload, Zap, Shield, LayoutDashboard, Globe, Check, Settings, CreditCard, HelpCircle, ChevronDown } from 'lucide-react';
import { translations, Language } from '../../utils/translations';
import { createNewProject, deleteProject, duplicateProject, renameProject, getProjects, updateProjectTags, saveProject } from '../../services/storageService';
import { importProjectPackage } from '../../services/projectIo';
import LoginModal from './LoginModal';
import { useAuth } from '../../modules/auth/AuthContext';
import { useToast } from '../ui/ToastContext';
import { Logo } from '../ui/Logo';
import WorkflowMarketplace from './WorkflowMarketplace';
import CommunitySquare from './CommunitySquare';

import { motion, AnimatePresence } from 'framer-motion';
import { isMobileDevice } from '../../utils/deviceUtils';
import ProjectCard from './ProjectCard';

interface UserDashboardProps {
  // user prop removed, used from context
  projects: Project[];
  onOpenProject: (project: Project) => void;
  // onLogin/onLogout removed, used from context
  lang: Language;
  onSetLang: (lang: Language) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAdmin: () => void; // New Prop for Admin Access
  onRefresh?: () => void; // Callback to notify parent to refresh projects
}

const UserDashboard: React.FC<UserDashboardProps> = ({ 
    projects: initialProjects, onOpenProject, lang, onSetLang, theme, onToggleTheme, onOpenAdmin, onRefresh
}) => {
  const t = translations[lang];
  const { user, openLogin, isLoginOpen, closeLogin, logout, openSubscription, openProfile } = useAuth();
  const { addToast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(12);

  // Tab State
  const [activeTab, setActiveTab] = useState<'square' | 'workflow' | 'workspace'>('workspace');

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // 菜单状态
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 用户菜单状态
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // 语言菜单状态
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  
  // 重命名状态
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // 标签管理状态
  const [tagManageId, setTagManageId] = useState<string | null>(null);
  const [tagInputValue, setTagInputValue] = useState("");
  const [tempTags, setTempTags] = useState<string[]>([]);

  // 删除状态
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 导入状态
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
      setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // Reset pagination when filter changes
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, activeTagFilter, activeTab]);

  // 点击菜单外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // menuRef moved inside ProjectCard mostly, but logic kept for safety
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 聚焦重命名输入框 (Moved to ProjectCard but keeping refs for safety)
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
        renameInputRef.current.focus();
    }
  }, [renamingId]);

  // 打开标签管理器时初始化标签
  useEffect(() => {
    if (tagManageId) {
        const p = projects.find(p => p.id === tagManageId);
        setTempTags(p?.tags || []);
        setTagInputValue("");
    }
  }, [tagManageId, projects]);

  const handleCreate = async () => {
      const p = await createNewProject();
      if (onRefresh) onRefresh();
      onOpenProject(p);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          let project: Project;
          
          if (file.name.endsWith('.nexus') || file.name.endsWith('.zip')) {
              // New Package Import
              project = await importProjectPackage(file);
          } else {
              // Legacy JSON import
              const text = await file.text();
              project = JSON.parse(text);
              if (!project.nodes || !project.id) throw new Error("Invalid project file format");
              project.id = Math.random().toString(36).substr(2, 9);
              project.name = `Imported - ${project.name}`;
              project.updatedAt = Date.now();
          }

          try {
              await saveProject(project);
              const updated = await getProjects();
              setProjects(updated);
              if (onRefresh) onRefresh();
              addToast(t.dashboard?.importedSuccess || "Imported successfully", 'success');
          } catch (err) {
              console.error(err);
              addToast("Project too large to save to browser storage. It implies successful import but persistence might fail.", 'warning');
          }
      } catch (err: any) {
          addToast("Import failed: " + err.message, 'error');
      } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // --- 筛选逻辑 ---
  
  const allUniqueTags = useMemo(() => {
    const tags = new Set<string>();
    projects.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = activeTagFilter ? p.tags?.includes(activeTagFilter) : true;
        return matchesSearch && matchesTag;
    });
  }, [projects, searchQuery, activeTagFilter]);

  // Pagination Logic
  const visibleProjects = useMemo(() => {
      return filteredProjects.slice(0, visibleCount);
  }, [filteredProjects, visibleCount]);

  // --- 动作处理程序 ---

  // Use useCallback to ensure stable reference for memoized ProjectCard
  const handleMenuAction = React.useCallback(async (e: React.MouseEvent, action: string, projectId: string) => {
    e.stopPropagation();
    setActiveMenuId(null);

    if (action === 'rename') {
        const p = projects.find(p => p.id === projectId);
        if (p) {
            setRenameValue(p.name);
            setRenamingId(projectId);
        }
    } else if (action === 'duplicate') {
        const updated = await duplicateProject(projectId, false, t.dashboard.menu.copyPrefix);
        setProjects(updated);
        if (onRefresh) onRefresh();
    } else if (action === 'duplicate_workflow') {
        const updated = await duplicateProject(projectId, true, t.dashboard.menu.copyPrefix);
        setProjects(updated);
        if (onRefresh) onRefresh();
    } else if (action === 'tags') {
        setTagManageId(projectId);
    } else if (action === 'delete') {
        setDeleteConfirmId(projectId);
    }
  }, [projects, t, onRefresh]); // Dependencies updated

  const submitRename = React.useCallback(async () => {
    if (renamingId && renameValue.trim()) {
        const updated = await renameProject(renamingId, renameValue.trim());
        setProjects(updated);
        if (onRefresh) onRefresh();
    }
    setRenamingId(null);
  }, [renamingId, renameValue, onRefresh]);

  const confirmDelete = async () => {
      if (deleteConfirmId) {
          const updated = await deleteProject(deleteConfirmId);
          setProjects(updated);
          if (onRefresh) onRefresh();
          setDeleteConfirmId(null);
      }
  };

  // --- 标签逻辑 ---
  const handleAddTag = () => {
      if (tagInputValue.trim() && !tempTags.includes(tagInputValue.trim())) {
          setTempTags([...tempTags, tagInputValue.trim()]);
          setTagInputValue("");
      }
  };
  
  const handleRemoveTag = (tag: string) => {
      setTempTags(tempTags.filter(t => t !== tag));
  };

  const saveTags = async () => {
      if (tagManageId) {
          const updated = await updateProjectTags(tagManageId, tempTags);
          setProjects(updated);
          if (onRefresh) onRefresh();
          setTagManageId(null);
      }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300 overflow-y-auto">
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={closeLogin}
        lang={lang}
      />

      {/* 隐藏的文件输入框 */}
      <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }}
          className="hidden" 
          accept=".json,.nexus,.zip" 
          onChange={handleFileChange} 
      />

      {/* 删除确认模态框 */}
      {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                 <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
                     <AlertTriangle className="text-red-500 dark:text-red-400" size={20}/>
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t.dashboard.deleteConfirm.title}</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t.dashboard.deleteConfirm.description}</p>
                 <div className="flex gap-3">
                     <button 
                       onClick={() => setDeleteConfirmId(null)}
                       className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                     >
                         {t.dashboard.deleteConfirm.cancel}
                     </button>
                     <button 
                       onClick={confirmDelete}
                       className="flex-1 py-2 rounded-xl bg-red-600 font-bold text-white hover:bg-red-700"
                     >
                         {t.dashboard.deleteConfirm.confirm}
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* 标签管理模态框 */}
      {tagManageId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Tag size={18} className="text-blue-500"/>
                        {t.dashboard.tags.title}
                    </h3>
                    <button onClick={() => setTagManageId(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
                        <X size={18}/>
                    </button>
                </div>

                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        value={tagInputValue}
                        onChange={(e) => setTagInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder={t.dashboard.tags.placeholder}
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                        autoFocus
                        list="existing-tags" // Link to datalist
                    />
                    <datalist id="existing-tags">
                        {allUniqueTags.map(tag => (
                            <option key={tag} value={tag} />
                        ))}
                    </datalist>
                    <button 
                        onClick={handleAddTag}
                        disabled={!tagInputValue.trim()}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
                    >
                        {t.dashboard.tags.add}
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Existing Tags</p>
                    <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                        {allUniqueTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => {
                                    if (!tempTags.includes(tag)) {
                                        setTempTags([...tempTags, tag]);
                                    }
                                }}
                                disabled={tempTags.includes(tag)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                    tempTags.includes(tag) 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-400 border-blue-100 dark:border-blue-800 opacity-50 cursor-default'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-500'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                        {allUniqueTags.length === 0 && <span className="text-xs text-gray-400 italic">No existing tags</span>}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6 min-h-[60px] content-start bg-gray-50/50 dark:bg-gray-800/50 p-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    {tempTags.length === 0 ? (
                        <span className="text-sm text-gray-400 w-full text-center py-2">{t.dashboard.tags.empty}</span>
                    ) : (
                        tempTags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 ml-1">
                                    <X size={12}/>
                                </button>
                            </span>
                        ))
                    )}
                </div>

                <button 
                    onClick={saveTags}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none"
                >
                    {t.save}
                </button>
            </div>
        </div>
      )}

      {/* 顶部导航栏 (TapNow 风格) */}
      <header className="fixed top-0 w-full h-16 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] text-black dark:text-white z-50 flex items-center justify-between px-4 md:px-6">
         {/* Left: Logo & Nav */}
         <div className="flex items-center gap-8">
             <div className="flex items-center gap-2">
                 <Logo size={28} />
                 <span className="font-bold text-lg tracking-tight">Desora.Art</span>
             </div>
             
             {/* Desktop Nav Links */}
             <nav className="hidden md:flex items-center gap-6">
                 <button 
                    onClick={() => setActiveTab('square')}
                    className={`text-sm font-medium transition-colors ${activeTab === 'square' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                 >
                    广场
                 </button>
                 <button 
                    onClick={() => setActiveTab('workflow')}
                    className={`text-sm font-medium transition-colors ${activeTab === 'workflow' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                 >
                    工作流
                 </button>
                 <button 
                    onClick={() => setActiveTab('workspace')}
                    className={`text-sm font-medium transition-colors ${activeTab === 'workspace' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                 >
                    工作空间
                 </button>
             </nav>
         </div>

         {/* Right: Actions & Profile */}
         <div className="flex items-center gap-2 md:gap-4">
             {/* Language Dropdown */}
             <div className="relative" ref={langMenuRef}>
                <button 
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <Globe size={14} />
                    <span>{lang === 'en' ? 'English' : lang === 'zh' ? '简体中文' : '繁體中文'}</span>
                </button>
                {showLangMenu && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl p-1 z-50">
                        {['en', 'zh', 'tw'].map((l) => (
                            <button 
                                key={l}
                                onClick={() => { onSetLang(l as Language); setShowLangMenu(false); }} 
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${lang === l ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                            >
                                {l === 'en' ? 'English' : l === 'zh' ? '简体中文' : '繁體中文'}
                                {lang === l && <Check size={12}/>}
                            </button>
                        ))}
                    </div>
                )}
             </div>
             
             {user ? (
                 <div className="flex items-center gap-4 relative" ref={userMenuRef}>
                     <button onClick={openSubscription} className="hidden md:flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors text-xs font-medium">
                        <Crown size={14} className="text-yellow-500" fill="currentColor"/>
                        <span>{t.upgrade}</span>
                     </button>
                     
                     <div onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-500 transition-all">
                         {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-blue-600 text-white">{user.name?.substring(0,2).toUpperCase() || 'LB'}</div>}
                     </div>

                     {/* User Dropdown Menu */}
                     {showUserMenu && (
                         <div className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 text-gray-900 dark:text-gray-100">
                             {/* User Header */}
                             <div className="flex items-center gap-3 p-3 mb-2">
                                 <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
                                     {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover rounded-full"/> : (user.name?.substring(0,2).toUpperCase() || 'LB')}
                                 </div>
                                 <div className="overflow-hidden">
                                     <div className="font-bold text-gray-900 dark:text-white text-sm truncate">{user.name || 'User'}</div>
                                     <div className="text-xs text-gray-500 truncate">{user.email || 'user@example.com'}</div>
                                 </div>
                             </div>

                             {/* Teams Section */}
                             <div className="px-2 mb-2">
                                 <div className="text-[10px] text-gray-500 font-bold mb-1">{lang === 'zh' || lang === 'tw' ? '已加入的团队' : 'Joined Teams'}</div>
                                 <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer group">
                                     <div className="flex items-center gap-2">
                                         <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white">L</div>
                                         <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{user.name}{lang === 'zh' || lang === 'tw' ? '的个人组织' : "'s Team"}</span>
                                     </div>
                                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <Settings size={12} className="text-gray-400 hover:text-black dark:hover:text-white"/>
                                         <Check size={12} className="text-blue-600 dark:text-blue-400"/>
                                     </div>
                                 </div>
                                 <button className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center gap-2 mt-1">
                                     <Plus size={12}/>
                                     {lang === 'zh' || lang === 'tw' ? '创建团队' : 'Create Team'}
                                 </button>
                             </div>

                             <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                             {/* Menu Items */}
                             <div className="space-y-0.5">
                                 <button onClick={() => { openProfile(); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors">
                                     <UserIcon size={14}/>
                                     {lang === 'zh' || lang === 'tw' ? '个人主页' : 'Profile'}
                                 </button>
                                 <button onClick={() => { openProfile('settings'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors">
                                     <Settings size={14}/>
                                     {lang === 'zh' || lang === 'tw' ? '账户管理' : 'Account Settings'}
                                 </button>
                                 <button onClick={() => { onOpenAdmin(); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors">
                                     <Shield size={14}/>
                                     {lang === 'zh' || lang === 'tw' ? '管理后台' : 'Admin Console'}
                                 </button>
                             </div>

                             <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                             <div className="space-y-0.5">
                                 <button onClick={() => { openSubscription(); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors">
                                     <CreditCard size={14}/>
                                     {lang === 'zh' || lang === 'tw' ? '订阅套餐' : 'Subscription'}
                                 </button>
                                 <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors">
                                     <HelpCircle size={14}/>
                                     {lang === 'zh' || lang === 'tw' ? '使用教程' : 'Tutorials'}
                                 </button>
                                 <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors mt-1">
                                     <LogOut size={14}/>
                                     {lang === 'zh' || lang === 'tw' ? '登出账号' : 'Logout'}
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
             ) : (
                 <button onClick={openLogin} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">
                     {lang === 'zh' || lang === 'tw' ? '开始体验' : 'Start Experience'}
                 </button>
             )}
         </div>
      </header>

      {/* 主要内容 */}
      <main className="pt-20 md:pt-24 px-4 md:px-8 max-w-[1600px] mx-auto pb-20 overflow-y-auto min-h-screen">
         
         {activeTab === 'workflow' && (
             <WorkflowMarketplace onOpenProject={onOpenProject} lang={lang} />
         )}

         {activeTab === 'square' && (
             <CommunitySquare lang={lang} />
         )}

         {activeTab === 'workspace' && (
            <>
         {/* 二级工具栏: Tabs & Actions */}
         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 mt-2">
             {/* Left: Tabs */}
             <div className="flex items-center gap-6">
                 <button className="text-sm font-bold text-gray-900 dark:text-white border-b-2 border-blue-500 pb-1 px-1">
                     {t.dashboard?.myCanvas || "我的画布"}
                 </button>
                 <button className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white pb-1 px-1 transition-colors flex items-center gap-1">
                     {t.dashboard?.teamCanvas || "团队画布"} <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">Pro</span>
                 </button>
             </div>

             {/* Right: Search & Create */}
             <div className="flex items-center gap-3 w-full md:w-auto">
                 <button className="hidden md:flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mr-2">
                     {t.dashboard?.lastUpdated || "更新于"}
                     <Filter size={12} />
                 </button>

                 <div className="relative group flex-1 md:flex-none">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" size={14}/>
                     <input 
                        type="text" 
                        placeholder={t.dashboard?.searchPlaceholder || "搜索"} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-gray-50/5 border border-transparent focus:border-blue-500 rounded-lg text-xs w-full md:w-64 transition-all text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none"
                     />
                 </div>

                 <button 
                    onClick={handleImportClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-bold transition-colors mr-2"
                    title={t.dashboard.import || "Import"}
                 >
                     <Upload size={14} />
                     <span className="hidden sm:inline">{t.dashboard.import || "导入项目"}</span>
                 </button>

                 <button 
                    onClick={user ? handleCreate : openLogin}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                 >
                     <Plus size={14} strokeWidth={3} />
                     {t.dashboard.newProject}
                 </button>
             </div>
         </div>

         {!user ? (
             <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-500">
                 <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                     <UserIcon size={48} className="text-gray-400 dark:text-gray-500" />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                     {lang === 'zh' || lang === 'tw' ? '尚未登录' : 'Not Logged In'}
                 </h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                     {lang === 'zh' || lang === 'tw' 
                        ? '请先登录来开启 Desora 旅程' 
                        : 'Please login to start your Desora journey'}
                 </p>
                 <button 
                    onClick={openLogin}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                 >
                     {lang === 'zh' || lang === 'tw' ? '登录以开始使用' : 'Login to start using'}
                 </button>
             </div>
         ) : (
             <>
         {/* 标签筛选 (更紧凑) */}
         {allUniqueTags.length > 0 && (
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
                <button 
                    onClick={() => setActiveTagFilter(null)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${!activeTagFilter ? 'bg-gray-900 dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                >
                    {t.dashboard.filterAll}
                </button>
                {allUniqueTags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${activeTagFilter === tag ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-[#1a1a1a] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                        {tag}
                    </button>
                ))}
            </div>
         )}

         {/* 项目网格 - 添加 items-start 以防止 Safari 中“新项目”卡片拉伸 */}
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
             {/* 新建项目卡片 - 使用 aspect-video 统一长宽比 */}
             <div className="relative w-full aspect-video group">
                <button 
                    onClick={handleCreate}
                    className="absolute inset-0 w-full h-full bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer active:scale-[0.98]"
                >
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Plus size={24} className="text-gray-600 dark:text-gray-300"/>
                    </div>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">{t.dashboard.newProject}</span>
                </button>
             </div>

             {/* 项目卡片 */}
             <AnimatePresence mode="popLayout">
             {visibleProjects.map(project => (
                 <ProjectCard
                    key={project.id}
                    project={project}
                    lang={lang}
                    activeMenuId={activeMenuId}
                    renamingId={renamingId}
                    renameValue={renameValue}
                    isMobile={isMobile}
                    onOpen={onOpenProject}
                    onMenuAction={handleMenuAction}
                    onSetMenu={setActiveMenuId}
                    onSetRenameValue={setRenameValue}
                    onSubmitRename={submitRename}
                 />
             ))}
             </AnimatePresence>
         </div>
         
         {/* Load More Button */}
         {visibleProjects.length < filteredProjects.length && (
             <div className="flex justify-center mt-8 pb-8">
                 <button 
                    onClick={() => setVisibleCount(prev => prev + 12)}
                    className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                 >
                     {lang === 'zh' || lang === 'tw' ? '加载更多' : 'Load More'} ({filteredProjects.length - visibleProjects.length} remaining)
                 </button>
             </div>
         )}
         </>
         )}
         </>
         )}
      </main>
    </div>
  );
};

export default UserDashboard;

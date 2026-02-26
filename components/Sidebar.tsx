import React, { useState, useEffect } from 'react';
import { 
  LayoutTemplate, 
  MousePointer2, 
  Clapperboard, 
  Video, 
  Music, 
  Layers, // ControlNet
  Palette,

  Brush, // Inpainting 
  Gamepad2, // Template Icon
  Smartphone, // Template Icon
  MonitorPlay, // Template Icon
  PlusCircle,
  UserCircle2,
  ScanLine,
  Eye,
  FileText,
  Image as ImageIcon,

  Ghost, // Template Icon
  StickyNote,

  // New Category Icons
  FolderInput,
  Bot,
  Sparkles,
  // Cpu,
  MonitorUp,
  X,
  Share2,
  Users,
  Link as LinkIcon,
  MessageSquare,
  ArrowRightToLine,
  Maximize, // Upscale
  ArrowLeftRight, // Compare
  Languages, // Translator
  Wand, // Refine
  Activity, // Anim
  ShoppingBag, // Ecommerce
  Globe, // Global/Web

  LayoutGrid, // All
  Megaphone, // Ads
  Coffee, // Life
  Wrench, // Tools
  Smile, // Fun
  Shirt, // Fashion
  Search, // Search Icon
  Star,
  FolderHeart,

} from 'lucide-react';
import { WorkflowTemplate, WorkflowNodeType, WorkflowNode, WorkflowEdge, CommentMessage } from '../types';
import { Language, translations } from '../utils/translations';
import { LayerPanel } from './canvas/LayerPanel';
import { TEMPLATES } from '../constants';
import { TEMPLATE_CATEGORIES, TemplateCategory } from '../data/templates/categories';
import { getProjects, getCurrentUser, getProjectComments, addProjectComment } from '../services/storageService';

interface SidebarProps {
  onSelectTemplate: (template: WorkflowTemplate | null) => void;
  onAddNode: (type: WorkflowNodeType) => void;
  lang: Language;
  isHidden?: boolean;
  onToggleLayerPanel?: () => void;
  isLayerPanelOpen?: boolean;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  onFocusNodes?: (ids: string[]) => void;
  onUpdateNodeData?: (id: string, data: any) => void;
  onOpenTeamShare?: () => void;
  onOpenPublicLink?: () => void;
  currentProjectId?: string | null;
  forceShowTemplates?: number;
}

// 1. 定义节点类型与图标的映射关系
const TOOL_DEFINITIONS: Record<string, any> = {
  text_input: FileText,
  image_input: ImageIcon,
  character_ref: UserCircle2,
  script_agent: Clapperboard,
  image_gen: Palette,
  video_gen: Video,
  audio_gen: Music,
  video_composer: Layers,
  preview: Eye,
  sticky_note: StickyNote,
  // logic_router: GitBranch,
  // logic_aggregator: Merge,
  // string_processor: CaseSensitive,
  ai_refine: Wand,
  prompt_translator: Languages,
  image_upscale: Maximize,
  image_compare: ArrowLeftRight,

};

// 2. 定义分类结构
type ToolCategory = 'input' | 'agent' | 'generate' | 'logic' | 'output';

interface ToolGroup {
  id: ToolCategory;
  icon: any;
  tools: WorkflowNodeType[];
}

const TOOL_CATEGORIES: ToolGroup[] = [
  {
    id: 'input',
    icon: FolderInput,
    tools: ['text_input', 'image_input', 'character_ref', 'sticky_note']
  },
  {
    id: 'agent',
    icon: Bot,
    tools: ['script_agent', 'ai_refine', 'prompt_translator']
  },
  {
    id: 'generate',
    icon: Sparkles,
    // Generators and Effects
    tools: ['image_gen', 'video_gen', 'audio_gen', 'video_composer']
  },



];

interface ToolItemProps { 
    icon: any; 
    label: string; 
    onClick: () => void; 
    isActive?: boolean; 
    showTooltip?: boolean;
}

const ToolItem: React.FC<ToolItemProps> = ({ 
    icon: Icon, 
    label, 
    onClick, 
    isActive = false, 
    showTooltip = true
  }) => (
    <div className="relative group flex items-center justify-center w-full">
      <button 
        onClick={onClick}
        className={`w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center relative
          ${isActive 
            ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg scale-110 z-10' 
            : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white hover:scale-110'
          }
        `}
      >
        <Icon size={20} className={isActive ? "text-white dark:text-black" : ""} strokeWidth={isActive ? 2.5 : 2} />
      </button>
      
      {/* 右侧工具提示 - 仅在未展开菜单且未激活时显示 */}
      {showTooltip && !isActive && (
        <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 translate-x-[-8px] group-hover:translate-x-0 shadow-xl z-[70] hidden sm:block">
          {label}
          {/* 小三角箭头 */}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 dark:bg-white transform rotate-45"></div>
        </div>
      )}
    </div>
  );

const Sidebar: React.FC<SidebarProps> = ({ onSelectTemplate, onAddNode, lang, isHidden = false, onToggleLayerPanel, isLayerPanelOpen, nodes, edges, onFocusNodes, onUpdateNodeData, onOpenTeamShare, onOpenPublicLink, currentProjectId, forceShowTemplates }) => {
  const t = translations[lang];
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState<TemplateCategory>('all');
  const [templateSearch, setTemplateSearch] = useState(''); // New: Search State
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
        return JSON.parse(localStorage.getItem('nexus_fav_templates') || '[]');
    } catch { return []; }
  });

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFavs = favorites.includes(id) 
        ? favorites.filter(f => f !== id)
        : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('nexus_fav_templates', JSON.stringify(newFavs));
  };

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [myTemplates, setMyTemplates] = useState<WorkflowTemplate[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentMessage[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // Handle External Trigger
  useEffect(() => {
    if (forceShowTemplates) {
        setShowTemplates(true);
        setActiveCategory(null);
        setActiveTool(null);
        if (isLayerPanelOpen && onToggleLayerPanel) {
            onToggleLayerPanel();
        }
    }
  }, [forceShowTemplates]);

  // 切换模板面板
  const toggleTemplates = () => {
    const newState = !showTemplates;
    setShowTemplates(newState);
    if (newState) {
      setActiveCategory(null);
      setActiveTool(null);
      // Close layer panel if open
      if (isLayerPanelOpen && onToggleLayerPanel) {
         onToggleLayerPanel();
      }
    }
  };

  // 切换工具分类面板
  const toggleCategory = (catId: ToolCategory) => {
    if (activeCategory === catId) {
      setActiveCategory(null);
    } else {
      setActiveCategory(catId);
      setShowTemplates(false);
      setActiveTool(null);
      // Close layer panel if open
      if (isLayerPanelOpen && onToggleLayerPanel) {
         onToggleLayerPanel();
      }
    }
  };

  // 模板图标辅助函数
  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'Gamepad2': return <Gamepad2 size={16} />;
      case 'Smartphone': return <Smartphone size={16} />;
      case 'Layers': return <Layers size={16} />; 
      case 'MonitorPlay': return <MonitorPlay size={16} />; 
      case 'Ghost': return <Ghost size={16} />; 
      case 'UserCircle2': return <UserCircle2 size={16} />;
      case 'FolderInput': return <FolderInput size={16} />;
      case 'Palette': return <Palette size={16} />;
      case 'Video': return <Video size={16} />;
      case 'Music': return <Music size={16} />;
      case 'ShoppingBag': return <ShoppingBag size={16} />;
      case 'Globe': return <Globe size={16} />;

      case 'LayoutGrid': return <LayoutGrid size={16} />;
      case 'Sparkles': return <Sparkles size={16} />;
      case 'Megaphone': return <Megaphone size={16} />;
      case 'Coffee': return <Coffee size={16} />;
      case 'Wrench': return <Wrench size={16} />;
      case 'Smile': return <Smile size={16} />;
      case 'Shirt': return <Shirt size={16} />;
      default: return <Clapperboard size={16} />;
    }
  };

  const getTemplateInfo = (template: WorkflowTemplate) => {
    // Dynamic lookup: try to find a translation key matching the template ID
    // Key format in locales: templates.<id>_name and templates.<id>_desc
    // If not found, fallback to the hardcoded name/desc in the template object
    
    // @ts-ignore
    const translatedName = t.templates?.[`${template.id}_name`];
    // @ts-ignore
    const translatedDesc = t.templates?.[`${template.id}_desc`];

    if (translatedName && translatedDesc) {
        return { name: translatedName, desc: translatedDesc };
    }

    // Fallback for new templates that might not have translations yet
    return { name: template.name, desc: template.description };
  };

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const projects = await getProjects();
        const userTemplates = projects
          .filter(p => (p.tags || []).some(tag => ['template', 'my-template', '模板'].includes(tag)))
          .map<WorkflowTemplate>(p => ({
            id: `user-${p.id}`,
            name: p.name || '我的模板',
            description: p.description || '来自我的项目',
            icon: 'FolderInput',
            nodes: p.nodes || [],
            edges: p.edges || [],
            thumbnail: p.thumbnail
          }));
        setMyTemplates(userTemplates);
      } catch (e) { console.error("Failed to load templates", e); }
    };
    loadTemplates();
  }, []);
  
  useEffect(() => {
    if (!showTemplates) return;
    const loadTemplates = async () => {
      try {
        const projects = await getProjects();
        const userTemplates = projects
          .filter(p => (p.tags || []).some(tag => ['template', 'my-template', '模板'].includes(tag)))
          .map<WorkflowTemplate>(p => ({
            id: `user-${p.id}`,
            name: p.name || '我的模板',
            description: p.description || '来自我的项目',
            icon: 'FolderInput',
            nodes: p.nodes || [],
            edges: p.edges || [],
            thumbnail: p.thumbnail
          }));
        setMyTemplates(userTemplates);
      } catch (e) { console.error("Failed to load templates", e); }
    };
    loadTemplates();
  }, [showTemplates, forceShowTemplates]);
  
  useEffect(() => {
    if (showComments && currentProjectId) {
      setComments(getProjectComments(currentProjectId));
    }
  }, [showComments, currentProjectId]);
  
  const sendComment = () => {
    if (!currentProjectId) return;
    const text = commentInput.trim();
    if (!text) return;
    const user = getCurrentUser();
    const msg: CommentMessage = {
      id: Math.random().toString(36).slice(2),
      authorId: user?.id,
      authorName: user?.name || 'Guest',
      text,
      timestamp: Date.now()
    };
    const updated = addProjectComment(currentProjectId, msg);
    setComments(updated);
    setCommentInput('');
  };

  // Mobile Toggle Button
  const MobileToggle = () => (
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={`fixed bottom-6 left-6 z-[70] w-12 h-12 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full shadow-xl flex items-center justify-center sm:hidden transition-all duration-300 ${isHidden ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
      >
          {isMobileOpen ? <X size={24} /> : <PlusCircle size={24} />}
      </button>
  );

  return (
    <>
      <MobileToggle />
      
      {/* 主浮动栏 - 左侧悬浮胶囊 */}
      <div className={`fixed z-50 flex flex-col gap-3 p-2 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-[0_8px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_40px_rgba(255,255,255,0.05)] rounded-[32px] duration-300 w-16 items-center max-h-[90vh] overflow-visible no-scrollbar
          ${isMobileOpen ? 'left-6 bottom-24 top-auto animate-in slide-in-from-bottom-10' : 'left-6 top-1/2 -translate-y-1/2 hidden sm:flex'}
      `}>
        
        {/* 图层面板开关 (新增) */}
        {onToggleLayerPanel && (
            <div className="w-full relative">
                <ToolItem 
                  icon={Layers} 
                  label={lang === 'zh' || lang === 'tw' ? "图层" : "Layers"} 
                  onClick={() => {
                      onToggleLayerPanel();
                      setShowTemplates(false);
                      setActiveCategory(null);
                      setActiveTool(null);
                  }} 
                  isActive={isLayerPanelOpen}
                />
                
                {/* Layer Panel Popover - Rendered relative to the button */}
                {isLayerPanelOpen && nodes && edges && (
                    <div className="absolute top-0 left-full ml-4 w-64 bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.1)] border border-white/20 dark:border-white/10 p-3 animate-in fade-in slide-in-from-left-2 origin-top-left flex flex-col max-h-[60vh] z-[80] overflow-y-auto custom-scrollbar">
                        <div className="px-2 py-2 border-b border-white/10 dark:border-white/5 mb-1 flex justify-between items-center sticky top-0 bg-white/60 dark:bg-gray-950/60 z-10 backdrop-blur-xl -mt-3 pt-3 rounded-t-xl">
                            <span className="text-xs font-bold text-gray-900 dark:text-white ml-1">{lang === 'zh' || lang === 'tw' ? "图层导航" : "Layers"}</span>
                            <button onClick={() => onToggleLayerPanel()} className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 p-1 rounded-full text-gray-500 dark:text-gray-400 transition-colors"><X size={14}/></button>
                        </div>
                        <LayerPanel 
                            nodes={nodes} 
                            edges={edges} 
                            onFocusNodes={onFocusNodes}
                            onUpdateNodeData={onUpdateNodeData}
                            lang={lang}
                        />
                    </div>
                )}

                {/* 分割线 */}
                <div className="w-8 h-px bg-gray-100 dark:bg-gray-800 my-1 mx-auto"></div>
            </div>
        )}

        {/* Share Button (New Position) */}
        {(onOpenTeamShare || onOpenPublicLink) && (
          <div className="relative w-full">
             <ToolItem 
                icon={Share2} 
                label={lang === 'zh' || lang === 'tw' ? "分享" : "Share"} 
                onClick={() => {
                  setShowShareMenu(!showShareMenu);
                  setShowTemplates(false);
                  setActiveCategory(null);
                  setActiveTool(null);
                }} 
                isActive={showShareMenu}
             />
             
             {/* Share Popover */}
             {showShareMenu && (
               <div className="absolute top-0 left-full ml-4 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.1)] border border-gray-100 dark:border-gray-800 p-2 animate-in fade-in slide-in-from-left-2 z-[80] flex flex-col gap-1 w-40">
                  <div className="px-2 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 mb-1">
                     {lang === 'zh' || lang === 'tw' ? "分享项目" : "Share Project"}
                  </div>
                  {onOpenTeamShare && (
                    <button 
                      onClick={() => { onOpenTeamShare(); setShowShareMenu(false); }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 shrink-0">
                        <Users size={14} />
                      </div>
                      {lang === 'zh' || lang === 'tw' ? "团队分享" : "Team"}
                    </button>
                  )}
                  {onOpenPublicLink && (
                    <button 
                      onClick={() => { onOpenPublicLink(); setShowShareMenu(false); }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                       <div className="w-6 h-6 rounded-full bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-500 shrink-0">
                        <LinkIcon size={14} />
                      </div>
                      {lang === 'zh' || lang === 'tw' ? "公开链接" : "Link"}
                    </button>
                  )}
               </div>
             )}
             
             <div className="w-8 h-px bg-gray-100 dark:bg-gray-800 my-1 mx-auto"></div>
          </div>
        )}

        {/* 选择模式 */}
        <ToolItem 
          icon={MousePointer2} 
          label={lang === 'en' ? "Select" : "选择"} 
          onClick={() => { setActiveTool('select'); setShowTemplates(false); setActiveCategory(null); }} 
          isActive={activeTool === 'select'}
        />

        {/* 模板切换 */}
        <ToolItem 
          icon={LayoutTemplate} 
          label={t.templates.title} 
          onClick={toggleTemplates} 
          isActive={showTemplates}
        />
        
        <ToolItem 
          icon={MessageSquare} 
          label={lang === 'zh' || lang === 'tw' ? '评论' : 'Comments'} 
          onClick={() => {
            const next = !showComments;
            setShowComments(next);
            if (next) {
              setShowTemplates(false);
              setActiveCategory(null);
              setActiveTool(null);
            }
          }} 
          isActive={showComments}
        />

        {/* 分割线 */}
        <div className="w-8 h-px bg-gray-100 dark:bg-gray-800 my-1"></div>

        {/* 分类图标渲染 */}
        {TOOL_CATEGORIES.map((cat) => (
          <div 
            key={cat.id} 
            onMouseEnter={() => {
                // Desktop: Hover to open
                if (window.innerWidth >= 640) {
                    setActiveCategory(cat.id);
                    setShowTemplates(false);
                    setActiveTool(null);
                }
            }}
            className="w-full"
          >
            <ToolItem 
                icon={cat.icon} 
                label={t.categories[cat.id]} 
                onClick={() => toggleCategory(cat.id)} 
                isActive={activeCategory === cat.id}
                showTooltip={activeCategory !== cat.id}
            />
          </div>
        ))}

      </div>

      {false && (
        <div 
          className={`fixed z-[60] w-80 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.1)] duration-300 overflow-hidden
            ${isMobileOpen ? 'left-24 bottom-24 top-auto animate-in slide-in-from-bottom-4' : 'left-28 top-1/2 -translate-y-1/2 animate-in slide-in-from-left-4'}
          `}
          onMouseLeave={() => {}}
        >
          <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white/90 dark:bg-black/90 z-10 border-b border-gray-100 dark:border-gray-800 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare size={16}/>
              {lang === 'zh' || lang === 'tw' ? '评论' : 'Comments'}
            </h3>
            <button className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 p-1 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
              <X size={14}/>
            </button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2 space-y-2">
            {true && (
              <div className="px-3 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                {lang === 'zh' || lang === 'tw' ? '暂无评论' : 'No comments yet'}
              </div>
            )}
            {[].map(c => (
              <div key={c.id} className="flex items-start gap-2 px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                  {c.authorName.slice(0,1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{c.authorName}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(c.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 break-words">{c.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
            <div className="relative">
              <input 
                value={''}
                onChange={() => {}}
                onKeyDown={() => {}}
                placeholder={lang === 'zh' || lang === 'tw' ? '回复...' : 'Reply to thread...'}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 pr-16 outline-none text-gray-900 dark:text-white"
              />
              <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">0/200</span>
              <button 
                onClick={() => {}}
                disabled={true}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center disabled:opacity-50"
                title={lang === 'zh' || lang === 'tw' ? '发送' : 'Send'}
              >
                <ArrowRightToLine size={14}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 二级菜单 - 分类工具面板 */}
      {activeCategory && (
        <div 
            onMouseLeave={() => !isDragging && setActiveCategory(null)}
            className={`fixed z-[60] w-72 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.1)] rounded-2xl duration-300 overflow-y-auto custom-scrollbar max-h-[60vh]
            ${isMobileOpen 
                ? 'left-24 bottom-24 top-auto animate-in slide-in-from-bottom-4' // Mobile Position
                : 'left-28 top-1/2 -translate-y-1/2 animate-in slide-in-from-left-4' // Desktop Position (Increase margin)
            }
            ${isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}>
           
           {/* 标题栏 */}
           <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white/90 dark:bg-black/90 z-10 border-b border-gray-100 dark:border-gray-800 backdrop-blur-xl">
             <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 {React.createElement(TOOL_CATEGORIES.find(c => c.id === activeCategory)?.icon || PlusCircle, { size: 16 })}
                 {t.categories[activeCategory]}
             </h3>
             <button onClick={() => setActiveCategory(null)} className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 p-1 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                 <X size={14} />
             </button>
           </div>

           {/* 工具列表 */}
           <div className="grid grid-cols-1 gap-1 p-2">
             {TOOL_CATEGORIES.find(c => c.id === activeCategory)?.tools.map(toolType => {
                const ToolIcon = TOOL_DEFINITIONS[toolType] || PlusCircle;
                return (
                  <button 
                    key={toolType}
                    draggable
                    onDragStart={(e) => {
                        requestAnimationFrame(() => setIsDragging(true));
                        e.dataTransfer.setData('application/reactflow', toolType);
                        e.dataTransfer.effectAllowed = 'move';
                        // Custom Glass Drag Preview
                        const ghost = document.createElement('div');
                        ghost.style.position = 'absolute';
                        ghost.style.top = '0';
                        ghost.style.left = '0';
                        ghost.style.width = '120px';
                        ghost.style.height = '40px';
                        ghost.style.borderRadius = '12px';
                        ghost.style.background = 'rgba(255,255,255,0.45)';
                        ghost.style.backdropFilter = 'blur(10px)';
                        ghost.style.setProperty('-webkit-backdrop-filter', 'blur(10px)');
                        ghost.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
                        ghost.style.border = '1px solid rgba(255,255,255,0.4)';
                        ghost.style.display = 'flex';
                        ghost.style.alignItems = 'center';
                        ghost.style.gap = '8px';
                        ghost.style.padding = '8px 12px';
                        ghost.style.zIndex = '9999';
                        ghost.style.pointerEvents = 'none';
                        ghost.style.color = '#111';
                        ghost.style.fontSize = '12px';
                        ghost.style.fontWeight = '700';
                        ghost.style.transform = 'translate(-9999px, -9999px)'; // hide offscreen
                        const iconWrap = document.createElement('div');
                        iconWrap.style.width = '24px';
                        iconWrap.style.height = '24px';
                        iconWrap.style.borderRadius = '9999px';
                        iconWrap.style.background = '#fff';
                        iconWrap.style.display = 'flex';
                        iconWrap.style.alignItems = 'center';
                        iconWrap.style.justifyContent = 'center';
                        iconWrap.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        iconWrap.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l3 7h7l-5.5 4 2.5 7-6-4-6 4 2.5-7L2 10h7l3-7z" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>';
                        const label = document.createElement('span');
                        label.textContent = toolType;
                        ghost.appendChild(iconWrap);
                        ghost.appendChild(label);
                        document.body.appendChild(ghost);
                        e.dataTransfer.setDragImage(ghost, 60, 20);
                        setTimeout(() => {
                            if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
                        }, 0);
                    }}
                    onDragEnd={() => {
                        setIsDragging(false);
                        setActiveCategory(null);
                    }}
                    onClick={() => { onAddNode(toolType); setActiveCategory(null); }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:shadow-md transition-all text-left group bg-transparent border border-transparent hover:border-transparent"
                  >
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm group-hover:bg-white dark:group-hover:bg-black group-hover:text-black dark:group-hover:text-white transition-colors border border-gray-100 dark:border-gray-700 shrink-0">
                      <ToolIcon size={18} />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white group-hover:text-white dark:group-hover:text-black">{t.nodeTypes[toolType]}</span>
                  </button>
                );
             })}
           </div>
        </div>
      )}

      {/* 模板弹出面板 (Large Overlay) */}
      {showTemplates && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in duration-200">
            <div 
                className="w-full max-w-6xl h-[90vh] bg-white dark:bg-black rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-black dark:bg-white rounded-xl">
                                <LayoutTemplate size={24} className="text-white dark:text-black"/>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.templates.title}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Select a workflow to start creating</p>
                            </div>
                        </div>
                        
                        {/* Search Bar */}
                        <div className="relative max-w-md w-full ml-8 hidden md:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder={lang === 'zh' || lang === 'tw' ? "搜索工作流..." : "Search workflows..."}
                                value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl py-3 pl-12 pr-4 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowTemplates(false)} 
                        className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 ml-4"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content Area with Sidebar */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar: Categories */}
                    <div className="w-72 border-r border-gray-100 dark:border-gray-800 p-6 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-gray-900/20 flex flex-col gap-2">
                        {TEMPLATE_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTemplateTab(cat.id)}
                                className={`px-5 py-4 rounded-2xl text-base font-medium transition-all flex items-center gap-4 text-left ${
                                    activeTemplateTab === cat.id
                                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-105'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:scale-105'
                                }`}
                            >
                                {getIcon(cat.icon || 'Clapperboard')}
                                {/* @ts-ignore */}
                                {t.categories[cat.id] || cat.id}
                            </button>
                        ))}
                    </div>

                    {/* Right Content: Grid */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-black">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            
                            {/* My Workflows (User Templates) */}
                            {(activeTemplateTab === 'all' || activeTemplateTab === 'my_workflows' || activeTemplateTab === 'favorites') && (
                                <>
                                    {/* Filter and map user templates */}
                                    {myTemplates
                                        .filter(t => {
                                            const info = getTemplateInfo(t);
                                            const matchesSearch = templateSearch.trim() === '' || 
                                                info.name.toLowerCase().includes(templateSearch.toLowerCase()) || 
                                                info.desc.toLowerCase().includes(templateSearch.toLowerCase());
                                            const matchesFav = activeTemplateTab !== 'favorites' || favorites.includes(t.id);
                                            // If tab is 'my_workflows', we show all my templates.
                                            // If tab is 'all', we show all my templates.
                                            // If tab is 'favorites', we only show favored ones.
                                            // BUT wait, 'my_workflows' tab should ONLY show my templates.
                                            // 'all' tab shows my templates + official.
                                            // 'favorites' shows mixed.
                                            
                                            if (activeTemplateTab === 'my_workflows') return matchesSearch;
                                            if (activeTemplateTab === 'favorites') return matchesFav && matchesSearch;
                                            return matchesSearch; // for 'all'
                                        })
                                        .map(template => {
                                        const info = getTemplateInfo(template);
                                        const isFav = favorites.includes(template.id);
                                        return (
                                                <button 
                                                    key={template.id}
                                                    onClick={() => { onSelectTemplate(template); setShowTemplates(false); }}
                                                    className="relative flex flex-col gap-0 p-0 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-black dark:hover:border-white transition-all group bg-white dark:bg-gray-950 hover:shadow-2xl hover:-translate-y-1 text-left"
                                                >
                                                    {/* Fav Button */}
                                                    <div 
                                                        onClick={(e) => toggleFavorite(e, template.id)}
                                                        className={`absolute top-3 right-3 p-1.5 rounded-full z-30 transition-all ${isFav ? 'text-yellow-400 bg-white/90 shadow-sm' : 'text-gray-400/70 hover:text-gray-600 bg-white/40 hover:bg-white/90 backdrop-blur-sm'}`}
                                                    >
                                                        <Star size={16} fill={isFav ? "currentColor" : "none"} />
                                                    </div>

                                                    {/* Card Header / Icon Area */}
                                                    <div className="w-full aspect-video bg-gray-50 dark:bg-gray-900 p-0 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-700 ease-out">
                                                        {template.thumbnail ? (
                                                            <img 
                                                                src={template.thumbnail} 
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <>
                                                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-black shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-900 dark:text-white z-10 group-hover:rotate-3 transition-transform duration-500">
                                                                    {React.cloneElement(getIcon(template.icon) as React.ReactElement, { size: 28, strokeWidth: 1.5 })}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Content */}
                                                    <div className="p-6 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800 z-20 flex-1">
                                                        <h4 className="font-bold text-gray-900 dark:text-white text-base mb-2 truncate">{info.name}</h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{info.desc}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    
                                    {/* Section Divider only if needed */}
                                    {activeTemplateTab === 'all' && myTemplates.length > 0 && <div className="col-span-full h-4 border-b border-gray-100 dark:border-gray-800 mb-4"></div>}
                                </>
                            )}

                            {/* Official Templates */}
                            {TEMPLATES.filter(t => {
                                const info = getTemplateInfo(t);
                                // Category Logic
                                let matchesCategory = false;
                                if (activeTemplateTab === 'all') matchesCategory = true;
                                else if (activeTemplateTab === 'favorites') matchesCategory = favorites.includes(t.id);
                                else if (activeTemplateTab === 'my_workflows') matchesCategory = false; // Official are not my workflows
                                else if (activeTemplateTab === 'featured') matchesCategory = true; // Show ALL in Featured for now (or specific logic)
                                else matchesCategory = t.category === activeTemplateTab;

                                const matchesSearch = templateSearch.trim() === '' || 
                                    info.name.toLowerCase().includes(templateSearch.toLowerCase()) || 
                                    info.desc.toLowerCase().includes(templateSearch.toLowerCase());
                                return matchesCategory && matchesSearch;
                            }).map(template => {
                                const info = getTemplateInfo(template);
                                const isFav = favorites.includes(template.id);
                                return (
                                    <button 
                                        key={template.id}
                                        onClick={() => { onSelectTemplate(template); setShowTemplates(false); }}
                                        className="relative flex flex-col gap-0 p-0 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-black dark:hover:border-white transition-all group bg-white dark:bg-gray-950 hover:shadow-2xl hover:-translate-y-1 text-left"
                                    >
                                        {/* Fav Button */}
                                        <div 
                                            onClick={(e) => toggleFavorite(e, template.id)}
                                            className={`absolute top-3 right-3 p-1.5 rounded-full z-30 transition-all ${isFav ? 'text-yellow-400 bg-white/90 shadow-sm' : 'text-gray-400/70 hover:text-gray-600 bg-white/40 hover:bg-white/90 backdrop-blur-sm'}`}
                                        >
                                            <Star size={16} fill={isFav ? "currentColor" : "none"} />
                                        </div>

                                        {/* Card Header / Icon Area */}
                                        <div className="w-full aspect-video bg-gray-50 dark:bg-gray-900 p-0 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-700 ease-out">
                                            {template.thumbnail ? (
                                                <img 
                                                    src={template.thumbnail} 
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <>
                                                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-black shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-900 dark:text-white z-10 group-hover:rotate-3 transition-transform duration-500">
                                                        {React.cloneElement(getIcon(template.icon) as React.ReactElement, { size: 28, strokeWidth: 1.5 })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="p-6 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800 z-20 flex-1">
                                            <h4 className="font-bold text-gray-900 dark:text-white text-base mb-2 truncate">{info.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{info.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;

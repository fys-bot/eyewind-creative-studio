
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowNodeType, 
  Project, 
  User, 
  AspectRatio,
  WorkflowTemplate,
  AppSettings,
  ChatMessage
} from './types';
import Sidebar from './components/Sidebar';
import Canvas from './components/canvas';
import FloatingToolbar from './components/canvas/FloatingToolbar';
// Updated import to use the new UserDashboard
import UserDashboard from './components/user/UserDashboard';
// Updated imports for User UI components
import ApiKeyModal from './components/user/ApiKeyModal';
import ImageProcessor from './components/user/ImageProcessor';
import ProjectLoadingScreen from './components/user/ProjectLoadingScreen';
import ChatWidget from './components/ChatWidget'; 
import { createNodeObject, getNodeWidth, getNodeContentHeight } from './utils/nodeUtils';
import { 
  getProjects, 
  fetchProjects, // New Async Fetch
  saveProject, 
  updateProjectThumbnail, // Import new function
  getLocalApiKey,
  getAppSettings,
  saveAppSettings,
  createNewProject,
  updateProjectTags,
  getCurrentUser
} from './services/storageService';
import { nodeRegistry } from './services/nodeEngine';
import { requestApiKey } from './services/generationService';
import { Language, translations } from './utils/translations';
import { exportProjectPackage } from './services/projectIo';
import { ArrowLeft, Save, ChevronDown, Cloud, Download, Globe, Check, Edit2, Settings2, Shield, LayoutDashboard, HelpCircle, MoreHorizontal, Moon, Sun, Laptop, MessageSquare, LogOut, Send, Share2, Users, Link as LinkIcon, FolderHeart } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import HelpModal from './components/HelpModal';
import { ResourceType, ResourceSubtype } from './services/nodeBase';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { SubscriptionModal } from './modules/auth/SubscriptionModal';
import { ProfileModal } from './modules/auth/ProfileModal';
import { AdminConsole } from './components/admin/AdminConsole';
import { TeamShareModal, PublicLinkModal } from './components/share/ShareDialogs';
import { ToastProvider, useToast } from './components/ui/ToastContext';
import SaveProjectModal from './components/user/SaveProjectModal';

// Separate Inner App to use Context
const AppContent: React.FC = () => {
  // Use Auth Context for Theme and User
  const { user, themeMode, setThemeMode, openProfile } = useAuth();
  const { addToast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [lang, setLang] = useState<Language>('en');
  
  // Theme State is now managed by AuthContext, but we might need local effective theme for some props
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');
  
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  
  // Track if node is being dragged
  const [isDraggingNode, setIsDraggingNode] = useState(false);



  // Header Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInputValue, setTitleInputValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Layer Panel State (Moved from Canvas to App for sharing with Sidebar)
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [focusNodesState, setFocusNodesState] = useState<{ ids: string[], timestamp: number } | null>(null);

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  // const [showSettingsModal, setShowSettingsModal] = useState(false); // Deprecated in favor of ProfileModal
  
  // Share Modals State
  const [showTeamShare, setShowTeamShare] = useState(false);
  const [showPublicLink, setShowPublicLink] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalMode, setSaveModalMode] = useState<'project' | 'template'>('project');

  const [loading, setLoading] = useState<{progress: number, stage: 'init'|'fetch'|'assets'|'graph'|'final', message: string} | null>(null);

  // --- History (Undo/Redo) State ---
  const [history, setHistory] = useState<{nodes: WorkflowNode[], edges: WorkflowEdge[]}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);

  // History Recording
  useEffect(() => {
      if (loading) return;
      
      // If we are performing an undo/redo, don't record a new history step
      if (isUndoRedoRef.current) {
          isUndoRedoRef.current = false;
          return;
      }
      
      // Don't record intermediate states during dragging
      if (isDraggingNode) return;

      const currentState = { nodes, edges };
      
      // Optimization: Avoid duplicate states
      if (historyIndex >= 0 && history[historyIndex]) {
          const lastState = history[historyIndex];
          if (lastState.nodes === nodes && lastState.edges === edges) return;
          // Deep compare to avoid duplicates when references change but content is identical
          if (JSON.stringify(lastState) === JSON.stringify(currentState)) return;
      }

      // If we are not at the end of history (i.e., we undid and then made a change),
      // discard the "future" history.
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      
      // Limit history size to 50 steps
      if (newHistory.length > 50) {
          newHistory.shift();
      }

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, isDraggingNode, loading]); 

  // Undo Action
  const undo = useCallback(() => {
      if (historyIndex > 0) {
          const prevState = history[historyIndex - 1];
          isUndoRedoRef.current = true; // Flag to prevent recording this change as a new step
          setNodes(prevState.nodes);
          setEdges(prevState.edges);
          setHistoryIndex(historyIndex - 1);
      }
  }, [history, historyIndex]);

  // Redo Action
  const redo = useCallback(() => {
      if (historyIndex < history.length - 1) {
          const nextState = history[historyIndex + 1];
          isUndoRedoRef.current = true;
          setNodes(nextState.nodes);
          setEdges(nextState.edges);
          setHistoryIndex(historyIndex + 1);
      }
  }, [history, historyIndex]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Ignore shortcuts if user is typing in an input
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
              return;
          }

          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
              e.preventDefault();
              if (e.shiftKey) {
                  redo();
              } else {
                  undo();
              }
          }
          
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
              e.preventDefault();
              redo();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  
  // Save Menu State
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false); // New Dropdown Menu State
  const [feedbackText, setFeedbackText] = useState(''); // Feedback input
  const [feedbackSent, setFeedbackSent] = useState(false); // Feedback sent state
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [commentMode, setCommentMode] = useState(false);
  const [triggerOpenTemplates, setTriggerOpenTemplates] = useState(0);
  
  // Save Template Modal State
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');

  // Image Processing state
  const [processingImageNodeId, setProcessingImageNodeId] = useState<string | null>(null);
  const [processingImageBase64, setProcessingImageBase64] = useState<string | null>(null);

  // View Mode: Studio (default) vs Admin
  const [viewMode, setViewMode] = useState<'studio' | 'admin'>('studio');

  const handleRefreshProjects = useCallback(async () => {
      const p = await fetchProjects();
      setProjects(p);
  }, []);

  // Initialization
  useEffect(() => {
    // Async Data Loading
    const initData = async () => {
        const p = await fetchProjects();
        setProjects(p);
    };
    initData();
    
    setSettings(getAppSettings());
    
    // Check API Key
    if (!getLocalApiKey() && !process.env.API_KEY) {
        // Delay slightly to not block initial render
        setTimeout(() => setShowApiKeyModal(true), 1000);
    }

    // Language Auto-detect
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.includes('zh')) {
        setLang(browserLang.includes('tw') || browserLang.includes('hk') ? 'tw' : 'zh');
    }
    // Simple global exposure for language access if needed outside React context in complex apps
    // @ts-ignore
    window.currentLanguage = lang;
  }, []);

  // Theme Sync with Context
  useEffect(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setEffectiveTheme(isDark ? 'dark' : 'light');
      
      // Observer for class changes if needed, but context handles switching logic mostly
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.attributeName === 'class') {
                  const isDark = document.documentElement.classList.contains('dark');
                  setEffectiveTheme(isDark ? 'dark' : 'light');
              }
          });
      });
      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
  }, [themeMode]);

  // Sync lang to window for simple global access (optional helper)
  useEffect(() => {
      // @ts-ignore
      window.currentLanguage = lang;
  }, [lang]);

  useEffect(() => {
      const handler = (e: Event) => {
          if (!showDropdownMenu) return;
          const target = e.target as Node;
          if (dropdownRef.current && !dropdownRef.current.contains(target)) {
              setShowDropdownMenu(false);
          }
      };
      document.addEventListener('pointerdown', handler, true);
      document.addEventListener('touchstart', handler, true);
      document.addEventListener('mousedown', handler, true);
      return () => {
          document.removeEventListener('pointerdown', handler, true);
          document.removeEventListener('touchstart', handler, true);
          document.removeEventListener('mousedown', handler, true);
      };
  }, [showDropdownMenu]);
  // Sync Settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      saveAppSettings(newSettings);
  };

  // Sync Project State (Debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
      if (currentProject) {
          // Clear any pending save
          if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
          }

          // Set a new debounce timer
          saveTimeoutRef.current = setTimeout(() => {
              // Sanitize nodes to remove transient 'running' state before saving
              const cleanNodes = nodes.map(n => ({
                  ...n,
                  status: n.status === 'running' ? undefined : n.status
              }));

              const updatedProject = {
                  ...currentProject,
                  nodes: cleanNodes,
                  edges,
                  viewport,
                  chatHistory,
                  updatedAt: Date.now()
              };
              saveProject(updatedProject).catch(console.error);
          }, 1000); // Wait 1 second after last change before saving
      }
      
      return () => {
          if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
          }
      };
  }, [nodes, edges, viewport, chatHistory, currentProject]);

  const handleOpenProject = (project: Project) => {
      setTriggerOpenTemplates(0);
      setLoading({ progress: 10, stage: 'init', message: 'Loading Project...' });
      setTimeout(() => {
          setCurrentProject(project);
          // Ensure arrays to prevent .find() crashes & sanitize running state
          const safeNodes = (Array.isArray(project.nodes) ? project.nodes : []).map(n => ({
              ...n,
              status: n.status === 'running' ? undefined : n.status
          }));
          setNodes(safeNodes);
          setEdges(Array.isArray(project.edges) ? project.edges : []);
          setViewport(project.viewport || { x: 0, y: 0, zoom: 1 });
          setChatHistory(project.chatHistory || []);
          
          // Reset History
          setHistory([]);
          setHistoryIndex(-1);
          
          // Reset Focus State
          setFocusNodesState(null);
          
          setLoading(null);
      }, 500);
  };

  const handleCloseProject = async () => {
      // Snapshot current state for saving
      // Sanitize nodes to remove transient 'running' state
      const cleanNodes = nodes.map(n => ({
          ...n,
          status: n.status === 'running' ? undefined : n.status
      }));

      const projectToSave = currentProject ? { 
          ...currentProject, 
          nodes: cleanNodes, 
          edges, 
          viewport, 
          chatHistory, 
          updatedAt: Date.now() 
      } : null;

      // Snapshot nodes for thumbnail logic
      const currentNodes = [...nodes];

      // Optimistic UI Update: Update the local projects list immediately
      // This ensures the dashboard shows the latest timestamp/data without waiting for server/db
      if (projectToSave) {
          setProjects(prev => prev.map(p => p.id === projectToSave.id ? projectToSave : p));
      }

      // Show loading indicator
      if (projectToSave) {
          setLoading({ progress: 50, stage: 'final', message: lang === 'zh' || lang === 'tw' ? '正在保存...' : 'Saving Project...' });
      }

      try {
          // Perform heavy lifting in background
          if (projectToSave) {
              // 1. Save Project
              await saveProject(projectToSave);
              
              // 2. Auto-update thumbnail logic
              const imageNodes = currentNodes.filter(n => 
                  (n.type === 'image_gen' && n.data.outputResult) || 
                  (n.type === 'image_input' && n.data.value)
              );
              
              if (imageNodes.length > 0) {
                  const lastNode = imageNodes[imageNodes.length - 1];
                  const thumbUrl = lastNode.type === 'image_gen' ? lastNode.data.outputResult : lastNode.data.value;
                  
                  if (thumbUrl && typeof thumbUrl === 'string') {
                       if (thumbUrl.startsWith('data:image') || thumbUrl.startsWith('http')) {
                           await updateProjectThumbnail(projectToSave.id, thumbUrl);
                       }
                  }
              }
          }
      } catch (error) {
          console.error("Save failed:", error);
          const errMsg = lang === 'zh' || lang === 'tw' ? "保存失败: " : "Save failed: ";
          addToast(errMsg + (error instanceof Error ? error.message : "Unknown error"), 'error');
      } finally {
          setLoading(null);

          // Clear editor state and switch view immediately (Interaction: Instant Feedback)
          setHistory([]);
          setHistoryIndex(-1);
          setTriggerOpenTemplates(0);
          setCurrentProject(null); 
          
          // 3. Final Consistency Check: Fetch latest from source
          // This runs silently in background and will update UI if there are any discrepancies
          try {
              const freshProjects = await fetchProjects();
              setProjects(freshProjects);
          } catch (e) { console.error("Fetch failed", e); }
      }
  };

  // Header Handlers
  const handleOnlineSave = () => {
      if (currentProject) {
          setShowSaveMenu(false);
          setSaveModalMode('project');
          setShowSaveModal(true);
      }
  };

  const handleSaveToMyWorkflows = () => {
      if (!currentProject) return;
      setShowSaveMenu(false);
      setSaveModalMode('template');
      setShowSaveModal(true);
  };

  // Old handleOnlineSave logic refactored into modal callback
  const executeSave = async (name: string, thumbnail: string, description?: string, thumbnailPosition?: string) => {
      if (!currentProject) return;

      // Optimistic UI Update: Immediately close modal and show success toast
      setShowSaveModal(false);
      
      // Sanitize nodes to remove transient 'running' state
      const cleanNodes = nodes.map(n => ({
          ...n,
          status: n.status === 'running' ? undefined : n.status
      }));

      const updatedProject = { 
          ...currentProject, 
          name, 
          thumbnail,
          thumbnailPosition, // Save position
          nodes: cleanNodes, 
          edges, 
          viewport, 
          chatHistory, 
          updatedAt: Date.now() 
      };

      if (saveModalMode === 'project') {
          // Optimistic: Update local state immediately
          setCurrentProject(updatedProject); 
          setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
          addToast(translations[lang]?.header?.savedSuccess || "Saved", 'success');
          
          // Background: Perform actual save
          try {
              await saveProject(updatedProject);
              // Avoid immediate refetch to prevent potential race conditions with eventual consistency
              // setProjects(await fetchProjects()); 
          } catch (e) {
              console.error("Background save failed", e);
          }
      } else {
          // Save as Template Logic (New Project Creation)
          // For templates, we can't fully be optimistic because we need a new ID,
          // but we can give feedback immediately that "Processing..." or just close modal.
          // Since user expects "Saved as Template", we can show toast immediately and let it run.
          
          addToast(lang === 'zh' || lang === 'tw' ? "正在保存为模板..." : "Saving as Template...", 'info');
          
          // Background execution
          (async () => {
              try {
                  const newProject = await createNewProject();
                  newProject.name = name;
                  newProject.thumbnail = thumbnail;
                  newProject.thumbnailPosition = thumbnailPosition; // Save position for template
                  newProject.nodes = nodes;
                  newProject.edges = edges;
                  newProject.viewport = viewport;
                  newProject.tags = ['template', 'my-template']; 
                  if (description) {
                      newProject.description = description; 
                  }
                  
                  await saveProject(newProject);
                  setProjects(await fetchProjects());
                  addToast(lang === 'zh' || lang === 'tw' ? "模板已保存" : "Template Saved", 'success');
              } catch (e) {
                  console.error("Template save failed", e);
                  addToast("Failed to save template", 'error');
              }
          })();
      }
  };

  const handleExportProject = async () => {
      if (!currentProject) return;
      setShowSaveMenu(false);
      
      setLoading({ progress: 10, stage: 'assets', message: 'Analyzing Assets...' });

      try {
          // Sanitize nodes for export
          const cleanNodes = nodes.map(n => ({
              ...n,
              status: n.status === 'running' ? undefined : n.status
          }));

          const projectToExport = {
              ...currentProject,
              nodes: cleanNodes,
              edges,
              viewport,
              updatedAt: Date.now()
          };

          const zipBlob = await exportProjectPackage(projectToExport, (msg, progress) => {
              setLoading({ progress, stage: 'assets', message: msg });
          });

          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${projectToExport.name.replace(/\s+/g, '_')}_${Date.now()}.nexus`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (err) {
          console.error("Export failed", err);
          addToast("Export failed: " + (err as Error).message, 'error');
      } finally {
          setLoading(null);
      }
  };

  const handleSaveToMyWorkflowsLegacy = () => {
      // Logic replaced by new modal
  };

  const handleConfirmSaveTemplate = () => {};
  /* Legacy Code Removed
  const handleConfirmSaveTemplate = async () => { ... }
  */

  // Title Editing Handlers
  const handleTitleClick = () => {
      if (currentProject) {
          setTitleInputValue(currentProject.name);
          setIsEditingTitle(true);
          setTimeout(() => titleInputRef.current?.focus(), 0);
      }
  };

  const handleTitleSubmit = async () => {
      if (currentProject && titleInputValue.trim()) {
          const newName = titleInputValue.trim();
          
          // Optimistic UI: Exit edit mode immediately
          setIsEditingTitle(false);

          // Skip if name hasn't changed
          if (newName === currentProject.name) return;

          const updatedProject = { 
              ...currentProject, 
              name: newName,
              nodes,
              edges,
              viewport,
              chatHistory,
              updatedAt: Date.now() 
          };
          
          // Optimistic: Update local state immediately
          setCurrentProject(updatedProject);
          setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));

          // Background: Save
          saveProject(updatedProject).catch(console.error);
      } else {
          setIsEditingTitle(false);
      }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleTitleSubmit();
      if (e.key === 'Escape') {
          setIsEditingTitle(false);
          setTitleInputValue(currentProject?.name || '');
      }
  };

  const handleAddNode = (type: WorkflowNodeType, x?: number, y?: number, initialValue?: string, extraData?: any) => {
    let finalX = x;
    let finalY = y;

    // Allow forcing auto-placement (collision check) even if coordinates are provided
    const forceCollision = extraData?.checkCollision;
    const isAutoPlacement = x === undefined || y === undefined || forceCollision;

    if (finalX === undefined || finalY === undefined) {
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;
      finalX = (screenCenterX - viewport.x) / viewport.zoom - 160;
      finalY = (screenCenterY - viewport.y) / viewport.zoom - 40;
    }

    let parentId: string | undefined = undefined;

    // Only apply collision avoidance for auto-placement (clicking sidebar buttons)
    // If specific coordinates are provided (Drag & Drop, Context Menu), use them exactly.
    
    // NEW LOGIC: User requests absolute drag & drop (no smart offset when drag)
    if (isAutoPlacement) {
        const STEP_X = 390; 
        const STEP_Y = 300;
        const COLLISION_W = 360; 
        const COLLISION_H = 200; // Increased for better vertical spacing
        
        const startX = finalX!;
        const startY = finalY!;
        
        // Helper to check collision at a specific point
        const isOccupied = (tx: number, ty: number) => nodes.some(n => 
            Math.abs(n.x - tx) < COLLISION_W && 
            Math.abs(n.y - ty) < COLLISION_H
        );

        if (!isOccupied(startX, startY)) {
            // Current position is fine
        } else {
            let found = false;
            const maxLayers = 20;

            // Spiral/Ring Search
            for (let layer = 1; layer <= maxLayers; layer++) {
                // Generate candidates for this layer (ring)
                const candidates: {dx: number, dy: number}[] = [];
                
                for (let x = -layer; x <= layer; x++) {
                    for (let y = -layer; y <= layer; y++) {
                        // Only check points on the perimeter of the current layer box
                        if (Math.abs(x) === layer || Math.abs(y) === layer) {
                            candidates.push({ dx: x, dy: y });
                        }
                    }
                }
                
                // Sort candidates to prioritize closer ones (optional, but good for corners vs edges)
                // Actually, just trying them is fine.
                
                for (const {dx, dy} of candidates) {
                    const tx = startX + dx * STEP_X;
                    const ty = startY + dy * STEP_Y;
                    
                    if (!isOccupied(tx, ty)) {
                        finalX = tx;
                        finalY = ty;
                        found = true;
                        break;
                    }
                }
                
                if (found) break;
            }
        }
    } else {
        // Drag & Drop / Context Menu Logic
        // STRICTLY use provided coordinates. Do NOT modify finalX/finalY for collision avoidance.
        // We only check for Group parenting logic.

        // 1. Check if dropped inside a group
        // Find topmost group (last one rendered usually on top)
        const groups = nodes.filter(n => n.type === 'group');
        const targetGroup = groups.reverse().find(g => {
            const gW = g.data.settings?.width || 400;
            const gH = g.data.settings?.height || 300;
            return (
                finalX! >= g.x && finalX! <= g.x + gW &&
                finalY! >= g.y && finalY! <= g.y + gH
            );
        });

        if (targetGroup) {
            parentId = targetGroup.id;
            
            // Limit bounds to within the group
            const gW = targetGroup.data.settings?.width || 400;
            const gH = targetGroup.data.settings?.height || 300;
            
            // Node dimensions (approximate if not yet rendered, or calculate)
            const mockNode = { type, data: { settings: { aspectRatio: '1:1' } } } as any; 
            const nW = getNodeWidth(mockNode, false);
            // Height is dynamic, take a safe bet or calculate
            const nH = getNodeContentHeight(mockNode, nW);

             // Clamp X with 3px padding
            const padding = 3;
            if (finalX! < targetGroup.x + padding) finalX = targetGroup.x + padding;
            if (finalX! + nW > targetGroup.x + gW - padding) finalX = targetGroup.x + gW - nW - padding;

            // Clamp Y with 3px padding
            if (finalY! < targetGroup.y + padding) finalY = targetGroup.y + padding;
            if (finalY! + nH > targetGroup.y + gH - padding) finalY = targetGroup.y + gH - nH - padding;
        }
    }

    // --- Automatic Numbering Logic ---
    const existingCount = nodes.filter(n => n.type === type).length;
    
    // Determine Base Name based on language and type for cleaner defaults
    const nodeTypes = translations[lang]?.nodeTypes || {};
    let baseLabel = nodeTypes[type] || type;
    
    // Safe split check
    if (baseLabel && typeof baseLabel === 'string') {
        if (lang === 'zh' || lang === 'tw') {
            if (type === 'image_input') baseLabel = "参考图";
            else if (type === 'text_input') baseLabel = "提示词";
            else if (type === 'image_gen') baseLabel = "视觉生成";
            else if (type === 'video_gen') baseLabel = "视频生成";
            else if (type === 'preview') baseLabel = "预览";
            else baseLabel = baseLabel.split(' (')[0];
        } else {
            if (type === 'image_input') baseLabel = "Reference";
            else if (type === 'text_input') baseLabel = "Prompt";
            else if (type === 'image_gen') baseLabel = "Visual Gen";
            else if (type === 'video_gen') baseLabel = "Video Gen";
            else if (type === 'preview') baseLabel = "Preview";
        }
    }

    const newLabel = `${baseLabel} ${existingCount + 1}`;

    // Special handling for Group creation
    if (type === 'group' && initialValue) {
        try {
            const payload = JSON.parse(initialValue);
            // Check if payload is the expected object structure
            if (payload && payload.ids && Array.isArray(payload.ids)) {
                 // Check for existing groups in selection
                 const selectedNodeIds = payload.ids as string[];
                 const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
                 const existingGroups = selectedNodes.filter(n => n.type === 'group');

                 // MERGE LOGIC: If exactly one group is selected, merge others into it
                 if (existingGroups.length === 1) {
                     const targetGroup = existingGroups[0];
                     const nodesToAdd = selectedNodes.filter(n => n.id !== targetGroup.id);

                     if (nodesToAdd.length === 0) return;

                     // Calculate new bounding box based on ALL children (existing + new)
                     const currentChildren = nodes.filter(n => n.parentId === targetGroup.id);
                     const allChildren = [...currentChildren, ...nodesToAdd];
                     // Deduplicate
                     const uniqueChildren = Array.from(new Set(allChildren.map(n => n.id)))
                        .map(id => allChildren.find(n => n.id === id)!);

                     let finalMinX = Infinity, finalMinY = Infinity, finalMaxX = -Infinity, finalMaxY = -Infinity;
                     const padding = 40;

                     if (uniqueChildren.length > 0) {
                        uniqueChildren.forEach(n => {
                             finalMinX = Math.min(finalMinX, n.x);
                             finalMinY = Math.min(finalMinY, n.y);
                             const w = getNodeWidth(n, false); 
                             const h = getNodeContentHeight(n, w) + 40; // Add header
                             finalMaxX = Math.max(finalMaxX, n.x + w);
                             finalMaxY = Math.max(finalMaxY, n.y + h);
                        });
                        
                        finalMinX -= padding;
                        finalMinY -= (padding + 40); // Header space
                        finalMaxX += padding;
                        finalMaxY += padding;
                     } else {
                        // Fallback if no children (shouldn't happen here)
                        finalMinX = targetGroup.x;
                        finalMinY = targetGroup.y;
                        finalMaxX = targetGroup.x + (targetGroup.data.settings?.width || 400);
                        finalMaxY = targetGroup.y + (targetGroup.data.settings?.height || 300);
                     }

                     setNodes(prev => prev.map(n => {
                         // Update Group
                         if (n.id === targetGroup.id) {
                             return {
                                 ...n,
                                 x: finalMinX,
                                 y: finalMinY,
                                 data: {
                                     ...n.data,
                                     settings: {
                                         ...n.data.settings,
                                         width: finalMaxX - finalMinX,
                                         height: finalMaxY - finalMinY
                                     }
                                 }
                             };
                         }
                         // Update Children (New ones only, existing ones already have parentId)
                         if (nodesToAdd.some(added => added.id === n.id)) {
                             return { ...n, parentId: targetGroup.id };
                         }
                         return n;
                     }));
                     return;
                 }

                 // For Group, we use the EXACT coordinates passed in, bypassing the collision logic above
                 // Collision logic modified finalX/finalY, but for group we want the bounding box minX/minY exactly.

                 // Wait, finalX/finalY were modified by the while loop above.
                 // We should use the ORIGINAL x, y if provided, or respect the logic.
                 // BUT for group, x/y are calculated bounding box top-left.
                 // So we must use x/y directly.
                 
                 const groupX = x !== undefined ? x : finalX!;
                 const groupY = y !== undefined ? y : finalY!;
                 
                 const groupNode = createNodeObject(type, groupX, groupY, newLabel);
                 
                 groupNode.data.settings = {
                     width: payload.width || 400,
                     height: payload.height || 300,
                     color: 'rgba(240, 240, 240, 0.5)'
                 };
                 
                 setNodes(prev => {
                     const newNodes = [...prev, groupNode];
                     // Update children
                     return newNodes.map(n => {
                         if (payload.ids.includes(n.id)) {
                             return { ...n, parentId: groupNode.id };
                         }
                         return n;
                     });
                 });
                 return;
            }
        } catch (e) {
            // ignore
        }
    }

    const newNode = createNodeObject(type, finalX!, finalY!, newLabel);
    if (parentId) newNode.parentId = parentId;
    
    if (initialValue) {
        newNode.data.value = initialValue;
    }

    if (extraData) {
        if (extraData.settings) {
            newNode.data.settings = { ...newNode.data.settings, ...extraData.settings };
        }
        // Merge other data properties if needed, avoiding overwrite of critical fields
        const { settings, ...otherData } = extraData;
        newNode.data = { ...newNode.data, ...otherData };
    }

    setNodes(prev => {
        const newNodes = [...prev, newNode];
        
        // If we added to a group, check if we need to resize the group
        if (parentId) {
             const groupIndex = newNodes.findIndex(n => n.id === parentId);
             if (groupIndex !== -1) {
                 const group = newNodes[groupIndex];
                 const w = getNodeWidth(newNode, false);
                 const h = getNodeContentHeight(newNode, w) + 40; // Add header
                 
                 const nodeRight = newNode.x + w;
                 const nodeBottom = newNode.y + h;
                 
                 const groupRight = group.x + (group.data.settings?.width || 400);
                 const groupBottom = group.y + (group.data.settings?.height || 300);
                 
                 let newGW = group.data.settings?.width || 400;
                 let newGH = group.data.settings?.height || 300;
                 let changed = false;
                 
                 if (nodeRight > groupRight - 20) {
                     newGW = nodeRight - group.x + 40; // Add padding
                     changed = true;
                 }
                 if (nodeBottom > groupBottom - 20) {
                     newGH = nodeBottom - group.y + 40;
                     changed = true;
                 }
                 
                 if (changed) {
                     newNodes[groupIndex] = {
                         ...group,
                         data: {
                             ...group.data,
                             settings: {
                                 ...group.data.settings,
                                 width: newGW,
                                 height: newGH
                             }
                         }
                     };
                 }
             }
        }
        
        return newNodes;
    });
    setSelectedNodeId(newNode.id);
  };

  const handleSelectTemplate = (template: WorkflowTemplate | null) => {
      if (!template) {
          setNodes([]);
          setEdges([]);
      } else {
          // Clone and Translate Nodes
          const t = translations[lang];
          let translatedNodes = template.nodes.map(node => {
              const newData = { ...node.data };
              
              // 1. Translate Label (if it matches a known node type name)
              // This is a simple heuristic: if the label contains "Prompt", replace with localized "Prompt"
              if (t.portLabels) {
                 if (newData.label?.includes('Prompt')) newData.label = newData.label.replace('Prompt', t.portLabels['Prompt']);
                 if (newData.label?.includes('Image Output')) newData.label = t.portLabels['Generated Image'] || "生成图";
                 if (newData.label?.includes('Video Output')) newData.label = t.portLabels['Video'] || "视频";
                 if (newData.label?.includes('Audio Output')) newData.label = t.portLabels['Audio'] || "音频";
              }

              return { ...node, data: newData };
          });

          // 2. Auto-Resize Groups to fit content
          // This fixes the issue where group blue boxes don't match content until dragged
          const groups = translatedNodes.filter(n => n.type === 'group');
          
          if (groups.length > 0) {
              // Create a map for fast lookup
              const nodeMap = new Map(translatedNodes.map(n => [n.id, n]));
              
              translatedNodes = translatedNodes.map(node => {
                  if (node.type !== 'group') return node;
                  
                  // Find children
                  const children = translatedNodes.filter(n => n.parentId === node.id);
                  if (children.length === 0) return node;

                  // Calculate bounds
                  let maxX = -Infinity, maxY = -Infinity;
                  
                  children.forEach(child => {
                      const w = getNodeWidth(child, false);
                      const h = getNodeContentHeight(child, w) + 40; 
                      
                      maxX = Math.max(maxX, child.x + w);
                      maxY = Math.max(maxY, child.y + h);
                  });

                  // Apply padding
                  const padding = 40;
                  
                  // Expand group to fit content (preserve Top/Left alignment from template)
                  // We assume template designers place children at reasonable x/y offsets (e.g. > 20)
                  const newW = Math.max(node.data.settings?.width || 0, maxX + padding);
                  const newH = Math.max(node.data.settings?.height || 0, maxY + padding);

                  return {
                      ...node,
                      data: {
                          ...node.data,
                          settings: {
                              ...node.data.settings,
                              width: newW,
                              height: newH
                          }
                      }
                  };
              });
          }

          setNodes(translatedNodes);
          setEdges(template.edges);
      }
  };

  const handleUpdateNodeData = (id: string, data: any) => {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  };

  const handleBatchUpdateNodes = (updates: { id: string, x?: number, y?: number, data?: any }[]) => {
      setNodes(prev => prev.map(n => {
          const update = updates.find(u => u.id === n.id);
          if (update) {
              const newData = update.data ? { ...n.data, ...update.data } : n.data;
              return { 
                  ...n, 
                  x: update.x !== undefined ? update.x : n.x, 
                  y: update.y !== undefined ? update.y : n.y,
                  data: newData
              };
          }
          return n;
      }));
  };

  // --- Import Workflow Logic for Chat ---
  const handleImportWorkflow = async (newNodes: any[], newEdges: any[]) => {
      if (!Array.isArray(newNodes)) {
          console.warn("Import workflow failed: 'nodes' is not an array.", newNodes);
          return; 
      }
      
      const edgesToImport = Array.isArray(newEdges) ? newEdges : [];

      // Offset new nodes to avoid collision if possible, or center them
      // For now, we assume the AI gives relative coordinates starting at 0,0
      // We will shift them to center screen
      const screenCenterX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
      const screenCenterY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
      
      // ID Mapping to prevent duplicates
      const idMap = new Map<string, string>();
      
      const mappedNodes = newNodes.map(n => {
          // Re-create object to ensure it matches internal structure
          const base = createNodeObject(n.type, screenCenterX + (n.x || 0), screenCenterY + (n.y || 0), n.label);
          
          // Map old ID to new unique ID
          idMap.set(n.id, base.id); 
          
          if (n.prompt) base.data.value = n.prompt;
          return base;
      });

      // Filter edges to ensure they connect to existing or new nodes
      // Update edges to use NEW node IDs
      const validEdges = edgesToImport.filter(e => {
          const hasSource = idMap.has(e.source) || nodes.find(n => n.id === e.source);
          const hasTarget = idMap.has(e.target) || nodes.find(n => n.id === e.target);
          return hasSource && hasTarget;
      }).map(e => ({
          ...e,
          id: `e-${idMap.get(e.source) || e.source}-${idMap.get(e.target) || e.target}-${Date.now()}-${Math.random()}`,
          source: idMap.get(e.source) || e.source,
          target: idMap.get(e.target) || e.target
      }));

      // NEW LOGIC: If on dashboard, automatically create and open a new project
      if (!currentProject) {
          const newProject = await createNewProject();
          newProject.name = "AI Workflow Project";
          newProject.nodes = mappedNodes;
          newProject.edges = validEdges;
          newProject.updatedAt = Date.now();
          
          await saveProject(newProject);
          setProjects(await fetchProjects());
          handleOpenProject(newProject);
          return;
      }

      setNodes(prev => [...prev, ...mappedNodes]);
      setEdges(prev => [...prev, ...validEdges]);
  };

  // --- Insert Content Logic for Chat ---
  const handleInsertContent = async (type: 'image' | 'text', content: string, targetNodeId?: string) => {
      let imageRatio: number | undefined;

      if (type === 'image') {
          try {
              const img = new Image();
              img.src = content;
              await new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
              });
              if (img.width && img.height) {
                  imageRatio = img.width / img.height;
              }
          } catch (e) {
              console.error("Failed to calculate image ratio", e);
          }
      }

      // NEW LOGIC: If on dashboard, automatically create and open a new project
      if (!currentProject) {
          const newProject = await createNewProject();
          newProject.name = "AI Generated Project";
          
          // Determine position (center of default view)
          const cx = window.innerWidth / 2 - 150;
          const cy = window.innerHeight / 2 - 100;
          
          const nodeType = type === 'image' ? 'image_input' : 'text_input';
          const newNode = createNodeObject(nodeType, cx, cy);
          newNode.data.value = content;
          if (imageRatio) {
              newNode.data.settings = { ...newNode.data.settings, imageRatio };
          }
          
          newProject.nodes = [newNode];
          newProject.chatHistory = chatHistory; // Save current chat
          newProject.updatedAt = Date.now();
          
          await saveProject(newProject);
          setProjects(await fetchProjects());
          handleOpenProject(newProject);
          return;
      }

      if (targetNodeId) {
          const node = nodes.find(n => n.id === targetNodeId);
          if (node) {
              const updates: any = { value: content };
              if (imageRatio) {
                  updates.settings = { ...node.data.settings, imageRatio };
              }
              handleUpdateNodeData(targetNodeId, updates);
          }
      } else {
          // Create new node based on content type
          const nodeType = type === 'image' ? 'image_input' : 'text_input';
          const extraData = imageRatio ? { settings: { imageRatio } } : undefined;
          handleAddNode(nodeType, undefined, undefined, content, extraData);
      }
  };

  const handleRunNode = async (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: 'running', errorMessage: undefined } : n));

      try {
          const processor = nodeRegistry.get(node.type);
          if (!processor) throw new Error(`Processor not found for type: ${node.type}`);

          const inputValues: Record<string, any> = {};
          const inputLabels: Record<string, string> = {};
          const references: Record<string, any> = {};

          // Resolve @ references in prompt (e.g. "@Input Image")
          // We search for known node labels in the prompt string
          const promptValue = node.data.settings?.value || node.data.value;
          if (typeof promptValue === 'string' && promptValue.includes('@')) {
              // Get all potential reference targets (nodes other than self)
              const potentialTargets = nodes.filter(n => n.id !== nodeId).map(n => ({
                  id: n.id,
                  label: n.data.label || n.type,
                  data: n.data
              }));

              // Sort by label length descending to match longest names first
              potentialTargets.sort((a, b) => b.label.length - a.label.length);

              for (const target of potentialTargets) {
                  const refTag = `@${target.label}`;
                  if (promptValue.includes(refTag)) {
                      // Resolve node data
                      let refData = null;
                      if (target.data.outputResult) refData = target.data.outputResult;
                      else if (target.data.value) refData = target.data.value;
                      else if (target.data.outputList) refData = target.data.outputList;

                      if (refData) {
                          references[target.label] = refData;
                      }
                  }
              }
          }

          const inputs = processor.getInputs() || [];
          
          const usedEdges = new Set<string>();

          // Helper to recursively find data from upstream nodes
          const resolveInputData = (targetNodeId: string, inputId: string, requiredType: ResourceType, visited = new Set<string>()): any => {
              if (visited.has(targetNodeId)) return null; 
              visited.add(targetNodeId);

              const relevantEdges = edges.filter(e => e.target === targetNodeId);
              
              // Get all edges connected to this input handle
              let connectedEdges = relevantEdges.filter(e => e.targetHandle === inputId);

              // If no explicit connection, try fallback (smart auto-match) - keeps legacy behavior of finding first match
              if (connectedEdges.length === 0) {
                 const fallbackEdge = relevantEdges.find(e => {
                     if (usedEdges.has(e.id)) return false; 
                     
                     const srcNode = nodes.find(n => n.id === e.source);
                     if (!srcNode) return false;
                     
                     const srcProcessor = nodeRegistry.get(srcNode.type);
                     if (!srcProcessor) return false;

                     const srcOutputs = srcProcessor.getOutputs();
                     
                     const compatible = srcOutputs.some(out => out.type === requiredType || out.type === 'any' || requiredType === 'any');
                     return compatible;
                 });
                 if (fallbackEdge) connectedEdges = [fallbackEdge];
              }

              if (connectedEdges.length === 0) return null;

              // Sort edges if target node has clipOrder (for VideoComposer)
              const targetNode = nodes.find(n => n.id === targetNodeId);
              if (targetNode?.data.settings?.clipOrder && connectedEdges.length > 1) {
                  const order = targetNode.data.settings.clipOrder;
                  connectedEdges.sort((a, b) => {
                      const idxA = order.indexOf(a.source);
                      const idxB = order.indexOf(b.source);
                      // Items in order array come first, others at end
                      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                  });
              }

              // Resolve values for all edges
              const values = connectedEdges.map(edge => {
                  usedEdges.add(edge.id);

                  const sourceNode = nodes.find(n => n.id === edge.source);
                  if (!sourceNode) return null;

                  if (sourceNode.type === 'preview') {
                      return resolveInputData(sourceNode.id, 'input', requiredType, visited);
                  }

                  inputLabels[inputId] = sourceNode.data.label || 'Unknown';

                  if (sourceNode.data.outputResult) return sourceNode.data.outputResult;
                  if (sourceNode.data.value) return sourceNode.data.value; 
                  if (sourceNode.data.outputList) return sourceNode.data.outputList;

                  return null;
              }).filter(v => v !== null);

              if (values.length === 0) return null;

              // Special handling for VideoComposer 'clips' input which accepts arrays
              // For all other nodes/inputs, we maintain legacy behavior of taking the first input
              // to prevent type errors in nodes expecting single values (like VideoGen).
              if (targetNode?.type === 'video_composer' && inputId === 'clips') {
                  return values;
              }

              return values[0]; // Fallback to first item for single-input ports
          };

          for (const input of inputs) {
             // Create a new visited set for each input branch to allow diamond dependencies
             const val = resolveInputData(nodeId, input.id, input.type, new Set());
             if (val) {
                 inputValues[input.id] = val;
             }
          }

          const apiKey = getLocalApiKey() || process.env.API_KEY;
          const context = {
              inputs: inputValues,
              settings: { ...node.data.settings, value: node.data.value },
              globalApiKey: apiKey || undefined,
              inputLabels: inputLabels,
              references: references
          };

          const result = await processor.execute(context);
          setNodes(prev => prev.map(n => {
              if (n.id === nodeId) {
                  let updates: any = { status: 'done' };
                  if (typeof result === 'object' && result !== null && ('outputResult' in result || 'outputList' in result)) {
                      updates.data = { ...n.data, ...result };
                  } else {
                      updates.data = { ...n.data, outputResult: result };
                  }
                  return { ...n, ...updates };
              }
              return n;
          }));

      } catch (error: any) {
          console.error(error);
          const safeErrorMsg = error?.message || "Unknown error";
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: 'error', errorMessage: safeErrorMsg } : n));
          
          const errMsg = safeErrorMsg.toLowerCase();
          // Only trigger global API key modal (Gemini) if error is not from OpenAI
          if ((errMsg.includes('api key') || errMsg.includes('quota') || errMsg.includes('billing') || errMsg.includes('429')) && !errMsg.includes('openai') && !errMsg.includes('azure')) {
             setShowApiKeyModal(true);
          }
      }
  };

  const handleConnect = (sourceId: string, targetId: string, sourceHandle?: string, targetHandle?: string) => {
      // 1. Validation & Auto-Match Logic
      const srcNode = nodes.find(n => n.id === sourceId);
      const tgtNode = nodes.find(n => n.id === targetId);
      
      if (srcNode && tgtNode) {
          // Self-connection check
          if (sourceId === targetId) return;

          const srcProcessor = nodeRegistry.get(srcNode.type);
          const tgtProcessor = nodeRegistry.get(tgtNode.type);
          
          if (srcProcessor && tgtProcessor) {
              const srcOutputs = srcProcessor.getOutputs();
              const tgtInputs = tgtProcessor.getInputs();

              // Smart Auto-Connect: If handles are missing, try to find compatible ports
              if (!sourceHandle || !targetHandle) {
                   let foundMatch = false;
                   
                   // Helper to calculate match score
                   const getMatchScore = (srcP: { type: ResourceType, subtype?: ResourceSubtype, id: string }, tgtP: { type: ResourceType, subtype?: ResourceSubtype, id: string }) => {
                       // Wildcard check
                       if (srcP.type === 'any' || tgtP.type === 'any') return 5;

                       if (srcP.type === tgtP.type) {
                           // Exact match (highest priority)
                           let score = 10;
                           
                           // Subtype match (if both defined)
                           if (srcP.subtype && tgtP.subtype && srcP.subtype === tgtP.subtype) {
                               score += 5;
                           } else if (tgtP.subtype && srcP.subtype && srcP.subtype !== tgtP.subtype) {
                               return -1;
                           }

                           // Bonus for name matching (e.g. image -> start_image)
                           if (srcP.type === 'image' && (tgtP.id.includes('image') || tgtP.id.includes('ref'))) score += 5;
                           return score;
                       }
                       return -1; // No match
                   };

                   // If source is fixed (handle provided), iterate targets
                   if (sourceHandle && !targetHandle) {
                       const srcPort = srcOutputs.find(p => p.id === sourceHandle);
                       if (srcPort) {
                           let bestTgtId = null;
                           let bestScore = -1;
                           
                           for (const tgtPort of tgtInputs) {
                               const score = getMatchScore(srcPort, tgtPort);
                               if (score > bestScore) {
                                   bestScore = score;
                                   bestTgtId = tgtPort.id;
                               }
                           }
                           
                           if (bestTgtId) {
                               targetHandle = bestTgtId;
                               foundMatch = true;
                           }
                       }
                   }
                   // If target is fixed, iterate sources
                   else if (!sourceHandle && targetHandle) {
                       const tgtPort = tgtInputs.find(p => p.id === targetHandle);
                       if (tgtPort) {
                           let bestSrcId = null;
                           let bestScore = -1;

                           for (const srcPort of srcOutputs) {
                               const score = getMatchScore(srcPort, tgtPort);
                               if (score > bestScore) {
                                   bestScore = score;
                                   bestSrcId = srcPort.id;
                               }
                           }

                           if (bestSrcId) {
                               sourceHandle = bestSrcId;
                               foundMatch = true;
                           }
                       }
                   }
                   // Both missing (e.g. from onAddConnectedNode)
                   else {
                       let bestSrcId = null;
                       let bestTgtId = null;
                       let bestScore = -1;

                       for (const srcPort of srcOutputs) {
                           for (const tgtPort of tgtInputs) {
                               const score = getMatchScore(srcPort, tgtPort);
                               if (score > bestScore) {
                                   bestScore = score;
                                   bestSrcId = srcPort.id;
                                   bestTgtId = tgtPort.id;
                               }
                           }
                       }

                       if (bestSrcId && bestTgtId) {
                           sourceHandle = bestSrcId;
                           targetHandle = bestTgtId;
                           foundMatch = true;
                       }
                   }
              }

              let srcPort = sourceHandle ? srcOutputs.find(p => p.id === sourceHandle) : srcOutputs[0];
              let tgtPort = targetHandle ? tgtInputs.find(p => p.id === targetHandle) : tgtInputs[0];

              if (!srcPort || !tgtPort) {
                  return;
              }

              // Use the processor's validation logic (Centralized Source of Truth)
              // This handles Type, Subtype, and ANY wildcard logic
              const isValid = tgtProcessor.validateConnection(tgtPort.id, srcPort.type, srcPort.subtype);

              if (!isValid) {
                  const errorTitle = lang === 'zh' || lang === 'tw' ? '连接失败' : 'Connection Failed';
                  
                  let errorMessage = lang === 'zh' || lang === 'tw' ? '类型不匹配' : 'Type Mismatch';
                  if (srcPort.type === 'image' && tgtPort.type === 'text') {
                      errorMessage = lang === 'zh' || lang === 'tw' ? '类型不匹配：无法将图片连接到文本输入' : 'Type Mismatch: Cannot connect Image to Text input';
                  } else if (srcPort.type === 'text' && tgtPort.type === 'image') {
                      errorMessage = lang === 'zh' || lang === 'tw' ? '类型不匹配：无法将文本连接到图片输入' : 'Type Mismatch: Cannot connect Text to Image input';
                  } else {
                      errorMessage += `: ${srcPort.type}${srcPort.subtype ? `(${srcPort.subtype})` : ''} -> ${tgtPort.type}${tgtPort.subtype ? `(${tgtPort.subtype})` : ''}`;
                  }
                  
                  addToast({ 
                      title: errorTitle,
                      message: errorMessage,
                      type: 'error' 
                  });
                  return;
              }
          }
      }

      const newEdge: WorkflowEdge = {
          id: `e-${sourceId}-${targetId}-${Date.now()}`,
          source: sourceId,
          target: targetId,
          sourceHandle,
          targetHandle
      };
      setEdges(prev => [...prev, newEdge]);
  };

  const handleCreateGroup = (nodeIds: string[]) => {
      // Logic extracted from handleAddNode('group', ...)
      // We'll call handleAddNode with a special payload
      
      const selectedNodes = nodes.filter(n => nodeIds.includes(n.id));
      if (selectedNodes.length === 0) return;

      // Calculate bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedNodes.forEach(node => {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          const w = getNodeWidth(node, false); 
          const h = getNodeContentHeight(node, w) + 40; // Add header height estimation
          maxX = Math.max(maxX, node.x + w);
          maxY = Math.max(maxY, node.y + h);
      });

      const padding = 40;
      minX -= padding;
      minY -= (padding + 40); // Extra space for group header
      maxX += padding;
      maxY += padding;

      const width = maxX - minX;
      const height = maxY - minY;
      
      // Manually create group and update state here for immediate return
      const groupNode = createNodeObject('group', minX, minY, `Group ${nodes.filter(n => n.type === 'group').length + 1}`);
      groupNode.data.settings = { width, height };
      
      // Update nodes
      setNodes(prev => {
           // 1. Add Group
           const newNodes = [...prev, groupNode];
           // 2. Update Children parentId
           return newNodes.map(n => {
               if (nodeIds.includes(n.id)) {
                   return { ...n, parentId: groupNode.id };
               }
               return n;
           });
      });
      
      return groupNode;
  };

  const handleUngroupNode = (groupId: string) => {
      setNodes(prev => {
          // 1. Remove parentId from children
          const newNodes = prev.map(n => {
              if (n.parentId === groupId) {
                  const { parentId, ...rest } = n;
                  return rest as WorkflowNode;
              }
              return n;
          });
          // 2. Remove group node
          return newNodes.filter(n => n.id !== groupId);
      });
      
      if (selectedNodeId === groupId) {
          setSelectedNodeId(null);
      }
  };
  
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const t = translations[lang] || translations['en']; 

  const handleSetCover = async (id: string, url: string) => {
      if (!currentProject) return;
      
      // Optimistic Update
      const msg = lang === 'zh' || lang === 'tw' ? "封面已更新" : "Cover Updated";
      addToast(msg, 'success');
      
      // Update local state immediately
      setCurrentProject(prev => prev ? { ...prev, thumbnail: url } : null);
      setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, thumbnail: url } : p));

      // Background: Save
      try {
          await updateProjectThumbnail(currentProject.id, url);
          // Silent sync
          const freshProjects = await fetchProjects();
          setProjects(freshProjects);
      } catch (error) {
          console.error("Failed to set cover", error);
          // Optional: Revert UI or show error toast if critical
          // const errorMsg = lang === 'zh' || lang === 'tw' ? "封面更新失败" : "Failed to set cover";
          // addToast(errorMsg, 'error');
      }
  };

  // --- Render Mode Switching ---
  if (viewMode === 'admin') {
      return (
        <AdminConsole 
            onClose={() => setViewMode('studio')} 
            initialLang={lang} // Pass current app language as initial
            onSetGlobalLang={setLang} // Pass capability to sync global app lang
        />
      );
  }

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-black transition-colors duration-300 relative">
       {loading && <ProjectLoadingScreen progress={loading.progress} stage={loading.stage} message={loading.message} lang={lang} />}
       <ApiKeyModal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} lang={lang} />
       <SubscriptionModal lang={lang} />
       <ProfileModal 
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          lang={lang} // Pass language to profile modal
       />
       <HelpModal 
          isOpen={showHelpModal} 
          onClose={() => setShowHelpModal(false)} 
          lang={lang} 
       />
       
       {/* Global Chat Widget - Pass nodes for context and import handler */}
       <ChatWidget 
            nodes={nodes} 
            selectedNodeId={selectedNodeId}
            onImportWorkflow={handleImportWorkflow} 
            onInsertContent={handleInsertContent}
            lang={lang}
            messages={chatHistory}
            onMessagesChange={setChatHistory}
        />

       {currentProject ? (
           <>
               {/* Floating Header UI */}
               <div className="absolute top-2 left-2 right-2 md:top-4 md:left-6 md:right-6 z-40 flex justify-between items-start pointer-events-none">
                    
                    {/* Left Group: Back & Title */}
                    <div className="pointer-events-auto flex items-center gap-2 md:gap-4 bg-white/90 dark:bg-black/80 backdrop-blur-xl p-1.5 pr-4 md:pr-6 rounded-full shadow-lg shadow-gray-200/20 dark:shadow-white/5 border border-gray-100 dark:border-gray-800">
                        <button 
                            onClick={handleCloseProject}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500 dark:text-gray-400 transition-colors group bg-gray-50 dark:bg-gray-900"
                            title={t.header?.back}
                        >
                            <ArrowLeft size={18} className="group-hover:text-black dark:group-hover:text-white transition-colors" />
                        </button>
                        <div className="flex flex-col justify-center h-full min-w-[100px] md:min-w-[150px]">
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={titleInputValue}
                                    onChange={(e) => setTitleInputValue(e.target.value)}
                                    onBlur={handleTitleSubmit}
                                    onKeyDown={handleTitleKeyDown}
                                    className="text-sm font-bold text-gray-900 dark:text-white leading-none tracking-tight bg-transparent border-b border-black dark:border-white outline-none pb-0.5"
                                />
                            ) : (
                                <div 
                                    onClick={handleTitleClick}
                                    className="flex items-center gap-2 group/title cursor-pointer"
                                    title="Click to rename"
                                >
                                    <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-none tracking-tight group-hover/title:opacity-70 transition-opacity truncate max-w-[150px] md:max-w-none">
                                        {currentProject.name || t.dashboard?.untitled}
                                    </h1>
                                </div>
                            )}
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Auto-saved</span>
                        </div>
                    </div>

                    {/* Right Group: Collapsible Actions */}
                    <div className="flex items-center gap-3 pointer-events-auto relative z-50">
                        <div 
                            className="relative"
                            ref={dropdownRef}
                            onMouseEnter={() => setShowDropdownMenu(true)}
                            onMouseLeave={() => setShowDropdownMenu(false)}
                        >
                        {/* Trigger Button - Only visible when menu is closed */}
                        {!showDropdownMenu && (
                            <motion.button 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full shadow-lg shadow-gray-200/20 dark:shadow-white/5 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative z-50"
                                onClick={() => setShowDropdownMenu(true)}
                            >
                               <MoreHorizontal size={20} className="text-gray-500 dark:text-gray-400" />
                            </motion.button>
                        )}

                        {/* Dropdown Menu with Animation */}
                        <AnimatePresence>
                            {showDropdownMenu && (
                                <motion.div
                                    layoutId="menu-container"
                                    initial={{ width: 40, height: 40, borderRadius: 20 }}
                                    animate={{ width: 320, height: "auto", borderRadius: 24 }}
                                    exit={{ width: 40, height: 40, borderRadius: 20 }}
                                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                                    className="absolute top-0 right-0 z-50 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden"
                                    style={{ transformOrigin: "top right" }}
                                >
                                    {/* Content Container - Fades in/out */}
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2, delay: 0.1 }} // Small delay to wait for expansion
                                        className="p-4 w-[320px]"
                                    >
                                    
                                    {/* 1. Feedback Section */}
                                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 mb-3 border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                <MessageSquare size={12} className="text-indigo-500"/>
                                                {lang === 'zh' || lang === 'tw' ? '反馈与建议' : 'Share Feedback'}
                                            </span>
                                            {feedbackSent && <span className="text-[10px] text-green-500 font-bold animate-in fade-in">Sent!</span>}
                                        </div>
                                        <div className="relative">
                                            <textarea 
                                                value={feedbackText}
                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                placeholder={lang === 'zh' || lang === 'tw' ? '这一刻的想法...' : 'Have a thought?'}
                                                className="w-full bg-white dark:bg-gray-800 border-none rounded-xl text-xs p-2.5 pr-9 min-h-[60px] resize-none focus:ring-1 focus:ring-indigo-500 dark:text-gray-200 placeholder:text-gray-400"
                                            />
                                            <button 
                                                onClick={() => {
                                                    if (!feedbackText.trim()) return;
                                                    setFeedbackSent(true);
                                                    setFeedbackText('');
                                                    setTimeout(() => setFeedbackSent(false), 2000);
                                                }}
                                                className="absolute bottom-2 right-2 p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity"
                                            >
                                                <Send size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* 2. Theme Toggle */}
                                    <div className="bg-gray-50 dark:bg-black/50 rounded-2xl p-1 mb-3 border border-gray-100 dark:border-gray-800 flex items-center justify-between relative">
                                         {['light', 'system', 'dark'].map((tMode) => {
                                             // Note: themeMode is from AuthContext, we assume we can update settings or effective theme.
                                             // For now, we update local settings and let AuthContext (if integrated) pick it up or reload.
                                             const isActive = themeMode === tMode;
                                             return (
                                                 <button
                                                    key={tMode}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent closing menu if any
                                                        const mode = tMode as 'light'|'dark'|'system';
                                                        setThemeMode(mode); // Update global theme (AuthContext)
                                                        
                                                        // Sync local settings
                                                        const newSettings = { ...settings, theme: mode };
                                                        setSettings(newSettings);
                                                        saveAppSettings(newSettings);
                                                        handleUpdateSettings(newSettings); 
                                                    }}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all relative z-10 ${isActive ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                                 >
                                                     {tMode === 'light' && <Sun size={14} />}
                                                     {tMode === 'dark' && <Moon size={14} />}
                                                     {tMode === 'system' && <Laptop size={14} />}
                                                     <span className="capitalize">{lang === 'zh' || lang === 'tw' ? (tMode === 'light' ? '浅色' : tMode === 'dark' ? '深色' : '自动') : tMode}</span>
                                                 </button>
                                             )
                                         })}
                                    </div>

                                    {/* 3. Action List */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 px-1">
                                                <button 
                                                    onClick={() => { handleSaveToMyWorkflows(); }}
                                                    className="flex-1 text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                                                        <FolderHeart size={16} />
                                                    </div>
                                                    {lang === 'zh' || lang === 'tw' ? '保存为模板' : 'Save as Template'}
                                                </button>
                                            </div>
                                            {/* Share Project (New) */}
                                            <div className="flex items-center gap-2 px-1 mb-1">
                                                <button 
                                                    onClick={() => { setShowTeamShare(true); setShowDropdownMenu(false); }}
                                                    className="flex-1 text-left px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                                        <Users size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span>{lang === 'zh' || lang === 'tw' ? '团队分享' : 'Team Share'}</span>
                                                    </div>
                                                </button>
                                                <button 
                                                    onClick={() => { setShowPublicLink(true); setShowDropdownMenu(false); }}
                                                    className="flex-1 text-left px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                                                        <LinkIcon size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span>{lang === 'zh' || lang === 'tw' ? '公开链接' : 'Public Link'}</span>
                                                    </div>
                                                </button>
                                            </div>

                                            <button 
                                                onClick={() => { setShowHelpModal(true); setShowDropdownMenu(false); }}
                                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                                <HelpCircle size={16} />
                                            </div>
                                            {lang === 'zh' || lang === 'tw' ? '帮助与文档' : 'Help & Documentation'}
                                        </button>

                                        <button 
                                            onClick={() => { openProfile('settings'); setShowDropdownMenu(false); }}
                                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                                <Settings2 size={16} />
                                            </div>
                                            {t.settings?.title}
                                        </button>
                                        
                                        <div className="flex items-center gap-2 px-1">
                                            <button 
                                                onClick={() => { handleExportProject(); setShowDropdownMenu(false); }}
                                                className="flex-1 text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                                                    <Download size={16} />
                                                </div>
                                                {t.header?.exportLocal}
                                            </button>
                                            <button 
                                                onClick={() => { handleOnlineSave(); setShowDropdownMenu(false); }}
                                                className="flex-1 text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                                    <Cloud size={16} />
                                                </div>
                                                {t.header?.save}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Footer: Language & Info */}
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between px-1">
                                        <div className="relative group">
                                            <button 
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors uppercase"
                                            >
                                                <Globe size={12} />
                                                {lang === 'zh' ? '简体中文' : lang === 'tw' ? '繁體中文' : 'English'}
                                            </button>
                                            
                                            {/* Hover Dropdown */}
                                            <div className="absolute bottom-full left-0 w-24 pb-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
                                                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                                                    <button onClick={() => setLang('en')} className={`w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-gray-50 dark:hover:bg-gray-700 ${lang === 'en' ? 'text-black dark:text-white bg-gray-50 dark:bg-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>English</button>
                                                    <button onClick={() => setLang('zh')} className={`w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-gray-50 dark:hover:bg-gray-700 ${lang === 'zh' ? 'text-black dark:text-white bg-gray-50 dark:bg-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>简体中文</button>
                                                    <button onClick={() => setLang('tw')} className={`w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-gray-50 dark:hover:bg-gray-700 ${lang === 'tw' ? 'text-black dark:text-white bg-gray-50 dark:bg-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>繁體中文</button>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono">v0.9.2</span>
                                    </div>
                                    </motion.div>

                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    </div>
               </div>

               <Sidebar 
                   onAddNode={handleAddNode} 
                   onSelectTemplate={handleSelectTemplate} 
                   lang={lang}
                   isHidden={!!selectedNodeId}
                   onToggleLayerPanel={() => setIsLayerPanelOpen(prev => !prev)}
                   isLayerPanelOpen={isLayerPanelOpen}
                   nodes={nodes}
                   edges={edges}
                   onFocusNodes={(ids) => setFocusNodesState({ ids, timestamp: Date.now() })}
                   onUpdateNodeData={handleUpdateNodeData}
                   currentProjectId={currentProject?.id || null}
                   onToggleCommentMode={(active) => setCommentMode(active)}
                   forceShowTemplates={triggerOpenTemplates}
               />
               
               {/* Main Canvas Container */}
               <div className="relative flex-1 overflow-hidden">
                   <Canvas
                       nodes={nodes}
                       edges={edges}
                       selectedNodeId={selectedNodeId}
                       onSelectNode={setSelectedNodeId}
                       onMoveNode={(id, x, y) => setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n))}
                       onBatchUpdateNodes={handleBatchUpdateNodes}
                       onConnect={handleConnect}
                       onDeleteEdge={(id) => setEdges(prev => prev.filter(e => e.id !== id))}
                       onDeleteNode={(idOrIds) => {
                           const idsToDelete = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
                           setNodes(prev => prev.filter(n => !idsToDelete.includes(n.id)));
                           setEdges(prev => prev.filter(e => !idsToDelete.includes(e.source) && !idsToDelete.includes(e.target)));
                       }}
                       onAddNode={handleAddNode}
                       onUpdateNodeData={handleUpdateNodeData}
                       onUngroupNode={handleUngroupNode}
                       onNodeDragStateChange={setIsDraggingNode}
                       onRun={handleRunNode} // Pass onRun handler
                       onUndo={undo}
                       onRedo={redo}
                       canUndo={historyIndex > 0}
                       canRedo={historyIndex < history.length - 1}
                       lang={lang}
                       viewport={viewport}
                       onViewportChange={setViewport}
                       expandedNodeId={expandedNodeId}
                       onToggleExpand={(id) => setExpandedNodeId(prev => prev === id ? null : id)}
                   theme={effectiveTheme}
                   settings={settings}
                   isLayerPanelOpen={isLayerPanelOpen} // Pass state to Canvas if needed for layout adjustment
                   onToggleLayerPanel={() => setIsLayerPanelOpen(prev => !prev)} // Pass handler
                   focusNodes={focusNodesState} // Pass focus request
                   onCreateGroup={handleCreateGroup} // Pass create group handler
                   commentModeActive={commentMode}
                   currentProjectId={currentProject?.id || null}
                   onOpenTemplates={() => setTriggerOpenTemplates(Date.now())}
                   onSaveToMyWorkflows={handleSaveToMyWorkflows}
                   onSetCover={handleSetCover}
                   onAddConnectedNode={(srcId, type, nodeType, sourceHandle, targetHandle) => {
                        const srcNode = nodes.find(n => n.id === srcId);
                        if (srcNode) {
                            const newX = srcNode.x + (type === 'source' ? 400 : -400);
                            const newY = srcNode.y;
                            // Add automated label logic here too
                            const existingCount = nodes.filter(n => n.type === nodeType).length;
                            let baseLabel = translations[lang]?.nodeTypes?.[nodeType] || nodeType;
                            if (baseLabel && typeof baseLabel === 'string') {
                                if (lang === 'zh' || lang === 'tw') baseLabel = baseLabel.split(' (')[0];
                                if (nodeType === 'image_input' && (lang === 'zh' || lang === 'tw')) baseLabel = "参考图";
                            }
                            
                            const newLabel = `${baseLabel} ${existingCount + 1}`;
                            const newNode = createNodeObject(nodeType, newX, newY, newLabel);
                            
                            setNodes(prev => [...prev, newNode]);
                            setSelectedNodeId(newNode.id);

                            // Smart Connection Logic for specific pairs
                            let finalTargetHandle = targetHandle;
                            if (!finalTargetHandle && type === 'source') {
                                // Logic to force correct port for Image -> Generator
                                const srcProcessor = nodeRegistry.get(srcNode.type);
                                const srcOutputs = srcProcessor?.getOutputs() || [];
                                const srcPort = sourceHandle ? srcOutputs.find(p => p.id === sourceHandle) : srcOutputs[0];
                                
                                if (srcPort?.type === 'image') {
                                    if (nodeType === 'image_gen') finalTargetHandle = 'image_ref';
                                    if (nodeType === 'video_gen') finalTargetHandle = 'start_image';
                                }
                            }

                            if (type === 'source') {
                                handleConnect(srcId, newNode.id, sourceHandle, finalTargetHandle);
                            } else {
                                handleConnect(newNode.id, srcId, sourceHandle, finalTargetHandle);
                            }
                        }
                   }}
                   />
                   
               </div>
           </>
       ) : (
           <UserDashboard 
               projects={projects}
               onOpenProject={handleOpenProject}
               lang={lang}
               onSetLang={setLang}
               theme={effectiveTheme}
               onToggleTheme={() => {
                   // This toggle is now mainly for quick access, sync via Auth Context ideally
                   // For now, we simulate by forcing a local toggle if user not logged in
                   // or ideally open the new UserCenter settings
                   openProfile('settings');
               }}
               onOpenAdmin={() => setViewMode('admin')} // Pass Admin switch handler
           />
       )}
      {/* Share Modals */}
      <TeamShareModal 
        isOpen={showTeamShare} 
        onClose={() => setShowTeamShare(false)} 
        lang={lang} 
      />
      <PublicLinkModal 
        isOpen={showPublicLink} 
        onClose={() => setShowPublicLink(false)} 
        lang={lang} 
      />

      <SaveProjectModal 
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={executeSave}
          mode={saveModalMode}
          initialName={currentProject?.name || (lang === 'zh' || lang === 'tw' ? '未命名工作流' : 'Untitled Workflow')}
          initialThumbnail={currentProject?.thumbnail || ''}
          initialThumbnailPosition={currentProject?.thumbnailPosition}
          availableImages={nodes
              .filter(n => n.data && ((n.type === 'image_gen' && n.data.outputResult) || (n.type === 'image_input' && n.data.value)))
              .map(n => n.type === 'image_gen' ? n.data.outputResult : n.data.value)
              .filter(url => url && typeof url === 'string')
          }
          lang={lang}
      />
    </div>
  );
};

// Wrap main app with AuthProvider
const App: React.FC = () => {
    return (
        <AuthProvider>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </AuthProvider>
    );
};

export default App;


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageCircle, X, Send, Paperclip, AtSign, 
  Lightbulb, Zap, Globe, Box, ArrowUp, ArrowLeft,
  Clock, Share2, Copy, Minimize2, Maximize2, Gift, Sparkles, MessageSquare, Plus, Search, Image as ImageIcon, FileText, Video, Network, ChevronDown, Play, GripVertical, Edit, File
} from 'lucide-react';
import { WorkflowNode, ChatMessage } from '../types';
import { chatService } from '../services/chatService';
import { translations, Language } from '../utils/translations';
import ImageEditor from './ImageEditor';

interface ChatWidgetProps {
  nodes?: WorkflowNode[];
  selectedNodeId?: string | null;
  onImportWorkflow?: (nodes: any[], edges: any[]) => void;
  onInsertContent?: (type: 'image' | 'text', content: string, targetNodeId?: string) => void;
  lang?: Language;
  messages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
    nodes = [], 
    selectedNodeId, 
    onImportWorkflow, 
    onInsertContent, 
    lang = 'en',
    messages: propMessages,
    onMessagesChange
}) => {
  const t = translations[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [activeToggle, setActiveToggle] = useState<'light' | 'zap'>('light'); 
  
  // Cycle Direction State for Shortcut (Open -> Max -> Normal -> Close)
  const cycleDirection = useRef<'forward' | 'backward'>('forward');

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  
  // Use prop messages if available, otherwise local state
  const messages = propMessages !== undefined ? propMessages : localMessages;
  
  // Wrapper for setting messages to handle both controlled and uncontrolled modes
  const setMessages = (action: React.SetStateAction<ChatMessage[]>) => {
      if (onMessagesChange) {
           const newMessages = typeof action === 'function' 
              ? action(messages) 
              : action;
           onMessagesChange(newMessages);
      } else {
          setLocalMessages(action);
      }
  };

  const [isTyping, setIsTyping] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Resizable Split View State
  const [leftWidth, setLeftWidth] = useState(40); // Percentage
  const isResizingRef = useRef(false);
  
  // Insert Menu State
  const [activePreview, setActivePreview] = useState<ChatMessage | null>(null);
  const [insertMenuMsgId, setInsertMenuMsgId] = useState<string | null>(null); // Re-add missing state

  // Image Editor State
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editorImage, setEditorImage] = useState<string | null>(null);

  // Attachment State
  const [attachments, setAttachments] = useState<{ id: string, type: 'image' | 'file', url: string, name?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isZh = lang === 'zh' || lang === 'tw';

  // Derive preview content from latest message if appropriate
  useEffect(() => {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && (lastMsg.type === 'image' || lastMsg.type === 'workflow' || lastMsg.type === 'video')) {
          setActivePreview(lastMsg);
      }
  }, [messages]);

  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
      const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Shortcut Listener
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Command/Ctrl + K to toggle chat cycle
          if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
              e.preventDefault();
              
              if (!isOpen) {
                  // State 0 -> 1: Open
                  setIsOpen(true);
                  setIsMaximized(false);
                  cycleDirection.current = 'forward';
              } else {
                  if (isMaximized) {
                      // State 2 -> 3: Restore (Back to Frame)
                      setIsMaximized(false);
                      cycleDirection.current = 'backward';
                  } else {
                      // State 1 or 3
                      if (cycleDirection.current === 'forward') {
                          // State 1 -> 2: Full Screen
                          setIsMaximized(true);
                      } else {
                          // State 3 -> 0: Close
                          setIsOpen(false);
                          cycleDirection.current = 'forward'; // Reset
                      }
                  }
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMaximized]);

  // Shortcut Listener
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Command/Ctrl + K to toggle chat cycle
          if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
              e.preventDefault();
              
              if (!isOpen) {
                  // State 0 -> 1: Open
                  setIsOpen(true);
                  setIsMaximized(false);
                  cycleDirection.current = 'forward';
              } else {
                  if (isMaximized) {
                      // State 2 -> 3: Restore (Back to Frame)
                      setIsMaximized(false);
                      cycleDirection.current = 'backward';
                  } else {
                      // State 1 or 3
                      if (cycleDirection.current === 'forward') {
                          // State 1 -> 2: Full Screen
                          setIsMaximized(true);
                      } else {
                          // State 3 -> 0: Close
                          setIsOpen(false);
                          cycleDirection.current = 'forward'; // Reset
                      }
                  }
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMaximized]);

  // Resizing Logic
  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      isResizingRef.current = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      // Ensure minimum width of 350px or 20%, whichever is larger, to prevent layout breaking
      const minWidthPx = 350;
      const minWidthPercent = (minWidthPx / window.innerWidth) * 100;
      const safeMin = Math.max(20, minWidthPercent);
      
      if (newWidth > safeMin && newWidth < 80) { // Limit min/max width
          setLeftWidth(newWidth);
      }
  }, []);

  const handleMouseUp = useCallback(() => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // Touch Resizing Logic
  const handleTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation();
      isResizingRef.current = true;
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
      if (!isResizingRef.current) return;
      e.preventDefault();
      const clientX = e.touches[0].clientX;
      const newWidth = (clientX / window.innerWidth) * 100;
      
      const minWidthPx = 350;
      const minWidthPercent = (minWidthPx / window.innerWidth) * 100;
      const safeMin = Math.max(20, minWidthPercent);
      
      if (newWidth > safeMin && newWidth < 80) {
          setLeftWidth(newWidth);
      }
  }, []);

  const handleTouchEnd = useCallback(() => {
      isResizingRef.current = false;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const atMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedRole, setSelectedRole] = useState<'designer' | 'developer' | 'writer' | 'strategist'>('designer');

  const roles = [
      { 
          id: 'designer', 
          label: isZh ? '设计师' : 'Designer', 
          icon: ImageIcon, 
          color: 'text-purple-500', 
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          prompt: isZh ? "你现在是高级设计师专家，请提供专业的设计建议。" : "You are a senior designer expert, please provide professional design advice."
      },
      { 
          id: 'developer', 
          label: isZh ? '开发者' : 'Developer', 
          icon: Box, 
          color: 'text-blue-500', 
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          prompt: isZh ? "你现在是资深全栈开发者，请提供技术架构和代码建议。" : "You are a senior full-stack developer, please provide technical architecture and code advice."
      },
      { 
          id: 'writer', 
          label: isZh ? '文案' : 'Writer', 
          icon: FileText, 
          color: 'text-green-500', 
          bg: 'bg-green-50 dark:bg-green-900/20',
          prompt: isZh ? "你现在是创意文案专家，请提供引人入胜的文案内容。" : "You are a creative copywriting expert, please provide engaging copy content."
      },
      { 
          id: 'strategist', 
          label: isZh ? '策划' : 'Strategist', 
          icon: Lightbulb, 
          color: 'text-amber-500', 
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          prompt: isZh ? "你现在是市场营销策划专家，请提供战略性的市场分析。" : "You are a marketing strategy expert, please provide strategic market analysis."
      },
      { 
          id: 'pm', 
          label: isZh ? '产品经理' : 'Product Manager', 
          icon: Share2, 
          color: 'text-orange-500', 
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          prompt: isZh ? "你现在是资深产品经理，请提供产品规划和功能定义建议。" : "You are a senior Product Manager, please provide product planning and feature definition advice."
      },
      { 
          id: 'seo', 
          label: isZh ? 'SEO专家' : 'SEO Expert', 
          icon: Search, 
          color: 'text-teal-500', 
          bg: 'bg-teal-50 dark:bg-teal-900/20',
          prompt: isZh ? "你现在是SEO优化专家，请提供搜索引擎优化策略。" : "You are an SEO optimization expert, please provide search engine optimization strategies."
      },
      { 
          id: 'data', 
          label: isZh ? '数据分析' : 'Data Analyst', 
          icon: Network, 
          color: 'text-indigo-500', 
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
          prompt: isZh ? "你现在是资深数据分析师，请提供数据驱动的见解和分析。" : "You are a senior Data Analyst, please provide data-driven insights and analysis."
      }
  ];

  // Initialize Welcome Message with correct language
  useEffect(() => {
      // Only set welcome message if history is empty to avoid wiping existing chat
      if (messages.length === 0) {
          setMessages([
              {
                  id: 'welcome',
                  role: 'model',
                  type: 'text',
                  content: t.chat?.welcome || 'Hi, I am your AI Designer. Let\'s create something amazing today! You can ask me to generate images, or even build a workflow for you.',
                  timestamp: Date.now()
              }
          ]);
      }
  }, [lang, t.chat?.welcome]); // Intentionally exclude messages.length to run only on mount/lang change

  // Auto-scroll to bottom
  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Close at menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (atMenuRef.current && !atMenuRef.current.contains(event.target as Node)) {
        setShowAtMenu(false);
      }
      // Also close insert menu if click outside (basic logic)
      if (insertMenuMsgId && !(event.target as Element).closest('.insert-menu-container')) {
          setInsertMenuMsgId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [insertMenuMsgId]);

  const handleAtClick = () => {
    setShowAtMenu(!showAtMenu);
  };

  const insertNodeReference = (node: WorkflowNode) => {
    setInputValue(prev => {
      const prefix = prev.endsWith('@') ? prev.slice(0, -1) : prev;
      return prefix + ` @${node.data.label} `;
    });
    setShowAtMenu(false);
    inputRef.current?.focus();
  };
  
  const insertAttachmentReference = (index: number) => {
    setInputValue(prev => {
      const prefix = prev.endsWith('@') ? prev.slice(0, -1) : prev;
      return prefix + ` #${index + 1} `;
    });
    setShowAtMenu(false);
    inputRef.current?.focus();
  };

  const insertPromptTemplate = (template: string) => {
    setInputValue(prev => {
      const prefix = prev.endsWith('@') ? prev.slice(0, -1) : prev;
      return prefix + template;
    });
    setShowAtMenu(true);
    inputRef.current?.focus();
  };

  // --- Attachment Handlers ---
  const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
          const item = items[i] as any; // Cast to any to avoid TS issues
          if (item.type && item.type.indexOf('image') !== -1) {
              const blob = item.getAsFile();
              if (blob) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                      if (event.target?.result) {
                          setAttachments(prev => [...prev, {
                              id: Date.now().toString() + Math.random(),
                              type: 'image',
                              url: event.target!.result as string,
                              name: 'Pasted Image'
                          }]);
                      }
                  };
                  reader.readAsDataURL(blob);
                  e.preventDefault(); 
              }
          }
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          Array.from(e.target.files).forEach((file: any) => {
              // Accept images and HEIC/HEIF
              if (file.type && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                      if (event.target?.result) {
                          const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
                          setAttachments(prev => [...prev, {
                              id: Date.now().toString() + Math.random(),
                              type: isHeic ? 'file' : 'image', // Treat HEIC as generic file for icon display unless supported
                              url: event.target!.result as string,
                              name: file.name
                          }]);
                      }
                  };
                  reader.readAsDataURL(file);
              }
          });
          // Reset input so same file can be selected again if needed
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSendMessage = async (text?: string) => {
      const content = text || inputValue;
      
      // Allow sending if there are attachments even if text is empty
      if (!content.trim() && attachments.length === 0) return;
      
      const newMessages: ChatMessage[] = [];

      // 1. Add Text Message (if exists)
      if (content.trim()) {
          newMessages.push({
              id: Date.now().toString(),
              role: 'user',
              type: 'text',
              content: content,
              timestamp: Date.now()
          });
      }

      // 2. Add Attachment Messages
      attachments.forEach((att, idx) => {
          newMessages.push({
              id: (Date.now() + idx + 1).toString(),
              role: 'user',
              type: 'image',
              content: 'Uploaded Image',
              data: { url: att.url },
              timestamp: Date.now()
          });
      });

      setMessages(prev => [...prev, ...newMessages]);
      setInputValue('');
      setAttachments([]); // Clear attachments
      setIsTyping(true);

      try {
          // If we have attachments, we might need to handle them in chatService
          // For now, we just pass the text content if available, or a placeholder
          const messageContent = content || (attachments.length > 0 ? "[Image Uploaded]" : "");
          
          // Note: Real implementation would send images to backend. 
          // Here we just simulate text response based on input.
          const responseMessages = await chatService.sendMessage(messageContent, messages, nodes);
          setMessages(prev => [...prev, ...responseMessages]);
      } catch (e) {
          console.error(e);
      } finally {
          setIsTyping(false);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
      }
  };

  // Helper to identify content type for icons
  const getNodeIcon = (type: string) => {
      if (type.includes('image')) return <ImageIcon size={14} className="text-blue-500"/>;
      if (type.includes('video')) return <Video size={14} className="text-purple-500"/>;
      if (type.includes('text') || type.includes('script')) return <FileText size={14} className="text-gray-500"/>;
      return <Box size={14} className="text-gray-500"/>;
  };

  // Content Insertion Logic
  const handleInsert = (msg: ChatMessage, targetNodeId?: string) => {
      if (!onInsertContent) return;
      
      let contentType: 'image' | 'text' = 'text';
      let content = msg.content;

      if (msg.type === 'image' && msg.data?.url) {
          contentType = 'image';
          content = msg.data.url;
      }

      onInsertContent(contentType, content, targetNodeId);
      setInsertMenuMsgId(null);

      // Minimize chat window after insertion to show canvas
      setIsMaximized(false);
      cycleDirection.current = 'backward';
  };

  const handleResetChat = () => {
      setMessages([
          {
              id: 'welcome',
              role: 'model',
              type: 'text',
              content: t.chat?.welcome || 'Hi, I am your AI Designer. Let\'s create something amazing today! You can ask me to generate images, or even build a workflow for you.',
              timestamp: Date.now()
          }
      ]);
      setInputValue('');
      setAttachments([]);
      setSelectedRole('designer'); 
  };

  const renderMessageContent = (msg: ChatMessage) => {
      if (msg.type === 'image' && msg.data?.url) {
          return (
              <div 
                className="flex flex-col gap-2 relative group/msg cursor-pointer"
                onClick={() => setActivePreview(msg)}
              >
                  <p className="text-sm mb-1">{msg.content}</p>
                  <div className="relative">
                      <img 
                          src={msg.data.url} 
                          alt="Generated" 
                          className="rounded-lg max-w-full h-auto border border-gray-200 dark:border-gray-700 hover:opacity-95 transition-opacity" 
                          onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const p = document.createElement('div');
                              p.className = 'flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 gap-2';
                              p.innerHTML = `
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                  <span class="text-xs font-medium">Image expired</span>
                              `;
                              e.currentTarget.parentElement?.appendChild(p);
                          }}
                      />
                      
                      {/* Insert Button */}
                      <div className="absolute bottom-2 right-2 insert-menu-container" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                                const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
                                // Smart Insert: If a compatible node is selected, insert directly
                                if (selectedNode && ['image_input', 'character_ref'].includes(selectedNode.type)) {
                                    handleInsert(msg, selectedNodeId!);
                                } else {
                                    setInsertMenuMsgId(insertMenuMsgId === msg.id ? null : msg.id);
                                }
                            }}
                            className="bg-black/80 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm transition-all flex items-center gap-1 shadow-lg"
                          >
                              <Plus size={12} /> {t.chat?.insert || "Insert"}
                          </button>
                          
                          {/* Node Selector Dropdown */}
                          {insertMenuMsgId === msg.id && (
                              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 origin-bottom-right">
                                  <div className="text-[10px] font-bold text-gray-400 px-3 py-2 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
                                      {t.chat?.select_node || "Select Node"}
                                  </div>
                                  <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                      {/* "New Node" Option */}
                                      <button 
                                        onClick={() => handleInsert(msg)}
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                                      >
                                          <Plus size={12} /> {t.chat?.create_new || "Create New Node"}
                                      </button>
                                      
                                      {/* Compatible Nodes List */}
                                      {nodes.filter(n => ['image_input', 'character_ref'].includes(n.type)).map(node => (
                                          <button 
                                            key={node.id} 
                                            onClick={() => handleInsert(msg, node.id)}
                                            className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 truncate border-t border-gray-100 dark:border-gray-800"
                                          >
                                              {getNodeIcon(node.type)}
                                              <span className="truncate">{node.data.label}</span>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          );
      }
      
      // Option Selection Message
      if (msg.type === 'options' && msg.data?.options) {
          return (
              <div className="flex flex-col gap-3 w-full">
                  <p className="text-sm mb-1">{msg.content}</p>
                  <div className="flex flex-wrap gap-2">
                      {msg.data.options.map((opt: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={async () => {
                                // Send user selection as a message first for UX
                                const userMsg: ChatMessage = {
                                    id: Date.now().toString(),
                                    role: 'user',
                                    type: 'text',
                                    content: opt.label, // Display label as user's choice
                                    timestamp: Date.now()
                                };
                                setMessages(prev => [...prev, userMsg]);
                                setIsTyping(true);
                                
                                try {
                                    // Call service to handle the specific option action
                                    const responseMessages = await chatService.handleOptionSelection(opt, messages, nodes);
                                    setMessages(prev => [...prev, ...responseMessages]);
                                } catch (e) {
                                    console.error(e);
                                } finally {
                                    setIsTyping(false);
                                }
                            }}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm active:scale-95"
                          >
                              {opt.label}
                          </button>
                      ))}
                  </div>
              </div>
          );
      }

      // Text Messages handling
      if (msg.type === 'video' && msg.data?.url) {
          return (
              <div 
                className="flex flex-col gap-2 relative group/msg cursor-pointer"
                onClick={() => setActivePreview(msg)}
              >
                  <p className="text-sm mb-1">{msg.content}</p>
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
                      <video src={msg.data.url} className="max-w-full h-auto opacity-80 group-hover/msg:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover/msg:scale-110 transition-transform">
                              <Play size={20} className="fill-white text-white ml-1" />
                          </div>
                      </div>
                      
                      {/* Insert Button */}
                      <div className="absolute bottom-2 right-2 insert-menu-container" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => handleInsert(msg)}
                            className="bg-black/80 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm transition-all flex items-center gap-1 shadow-lg"
                          >
                              <Plus size={12} /> {t.chat?.insert || "Insert"}
                          </button>
                      </div>
                  </div>
              </div>
          );
      }

      if (msg.type === 'workflow' && msg.data) {
          const nodeCount = msg.data.nodes?.length || 0;
          return (
              <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm w-full">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      <Network size={16} />
                      <span>Workflow Generated</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {msg.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                      <span><strong>{nodeCount}</strong> Nodes</span>
                      <span><strong>{msg.data.edges?.length || 0}</strong> Connections</span>
                  </div>
                  <button 
                    onClick={() => {
                        if (onImportWorkflow) {
                            onImportWorkflow(msg.data.nodes, msg.data.edges);
                            setIsMaximized(false);
                            cycleDirection.current = 'backward';
                        }
                    }}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus size={14} /> Insert to Canvas
                  </button>
              </div>
          );
      }

      // Plain Text with potential insertion (if it seems like content)
      return (
          <div className="relative group/text-msg">
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {/* Optional: Add insert for text too if needed, similar to images */}
              {/* For now, keep it simple as per most chat UIs, text copy is usually enough unless explicitly requested */}
          </div>
      );
  };

  // --- Suggestions Data ---
  const promptTemplates = [
    {
      id: 'analyze',
      label: isZh ? '帮我分析' : 'Analyze',
      template: isZh ? '帮我分析 @' : 'Analyze @',
      desc: isZh ? '分析图片的内容和风格' : 'Analyze content and style',
      icon: Sparkles
    },
    {
      id: 'reference',
      label: isZh ? '作为参考' : 'Reference',
      template: isZh ? '使用 @ 作为参考' : 'Use @ as reference',
      desc: isZh ? '基于此图进行创作' : 'Create based on this image',
      icon: Lightbulb
    },
    {
      id: 'extract',
      label: isZh ? '提取元素' : 'Extract',
      template: isZh ? '从 @ 中提取元素' : 'Extract elements from @',
      desc: isZh ? '提取图片中的特定元素' : 'Extract specific elements',
      icon: Box
    }
  ];

  const suggestions = [
    {
      id: 'workflow',
      label: t.chat?.suggestions?.workflow_label || 'Build Advertising Workflow',
      desc: t.chat?.suggestions?.workflow_desc || 'Generate full workflow with script, visual ref, and video',
      prompt: 'Create a complete advertising workflow: Script Agent -> Image Gen (Reference) -> Video Gen (Final Output).',
      icon: Network,
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300'
    },
    {
      id: 'image',
      label: t.chat?.suggestions?.image_label || 'Generate Marketing Poster',
      desc: t.chat?.suggestions?.image_desc || 'Design a cyberpunk promotional image for a new product',
      prompt: 'Generate a high-quality marketing poster for a futuristic sneaker, cyberpunk city background, neon lighting.',
      icon: ImageIcon,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300'
    },
    {
      id: 'script',
      label: t.chat?.suggestions?.script_label || 'Plan Game Concept',
      desc: t.chat?.suggestions?.script_desc || 'Conceive backstory and gameplay for a survival game',
      prompt: 'Brainstorm a game concept for a post-apocalyptic survival game. Outline the backstory, core mechanics, and art style.',
      icon: Lightbulb,
      color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300'
    }
  ];

  return (
    <>
      {/* --- Floating Button (Halo Effect) --- */}
      <div className={`fixed bottom-8 right-8 z-[60] flex items-center justify-center ${isOpen ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'} transition-opacity duration-300`}>
        {/* Ripple Halo Rings */}
        <div className="absolute inset-0 bg-black dark:bg-white rounded-full opacity-20 animate-ripple"></div>
        <div className="absolute inset-0 bg-black dark:bg-white rounded-full opacity-20 animate-ripple" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Main Button - Black with white icon */}
        <button 
          onClick={() => {
              setIsOpen(true);
              cycleDirection.current = 'forward';
          }}
          className="relative w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 z-10"
        >
          {/* Custom icon mimicking the screenshot: Chat bubble with rectangle */}
          <MessageSquare size={24} strokeWidth={2} className="fill-current text-white" />
        </button>
      </div>

      {/* --- Chat Window --- */}
      <div 
        id="chat-window"
        className={`fixed z-[100] bg-white dark:bg-gray-900 flex overflow-hidden transition-all duration-300 ease-in-out ${
            isMaximized 
            ? 'right-0 bottom-0 w-screen h-screen rounded-none flex-row' // Flex row for split view
            : 'bottom-8 right-8 w-[400px] max-w-[calc(100vw-32px)] h-[750px] max-h-[calc(100vh-120px)] rounded-[32px] shadow-2xl origin-bottom-right border border-gray-100 dark:border-gray-800 flex-col'
        } ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'}`}
      >
        {/* LEFT COLUMN: Chat Interface */}
        <div 
            className={`flex flex-col h-full transition-all duration-300 ${isMaximized && isLargeScreen ? 'border-r border-gray-100 dark:border-gray-800' : 'w-full'}`}
            style={isMaximized && isLargeScreen ? { width: `${leftWidth}%`, minWidth: '350px' } : {}}
        >
            
            {/* Header */}
            <div 
                className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shrink-0"
            >
            <div className={`flex items-center justify-between w-full transition-all duration-300 ${isMaximized && !isLargeScreen ? 'max-w-4xl mx-auto' : ''}`}>
                <div className="flex items-center gap-1">
                    {/* Back Button - Only show when not in welcome state */}
                    {messages.length > 1 && (
                        <button 
                            onClick={handleResetChat}
                            className="hover:text-black dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 mr-1"
                            title={isZh ? "返回主页" : "Back to Home"}
                        >
                            <ArrowLeft size={18}/>
                        </button>
                    )}
                    <button className="hover:text-black dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><Clock size={18}/></button>
                    <button className="hover:text-black dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><Share2 size={18}/></button>
                    <button className="hover:text-black dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><Copy size={18}/></button>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                    onClick={() => {
                        const nextState = !isMaximized;
                        setIsMaximized(nextState);
                        // If restoring manually, set direction to backward so next key press closes
                        if (!nextState) cycleDirection.current = 'backward';
                    }}
                    className="hover:text-black dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hidden md:block"
                    title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
                    </button>
                    <button 
                    onClick={() => {
                        setIsOpen(false);
                        cycleDirection.current = 'forward';
                    }}
                    className="hover:text-black dark:hover:text-white transition-colors bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg ml-2"
                    title="Close"
                    >
                    <X size={18} />
                    </button>
                </div>
            </div>
            </div>

            {/* Content Area (Messages) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-4 pt-2">
                <div className={`transition-all duration-300 ${isMaximized && !isLargeScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
                
                {(messages.length === 0 || messages.length === 1) && (
                    <div className="mt-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Avatar & Greeting */}
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20">
                                <Sparkles size={32} className="text-white dark:text-black" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight mb-2">
                                {isZh ? "欢迎使用 Desora.Art" : "Welcome to Desora.Art"}
                            </h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mb-6">
                                {isZh ? "您的全能 AI 创意助手" : "Your All-in-One AI Creative Assistant"}
                            </p>

                            {/* Role Selector */}
                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto max-w-full">
                                {roles.map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => {
                                            setSelectedRole(role.id as any);
                                            // Send a system message to set the role context
                                            setMessages(prev => [...prev, {
                                                id: Date.now().toString(),
                                                role: 'system',
                                                type: 'text',
                                                content: `Role switched to ${role.label}. ${role.prompt}`,
                                                timestamp: Date.now()
                                            }]);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                            selectedRole === role.id 
                                            ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                                            : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                                        }`}
                                    >
                                        <role.icon size={14} className={selectedRole === role.id ? role.color : 'text-gray-400'} />
                                        {role.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <button 
                                onClick={() => handleSendMessage(isZh ? "生成一张赛博朋克风格的城市海报" : "Generate a cyberpunk city poster")}
                                className={`p-4 border rounded-2xl flex flex-col items-center gap-2 transition-all group ${
                                    selectedRole === 'designer' ? 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${
                                    selectedRole === 'designer' ? 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                }`}>
                                    <ImageIcon size={20} />
                                </div>
                                <span className={`text-xs font-bold ${
                                    selectedRole === 'designer' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-300'
                                }`}>{isZh ? "文生图" : "Image Gen"}</span>
                            </button>

                            <button 
                                onClick={() => handleSendMessage(isZh ? "创建一个营销视频工作流" : "Create a marketing video workflow")}
                                className={`p-4 border rounded-2xl flex flex-col items-center gap-2 transition-all group ${
                                    selectedRole === 'developer' ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${
                                    selectedRole === 'developer' ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                }`}>
                                    <Network size={20} />
                                </div>
                                <span className={`text-xs font-bold ${
                                    selectedRole === 'developer' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'
                                }`}>{isZh ? "工作流" : "Workflow"}</span>
                            </button>
                        </div>

                        {/* Tips / Tutorial Section */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Lightbulb size={12} /> {isZh ? "使用技巧" : "Pro Tips"}
                            </h3>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <div className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 text-xs font-bold font-mono">@</div>
                                    <div>
                                        <span className="font-bold text-gray-900 dark:text-white">{isZh ? "引用节点" : "Mention Nodes"}</span>
                                        <p className="text-xs text-gray-500 mt-0.5">{isZh ? "输入 @ 选择画布上的节点作为上下文" : "Type @ to reference nodes from the canvas"}</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <div className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 text-xs font-bold font-mono">#</div>
                                    <div>
                                        <span className="font-bold text-gray-900 dark:text-white">{isZh ? "引用附件" : "Mention Files"}</span>
                                        <p className="text-xs text-gray-500 mt-0.5">{isZh ? "输入 # 快速引用已上传的图片" : "Type # to reference uploaded files"}</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <div className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 text-xs font-bold font-mono">⌘K</div>
                                    <div>
                                        <span className="font-bold text-gray-900 dark:text-white">{isZh ? "快速切换" : "Quick Toggle"}</span>
                                        <p className="text-xs text-gray-500 mt-0.5">{isZh ? "使用 Cmd+K 快速打开/全屏/关闭聊天" : "Toggle chat window visibility and size"}</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-6 py-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && (
                                <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-bold mr-3 shrink-0 mt-1">
                                    AI
                                </div>
                            )}
                            <div 
                                className={`max-w-[85%] text-sm ${
                                    msg.type === 'workflow' ? 'w-full' : ''
                                } ${
                                    msg.role === 'user' 
                                    ? 'bg-black dark:bg-white text-white dark:text-black px-4 py-3 rounded-2xl rounded-tr-sm' 
                                    : 'text-gray-800 dark:text-gray-200'
                                }`}
                            >
                                {renderMessageContent(msg)}
                            </div>
                        </div>
                    ))}
                    
                    {/* Suggestions - Only show when chat is essentially empty (1 welcome message) */}
                    {(messages.length === 0 || messages.length === 1) && !isTyping && (
                        <div className="grid gap-3 mt-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
                            {suggestions.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSendMessage(s.prompt)}
                                    className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-700 transition-all text-left group active:scale-[0.98]"
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${s.color}`}>
                                        <s.icon size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {s.label}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1 line-clamp-1">
                                            {s.desc}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-bold mr-3 mt-1">AI</div>
                            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                </div>
            </div>

            {/* Bottom Area */}
            <div className="p-4 pt-0 bg-white dark:bg-gray-900 relative shrink-0">
            <div className={`transition-all duration-300 ${isMaximized && !isLargeScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
                
                {/* Node Selection Popover */}
                {showAtMenu && (
                    <div ref={atMenuRef} className="absolute bottom-[160px] left-4 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in slide-in-from-bottom-4 flex flex-col max-h-80">
                        {/* Attachments Section */}
                        {attachments.length > 0 && (
                            <div className="mb-2">
                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-1 flex justify-between">
                                    <span>{isZh ? '附件' : 'Attachments'}</span>
                                    <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 rounded-md text-gray-600 dark:text-gray-300">{attachments.length}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 px-1">
                                    {attachments.map((att, idx) => (
                                        <button 
                                            key={att.id} 
                                            onClick={() => insertAttachmentReference(idx)}
                                            className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                                        >
                                            <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 relative flex items-center justify-center">
                                                {att.type === 'file' || (att.name && (att.name.endsWith('.heic') || att.name.endsWith('.HEIC'))) ? (
                                                    <div className="flex flex-col items-center justify-center w-full h-full p-0.5">
                                                        <ImageIcon size={12} className="text-gray-400" />
                                                        <span className="text-[6px] font-bold text-gray-500 uppercase truncate w-full text-center">{att.name?.split('.').pop() || 'FILE'}</span>
                                                    </div>
                                                ) : (
                                                    <img src={att.url} className="w-full h-full object-cover" />
                                                )}
                                                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl-sm">#{idx + 1}</div>
                                            </div>
                                            <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
                                                {att.name || (isZh ? `图片 ${idx + 1}` : `Image ${idx + 1}`)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prompt Templates Section */}
                        <div className="mb-2">
                            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-1">
                                {isZh ? '常用指令' : 'Commands'}
                            </div>
                            <div className="flex flex-col gap-1 px-1">
                                {promptTemplates.map((item) => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => insertPromptTemplate(item.template)}
                                        className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-left group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0">
                                            <item.icon size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                {item.label}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {item.desc}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Nodes Section */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-1">
                                {isZh ? '画布节点' : 'Canvas Nodes'}
                            </div>
                            <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-1">
                                {nodes.length > 0 ? nodes.map(node => (
                                    <button 
                                        key={node.id} 
                                        onClick={() => insertNodeReference(node)}
                                        className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-left group"
                                    >
                                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                            {/* Thumbnail Preview if available */}
                                            {(node.data.outputResult && node.data.outputResult.startsWith('data:image')) || (node.data.value && node.data.value.startsWith('data:image')) ? (
                                                <img src={node.data.outputResult || node.data.value} className="w-full h-full object-cover" />
                                            ) : (
                                                getNodeIcon(node.type)
                                            )}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{node.data.label || (isZh ? "未命名" : "Untitled")}</span>
                                            <span className="text-[10px] text-gray-400 truncate">{node.type}</span>
                                        </div>
                                    </button>
                                )) : (
                                    <div className="p-4 text-center text-xs text-gray-400">{isZh ? '画布暂无节点' : 'No nodes on canvas'}</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Input Container - Cleaned up */}
                <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-[28px] shadow-sm hover:shadow-md transition-shadow p-2 relative">
                    
                    {/* Thinking Mode Tooltip */}
                    <div className={`absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl opacity-0 group-hover/tools:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 hidden ${activeToggle === 'zap' ? 'block' : 'hidden'}`}>
                        <div className="font-bold mb-0.5">思考模式 (Thinking Mode)</div>
                        <div className="text-[10px] text-gray-300">制定复杂任务并自主执行</div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>

                    {/* Attachment Previews */}
                    {attachments.length > 0 && (
                        <div className="flex gap-2 px-4 pt-2 pb-0 overflow-x-auto custom-scrollbar">
                            {attachments.map((att, index) => (
                                <div key={att.id} className="relative group shrink-0">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center relative">
                                        {att.type === 'file' || (att.name && (att.name.endsWith('.heic') || att.name.endsWith('.HEIC'))) ? (
                                            <div className="flex flex-col items-center justify-center p-1 w-full h-full">
                                                <ImageIcon size={24} className="text-gray-400 mb-1" />
                                                <span className="text-[8px] font-bold text-gray-500 uppercase truncate w-full text-center px-1">
                                                    {att.name?.split('.').pop() || 'FILE'}
                                                </span>
                                            </div>
                                        ) : (
                                            <img 
                                                src={att.url} 
                                                alt="attachment" 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => {
                                                    // Fallback to icon on error
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                    const iconContainer = document.createElement('div');
                                                    iconContainer.className = 'flex flex-col items-center justify-center p-1 w-full h-full';
                                                    iconContainer.innerHTML = `
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mb-1"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                                        <span class="text-[8px] font-bold text-gray-500 uppercase truncate w-full text-center px-1">${att.name?.split('.').pop() || 'FILE'}</span>
                                                    `;
                                                    e.currentTarget.parentElement?.appendChild(iconContainer);
                                                }}
                                            />
                                        )}
                                        {/* Number Badge */}
                                        <div className="absolute bottom-0.5 right-0.5 bg-black/50 text-white text-[8px] px-1 rounded-sm backdrop-blur-sm">
                                            #{index + 1}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeAttachment(att.id)}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                    >
                                        <X size={10} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <textarea 
                    ref={inputRef}
                    className="w-full h-12 max-h-32 px-4 py-3 bg-transparent outline-none text-gray-800 dark:text-gray-200 text-sm resize-none placeholder:text-gray-400 font-medium"
                    placeholder={attachments.length > 0 ? "描述你的需求 (支持粘贴图片)" : "请输入你的设计需求 (支持粘贴图片)"}
                    value={inputValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        setInputValue(val);
                        if (val.endsWith('@')) {
                            setShowAtMenu(true);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    />
                    
                    <div className="flex items-center justify-between px-2 pb-1 mt-1">
                    {/* Left Tools */}
                    <div className="flex items-center gap-1">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            multiple 
                            onChange={handleFileSelect}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
                            title="Attach images"
                        >
                            <Paperclip size={18} />
                        </button>
                        <button 
                            onClick={handleAtClick}
                            className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showAtMenu ? 'bg-blue-50 text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                            <AtSign size={18} />
                        </button>
                    </div>

                    {/* Right Tools & Send */}
                    <div className="flex items-center gap-3">
                        
                        {/* Toggles - Flattened structure */}
                        <div className="flex items-center gap-2 group/tools relative">
                            {/* Toggle Segment */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 relative">
                                <button 
                                    onClick={() => setActiveToggle('light')}
                                    className={`p-1.5 rounded-full transition-all relative z-10 ${activeToggle === 'light' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Lightbulb size={16} strokeWidth={2.5}/>
                                </button>
                                <button 
                                    onClick={() => setActiveToggle('zap')}
                                    className={`p-1.5 rounded-full transition-all relative z-10 ${activeToggle === 'zap' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Zap size={16} strokeWidth={2.5}/>
                                </button>
                                {/* Active Indicator */}
                                <div className={`absolute top-0.5 bottom-0.5 w-[28px] bg-white dark:bg-gray-600 rounded-full shadow-sm transition-all duration-300 ${activeToggle === 'light' ? 'left-0.5' : 'left-[30px]'}`}></div>
                            </div>

                            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                            <button className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-500 transition-colors">
                                <Globe size={18} />
                            </button>
                            <button className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors">
                                <Box size={18} />
                            </button>
                        </div>
                        
                        {/* Send Button */}
                        <button 
                            onClick={() => handleSendMessage()}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${inputValue.trim() || attachments.length > 0 ? 'bg-black dark:bg-white text-white dark:text-black scale-100' : 'bg-gray-200 dark:bg-gray-700 text-white dark:text-gray-500 scale-95'}`}
                            disabled={!inputValue.trim() && attachments.length === 0}
                        >
                            <ArrowUp size={20} strokeWidth={3} />
                        </button>
                    </div>
                    </div>
                </div>
            </div>
            </div>
        </div>

        {/* Drag Handle */}
        {isMaximized && isLargeScreen && (
            <div 
                className="w-1 hover:w-1.5 h-full bg-gray-100 dark:bg-gray-800 hover:bg-blue-500 cursor-col-resize z-50 transition-all flex items-center justify-center group/handle"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 rounded-full group-hover/handle:bg-white" />
            </div>
        )}

        {/* RIGHT COLUMN: Preview / Stage */}
        {isMaximized && isLargeScreen && (
            <div className="flex-1 bg-gray-50 dark:bg-black/20 flex flex-col relative overflow-hidden">
                {/* Remove padding if preview is image to allow full-screen editor */}
                <div className={`absolute inset-0 flex items-center justify-center ${activePreview?.type === 'image' ? 'p-0' : 'p-8'}`}>
                    {activePreview ? (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                            {activePreview.type === 'image' && activePreview.data?.url && (
                                <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 shadow-2xl">
                                    <ImageEditor 
                                        key={activePreview.id} // Force remount on image change
                                        base64Image={activePreview.data.url}
                                        onSave={(newImg) => {
                                            const newMsg: ChatMessage = {
                                                id: Date.now().toString(),
                                                role: 'model',
                                                type: 'image',
                                                content: `Edited: ${activePreview?.content || 'Image'}`,
                                                data: { url: newImg },
                                                timestamp: Date.now()
                                            };
                                            setMessages(prev => [...prev, newMsg]);
                                            setActivePreview(newMsg); 
                                        }}
                                        onCancel={() => {
                                            // Optional: Close preview or reset?
                                            // For now, let's just do nothing or maybe reset to original if we tracked it
                                            // But since we are "always editing", cancel might just mean "Undo all" which is handled by history
                                        }}
                                        lang={lang}
                                        embedded={true} 
                                    />
                                </div>
                            )}

                            {activePreview.type === 'video' && activePreview.data?.url && (
                                <div className="relative group rounded-3xl shadow-2xl overflow-hidden border-4 border-white dark:border-gray-800 max-h-[80vh] w-full max-w-4xl bg-black flex items-center justify-center">
                                    <video 
                                        src={activePreview.data.url} 
                                        controls 
                                        autoPlay 
                                        className="max-w-full max-h-full object-contain"
                                    />
                                    <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="bg-white/90 text-black px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-white flex items-center gap-2">
                                            <Share2 size={14}/> Share
                                        </button>
                                        <button 
                                            onClick={() => handleInsert(activePreview)}
                                            className="bg-black/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-black flex items-center gap-2"
                                        >
                                            <Plus size={14}/> Insert
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {activePreview.type === 'workflow' && (
                                <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <Network size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Generated Workflow</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Ready to import to canvas</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 mb-6 font-mono text-xs text-gray-600 dark:text-gray-300 leading-relaxed overflow-auto max-h-60 border border-gray-100 dark:border-gray-800">
                                        {activePreview.content}
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => {
                                                if (onImportWorkflow && activePreview.data) {
                                                    onImportWorkflow(activePreview.data.nodes, activePreview.data.edges);
                                                    setIsMaximized(false);
                                                    cycleDirection.current = 'backward';
                                                }
                                            }}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18}/> Import to Canvas
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 dark:text-gray-600">
                            <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">Select or generate content to preview</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

    </>
  );
};

export default ChatWidget;

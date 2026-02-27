
import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { AlertCircle, Upload, Sparkles, Loader2, Zap, ChevronDown, ChevronUp, Mic, Megaphone, RectangleHorizontal, RectangleVertical, MonitorPlay, Tablet, Square, Gamepad2, Clapperboard, Feather, Briefcase, Map as MapIcon, Headphones, Palette, Globe, Activity, Users, Bug, X, Music, Video, RefreshCcw, Link2, Plus, UserCog, Layers, Volume2, Network } from 'lucide-react';
import { WorkflowNode, WorkflowEdge, AspectRatio, ModelType, Resolution } from '../../types';
import { MODELS as MODELS_CONST, ASPECT_RATIOS as ASPECT_RATIOS_CONST, BASIC_ASPECT_RATIOS, AUDIO_VOICES as AUDIO_VOICES_CONST, AUDIO_CATEGORIES, RESOLUTIONS, IMAGE_RESOLUTIONS, DURATIONS, AGENT_ROLES } from '../../constants';
import { translations, Language } from '../../utils/translations';
import { generateCharacterReference, requestApiKey, generateImage } from '../../services/generationService';
import { uploadAsset } from '../../services/storageService'; // Import Upload Service
import { getNodeContentHeight, getNodeWidth } from '../../utils/nodeUtils';
import { useToast } from '../ui/ToastContext';
import { getVideoModels, getAudioModels, getImageModels, getTextModels, AIModel } from '../../services/modelService';

import VideoGenFrames from './toolbar/VideoGenFrames';

interface FloatingToolbarProps {
  node: WorkflowNode;
  edges: WorkflowEdge[];
  nodes: WorkflowNode[];
  updateNodeData: (data: any) => void;
  onRun: () => void;
  lang: Language;
  viewport: { x: number, y: number, zoom: number };
  isExpanded: boolean;
  onAddConnectedNode?: (srcId: string, type: 'source' | 'target', nodeType: string, sourceHandle?: string, targetHandle?: string) => void;
  isConnecting?: boolean;
  onAddNode?: (type: string, x: number, y: number, initialValue?: string) => void;
  onDeleteEdge?: (id: string) => void;
  onConnect?: (sourceId: string, targetId: string, sourceHandle?: string, targetHandle?: string) => void;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ node, edges, nodes, updateNodeData, onRun, lang, viewport, isExpanded, onAddConnectedNode, isConnecting, onAddNode, onDeleteEdge, onConnect }) => {
  const t = translations[lang];
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  

  const [charMode, setCharMode] = useState<'upload' | 'generate'>('upload');
  // charDesc state removed, using node.data.settings.description directly
  const [isGeneratingChar, setIsGeneratingChar] = useState(false);

  const [refImgMode, setRefImgMode] = useState<'upload' | 'generate'>('upload');
  const [refImgDesc, setRefImgDesc] = useState('');
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false); // New state for replace flow
  const [showRunConfirm, setShowRunConfirm] = useState(false); // Confirmation state for re-run
  
  // 动态模型列表状态
  const [dynamicModels, setDynamicModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  // Sync local replacing state to node data for visual feedback (grayscale)
  useLayoutEffect(() => {
     if (isReplacing !== !!node.data.isReplacing) {
         updateNodeData({ isReplacing });
     }
  }, [isReplacing]);

  // 加载动态模型列表
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        let models: AIModel[] = [];
        if (node.type === 'video_gen') {
          models = await getVideoModels();
        } else if (node.type === 'audio_gen') {
          models = await getAudioModels();
        } else if (node.type === 'image_gen' || node.type === 'image_input') {
          models = await getImageModels();
        } else if (node.type === 'script_agent' || node.type === 'ai_refine') {
          models = await getTextModels();
        }
        
        if (models.length > 0) {
          setDynamicModels(models);
          console.log(`[FloatingToolbar] Loaded ${models.length} dynamic models for ${node.type}`);
        }
      } catch (error) {
        console.error('[FloatingToolbar] Failed to load models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    
    loadModels();
  }, [node.type]);

  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  
  // --- Mention / @ Reference Logic ---
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [activeField, setActiveField] = useState<string | null>(null); // 'value' or 'settings.description' etc.

  const availableNodes = nodes.filter(n => n.id !== node.id);
  
  const promptTemplates: any[] = [];

  const filteredOptions = React.useMemo(() => {
      if (mentionQuery === null) return [];
      const query = mentionQuery.toLowerCase();
      
      const nodeOptions = availableNodes.filter(n => 
          (n.data.label || n.type).toLowerCase().includes(query)
      ).map(n => ({ type: 'node', data: n }));
      
      return nodeOptions;
  }, [mentionQuery, availableNodes]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field: string = 'value') => {
      const val = e.target.value;
      const cursor = e.target.selectionStart;
      
      if (field === 'value') updateNodeData({ value: val });
      else if (field === 'refImgDesc') setRefImgDesc(val); // Special case for ref img local state
      else updateNodeData({ settings: { ...node.data.settings, [field]: val } });
      
      const textBeforeCursor = val.slice(0, cursor);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1) {
          const query = textBeforeCursor.slice(atIndex + 1);
          // Allow spaces but limit length to avoid false positives on long text
          if (!query.includes('\n') && query.length < 20) {
              setMentionQuery(query);
              setActiveField(field);
              setMentionIndex(0);
              return;
          }
      }
      setMentionQuery(null);
      setActiveField(null);
  };

  

  const handleMentionSelect = (option: any) => {
      if (!activeField) return;
      
      let val = '';
      if (activeField === 'value') val = node.data.value || '';
      else if (activeField === 'refImgDesc') val = refImgDesc;
      else val = node.data.settings?.[activeField] || '';

      // We need cursor position, but we don't track it in state to avoid re-renders. 
      // We'll approximate by finding the last @ matching the query.
      // Or we could have tracked it in handlePromptChange.
      // Let's assume the cursor is at the end of the query we just typed.
      const atIndex = val.lastIndexOf('@' + (mentionQuery || ''));
      
      if (atIndex !== -1) {
          let insertion = '';
          if (option.type === 'node') {
              insertion = `@${option.data.data.label || option.data.type} `;
          } else {
              insertion = option.data.template + ' ';
          }
          
          const newVal = val.slice(0, atIndex) + insertion + val.slice(atIndex + (mentionQuery?.length || 0) + 1);
          
          if (activeField === 'value') updateNodeData({ value: newVal });
          else if (activeField === 'refImgDesc') setRefImgDesc(newVal);
          else updateNodeData({ settings: { ...node.data.settings, [activeField]: newVal } });
      }
      
      setMentionQuery(null);
      setActiveField(null);
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, field: string = 'value') => {
       if (mentionQuery !== null && filteredOptions.length > 0) {
           if (e.key === 'ArrowDown') {
               e.preventDefault();
               setMentionIndex(prev => (prev + 1) % filteredOptions.length);
               return;
           }
           if (e.key === 'ArrowUp') {
               e.preventDefault();
               setMentionIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
               return;
           }
           if (e.key === 'Enter' || e.key === 'Tab') {
               e.preventDefault();
               handleMentionSelect(filteredOptions[mentionIndex]);
               return;
           }
           if (e.key === 'Escape') {
               e.preventDefault();
               setMentionQuery(null);
               setActiveField(null);
               return;
           }
       }
       handleKeyDown(e);
  };

  const getNodeThumbnail = (n: WorkflowNode) => {
      if (n.type === 'image_input' || n.type === 'character_ref') {
          return typeof n.data.value === 'string' ? n.data.value : null;
      }
      if (n.type === 'image_gen' || n.type === 'image_upscale' || n.type === 'image_matting' || n.type === 'preview') {
          return typeof n.data.outputResult === 'string' ? n.data.outputResult : null;
      }
      if (typeof n.data.outputResult === 'string') return n.data.outputResult;
      if (typeof n.data.value === 'string') return n.data.value;
      return null;
  };

  const renderMentionMenu = () => {
      if (mentionQuery === null || filteredOptions.length === 0) return null;
      
      return (
          <div className="absolute bottom-full left-4 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] animate-in fade-in zoom-in-95 origin-bottom-left flex flex-col max-h-60">
               <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                   Suggestions
               </div>
               <div className="overflow-y-auto custom-scrollbar p-1">
                   {filteredOptions.map((opt, idx) => (
                       <button
                           key={idx}
                           onClick={() => handleMentionSelect(opt)}
                           className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${idx === mentionIndex ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                       >
                           {(() => {
                               const thumb = getNodeThumbnail(opt.data);
                               if (thumb) {
                                   return <img src={thumb} alt="thumb" className="w-6 h-6 rounded object-cover border border-gray-200 dark:border-gray-700" />
                               }
                               return (
                                   <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-500">
                                       {opt.data.data.type === 'image_input' ? 'IMG' : 'ND'}
                                   </div>
                               );
                           })()}
                           <div className="flex flex-col min-w-0">
                               <span className="font-bold truncate">{opt.data.data.label || opt.data.data.type}</span>
                           </div>
                       </button>
                   ))}
               </div>
          </div>
      );
  };
  const isMediaNode = ['video_gen', 'image_gen', 'video_composer', 'preview', 'image_input', 'image_matting', 'image_receiver'].includes(node.type);
  const isSticky = node.type === 'sticky_note';
  const hasPadding = !isMediaNode && !isSticky;
  
  const nodeWidth = node.type === 'group' ? (node.data.settings?.width || 400) : getNodeWidth(node, isExpanded);
  let nodeHeight = node.type === 'group' ? (node.data.settings?.height || 300) : (getNodeContentHeight(node, nodeWidth) + 40); // 40 is header height
  
  if (hasPadding && node.type !== 'group') {
      nodeHeight += 32; // Add padding (16px top + 16px bottom)
  }



  useLayoutEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
              setShowSettingsPopover(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUpstreamNode = (handleId: string) => {
      if (!edges || !nodes) return null;
      const edge = edges.find(e => e.target === node.id && (e.targetHandle === handleId || (!e.targetHandle && handleId === 'prompt')));
      if (!edge) return null;
      return nodes.find(n => n.id === edge.source);
  };

  const promptSource = getUpstreamNode('prompt') || getUpstreamNode('text') || getUpstreamNode('input') || getUpstreamNode('concept');
  const promptTextSource = promptSource && ['text_input','script_agent','ai_refine','string_processor'].includes(promptSource.type) ? promptSource : null;
  
  const getUpstreamImageUrl = (handleId: string = 'image') => {
      const imgNode = getUpstreamNode(handleId);
      if (!imgNode) return null;
      if (imgNode.type === 'image_input' || imgNode.type === 'character_ref') {
          return typeof imgNode.data.value === 'string' ? imgNode.data.value : null;
      }
      if (imgNode.type === 'image_gen' || imgNode.type === 'image_upscale' || imgNode.type === 'image_matting' || imgNode.type === 'preview') {
          return typeof imgNode.data.outputResult === 'string' ? imgNode.data.outputResult : null;
      }
      // Generic fallback
      if (imgNode.data.outputResult && typeof imgNode.data.outputResult === 'string') {
          return imgNode.data.outputResult;
      }
      return null;
  };

  const getRelevantModels = () => {
    let typeFilter = '';
    if (node.type === 'video_gen') typeFilter = 'video';
    if (node.type === 'image_gen' || node.type === 'image_input') typeFilter = 'image';
    if (node.type === 'script_agent' || node.type === 'ai_refine') typeFilter = 'text';
    if (node.type === 'audio_gen') typeFilter = 'audio';

    if (!typeFilter) {
        return { Google: [], OpenAI: [], Enterprise: [], Industry: [], Gateway: [] };
    }

    // 优先使用动态模型，如果没有则使用本地常量
    const modelsToUse = dynamicModels.length > 0 ? dynamicModels : MODELS_CONST.filter(m => m.type === typeFilter);
    
    // 将动态模型转换为本地格式并去重
    const formattedModels = modelsToUse.map(m => ({
      id: m.id,
      name: m.label || m.id,
      label: m.label || m.id,
      type: m.type || typeFilter,
      provider: m.provider || 'Gateway'
    }));
    
    // 使用Map去重，确保每个模型ID只出现一次
    const uniqueModels = Array.from(
      new Map(formattedModels.map(m => [m.id, m])).values()
    );
    
    return {
        Google: uniqueModels.filter(m => m.provider === 'Google'),
        OpenAI: uniqueModels.filter(m => m.provider === 'OpenAI'),
        Enterprise: uniqueModels.filter(m => m.provider === 'Enterprise' || m.provider === 'Eyewind'),
        Industry: uniqueModels.filter(m => m.provider === 'Industry' || m.provider === 'Runway' || m.provider === 'Kling AI' || m.provider === 'Volcengine'),
        Gateway: uniqueModels.filter(m => m.provider === 'Gateway' || !['Google', 'OpenAI', 'Enterprise', 'Eyewind', 'Industry', 'Runway', 'Kling AI', 'Volcengine'].includes(m.provider || ''))
    };
  };

  const renderConnections = () => {
      const relevantHandles = ['prompt', 'text', 'input', 'concept'];
      const connectedEdges = edges.filter(e => e.target === node.id && relevantHandles.includes(e.targetHandle || 'prompt'));
      
      if (connectedEdges.length === 0) return null;

      return (
          <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Link2 size={10}/> {lang === 'zh' || lang === 'tw' ? '已连接' : 'Connected'}
                  </span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                  {connectedEdges.map(edge => {
                      const sourceNode = nodes.find(n => n.id === edge.source);
                      if (!sourceNode) return null;
                      return (
                          <div key={edge.id} className="flex items-center justify-between p-1.5 pl-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-800 group hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                              <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]"></div>
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                                      {sourceNode.data.label || sourceNode.type}
                                  </span>
                              </div>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onDeleteEdge?.(edge.id); }}
                                  className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                  title={lang === 'zh' || lang === 'tw' ? '断开连接' : 'Disconnect'}
                              >
                                  <X size={12} />
                              </button>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Use backend upload if available
        const url = await uploadAsset(file);
        
        // If it's an image, load it to get aspect ratio
        const img = new Image();
        img.src = url;
        img.onload = () => {
             const ratio = img.width / img.height;
             updateNodeData({ value: url, settings: { ...node.data.settings, imageRatio: ratio }});
             setIsReplacing(false);
        };
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
  };
  
  const handleImageInputUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'startImageBase64' | 'endImageBase64') => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const url = await uploadAsset(file);
              updateNodeData({ settings: { ...node.data.settings, [field]: url } });
          } catch (err) {
              console.error("Upload failed", err);
          }
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).select();
      }
  };

  useEffect(() => {
    if (node.type !== 'image_input') return;
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
      const imageItem = items.find(i => i.type.startsWith('image/'));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          try {
            const url = await uploadAsset(file);
            const img = new Image();
            img.src = url;
            img.onload = () => {
              const ratio = img.width / img.height;
              updateNodeData({ value: url, settings: { ...node.data.settings, imageRatio: ratio }});
              setIsReplacing(false);
            };
            e.preventDefault();
          } catch {}
        }
        return;
      }
      const text = e.clipboardData?.getData('text') || '';
      if (text && (text.startsWith('http') || text.startsWith('data:image'))) {
        updateNodeData({ value: text });
        setIsReplacing(false);
        e.preventDefault();
      }
    };
    document.addEventListener('paste', onPaste as any);
    return () => document.removeEventListener('paste', onPaste as any);
  }, [node.type, node.data.settings]);

  const handleGenerateCharacter = async (promptOverride?: string) => {
      const promptToUse = promptOverride || node.data.settings?.description;
      if (!promptToUse) return;
      setIsGeneratingChar(true);
      try {
          const imgUrl = await generateCharacterReference(promptToUse);
          const img = new Image();
          img.src = imgUrl;
          img.onload = () => {
            const ratio = img.width / img.height;
            updateNodeData({ value: imgUrl, settings: { ...node.data.settings, imageRatio: ratio }});
          }
      } catch (e: any) {
          console.error(e);
          // Only request Gemini API key if the error specifically mentions it or if it's a default state
          // OpenAI errors should show the toast but not trigger the Gemini modal
          if (e.message && (e.message.includes('API Key not found') || e.message.includes('Google')) && !e.message.includes('OpenAI')) {
             requestApiKey();
          } else {
             addToast(e.message || "Generation failed", 'error');
          }
      } finally {
          setIsGeneratingChar(false);
      }
  };

  const handleGenerateRefImage = async () => {
      if (!refImgDesc) return;
      setIsGeneratingRef(true);
      try {
          // Resolve References locally
          let finalPrompt = refImgDesc;
          const refImages: string[] = [];
          let contextInfo = "";
          
          if (finalPrompt.includes('@')) {
              const potentialTargets = nodes.filter(n => n.id !== node.id).map(n => ({
                    id: n.id,
                    label: n.data.label || n.type,
                    data: n.data
                }));
               // Sort by length to match longest labels first
               potentialTargets.sort((a, b) => b.label.length - a.label.length);

               for (const target of potentialTargets) {
                   const refTag = `@${target.label}`;
                   if (finalPrompt.includes(refTag)) {
                        let refData = null;
                        if (target.data.outputResult) refData = target.data.outputResult;
                        else if (target.data.value) refData = target.data.value;
                        else if (target.data.outputList) refData = target.data.outputList;

                        if (refData) {
                             if (typeof refData === 'string' && (refData.startsWith('data:image') || refData.startsWith('http'))) {
                                 refImages.push(refData);
                                 contextInfo += ` [Image Ref: ${target.label}]`;
                             } else if (typeof refData === 'string') {
                                 const safeText = refData.length > 200 ? refData.substring(0, 200) + "..." : refData;
                                 contextInfo += ` [Ref ${target.label}: ${safeText}]`;
                             }
                        }
                   }
               }
          }
          finalPrompt += contextInfo;

          const ratioStr = node.data.settings?.aspectRatio || '16:9';
          const [w, h] = ratioStr.split(':').map(Number);
          const ratio = (w && h) ? w / h : 1.77;
          const imgUrl = await generateImage({
              model: node.data.settings?.model || ModelType.GEMINI_FLASH_IMAGE,
              prompt: finalPrompt,
              aspectRatio: ratioStr as AspectRatio,
              resolution: node.data.settings?.resolution,
              referenceImages: refImages
          });
          updateNodeData({ value: imgUrl, settings: { ...node.data.settings, imageRatio: ratio }});
          setIsReplacing(false);
      } catch (e: any) {
          console.error(e);
          // Only trigger Gemini modal for relevant errors
          if (e.message && (e.message.includes('API Key not found') || e.message.includes('Google')) && !e.message.includes('OpenAI')) {
             requestApiKey();
          } else {
             addToast(e.message || "Reference image generation failed.", 'error');
          }
      } finally {
          setIsGeneratingRef(false);
      }
  }

  const getAspectRatioIcon = (ratio: AspectRatio | string) => {
      switch(ratio) {
          case '21:9': return <RectangleHorizontal size={14} className="scale-x-125"/>;
          case '16:9': return <RectangleHorizontal size={14} />;
          case '3:2': return <RectangleHorizontal size={14} className="scale-x-90"/>;
          case '4:3': return <MonitorPlay size={14} />;
          case '5:4': return <Square size={14} className="scale-x-110"/>;
          case '1:1': return <Square size={14} />;
          case '4:5': return <Square size={14} className="scale-y-110"/>;
          case '3:4': return <Tablet size={14} />;
          case '2:3': return <RectangleVertical size={14} className="scale-y-90"/>;
          case '9:16': return <RectangleVertical size={14} />;
          default: return <RectangleHorizontal size={14} />;
      }
  };

  const getRoleIcon = (roleId: string) => {
      switch(roleId) {
          case 'producer': return <Briefcase size={14} />;
          case 'game_designer': return <Gamepad2 size={14} />;
          case 'level_designer': return <MapIcon size={14} />;
          case 'art_director': return <Palette size={14} />;
          case 'sound_designer': return <Headphones size={14} />;
          case 'publisher': return <Globe size={14} />;
          case 'live_ops': return <Activity size={14} />;
          case 'community': return <Users size={14} />;
          case 'marketing': return <Megaphone size={14} />;
          case 'copywriter': return <Feather size={14} />;
          case 'qa': return <Bug size={14} />;
          case 'central_dispatcher': return <Network size={14} />;
          default: return <Clapperboard size={14} />;
      }
  };

  const isGenerative = ['video_gen', 'image_gen', 'script_agent', 'ai_refine', 'audio_gen', 'video_composer', 'pro_icon_gen', 'pro_art_director'].includes(node.type);
  const showFooter = isGenerative || (node.type === 'image_input' && refImgMode === 'generate');

  // Sticky Note Colors
  const STICKY_COLORS = [
      { id: 'yellow', class: 'bg-yellow-200', border: 'border-yellow-400' },
      { id: 'blue', class: 'bg-blue-200', border: 'border-blue-400' },
      { id: 'green', class: 'bg-green-200', border: 'border-green-400' },
      { id: 'pink', class: 'bg-pink-200', border: 'border-pink-400' },
      { id: 'purple', class: 'bg-purple-200', border: 'border-purple-400' },
      { id: 'gray', class: 'bg-gray-200', border: 'border-gray-400' },
  ];

  // Dynamic Ratio Options based on Model
  const getAvailableRatios = () => {
      if (node.type === 'image_gen' && node.data.settings?.model === ModelType.GEMINI_PRO_IMAGE) {
          return ASPECT_RATIOS_CONST; // Full list for Pro
      }
      return BASIC_ASPECT_RATIOS; // Restricted list for others
  };

  const renderVideoSettingsPopover = () => (
      <div className="absolute bottom-full right-0 mb-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-3 w-64 z-50 animate-in fade-in zoom-in-95 origin-bottom-right">
          <div className="absolute -bottom-1.5 right-11 w-3 h-3 bg-white dark:bg-gray-800 border-b border-r border-gray-100 dark:border-gray-700 transform rotate-45"></div>
          
          <div className="mb-3 relative z-10">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Size</div>
              <div className="flex gap-2">
                  {[AspectRatio.R_16_9, AspectRatio.R_9_16].map(ratio => (
                      <button key={ratio} onClick={() => updateNodeData({ settings: { ...node.data.settings, aspectRatio: ratio }})} className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${node.data.settings?.aspectRatio === ratio ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm' : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                          {getAspectRatioIcon(ratio)}<span className="text-[10px] font-bold mt-1">{ratio}</span>
                      </button>
                  ))}
              </div>
          </div>

          <div className="mb-3 relative z-10">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Duration</div>
              <div className="flex gap-1.5 items-center">
                  {DURATIONS.map(d => (
                      <button key={d.value} onClick={() => updateNodeData({ settings: { ...node.data.settings, duration: d.value }})} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${node.data.settings?.duration === d.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm' : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{d.label}</button>
                  ))}
                  <input 
                      type="number" 
                      min="1" 
                      max="120"
                      value={node.data.settings?.duration || 4}
                      onChange={(e) => {
                          const val = parseInt(e.target.value) || 4;
                          updateNodeData({ settings: { ...node.data.settings, duration: val }});
                      }}
                      className="w-16 px-2 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="自定义"
                  />
                  <span className="text-xs text-gray-400">s</span>
              </div>
          </div>

          <div className="relative z-10">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quality</div>
              <div className="flex gap-1.5">
                  {RESOLUTIONS.map(r => {
                      const isVeoFast = node.data.settings?.model === ModelType.VEO_FAST || node.data.settings?.model === 'veo-3.1-fast-generate-preview';
                      const isDisabled = isVeoFast && r.id === Resolution.P1080;
                      return (
                          <button 
                              key={r.id} 
                              disabled={isDisabled}
                              onClick={() => !isDisabled && updateNodeData({ settings: { ...node.data.settings, resolution: r.id }})} 
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all 
                                  ${isDisabled ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800 text-gray-400' : 
                                  node.data.settings?.resolution === r.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm' : 
                                  'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                              title={isDisabled ? "Not supported by Veo Fast" : ""}
                          >
                              {r.label}
                          </button>
                      );
                  })}
              </div>
          </div>
          
          {/* Audio Toggle for Seedance (or generic if supported) */}
          {(node.data.settings?.model?.includes('seedance') || node.data.settings?.model?.includes('doubao')) && (
              <div className="relative z-10 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between cursor-pointer group" onClick={() => updateNodeData({ settings: { ...node.data.settings, withAudio: !node.data.settings?.withAudio }})}>
                      <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${node.data.settings?.withAudio ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                             <Music size={14} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">Generate Audio</span>
                      </div>
                      <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${node.data.settings?.withAudio ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
                          <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${node.data.settings?.withAudio ? 'translate-x-3.5' : ''}`} />
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  const renderVideoGenFooter = () => (
      <div className="relative px-3 py-2 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 rounded-b-2xl">
          {showSettingsPopover && renderVideoSettingsPopover()}
          <div className="flex items-center gap-2 flex-1">
               <div className="relative group flex-1">
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-700 px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                        <div className="p-1 bg-white dark:bg-gray-700 rounded-md shadow-sm text-gray-500 dark:text-gray-400">
                            <Video size={12}/>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-1 truncate">{node.data.settings?.model?.split('-')[0] || 'Veo'}</span>
                        <ChevronDown size={12} className="text-gray-400"/>
                    </div>
                     <select className="absolute inset-0 opacity-0 cursor-pointer" value={node.data.settings?.model} onChange={(e) => {
                        const newModel = e.target.value;
                        const isVeoFast = newModel === ModelType.VEO_FAST || newModel === 'veo-3.1-fast-generate-preview';
                        updateNodeData({ 
                            settings: { 
                                ...node.data.settings, 
                                model: newModel,
                                resolution: (isVeoFast && node.data.settings?.resolution === Resolution.P1080) ? Resolution.P720 : node.data.settings?.resolution
                            }
                        });
                     }}>
                        {(() => {
                            if (isLoadingModels) {
                                return <option disabled>Loading models...</option>;
                            }
                            
                            const groups = getRelevantModels();
                            return (
                                <>
                                    {groups.Google.length > 0 && <optgroup label="Google">
                                        {groups.Google.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                    </optgroup>}
                                    {groups.OpenAI.length > 0 && <optgroup label="OpenAI">
                                        {groups.OpenAI.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                    </optgroup>}
                                    {groups.Enterprise.length > 0 && <optgroup label="Enterprise">
                                        {groups.Enterprise.map(m => <option key={m.id} value={m.id}>⭐ {m.label}</option>)}
                                    </optgroup>}
                                    {groups.Industry.length > 0 && <optgroup label="Industry">
                                        {groups.Industry.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                    </optgroup>}
                                    {groups.Gateway.length > 0 && <optgroup label="AI Gateway">
                                        {groups.Gateway.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                    </optgroup>}
                                </>
                            );
                        })()}
                    </select>
               </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => setShowSettingsPopover(!showSettingsPopover)} className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border text-xs font-medium ${showSettingsPopover ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'hover:bg-white dark:hover:bg-gray-700 border-transparent hover:border-gray-200 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                  <span>{node.data.settings?.aspectRatio || '16:9'}</span><span className="text-gray-300 dark:text-gray-600">•</span><span>{node.data.settings?.duration || 4}s</span><span className="text-gray-300 dark:text-gray-600">•</span><span>{node.data.settings?.resolution || '720p'}</span><ChevronDown size={10} className={`text-gray-400 transition-transform ${showSettingsPopover ? 'rotate-180' : ''}`}/>
              </button>
              <button onClick={onRun} disabled={node.status === 'running'} className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 shadow-sm">
                  {node.status === 'running' ? <Loader2 size={12} className="animate-spin"/> : <Zap size={12} className="text-yellow-400 dark:text-yellow-600" fill="currentColor"/>}
                  <span>{t.actions.run || 'Run'}</span>
              </button>
          </div>
      </div>
  );

  const [adjustment, setAdjustment] = useState({ x: 0, y: 0, placement: 'bottom', width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!toolbarRef.current) return;
    
    const calculatePosition = () => {
        const rect = toolbarRef.current!.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const TOP_SAFE_AREA = 80; // Header + Margin
        const BOTTOM_SAFE_AREA = 20;
        const HORIZONTAL_SAFE_AREA = 20;

        const h = rect.height;
        const w = rect.width;
        
        // Node Boundaries in Screen Coordinates
        const nodeX = node.x * viewport.zoom + viewport.x;
        const nodeY = node.y * viewport.zoom + viewport.y;
        const nodeW = nodeWidth * viewport.zoom;
        const nodeH = nodeHeight * viewport.zoom;
        
        // Candidates
        // Each candidate: { placement, fits, space, offsetX, offsetY }
        
        const checkFit = (p: string) => {
            let fits = true;
            let offsetX = 0;
            let offsetY = 0;
            
            if (p === 'bottom') {
                const top = nodeY + nodeH + 12;
                const bottom = top + h;
                if (bottom > winH - BOTTOM_SAFE_AREA) fits = false;
                
                // Horizontal Clamp
                const centerX = nodeX + nodeW / 2;
                const left = centerX - w / 2;
                const right = centerX + w / 2;
                
                if (left < HORIZONTAL_SAFE_AREA) offsetX = HORIZONTAL_SAFE_AREA - left;
                else if (right > winW - HORIZONTAL_SAFE_AREA) offsetX = (winW - HORIZONTAL_SAFE_AREA) - right;
                
            } else if (p === 'top') {
                const bottom = nodeY - 12;
                const top = bottom - h;
                if (top < TOP_SAFE_AREA) fits = false;

                // Horizontal Clamp
                const centerX = nodeX + nodeW / 2;
                const left = centerX - w / 2;
                const right = centerX + w / 2;
                
                if (left < HORIZONTAL_SAFE_AREA) offsetX = HORIZONTAL_SAFE_AREA - left;
                else if (right > winW - HORIZONTAL_SAFE_AREA) offsetX = (winW - HORIZONTAL_SAFE_AREA) - right;

            } else if (p === 'right') {
                const left = nodeX + nodeW + 12;
                const right = left + w;
                if (right > winW - HORIZONTAL_SAFE_AREA) fits = false;

                // Vertical Clamp
                const centerY = nodeY + nodeH / 2;
                const top = centerY - h / 2;
                const bottom = centerY + h / 2;
                
                if (top < TOP_SAFE_AREA) offsetY = TOP_SAFE_AREA - top;
                else if (bottom > winH - BOTTOM_SAFE_AREA) offsetY = (winH - BOTTOM_SAFE_AREA) - bottom;

            } else if (p === 'left') {
                const right = nodeX - 12;
                const left = right - w;
                if (left < HORIZONTAL_SAFE_AREA) fits = false;

                // Vertical Clamp
                const centerY = nodeY + nodeH / 2;
                const top = centerY - h / 2;
                const bottom = centerY + h / 2;
                
                if (top < TOP_SAFE_AREA) offsetY = TOP_SAFE_AREA - top;
                else if (bottom > winH - BOTTOM_SAFE_AREA) offsetY = (winH - BOTTOM_SAFE_AREA) - bottom;
            }
            
            return { fits, offsetX, offsetY };
        };

        const placements = ['bottom', 'top', 'right', 'left'];
        let chosenPlacement = 'bottom';
        let chosenOffset = { x: 0, y: 0 };
        
        // 1. Try to find a perfect fit
        let foundFit = false;
        for (const p of placements) {
            const res = checkFit(p);
            if (res.fits) {
                chosenPlacement = p;
                chosenOffset = { x: res.offsetX, y: res.offsetY };
                foundFit = true;
                break;
            }
        }
        
        // 2. If no perfect fit, find best fallback (Maximize visibility / minimize overlap)
        // For now, fallback to Bottom or Top depending on vertical space, clamped
        if (!foundFit) {
             const spaceTop = nodeY - TOP_SAFE_AREA;
             const spaceBottom = winH - BOTTOM_SAFE_AREA - (nodeY + nodeH);
             const spaceLeft = nodeX - HORIZONTAL_SAFE_AREA;
             const spaceRight = winW - HORIZONTAL_SAFE_AREA - (nodeX + nodeW);
             
             // Simple heuristic: pick largest space
             const spaces = [
                 { p: 'bottom', s: spaceBottom },
                 { p: 'top', s: spaceTop },
                 { p: 'right', s: spaceRight },
                 { p: 'left', s: spaceLeft }
             ];
             
             spaces.sort((a, b) => b.s - a.s);
             chosenPlacement = spaces[0].p;
             
             // Recalculate offset with forced clamping (ignoring fit check)
             // We need to duplicate the clamp logic here or make checkFit return clamps even if not fits
             // Let's reuse logic but we need to implement "Force Clamp"
             
             if (chosenPlacement === 'bottom' || chosenPlacement === 'top') {
                 // Clamp X normally
                 const centerX = nodeX + nodeW / 2;
                 const left = centerX - w / 2;
                 const right = centerX + w / 2;
                 if (left < HORIZONTAL_SAFE_AREA) chosenOffset.x = HORIZONTAL_SAFE_AREA - left;
                 else if (right > winW - HORIZONTAL_SAFE_AREA) chosenOffset.x = (winW - HORIZONTAL_SAFE_AREA) - right;
                 
                 // Clamp Y (Shift to be on screen, potentially overlapping node)
                 if (chosenPlacement === 'bottom') {
                     const top = nodeY + nodeH + 12;
                     const bottom = top + h;
                     if (bottom > winH - BOTTOM_SAFE_AREA) chosenOffset.y = (winH - BOTTOM_SAFE_AREA) - bottom;
                 } else {
                     const bottom = nodeY - 12;
                     const top = bottom - h;
                     if (top < TOP_SAFE_AREA) chosenOffset.y = TOP_SAFE_AREA - top;
                 }
             } else {
                 // Left/Right
                 // Clamp Y normally
                 const centerY = nodeY + nodeH / 2;
                 const top = centerY - h / 2;
                 const bottom = centerY + h / 2;
                 if (top < TOP_SAFE_AREA) chosenOffset.y = TOP_SAFE_AREA - top;
                 else if (bottom > winH - BOTTOM_SAFE_AREA) chosenOffset.y = (winH - BOTTOM_SAFE_AREA) - bottom;
                 
                 // Clamp X (Shift to be on screen)
                 if (chosenPlacement === 'right') {
                     const left = nodeX + nodeW + 12;
                     const right = left + w;
                     if (right > winW - HORIZONTAL_SAFE_AREA) chosenOffset.x = (winW - HORIZONTAL_SAFE_AREA) - right;
                 } else {
                     const right = nodeX - 12;
                     const left = right - w;
                     if (left < HORIZONTAL_SAFE_AREA) chosenOffset.x = HORIZONTAL_SAFE_AREA - left;
                 }
             }
        }

        setAdjustment(prev => {
            if (prev.x !== chosenOffset.x || prev.y !== chosenOffset.y || prev.placement !== chosenPlacement || prev.width !== w || prev.height !== h) {
                return { x: chosenOffset.x, y: chosenOffset.y, placement: chosenPlacement, width: w, height: h };
            }
            return prev;
        });
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [node.x, node.y, nodeWidth, nodeHeight, viewport.zoom, viewport.x, viewport.y, node.data.settings]);

  // Calculate transforms to counter-act zoom and position correctly in screen pixels
  const scale = 1 / viewport.zoom;
  
  // Anchor Point: Top-Center of Node (node.x + nodeWidth/2, node.y)
  // We calculate visual shifts relative to this anchor
  
  let visualShiftX = 0;
  let visualShiftY = 0;
  
  const { placement, width: w, height: h, x: offX, y: offY } = adjustment;
  
  if (placement === 'bottom') {
      visualShiftX = -w / 2 + offX;
      visualShiftY = (nodeHeight * viewport.zoom) + 12 + offY;
  } else if (placement === 'top') {
      visualShiftX = -w / 2 + offX;
      visualShiftY = -h - 12 + offY;
  } else if (placement === 'right') {
      visualShiftX = (nodeWidth * viewport.zoom) / 2 + 12 + offX;
      visualShiftY = (nodeHeight * viewport.zoom) / 2 - h / 2 + offY;
  } else if (placement === 'left') {
      visualShiftX = -(nodeWidth * viewport.zoom) / 2 - 12 - w + offX;
      visualShiftY = (nodeHeight * viewport.zoom) / 2 - h / 2 + offY;
  }
      
  const translateX = visualShiftX * scale;
  const translateY = visualShiftY * scale;

  const containerStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${node.x + nodeWidth / 2}px`,
      top: `${node.y}px`, // Anchor to node top-center
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`, 
      transformOrigin: 'top left', 
      width: window.innerWidth < 640 ? 'calc(100% - 32px)' : (node.type === 'sticky_note' ? 'auto' : '420px'), 
      zIndex: 100,
      transition: 'transform 0.1s ease-out'
  };

  return (
    <div 
        ref={toolbarRef} 
        className={`flex flex-col items-center ${isConnecting ? 'pointer-events-none' : 'pointer-events-auto'}`}
        style={{...containerStyle, pointerEvents: isConnecting ? 'none' : 'auto'}}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
    >
      <div className={`bg-white dark:bg-gray-900 w-full rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col relative z-30 animate-in fade-in zoom-in-95 duration-200 ease-out ${
          adjustment.placement === 'top' ? 'slide-in-from-bottom-2' :
          adjustment.placement === 'bottom' ? 'slide-in-from-top-2' :
          adjustment.placement === 'left' ? 'slide-in-from-right-2' :
          'slide-in-from-left-2'
      }`}>
        
        {/* --- 主输入区域 --- */}
        <div className={node.type === 'sticky_note' ? "p-4" : "p-4"}>
            
            {node.type === 'sticky_note' && (
                <div className="flex items-center justify-center gap-2 mt-2">
                    {STICKY_COLORS.map(c => (
                        <button
                            key={c.id}
                            onClick={() => updateNodeData({ settings: { ...node.data.settings, color: c.id } })}
                            className={`w-6 h-6 rounded-full ${c.class} border-2 transition-all hover:scale-110 ${node.data.settings?.color === c.id ? 'border-black dark:border-white scale-110' : 'border-transparent'}`}
                            title={c.id}
                        />
                    ))}
                </div>
            )}

            {node.type === 'text_input' && (
            <textarea
                value={node.data.value}
                onChange={(e) => updateNodeData({ value: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholders.text}
                className="w-full h-24 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 resize-none text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-700 dark:text-gray-200 border border-transparent focus:border-blue-500/20 transition-all"
                autoFocus
            />
            )}

            {node.type === 'character_ref' && (
                <div className="flex flex-col gap-3">
                    {/* Name Input */}
                    <div className="relative group">
                        <input 
                            type="text" 
                            value={node.data.label} 
                            onChange={(e) => updateNodeData({ label: e.target.value })} 
                            placeholder={t.character.name_placeholder} 
                            className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 pt-5 pb-2 text-sm font-bold outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100 border border-transparent focus:border-purple-500/20 transition-all" 
                        />
                        <span className="absolute left-3 top-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider pointer-events-none">Name</span>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                        <button onClick={() => setCharMode('upload')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${charMode === 'upload' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{t.character.tab_upload}</button>
                        <button onClick={() => setCharMode('generate')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${charMode === 'generate' ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{t.character.tab_generate}</button>
                    </div>

                    {charMode === 'upload' ? (
                        <label htmlFor={`char-upload-${node.id}`} className="h-40 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 transition-all group relative overflow-hidden">
                            {node.data.value ? ( 
                                <>
                                    <img src={node.data.value} className="h-full w-full object-contain z-10 relative" /> 
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 text-white font-bold text-xs">Click to Replace</div>
                                </>
                            ) : ( 
                                <> 
                                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Upload size={20} className="text-purple-400 group-hover:text-purple-500" /> 
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{t.actions.upload}</span> 
                                </> 
                            )}
                        </label>
                    ) : (
                        <div className="space-y-3">
                            {/* Attribute Selectors */}
                            <div className="grid grid-cols-2 gap-2">
                                <select 
                                    className="bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-xs font-bold rounded-xl px-2 py-2.5 outline-none text-gray-700 dark:text-gray-200 focus:border-purple-500/20 transition-all cursor-pointer"
                                    value={node.data.settings?.gender || 'female'}
                                    onChange={(e) => updateNodeData({ settings: { ...node.data.settings, gender: e.target.value } })}
                                >
                                    <option value="female">Female</option>
                                    <option value="male">Male</option>
                                    <option value="non-binary">Non-binary</option>
                                    <option value="robot">Robot</option>
                                    <option value="monster">Monster</option>
                                </select>
                                <select 
                                    className="bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-xs font-bold rounded-xl px-2 py-2.5 outline-none text-gray-700 dark:text-gray-200 focus:border-purple-500/20 transition-all cursor-pointer"
                                    value={node.data.settings?.age || 'adult'}
                                    onChange={(e) => updateNodeData({ settings: { ...node.data.settings, age: e.target.value } })}
                                >
                                    <option value="child">Child</option>
                                    <option value="teen">Teen</option>
                                    <option value="adult">Adult</option>
                                    <option value="elder">Elder</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <select 
                                    className="bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-xs font-bold rounded-xl px-2 py-2.5 outline-none text-gray-700 dark:text-gray-200 focus:border-purple-500/20 transition-all cursor-pointer"
                                    value={node.data.settings?.hairColor || 'default'}
                                    onChange={(e) => updateNodeData({ settings: { ...node.data.settings, hairColor: e.target.value } })}
                                >
                                    <option value="default">Default Hair</option>
                                    <option value="black">Black Hair</option>
                                    <option value="blonde">Blonde Hair</option>
                                    <option value="brown">Brown Hair</option>
                                    <option value="red">Red Hair</option>
                                    <option value="white">White Hair</option>
                                    <option value="blue">Blue Hair</option>
                                    <option value="pink">Pink Hair</option>
                                    <option value="purple">Purple Hair</option>
                                    <option value="green">Green Hair</option>
                                </select>
                                <select 
                                    className="bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-xs font-bold rounded-xl px-2 py-2.5 outline-none text-gray-700 dark:text-gray-200 focus:border-purple-500/20 transition-all cursor-pointer"
                                    value={node.data.settings?.eyeColor || 'default'}
                                    onChange={(e) => updateNodeData({ settings: { ...node.data.settings, eyeColor: e.target.value } })}
                                >
                                    <option value="default">Default Eyes</option>
                                    <option value="blue">Blue Eyes</option>
                                    <option value="brown">Brown Eyes</option>
                                    <option value="green">Green Eyes</option>
                                    <option value="hazel">Hazel Eyes</option>
                                    <option value="grey">Grey Eyes</option>
                                    <option value="red">Red Eyes</option>
                                    <option value="purple">Purple Eyes</option>
                                    <option value="amber">Amber Eyes</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-1">
                                <select 
                                    className="bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-xs font-bold rounded-xl px-2 py-2.5 outline-none text-gray-700 dark:text-gray-200 focus:border-purple-500/20 transition-all cursor-pointer"
                                    value={node.data.settings?.style || 'anime'}
                                    onChange={(e) => updateNodeData({ settings: { ...node.data.settings, style: e.target.value } })}
                                >
                                    <option value="anime">Anime Style</option>
                                    <option value="realistic">Realistic Photography</option>
                                    <option value="3d-render">3D Render (Pixar)</option>
                                    <option value="cyberpunk">Cyberpunk</option>
                                    <option value="oil-painting">Oil Painting</option>
                                    <option value="pixel-art">Pixel Art</option>
                                    <option value="watercolor">Watercolor</option>
                                    <option value="sketch">Pencil Sketch</option>
                                    <option value="flat">Flat Illustration</option>
                                </select>
                            </div>

                            <div className="relative w-full h-24">
                                {activeField === 'description' && renderMentionMenu()}
                                <textarea 
                                    value={node.data.settings?.description || ''} 
                                    onChange={(e) => handlePromptChange(e, 'description')} 
                                    onKeyDown={(e) => handlePromptKeyDown(e, 'description')} 
                                    placeholder={t.character.desc_placeholder || "Describe outfit, accessories, personality..."} 
                                    className="w-full h-full p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl resize-none text-xs outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 border border-transparent focus:border-purple-500/20 transition-all" 
                                />
                            </div>
                            
                            <button 
                                onClick={() => {
                                    const { gender = 'female', age = 'adult', style = 'anime', description = '', hairColor = 'default', eyeColor = 'default' } = node.data.settings || {};
                                    let fullPrompt = `${style} style character. A ${age} ${gender}`;
                                    if (hairColor && hairColor !== 'default') fullPrompt += `, ${hairColor}`;
                                    if (eyeColor && eyeColor !== 'default') fullPrompt += `, ${eyeColor}`;
                                    if (description) fullPrompt += `. ${description}`;
                                    
                                    handleGenerateCharacter(fullPrompt);
                                }} 
                                disabled={isGeneratingChar} 
                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {isGeneratingChar ? <Loader2 className="animate-spin" size={14}/> : <><Sparkles size={14}/> {t.character.gen_btn}</>}
                            </button>
                        </div>
                    )}
                    <input id={`char-upload-${node.id}`} type="file" ref={fileInputRef} className="sr-only" accept="image/*,.svg,.ico,image/svg+xml,image/x-icon" onChange={handleFileUpload} />
                </div>
            )}

            {node.type === 'image_input' && (
                <div className="flex flex-col gap-3">
                    {node.data.value && !isReplacing ? (
                    <button onClick={() => setIsReplacing(true)} className="w-full py-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white flex items-center justify-center gap-2 transition-colors border border-dashed border-gray-200 dark:border-gray-700">
                        <RefreshCcw size={14} />
                        {lang === 'zh' || lang === 'tw' ? '换图' : t.actions.replace_image}
                    </button>
                ) : (
                        <>
                            <div className="flex gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg relative">
                                <button onClick={() => setRefImgMode('upload')} className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${refImgMode === 'upload' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{t.actions.upload}</button>
                                <button onClick={() => setRefImgMode('generate')} className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${refImgMode === 'generate' ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{t.actions.generate}</button>
                                {isReplacing && (
                                    <button 
                                        onClick={() => setIsReplacing(false)} 
                                        className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 z-10"
                                        title="Cancel Replace"
                                    >
                                        <X size={12} className="text-gray-500 dark:text-gray-400" />
                                    </button>
                                )}
                            </div>
                            {refImgMode === 'upload' ? (
                                <label htmlFor={`ref-upload-${node.id}`} className="h-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-amber-300 dark:hover:border-amber-600 transition-colors group">
                                    <Upload size={20} className="text-gray-400 dark:text-gray-500 group-hover:text-amber-500 mb-1" /> <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t.actions.upload}</span>
                                </label>
                            ) : (
                                <div className="flex flex-col gap-1 h-20 relative">
                                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles size={10}/>PROMPT</span>
                                     {activeField === 'refImgDesc' && renderMentionMenu()}
                                     <textarea value={refImgDesc} onChange={(e) => handlePromptChange(e, 'refImgDesc')} onKeyDown={(e) => handlePromptKeyDown(e, 'refImgDesc')} placeholder={t.placeholders.ref_image_gen} className="w-full h-full bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 resize-none text-xs outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-700 dark:text-gray-200 border border-transparent focus:border-amber-500/20 transition-all" autoFocus />
                                </div>
                            )}
                            <input id={`ref-upload-${node.id}`} type="file" ref={fileInputRef} className="sr-only" accept="image/*,.svg,.ico,image/svg+xml,image/x-icon" onChange={handleFileUpload} />
                        </>
                    )}
                </div>
            )}

            {/* Video Gen Block */}
            {node.type === 'video_gen' && (
                 <div className="flex flex-col gap-3">
                    {promptTextSource ? (
                        <div className="w-full h-24 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center text-center p-4 gap-2 select-none group/linked">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 shadow-sm group-hover/linked:scale-110 transition-transform"><Link2 size={20} /></div>
                            <div className="flex flex-col"><span className="text-xs font-bold text-blue-700 dark:text-blue-300">Using {promptTextSource.data.label}</span><span className="text-[10px] text-blue-400 dark:text-blue-500 mt-0.5">Prompt provided by upstream node</span></div>
                        </div>
                    ) : (
                        <div className="relative w-full h-24">
                            {activeField === 'value' && renderMentionMenu()}
                            <textarea 
                                value={node.data.value || ''} 
                                onChange={(e) => handlePromptChange(e, 'value')} 
                                onKeyDown={(e) => handlePromptKeyDown(e, 'value')}
                                placeholder={lang === 'en' ? "What are we creating today? (@ to reference)" : "今天想创作什么？(使用 @ 引用)"} 
                                className="w-full h-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 resize-none text-sm outline-none border border-transparent focus:border-blue-200 dark:focus:border-blue-800 placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-700 dark:text-gray-200 font-medium custom-scrollbar transition-all" 
                            />
                        </div>
                     )}
                     <VideoGenFrames node={node} edges={edges} nodes={nodes} lang={lang} updateNodeData={updateNodeData} onAddConnectedNode={onAddConnectedNode} onDeleteEdge={onDeleteEdge} onConnect={onConnect} />
                 </div>
            )}

            {/* Script Agent - Enhanced with Role Selection */}
            {node.type === 'script_agent' && (
                <div className="flex flex-col gap-3">
                    {/* Role Selector Header */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <UserCog size={12} className="text-indigo-500"/>
                            <span>{t.agent?.role_label || 'Agent Role'}</span>
                        </div>
                        
                        <div className="relative group/role w-32">
                            <select 
                                className="w-full bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-indigo-600 dark:text-indigo-400 rounded-lg pl-2 pr-6 py-1.5 outline-none appearance-none cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all focus:border-indigo-500/30"
                                value={node.data.settings?.role || 'director'}
                                onChange={(e) => updateNodeData({ settings: { ...node.data.settings, role: e.target.value }})}
                            >
                                {t.agent?.roles && Object.entries(t.agent.roles).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label as string}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                                <ChevronDown size={10} />
                            </div>
                        </div>
                    </div>

                    {/* Connection Indicator or Input */}
                    {renderConnections()}
                   {!promptSource && (
                        <div className="relative w-full h-24">
                           {activeField === 'value' && renderMentionMenu()}
                           <textarea
                               value={node.data.value}
                               onChange={(e) => handlePromptChange(e, 'value')}
                               onKeyDown={(e) => handlePromptKeyDown(e, 'value')}
                               placeholder={t.agent?.concept_placeholder || "Input concept or idea..."}
                               className="w-full h-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 resize-none text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-700 dark:text-gray-200 border border-transparent focus:border-indigo-500/20 transition-all"
                           />
                        </div>
                    )}
                </div>
            )}

            {/* Other Generators Prompt (Image Gen / AI Refine) */}
            {['image_gen', 'ai_refine'].includes(node.type) && (
                 <div className="flex flex-col gap-1 relative">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sparkles size={10}/>
                        {node.data.label} Overrides
                     </span>
                     {promptSource ? (
                         <div className="w-full h-16 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-center gap-2">
                             <Link2 size={14} className="text-blue-500"/>
                             <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Using {promptSource.data.label}</span>
                         </div>
                     ) : (
                         <div className="relative w-full h-24">
                            {activeField === 'value' && renderMentionMenu()}
                            <textarea
                                value={node.data.value}
                                onChange={(e) => handlePromptChange(e, 'value')}
                                onKeyDown={(e) => handlePromptKeyDown(e, 'value')}
                                placeholder={lang === 'zh' || lang === 'tw' ? "输入提示词... (使用 @ 引用)" : "Prompt... (use @ to reference)"}
                                className="w-full h-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 resize-none text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-700 dark:text-gray-200 border border-transparent focus:border-blue-500/20 transition-all"
                            />
                         </div>
                     )}
                 </div>
            )}
             {node.type === 'audio_gen' && (
                 <div className="flex flex-col gap-1">
                     {renderConnections()}
                   {!promptSource && (
                        <textarea value={node.data.value} onChange={(e) => updateNodeData({ value: e.target.value })} onKeyDown={handleKeyDown} placeholder={t.placeholders.audio_input} className="w-full h-24 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 resize-none text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-700 dark:text-gray-200 border border-transparent focus:border-blue-500/20 transition-all" />
                    )}
                 </div>
            )}
            {node.type === 'video_composer' && (
                 <div className="flex flex-col gap-2 p-1">
                     <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Clip Sequence</div>
                     {(() => {
                         const connectedEdges = edges.filter(e => e.target === node.id);
                         const connectedNodes = connectedEdges
                             .map(e => nodes.find(n => n.id === e.source))
                             .filter((n): n is WorkflowNode => !!n && ['video_gen', 'video_composer', 'skeletal_anim'].includes(n.type));
                         
                         if (connectedNodes.length === 0) {
                             return (
                                 <div className="text-center py-4 text-gray-400 text-xs bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                     <Layers size={20} className="mx-auto mb-2 opacity-50"/>
                                     Connect video nodes to start
                                 </div>
                             );
                         }

                         // Sort based on saved order
                         const order = node.data.settings?.clipOrder || [];
                         const sortedNodes = [...connectedNodes].sort((a, b) => {
                             const idxA = order.indexOf(a.id);
                             const idxB = order.indexOf(b.id);
                             if (idxA === -1 && idxB === -1) return 0;
                             if (idxA === -1) return 1;
                             if (idxB === -1) return -1;
                             return idxA - idxB;
                         });

                         const moveNode = (nodeId: string, direction: 'up' | 'down') => {
                             const currentOrder = sortedNodes.map(n => n.id);
                             const idx = currentOrder.indexOf(nodeId);
                             if (idx === -1) return;
                             
                             const newOrder = [...currentOrder];
                             if (direction === 'up' && idx > 0) {
                                 [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
                             } else if (direction === 'down' && idx < newOrder.length - 1) {
                                 [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                             }
                             updateNodeData({ settings: { ...node.data.settings, clipOrder: newOrder } });
                         };

                         return (
                             <div className="space-y-1.5">
                                 {sortedNodes.map((n, idx) => (
                                     <div key={n.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm group">
                                         <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                                             {n.data.outputResult && typeof n.data.outputResult === 'string' && n.data.outputResult.startsWith('http') ? (
                                                 <video src={n.data.outputResult} className="w-full h-full object-cover" />
                                             ) : (
                                                 <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400">{idx + 1}</div>
                                             )}
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <div className="text-[10px] font-medium text-gray-700 dark:text-gray-200 truncate">{n.data.label || n.type}</div>
                                             <div className="text-[8px] text-gray-400 truncate">ID: {n.id.slice(-4)}</div>
                                         </div>
                                         <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button 
                                                 onClick={(e) => { e.stopPropagation(); moveNode(n.id, 'up'); }}
                                                 disabled={idx === 0}
                                                 className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                                             >
                                                 <ChevronUp size={10} className="text-gray-500" />
                                             </button>
                                             <button 
                                                 onClick={(e) => { e.stopPropagation(); moveNode(n.id, 'down'); }}
                                                 disabled={idx === sortedNodes.length - 1}
                                                 className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                                             >
                                                 <ChevronDown size={10} className="text-gray-500" />
                                             </button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         );
                     })()}
                 </div>
             )}
        </div>
        
        {/* 错误信息 */}
        {node.status === 'error' && node.errorMessage && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-100 dark:border-red-900 text-[10px] text-red-600 dark:text-red-400 font-medium flex items-start gap-1.5 animate-in slide-in-from-top-1">
                <div className="w-1 h-1 rounded-full bg-red-500 shrink-0 mt-1"></div>
                <span className="break-words whitespace-pre-wrap flex-1">{node.errorMessage}</span>
            </div>
        )}

        {/* --- Video Gen 专用页脚 --- */}
        {node.type === 'video_gen' && renderVideoGenFooter()}

        {/* --- 其他节点的通用页脚 --- */}
        {showFooter && node.type !== 'video_gen' && (
          <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 rounded-b-2xl">
             
             {/* 模型选择器 (Script Agent 不显示模型，因为通常用默认，或者显示角色信息) */}
             {node.type !== 'script_agent' && (
                 <div className="flex-1 relative group min-w-[120px]">
                    <select 
                        className="w-full bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-lg pl-2 pr-6 py-1.5 outline-none appearance-none cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all focus:border-blue-500/50 shadow-sm"
                        value={node.data.settings?.model} 
                        onChange={(e) => updateNodeData({ settings: { ...node.data.settings, model: e.target.value }})}
                    >
                        {(() => {
                            const groups = getRelevantModels();
                            // @ts-ignore
                            if(groups.Google.length === 0 && groups.OpenAI.length === 0 && groups.Enterprise.length === 0 && groups.Industry.length === 0) return <option disabled>Model</option>;
                            return (
                                <>
                                    {/* @ts-ignore */}
                                    {groups.Google.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                    {/* @ts-ignore */}
                                    {groups.OpenAI.length > 0 && <optgroup label="OpenAI">
                                        {/* @ts-ignore */}
                                        {groups.OpenAI.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                    </optgroup>}
                                    {/* @ts-ignore */}
                                    {groups.Enterprise.map(m => <option key={m.id} value={m.id}>⭐ {m.label}</option>)}
                                    {/* @ts-ignore */}
                                    {groups.Industry.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                </>
                            );
                        })()}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDown size={10} />
                    </div>
                 </div>
             )}
             
             {/* Agent Role Display (Visual only, changed via dropdown above) */}
             {node.type === 'script_agent' && (
                 <div className="flex-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                     {getRoleIcon(node.data.settings?.role || 'director')}
                     <span>
                        {/* @ts-ignore */}
                        {t.agent?.roles?.[node.data.settings?.role || 'director'] || AGENT_ROLES.find(r => r.id === (node.data.settings?.role || 'director'))?.label}
                     </span>
                 </div>
             )}

             {node.type === 'script_agent' && (
                 <button 
                     onClick={onRun}
                     disabled={node.status === 'running'}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ml-auto bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}
                 >
                    {node.status === 'running' ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} fill="currentColor" />}
                    <span>Generate</span>
                 </button>
             )}

             {node.type !== 'script_agent' && <div className="w-px h-4 bg-gray-200 dark:bg-gray-600"></div>}

             {/* 宽高比 (Image/ImageInput only here) */}
             {['image_gen', 'image_input'].includes(node.type) && (
                 <div className="relative group w-[72px]">
                     <select 
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-lg pl-2 pr-5 py-1.5 outline-none appearance-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all focus:border-blue-500/50 shadow-sm text-center"
                        value={node.data.settings?.aspectRatio}
                        onChange={(e) => updateNodeData({ settings: { ...node.data.settings, aspectRatio: e.target.value }})}
                     >
                        {getAvailableRatios().map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                     </select>
                     <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                         <ChevronDown size={10} />
                     </div>
                 </div>
             )}

             {/* Resolution Selector for Image */}
             {node.type === 'image_gen' && node.data.settings?.model === ModelType.GEMINI_PRO_IMAGE && (
                 <div className="relative group w-[72px]">
                     <select className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-lg pl-2 pr-5 py-1.5 outline-none appearance-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all focus:border-blue-500/50 shadow-sm text-center" value={node.data.settings?.resolution || '1K'} onChange={(e) => updateNodeData({ settings: { ...node.data.settings, resolution: e.target.value as any }})}>
                         {IMAGE_RESOLUTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                     </select>
                     <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                         <ChevronDown size={10} />
                     </div>
                 </div>
             )}

             {node.type === 'audio_gen' && (
                 <>
                     <div className="relative group w-24">
                         <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <Volume2 size={12}/>
                         </div>
                         <select className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-lg pl-7 pr-5 py-1.5 outline-none appearance-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all focus:border-blue-500/50 shadow-sm" value={node.data.settings?.audioType || 'speech'} onChange={(e) => updateNodeData({ settings: { ...node.data.settings, audioType: e.target.value as any }})}>
                             {AUDIO_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                         </select>
                         <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <ChevronDown size={10} />
                         </div>
                     </div>
                     {(!node.data.settings?.audioType || node.data.settings.audioType === 'speech') && (
                         <div className="relative group w-24">
                             <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                 <Mic size={12}/>
                             </div>
                             <select className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-lg pl-7 pr-5 py-1.5 outline-none appearance-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all focus:border-blue-500/50 shadow-sm" value={node.data.settings?.voice || 'Kore'} onChange={(e) => updateNodeData({ settings: { ...node.data.settings, voice: e.target.value }})}>
                                 {AUDIO_VOICES_CONST.map(v => <option key={v.id} value={v.id}>{v.id}</option>)}
                             </select>
                             <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                 <ChevronDown size={10} />
                             </div>
                         </div>
                     )}
                 </>
             )}

             {/* 运行按钮 */}
             <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (node.type === 'image_input') {
                        handleGenerateRefImage();
                    } else {
                        if (node.status === 'done' && !showRunConfirm) {
                            setShowRunConfirm(true);
                            setTimeout(() => setShowRunConfirm(false), 3000);
                        } else {
                            setShowRunConfirm(false);
                            onRun();
                        }
                    }
                }}
                disabled={node.type === 'image_input' ? (isGeneratingRef || !refImgDesc) : node.status === 'running'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ml-auto
                    ${(node.type === 'image_input' ? isGeneratingRef : node.status === 'running')
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait' 
                        : showRunConfirm 
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : (node.type !== 'image_input' && node.status === 'done')
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : (node.type !== 'image_input' && node.status === 'error')
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                    }
                `}
             >
                {(node.type === 'image_input' ? isGeneratingRef : node.status === 'running') ? (
                    <Loader2 size={12} className="animate-spin"/> 
                ) : showRunConfirm ? (
                    <AlertCircle size={12} />
                ) : (node.type !== 'image_input' && node.status === 'done') ? (
                    <RefreshCcw size={12} /> 
                ) : (node.type !== 'image_input' && node.status === 'error') ? (
                    <Zap size={12} />
                ) : (
                    <Zap size={12} fill="currentColor" className="text-yellow-300 dark:text-yellow-500"/>
                )}
                <span>
                    {(node.type === 'image_input' ? isGeneratingRef : node.status === 'running') ? 'Running' 
                    : showRunConfirm ? (lang === 'en' ? 'Overwrite?' : '确认覆盖?')
                    : (node.type !== 'image_input' && node.status === 'done') ? t.actions.regenerate 
                    : (node.type !== 'image_input' && node.status === 'error') ? 'Retry' 
                    : t.actions.run}
                </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingToolbar;

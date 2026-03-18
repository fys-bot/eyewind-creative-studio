
import React, { useState, useEffect } from 'react';
import { Download, Copy, ImageIcon, UserCircle2, Palette, ScanLine, Monitor, FileText, Info } from 'lucide-react';
import { SimpleVideoPlayer } from '../SimpleVideoPlayer';
import { handleDownload, handleCopy, NodeViewProps } from './nodeViewUtils';
import { MODELS } from '../../../constants';

const isImageContent = (content: string) => {
    return content.startsWith('data:image') || content.startsWith('http') || content.startsWith('blob:') || content.match(/\.(jpeg|jpg|png|gif|webp)$/i);
};

export const PreviewView: React.FC<NodeViewProps> = ({ node, isExpanded, contentHeight, t }) => {
    const content = node.data.outputResult;
    const [isCopied, setIsCopied] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => setIsCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    // 获取图片尺寸信息
    const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
    useEffect(() => {
        if (content && isImageContent(content)) {
            const img = new Image();
            img.onload = () => {
                setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = content;
        } else {
            setImageDimensions(null);
        }
    }, [content]);

    return (
        <div className="w-full bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center relative group" style={{ height: contentHeight, borderRadius: '0 0 0 0' }}>
            {/* Preview 标识 */}
            {content && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-teal-500/90 text-white text-[9px] font-bold rounded shadow-sm z-20 flex items-center gap-1">
                    <Monitor size={10}/>
                    <span>PREVIEW</span>
                </div>
            )}
            
            {!content ? (
                <div className="absolute inset-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-600 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform duration-300">
                        <Monitor size={20} className="text-teal-500 opacity-80"/>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{t.placeholders.waiting_input || "等待输入"}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">连接任意生成器以预览</p>
                    </div>
                </div>
            ) : isImageContent(content) ? (
                <>
                    <img src={content} className="w-full h-full object-contain" />
                    
                    {/* 信息按钮 */}
                    {imageDimensions && (
                        <button 
                            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                setShowInfo(!showInfo);
                            }} 
                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-20"
                        >
                            <Info size={12}/>
                        </button>
                    )}
                    
                    {/* 信息面板 */}
                    {showInfo && imageDimensions && (
                        <div className="absolute top-12 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-30 text-xs" onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}>
                            <div className="font-bold text-gray-700 dark:text-gray-300 mb-2">图片信息</div>
                            <div className="space-y-1 text-gray-600 dark:text-gray-400">
                                <div>尺寸: {imageDimensions.width} × {imageDimensions.height}</div>
                                <div>比例: {(imageDimensions.width / imageDimensions.height).toFixed(2)}</div>
                            </div>
                        </div>
                    )}
                    
                    <button onClick={(e: React.MouseEvent) => handleDownload(e, content, `preview_${node.id}.png`)} className="absolute bottom-3 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-10"><Download size={14}/></button>
                </>
            ) : (content.startsWith('data:video') || content.match(/\.(mp4|webm)$/i) || content.startsWith('blob:')) ? (
                <>
                    <SimpleVideoPlayer src={content} className="w-full h-full" />
                    <button onClick={(e: React.MouseEvent) => handleDownload(e, content, `preview_${node.id}.mp4`)} className="absolute bottom-16 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-30"><Download size={14}/></button>
                </>
            ) : (
                <div className={`text-xs p-4 rounded-none border-none overflow-auto custom-scrollbar relative group/text bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium h-full transition-all`} style={{ fontSize: isExpanded ? '14px' : '12px' }}>
                    <div className="whitespace-pre-wrap pr-4 leading-relaxed">{content}</div>
                    <button onClick={(e: React.MouseEvent) => handleCopy(e, content, () => setIsCopied(true))} className="absolute bottom-3 right-3 p-1.5 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg opacity-0 group-hover/text:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-600 shadow-md border border-gray-200 dark:border-gray-600">
                        <Copy size={14}/>
                    </button>
                </div>
            )}
        </div>
    );
};

export const ImageInputView: React.FC<NodeViewProps> = ({ node, contentHeight, t, onUpdateData }) => {
    const handleDrop = async (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const fileList = event.dataTransfer.files as FileList;
        const files: File[] = fileList ? Array.from(fileList) : [];
        const imageFile = files.find((f: File) => f && typeof (f as any).type === 'string' && (f as any).type.startsWith('image/'));
        if (!imageFile) return;

        try {
            const { uploadAsset } = await import('../../../services/storageService');
            const url = await uploadAsset(imageFile);
            
            // 加载图片获取实际尺寸
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                onUpdateData(node.id, { 
                    value: url,
                    isReplacing: false, // 清除替换状态
                    settings: {
                        ...node.data.settings,
                        imageRatio: ratio
                    }
                });
            };
            img.onerror = () => {
                onUpdateData(node.id, { value: url, isReplacing: false });
            };
            img.src = url;
        } catch (e) {
            console.error('Failed to upload dropped image', e);
        }
    };

    const handlePaste = async (event: React.ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items || items.length === 0) return;

        let imageFile: File | null = null;
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it.type && it.type.startsWith('image/')) {
                const f = it.getAsFile();
                if (f) {
                    imageFile = f;
                    break;
                }
            }
        }
        if (!imageFile) return;

        try {
            const { uploadAsset } = await import('../../../services/storageService');
            const url = await uploadAsset(imageFile);
            
            // 加载图片获取实际尺寸
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                onUpdateData(node.id, { 
                    value: url,
                    isReplacing: false, // 清除替换状态
                    settings: {
                        ...node.data.settings,
                        imageRatio: ratio
                    }
                });
            };
            img.onerror = () => {
                onUpdateData(node.id, { value: url, isReplacing: false });
            };
            img.src = url;
        } catch (e) {
            console.error('Failed to upload pasted image', e);
        }
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div
            className="w-full bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center relative group"
            style={{ height: contentHeight, borderRadius: '0 0 0 0' }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onPaste={handlePaste}
            tabIndex={0}
        >
            {/* 隐藏的文件上传 input */}
            <input
                id={`ref-upload-${node.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                        const { uploadAsset } = await import('../../../services/storageService');
                        const url = await uploadAsset(file);
                        
                        // 加载图片获取实际尺寸
                        const img = new Image();
                        img.onload = () => {
                            const ratio = img.width / img.height;
                            onUpdateData(node.id, { 
                                value: url,
                                isReplacing: false, // 清除替换状态
                                settings: {
                                    ...node.data.settings,
                                    imageRatio: ratio
                                }
                            });
                        };
                        img.onerror = () => {
                            // 如果加载失败，仍然保存 URL
                            onUpdateData(node.id, { value: url, isReplacing: false });
                        };
                        img.src = url;
                    } catch (err) {
                        console.error('Failed to upload image', err);
                    }
                }}
            />
            
            {node.data.value ? (
                isImageContent(node.data.value) ? (
                    <>
                        <img src={node.data.value} className="w-full h-full object-cover" draggable={false} onMouseDown={(e) => e.preventDefault()} />
                        <div className="absolute top-2 left-2 text-white/90 text-[9px] font-bold px-2 py-0.5 bg-black/40 rounded backdrop-blur-sm">Asset</div>
                        <button onClick={(e: React.MouseEvent) => handleDownload(e, node.data.value!, `ref_image_${node.id}.png`)} className="absolute bottom-3 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-10"><Download size={14}/></button>
                    </>
                ) : (
                    <div className="absolute inset-0 p-4 text-xs text-gray-500 dark:text-gray-400 overflow-auto flex items-center justify-center text-center">
                        <span>{node.data.value}</span>
                    </div>
                )
            ) : (
                <label htmlFor={`ref-upload-${node.id}`} className="cursor-pointer flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center border border-gray-100 dark:border-gray-600 hover:border-amber-300 dark:hover:border-amber-600 transition-colors">
                        <ImageIcon size={20}/>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-50">{t.actions.upload}</span>
                </label>
            )}
        </div>
    );
};

export const CharacterRefView: React.FC<NodeViewProps> = ({ node, isExpanded, contentHeight, t }) => {
    const { gender, age, style, clothing } = node.data.settings || {};
    
    return (
        <div style={{ height: `${contentHeight}px`, position: 'relative' }}>
            <div className="w-full flex gap-3" style={{ height: '100%' }}>
               <div className="w-24 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 dark:border-gray-700 relative group shrink-0">
                  {node.data.value ? (
                      isImageContent(node.data.value) ? (
                          <>
                            <img src={node.data.value} className="w-full h-full object-cover" draggable={false} onMouseDown={(e) => e.preventDefault()} />
                            <button onClick={(e: React.MouseEvent) => handleDownload(e, node.data.value!, `char_${node.id}.png`)} className="absolute bottom-1 right-1 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"><Download size={10}/></button>
                          </>
                      ) : (
                          <div className="w-full h-full p-1 text-[8px] overflow-auto text-gray-500 flex items-center justify-center text-center leading-tight">
                              {node.data.value}
                          </div>
                      )
                   ) : <UserCircle2 className="text-gray-300 dark:text-gray-600" size={24}/>}
               </div>
               <div className="flex flex-col justify-center gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wide">{t.character.id_label}</span>
                  <span className={`font-bold text-gray-900 dark:text-white truncate ${isExpanded ? 'text-lg' : 'text-sm'}`}>{node.data.label || t.placeholders.unnamed}</span>
                  
                  {/* New Tags Section */}
                  {(gender || age || style || clothing) && (
                      <div className="flex flex-wrap gap-1">
                          {gender && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800 capitalize">{gender}</span>}
                          {age && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 capitalize">{age}</span>}
                          {clothing && clothing !== 'default' && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 border border-pink-100 dark:border-pink-800 capitalize">{clothing}</span>}
                      </div>
                  )}

                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-2 py-0.5 rounded-full w-fit font-medium">{t.character.active_ref}</span>
               </div>
            </div>
        </div>
    );
};

export const ImageGenView: React.FC<NodeViewProps> = ({ node, contentHeight, zoom, settings, onUpdateData }) => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [refineInput, setRefineInput] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    
    // 润色提示词的处理函数
    const handleRefinePrompt = async () => {
        if (!refineInput.trim() || isRefining) return;
        
        setIsRefining(true);
        try {
            const { generateTextViaGateway } = await import('../../../services/aiGatewayService');
            const currentPrompt = node.data.settings?.value || node.data.value || '';
            
            const refinedPrompt = await generateTextViaGateway({
                model: 'gpt-4o-mini',
                systemPrompt: '你是一个专业的图像生成提示词优化助手。根据用户的要求，优化和改进提示词，使其更适合图像生成。直接返回优化后的提示词，不要添加任何解释或额外内容。',
                prompt: `当前提示词：\n${currentPrompt}\n\n润色要求：\n${refineInput.trim()}`,
                temperature: 0.7
            });
            
            // 更新节点的提示词
            if (onUpdateData) {
                onUpdateData(node.id, {
                    settings: {
                        ...node.data.settings,
                        value: refinedPrompt
                    }
                });
            }
            
            setRefineInput('');
            setShowPrompt(false);
        } catch (error) {
            console.error('Failed to refine prompt:', error);
            alert('润色失败，请重试');
        } finally {
            setIsRefining(false);
        }
    };
    
    // Determine Model Label
    const modelId = node.data.settings?.model;
    const modelObj = MODELS.find(m => m.id === modelId);
    let modelLabel = 'Image Model';
    if (modelObj) {
        modelLabel = modelObj.label;
    } else if (modelId) {
        // 从 model id 提取可读名称，如 "openai/gpt-image-1" → "Gpt Image 1"
        const parts = modelId.split('/').pop() || modelId;
        modelLabel = parts
            .replace(/-preview$/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase())
            .trim();
    }

    const size = node.data.settings?.size;
    const resolution = node.data.settings?.resolution;
    const aspectRatio = node.data.settings?.aspectRatio;
    const prompt = node.data.settings?.value || node.data.value || '';
    
    // Loading 时显示的尺寸信息：
    // - 有 aspectRatio → 显示比例（+ resolution 如果有）
    // - 有 size → 直接显示 size（如 1024×1792），不转换比例
    // - 都没有 → 不显示
    const sizeDisplay = aspectRatio 
        ? `${aspectRatio}${resolution ? ' · ' + resolution : ''}` 
        : size 
            ? size.replace('x', '×')
            : '';

    // --- Adaptive Scale Logic ---
    const minScale = settings?.adaptiveZoomMin ?? 0.4;
    const maxScale = settings?.adaptiveZoomMax ?? 2.5;
    const adaptiveScale = Math.min(Math.max(1 / zoom, minScale), maxScale);

    return (
        <div className="w-full bg-transparent flex flex-col relative group" style={{ height: contentHeight, borderRadius: '0 0 0 0' }}>
            {/* Image Container */}
            <div className="relative w-full flex-1 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                {node.status === 'running' && node.data.outputResult && isImageContent(node.data.outputResult) ? (
                    <>
                        <img src={node.data.outputResult} className="w-full h-full object-contain opacity-40" draggable={false} onMouseDown={(e) => e.preventDefault()} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-[2px]">
                            <div className="w-10 h-10 rounded-full border-4 border-purple-100 dark:border-purple-900 border-t-purple-500 animate-spin"></div>
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-3">
                                生成中 {sizeDisplay}
                            </div>
                        </div>
                    </>
                ) : node.status === 'running' ? (
                    <div className="flex flex-col items-center gap-3 text-purple-500">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full border-4 border-purple-100 dark:border-purple-900 border-t-purple-500 animate-spin"></div>
                        </div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            生成中 {sizeDisplay}
                        </div>
                    </div>
                ) : node.data.outputResult ? (
                    isImageContent(node.data.outputResult) ? (
                        <>
                            <img src={node.data.outputResult} className="w-full h-full object-contain" draggable={false} onMouseDown={(e) => e.preventDefault()} /> 
                            
                            {/* 提示词按钮 */}
                            {prompt && (
                                <button 
                                    onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setShowPrompt(!showPrompt);
                                    }}
                                    className="absolute top-2 left-2 px-2.5 py-1.5 bg-black/70 hover:bg-black/90 text-white text-[11px] font-medium rounded-lg transition-all hover:scale-105 z-20 flex items-center gap-1.5 shadow-lg opacity-100 group-hover:opacity-100"
                                    style={{ pointerEvents: 'auto' }}
                                >
                                    <FileText size={11}/>
                                    <span>提示词</span>
                                </button>
                            )}
                            
                            {/* 提示词弹窗 - 润色对话框 */}
                            {showPrompt && prompt && (
                                <div 
                                    className="absolute top-14 left-2 right-2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-purple-200 dark:border-purple-800 z-30 flex flex-col"
                                    style={{ maxHeight: '70%' }}
                                    onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                    {/* 标题栏 */}
                                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                                        <div className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                                <FileText size={14} className="text-purple-600 dark:text-purple-400"/>
                                            </div>
                                            <span>提示词润色</span>
                                        </div>
                                        <button 
                                            onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                setShowPrompt(false);
                                                setRefineInput('');
                                            }}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none w-6 h-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    
                                    {/* 当前提示词 */}
                                    <div className="p-4 overflow-auto custom-scrollbar flex-1">
                                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">当前提示词</div>
                                        <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800 mb-4">
                                            {prompt}
                                        </div>
                                        
                                        {/* 润色输入区 */}
                                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">润色指令</div>
                                        <div className="relative">
                                            <textarea
                                                value={refineInput}
                                                onChange={(e) => setRefineInput(e.target.value)}
                                                placeholder="输入润色要求，例如：让画面更有电影感、增加细节描述、改成日系风格..."
                                                className="w-full h-20 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-xs text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                        e.preventDefault();
                                                        if (refineInput.trim() && !isRefining) {
                                                            handleRefinePrompt();
                                                        }
                                                    }
                                                }}
                                            />
                                            <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 flex items-center justify-between">
                                                <span>按 Cmd/Ctrl + Enter 发送</span>
                                                <button
                                                    onClick={handleRefinePrompt}
                                                    disabled={!refineInput.trim() || isRefining}
                                                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-[10px] font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                                                >
                                                    {isRefining ? '润色中...' : '润色'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <button onClick={(e: React.MouseEvent) => handleDownload(e, node.data.outputResult!, `gen_image_${node.id}.png`)} className="absolute bottom-2 right-2 p-1.5 bg-white shadow-sm border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-20 scale-90"><Download size={14}/></button>
                        </>
                    ) : (
                        <div className="absolute inset-0 p-4 text-xs text-gray-500 dark:text-gray-400 overflow-auto flex items-center justify-center text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                             <div className="max-w-[80%] whitespace-pre-wrap">{node.data.outputResult}</div>
                        </div>
                    )
                ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                        <Palette size={24} className="text-gray-300 dark:text-gray-600"/>
                    </div>
                )}
            </div>

            {/* Parameters Footer */}
            <div 
                className="shrink-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center px-3 justify-between select-none"
                style={{ height: `${40 * adaptiveScale}px` }}
            >
                 <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5" title={modelId || ''}>
                        <span 
                            className="rounded-full bg-purple-500"
                            style={{ width: `${6 * adaptiveScale}px`, height: `${6 * adaptiveScale}px` }}
                        ></span>
                        <span 
                            className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]"
                            style={{ fontSize: `${10 * adaptiveScale}px` }}
                        >
                            {modelLabel}
                        </span>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 opacity-60">
                    {sizeDisplay && (
                    <span 
                        className="font-mono text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1 rounded bg-gray-50 dark:bg-gray-800"
                        style={{ fontSize: `${9 * adaptiveScale}px` }}
                    >
                        {sizeDisplay}
                    </span>
                    )}
                 </div>
            </div>
        </div>
    );
};

export const ImageUpscaleView: React.FC<NodeViewProps> = ({ node, contentHeight }) => {
    return (
        <div className="w-full bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center relative group" style={{ height: contentHeight, borderRadius: '0 0 0 0' }}>
            {node.data.outputResult ? (
                isImageContent(node.data.outputResult) ? (
                    <>
                        <img src={node.data.outputResult} className="w-full h-full object-contain" draggable={false} onMouseDown={(e) => e.preventDefault()} />
                        
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded shadow-sm z-20">4K</div>
                        <button onClick={(e: React.MouseEvent) => handleDownload(e, node.data.outputResult!, `upscaled_${node.id}.png`)} className="absolute bottom-3 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-20"><Download size={14}/></button>
                    </>
                ) : (
                    <div className="absolute inset-0 p-4 text-xs text-gray-500 dark:text-gray-400 overflow-auto flex items-center justify-center text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                         <div className="max-w-[80%] whitespace-pre-wrap">{node.data.outputResult}</div>
                    </div>
                )
            ) : node.status === 'running' ? (
                 <div className="flex flex-col items-center gap-3 text-orange-500">
                     <div className="relative">
                         <div className="w-10 h-10 rounded-full border-4 border-orange-100 dark:border-orange-900 border-t-orange-500 animate-spin"></div>
                     </div>
                 </div>
            ) : (
                <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600">
                    <div className="w-16 h-16 rounded-full bg-gray-100/50 dark:bg-gray-700/50 flex items-center justify-center">
                        <ScanLine size={24} className="text-gray-300 dark:text-gray-600"/>
                    </div>
                </div>
            )}
        </div>
    );
};

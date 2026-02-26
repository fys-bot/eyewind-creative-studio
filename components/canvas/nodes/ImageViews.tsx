
import React, { useState, useEffect } from 'react';
import { Download, Copy, ImageIcon, UserCircle2, Palette, ScanLine, Eye, Monitor } from 'lucide-react';
import { SimpleVideoPlayer } from '../SimpleVideoPlayer';
import { handleDownload, handleCopy, NodeViewProps } from './nodeViewUtils';
import { MODELS } from '../../../constants';

const isImageContent = (content: string) => {
    return content.startsWith('data:image') || content.startsWith('http') || content.startsWith('blob:') || content.match(/\.(jpeg|jpg|png|gif|webp)$/i);
};

export const PreviewView: React.FC<NodeViewProps> = ({ node, isExpanded, contentHeight, t }) => {
    const content = node.data.outputResult;
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => setIsCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    return (
        <div className="w-full bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center relative group" style={{ height: contentHeight, borderRadius: '0 0 0 0' }}>
            {!content ? (
                <div className="absolute inset-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-600 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform duration-300">
                        <Monitor size={20} className="text-teal-500 opacity-80"/>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{t.placeholders.waiting_input || "Waiting for signal"}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">Connect any generator to preview</p>
                    </div>
                </div>
            ) : isImageContent(content) ? (
                <>
                    <img src={content} className="w-full h-full object-contain" />
                    <button onClick={(e) => handleDownload(e, content, `preview_${node.id}.png`)} className="absolute bottom-3 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-10"><Download size={14}/></button>
                </>
            ) : (content.startsWith('data:video') || content.match(/\.(mp4|webm)$/i) || content.startsWith('blob:')) ? (
                <>
                    <SimpleVideoPlayer src={content} className="w-full h-full" />
                    <button onClick={(e) => handleDownload(e, content, `preview_${node.id}.mp4`)} className="absolute bottom-16 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-30"><Download size={14}/></button>
                </>
            ) : (
                <div className={`text-xs p-4 rounded-none border-none overflow-auto custom-scrollbar relative group/text bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium h-full transition-all`} style={{ fontSize: isExpanded ? '14px' : '12px' }}>
                    <div className="whitespace-pre-wrap pr-4 leading-relaxed">{content}</div>
                    <button onClick={(e) => handleCopy(e, content, () => setIsCopied(true))} className="absolute bottom-3 right-3 p-1.5 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg opacity-0 group-hover/text:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-600 shadow-md border border-gray-200 dark:border-gray-600">
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
            onUpdateData(node.id, { value: url });
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
            onUpdateData(node.id, { value: url });
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
            {node.data.value ? (
                isImageContent(node.data.value) ? (
                    <>
                        <img src={node.data.value} className="w-full h-full object-cover" draggable={false} onMouseDown={(e) => e.preventDefault()} />
                        <div className="absolute top-2 left-2 text-white/90 text-[9px] font-bold px-2 py-0.5 bg-black/40 rounded backdrop-blur-sm">Asset</div>
                        <button onClick={(e) => handleDownload(e, node.data.value!, `ref_image_${node.id}.png`)} className="absolute bottom-3 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-10"><Download size={14}/></button>
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
                            <button onClick={(e) => handleDownload(e, node.data.value!, `char_${node.id}.png`)} className="absolute bottom-1 right-1 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"><Download size={10}/></button>
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

export const ImageGenView: React.FC<NodeViewProps> = ({ node, contentHeight, zoom, settings }) => {
    // Determine Model Label
    const modelId = node.data.settings?.model;
    const modelObj = MODELS.find(m => m.id === modelId);
    let modelLabel = 'Gemini Flash';
    if (modelObj) {
        modelLabel = modelObj.label.replace('Gemini ', '').replace('Google ', '').replace('Preview', '').trim();
    } else if (modelId) {
        modelLabel = modelId.split('-').slice(0, 2).join(' ');
    }

    const resolution = node.data.settings?.resolution;
    const ratio = node.data.settings?.aspectRatio || '16:9';

    // --- Adaptive Scale Logic ---
    const minScale = settings?.adaptiveZoomMin ?? 0.4;
    const maxScale = settings?.adaptiveZoomMax ?? 2.5;
    const adaptiveScale = Math.min(Math.max(1 / zoom, minScale), maxScale);

    return (
        <div className="w-full bg-transparent flex flex-col relative group" style={{ height: contentHeight, borderRadius: '0 0 0 0' }}>
            {/* Image Container */}
            <div className="relative w-full flex-1 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                {node.data.outputResult ? (
                    isImageContent(node.data.outputResult) ? (
                        <>
                            <img src={node.data.outputResult} className="w-full h-full object-cover" draggable={false} onMouseDown={(e) => e.preventDefault()} /> 
                            <button onClick={(e) => handleDownload(e, node.data.outputResult!, `gen_image_${node.id}.png`)} className="absolute bottom-2 right-2 p-1.5 bg-white shadow-sm border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-20 scale-90"><Download size={14}/></button>
                        </>
                    ) : (
                        <div className="absolute inset-0 p-4 text-xs text-gray-500 dark:text-gray-400 overflow-auto flex items-center justify-center text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                             <div className="max-w-[80%] whitespace-pre-wrap">{node.data.outputResult}</div>
                        </div>
                    )
                ) : node.status === 'running' ? (
                    <div className="flex flex-col items-center gap-3 text-purple-500">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full border-4 border-purple-100 dark:border-purple-900 border-t-purple-500 animate-spin"></div>
                        </div>
                    </div>
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
                    <div className="flex items-center gap-1.5" title={modelObj?.name}>
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
                    <span 
                        className="font-mono text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1 rounded bg-gray-50 dark:bg-gray-800"
                        style={{ fontSize: `${9 * adaptiveScale}px` }}
                    >
                        {ratio}
                    </span>
                    {resolution && (
                        <span 
                            className="font-mono text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1 rounded bg-gray-50 dark:bg-gray-800"
                            style={{ fontSize: `${9 * adaptiveScale}px` }}
                        >
                            {resolution}
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
                        <button onClick={(e) => handleDownload(e, node.data.outputResult!, `upscaled_${node.id}.png`)} className="absolute bottom-3 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-20"><Download size={14}/></button>
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

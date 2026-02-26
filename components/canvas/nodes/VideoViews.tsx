
import React, { useState } from 'react';
import { Play, Layers, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { SimpleVideoPlayer } from '../SimpleVideoPlayer';
import { handleDownload, NodeViewProps } from './nodeViewUtils';
import { MODELS } from '../../../constants';

export const VideoGenView: React.FC<NodeViewProps> = ({ node, contentHeight }) => {
    // Determine Model Label
    const modelId = node.data.settings?.model;
    const modelObj = MODELS.find(m => m.id === modelId);
    let modelLabel = 'Veo Fast'; 
    if (modelObj) {
        modelLabel = modelObj.label.replace('Google ', '').replace('Preview', '').trim();
    } else if (modelId) {
        modelLabel = modelId.split('-')[0] === 'veo' ? 'Veo' : 'Video Model';
    }

    const resolution = node.data.settings?.resolution || '720p';
    const ratio = node.data.settings?.aspectRatio || '16:9';
    const duration = node.data.settings?.duration ? `${node.data.settings.duration}s` : '4s';

    return (
        <div className="w-full bg-transparent flex flex-col relative group" style={{ height: contentHeight, borderRadius: '0 0 0 0' }}>
            <div className="relative w-full flex-1 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                 {node.data.outputResult ? (
                    <SimpleVideoPlayer src={node.data.outputResult} className="w-full h-full" />
                 ) : node.status === 'running' ? (
                     <div className="flex flex-col items-center gap-3 text-emerald-500">
                         <div className="relative">
                             <div className="w-12 h-12 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin"></div>
                         </div>
                         <span className="text-xs font-bold text-gray-400 dark:text-gray-500">Generating...</span>
                     </div>
                 ) : (
                     <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                        <Play size={32} className="text-gray-300 dark:text-gray-600 fill-gray-300 dark:fill-gray-600 ml-1" />
                     </div>
                 )}
                 
                 {node.data.outputResult && (
                     <button onClick={(e) => handleDownload(e, node.data.outputResult!, `video_${node.id}.mp4`)} className="absolute bottom-3 right-3 p-1.5 bg-white shadow-sm border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-20 scale-90"><Download size={14}/></button>
                 )}
            </div>

            {/* Parameters Footer */}
            <div className="h-10 shrink-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center px-3 justify-between select-none">
                 <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5" title={modelObj?.name}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{modelLabel}</span>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 opacity-60">
                    <span className="text-[9px] font-mono text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1 rounded-md bg-gray-50 dark:bg-gray-800">{ratio}</span>
                    <span className="text-[9px] font-mono text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1 rounded-md bg-gray-50 dark:bg-gray-800">{duration}</span>
                    <span className="text-[9px] font-mono text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1 rounded-md bg-gray-50 dark:bg-gray-800">{resolution}</span>
                 </div>
            </div>
        </div>
    );
};

export const VideoComposerView: React.FC<NodeViewProps> = ({ node, contentHeight, t }) => {
    const [composerIndex, setComposerIndex] = useState(0);
    
    const outputList = node.data.outputList || [];
    const totalClips = outputList.length;

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (totalClips === 0) return;
        setComposerIndex(prev => (prev + 1) % totalClips);
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (totalClips === 0) return;
        setComposerIndex(prev => (prev - 1 + totalClips) % totalClips);
    };

    return (
        <div className="w-full bg-black overflow-hidden flex items-center justify-center relative border border-gray-800" style={{ height: contentHeight, borderRadius: '0 0 0 0' }}>
            {totalClips > 0 ? (
                <div className="w-full h-full relative group">
                    <SimpleVideoPlayer 
                        src={outputList[composerIndex] || ""} 
                        audioSrc={node.data.audioTrack} 
                        className="w-full h-full" 
                        autoPlay 
                        onEnded={handleNext}
                    />
                    
                    {/* Preloader for next clip to reduce switching gap */}
                    <video 
                        src={outputList[(composerIndex + 1) % totalClips]} 
                        className="hidden" 
                        preload="auto" 
                        muted 
                    />

                    {/* Navigation Controls Overlay */}
                    <div className="absolute inset-y-0 left-0 flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        <button 
                            onClick={handlePrev} 
                            className="p-1.5 bg-black/40 text-white/80 rounded-full hover:bg-black/70 hover:text-white pointer-events-auto backdrop-blur-sm transition-all hover:scale-110"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </div>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        <button 
                            onClick={handleNext} 
                            className="p-1.5 bg-black/40 text-white/80 rounded-full hover:bg-black/70 hover:text-white pointer-events-auto backdrop-blur-sm transition-all hover:scale-110"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    
                    {/* Clean Counter */}
                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white/90 pointer-events-none z-20 font-medium shadow-sm border border-white/10 flex items-center gap-1.5">
                        <Layers size={10} className="opacity-70" />
                        <span>Clip {composerIndex + 1} / {totalClips}</span>
                    </div>
                    
                    {/* Download */}
                    <button onClick={(e) => handleDownload(e, outputList[composerIndex], `clip_${composerIndex + 1}.mp4`)} className="absolute top-3 right-3 p-1.5 bg-black/50 backdrop-blur-md border border-white/10 text-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-30"><Download size={14}/></button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2"><Layers size={24} className="text-gray-600 dark:text-gray-400"/><span className="text-[10px] text-gray-500 dark:text-gray-400 px-2 text-center">{t.placeholders.composer}</span></div>
            )}
        </div>
    );
};

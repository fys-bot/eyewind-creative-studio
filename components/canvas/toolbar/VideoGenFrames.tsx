import React, { useRef } from 'react';
import { Sparkles, Plus, Link2, ArrowRightLeft } from 'lucide-react';
import { WorkflowNode, WorkflowEdge } from '../../../types';
import { translations, Language } from '../../../utils/translations';
import { uploadAsset } from '../../../services/storageService';

interface Props {
  node: WorkflowNode;
  edges: WorkflowEdge[];
  nodes: WorkflowNode[];
  lang: Language;
  updateNodeData: (data: any) => void;
  onAddConnectedNode?: (srcId: string, type: 'source' | 'target', nodeType: string, sourceHandle?: string, targetHandle?: string) => void;
  onDeleteEdge?: (id: string) => void;
  onConnect?: (sourceId: string, targetId: string, sourceHandle?: string, targetHandle?: string) => void;
}

const VideoGenFrames: React.FC<Props> = ({ node, edges, nodes, lang, updateNodeData, onAddConnectedNode, onDeleteEdge, onConnect }) => {
  const t = translations[lang];
  const startImgInputRef = useRef<HTMLInputElement>(null);
  const endImgInputRef = useRef<HTMLInputElement>(null);

  const getUpstreamNode = (handleId: string) => {
    const edge = edges.find(e => e.target === node.id && (e.targetHandle === handleId || (!e.targetHandle && handleId === 'prompt')));
    if (!edge) return null;
    return nodes.find(n => n.id === edge.source) || null;
  };

  const getUpstreamImageUrl = (handleId: string) => {
    const imgNode = getUpstreamNode(handleId);
    if (!imgNode) return null;
    if (imgNode.type === 'image_input' || imgNode.type === 'character_ref') {
      return typeof imgNode.data.value === 'string' ? imgNode.data.value : null;
    }
    if (imgNode.type === 'image_gen' || imgNode.type === 'image_upscale' || imgNode.type === 'image_matting' || imgNode.type === 'preview') {
      return typeof imgNode.data.outputResult === 'string' ? imgNode.data.outputResult : null;
    }
    if (imgNode.data.outputResult && typeof imgNode.data.outputResult === 'string') {
      return imgNode.data.outputResult;
    }
    return null;
  };

  const handleImageInputUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'startImageBase64' | 'endImageBase64') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadAsset(file);
      updateNodeData({ settings: { ...node.data.settings, [field]: url } });
    } catch {}
  };

  const handleSwapFrames = () => {
    const startImg = node.data.settings?.startImageBase64;
    const endImg = node.data.settings?.endImageBase64;
    updateNodeData({ settings: { ...node.data.settings, startImageBase64: endImg, endImageBase64: startImg } });
    const startEdge = edges.find(e => e.target === node.id && e.targetHandle === 'start_image');
    const endEdge = edges.find(e => e.target === node.id && e.targetHandle === 'end_image');
    if (startEdge) onDeleteEdge?.(startEdge.id);
    if (endEdge) onDeleteEdge?.(endEdge.id);
    if (startEdge) onConnect?.(startEdge.source, node.id, startEdge.sourceHandle, 'end_image');
    if (endEdge) onConnect?.(endEdge.source, node.id, endEdge.sourceHandle, 'start_image');
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`start-upload-${node.id}`}
        className={`flex-1 h-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-1 flex items-center gap-3 transition-all hover:bg-white dark:hover:bg-gray-700 hover:border-blue-200 dark:hover:border-blue-800 group/item relative overflow-hidden ${getUpstreamNode('start_image') ? 'cursor-default' : 'cursor-pointer'}`}
        title={t.video_settings?.start_frame || 'Start Frame'}
        onClick={(e) => { if(getUpstreamNode('start_image')) e.preventDefault(); }}
      >
        <div className="w-10 h-full bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-600/50 overflow-hidden flex items-center justify-center relative shrink-0">
          {(node.data.settings?.startImageBase64 || getUpstreamImageUrl('start_image')) ? (
            <>
              <img src={node.data.settings?.startImageBase64 || getUpstreamImageUrl('start_image')!} className="w-full h-full object-cover" />
              {!node.data.settings?.startImageBase64 && getUpstreamImageUrl('start_image') && (
                <div className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-black/60 text-white text-[8px] font-bold">LINK</div>
              )}
            </>
          ) : (
            <Plus size={16} className="text-gray-300 dark:text-gray-600" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.video_settings?.start_frame || 'Start Frame'}</span>
          {getUpstreamNode('start_image') ? (
            <span className="text-[10px] text-blue-500 truncate flex items-center gap-1"><Link2 size={10}/> {getUpstreamNode('start_image')?.data.label}</span>
          ) : (
            <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate">Upload or Drop</span>
          )}
        </div>
        {!getUpstreamNode('start_image') && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddConnectedNode?.(node.id, 'target', 'image_gen', undefined, 'start_image'); }}
            className="absolute top-1 right-1 w-5 h-5 bg-white dark:bg-gray-800 text-blue-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity hover:scale-110"
            title="Add Visual Generator"
          >
            <Sparkles size={10} />
          </button>
        )}
        <input id={`start-upload-${node.id}`} type="file" ref={startImgInputRef} className="sr-only" accept="image/*,.svg,.ico,image/svg+xml,image/x-icon" onChange={(e) => handleImageInputUpload(e, 'startImageBase64')} disabled={!!getUpstreamNode('start_image')} />
      </label>

      <button onClick={handleSwapFrames} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors" title="Swap Start/End Frames">
        <ArrowRightLeft size={14} />
      </button>

      <label htmlFor={`end-upload-${node.id}`}
        className={`flex-1 h-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-1 flex items-center gap-3 transition-all hover:bg-white dark:hover:bg-gray-700 hover:border-blue-200 dark:hover:border-blue-800 group/item relative overflow-hidden ${getUpstreamNode('end_image') ? 'cursor-default' : 'cursor-pointer'}`}
        title={t.video_settings?.end_frame || 'End Frame'}
        onClick={(e) => { if(getUpstreamNode('end_image')) e.preventDefault(); }}
      >
        <div className="w-10 h-full bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-600/50 overflow-hidden flex items-center justify-center relative shrink-0">
          {(node.data.settings?.endImageBase64 || getUpstreamImageUrl('end_image')) ? (
            <>
              <img src={node.data.settings?.endImageBase64 || getUpstreamImageUrl('end_image')!} className="w-full h-full object-cover" />
              {!node.data.settings?.endImageBase64 && getUpstreamImageUrl('end_image') && (
                <div className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-black/60 text-white text-[8px] font-bold">LINK</div>
              )}
            </>
          ) : (
            <Plus size={16} className="text-gray-300 dark:text-gray-600" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.video_settings?.end_frame || 'End Frame'}</span>
          {getUpstreamNode('end_image') ? (
            <span className="text-[10px] text-blue-500 truncate flex items-center gap-1"><Link2 size={10}/> {getUpstreamNode('end_image')?.data.label}</span>
          ) : (
            <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate">Upload or Drop</span>
          )}
        </div>
        {!getUpstreamNode('end_image') && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddConnectedNode?.(node.id, 'target', 'image_gen', undefined, 'end_image'); }}
            className="absolute top-1 right-1 w-5 h-5 bg-white dark:bg-gray-800 text-blue-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity hover:scale-110"
            title="Add Visual Generator"
          >
            <Sparkles size={10} />
          </button>
        )}
        <input id={`end-upload-${node.id}`} type="file" ref={endImgInputRef} className="sr-only" accept="image/*,.svg,.ico,image/svg+xml,image/x-icon" onChange={(e) => handleImageInputUpload(e, 'endImageBase64')} disabled={!!getUpstreamNode('end_image')} />
      </label>
    </div>
  );
};

export default VideoGenFrames;


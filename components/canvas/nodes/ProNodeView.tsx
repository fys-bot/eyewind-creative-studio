
import React, { useState, useEffect } from 'react';
import { Play, Loader2, Copy, CheckCircle, Wand2, Zap, Palette, Layers, Grid, X, Maximize2, Minimize2, FileText, Image as ImageIcon } from 'lucide-react';
import { NodeViewProps, handleCopy } from './nodeViewUtils';
import { IconGeneratorConfig, ArtDirectorConfig } from '../../NODEPRO/examples';
import { ProNodeConfig } from '../../NODEPRO/types';

// Map node type to config
const CONFIG_MAP: Record<string, ProNodeConfig> = {
    'pro_icon_gen': IconGeneratorConfig,
    'pro_art_director': ArtDirectorConfig
};

// --- Custom Widgets ---

const Stepper: React.FC<{ steps: string[], current: number }> = ({ steps, current }) => (
    <div className="flex items-center justify-between px-2 mb-4">
        {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 relative z-10">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-colors ${
                    idx + 1 <= current 
                        ? 'bg-purple-600 border-purple-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-400'
                }`}>
                    {idx + 1}
                </div>
                <span className={`text-[8px] font-medium ${idx + 1 <= current ? 'text-purple-600' : 'text-gray-400'}`}>
                    {step}
                </span>
            </div>
        ))}
        {/* Progress Line */}
        <div className="absolute top-2.5 left-6 right-6 h-0.5 bg-gray-100 -z-0">
             <div className="h-full bg-purple-100 transition-all duration-500" style={{ width: `${((current-1)/(steps.length-1))*100}%` }} />
        </div>
    </div>
);

const ColorPicker: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
    const colors = ['#FFFFFF', '#000000', '#0000FF', '#00FF00', 'gradient'];
    return (
        <div className="flex items-center gap-2">
            {colors.map(c => (
                <button
                    key={c}
                    onClick={() => onChange(c)}
                    className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-purple-500 ring-offset-1 scale-110' : 'border-gray-200'} ${c === 'gradient' ? 'bg-gradient-to-tr from-purple-500 to-blue-500' : ''}`}
                    style={c !== 'gradient' ? { backgroundColor: c } : {}}
                    title={c}
                />
            ))}
        </div>
    );
};

export const ProNodeView: React.FC<NodeViewProps & { 
    onStartDrag?: (id: string) => void;
    onDelete?: (id: string) => void;
    onSelect?: (id: string, event?: React.MouseEvent) => void;
    onToggleExpand?: (id: string) => void;
    shellProvided?: boolean;
}> = ({ node, isExpanded, contentHeight, onUpdateData, onRun, onStartDrag, onDelete, onSelect, onToggleExpand, shellProvided }) => {
    const config = CONFIG_MAP[node.type];
    
    // Auto-save settings on change
    const updateSetting = (key: string, value: any) => {
        onUpdateData(node.id, {
            settings: {
                ...node.data.settings,
                [key]: value
            }
        });
    };

    if (!config) return <div className="p-4 text-red-500">Config Not Found</div>;

    // ShellProvided: render body-only, outer NodeProShell handles header/footer
    if (shellProvided && node.type === 'pro_icon_gen') {
        return (
            <div className="space-y-5">
                <div className="flex gap-3">
                     <button className="flex-1 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-gray-700 hover:border-gray-300 transition-colors">
                         <div className="w-4 h-4 border-2 border-gray-400 rounded-sm"></div>
                         1:1 (方形)
                     </button>
                     <button className="flex-1 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors border-dashed">
                         <span className="border border-gray-300 rounded px-1 py-0.5 text-[9px]">HD</span>
                         1K (标准)
                     </button>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-500">生成数量 / 布局</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">Count 3x3 Grid</span>
                            <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">{node.data.settings?.count || 9}</span>
                        </div>
                    </div>
                    <input 
                        type="range" 
                        min={1} max={9} 
                        value={node.data.settings?.count || 9}
                        onChange={(e) => onUpdateData(node.id, { settings: { ...node.data.settings, count: parseInt(e.target.value) } })}
                        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-gray-400"/>
                            <span className="text-xs font-bold text-gray-700">等级进化 (Evolution)</span>
                        </div>
                        <button 
                            onClick={() => onUpdateData(node.id, { settings: { ...node.data.settings, evolution: !node.data.settings?.evolution } })}
                            className={`w-10 h-5 rounded-full transition-colors relative ${node.data.settings?.evolution ? 'bg-purple-500' : 'bg-gray-200'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${node.data.settings?.evolution ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wand2 size={14} className="text-gray-400"/>
                            <span className="text-xs font-bold text-gray-700">视觉特效 (VFX)</span>
                        </div>
                        <button 
                            onClick={() => onUpdateData(node.id, { settings: { ...node.data.settings, vfx: !node.data.settings?.vfx } })}
                            className={`w-10 h-5 rounded-full transition-colors relative ${node.data.settings?.vfx ? 'bg-purple-500' : 'bg-gray-200'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${node.data.settings?.vfx ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-gray-500">背景颜色</span>
                     <ColorPicker value={node.data.settings?.bg_color || '#FFFFFF'} onChange={(c) => onUpdateData(node.id, { settings: { ...node.data.settings, bg_color: c }})} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-sm font-black text-gray-900 leading-tight">
                        描述想要生成的<br/>场景与图标...
                    </h3>
                    <textarea
                        className="w-full h-24 bg-gray-50 rounded-xl p-4 text-xs font-medium text-gray-700 placeholder:text-gray-400 outline-none resize-none focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all border border-transparent focus:border-purple-200"
                        placeholder="例如：魔法药水、科幻头盔、8-bit 宝剑..."
                        value={node.data.settings?.prompt || ''}
                        onChange={(e) => onUpdateData(node.id, { settings: { ...node.data.settings, prompt: e.target.value } })}
                    />
                </div>
                <div className="space-y-3">
                    <div className="text-xs font-bold text-gray-400">美术风格</div>
                    <div className="flex bg-gray-50 p-1 rounded-lg mb-3 border border-gray-100">
                         <button className="flex-1 py-1.5 bg-white shadow-sm rounded-md text-[10px] font-bold text-gray-800">预设风格</button>
                         <button className="flex-1 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600">自定义风格</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { id: 'creative', label: '脑洞大开', icon: '👻' },
                            { id: '3d_render', label: '3D 渲染', icon: '🧊' },
                            { id: 'ios', label: 'iOS 质感', icon: '📱' },
                            { id: 'material', label: 'Material', icon: '📚' },
                            { id: 'glass', label: '毛玻璃', icon: '💎' },
                            { id: 'rpg_item', label: 'RPG 装备', icon: '⚡' },
                            { id: 'pixel_art', label: '复古像素', icon: '👾' },
                            { id: 'casual', label: '欧美卡通', icon: '🎮', active: true },
                        ].map(style => (
                            <button 
                                key={style.id}
                                onClick={() => onUpdateData(node.id, { settings: { ...node.data.settings, style: style.id } })}
                                className={`flex flex-col items-center justify-center aspect-square rounded-xl border-2 transition-all gap-1
                                    ${node.data.settings?.style === style.id || (!node.data.settings?.style && style.active)
                                        ? 'border-black bg-black text-white shadow-lg scale-105' 
                                        : 'border-transparent bg-white text-gray-500 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <span className="text-lg">{style.icon}</span>
                                <span className="text-[9px] font-bold scale-90">{style.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    // --- Specialized Render for NOCRA Icons (Hardcoded for high fidelity as requested) ---
    if (node.type === 'pro_icon_gen') {
        return (
            <div className="flex flex-col w-full bg-white rounded-2xl overflow-hidden relative shadow-sm border border-gray-100">
                
                {/* 1. Header Area (Node Layer Interaction) */}
                <div 
                    className="px-5 pt-5 pb-2 bg-white relative cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={(e) => {
                        // Drag & Select Logic
                        if (onStartDrag) onStartDrag(node.id);
                        if (onSelect) onSelect(node.id, e);
                    }}
                >
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center">
                                 <Zap size={14} fill="#FCD34D" className="text-yellow-400" />
                             </div>
                             <span className="text-sm font-black text-gray-900">{config.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Collapse / Expand */}
                            <button 
                                className="text-gray-300 hover:text-purple-500 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleExpand) onToggleExpand(node.id);
                                }}
                            >
                                {isExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                            </button>
                            
                            {/* Delete */}
                            <button 
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDelete) onDelete(node.id);
                                }}
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Scrollable Content (Pro Layer) */}
                <div className="flex-1 px-5 pb-20 space-y-5 pt-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
                    
                    {/* Ratio & Res Row */}
                    <div className="flex gap-3">
                         <button className="flex-1 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-gray-700 hover:border-gray-300 transition-colors">
                             <div className="w-4 h-4 border-2 border-gray-400 rounded-sm"></div>
                             1:1 (方形)
                         </button>
                         <button className="flex-1 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors border-dashed">
                             <span className="border border-gray-300 rounded px-1 py-0.5 text-[9px]">HD</span>
                             1K (标准)
                         </button>
                    </div>

                    {/* Count Slider */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-500">生成数量 / 布局</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">Count 3x3 Grid</span>
                                <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">{node.data.settings?.count || 9}</span>
                            </div>
                        </div>
                        <input 
                            type="range" 
                            min={1} max={9} 
                            value={node.data.settings?.count || 9}
                            onChange={(e) => updateSetting('count', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap size={14} className="text-gray-400"/>
                                <span className="text-xs font-bold text-gray-700">等级进化 (Evolution)</span>
                            </div>
                            <button 
                                onClick={() => updateSetting('evolution', !node.data.settings?.evolution)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${node.data.settings?.evolution ? 'bg-purple-500' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${node.data.settings?.evolution ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wand2 size={14} className="text-gray-400"/>
                                <span className="text-xs font-bold text-gray-700">视觉特效 (VFX)</span>
                            </div>
                            <button 
                                onClick={() => updateSetting('vfx', !node.data.settings?.vfx)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${node.data.settings?.vfx ? 'bg-purple-500' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${node.data.settings?.vfx ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Background Color */}
                    <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-gray-500">背景颜色</span>
                         <ColorPicker value={node.data.settings?.bg_color || '#FFFFFF'} onChange={(c) => updateSetting('bg_color', c)} />
                    </div>

                    {/* Prompt 1 (Replaced with Upstream Connection Placeholder) */}
                    <div className="space-y-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                                <FileText size={12} className="text-gray-500"/>
                            </div>
                            <span className="text-xs font-bold text-gray-700">提示词 1 (Input)</span>
                        </div>
                        {/* Visual Placeholder for Connection */}
                        <div className="w-full h-12 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center gap-2 text-xs text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            <span>Waiting for Text Input...</span>
                        </div>
                    </div>

                    {/* Reference Image 1 (Replaced with Upstream Connection Placeholder) */}
                    <div className="space-y-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                                    <ImageIcon size={12} className="text-gray-500"/>
                                </div>
                                <span className="text-xs font-bold text-gray-700">参考图 1 (Input)</span>
                            </div>
                        </div>
                        
                        {/* Visual Placeholder for Connection */}
                        <div className="w-full aspect-video bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                <ImageIcon size={14} className="text-amber-500"/>
                            </div>
                            <span>Waiting for Image Input...</span>
                        </div>
                    </div>

                    {/* Style Grid */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-gray-400">美术风格</div>
                        <div className="flex bg-gray-100/50 p-1 rounded-xl mb-3">
                             <button className="flex-1 py-1.5 bg-white shadow-sm rounded-lg text-[10px] font-bold text-gray-800">预设风格</button>
                             <button className="flex-1 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600">自定义风格</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { id: 'creative', label: '脑洞大开', icon: '👻' },
                                { id: '3d_render', label: '3D 渲染', icon: '🧊' },
                                { id: 'ios', label: 'iOS 质感', icon: '📱' },
                                { id: 'material', label: 'Material', icon: '📚' },
                                { id: 'glass', label: '毛玻璃', icon: '💎' },
                                { id: 'rpg_item', label: 'RPG 装备', icon: '⚡' },
                                { id: 'pixel_art', label: '复古像素', icon: '👾' },
                                { id: 'casual', label: '欧美卡通', icon: '🎮', active: true },
                            ].map(style => (
                                <button 
                                    key={style.id}
                                    onClick={() => updateSetting('style', style.id)}
                                    className={`flex flex-col items-center justify-center aspect-square rounded-2xl border-2 transition-all gap-1
                                        ${node.data.settings?.style === style.id || (!node.data.settings?.style && style.active)
                                            ? 'border-black bg-black text-white shadow-lg scale-105' 
                                            : 'border-transparent bg-white text-gray-500 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <span className="text-lg">{style.icon}</span>
                                    <span className="text-[9px] font-bold scale-90">{style.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Floating Generate Button (Removed - Moved to ProNodeItem Footer) */}
                {/* <div className="absolute bottom-4 left-4 right-4 z-20">...</div> */}
            </div>
        );
    }

    // --- Default Render for other Pro Nodes (Art Director, etc.) ---
    // ... (Keep the previous generic renderer here if needed, or just return basic form)
    return <div className="p-4">Generic Pro Node UI (Implement me if needed)</div>;
};

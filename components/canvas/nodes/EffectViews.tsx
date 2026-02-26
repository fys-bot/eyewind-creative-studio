import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Scissors, Sliders, Maximize, ChevronDown, Check } from 'lucide-react';
import { SimpleVideoPlayer } from '../SimpleVideoPlayer';
import { handleDownload, NodeViewProps } from './nodeViewUtils';

// --- Reusable Components ---

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                // Check if click is inside the portal content (which is not a child of triggerRef)
                // We'll rely on the portal overlay or a separate ref for the dropdown menu if needed.
                // Simplest strategy: transparent fixed overlay behind the menu to catch clicks.
                // Or just use a global click listener that checks if target is within the dropdown ID.
            }
        };
        
        const handleScroll = () => setIsOpen(false);
        
        if (isOpen) {
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleScroll);
        }
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const toggleOpen = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                left: rect.left, // Align left
                width: Math.max(rect.width, 120) // Min width
            });
            // Adjust if goes off screen (simple check)
            if (rect.left + 120 > window.innerWidth) {
                 // Align right logic if needed, but for now align left is safe for top-right placement usually
                 // Actually for top-right button, we might want to align right
            }
        }
        setIsOpen(!isOpen);
    };

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <>
            <button
                ref={triggerRef}
                onClick={toggleOpen}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${
                    isOpen 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-500/50 dark:text-indigo-300' 
                    : 'bg-white/90 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 dark:bg-black/60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-black/80'
                } ${className}`}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <span>{selectedLabel}</span>
                <ChevronDown size={10} className={`opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[9999]" onClick={() => setIsOpen(false)}>
                    <div 
                        className="absolute bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            top: position.top,
                            left: position.left - (120 - (triggerRef.current?.offsetWidth || 0)), // Simple right-alignish adjustment or just use rect.right - width
                            minWidth: '120px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                                    value === option.value 
                                    ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-900/20' 
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}
                            >
                                <span>{option.label}</span>
                                {value === option.value && <Check size={10} />}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};


export const ImageMattingView: React.FC<NodeViewProps> = ({ node, contentHeight }) => {
    return (
        <div className="w-full bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center relative group" style={{ height: contentHeight, borderRadius: '0 0 0 0' }}>
            {/* Checkerboard Background for transparency visualization */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
                backgroundImage: `linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}></div>
            
            {node.data.outputResult ? (
                <>
                    <img src={node.data.outputResult} className="w-full h-full object-contain relative z-10" draggable={false} onMouseDown={(e) => e.preventDefault()} />
                    {/* Moved to bottom-right */}
                    <button onClick={(e) => handleDownload(e, node.data.outputResult!, `cutout_${node.id}.png`)} className="absolute bottom-3 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-20"><Download size={14}/></button>
                    {/* Moved slightly up from bottom */}
                    <div className="absolute bottom-3 left-3 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-20">PNG</div>
                </>
            ) : node.status === 'running' ? (
                 <div className="flex flex-col items-center gap-3 text-rose-500 relative z-10">
                     <div className="relative">
                         <div className="w-10 h-10 rounded-full border-4 border-rose-100 dark:border-rose-900 border-t-rose-500 animate-spin"></div>
                     </div>
                     <span className="text-xs font-bold">Cutting...</span>
                 </div>
            ) : (
                <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-gray-100/50 dark:bg-gray-700/50 flex items-center justify-center">
                        <Scissors size={24} className="text-gray-300 dark:text-gray-600"/>
                    </div>
                </div>
            )}
             {/* Tech Note Overlay */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                <span className="text-[9px] bg-gray-100/90 dark:bg-gray-700/90 text-gray-500 px-1 rounded border border-gray-200 dark:border-gray-600">Lib: rembg</span>
            </div>
        </div>
    );
};



// --- New Advanced Views ---



export const ColorGradeView: React.FC<NodeViewProps> = ({ node, contentHeight, onUpdateData }) => {
    // For MVP, we simulate grading by applying CSS filter to the preview if input exists
    // But since node output is just the URL, we can't easily "preview" the graded result inside the node 
    // without implementing the filter logic here too.
    
    // Let's visualize the "LUT" selection.
    const lut = node.data.settings?.lut || 'neutral';

    return (
        <div className="w-full bg-neutral-900 overflow-hidden flex flex-col relative" style={{ height: contentHeight }}>
             <div className="absolute top-2 right-2 z-20">
                <CustomSelect 
                    value={lut}
                    onChange={(val) => onUpdateData(node.id, { settings: { ...node.data.settings, lut: val } })}
                    options={[
                        { value: 'neutral', label: '原色 (Neutral)' },
                        { value: 'teal_orange', label: '青橙色调 (Teal & Orange)' },
                        { value: 'bw_noir', label: '黑白电影 (Noir)' },
                        { value: 'vintage', label: '复古胶片 (Vintage)' },
                        { value: 'cyberpunk', label: '赛博朋克 (Cyberpunk)' }
                    ]}
                    className="bg-black/50 border-white/20 text-white hover:bg-black/70 hover:border-white/30"
                />
            </div>

            {/* Preview Area */}
            <div className="flex-1 flex items-center justify-center relative">
                 {/* Visual representation of the LUT */}
                 <div className={`w-full h-full opacity-50 bg-gradient-to-br ${
                     lut === 'teal_orange' ? 'from-teal-500 to-orange-500 mix-blend-overlay' :
                     lut === 'bw_noir' ? 'from-gray-900 to-gray-200 grayscale' :
                     lut === 'cyberpunk' ? 'from-pink-500 to-cyan-500 mix-blend-color-dodge' :
                     lut === 'vintage' ? 'from-yellow-900 to-yellow-200 sepia' :
                     'from-gray-700 to-gray-600'
                 }`}></div>
                 
                 <Sliders size={24} className="text-white/50 absolute z-10" />
            </div>
        </div>
    );
};



export const ImageUpscaleView: React.FC<NodeViewProps> = ({ node, contentHeight }) => {
    return (
        <div className="w-full bg-slate-100 dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-center relative group" style={{ height: contentHeight }}>
             {node.data.outputResult ? (
                 <>
                    <img src={node.data.outputResult} className="w-full h-full object-contain" />
                    <button onClick={(e) => handleDownload(e, node.data.outputResult!, `upscaled_${node.id}.png`)} className="absolute bottom-3 right-3 p-1.5 bg-white shadow-md border border-gray-200 text-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-20"><Download size={14}/></button>
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">4K</div>
                 </>
             ) : (
                 <div className="flex flex-col items-center gap-2 text-slate-400">
                     <Maximize size={24} />
                     <span className="text-[10px]">Waiting for Input</span>
                 </div>
             )}
        </div>
    );
};



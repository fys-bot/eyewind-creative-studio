import React, { useRef, useState, useEffect, useCallback } from 'react';
import { applyFilter, cropImage, magicWand, isOpenCVReady, computeSelectionMask } from '../services/opencvService';
import { 
    X, Check, Crop, Wand2, Move, Eraser, 
    Image as ImageIcon, Sliders, Layers, 
    Undo, Redo, ZoomIn, ZoomOut, Download,
    RotateCcw, Hand, ScanLine, Scissors, 
    Contrast, Sun, Droplets, Palette, MousePointer2, Sparkles
} from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface ImageEditorProps {
    base64Image: string;
    onSave: (processedImage: string) => void;
    onCancel: () => void;
    lang: Language;
    embedded?: boolean;
}

type Tool = 'hand' | 'crop' | 'magic-wand' | 'filter' | 'adjust' | 'eraser';

interface Adjustments {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
}

const DEFAULT_ADJUSTMENTS: Adjustments = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0
};

interface WandSettings {
    tolerance: number;
    contiguous: boolean; // OpenCV floodFill is contiguous by default
}

const ImageEditor: React.FC<ImageEditorProps> = ({ base64Image, onSave, onCancel, lang, embedded = false }) => {
    const t = translations[lang];
    
    // Canvas & Image Refs
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectionCanvasRef = useRef<HTMLCanvasElement>(null);

    // State
    const [currentImage, setCurrentImage] = useState<string>(base64Image);
    const [history, setHistory] = useState<string[]>([base64Image]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [activeTool, setActiveTool] = useState<Tool>('magic-wand');
    const [cvReady, setCvReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // View Transform
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

    // Adjustments
    const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);

    // Wand Settings
    const [wandSettings, setWandSettings] = useState<WandSettings>({ tolerance: 30, contiguous: true });
    const [selectionMask, setSelectionMask] = useState<{data: Uint8Array, width: number, height: number} | null>(null);

    // Crop State
    const [cropRect, setCropRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);

    // Initialize OpenCV Check
    useEffect(() => {
        const check = setInterval(() => {
            if (isOpenCVReady()) {
                setCvReady(true);
                clearInterval(check);
            }
        }, 500);
        return () => clearInterval(check);
    }, []);

    const getCssFilter = useCallback(() => {
        const { brightness, contrast, saturation, hue, blur } = adjustments;
        return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg) blur(${blur}px)`;
    }, [adjustments]);

    const drawSelectionOverlay = useCallback(() => {
        const canvas = selectionCanvasRef.current;
        if (!canvas || !selectionMask) {
            // Clear if no selection
            const ctx = canvas?.getContext('2d');
            ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const imgData = ctx.createImageData(selectionMask.width, selectionMask.height);
        const data = imgData.data;
        
        // Draw marching ants effect or semi-transparent overlay
        // Let's do a pink overlay for selected area
        for (let i = 0; i < selectionMask.data.length; i++) {
            if (selectionMask.data[i] > 0) {
                const idx = i * 4;
                data[idx] = 255;     // R
                data[idx + 1] = 0;   // G
                data[idx + 2] = 255; // B
                data[idx + 3] = 100; // Alpha (semi-transparent)
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }, [selectionMask]);

    // Draw Image to Canvas
    const drawCanvas = useCallback(() => {
        if (!currentImage || currentImage === '') return; // Guard against empty image

        const img = new Image();
        img.src = currentImage;
        img.onload = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                // Resize canvas to match image
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.filter = getCssFilter();
                    ctx.drawImage(img, 0, 0);
                    ctx.filter = 'none'; // Reset
                }
                
                // Reset Selection Canvas
                const selCanvas = selectionCanvasRef.current;
                if (selCanvas) {
                    selCanvas.width = img.naturalWidth;
                    selCanvas.height = img.naturalHeight;
                    // Keep selection overlay if mask exists
                    if (selectionMask) {
                         drawSelectionOverlay();
                    }
                }
            }
        };
        img.onerror = () => {
            console.error("Failed to load image in editor");
            // Optional: Draw placeholder or error state
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#f3f4f6';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.font = '14px sans-serif';
                    ctx.fillStyle = '#9ca3af';
                    ctx.textAlign = 'center';
                    ctx.fillText('Image not found', canvas.width/2, canvas.height/2);
                }
            }
        };
    }, [currentImage, getCssFilter, selectionMask, drawSelectionOverlay]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    // Redraw selection when mask changes
    useEffect(() => {
        drawSelectionOverlay();
    }, [drawSelectionOverlay]);

    // View Controls
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault(); // Always prevent default scroll
        if (e.ctrlKey || e.metaKey) {
            // Zoom
            const delta = -e.deltaY;
            const factor = delta > 0 ? 1.1 : 0.9;
            setTransform(prev => ({
                ...prev,
                scale: Math.min(20, Math.max(0.1, prev.scale * factor))
            }));
        } else {
            // Pan (Trackpad or Mouse Wheel)
            setTransform(prev => ({
                ...prev,
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    const handleZoomIn = () => setTransform(p => ({ ...p, scale: Math.min(20, p.scale * 1.2) }));
    const handleZoomOut = () => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale / 1.2) }));
    const handleResetView = () => setTransform({ x: 0, y: 0, scale: 1 });

    // History
    const pushHistory = (newImage: string) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newImage);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setCurrentImage(newImage);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setCurrentImage(history[historyIndex - 1]);
            setSelectionMask(null);
            setAdjustments(DEFAULT_ADJUSTMENTS);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setCurrentImage(history[historyIndex + 1]);
            setSelectionMask(null);
            setAdjustments(DEFAULT_ADJUSTMENTS);
        }
    };
    
    // Actions need access to pushHistory, so define them after pushHistory
    const handleCutSelection = () => {
        if (!selectionMask || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Create new image data with alpha channel modified
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const mask = selectionMask.data;

        for (let i = 0; i < mask.length; i++) {
            if (mask[i] > 0) { // If selected
                data[i * 4 + 3] = 0; // Set alpha to 0
            }
        }

        ctx.putImageData(imgData, 0, 0);
        
        // Save state
        const newUrl = canvas.toDataURL('image/png');
        pushHistory(newUrl);
        setSelectionMask(null); // Clear selection
    };

    const handleApplyCrop = () => {
         if (!cropRect || !canvasRef.current) return;
         setIsProcessing(true);
         setTimeout(() => {
             const result = cropImage('editor-source-img', 'editor-canvas', cropRect);
             if (result) {
                 pushHistory(result);
                 setCropRect(null);
                 setActiveTool('magic-wand'); // Reset tool
             }
             setIsProcessing(false);
         }, 50);
    };

    const handleApplyAdjustments = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // We need to bake the CSS filter into the pixels
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        
        // Draw current image to temp
        const img = new Image();
        img.src = currentImage;
        img.onload = () => {
            tempCtx.filter = getCssFilter();
            tempCtx.drawImage(img, 0, 0);
            
            const newUrl = tempCanvas.toDataURL('image/png');
            pushHistory(newUrl);
            setAdjustments(DEFAULT_ADJUSTMENTS);
        };
    };
    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool === 'hand') {
            setIsDragging(true);
            setLastPos({ x: e.clientX, y: e.clientY });
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Correct Coordinate Mapping logic
        const rect = canvas.getBoundingClientRect();
        
        // Relative position within the visual rect (0 to rect.width)
        const visualX = e.clientX - rect.left;
        const visualY = e.clientY - rect.top;
        
        // Map to actual canvas resolution
        // The ratio is (Actual Width / Visual Width)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const x = Math.floor(visualX * scaleX);
        const y = Math.floor(visualY * scaleY);

        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

        if (activeTool === 'magic-wand') {
            if (!cvReady) return;
            setIsProcessing(true);
            // Use setTimeout to allow UI to show processing state
            setTimeout(() => {
                // Ensure hidden source img is updated? 
                // computeSelectionMask uses 'editor-source-img' ID.
                const result = computeSelectionMask('editor-source-img', {x, y}, wandSettings.tolerance);
                if (result) {
                    setSelectionMask({data: result.mask, width: result.width, height: result.height});
                }
                setIsProcessing(false);
            }, 10);
        } else if (activeTool === 'crop') {
             setCropStart({x, y});
             // Initialize crop rect with 0 size
             setCropRect({x, y, w: 0, h: 0});
             setIsDraggingCrop(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (activeTool === 'hand' && isDragging) {
             const dx = e.clientX - lastPos.x;
             const dy = e.clientY - lastPos.y;
             setTransform(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
             setLastPos({ x: e.clientX, y: e.clientY });
        } else if (activeTool === 'crop' && isDraggingCrop && cropStart && canvasRef.current) {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            
            // Same mapping logic
            const visualX = e.clientX - rect.left;
            const visualY = e.clientY - rect.top;
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const currentX = Math.floor(visualX * scaleX);
            const currentY = Math.floor(visualY * scaleY);
            
            // Ensure bounds
            const boundedX = Math.max(0, Math.min(canvas.width, currentX));
            const boundedY = Math.max(0, Math.min(canvas.height, currentY));
            
            // Calculate new rect
            const newX = Math.min(cropStart.x, boundedX);
            const newY = Math.min(cropStart.y, boundedY);
            const newW = Math.abs(boundedX - cropStart.x);
            const newH = Math.abs(boundedY - cropStart.y);
            
            setCropRect({ x: newX, y: newY, w: newW, h: newH });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsDraggingCrop(false);
    };

    // Inpainting Tool
    const handleInpaint = () => {
        if (!selectionMask || !canvasRef.current) return;
        
        // This would typically call an AI inpainting service
        // For now, we'll simulate a simple "content-aware fill" using blur/telea (OpenCV)
        // or just placeholder logic as we don't have a real diffusion model backend connected here yet.
        
        if (!isOpenCVReady()) return;
        setIsProcessing(true);
        
        setTimeout(() => {
            try {
                const cv = window.cv;
                const src = cv.imread('editor-source-img');
                const mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
                
                // Reconstruct mask Mat from selectionMask data
                // selectionMask.data is Uint8Array
                mask.data.set(selectionMask.data);
                
                const dst = new cv.Mat();
                // Inpaint using Telea algorithm (radius 3)
                cv.inpaint(src, mask, dst, 3, cv.INPAINT_TELEA);
                
                cv.imshow('editor-canvas', dst);
                
                const canvas = canvasRef.current;
                if (canvas) {
                    const newUrl = canvas.toDataURL('image/png');
                    pushHistory(newUrl);
                }
                
                src.delete(); mask.delete(); dst.delete();
                setSelectionMask(null);
            } catch (err) {
                console.error("Inpaint failed:", err);
            } finally {
                setIsProcessing(false);
            }
        }, 100);
    };

    return (
        <div className={`bg-white dark:bg-gray-900 flex flex-col overflow-hidden text-gray-700 dark:text-gray-300 font-sans select-none ${embedded ? 'w-full h-full' : 'fixed inset-0 z-[100]'}`}>
            
            {/* Top Bar */}
            <div className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <ImageIcon className="text-black dark:text-white w-5 h-5"/>
                    <span className="text-sm font-bold text-gray-900 dark:text-white hidden sm:inline">Pro Editor</span>
                </div>
                
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                    <IconButton icon={<Undo size={16}/>} onClick={undo} disabled={historyIndex <= 0} title="Undo"/>
                    <IconButton icon={<Redo size={16}/>} onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo"/>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"/>
                    <IconButton icon={<ZoomOut size={16}/>} onClick={handleZoomOut} title="Zoom Out"/>
                    <span className="text-xs w-12 text-center font-medium text-gray-600 dark:text-gray-400">{Math.round(transform.scale * 100)}%</span>
                    <IconButton icon={<ZoomIn size={16}/>} onClick={handleZoomIn} title="Zoom In"/>
                    <IconButton icon={<ScanLine size={16}/>} onClick={handleResetView} title="Fit View"/>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={onCancel} className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs font-medium transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        Cancel
                    </button>
                    <button 
                        onClick={() => onSave(currentImage)}
                        className="px-3 py-1.5 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Check size={14}/> Save
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Toolbar */}
                <div className="w-12 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center py-4 gap-2 z-10">
                    <ToolButton active={activeTool === 'magic-wand'} onClick={() => setActiveTool('magic-wand')} icon={<Wand2 size={20}/>} title="Magic Wand (W)"/>
                    <ToolButton active={activeTool === 'crop'} onClick={() => setActiveTool('crop')} icon={<Crop size={20}/>} title="Crop (C)"/>
                    <ToolButton active={activeTool === 'hand'} onClick={() => setActiveTool('hand')} icon={<Hand size={20}/>} title="Pan (H)"/>
                    <div className="w-8 h-px bg-gray-200 dark:bg-gray-800 my-1"/>
                    <ToolButton active={activeTool === 'adjust'} onClick={() => setActiveTool('adjust')} icon={<Sliders size={20}/>} title="Adjustments"/>
                    <ToolButton active={activeTool === 'filter'} onClick={() => setActiveTool('filter')} icon={<Palette size={20}/>} title="Filters"/>
                </div>

                {/* Center Canvas Area */}
                <div 
                    className="flex-1 bg-gray-50 dark:bg-[#121212] relative overflow-hidden cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none" 
                        style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    />

                    {/* Canvas Container with Transform */}
                    <div 
                        className="absolute origin-center transition-transform duration-75 ease-out"
                        style={{ 
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                            left: '50%',
                            top: '50%',
                            // We need to center the div itself first
                            marginLeft: canvasRef.current ? -canvasRef.current.width / 2 : 0,
                            marginTop: canvasRef.current ? -canvasRef.current.height / 2 : 0,
                        }}
                    >
                        <img id="editor-source-img" ref={imgRef} src={currentImage} className="hidden" alt="source" />
                        
                        <div className="relative shadow-2xl">
                             <canvas 
                                id="editor-canvas" 
                                ref={canvasRef}
                                className="block bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC41ZYmyAAAAQm5JREFUOE9j/P///38GPEBSUhKF8YyMjIwwzQx0A66wA2oYgG4A6QZc4QPU9AOMYUAvD9D1A10/0M0D3TzQzQPdPMAQAABj2B1h90wTfAAAAABJRU5ErkJggg==')]"
                             />
                             {/* Selection Overlay Canvas */}
                             <canvas 
                                ref={selectionCanvasRef}
                                className="absolute inset-0 pointer-events-none mix-blend-normal"
                             />
                             
                             {/* Crop Overlay */}
                             {activeTool === 'crop' && cropRect && (
                                <div 
                                    className="absolute border border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
                                    style={{
                                        left: cropRect.x,
                                        top: cropRect.y,
                                        width: cropRect.w,
                                        height: cropRect.h
                                    }}
                                >
                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto flex gap-2">
                                        <button onClick={handleApplyCrop} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow hover:scale-105">
                                            Apply
                                        </button>
                                        <button onClick={() => setCropRect(null)} className="bg-gray-700 text-white px-3 py-1 rounded text-xs font-bold shadow hover:scale-105">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                             )}
                        </div>
                    </div>

                    {/* Floating Selection Toolbar */}
                    {selectionMask && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded-lg shadow-xl flex gap-2 animate-in slide-in-from-bottom-5">
                            <span className="text-xs text-gray-500 dark:text-gray-400 self-center px-2 font-medium">Selection Active</span>
                            <button onClick={handleInpaint} className="flex items-center gap-1 bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                                <Sparkles size={14}/> Inpaint
                            </button>
                            <button onClick={handleCutSelection} className="flex items-center gap-1 bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                                <Scissors size={14}/> Cut / Remove
                            </button>
                            <button onClick={() => setSelectionMask(null)} className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors">
                                <X size={14}/> Deselect
                            </button>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center backdrop-blur-[1px] cursor-wait">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                        </div>
                    )}
                </div>

                {/* Right Settings Panel */}
                <div className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Properties</h3>
                        <div className="text-sm font-bold text-gray-900 dark:text-white capitalize">{activeTool.replace('-', ' ')} Tool</div>
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto">
                        {activeTool === 'magic-wand' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
                                        <span>Tolerance</span>
                                        <span className="text-gray-500">{wandSettings.tolerance}</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={wandSettings.tolerance}
                                        onChange={e => setWandSettings({...wandSettings, tolerance: Number(e.target.value)})}
                                        className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                                    />
                                </div>
                                <div className="p-3 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-100 dark:border-gray-700 rounded-lg text-xs leading-relaxed">
                                    Click on the image to select areas of similar color. Then use "Cut" to remove background.
                                </div>
                            </div>
                        )}

                        {activeTool === 'adjust' && (
                            <div className="space-y-4">
                                <AdjustmentSlider label="Brightness" value={adjustments.brightness} min={0} max={200} onChange={v => setAdjustments(p => ({...p, brightness: v}))} icon={<Sun size={14}/>} />
                                <AdjustmentSlider label="Contrast" value={adjustments.contrast} min={0} max={200} onChange={v => setAdjustments(p => ({...p, contrast: v}))} icon={<Contrast size={14}/>} />
                                <AdjustmentSlider label="Saturation" value={adjustments.saturation} min={0} max={200} onChange={v => setAdjustments(p => ({...p, saturation: v}))} icon={<Droplets size={14}/>} />
                                <AdjustmentSlider label="Blur" value={adjustments.blur} min={0} max={20} onChange={v => setAdjustments(p => ({...p, blur: v}))} icon={<MousePointer2 size={14}/>} />
                                
                                <button onClick={handleApplyAdjustments} className="w-full mt-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black py-2 rounded-lg text-xs font-bold transition-colors shadow-sm">
                                    Apply Adjustments
                                </button>
                            </div>
                        )}

                        {activeTool === 'filter' && (
                            <div className="grid grid-cols-2 gap-2">
                                {['grayscale', 'canny', 'blur'].map(f => (
                                    <button 
                                        key={f}
                                        onClick={() => {
                                            setIsProcessing(true);
                                            setTimeout(() => {
                                                const res = applyFilter('editor-source-img', 'editor-canvas', f as any);
                                                if (res) pushHistory(res);
                                                setIsProcessing(false);
                                            }, 50);
                                        }}
                                        className="p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 capitalize text-center transition-colors border border-gray-200 dark:border-gray-700"
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ToolButton = ({ icon, title, active, onClick }: any) => (
    <button 
        onClick={onClick}
        title={title}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            active 
            ? 'bg-black text-white dark:bg-white dark:text-black' 
            : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
    >
        {icon}
    </button>
);

const IconButton = ({ icon, onClick, disabled, title }: any) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        title={title}
        className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
        {icon}
    </button>
);

const AdjustmentSlider = ({ label, value, min, max, onChange, icon }: any) => (
    <div className="space-y-1.5">
        <div className="flex justify-between text-xs items-center text-gray-500 dark:text-gray-400 font-medium">
            <div className="flex items-center gap-1.5">
                {icon}
                <span>{label}</span>
            </div>
            <span>{value}</span>
        </div>
        <input 
            type="range" min={min} max={max} 
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
        />
    </div>
);

export default ImageEditor;
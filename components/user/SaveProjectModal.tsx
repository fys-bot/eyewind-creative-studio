import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Language, translations } from '../../utils/translations';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, thumbnail: string, description?: string, position?: string) => void;
  mode: 'project' | 'template';
  initialName: string;
  initialThumbnail: string;
  initialThumbnailPosition?: string;
  availableImages: string[]; // URLs from project nodes
  lang: Language;
}

const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  initialName,
  initialThumbnail,
  initialThumbnailPosition,
  availableImages,
  lang
}) => {
  const [name, setName] = useState(initialName);
  const [selectedCover, setSelectedCover] = useState(initialThumbnail);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [description, setDescription] = useState('');
  
  const [coverPosition, setCoverPosition] = useState<string>('50% 50%');
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const positionRef = useRef<{ x: number, y: number }>({ x: 50, y: 50 });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setSelectedCover(initialThumbnail || (availableImages.length > 0 ? availableImages[availableImages.length - 1] : ''));
      
      // Restore position if available
      if (initialThumbnailPosition) {
          setCoverPosition(initialThumbnailPosition);
          // Parse "x% y%" back to numbers for ref
          const parts = initialThumbnailPosition.split(' ');
          if (parts.length === 2) {
              const x = parseFloat(parts[0]);
              const y = parseFloat(parts[1]);
              if (!isNaN(x) && !isNaN(y)) {
                  positionRef.current = { x, y };
              }
          }
      } else {
          setCoverPosition('50% 50%');
          positionRef.current = { x: 50, y: 50 };
      }
    }
  }, [isOpen, initialName, initialThumbnail, initialThumbnailPosition, availableImages]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Sensitivity factor (slower is better for fine tuning)
    const sensitivity = 0.2; 
    
    let newX = positionRef.current.x - (deltaX * sensitivity);
    let newY = positionRef.current.y - (deltaY * sensitivity);

    // Clamp between 0 and 100
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));

    // Update refs and state
    positionRef.current = { x: newX, y: newY };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    
    setCoverPosition(`${newX}% ${newY}%`);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!isOpen) return null;

  const t = translations[lang];
  const title = mode === 'template' 
    ? (lang === 'zh' || lang === 'tw' ? '保存为模板' : 'Save as Template')
    : (lang === 'zh' || lang === 'tw' ? '保存项目' : 'Save Project');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setSelectedCover(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          
          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {lang === 'zh' || lang === 'tw' ? '名称' : 'Name'}
            </label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white text-sm"
              placeholder={lang === 'zh' || lang === 'tw' ? '请输入名称...' : 'Enter name...'}
              autoFocus
            />
          </div>

          {/* Template Description Input (Only in template mode) */}
          {mode === 'template' && (
            <div className="space-y-1.5">
               <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {lang === 'zh' || lang === 'tw' ? '说明' : 'Description'}
                  </label>
                  <span className={`text-[10px] font-bold ${description.length > 50 ? 'text-red-500' : 'text-gray-400'}`}>
                     {description.length}/50
                  </span>
               </div>
               <textarea 
                  value={description}
                  onChange={(e) => {
                     if (e.target.value.length <= 50) {
                        setDescription(e.target.value);
                     }
                  }}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white resize-none text-xs h-16"
                  placeholder={lang === 'zh' || lang === 'tw' ? '简短描述此模板的功能...' : 'Briefly describe what this template does...'}
               />
            </div>
          )}

          {/* Cover Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {lang === 'zh' || lang === 'tw' ? '封面' : 'Cover'}
              </label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Upload size={10} />
                {lang === 'zh' || lang === 'tw' ? '上传' : 'Upload'}
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </div>

            {/* Preview & Grid */}
            <div className="flex flex-col gap-3">
              {/* Main Preview */}
              <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative group">
                {selectedCover ? (
                  <div 
                     className="w-full h-full relative overflow-hidden group/image cursor-move touch-none"
                     onPointerDown={handlePointerDown}
                     onPointerMove={handlePointerMove}
                     onPointerUp={handlePointerUp}
                     onPointerLeave={handlePointerUp}
                  >
                     <img 
                        src={selectedCover} 
                        className="w-full h-full object-cover transition-none pointer-events-none select-none" 
                        style={{ objectPosition: coverPosition }}
                        draggable={false}
                     />
                     
                     {/* Drag Hint Overlay */}
                     <div className={`absolute inset-0 bg-black/10 flex items-center justify-center transition-opacity pointer-events-none ${isDragging ? 'opacity-0' : 'opacity-0 group-hover/image:opacity-100'}`}>
                        <span className="text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded-full backdrop-blur-md shadow-sm border border-white/10 flex items-center gap-1.5">
                           <ImageIcon size={10} />
                           {lang === 'zh' || lang === 'tw' ? '拖动调整' : 'Drag to adjust'}
                        </span>
                     </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
                    <ImageIcon size={24} />
                    <span className="text-[10px]">{lang === 'zh' || lang === 'tw' ? '无封面' : 'No Cover'}</span>
                  </div>
                )}
              </div>

              {/* Selection Grid (Horizontal Scroll) */}
              {availableImages.length > 0 && (
                <div className="relative">
                   <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                      {availableImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCover(img)}
                          className={`snap-start shrink-0 w-16 h-10 rounded-lg overflow-hidden border-2 transition-all ${selectedCover === img ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                          <img src={img} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            {lang === 'zh' || lang === 'tw' ? '取消' : 'Cancel'}
          </button>
          <button 
            onClick={() => onSave(name, selectedCover, description, coverPosition)}
            className="px-5 py-2 text-xs font-bold text-white bg-black dark:bg-white dark:text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10 dark:shadow-white/10"
          >
            {lang === 'zh' || lang === 'tw' ? '保存' : 'Save'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SaveProjectModal;
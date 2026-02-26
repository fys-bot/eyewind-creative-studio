
import React, { useRef, useState, useEffect } from 'react';
import { applyFilter, isOpenCVReady } from '../../services/opencvService';
import { X, Check } from 'lucide-react';
import { translations, Language } from '../../utils/translations';

interface ImageProcessorProps {
  base64Image: string;
  onSave: (processedImage: string) => void;
  onCancel: () => void;
  lang: Language;
}

const ImageProcessor: React.FC<ImageProcessorProps> = ({ base64Image, onSave, onCancel, lang }) => {
  const t = translations[lang];
  const imgRef = useRef<HTMLImageElement>(null);
  const [processedUrl, setProcessedUrl] = useState<string>(base64Image);
  const [cvReady, setCvReady] = useState(false);

  useEffect(() => {
    // 检查 OpenCV 是否可用
    const check = setInterval(() => {
      if (isOpenCVReady()) {
        setCvReady(true);
        clearInterval(check);
      }
    }, 500);
    return () => clearInterval(check);
  }, []);

  const handleProcess = (type: 'grayscale' | 'blur' | 'canny') => {
    if (!imgRef.current) return;
    const result = applyFilter('process-source-img', 'process-canvas', type);
    if (result) setProcessedUrl(result);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">{t.processingTitle}</h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 p-8 bg-gray-50 flex gap-8 items-start justify-center overflow-auto">
          {/* OpenCV 使用的隐藏源图片 */}
          <img 
            id="process-source-img" 
            ref={imgRef} 
            src={base64Image} 
            className="hidden" 
            alt="source" 
            onLoad={() => {
                // 确保图片加载后画布尺寸正确
                const canvas = document.getElementById('process-canvas') as HTMLCanvasElement;
                if(canvas && imgRef.current) {
                    canvas.width = imgRef.current.naturalWidth;
                    canvas.height = imgRef.current.naturalHeight;
                    // 绘制初始图像
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(imgRef.current, 0, 0);
                }
            }}
          />
          
          <div className="relative shadow-lg rounded-lg overflow-hidden border border-gray-200 bg-white">
            <canvas id="process-canvas" className="max-h-[500px] max-w-full object-contain block" />
          </div>

          <div className="w-64 flex flex-col gap-3">
             <p className="text-sm font-medium text-gray-500 mb-2">{t.filters}</p>
             <button 
               onClick={() => handleProcess('grayscale')}
               disabled={!cvReady}
               className="px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:text-blue-600 font-medium text-sm transition-all text-left"
             >
               Grayscale
             </button>
             <button 
               onClick={() => handleProcess('blur')}
               disabled={!cvReady}
               className="px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:text-blue-600 font-medium text-sm transition-all text-left"
             >
               Gaussian Blur
             </button>
             <button 
               onClick={() => handleProcess('canny')}
               disabled={!cvReady}
               className="px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:text-blue-600 font-medium text-sm transition-all text-left"
             >
               Canny Edge Detection
             </button>
             
             {!cvReady && <p className="text-xs text-amber-500 mt-2">{t.loadingOpenCV}</p>}

             <div className="mt-8 pt-6 border-t border-gray-100">
               <button 
                 onClick={() => onSave(processedUrl)}
                 className="w-full py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 flex items-center justify-center gap-2"
               >
                 <Check size={18} /> {t.useImage}
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageProcessor;

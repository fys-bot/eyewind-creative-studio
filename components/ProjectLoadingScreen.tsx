
import React, { useEffect, useState } from 'react';
import { translations, Language } from '../utils/translations';

interface ProjectLoadingScreenProps {
  progress: number; // 0 到 100
  stage: 'init' | 'fetch' | 'assets' | 'graph' | 'final';
  message: string;
  lang: Language;
}

const ProjectLoadingScreen: React.FC<ProjectLoadingScreenProps> = ({ progress, message, lang }) => {
  const t = translations[lang];
  const [tipIndex, setTipIndex] = useState(0);

  // 偶尔轮换提示
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % t.loading.tips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [lang, t.loading.tips.length]);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6">
      
      {/* 极简容器 */}
      <div className="flex flex-col items-center gap-8 w-full max-w-xs transition-opacity duration-500">
        
        {/* Logo - 静态且专业 */}
        <div className="w-14 h-14 bg-black text-white rounded-xl flex items-center justify-center text-xl font-bold shadow-lg">
             E
        </div>

        {/* 文本与进度 */}
        <div className="w-full space-y-4">
             {/* 动态状态文本 */}
             <div className="flex justify-between items-end">
                <h2 className="text-sm font-semibold text-gray-700">
                    {message}
                </h2>
                <span className="text-xs font-mono text-gray-400">{progress}%</span>
             </div>

             {/* 极简进度条 */}
             <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-black transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
             </div>
        </div>
      </div>

      {/* 底部微小提示 */}
      <div className="absolute bottom-10 text-center w-full px-6">
        <p className="text-xs text-gray-400 font-medium animate-in fade-in slide-in-from-bottom-1 duration-700" key={tipIndex}>
           {t.loading.tips[tipIndex]}
        </p>
      </div>

    </div>
  );
};

export default ProjectLoadingScreen;

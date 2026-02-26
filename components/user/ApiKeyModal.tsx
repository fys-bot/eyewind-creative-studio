
import React, { useState, useEffect } from 'react';
import { X, Key, Check, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';
import { getLocalApiKey } from '../../services/storageService';
import { verifyAndConnectConnector } from '../../services/connectorService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'zh' | 'tw';
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, lang }) => {
  const [inputValue, setInputValue] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        const stored = getLocalApiKey();
        if (stored) setInputValue(stored);
        setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
      if (!inputValue.trim()) return;
      
      setIsLoading(true);
      setError(null);

      try {
          // Use unified connector service to verify and save
          // This updates both the global key and the connector registry
          await verifyAndConnectConnector('google', { 
              apiKey: inputValue.trim() 
          });
          
          setIsSaved(true);
          setTimeout(() => {
              setIsSaved(false);
              onClose();
          }, 1000);
      } catch (err: any) {
          console.error("Failed to save key:", err);
          setError(err.message || "Verification failed");
      } finally {
          setIsLoading(false);
      }
  };

  const strings = {
      en: {
          title: "API Configuration",
          desc: "To use the AI features in this shared environment, please provide your own Gemini API Key.",
          label: "Gemini API Key",
          placeholder: "Paste your key here (starts with AIza...)",
          save: "Save Key",
          saved: "Saved!",
          link: "Get a free key from Google AI Studio",
          privacy: "Your key is stored locally in your browser and is never sent to our servers."
      },
      zh: {
          title: "API 配置",
          desc: "要在共享环境中使用 AI 功能，请提供您自己的 Gemini API 密钥。",
          label: "Gemini API Key",
          placeholder: "在此粘贴您的密钥 (以 AIza 开头...)",
          save: "保存密钥",
          saved: "已保存！",
          link: "前往 Google AI Studio 免费获取",
          privacy: "您的密钥仅存储在本地浏览器中，绝不会上传至我们的服务器。"
      },
      tw: {
          title: "API 配置",
          desc: "要在共享環境中使用 AI 功能，請提供您自己的 Gemini API 金鑰。",
          label: "Gemini API Key",
          placeholder: "在此貼上您的金鑰 (以 AIza 開頭...)",
          save: "儲存金鑰",
          saved: "已儲存！",
          link: "前往 Google AI Studio 免費獲取",
          privacy: "您的金鑰僅存儲在本地瀏覽器中，絕不會上傳至我們的服務器。"
      }
  };

  const t = strings[lang];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
         <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Key size={18} className="text-yellow-500"/>
                 {t.title}
             </h3>
             <button onClick={onClose} className="p-1 text-gray-400 hover:text-black hover:bg-gray-200 rounded-full transition-colors">
                 <X size={18}/>
             </button>
         </div>

         <div className="p-6">
             <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                 {t.desc}
             </p>

             <div className="space-y-2 mb-6">
                 <label className="text-xs font-bold text-gray-700 ml-1">{t.label}</label>
                 <div className="relative">
                     <input 
                        type="password" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={t.placeholder}
                        disabled={isLoading}
                        className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-yellow-400 transition-all text-sm font-mono disabled:opacity-50"
                     />
                 </div>
                 {error && (
                    <p className="text-xs text-red-500 font-bold ml-1 animate-in fade-in">{error}</p>
                 )}
             </div>

             <button 
                onClick={handleSave}
                disabled={!inputValue.trim() || isSaved || isLoading}
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${isSaved ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-gray-800 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed'}`}
             >
                {isLoading ? <Loader2 size={18} className="animate-spin"/> : (isSaved ? <Check size={18}/> : <ShieldCheck size={18}/>)}
                {isLoading ? (lang === 'zh' || lang === 'tw' ? '验证中...' : 'Verifying...') : (isSaved ? t.saved : t.save)}
             </button>

             <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="mt-6 flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
             >
                 {t.link}
                 <ExternalLink size={12}/>
             </a>

             <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-100 text-[10px] text-gray-400 text-center leading-tight">
                 {t.privacy}
             </div>
         </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;

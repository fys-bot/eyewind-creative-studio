import React, { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { translations, Language } from '../../utils/translations';
import { useAuth } from '../../modules/auth/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, lang }) => {
  const t = translations[lang];
  const { login, register } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
      setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      
      if (mode === 'register') {
          if (formData.password !== formData.confirmPassword) {
              setError(t.auth.password_mismatch || "Passwords do not match");
              return;
          }
      }

      setIsLoading(true);

      try {
          if (mode === 'login') {
              await login({ email: formData.email, password: formData.password });
          } else {
              await register({ email: formData.email, password: formData.password, name: formData.name });
          }
          // Close is handled by context on success
      } catch (err: any) {
          setError(err.message || "Authentication failed");
          setIsLoading(false);
      }
  };

  const toggleMode = () => {
      setMode(mode === 'login' ? 'register' : 'login');
      setError(null);
      setFormData({ email: '', password: '', confirmPassword: '', name: '' });
  };

  // 徽标 SVG
  const GoogleLogo = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 头部 */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-lg">E</div>
          <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? t.auth.title : t.auth.sign_up}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">{t.auth.subtitle}</p>
        </div>

        {/* 社交按钮 (Mock for now) */}
        {mode === 'login' && (
            <div className="px-8 space-y-3">
              <button className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700 relative group">
                <GoogleLogo />
                <span>Google</span>
              </button>
            </div>
        )}

        {mode === 'login' && (
            <div className="px-8 py-6 flex items-center gap-3">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.auth.or_continue}</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle size={16}/>
                  {error}
              </div>
          )}

          {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Name"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all text-sm"
                  required
                />
              </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 ml-1">{t.auth.email_label}</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t.auth.email_placeholder}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all text-sm"
              required
            />
          </div>
          
          <div className="space-y-1.5">
             <div className="flex items-center justify-between ml-1">
               <label className="text-xs font-bold text-gray-700">{t.auth.password_label}</label>
               {mode === 'login' && <button type="button" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">{t.auth.forgot_password}</button>}
             </div>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={t.auth.password_placeholder}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all text-sm"
              required
            />
          </div>

          {mode === 'register' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                <label className="text-xs font-bold text-gray-700 ml-1">{t.auth.confirm_password_label || "Confirm Password"}</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t.auth.confirm_password_placeholder || "Re-enter your password"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all text-sm"
                  required
                />
              </div>
          )}

          <button 
             type="submit"
             disabled={isLoading}
             className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 active:scale-[0.98] transition-all shadow-lg shadow-gray-200 flex items-center justify-center"
          >
             {isLoading ? <Loader2 className="animate-spin" size={20}/> : (mode === 'login' ? t.auth.sign_in : t.auth.sign_up)}
          </button>
        </form>

        {/* 页脚 */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {mode === 'login' ? t.auth.no_account : "Already have an account?"} 
            <button onClick={toggleMode} className="font-bold text-black hover:underline ml-1">
                {mode === 'login' ? t.auth.sign_up : t.auth.sign_in}
            </button>
          </p>
          <p className="text-[10px] text-gray-400 mt-3 leading-relaxed px-4">
            {t.auth.policy}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

      </div>
    </div>
  );
};

export default LoginModal;
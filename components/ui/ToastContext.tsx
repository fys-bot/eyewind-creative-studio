import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  title?: string; // Add optional title
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  addToast: (props: { message: string, title?: string, type?: ToastType, duration?: number } | string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((props: { message: string, title?: string, type?: ToastType, duration?: number } | string) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    let toastProps: Omit<Toast, 'id'>;
    if (typeof props === 'string') {
        toastProps = { message: props, type: 'info', duration: 3000 };
    } else {
        toastProps = { 
            message: props.message, 
            title: props.title,
            type: props.type || 'info', 
            duration: props.duration || 3000 
        };
    }

    setToasts((prev) => [...prev, { id, ...toastProps }]);

    if (toastProps.duration && toastProps.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toastProps.duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = React.forwardRef<HTMLDivElement, { toast: Toast; onRemove: (id: string) => void }>(({ toast, onRemove }, ref) => {
  const icons = {
    success: <div className="bg-green-500 text-white p-1 rounded-full"><Check size={14} strokeWidth={3} /></div>,
    error: <div className="bg-red-500 text-white p-1 rounded-full"><X size={14} strokeWidth={3} /></div>,
    info: <div className="bg-blue-500 text-white p-1 rounded-full"><Info size={14} strokeWidth={3} /></div>,
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      layout
      className="pointer-events-auto min-w-[320px] max-w-md p-3 pr-10 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center gap-3 relative overflow-hidden group"
    >
      <div className="shrink-0">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && (
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-0.5">{toast.title}</h4>
        )}
        <p className={`${toast.title ? 'text-[10px] text-gray-500 dark:text-gray-400' : 'text-sm font-bold text-gray-800 dark:text-gray-200'} leading-snug truncate`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
});

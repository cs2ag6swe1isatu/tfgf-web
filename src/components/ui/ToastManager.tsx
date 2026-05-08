import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ToastItem, { ToastLevel } from './Toast';
import { createId } from '../../utils/uuid';
import '../../ui/toasts.css';
import { playSfx } from '../../utils/sfx';

// Example usage:
// import React from 'react';
// import { useToasts } from '../components/ui/ToastManager' // or from '../components/ui' if using the index export

// export const Example = () => {
//   const { notify } = useToasts();

//   return (
//     <button onClick={() => notify({ message: 'Achievement unlocked!', level: 'achievement', icon: '/img/your-icon.png' })}>
//       Show Toast
//     </button>
//   );
// };

export interface NotifyOptions {
  message: string;
  level?: ToastLevel;
  icon?: string;
  duration?: number; // ms
}

export interface Notification extends NotifyOptions {
  id: string;
}

interface ToastContextValue {
  notify: (opts: NotifyOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Imperative global notifier (for non-React code paths)
export let notifyGlobal: ((opts: NotifyOptions) => string) | null = null;

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [toasts, setToasts] = useState<Notification[]>([]);
  const timers = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
    playSfx('popupClose', 0.4);
    const t = timers.current[id];
    if (t) {
      window.clearTimeout(t);
      delete timers.current[id];
    }
  }, []);

  const notify = useCallback((opts: NotifyOptions) => {
    const id = createId();
    const toast: Notification = {
      id,
      message: opts.message,
      level: opts.level || 'info',
      icon: opts.icon,
      duration: typeof opts.duration === 'number' ? opts.duration : (opts.level === 'achievement' ? 6000 : 4500),
    };

    setToasts((s) => [...s, toast]);
    playSfx('popupOpen', 0.45);

    // schedule auto-dismiss
    const timeout = window.setTimeout(() => {
      dismiss(id);
    }, toast.duration);
    timers.current[id] = timeout as unknown as number;

    return id;
  }, [dismiss]);

  useEffect(() => {
    return () => {
      // clear timers on unmount
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
      timers.current = {};
    };
  }, []);

  useEffect(() => {
    // expose notify imperatively for non-react callers
    notifyGlobal = notify;
    return () => {
      if (notifyGlobal === notify) notifyGlobal = null;
    };
  }, [notify]);

  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      {children}
      <ToastManagerInternal toasts={toasts} onClose={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToasts = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within a ToastProvider');
  return ctx;
};

const ToastManagerInternal: React.FC<{ toasts: Notification[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
  if (typeof document === 'undefined') return null;

  const manager = (
    <div className="tf-toast-root" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className="tf-toast-wrapper">
          <ToastItem id={t.id} level={t.level || 'info'} message={t.message} icon={t.icon} onClose={onClose} />
        </div>
      ))}
    </div>
  );

  return createPortal(manager, document.body);
};

export default ToastProvider;

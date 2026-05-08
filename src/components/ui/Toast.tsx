import React from 'react';

export type ToastLevel = 'achievement' | 'info' | 'warning' | 'error' | 'success';

export interface ToastProps {
  id: string;
  level: ToastLevel;
  message: string;
  icon?: string;
  onClose: (id: string) => void;
}

const levelColors: Record<ToastLevel, string> = {
  achievement: '#7C4DFF',
  info: '#2196F3',
  warning: '#FB8C00',
  error: '#E53935',
  success: '#43A047',
};

export const Toast: React.FC<ToastProps> = ({ id, level, message, icon, onClose }) => {
  return (
    <div className={`tf-toast tf-toast-${level}`} role="status" aria-live="polite">
      {icon && (
        <div className="tf-toast-icon">
          <img src={icon} alt="" />
        </div>
      )}

      <div className="tf-toast-body">
        <div className="tf-toast-message">{message}</div>
      </div>

      <button className="tf-toast-close" onClick={() => onClose(id)} aria-label="Close">×</button>
      <style>{`
        .tf-toast-${level} { border-left: 6px solid ${levelColors[level]}; }
      `}</style>
    </div>
  );
};

export default Toast;

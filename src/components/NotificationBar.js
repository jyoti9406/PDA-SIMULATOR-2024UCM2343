import React from 'react';
import { usePDA } from '../context/PDAContext';

export default function NotificationBar() {
  const { state, dispatch } = usePDA();
  const { notifications } = state;

  if (notifications.length === 0) return null;

  return (
    <div className="notification-bar" role="alert" aria-live="polite">
      {notifications.map(n => (
        <div key={n.id} className={`notification notification-${n.level}`}>
          <span className="notification-icon">
            {n.level === 'error' ? '✕' : n.level === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span className="notification-message">{n.message}</span>
          <button
            className="notification-dismiss"
            onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', payload: { id: n.id } })}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

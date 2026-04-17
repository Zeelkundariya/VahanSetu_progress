import { useState, useEffect, useRef } from 'react';

let toasts = [];
let listeners = [];

export function showToast(message, type = 'info') {
  const id = Date.now();
  toasts = [...toasts, { id, message, type }];
  listeners.forEach(fn => fn([...toasts]));
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    listeners.forEach(fn => fn([...toasts]));
  }, 3500);
}

export default function Toast() {
  const [list, setList] = useState([]);
  useEffect(() => {
    listeners.push(setList);
    return () => { listeners = listeners.filter(fn => fn !== setList); };
  }, []);

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

  return (
    <div className="vs-toast-container">
      {list.map(t => (
        <div key={t.id} className={`vs-toast ${t.type}`}>
          <span>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

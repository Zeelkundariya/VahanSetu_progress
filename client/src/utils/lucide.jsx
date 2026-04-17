import { useEffect } from 'react';

/** Call this after any render that adds new <i data-lucide="..."> elements */
export function useLucide() {
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
}

/** Inline Lucide icon helper — matches HTML <i data-lucide="..."> pattern */
export function Icon({ name, size = 16, style = {} }) {
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return <i data-lucide={name} style={{ width: size, height: size, ...style }} />;
}

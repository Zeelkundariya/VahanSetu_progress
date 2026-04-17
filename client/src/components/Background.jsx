import { useEffect } from 'react';

/**
 * Background — the canvas, aurora blobs, grid, scan line, orbs and EV scene
 * are all declared statically in index.html so vs-energy.js finds them at
 * DOMContentLoaded before React even starts. This component only re-runs
 * effects that need the React-mounted DOM (tilt cards, ripple, counters).
 */
export default function Background() {
  useEffect(() => {
    // Re-apply tilt + ripple + magnetic effects whenever the page changes
    if (window.vsAnimate) {
      window.vsAnimate.refreshTilt();
    }
    // Init lucide icons
    if (window.lucide) window.lucide.createIcons();
  });

  // Nothing to render — all background elements live in index.html
  return null;
}

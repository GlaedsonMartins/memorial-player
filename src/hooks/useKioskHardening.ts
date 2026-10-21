import { useEffect } from "react";

export function useKioskHardening() {
  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();
    const toggleFullscreen = (event: MouseEvent) => {
      if (!event.isTrusted || event.detail > 1 || event.defaultPrevented || event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Keep controls independent and avoid toggling twice when their click bubbles.
      if (target.closest('button, a, input, select, textarea, [role="button"], [contenteditable], .fullscreen-controls')) return;
      // Reuse the visible control's browser support, error handling and state sync.
      document.querySelector<HTMLButtonElement>(".fullscreen-controls button")?.click();
    };
    document.addEventListener("selectstart", prevent);
    document.addEventListener("click", toggleFullscreen);
    return () => {
      document.removeEventListener("selectstart", prevent);
      document.removeEventListener("click", toggleFullscreen);
    };
  }, []);
}

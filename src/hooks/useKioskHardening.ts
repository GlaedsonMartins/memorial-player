import { useEffect } from "react";

export function useKioskHardening() {
  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();
    document.addEventListener("selectstart", prevent);
    return () => {
      document.removeEventListener("selectstart", prevent);
    };
  }, []);
}

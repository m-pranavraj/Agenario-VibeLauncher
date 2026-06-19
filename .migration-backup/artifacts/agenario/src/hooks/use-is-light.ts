import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function useIsLight() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted ? resolvedTheme === "light" : false;
}

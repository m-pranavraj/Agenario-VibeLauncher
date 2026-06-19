import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isLight = mounted ? resolvedTheme === "light" : false;

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
        isLight
          ? "bg-amber-50 border-amber-200/60 text-amber-600"
          : "bg-white/[0.06] border-white/[0.1] text-white/50"
      } ${className}`}
      aria-label="Toggle theme"
    >
      {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
    </motion.button>
  );
}

import { useEffect } from "react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setLocation("/"), 3000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505]">
      <div className="text-center space-y-4 px-6">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mx-auto">
          <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover" />
        </div>
        <h1 className="text-xl font-bold text-white">Redirecting you back…</h1>
        <p className="text-sm text-white/40">This page doesn't exist. Taking you home in a moment.</p>
        <button
          onClick={() => setLocation("/")}
          className="text-xs text-white/50 hover:text-white transition-colors underline underline-offset-2"
        >
          Go now
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export const useAutoLogout = () => {
  const { user, signOut } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    toast.info("تم تسجيل الخروج تلقائياً بسبب عدم النشاط", {
      duration: 5000,
    });
    await signOut();
  }, [signOut]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
  }, [handleLogout]);

  useEffect(() => {
    if (!user) return;

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);
};

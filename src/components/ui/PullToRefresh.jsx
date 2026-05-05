import { useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [refreshing, setRefreshing] = useState(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, THRESHOLD], [0, 1]);
  const rotate = useTransform(y, [0, THRESHOLD], [0, 180]);
  const startY = useRef(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    const el = e.currentTarget;
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current === null) return;
    const el = e.currentTarget;
    if (el.scrollTop > 0) { pulling.current = false; return; }
    const delta = Math.max(0, e.touches[0].clientY - startY.current);
    const capped = Math.min(delta * 0.5, THRESHOLD + 20);
    y.set(capped);
  }, [y]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    startY.current = null;
    if (y.get() >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      await animate(y, THRESHOLD * 0.8, { duration: 0.15 });
      await onRefresh?.();
      setRefreshing(false);
    }
    animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
  }, [y, refreshing, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-x-hidden"
    >
      {/* Pull indicator */}
      <motion.div
        style={{ height: y, opacity }}
        className="flex items-center justify-center overflow-hidden"
      >
        <motion.div style={{ rotate }}>
          <RefreshCw className={`w-5 h-5 text-blue-500 ${refreshing ? "animate-spin" : ""}`} />
        </motion.div>
      </motion.div>

      <motion.div style={{ y: 0 }}>
        {children}
      </motion.div>
    </div>
  );
}
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useNavigation } from "@/lib/NavigationContext";

/**
 * Direction-aware page transitions powered by NavigationContext.
 *
 * "push" → new screen slides in from right (native iOS-like forward)
 * "pop"  → new screen slides in from left  (native iOS-like back)
 * "tab"  → fade-only, no lateral movement
 */
function getVariants(direction) {
  if (direction === "pop") {
    return {
      initial: { opacity: 0, x: "-30%" },
      animate: { opacity: 1, x: 0 },
      exit:    { opacity: 0, x: "30%" },
    };
  }
  if (direction === "tab") {
    return {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      exit:    { opacity: 0, scale: 0.98 },
    };
  }
  // push (default)
  return {
    initial: { opacity: 0, x: "30%" },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: "-30%" },
  };
}

const PUSH_TRANSITION = {
  type: "spring",
  stiffness: 380,
  damping: 36,
  mass: 0.9,
};

const TAB_TRANSITION = {
  duration: 0.15,
  ease: "easeOut",
};

export default function PageTransition({ children }) {
  const location = useLocation();
  const { direction } = useNavigation();
  const variants = getVariants(direction);
  const transition = direction === "tab" ? TAB_TRANSITION : PUSH_TRANSITION;

  return (
    // Clip overflow so sliding pages never show a horizontal scrollbar
    <div style={{ overflowX: "hidden", width: "100%" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname + location.search}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          style={{ willChange: "transform, opacity" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
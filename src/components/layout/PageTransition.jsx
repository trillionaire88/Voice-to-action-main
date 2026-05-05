import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState("page-enter-active");

  useEffect(() => {
    setTransitionStage("page-enter");
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setTransitionStage("page-enter-active");
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname, children]);

  return (
    <div className={transitionStage} style={{ minHeight: "100vh" }}>
      {displayChildren}
    </div>
  );
}

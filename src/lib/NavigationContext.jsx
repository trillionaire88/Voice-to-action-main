import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * NavigationContext — per-tab navigation stack.
 *
 * Each tab maintains its own history stack so that switching tabs
 * restores where you were in that tab. The back button pops within
 * the current tab's stack.
 */

const NavigationContext = createContext(null);

const TAB_KEYS = ["Home", "Newsfeed", "Messages", "CreatePoll", "Profile"];

const TAB_ROOT_PATHS = {
  Home:       createPageUrl("Home"),
  Newsfeed:   createPageUrl("Newsfeed"),
  Messages:   "/Messages",
  CreatePoll: createPageUrl("CreatePoll"),
  Profile:    createPageUrl("Profile"),
};

const ROOT_ROUTE_SET = new Set([...Object.values(TAB_ROOT_PATHS), "/"]);

export function resolveTabKey(pathname) {
  for (const key of TAB_KEYS) {
    const root = TAB_ROOT_PATHS[key];
    if (pathname === root || pathname.startsWith(root + "/")) return key;
  }
  return null;
}

function getInitialTab(pathname) {
  return resolveTabKey(pathname) || "Home";
}

export function NavigationProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [direction, setDirection] = useState("push");

  // Per-tab stacks: { [tabKey]: string[] }
  // On deep-link, seed the active tab's stack with [rootPath, currentPath]
  // so the back button correctly returns to the tab root instead of exiting.
  const tabStacksRef = useRef(
    TAB_KEYS.reduce((acc, key) => {
      const initialTab = getInitialTab(location.pathname);
      const currentPath = location.pathname + location.search;
      if (key === initialTab) {
        const root = TAB_ROOT_PATHS[key];
        // If deep-linked (not at root), seed with [root, currentPath]
        acc[key] = currentPath !== root && currentPath !== "/" ? [root, currentPath] : [currentPath];
      } else {
        acc[key] = [TAB_ROOT_PATHS[key]];
      }
      return acc;
    }, {})
  );

  // Currently active tab
  const [activeTabKey, setActiveTabKey] = useState(() => getInitialTab(location.pathname));

  const navigateTo = useCallback((path, opts = {}) => {
    const tabKey = resolveTabKey(path) || activeTabKey;
    setDirection("push");
    tabStacksRef.current = {
      ...tabStacksRef.current,
      [tabKey]: [...(tabStacksRef.current[tabKey] || [TAB_ROOT_PATHS[tabKey]]), path],
    };
    navigate(path, opts.routerOpts);
  }, [navigate, activeTabKey]);

  const goBack = useCallback(() => {
    const stack = tabStacksRef.current[activeTabKey] || [];
    if (stack.length > 1) {
      const newStack = stack.slice(0, -1);
      tabStacksRef.current = { ...tabStacksRef.current, [activeTabKey]: newStack };
      setDirection("pop");
      navigate(-1);
    } else {
      // Already at tab root — go back in browser history
      setDirection("pop");
      navigate(-1);
    }
  }, [navigate, activeTabKey]);

  const switchTab = useCallback((tabKey) => {
    const stack = tabStacksRef.current[tabKey] || [TAB_ROOT_PATHS[tabKey]];
    const destination = stack[stack.length - 1] || TAB_ROOT_PATHS[tabKey];
    setDirection("tab");
    setActiveTabKey(tabKey);

    // If destination is the root, use replace to avoid polluting browser history
    if (destination === TAB_ROOT_PATHS[tabKey] || stack.length <= 1) {
      navigate(TAB_ROOT_PATHS[tabKey], { replace: true });
    } else {
      navigate(destination);
    }
  }, [navigate]);

  // Sync activeTabKey when location changes (handles <Link> navigations and
  // browser forward/back that bypass navigateTo/goBack).
  useEffect(() => {
    const resolved = resolveTabKey(location.pathname);
    if (resolved && resolved !== activeTabKey) {
      setActiveTabKey(resolved);
    }
    // Keep the stack in sync for the current tab
    const currentPath = location.pathname + location.search;
    const tabKey = resolved || activeTabKey;
    const stack = tabStacksRef.current[tabKey] || [];
    const top = stack[stack.length - 1];
    if (top !== currentPath) {
      tabStacksRef.current = {
        ...tabStacksRef.current,
        [tabKey]: [...stack, currentPath],
      };
    }
  }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Android hardware back button handler
  useEffect(() => {
    const handlePopState = () => {
      const stack = tabStacksRef.current[activeTabKey] || [];
      if (stack.length > 1) {
        const newStack = stack.slice(0, -1);
        tabStacksRef.current = { ...tabStacksRef.current, [activeTabKey]: newStack };
        setDirection("pop");
      }
      // else: let browser/WebView handle it (exit app on Android)
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeTabKey]);

  // Legacy dispatch API
  const dispatch = useCallback((action) => {
    if (action.type === "PUSH") {
      navigateTo(action.path);
    } else if (action.type === "POP") {
      goBack();
    } else if (action.type === "TAB_SWITCH" || action.type === "TAB_RESET") {
      if (action.tabKey) switchTab(action.tabKey);
    } else if (action.type === "SET_DIRECTION") {
      setDirection(action.direction);
    }
  }, [navigateTo, goBack, switchTab]);

  const value = {
    direction,
    activeTabKey,
    tabRootPaths: TAB_ROOT_PATHS,
    resolveTabKey,
    navigateTo,
    switchTab,
    goBack,
    dispatch,
    stacks: tabStacksRef.current,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used inside NavigationProvider");
  return ctx;
}

export { TAB_ROOT_PATHS };
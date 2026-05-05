import React, { useState, useRef, useEffect } from "react";

export default function LazyImage({
  src,
  alt,
  className = "",
  fallback = null,
  aspectRatio = "16/9",
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.1, rootMargin: "200px" },
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={imgRef}
      className={`overflow-hidden bg-slate-100 ${className}`}
      style={{ aspectRatio }}
    >
      {inView && !error && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {(!loaded || error) && !inView && (
        <div className="w-full h-full bg-slate-100 animate-pulse" />
      )}
      {error && fallback}
    </div>
  );
}

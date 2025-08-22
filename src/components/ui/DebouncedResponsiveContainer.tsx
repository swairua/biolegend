import React, { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer } from 'recharts';

interface DebouncedResponsiveContainerProps {
  width?: string | number;
  height?: string | number;
  debounceMs?: number;
  children: React.ReactNode;
  [key: string]: any;
}

export const DebouncedResponsiveContainer: React.FC<DebouncedResponsiveContainerProps> = ({
  width = "100%",
  height = 300,
  debounceMs = 150,
  children,
  ...props
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [shouldRender, setShouldRender] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver>();

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a debounced resize observer
    observerRef.current = new ResizeObserver((entries) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const entry = entries[0];
        if (entry) {
          const { width: newWidth, height: newHeight } = entry.contentRect;
          setContainerSize({ width: newWidth, height: newHeight });
          setShouldRender(true);
        }
      }, debounceMs);
    });

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debounceMs]);

  // Initial render
  useEffect(() => {
    const timer = setTimeout(() => setShouldRender(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className="relative"
    >
      {shouldRender && (
        <ResponsiveContainer width="100%" height="100%" {...props}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
};

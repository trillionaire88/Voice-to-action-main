import React, { useRef, useEffect, useState } from "react";
import { FixedSizeGrid as Grid } from "react-window";

/**
 * VirtualFeed — virtualised 1-or-2 column feed using react-window FixedSizeGrid.
 *
 * Only activates virtualisation when itemCount > threshold (default 20).
 * Below that threshold it renders a normal CSS grid — no virtualisation overhead.
 *
 * Props:
 *  items        — array of data items
 *  renderItem   — ({ item, index }) => ReactNode
 *  columns      — number of columns (1 or 2, default 1)
 *  rowHeight    — fixed row height in px (default 300)
 *  className    — wrapper class name
 *  threshold    — activate virtualisation above this count (default 20)
 *  gridClassName — CSS grid class applied in non-virtual mode
 */
export default function VirtualFeed({
  items = [],
  renderItem,
  columns = 1,
  rowHeight = 300,
  className = "",
  threshold = 20,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 gap-4",
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Non-virtual fallback for small lists
  if (items.length <= threshold) {
    return (
      <div className={gridClassName}>
        {items.map((item, index) => (
          <React.Fragment key={item.id || index}>
            {renderItem({ item, index })}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const colCount = columns;
  const rowCount = Math.ceil(items.length / colCount);
  const colWidth = Math.floor(containerWidth / colCount);
  const visibleRows = Math.min(rowCount, 8); // show ~8 rows before scroll
  const listHeight = visibleRows * (rowHeight + 12);

  return (
    <div ref={containerRef} className={className}>
      <Grid
        columnCount={colCount}
        columnWidth={colWidth}
        height={listHeight}
        rowCount={rowCount}
        rowHeight={rowHeight + 12}
        width={containerWidth}
        overscanRowCount={3}
        style={{ overflowX: "hidden" }}
      >
        {({ columnIndex, rowIndex, style }) => {
          const index = rowIndex * colCount + columnIndex;
          if (index >= items.length) return null;
          const item = items[index];
          return (
            <div style={{ ...style, paddingRight: columnIndex < colCount - 1 ? 8 : 0, paddingBottom: 12 }}>
              {renderItem({ item, index })}
            </div>
          );
        }}
      </Grid>
    </div>
  );
}
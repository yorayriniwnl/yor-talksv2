import * as React from 'react';
import { useMemo, useState } from 'react';

type VirtualListProps<T> = {
  items: T[];
  itemHeight: number;
  width?: number | string;
  height?: number | string;
  renderItem: (item: T, index: number) => React.ReactElement | null;
};

/**
 * A dependency-free virtual list for the long feed. It keeps only the visible
 * posts (plus a small buffer) in the DOM while preserving normal scroll space.
 */
export function VirtualList<T>({ items, itemHeight, width = '100%', height = 800, renderItem }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = typeof height === 'number' ? height : 800;
  const overscan = 4;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan);
  const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [endIndex, items, startIndex]);

  return (
    <div
      className="hide-scrollbar overflow-y-auto"
      style={{ width, height: viewportHeight }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: startIndex * itemHeight }} aria-hidden="true" />
      {visibleItems.map((item, offset) => {
        const index = startIndex + offset;
        return <div key={index} style={{ minHeight: itemHeight }}>{renderItem(item, index)}</div>;
      })}
      <div style={{ height: (items.length - endIndex) * itemHeight }} aria-hidden="true" />
    </div>
  );
}

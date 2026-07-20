import React from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

type VirtualListProps<T> = {
  items: T[];
  itemHeight: number;
  width?: number | string;
  height?: number | string;
  renderItem: (item: T, index: number) => React.ReactElement | null;
};

export function VirtualList<T>({ items, itemHeight, width = '100%', height = 800, renderItem }: VirtualListProps<T>) {
  const Row = ({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  };

  return (
    <List
      height={typeof height === 'string' ? 800 : height}
      itemCount={items.length}
      itemSize={itemHeight}
      width={width}
    >
      {Row}
    </List>
  );
}

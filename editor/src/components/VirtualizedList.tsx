import React, { useMemo, useState, useCallback } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Box,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { FixedSizeList as WindowedList } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T, index: number) => string;
  itemHeight?: number;
  height?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterFunction?: (item: T, searchTerm: string) => boolean;
}

const VirtualizedList = <T,>({
  items,
  renderItem,
  getItemKey,
  itemHeight = 72,
  height = 400,
  searchable = false,
  searchPlaceholder = 'Search...',
  filterFunction,
}: VirtualizedListProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchable || !searchTerm || !filterFunction) {
      return items;
    }

    return items.filter(item => filterFunction(item, searchTerm));
  }, [items, searchTerm, searchable, filterFunction]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
    },
    []
  );

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = filteredItems[index];
      if (!item) return null;

      return (
        <div style={style} key={getItemKey(item, index)}>
          {renderItem(item, index)}
        </div>
      );
    },
    [filteredItems, renderItem, getItemKey]
  );

  return (
    <Box>
      {searchable && (
        <TextField
          fullWidth
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      )}

      <WindowedList
        height={height}
        itemCount={filteredItems.length}
        itemSize={itemHeight}
        itemData={filteredItems}
      >
        {Row}
      </WindowedList>
    </Box>
  );
};

export default VirtualizedList;

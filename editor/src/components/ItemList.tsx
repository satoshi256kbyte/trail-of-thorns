import React, { useState, useMemo } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  Button,
  Paper,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { Item, ItemType } from '../types';

interface ItemListProps {
  items: Record<string, Item>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const ItemList: React.FC<ItemListProps> = ({
  items,
  selectedId,
  onSelect,
  onCreate,
  searchQuery,
  onSearchChange,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<ItemType | 'all'>('all');

  const filteredItems = useMemo(() => {
    const itemArray = Object.values(items);
    
    return itemArray.filter((item) => {
      // Category filter
      if (categoryFilter !== 'all' && item.type !== categoryFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [items, categoryFilter, searchQuery]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#9e9e9e';
      case 'uncommon': return '#4caf50';
      case 'rare': return '#2196f3';
      case 'epic': return '#9c27b0';
      case 'legendary': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const getItemTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'weapon': return '⚔️';
      case 'armor': return '🛡️';
      case 'consumable': return '🧪';
      case 'key': return '🗝️';
      default: return '📦';
    }
  };

  return (
    <Paper elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Items ({filteredItems.length})</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreate}
            size="small"
          >
            New Item
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value as ItemType | 'all')}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="weapon">Weapons</MenuItem>
              <MenuItem value="armor">Armor</MenuItem>
              <MenuItem value="consumable">Consumables</MenuItem>
              <MenuItem value="key">Key Items</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {filteredItems.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery || categoryFilter !== 'all' 
                ? 'No items match your filters' 
                : 'No items created yet'}
            </Typography>
          </Box>
        ) : (
          filteredItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={selectedId === item.id}
                onClick={() => onSelect(item.id)}
                sx={{ py: 1.5 }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: getRarityColor(item.rarity),
                      fontSize: '1.2rem',
                    }}
                  >
                    {getItemTypeIcon(item.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {item.name}
                      </Typography>
                      <Chip
                        label={item.rarity}
                        size="small"
                        sx={{
                          bgcolor: getRarityColor(item.rarity),
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {item.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={item.type}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 18 }}
                        />
                        {item.sellPrice > 0 && (
                          <Chip
                            label={`${item.sellPrice}G`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 18 }}
                          />
                        )}
                      </Box>
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
};

export default ItemList;
import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
} from '@mui/material';

interface TileAsset {
  id: string;
  name: string;
  type: string;
  passable: boolean;
  icon: string;
}

interface TileSelectorProps {
  availableAssets: TileAsset[];
  selectedTile: TileAsset | null;
  onTileSelect: (tile: TileAsset) => void;
}

const TileSelector: React.FC<TileSelectorProps> = ({
  availableAssets,
  selectedTile,
  onTileSelect,
}) => {
  // Default tiles if no assets provided
  const defaultTiles: TileAsset[] = [
    { id: 'grass', name: 'Grass', type: 'grass', passable: true, icon: '🌱' },
    { id: 'stone', name: 'Stone', type: 'stone', passable: true, icon: '🪨' },
    { id: 'water', name: 'Water', type: 'water', passable: false, icon: '💧' },
    { id: 'sand', name: 'Sand', type: 'sand', passable: true, icon: '🏖️' },
    { id: 'wall', name: 'Wall', type: 'wall', passable: false, icon: '🧱' },
    { id: 'door', name: 'Door', type: 'door', passable: true, icon: '🚪' },
    {
      id: 'chest',
      name: 'Chest Tile',
      type: 'chest',
      passable: true,
      icon: '📦',
    },
  ];

  const tiles = availableAssets.length > 0 ? availableAssets : defaultTiles;

  const getTileColor = (type: string): string => {
    switch (type) {
      case 'grass':
        return '#4caf50';
      case 'stone':
        return '#9e9e9e';
      case 'water':
        return '#2196f3';
      case 'sand':
        return '#ffeb3b';
      case 'wall':
        return '#424242';
      case 'door':
        return '#8d6e63';
      case 'chest':
        return '#ff9800';
      default:
        return '#e0e0e0';
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Tile Palette
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 2, display: 'block' }}
      >
        Click a tile to select it, then click on the map to place
      </Typography>

      <List sx={{ p: 0 }}>
        {tiles.map(tile => (
          <ListItem key={tile.id} disablePadding>
            <ListItemButton
              selected={selectedTile?.id === tile.id}
              onClick={() => onTileSelect(tile)}
              sx={{ py: 1 }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: getTileColor(tile.type),
                    color: 'white',
                    fontSize: '1rem',
                    width: 32,
                    height: 32,
                  }}
                >
                  {tile.icon || tile.type.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" noWrap>
                      {tile.name}
                    </Typography>
                    <Chip
                      label={tile.passable ? 'Passable' : 'Blocked'}
                      size="small"
                      color={tile.passable ? 'success' : 'error'}
                      sx={{ fontSize: '0.6rem', height: 16 }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {tile.type}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {selectedTile && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Tile
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                bgcolor: getTileColor(selectedTile.type),
                color: 'white',
                fontSize: '0.8rem',
                width: 24,
                height: 24,
              }}
            >
              {selectedTile.icon || selectedTile.type.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2">{selectedTile.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedTile.passable ? 'Passable' : 'Blocked'}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TileSelector;

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
  IconButton,
  Divider,
  TextField,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { EnemySpawn } from '../types';

interface EnemyPlacerProps {
  availableEnemies: string[];
  selectedEnemy: string | null;
  onEnemySelect: (enemyId: string) => void;
  enemies: EnemySpawn[];
  onEnemiesChange: (enemies: EnemySpawn[]) => void;
}

const EnemyPlacer: React.FC<EnemyPlacerProps> = ({
  availableEnemies,
  selectedEnemy,
  onEnemySelect,
  enemies,
  onEnemiesChange,
}) => {
  // Default enemies if none provided
  const defaultEnemies = [
    'goblin',
    'orc',
    'skeleton',
    'spider',
    'wolf',
    'dragon',
    'slime',
    'bandit',
  ];

  const enemyList = availableEnemies.length > 0 ? availableEnemies : defaultEnemies;

  const getEnemyIcon = (enemyId: string): string => {
    const icons: Record<string, string> = {
      goblin: '👹',
      orc: '👺',
      skeleton: '💀',
      spider: '🕷️',
      wolf: '🐺',
      dragon: '🐉',
      slime: '🟢',
      bandit: '🏴‍☠️',
    };
    return icons[enemyId] || '👾';
  };

  const getEnemyColor = (enemyId: string): string => {
    const colors: Record<string, string> = {
      goblin: '#4caf50',
      orc: '#f44336',
      skeleton: '#9e9e9e',
      spider: '#795548',
      wolf: '#607d8b',
      dragon: '#e91e63',
      slime: '#8bc34a',
      bandit: '#ff5722',
    };
    return colors[enemyId] || '#666666';
  };

  const handleDeleteEnemy = (enemyIndex: number) => {
    const updatedEnemies = enemies.filter((_, index) => index !== enemyIndex);
    onEnemiesChange(updatedEnemies);
  };

  const handleEnemyLevelChange = (enemyIndex: number, level: number) => {
    const updatedEnemies = enemies.map((enemy, index) =>
      index === enemyIndex ? { ...enemy, level: Math.max(1, Math.min(100, level)) } : enemy
    );
    onEnemiesChange(updatedEnemies);
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Enemy Types
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        Select an enemy type, then click on the map to place
      </Typography>

      <List sx={{ p: 0 }}>
        {enemyList.map((enemyId) => (
          <ListItem key={enemyId} disablePadding>
            <ListItemButton
              selected={selectedEnemy === enemyId}
              onClick={() => onEnemySelect(enemyId)}
              sx={{ py: 1 }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: getEnemyColor(enemyId),
                    color: 'white',
                    fontSize: '1rem',
                    width: 32,
                    height: 32,
                  }}
                >
                  {getEnemyIcon(enemyId)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {enemyId}
                  </Typography>
                }
                secondary={enemyId}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {selectedEnemy && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Enemy
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                bgcolor: getEnemyColor(selectedEnemy),
                color: 'white',
                fontSize: '0.8rem',
                width: 24,
                height: 24,
              }}
            >
              {getEnemyIcon(selectedEnemy)}
            </Avatar>
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
              {selectedEnemy}
            </Typography>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Placed Enemies ({enemies.length})
      </Typography>

      {enemies.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No enemies placed yet
        </Typography>
      ) : (
        <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
          {enemies.map((enemy, index) => (
            <ListItem
              key={`${enemy.enemyId}-${index}`}
              disablePadding
              sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: getEnemyColor(enemy.enemyId),
                      color: 'white',
                      fontSize: '0.8rem',
                      width: 24,
                      height: 24,
                    }}
                  >
                    {getEnemyIcon(enemy.enemyId)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {enemy.enemyId}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      ({enemy.position.x}, {enemy.position.y})
                    </Typography>
                  }
                />
                <IconButton
                  size="small"
                  onClick={() => handleDeleteEnemy(index)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ ml: 5, mt: 1 }}>
                <TextField
                  size="small"
                  label="Level"
                  type="number"
                  value={enemy.level}
                  onChange={(e) => handleEnemyLevelChange(index, parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1, max: 100 }}
                  sx={{ width: 80 }}
                />
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default EnemyPlacer;
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
  Typography,
  Chip,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Map as MapIcon } from '@mui/icons-material';
import { Stage } from '../types';

interface StageListProps {
  stages: Record<string, Stage>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const StageList: React.FC<StageListProps> = ({
  stages,
  selectedId,
  onSelect,
  onCreate,
  searchQuery,
  onSearchChange,
}) => {
  const [difficultyFilter, setDifficultyFilter] = useState<number | 'all'>('all');

  const filteredStages = useMemo(() => {
    const stageArray = Object.values(stages);
    
    return stageArray.filter((stage) => {
      // Difficulty filter
      if (difficultyFilter !== 'all' && stage.difficulty !== difficultyFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          stage.name.toLowerCase().includes(query) ||
          stage.description.toLowerCase().includes(query) ||
          stage.objectives.some(obj => obj.description.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [stages, difficultyFilter, searchQuery]);

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return '#4caf50'; // Easy - Green
    if (difficulty <= 4) return '#ff9800'; // Medium - Orange
    if (difficulty <= 6) return '#f44336'; // Hard - Red
    if (difficulty <= 8) return '#9c27b0'; // Very Hard - Purple
    return '#e91e63'; // Extreme - Pink
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return 'Easy';
    if (difficulty <= 4) return 'Medium';
    if (difficulty <= 6) return 'Hard';
    if (difficulty <= 8) return 'Very Hard';
    return 'Extreme';
  };

  return (
    <Paper elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Stages ({filteredStages.length})</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreate}
            size="small"
          >
            New Stage
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search stages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={difficultyFilter}
              label="Difficulty"
              onChange={(e) => setDifficultyFilter(e.target.value as number | 'all')}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value={1}>Easy (1-2)</MenuItem>
              <MenuItem value={3}>Medium (3-4)</MenuItem>
              <MenuItem value={5}>Hard (5-6)</MenuItem>
              <MenuItem value={7}>Very Hard (7-8)</MenuItem>
              <MenuItem value={9}>Extreme (9-10)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {filteredStages.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery || difficultyFilter !== 'all' 
                ? 'No stages match your filters' 
                : 'No stages created yet'}
            </Typography>
          </Box>
        ) : (
          filteredStages.map((stage) => (
            <ListItem key={stage.id} disablePadding>
              <ListItemButton
                selected={selectedId === stage.id}
                onClick={() => onSelect(stage.id)}
                sx={{ py: 1.5 }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: getDifficultyColor(stage.difficulty),
                      color: 'white',
                    }}
                  >
                    <MapIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {stage.name}
                      </Typography>
                      <Chip
                        label={getDifficultyLabel(stage.difficulty)}
                        size="small"
                        sx={{
                          bgcolor: getDifficultyColor(stage.difficulty),
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
                        {stage.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={`${stage.size.width}×${stage.size.height}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 18 }}
                        />
                        <Chip
                          label={`${stage.enemies.length} enemies`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 18 }}
                        />
                        <Chip
                          label={`${stage.objectives.length} objectives`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 18 }}
                        />
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

export default StageList;
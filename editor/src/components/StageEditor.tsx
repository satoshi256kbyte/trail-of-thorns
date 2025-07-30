import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Divider,
} from '@mui/material';
import { Save as SaveIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Stage, TileData, StageObject, EnemySpawn, Objective, Reward } from '../types';
import MapGrid from './MapGrid';
import TileSelector from './TileSelector';
import ObjectPlacer from './ObjectPlacer';
import EnemyPlacer from './EnemyPlacer';
import ObjectiveEditor from './ObjectiveEditor';
import StagePreview from './StagePreview';

interface StageEditorProps {
  stage: Stage | null;
  onSave: (stage: Stage) => void;
  onDelete: (id: string) => void;
  availableAssets: TileAsset[];
  availableEnemies: string[];
  availableItems: string[];
}

interface TileAsset {
  id: string;
  name: string;
  type: string;
  passable: boolean;
  icon: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && children}
  </div>
);

const StageEditor: React.FC<StageEditorProps> = ({
  stage,
  onSave,
  onDelete,
  availableAssets,
  availableEnemies,
  availableItems,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState<'tiles' | 'objects' | 'enemies'>('tiles');
  const [selectedTile, setSelectedTile] = useState<TileAsset | null>(null);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Stage>>(() => ({
    id: stage?.id || '',
    name: stage?.name || '',
    description: stage?.description || '',
    size: stage?.size || { width: 20, height: 15 },
    tiles: stage?.tiles || [],
    objects: stage?.objects || [],
    enemies: stage?.enemies || [],
    objectives: stage?.objectives || [],
    rewards: stage?.rewards || [],
    difficulty: stage?.difficulty || 1,
  }));

  // Initialize empty tiles grid if needed
  const initializeTiles = useCallback((width: number, height: number): TileData[][] => {
    const defaultTile: TileData = {
      id: 'grass',
      type: 'grass',
      passable: true,
    };
    
    return Array(height).fill(null).map(() =>
      Array(width).fill(null).map(() => ({ ...defaultTile }))
    );
  }, []);

  // Ensure tiles array matches size
  const tiles = useMemo(() => {
    if (!formData.tiles || formData.tiles.length === 0) {
      return initializeTiles(formData.size!.width, formData.size!.height);
    }
    
    const currentTiles = formData.tiles;
    const { width, height } = formData.size!;
    
    // Resize if needed
    if (currentTiles.length !== height || currentTiles[0]?.length !== width) {
      const newTiles = initializeTiles(width, height);
      
      // Copy existing tiles where possible
      for (let y = 0; y < Math.min(height, currentTiles.length); y++) {
        for (let x = 0; x < Math.min(width, currentTiles[y]?.length || 0); x++) {
          if (currentTiles[y] && currentTiles[y][x]) {
            newTiles[y][x] = currentTiles[y][x];
          }
        }
      }
      
      return newTiles;
    }
    
    return currentTiles;
  }, [formData.tiles, formData.size, initializeTiles]);

  const handleInputChange = (field: keyof Stage, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    setFormData(prev => ({
      ...prev,
      size: { ...prev.size!, [dimension]: value }
    }));
  };

  const handleTileClick = (x: number, y: number) => {
    if (editMode === 'tiles' && selectedTile) {
      const newTiles = [...tiles];
      newTiles[y][x] = {
        id: selectedTile.id,
        type: selectedTile.type,
        passable: selectedTile.passable,
      };
      setFormData(prev => ({ ...prev, tiles: newTiles }));
    } else if (editMode === 'objects' && selectedObject) {
      const newObject: StageObject = {
        id: `obj_${Date.now()}`,
        type: selectedObject as any,
        position: { x, y },
        properties: {},
      };
      setFormData(prev => ({
        ...prev,
        objects: [...(prev.objects || []), newObject]
      }));
    } else if (editMode === 'enemies' && selectedEnemy) {
      const newEnemy: EnemySpawn = {
        enemyId: selectedEnemy,
        position: { x, y },
        level: 1,
      };
      setFormData(prev => ({
        ...prev,
        enemies: [...(prev.enemies || []), newEnemy]
      }));
    }
  };

  const handleObjectiveChange = (objectives: Objective[]) => {
    setFormData(prev => ({ ...prev, objectives }));
  };

  const handleRewardChange = (rewards: Reward[]) => {
    setFormData(prev => ({ ...prev, rewards }));
  };

  const handleSave = () => {
    if (!formData.id || !formData.name) return;
    
    const stageData: Stage = {
      id: formData.id,
      name: formData.name,
      description: formData.description || '',
      size: formData.size!,
      tiles,
      objects: formData.objects || [],
      enemies: formData.enemies || [],
      objectives: formData.objectives || [],
      rewards: formData.rewards || [],
      difficulty: formData.difficulty || 1,
    };
    
    onSave(stageData);
  };

  const handleDelete = () => {
    if (stage?.id) {
      onDelete(stage.id);
    }
  };

  if (!stage && !formData.id) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Select a stage to edit or create a new one
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {stage ? 'Edit Stage' : 'New Stage'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!formData.id || !formData.name}
            >
              Save
            </Button>
            {stage && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Stage ID"
              value={formData.id}
              onChange={(e) => handleInputChange('id', e.target.value)}
              disabled={!!stage}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Stage Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              multiline
              rows={2}
              size="small"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              label="Width"
              type="number"
              value={formData.size?.width || 20}
              onChange={(e) => handleSizeChange('width', parseInt(e.target.value) || 20)}
              inputProps={{ min: 5, max: 100 }}
              size="small"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              label="Height"
              type="number"
              value={formData.size?.height || 15}
              onChange={(e) => handleSizeChange('height', parseInt(e.target.value) || 15)}
              inputProps={{ min: 5, max: 100 }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="body2" gutterBottom>
                Difficulty: {formData.difficulty}
              </Typography>
              <Slider
                value={formData.difficulty || 1}
                onChange={(_, value) => handleInputChange('difficulty', value)}
                min={1}
                max={10}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Editor */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab label="Map Editor" />
          <Tab label="Objectives & Rewards" />
          <Tab label="Preview" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Tool Panel */}
            <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', p: 2 }}>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Edit Mode</InputLabel>
                <Select
                  value={editMode}
                  label="Edit Mode"
                  onChange={(e) => setEditMode(e.target.value as any)}
                >
                  <MenuItem value="tiles">Tiles</MenuItem>
                  <MenuItem value="objects">Objects</MenuItem>
                  <MenuItem value="enemies">Enemies</MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ my: 2 }} />

              {editMode === 'tiles' && (
                <TileSelector
                  availableAssets={availableAssets}
                  selectedTile={selectedTile}
                  onTileSelect={setSelectedTile}
                />
              )}

              {editMode === 'objects' && (
                <ObjectPlacer
                  selectedObject={selectedObject}
                  onObjectSelect={setSelectedObject}
                  objects={formData.objects || []}
                  onObjectsChange={(objects) => handleInputChange('objects', objects)}
                />
              )}

              {editMode === 'enemies' && (
                <EnemyPlacer
                  availableEnemies={availableEnemies}
                  selectedEnemy={selectedEnemy}
                  onEnemySelect={setSelectedEnemy}
                  enemies={formData.enemies || []}
                  onEnemiesChange={(enemies) => handleInputChange('enemies', enemies)}
                />
              )}
            </Box>

            {/* Map Grid */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <MapGrid
                tiles={tiles}
                objects={formData.objects || []}
                enemies={formData.enemies || []}
                onTileClick={handleTileClick}
                editMode={editMode}
              />
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <ObjectiveEditor
              objectives={formData.objectives || []}
              rewards={formData.rewards || []}
              availableItems={availableItems}
              onObjectivesChange={handleObjectiveChange}
              onRewardsChange={handleRewardChange}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 2, height: '100%' }}>
            <StagePreview
              stage={formData as Stage}
              showMinimap={true}
              showObjectives={true}
            />
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default StageEditor;
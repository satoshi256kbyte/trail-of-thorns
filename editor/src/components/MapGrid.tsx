import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { TileData, StageObject, EnemySpawn } from '../types';

interface MapGridProps {
  tiles: TileData[][];
  objects: StageObject[];
  enemies: EnemySpawn[];
  onTileClick: (x: number, y: number) => void;
  editMode: 'tiles' | 'objects' | 'enemies';
}

const TILE_SIZE = 24;
const GRID_COLOR = '#e0e0e0';
const SELECTED_COLOR = '#2196f3';

const MapGrid: React.FC<MapGridProps> = ({
  tiles,
  objects,
  enemies,
  onTileClick,
  editMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTile, setHoveredTile] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const width = tiles[0]?.length || 0;
  const height = tiles.length || 0;

  // Calculate canvas size
  useEffect(() => {
    const newWidth = width * TILE_SIZE;
    const newHeight = height * TILE_SIZE;
    setCanvasSize({ width: newWidth, height: newHeight });
  }, [width, height]);

  // Get tile color based on type
  const getTileColor = (tile: TileData): string => {
    switch (tile.type) {
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

  // Get object color
  const getObjectColor = (type: string): string => {
    switch (type) {
      case 'chest':
        return '#ff9800';
      case 'door':
        return '#8d6e63';
      case 'switch':
        return '#9c27b0';
      case 'npc':
        return '#00bcd4';
      default:
        return '#f44336';
    }
  };

  // Draw the map
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw tiles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y]?.[x];
        if (!tile) continue;

        const pixelX = x * TILE_SIZE;
        const pixelY = y * TILE_SIZE;

        // Draw tile background
        ctx.fillStyle = getTileColor(tile);
        ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);

        // Draw non-passable indicator
        if (!tile.passable) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw objects
    objects.forEach(obj => {
      const pixelX = obj.position.x * TILE_SIZE;
      const pixelY = obj.position.y * TILE_SIZE;

      ctx.fillStyle = getObjectColor(obj.type);
      ctx.fillRect(pixelX + 2, pixelY + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Draw object icon/letter
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const letter = obj.type.charAt(0).toUpperCase();
      ctx.fillText(letter, pixelX + TILE_SIZE / 2, pixelY + TILE_SIZE / 2);
    });

    // Draw enemies
    enemies.forEach(enemy => {
      const pixelX = enemy.position.x * TILE_SIZE;
      const pixelY = enemy.position.y * TILE_SIZE;

      // Draw enemy as red circle
      ctx.fillStyle = '#f44336';
      ctx.beginPath();
      ctx.arc(
        pixelX + TILE_SIZE / 2,
        pixelY + TILE_SIZE / 2,
        TILE_SIZE / 2 - 2,
        0,
        2 * Math.PI
      );
      ctx.fill();

      // Draw level
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        enemy.level.toString(),
        pixelX + TILE_SIZE / 2,
        pixelY + TILE_SIZE / 2
      );
    });

    // Draw grid lines
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE, 0);
      ctx.lineTo(x * TILE_SIZE, height * TILE_SIZE);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE);
      ctx.lineTo(width * TILE_SIZE, y * TILE_SIZE);
      ctx.stroke();
    }

    // Draw hovered tile highlight
    if (hoveredTile) {
      const pixelX = hoveredTile.x * TILE_SIZE;
      const pixelY = hoveredTile.y * TILE_SIZE;

      ctx.strokeStyle = SELECTED_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
    }
  }, [tiles, objects, enemies, hoveredTile, width, height, canvasSize]);

  // Redraw when data changes
  useEffect(() => {
    drawMap();
  }, [drawMap]);

  // Handle mouse events
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      setHoveredTile({ x, y });
    } else {
      setHoveredTile(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredTile(null);
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      onTileClick(x, y);
    }
  };

  if (width === 0 || height === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No map data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          mb: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Map Size: {width} × {height} | Mode: {editMode}
        </Typography>
        {hoveredTile && (
          <Typography variant="body2" color="text.secondary">
            Position: ({hoveredTile.x}, {hoveredTile.y})
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: 600,
          maxWidth: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{
            display: 'block',
            cursor: 'crosshair',
          }}
        />
      </Box>

      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: '#4caf50',
              border: 1,
              borderColor: 'divider',
            }}
          />
          <Typography variant="caption">Grass</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: '#9e9e9e',
              border: 1,
              borderColor: 'divider',
            }}
          />
          <Typography variant="caption">Stone</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: '#2196f3',
              border: 1,
              borderColor: 'divider',
            }}
          />
          <Typography variant="caption">Water</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: '#424242',
              border: 1,
              borderColor: 'divider',
            }}
          />
          <Typography variant="caption">Wall</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: '#f44336',
              borderRadius: '50%',
            }}
          />
          <Typography variant="caption">Enemy</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: '#ff9800',
              border: 1,
              borderColor: 'divider',
            }}
          />
          <Typography variant="caption">Object</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default MapGrid;

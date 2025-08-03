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
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { StageObject, ObjectType } from '../types';

interface ObjectPlacerProps {
  selectedObject: string | null;
  onObjectSelect: (objectType: string) => void;
  objects: StageObject[];
  onObjectsChange: (objects: StageObject[]) => void;
}

const ObjectPlacer: React.FC<ObjectPlacerProps> = ({
  selectedObject,
  onObjectSelect,
  objects,
  onObjectsChange,
}) => {
  const objectTypes = [
    { type: 'chest', name: 'Treasure Chest', icon: '📦', color: '#ff9800' },
    { type: 'door', name: 'Door', icon: '🚪', color: '#8d6e63' },
    { type: 'switch', name: 'Switch', icon: '🔘', color: '#9c27b0' },
    { type: 'npc', name: 'NPC', icon: '👤', color: '#00bcd4' },
  ];

  const handleDeleteObject = (objectId: string) => {
    const updatedObjects = objects.filter(obj => obj.id !== objectId);
    onObjectsChange(updatedObjects);
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Object Types
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 2, display: 'block' }}
      >
        Select an object type, then click on the map to place
      </Typography>

      <List sx={{ p: 0 }}>
        {objectTypes.map(objType => (
          <ListItem key={objType.type} disablePadding>
            <ListItemButton
              selected={selectedObject === objType.type}
              onClick={() => onObjectSelect(objType.type)}
              sx={{ py: 1 }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: objType.color,
                    color: 'white',
                    fontSize: '1rem',
                    width: 32,
                    height: 32,
                  }}
                >
                  {objType.icon}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={objType.name} secondary={objType.type} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {selectedObject && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Object
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {(() => {
              const objType = objectTypes.find(t => t.type === selectedObject);
              return objType ? (
                <>
                  <Avatar
                    sx={{
                      bgcolor: objType.color,
                      color: 'white',
                      fontSize: '0.8rem',
                      width: 24,
                      height: 24,
                    }}
                  >
                    {objType.icon}
                  </Avatar>
                  <Typography variant="body2">{objType.name}</Typography>
                </>
              ) : null;
            })()}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Placed Objects ({objects.length})
      </Typography>

      {objects.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No objects placed yet
        </Typography>
      ) : (
        <List sx={{ p: 0, maxHeight: 200, overflow: 'auto' }}>
          {objects.map(obj => {
            const objType = objectTypes.find(t => t.type === obj.type);
            return (
              <ListItem
                key={obj.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleDeleteObject(obj.id)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton sx={{ py: 0.5, pr: 6 }}>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: objType?.color || '#666',
                        color: 'white',
                        fontSize: '0.8rem',
                        width: 24,
                        height: 24,
                      }}
                    >
                      {objType?.icon || '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        {objType?.name || obj.type}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        ({obj.position.x}, {obj.position.y})
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
};

export default ObjectPlacer;

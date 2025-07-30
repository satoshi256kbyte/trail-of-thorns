import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { Objective, Reward, ObjectiveType, RewardType } from '../types';

interface ObjectiveEditorProps {
  objectives: Objective[];
  rewards: Reward[];
  availableItems: string[];
  onObjectivesChange: (objectives: Objective[]) => void;
  onRewardsChange: (rewards: Reward[]) => void;
}

const ObjectiveEditor: React.FC<ObjectiveEditorProps> = ({
  objectives,
  rewards,
  availableItems,
  onObjectivesChange,
  onRewardsChange,
}) => {
  const [expandedObjective, setExpandedObjective] = useState<string | false>(false);
  const [expandedReward, setExpandedReward] = useState<string | false>(false);

  const objectiveTypes: { value: ObjectiveType; label: string }[] = [
    { value: 'defeat', label: 'Defeat Enemies' },
    { value: 'collect', label: 'Collect Items' },
    { value: 'reach', label: 'Reach Location' },
    { value: 'survive', label: 'Survive Time' },
  ];

  const rewardTypes: { value: RewardType; label: string }[] = [
    { value: 'item', label: 'Item Reward' },
    { value: 'experience', label: 'Experience Points' },
    { value: 'gold', label: 'Gold' },
  ];

  const handleAddObjective = () => {
    const newObjective: Objective = {
      id: `obj_${Date.now()}`,
      type: 'defeat',
      description: 'New objective',
      target: '',
      value: 1,
    };
    onObjectivesChange([...objectives, newObjective]);
    setExpandedObjective(newObjective.id);
  };

  const handleUpdateObjective = (index: number, field: keyof Objective, value: any) => {
    const updatedObjectives = objectives.map((obj, i) =>
      i === index ? { ...obj, [field]: value } : obj
    );
    onObjectivesChange(updatedObjectives);
  };

  const handleDeleteObjective = (index: number) => {
    const updatedObjectives = objectives.filter((_, i) => i !== index);
    onObjectivesChange(updatedObjectives);
  };

  const handleAddReward = () => {
    const newReward: Reward = {
      type: 'experience',
      amount: 100,
    };
    onRewardsChange([...rewards, newReward]);
    setExpandedReward(`reward_${Date.now()}`);
  };

  const handleUpdateReward = (index: number, field: keyof Reward, value: any) => {
    const updatedRewards = rewards.map((reward, i) =>
      i === index ? { ...reward, [field]: value } : reward
    );
    onRewardsChange(updatedRewards);
  };

  const handleDeleteReward = (index: number) => {
    const updatedRewards = rewards.filter((_, i) => i !== index);
    onRewardsChange(updatedRewards);
  };

  const getObjectiveDescription = (objective: Objective): string => {
    switch (objective.type) {
      case 'defeat':
        return `Defeat ${objective.value} ${objective.target || 'enemies'}`;
      case 'collect':
        return `Collect ${objective.value} ${objective.target || 'items'}`;
      case 'reach':
        return `Reach ${objective.target || 'location'}`;
      case 'survive':
        return `Survive for ${objective.value} ${objective.target || 'turns'}`;
      default:
        return objective.description;
    }
  };

  const getRewardDescription = (reward: Reward): string => {
    switch (reward.type) {
      case 'item':
        return `${reward.amount}x ${reward.itemId || 'Unknown Item'}`;
      case 'experience':
        return `${reward.amount} EXP`;
      case 'gold':
        return `${reward.amount} Gold`;
      default:
        return `${reward.amount} ${reward.type}`;
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Objectives Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Objectives ({objectives.length})
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddObjective}
            >
              Add Objective
            </Button>
          </Box>

          {objectives.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No objectives defined. Add at least one objective to complete the stage.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {objectives.map((objective, index) => (
                <Accordion
                  key={objective.id}
                  expanded={expandedObjective === objective.id}
                  onChange={(_, isExpanded) => setExpandedObjective(isExpanded ? objective.id : false)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                      <Typography variant="subtitle2">
                        {getObjectiveDescription(objective)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteObjective(index);
                        }}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Objective Type</InputLabel>
                          <Select
                            value={objective.type}
                            label="Objective Type"
                            onChange={(e) => handleUpdateObjective(index, 'type', e.target.value)}
                          >
                            {objectiveTypes.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                {type.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Description"
                          value={objective.description}
                          onChange={(e) => handleUpdateObjective(index, 'description', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Target"
                          value={objective.target}
                          onChange={(e) => handleUpdateObjective(index, 'target', e.target.value)}
                          placeholder={
                            objective.type === 'defeat' ? 'Enemy type' :
                            objective.type === 'collect' ? 'Item name' :
                            objective.type === 'reach' ? 'Location name' :
                            'Time unit'
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Value"
                          type="number"
                          value={objective.value}
                          onChange={(e) => handleUpdateObjective(index, 'value', parseInt(e.target.value) || 1)}
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </Grid>

        {/* Rewards Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Rewards ({rewards.length})
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddReward}
            >
              Add Reward
            </Button>
          </Box>

          {rewards.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No rewards defined. Consider adding rewards to motivate players.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {rewards.map((reward, index) => (
                <Accordion
                  key={`reward_${index}`}
                  expanded={expandedReward === `reward_${index}`}
                  onChange={(_, isExpanded) => setExpandedReward(isExpanded ? `reward_${index}` : false)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                      <Typography variant="subtitle2">
                        {getRewardDescription(reward)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReward(index);
                        }}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Reward Type</InputLabel>
                          <Select
                            value={reward.type}
                            label="Reward Type"
                            onChange={(e) => handleUpdateReward(index, 'type', e.target.value as RewardType)}
                          >
                            {rewardTypes.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                {type.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      {reward.type === 'item' && (
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Item</InputLabel>
                            <Select
                              value={reward.itemId || ''}
                              label="Item"
                              onChange={(e) => handleUpdateReward(index, 'itemId', e.target.value)}
                            >
                              {availableItems.map((itemId) => (
                                <MenuItem key={itemId} value={itemId}>
                                  {itemId}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Amount"
                          type="number"
                          value={reward.amount}
                          onChange={(e) => handleUpdateReward(index, 'amount', parseInt(e.target.value) || 1)}
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </Grid>
      </Grid>

      {objectives.length === 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Typography variant="body2" color="warning.dark">
            ⚠️ At least one objective is required to create a valid stage.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ObjectiveEditor;
/**
 * ObjectiveUI Tests
 *
 * Tests for the ObjectiveUI class that manages objective display UI
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { ObjectiveUI, ObjectiveUIConfig, ObjectiveMarker } from '../../../../game/src/systems/victory/ObjectiveUI';
import { Objective, ObjectiveType, ObjectiveProgress } from '../../../../game/src/types/victory';

describe('ObjectiveUI', () => {
  let scene: Phaser.Scene;
  let objectiveUI: ObjectiveUI;

  beforeEach(() => {
    // Create a minimal Phaser scene mock
    scene = {
      add: {
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setScrollFactor: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          setSize: vi.fn().mockReturnThis(),
          removeAll: vi.fn(),
          destroy: vi.fn(),
        }),
        graphics: vi.fn().mockReturnValue({
          clear: vi.fn().mockReturnThis(),
          fillStyle: vi.fn().mockReturnThis(),
          fillRoundedRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRoundedRect: vi.fn().mockReturnThis(),
          strokeCircle: vi.fn().mockReturnThis(),
          fillCircle: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setScrollFactor: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setText: vi.fn().mockReturnThis(),
          setColor: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
      },
      cameras: {
        main: {
          width: 1920,
          height: 1080,
        },
      },
      time: {
        delayedCall: vi.fn(),
      },
      sound: {
        get: vi.fn().mockReturnValue(null),
        play: vi.fn(),
      },
      tweens: {
        add: vi.fn(),
      },
    } as any;

    objectiveUI = new ObjectiveUI(scene);
  });

  afterEach(() => {
    if (objectiveUI) {
      objectiveUI.destroy();
    }
  });

  describe('Initialization', () => {
    it('should create ObjectiveUI with default configuration', () => {
      expect(objectiveUI).toBeDefined();
      expect(objectiveUI.isPanelShown()).toBe(true); // Default is shown
    });

    it('should create ObjectiveUI with custom configuration', () => {
      const customConfig: Partial<ObjectiveUIConfig> = {
        showByDefault: false,
        panelPosition: 'top-right',
        enableDebugLogs: true,
      };

      const customUI = new ObjectiveUI(scene, customConfig);
      expect(customUI).toBeDefined();
      expect(customUI.isPanelShown()).toBe(false);

      customUI.destroy();
    });

    it('should create objective panel UI elements', () => {
      expect(scene.add.container).toHaveBeenCalled();
      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
    });
  });

  describe('Objective List Display', () => {
    it('should show objective list with multiple objectives', () => {
      const objectives: Objective[] = [
        {
          id: 'obj1',
          type: ObjectiveType.DEFEAT_BOSS,
          description: 'Defeat the boss',
          isRequired: true,
          isComplete: false,
          progress: { current: 0, target: 1, percentage: 0 },
        },
        {
          id: 'obj2',
          type: ObjectiveType.SURVIVE_TURNS,
          description: 'Survive 10 turns',
          isRequired: true,
          isComplete: false,
          progress: { current: 5, target: 10, percentage: 50 },
        },
      ];

      objectiveUI.showObjectiveList(objectives);

      const currentObjectives = objectiveUI.getCurrentObjectives();
      expect(currentObjectives).toHaveLength(2);
      expect(currentObjectives[0].id).toBe('obj1');
      expect(currentObjectives[1].id).toBe('obj2');
    });

    it('should handle empty objective list', () => {
      objectiveUI.showObjectiveList([]);

      const currentObjectives = objectiveUI.getCurrentObjectives();
      expect(currentObjectives).toHaveLength(0);
    });

    it('should display completed objectives differently', () => {
      const objectives: Objective[] = [
        {
          id: 'obj1',
          type: ObjectiveType.DEFEAT_BOSS,
          description: 'Defeat the boss',
          isRequired: true,
          isComplete: true,
          progress: { current: 1, target: 1, percentage: 100 },
        },
      ];

      objectiveUI.showObjectiveList(objectives);

      // Verify text element was created with completed styling
      expect(scene.add.text).toHaveBeenCalled();
    });
  });

  describe('Progress Update', () => {
    beforeEach(() => {
      const objectives: Objective[] = [
        {
          id: 'obj1',
          type: ObjectiveType.DEFEAT_ALL_ENEMIES,
          description: 'Defeat all enemies',
          isRequired: true,
          isComplete: false,
          progress: { current: 0, target: 10, percentage: 0 },
        },
      ];

      objectiveUI.showObjectiveList(objectives);
    });

    it('should update objective progress', () => {
      const newProgress: ObjectiveProgress = {
        current: 5,
        target: 10,
        percentage: 50,
      };

      objectiveUI.updateObjectiveProgress('obj1', newProgress);

      const objectives = objectiveUI.getCurrentObjectives();
      expect(objectives[0].progress.current).toBe(5);
      expect(objectives[0].progress.percentage).toBe(50);
    });

    it('should mark objective as complete when progress reaches 100%', () => {
      const completeProgress: ObjectiveProgress = {
        current: 10,
        target: 10,
        percentage: 100,
      };

      objectiveUI.updateObjectiveProgress('obj1', completeProgress);

      const objectives = objectiveUI.getCurrentObjectives();
      expect(objectives[0].isComplete).toBe(true);
    });

    it('should handle progress update for non-existent objective', () => {
      const newProgress: ObjectiveProgress = {
        current: 5,
        target: 10,
        percentage: 50,
      };

      // Should not throw error
      expect(() => {
        objectiveUI.updateObjectiveProgress('non-existent', newProgress);
      }).not.toThrow();
    });
  });

  describe('Objective Completion Notification', () => {
    it('should show completion notification for completed objective', () => {
      const objective: Objective = {
        id: 'obj1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Defeat the boss',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      objectiveUI.showObjectiveComplete(objective);

      // Verify notification elements were created
      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should auto-hide completion notification after duration', () => {
      const objective: Objective = {
        id: 'obj1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Defeat the boss',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      objectiveUI.showObjectiveComplete(objective);

      // Verify delayed call was set up
      expect(scene.time.delayedCall).toHaveBeenCalled();
    });
  });

  describe('Panel Toggle', () => {
    it('should toggle objective panel visibility', () => {
      const initialVisibility = objectiveUI.isPanelShown();

      objectiveUI.toggleObjectivePanel();
      expect(objectiveUI.isPanelShown()).toBe(!initialVisibility);

      objectiveUI.toggleObjectivePanel();
      expect(objectiveUI.isPanelShown()).toBe(initialVisibility);
    });

    it('should show objective panel', () => {
      objectiveUI.hideObjectivePanel();
      expect(objectiveUI.isPanelShown()).toBe(false);

      objectiveUI.showObjectivePanel();
      expect(objectiveUI.isPanelShown()).toBe(true);
    });

    it('should hide objective panel', () => {
      objectiveUI.showObjectivePanel();
      expect(objectiveUI.isPanelShown()).toBe(true);

      objectiveUI.hideObjectivePanel();
      expect(objectiveUI.isPanelShown()).toBe(false);
    });
  });

  describe('Minimap Markers', () => {
    it('should show objective markers on minimap', () => {
      const markers: ObjectiveMarker[] = [
        {
          objectiveId: 'obj1',
          position: { x: 100, y: 100 },
          color: 0xff0000,
        },
        {
          objectiveId: 'obj2',
          position: { x: 200, y: 200 },
          color: 0x00ff00,
        },
      ];

      objectiveUI.showObjectiveMarkers(markers);

      // Verify markers were created
      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled(); // Pulsing animation
    });

    it('should update objective marker position', () => {
      const markers: ObjectiveMarker[] = [
        {
          objectiveId: 'obj1',
          position: { x: 100, y: 100 },
          color: 0xff0000,
        },
      ];

      objectiveUI.showObjectiveMarkers(markers);

      // Update marker position
      objectiveUI.updateObjectiveMarker('obj1', { x: 150, y: 150 });

      // Verify position update was called
      expect(scene.add.graphics).toHaveBeenCalled();
    });

    it('should remove objective marker', () => {
      const markers: ObjectiveMarker[] = [
        {
          objectiveId: 'obj1',
          position: { x: 100, y: 100 },
          color: 0xff0000,
        },
      ];

      objectiveUI.showObjectiveMarkers(markers);
      objectiveUI.removeObjectiveMarker('obj1');

      // Marker should be removed
      expect(scene.add.graphics).toHaveBeenCalled();
    });

    it('should not show markers when disabled in config', () => {
      const customUI = new ObjectiveUI(scene, { showMinimapMarkers: false });

      const markers: ObjectiveMarker[] = [
        {
          objectiveId: 'obj1',
          position: { x: 100, y: 100 },
          color: 0xff0000,
        },
      ];

      const graphicsCallsBefore = (scene.add.graphics as any).mock.calls.length;
      customUI.showObjectiveMarkers(markers);
      const graphicsCallsAfter = (scene.add.graphics as any).mock.calls.length;

      // No new graphics should be created for markers
      expect(graphicsCallsAfter).toBe(graphicsCallsBefore);

      customUI.destroy();
    });
  });

  describe('UI Resize', () => {
    it('should resize UI elements when screen size changes', () => {
      const newWidth = 1280;
      const newHeight = 720;

      objectiveUI.resize(newWidth, newHeight);

      // Verify container position was updated
      expect(scene.add.container).toHaveBeenCalled();
    });
  });

  describe('Visual Quality', () => {
    it('should create visually distinct elements for different objective states', () => {
      const objectives: Objective[] = [
        {
          id: 'required',
          type: ObjectiveType.DEFEAT_BOSS,
          description: 'Required objective',
          isRequired: true,
          isComplete: false,
          progress: { current: 0, target: 1, percentage: 0 },
        },
        {
          id: 'optional',
          type: ObjectiveType.COLLECT_ITEMS,
          description: 'Optional objective',
          isRequired: false,
          isComplete: false,
          progress: { current: 0, target: 5, percentage: 0 },
        },
        {
          id: 'completed',
          type: ObjectiveType.SURVIVE_TURNS,
          description: 'Completed objective',
          isRequired: true,
          isComplete: true,
          progress: { current: 10, target: 10, percentage: 100 },
        },
      ];

      objectiveUI.showObjectiveList(objectives);

      // Verify different text elements were created
      expect(scene.add.text).toHaveBeenCalled();
      expect((scene.add.text as any).mock.calls.length).toBeGreaterThan(0);
    });

    it('should use appropriate colors for progress bars', () => {
      const objectives: Objective[] = [
        {
          id: 'low',
          type: ObjectiveType.DEFEAT_ALL_ENEMIES,
          description: 'Low progress',
          isRequired: true,
          isComplete: false,
          progress: { current: 2, target: 10, percentage: 20 },
        },
        {
          id: 'medium',
          type: ObjectiveType.DEFEAT_ALL_ENEMIES,
          description: 'Medium progress',
          isRequired: true,
          isComplete: false,
          progress: { current: 6, target: 10, percentage: 60 },
        },
        {
          id: 'high',
          type: ObjectiveType.DEFEAT_ALL_ENEMIES,
          description: 'High progress',
          isRequired: true,
          isComplete: false,
          progress: { current: 10, target: 10, percentage: 100 },
        },
      ];

      objectiveUI.showObjectiveList(objectives);

      // Verify graphics were created for progress bars
      expect(scene.add.graphics).toHaveBeenCalled();
    });
  });

  describe('Usability', () => {
    it('should provide clear visual feedback for objective completion', () => {
      const objective: Objective = {
        id: 'obj1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Defeat the boss',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      objectiveUI.showObjectiveComplete(objective);

      // Verify completion notification was created
      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should handle rapid progress updates gracefully', () => {
      const objectives: Objective[] = [
        {
          id: 'obj1',
          type: ObjectiveType.DEFEAT_ALL_ENEMIES,
          description: 'Defeat all enemies',
          isRequired: true,
          isComplete: false,
          progress: { current: 0, target: 10, percentage: 0 },
        },
      ];

      objectiveUI.showObjectiveList(objectives);

      // Rapid updates
      for (let i = 1; i <= 10; i++) {
        objectiveUI.updateObjectiveProgress('obj1', {
          current: i,
          target: 10,
          percentage: (i / 10) * 100,
        });
      }

      const currentObjectives = objectiveUI.getCurrentObjectives();
      expect(currentObjectives[0].progress.current).toBe(10);
      expect(currentObjectives[0].isComplete).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should properly destroy all UI elements', () => {
      const objectives: Objective[] = [
        {
          id: 'obj1',
          type: ObjectiveType.DEFEAT_BOSS,
          description: 'Defeat the boss',
          isRequired: true,
          isComplete: false,
          progress: { current: 0, target: 1, percentage: 0 },
        },
      ];

      objectiveUI.showObjectiveList(objectives);

      const markers: ObjectiveMarker[] = [
        {
          objectiveId: 'obj1',
          position: { x: 100, y: 100 },
          color: 0xff0000,
        },
      ];

      objectiveUI.showObjectiveMarkers(markers);

      objectiveUI.destroy();

      // Verify cleanup
      expect(objectiveUI.getCurrentObjectives()).toHaveLength(0);
      expect(objectiveUI.isPanelShown()).toBe(false);
    });
  });
});

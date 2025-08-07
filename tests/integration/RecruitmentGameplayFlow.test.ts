/**
 * Recruitment System Gameplay Flow Integration Test
 *
 * Tests the complete recruitment workflow from character selection
 * to battle completion and stage clear.
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { RecruitmentUI } from '../../game/src/systems/recruitment/RecruitmentUI';
import { Unit, StageData } from '../../game/src/types/gameplay';
import { BattleResult } from '../../game/src/types/battle';

// Mock Phaser environment
const mockPhaserScene = {
  add: {
    container: jest.fn(() => ({
      add: jest.fn(),
      setScrollFactor: jest.fn(() => ({ setDepth: jest.fn(() => ({ setVisible: jest.fn() })) })),
      setDepth: jest.fn(() => ({ setVisible: jest.fn() })),
      setVisible: jest.fn(),
      destroy: jest.fn(),
    })),
    graphics: jest.fn(() => ({
      fillStyle: jest.fn(() => ({
        fillRoundedRect: jest.fn(() => ({
          lineStyle: jest.fn(() => ({ strokeRoundedRect: jest.fn() })),
        })),
      })),
      clear: jest.fn(() => ({ fillStyle: jest.fn(() => ({ fillRoundedRect: jest.fn() })) })),
    })),
    text: jest.fn(() => ({
      setOrigin: jest.fn(() => ({ setColor: jest.fn() })),
      setText: jest.fn(),
      setColor: jest.fn(),
      destroy: jest.fn(),
    })),
  },
  cameras: {
    main: {
      width: 1024,
      height: 768,
      scrollX: 0,
      scrollY: 0,
      zoom: 1,
    },
  },
  events: {
    on: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  time: {
    delayedCall: jest.fn(),
  },
  tweens: {
    add: jest.fn(),
  },
};

describe('Recruitment System Gameplay Flow Integration', () => {
  let recruitmentSystem: RecruitmentSystem;
  let recruitmentUI: RecruitmentUI;
  let mockStageData: StageData;
  let mockPlayerUnit: Unit;
  let mockRecruitableEnemy: Unit;

  beforeEach(() => {
    // Create test units
    mockPlayerUnit = {
      id: 'player-1',
      name: 'Hero',
      position: { x: 1, y: 6 },
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 25,
        defense: 15,
        speed: 12,
        movement: 3,
      },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    mockRecruitableEnemy = {
      id: 'enemy-1',
      name: 'Orc Warrior',
      position: { x: 9, y: 1 },
      stats: {
        maxHP: 90,
        maxMP: 20,
        attack: 20,
        defense: 12,
        speed: 8,
        movement: 2,
      },
      currentHP: 90,
      currentMP: 20,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
      metadata: {
        recruitment: {
          conditions: [
            {
              id: 'specific_attacker',
              type: 'specific_attacker',
              description: '主人公で攻撃して撃破する',
              parameters: {
                attackerId: 'player-1',
              },
            },
            {
              id: 'hp_threshold',
              type: 'hp_threshold',
              description: 'HPが30%以下の状態で撃破する',
              parameters: {
                threshold: 0.3,
              },
            },
          ],
          priority: 80,
          description: 'オークの戦士を仲間にする',
          rewards: [],
        },
      },
    };

    // Create stage data
    mockStageData = {
      id: 'test-stage',
      name: 'Test Recruitment Stage',
      description: 'A stage for testing recruitment',
      mapData: {
        width: 12,
        height: 8,
        tileSize: 32,
        tiles: Array(8)
          .fill(null)
          .map(() => Array(12).fill({ type: 'grass', movementCost: 1 })),
      },
      playerUnits: [mockPlayerUnit],
      enemyUnits: [mockRecruitableEnemy],
      victoryConditions: [
        {
          type: 'defeat_all',
          description: 'Defeat all enemy units',
        },
      ],
    };

    // Create recruitment system and UI
    recruitmentSystem = new RecruitmentSystem(mockPhaserScene as any);
    recruitmentUI = new RecruitmentUI(mockPhaserScene as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Recruitment Workflow', () => {
    test('should handle full recruitment flow from selection to completion', async () => {
      // Step 1: Initialize recruitment system
      const initResult = recruitmentSystem.initialize(mockStageData);
      expect(initResult.success).toBe(true);
      expect(initResult.details?.recruitableCount).toBe(1);

      // Step 2: Check recruitment conditions
      const conditions = recruitmentSystem.getRecruitmentConditions(mockRecruitableEnemy);
      expect(conditions).toHaveLength(2);
      expect(conditions[0].type).toBe('specific_attacker');
      expect(conditions[1].type).toBe('hp_threshold');

      // Step 3: Check initial eligibility (should fail - conditions not met)
      let eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(
        mockPlayerUnit,
        mockRecruitableEnemy,
        {
          damage: 50,
          turn: 1,
        }
      );
      expect(eligibilityResult.success).toBe(false);
      expect(eligibilityResult.nextAction).toBe('continue_battle');

      // Step 4: Reduce enemy HP to meet threshold condition
      mockRecruitableEnemy.currentHP = 25; // 25/90 = ~28% < 30%

      // Step 5: Check eligibility again (should succeed - all conditions met)
      eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(
        mockPlayerUnit,
        mockRecruitableEnemy,
        {
          damage: 25, // This would defeat the enemy
          turn: 1,
        }
      );
      expect(eligibilityResult.success).toBe(true);
      expect(eligibilityResult.nextAction).toBe('convert_to_npc');

      // Step 6: Process recruitment attempt (simulate battle defeat)
      const recruitmentResult = recruitmentSystem.processRecruitmentAttempt(
        mockPlayerUnit,
        mockRecruitableEnemy,
        25, // Damage that would defeat the enemy
        undefined, // No battle result needed for this test
        1
      );
      expect(recruitmentResult.success).toBe(true);
      expect(recruitmentResult.nextAction).toBe('convert_to_npc');

      // Step 7: Verify unit is now NPC
      expect(recruitmentSystem.isNPC(mockRecruitableEnemy)).toBe(true);

      // Step 8: Complete recruitment at stage clear
      const allUnits = [mockPlayerUnit, mockRecruitableEnemy];
      const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

      expect(recruitedUnits).toHaveLength(1);
      expect(recruitedUnits[0].unit.id).toBe('enemy-1');
      expect(recruitedUnits[0].unit.faction).toBe('player');

      console.log('✅ Complete recruitment workflow test passed');
    });

    test('should handle recruitment failure when NPC is defeated', () => {
      // Initialize system
      const initResult = recruitmentSystem.initialize(mockStageData);
      expect(initResult.success).toBe(true);

      // Convert enemy to NPC
      mockRecruitableEnemy.currentHP = 25;
      const recruitmentResult = recruitmentSystem.processRecruitmentAttempt(
        mockPlayerUnit,
        mockRecruitableEnemy,
        25,
        undefined,
        1
      );
      expect(recruitmentResult.success).toBe(true);
      expect(recruitmentSystem.isNPC(mockRecruitableEnemy)).toBe(true);

      // Defeat the NPC
      mockRecruitableEnemy.currentHP = 0;

      // Try to complete recruitment
      const allUnits = [mockPlayerUnit, mockRecruitableEnemy];
      const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

      // Should fail because NPC was defeated
      expect(recruitedUnits).toHaveLength(0);

      console.log('✅ Recruitment failure test passed');
    });

    test('should handle multiple recruitment attempts correctly', () => {
      // Add another recruitable enemy
      const secondEnemy: Unit = {
        ...mockRecruitableEnemy,
        id: 'enemy-2',
        name: 'Goblin Archer',
        metadata: {
          recruitment: {
            conditions: [
              {
                id: 'damage_type',
                type: 'damage_type',
                description: '魔法攻撃で撃破する',
                parameters: {
                  damageType: 'magic',
                },
              },
            ],
            priority: 60,
            description: 'ゴブリンの弓兵を仲間にする',
            rewards: [],
          },
        },
      };

      const stageWithMultipleEnemies = {
        ...mockStageData,
        enemyUnits: [mockRecruitableEnemy, secondEnemy],
      };

      // Initialize with multiple enemies
      const initResult = recruitmentSystem.initialize(stageWithMultipleEnemies);
      expect(initResult.success).toBe(true);
      expect(initResult.details?.recruitableCount).toBe(2);

      // Get recruitable character IDs
      const recruitableIds = recruitmentSystem.getRecruitableCharacterIds();
      expect(recruitableIds).toContain('enemy-1');
      expect(recruitableIds).toContain('enemy-2');

      // Check conditions for both enemies
      const conditions1 = recruitmentSystem.getRecruitmentConditions(mockRecruitableEnemy);
      const conditions2 = recruitmentSystem.getRecruitmentConditions(secondEnemy);

      expect(conditions1).toHaveLength(2);
      expect(conditions2).toHaveLength(1);

      console.log('✅ Multiple recruitment test passed');
    });
  });

  describe('UI Integration', () => {
    test('should show and update recruitment UI correctly', () => {
      // Initialize system
      recruitmentSystem.initialize(mockStageData);

      // Mock UI methods
      const showConditionsSpy = jest.spyOn(recruitmentUI, 'showRecruitmentConditions');
      const updateProgressSpy = jest.spyOn(recruitmentUI, 'updateRecruitmentProgress');
      const showNPCIndicatorSpy = jest.spyOn(recruitmentUI, 'showNPCIndicator');
      const showSuccessSpy = jest.spyOn(recruitmentUI, 'showRecruitmentSuccess');

      // Show recruitment conditions
      const conditions = recruitmentSystem.getRecruitmentConditions(mockRecruitableEnemy);
      recruitmentUI.showRecruitmentConditions(mockRecruitableEnemy, conditions);
      expect(showConditionsSpy).toHaveBeenCalledWith(mockRecruitableEnemy, conditions);

      // Update progress
      const progress = recruitmentSystem.getRecruitmentProgress(mockRecruitableEnemy, {
        attacker: mockPlayerUnit,
        turn: 1,
      });
      if (progress) {
        recruitmentUI.updateRecruitmentProgress(mockRecruitableEnemy, progress);
        expect(updateProgressSpy).toHaveBeenCalledWith(mockRecruitableEnemy, progress);
      }

      // Show NPC indicator (simulate successful recruitment)
      mockRecruitableEnemy.currentHP = 25;
      const recruitmentResult = recruitmentSystem.processRecruitmentAttempt(
        mockPlayerUnit,
        mockRecruitableEnemy,
        25,
        undefined,
        1
      );

      if (recruitmentResult.success) {
        // Add sprite property for UI test
        (mockRecruitableEnemy as any).sprite = { x: 100, y: 100 };
        recruitmentUI.showNPCIndicator(mockRecruitableEnemy);
        expect(showNPCIndicatorSpy).toHaveBeenCalledWith(mockRecruitableEnemy);
      }

      // Show success notification
      recruitmentUI.showRecruitmentSuccess(mockRecruitableEnemy);
      expect(showSuccessSpy).toHaveBeenCalledWith(mockRecruitableEnemy);

      console.log('✅ UI integration test passed');
    });

    test('should handle UI error states correctly', () => {
      // Mock UI methods
      const showFailureSpy = jest.spyOn(recruitmentUI, 'showRecruitmentFailure');
      const hideIndicatorSpy = jest.spyOn(recruitmentUI, 'hideNPCIndicator');

      // Show failure notification
      recruitmentUI.showRecruitmentFailure(mockRecruitableEnemy, '仲間化条件を満たしていません');
      expect(showFailureSpy).toHaveBeenCalledWith(
        mockRecruitableEnemy,
        '仲間化条件を満たしていません'
      );

      // Hide NPC indicator
      recruitmentUI.hideNPCIndicator(mockRecruitableEnemy);
      expect(hideIndicatorSpy).toHaveBeenCalledWith(mockRecruitableEnemy);

      console.log('✅ UI error handling test passed');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large numbers of recruitable characters efficiently', () => {
      // Create stage with many recruitable enemies
      const manyEnemies: Unit[] = [];
      for (let i = 0; i < 50; i++) {
        manyEnemies.push({
          ...mockRecruitableEnemy,
          id: `enemy-${i}`,
          name: `Enemy ${i}`,
          position: { x: i % 10, y: Math.floor(i / 10) },
        });
      }

      const largeStage = {
        ...mockStageData,
        enemyUnits: manyEnemies,
      };

      // Measure initialization time
      const startTime = performance.now();
      const initResult = recruitmentSystem.initialize(largeStage);
      const endTime = performance.now();

      expect(initResult.success).toBe(true);
      expect(initResult.details?.recruitableCount).toBe(50);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms

      console.log(`✅ Performance test passed (${endTime - startTime}ms for 50 characters)`);
    });

    test('should handle invalid recruitment data gracefully', () => {
      // Create enemy with invalid recruitment metadata
      const invalidEnemy: Unit = {
        ...mockRecruitableEnemy,
        id: 'invalid-enemy',
        metadata: {
          recruitment: {
            conditions: [
              {
                id: 'invalid_condition',
                type: 'invalid_type' as any,
                description: 'Invalid condition',
                parameters: {},
              },
            ],
            priority: 50,
            description: 'Invalid enemy',
            rewards: [],
          },
        },
      };

      const stageWithInvalidEnemy = {
        ...mockStageData,
        enemyUnits: [invalidEnemy],
      };

      // Should handle invalid data gracefully
      const initResult = recruitmentSystem.initialize(stageWithInvalidEnemy);
      expect(initResult.success).toBe(true);

      // Invalid enemy should not be recruitable
      const conditions = recruitmentSystem.getRecruitmentConditions(invalidEnemy);
      expect(conditions).toHaveLength(0);

      console.log('✅ Invalid data handling test passed');
    });
  });
});

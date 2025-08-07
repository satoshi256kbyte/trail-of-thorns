/**
 * RecruitmentSystem integration tests
 * Tests the complete recruitment workflow and system integration
 */

import { RecruitmentSystem } from '../../../../game/src/systems/recruitment/RecruitmentSystem';
import { NPCStateManager } from '../../../../game/src/systems/recruitment/NPCStateManager';
import {
  RecruitmentStatus,
  RecruitmentAction,
  RecruitmentError,
  RecruitmentConditionType,
  RecruitmentUtils,
} from '../../../../game/src/types/recruitment';
import { Unit, StageData } from '../../../../game/src/types/gameplay';
import { BattleResult, DamageType } from '../../../../game/src/types/battle';

// Mock Phaser environment
const mockScene = {
  add: {
    container: jest.fn().mockReturnValue({
      add: jest.fn(),
      setDepth: jest.fn(),
      setScale: jest.fn(),
      destroy: jest.fn(),
    }),
    graphics: jest.fn().mockReturnValue({
      fillStyle: jest.fn(),
      fillRoundedRect: jest.fn(),
      fillCircle: jest.fn(),
    }),
  },
  tweens: {
    add: jest.fn(),
  },
} as any;

const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
} as any;

describe('RecruitmentSystem Integration Tests', () => {
  let recruitmentSystem: RecruitmentSystem;
  let mockStageData: StageData;
  let mockPlayerUnits: Unit[];
  let mockEnemyUnits: Unit[];

  beforeEach(() => {
    jest.clearAllMocks();

    recruitmentSystem = new RecruitmentSystem(mockScene, undefined, mockEventEmitter);

    // Create comprehensive test units
    mockPlayerUnits = [
      {
        id: 'hero',
        name: 'Hero',
        position: { x: 0, y: 0 },
        stats: { maxHP: 120, maxMP: 60, attack: 25, defense: 20, speed: 15, movement: 4 },
        currentHP: 120,
        currentMP: 60,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        equipment: {},
      },
      {
        id: 'mage',
        name: 'Mage',
        position: { x: 1, y: 0 },
        stats: { maxHP: 80, maxMP: 100, attack: 30, defense: 10, speed: 12, movement: 3 },
        currentHP: 80,
        currentMP: 100,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        equipment: {},
      },
    ];

    mockEnemyUnits = [
      // Regular enemy (not recruitable)
      {
        id: 'orc-1',
        name: 'Orc Warrior',
        position: { x: 8, y: 8 },
        stats: { maxHP: 90, maxMP: 20, attack: 20, defense: 15, speed: 8, movement: 2 },
        currentHP: 90,
        currentMP: 20,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
        equipment: {},
      },
      // Recruitable enemy with simple conditions
      {
        id: 'knight-1',
        name: 'Enemy Knight',
        position: { x: 6, y: 6 },
        stats: { maxHP: 100, maxMP: 40, attack: 22, defense: 18, speed: 10, movement: 3 },
        currentHP: 100,
        currentMP: 40,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
        equipment: {},
        metadata: {
          recruitment: {
            conditions: [
              {
                id: 'hero-attacker',
                type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                description: 'Must be defeated by Hero',
                parameters: { attackerId: 'hero' },
              },
              {
                id: 'low-hp',
                type: RecruitmentConditionType.HP_THRESHOLD,
                description: 'HP must be below 40%',
                parameters: { threshold: 0.4 },
              },
            ],
            priority: 60,
            description: 'Recruit the honorable knight',
          },
        },
      } as any,
      // Recruitable enemy with complex conditions
      {
        id: 'archer-1',
        name: 'Elite Archer',
        position: { x: 7, y: 5 },
        stats: { maxHP: 80, maxMP: 50, attack: 28, defense: 12, speed: 18, movement: 4 },
        currentHP: 80,
        currentMP: 50,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
        equipment: {},
        metadata: {
          recruitment: {
            conditions: [
              {
                id: 'mage-attacker',
                type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                description: 'Must be defeated by Mage',
                parameters: { attackerId: 'mage' },
              },
              {
                id: 'magic-damage',
                type: RecruitmentConditionType.DAMAGE_TYPE,
                description: 'Must be defeated with magical damage',
                parameters: { damageType: 'magical' },
              },
              {
                id: 'turn-limit',
                type: RecruitmentConditionType.TURN_LIMIT,
                description: 'Must be recruited within 5 turns',
                parameters: { maxTurn: 5 },
              },
            ],
            priority: 80,
            description: 'Recruit the skilled archer',
          },
        },
      } as any,
    ];

    mockStageData = {
      id: 'integration-test-stage',
      name: 'Integration Test Stage',
      description: 'A comprehensive test stage',
      mapData: {
        width: 10,
        height: 10,
        tileSize: 32,
        layers: [
          {
            name: 'background',
            type: 'background',
            data: Array(10)
              .fill(null)
              .map(() => Array(10).fill(0)),
            visible: true,
            opacity: 1,
          },
        ],
        playerSpawns: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        enemySpawns: [
          { x: 8, y: 8 },
          { x: 6, y: 6 },
          { x: 7, y: 5 },
        ],
      },
      playerUnits: mockPlayerUnits,
      enemyUnits: mockEnemyUnits,
      victoryConditions: [
        {
          type: 'defeat_all',
          description: 'Defeat all enemies',
        },
      ],
    };
  });

  describe('Complete Recruitment Workflow', () => {
    it('should handle full recruitment workflow for simple conditions', async () => {
      // Initialize system
      const initResult = recruitmentSystem.initialize(mockStageData);
      expect(initResult.success).toBe(true);

      const hero = mockPlayerUnits[0];
      const knight = mockEnemyUnits[1];

      // Step 1: Check initial eligibility (should not be eligible)
      let eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(hero, knight, {
        damage: 30,
        turn: 1,
        alliedUnits: mockPlayerUnits,
        enemyUnits: mockEnemyUnits,
        npcUnits: [],
      });

      expect(eligibilityResult.success).toBe(false);
      expect(eligibilityResult.conditionsMet[0]).toBe(true); // Hero is attacking
      expect(eligibilityResult.conditionsMet[1]).toBe(false); // HP still high

      // Step 2: Damage the knight to meet HP threshold
      knight.currentHP = 35; // 35% of 100 HP

      eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(hero, knight, {
        damage: 40, // Enough to defeat
        turn: 1,
        alliedUnits: mockPlayerUnits,
        enemyUnits: mockEnemyUnits,
        npcUnits: [],
      });

      expect(eligibilityResult.success).toBe(true);
      expect(eligibilityResult.nextAction).toBe(RecruitmentAction.CONVERT_TO_NPC);
      expect(eligibilityResult.conditionsMet[0]).toBe(true);
      expect(eligibilityResult.conditionsMet[1]).toBe(true);

      // Step 3: Process recruitment attempt
      const battleResult: BattleResult = {
        attacker: hero,
        target: knight,
        weapon: { id: 'sword', name: 'Hero Sword' } as any,
        baseDamage: 40,
        finalDamage: 40,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 15,
        targetDefeated: true,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      const recruitmentResult = recruitmentSystem.processRecruitmentAttempt(
        hero,
        knight,
        40,
        battleResult,
        1
      );

      expect(recruitmentResult.success).toBe(true);
      expect(recruitmentResult.nextAction).toBe(RecruitmentAction.CONVERT_TO_NPC);
      expect(recruitmentResult.npcState).toBeDefined();

      // Verify knight is now an NPC
      expect(recruitmentSystem.isNPC(knight)).toBe(true);
      expect(knight.faction).toBe('player');
      expect(knight.hasActed).toBe(true);
      expect(knight.hasMoved).toBe(true);

      // Step 4: Complete recruitment at stage end
      knight.currentHP = 20; // NPC survives
      const allUnits = [...mockPlayerUnits, ...mockEnemyUnits];
      const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

      expect(recruitedUnits).toHaveLength(1);
      expect(recruitedUnits[0].unit.id).toBe('knight-1');
      expect(recruitedUnits[0].unit.faction).toBe('player');
      expect(recruitmentSystem.getRecruitmentStatus('knight-1')).toBe(RecruitmentStatus.RECRUITED);

      // Verify events were emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'recruitment-initialized',
        expect.any(Object)
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'recruitment-eligibility-checked',
        expect.any(Object)
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'recruitment-attempt-processed',
        expect.any(Object)
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-converted-to-npc',
        expect.any(Object)
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'recruitment-completed',
        expect.any(Object)
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'stage-recruitment-completed',
        expect.any(Object)
      );
    });

    it('should handle recruitment failure when NPC is defeated', async () => {
      // Initialize and convert to NPC
      recruitmentSystem.initialize(mockStageData);
      const hero = mockPlayerUnits[0];
      const knight = mockEnemyUnits[1];

      // Set up for successful recruitment
      knight.currentHP = 35;
      recruitmentSystem.processRecruitmentAttempt(hero, knight, 40, undefined, 1);

      expect(recruitmentSystem.isNPC(knight)).toBe(true);

      // NPC is defeated before stage completion
      knight.currentHP = 0;

      const allUnits = [...mockPlayerUnits, ...mockEnemyUnits];
      const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

      expect(recruitedUnits).toHaveLength(0);
      expect(recruitmentSystem.getRecruitmentStatus('knight-1')).toBe(RecruitmentStatus.FAILED);

      // Verify failure event was emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-failed', {
        unitId: 'knight-1',
        reason: RecruitmentError.NPC_ALREADY_DEFEATED,
      });
    });

    it('should handle complex recruitment conditions', async () => {
      recruitmentSystem.initialize(mockStageData);
      const mage = mockPlayerUnits[1];
      const archer = mockEnemyUnits[2];

      // Test with wrong attacker
      let eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(
        mockPlayerUnits[0], // Hero instead of Mage
        archer,
        {
          damage: 50,
          turn: 3,
          battleResult: {
            damageType: 'magical',
          } as any,
          alliedUnits: mockPlayerUnits,
          enemyUnits: mockEnemyUnits,
          npcUnits: [],
        }
      );

      expect(eligibilityResult.success).toBe(false);
      expect(eligibilityResult.conditionsMet[0]).toBe(false); // Wrong attacker

      // Test with correct attacker but wrong damage type
      eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(mage, archer, {
        damage: 50,
        turn: 3,
        battleResult: {
          damageType: 'physical',
        } as any,
        alliedUnits: mockPlayerUnits,
        enemyUnits: mockEnemyUnits,
        npcUnits: [],
      });

      expect(eligibilityResult.success).toBe(false);
      expect(eligibilityResult.conditionsMet[0]).toBe(true); // Correct attacker
      expect(eligibilityResult.conditionsMet[1]).toBe(false); // Wrong damage type

      // Test with turn limit exceeded
      eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(mage, archer, {
        damage: 50,
        turn: 6, // Exceeds turn limit of 5
        battleResult: {
          damageType: 'magical',
        } as any,
        alliedUnits: mockPlayerUnits,
        enemyUnits: mockEnemyUnits,
        npcUnits: [],
      });

      expect(eligibilityResult.success).toBe(false);
      expect(eligibilityResult.conditionsMet[2]).toBe(false); // Turn limit exceeded

      // Test with all conditions met
      eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(mage, archer, {
        damage: 85, // Enough to defeat
        turn: 4,
        battleResult: {
          damageType: 'magical',
        } as any,
        alliedUnits: mockPlayerUnits,
        enemyUnits: mockEnemyUnits,
        npcUnits: [],
      });

      expect(eligibilityResult.success).toBe(true);
      expect(eligibilityResult.conditionsMet.every(met => met)).toBe(true);
    });
  });

  describe('Multiple Recruitment Management', () => {
    it('should handle multiple simultaneous recruitments', async () => {
      recruitmentSystem.initialize(mockStageData);

      const hero = mockPlayerUnits[0];
      const mage = mockPlayerUnits[1];
      const knight = mockEnemyUnits[1];
      const archer = mockEnemyUnits[2];

      // Set up both units for recruitment
      knight.currentHP = 35; // Below 40% threshold
      archer.currentHP = 80; // Full HP for archer

      // Recruit knight
      const knightRecruitment = recruitmentSystem.processRecruitmentAttempt(
        hero,
        knight,
        40,
        undefined,
        1
      );

      expect(knightRecruitment.success).toBe(true);
      expect(recruitmentSystem.isNPC(knight)).toBe(true);

      // Recruit archer
      const archerRecruitment = recruitmentSystem.processRecruitmentAttempt(
        mage,
        archer,
        85,
        {
          damageType: 'magical',
        } as any,
        4
      );

      expect(archerRecruitment.success).toBe(true);
      expect(recruitmentSystem.isNPC(archer)).toBe(true);

      // Both should be NPCs
      const stats = recruitmentSystem.getRecruitmentStatistics();
      expect(stats.currentNPCs).toBe(2);

      // Complete recruitment for both
      knight.currentHP = 20;
      archer.currentHP = 30;

      const allUnits = [...mockPlayerUnits, ...mockEnemyUnits];
      const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

      expect(recruitedUnits).toHaveLength(2);
      expect(recruitedUnits.map(ru => ru.unit.id)).toContain('knight-1');
      expect(recruitedUnits.map(ru => ru.unit.id)).toContain('archer-1');
    });

    it('should handle mixed success and failure in multiple recruitments', async () => {
      recruitmentSystem.initialize(mockStageData);

      const hero = mockPlayerUnits[0];
      const mage = mockPlayerUnits[1];
      const knight = mockEnemyUnits[1];
      const archer = mockEnemyUnits[2];

      // Convert both to NPCs
      knight.currentHP = 35;
      recruitmentSystem.processRecruitmentAttempt(hero, knight, 40, undefined, 1);

      archer.currentHP = 80;
      recruitmentSystem.processRecruitmentAttempt(
        mage,
        archer,
        85,
        { damageType: 'magical' } as any,
        4
      );

      // Knight survives, archer is defeated
      knight.currentHP = 25;
      archer.currentHP = 0;

      const allUnits = [...mockPlayerUnits, ...mockEnemyUnits];
      const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

      expect(recruitedUnits).toHaveLength(1);
      expect(recruitedUnits[0].unit.id).toBe('knight-1');
      expect(recruitmentSystem.getRecruitmentStatus('knight-1')).toBe(RecruitmentStatus.RECRUITED);
      expect(recruitmentSystem.getRecruitmentStatus('archer-1')).toBe(RecruitmentStatus.FAILED);
    });
  });

  describe('System State Management', () => {
    it('should maintain consistent state throughout recruitment process', async () => {
      recruitmentSystem.initialize(mockStageData);

      // Initial state
      let stats = recruitmentSystem.getRecruitmentStatistics();
      expect(stats.totalRecruitableCharacters).toBe(2);
      expect(stats.availableForRecruitment).toBe(2);
      expect(stats.currentNPCs).toBe(0);

      const hero = mockPlayerUnits[0];
      const knight = mockEnemyUnits[1];

      // After conversion to NPC
      knight.currentHP = 35;
      recruitmentSystem.processRecruitmentAttempt(hero, knight, 40, undefined, 1);

      stats = recruitmentSystem.getRecruitmentStatistics();
      expect(stats.availableForRecruitment).toBe(1); // One less available
      expect(stats.currentNPCs).toBe(1);
      expect(stats.recruitmentsByStatus[RecruitmentStatus.NPC_STATE]).toBe(1);

      // After successful recruitment
      knight.currentHP = 20;
      const allUnits = [...mockPlayerUnits, ...mockEnemyUnits];
      recruitmentSystem.completeRecruitment(allUnits);

      stats = recruitmentSystem.getRecruitmentStatistics();
      expect(stats.recruitedCharacters).toBe(1);
      expect(stats.currentNPCs).toBe(0); // NPC state removed after recruitment
      expect(stats.recruitmentsByStatus[RecruitmentStatus.RECRUITED]).toBe(1);
    });

    it('should handle system reset correctly', async () => {
      recruitmentSystem.initialize(mockStageData);

      const hero = mockPlayerUnits[0];
      const knight = mockEnemyUnits[1];

      // Set up some state
      knight.currentHP = 35;
      recruitmentSystem.processRecruitmentAttempt(hero, knight, 40, undefined, 1);

      expect(recruitmentSystem.isReady()).toBe(true);
      expect(recruitmentSystem.getRecruitableCharacterIds()).toHaveLength(2);
      expect(recruitmentSystem.isNPC(knight)).toBe(true);

      // Reset system
      recruitmentSystem.reset();

      expect(recruitmentSystem.isReady()).toBe(false);
      expect(recruitmentSystem.getRecruitableCharacterIds()).toHaveLength(0);
      expect(recruitmentSystem.isNPC(knight)).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted recruitment data gracefully', async () => {
      // Create stage data with invalid recruitment conditions
      const corruptedEnemyUnit = {
        ...mockEnemyUnits[1],
        metadata: {
          recruitment: {
            conditions: [
              {
                id: 'invalid-condition',
                type: 'invalid_type' as any,
                description: 'Invalid condition',
                parameters: null,
              },
            ],
          },
        },
      };

      const corruptedStageData = {
        ...mockStageData,
        enemyUnits: [mockEnemyUnits[0], corruptedEnemyUnit, mockEnemyUnits[2]],
      };

      const result = recruitmentSystem.initialize(corruptedStageData);

      // Should still initialize but with fewer recruitable characters
      expect(result.success).toBe(true);
      expect(recruitmentSystem.getRecruitableCharacterIds()).toHaveLength(1); // Only archer should be valid
    });

    it('should handle NPC limit correctly', async () => {
      // Set low NPC limit
      recruitmentSystem.updateConfig({ maxNPCsPerStage: 1 });
      recruitmentSystem.initialize(mockStageData);

      const hero = mockPlayerUnits[0];
      const mage = mockPlayerUnits[1];
      const knight = mockEnemyUnits[1];
      const archer = mockEnemyUnits[2];

      // Convert first unit to NPC
      knight.currentHP = 35;
      const firstResult = recruitmentSystem.processRecruitmentAttempt(
        hero,
        knight,
        40,
        undefined,
        1
      );
      expect(firstResult.success).toBe(true);

      // Try to convert second unit (should fail due to limit)
      archer.currentHP = 80;
      const secondResult = recruitmentSystem.processRecruitmentAttempt(
        mage,
        archer,
        85,
        { damageType: 'magical' } as any,
        4
      );

      // The eligibility check should pass, but conversion should fail
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe(RecruitmentError.SYSTEM_ERROR);
    });

    it('should handle missing units in completion phase', async () => {
      recruitmentSystem.initialize(mockStageData);

      const hero = mockPlayerUnits[0];
      const knight = mockEnemyUnits[1];

      // Convert to NPC
      knight.currentHP = 35;
      recruitmentSystem.processRecruitmentAttempt(hero, knight, 40, undefined, 1);

      // Complete recruitment with incomplete unit list (missing the NPC)
      const incompleteUnits = [...mockPlayerUnits, mockEnemyUnits[0], mockEnemyUnits[2]];
      const recruitedUnits = recruitmentSystem.completeRecruitment(incompleteUnits);

      expect(recruitedUnits).toHaveLength(0);
      // When units are missing from the completion phase, they are added to failedUnits
      // but no recruitment-failed event is emitted (since the unit wasn't found)
      // Instead, we should check that the stage-recruitment-completed event was emitted with failed units
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'stage-recruitment-completed',
        expect.objectContaining({
          recruitedUnits: [],
          failedUnits: ['knight-1'],
        })
      );
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of recruitment attempts efficiently', async () => {
      recruitmentSystem.initialize(mockStageData);

      const hero = mockPlayerUnits[0];
      const knight = mockEnemyUnits[1];

      const startTime = Date.now();

      // Perform many eligibility checks
      for (let i = 0; i < 1000; i++) {
        recruitmentSystem.checkRecruitmentEligibility(hero, knight, {
          damage: 30,
          turn: 1,
          alliedUnits: mockPlayerUnits,
          enemyUnits: mockEnemyUnits,
          npcUnits: [],
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should properly clean up resources on destroy', async () => {
      recruitmentSystem.initialize(mockStageData);

      const hero = mockPlayerUnits[0];
      const knight = mockEnemyUnits[1];

      // Set up some state
      knight.currentHP = 35;
      recruitmentSystem.processRecruitmentAttempt(hero, knight, 40, undefined, 1);

      // Destroy system
      recruitmentSystem.destroy();

      // Verify cleanup
      expect(recruitmentSystem.isReady()).toBe(false);
      expect(recruitmentSystem.getRecruitableCharacterIds()).toHaveLength(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-system-destroyed');
    });
  });
});

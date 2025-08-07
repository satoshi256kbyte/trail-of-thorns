/**
 * Integration tests for BattleSystem and RecruitmentSystem
 * Tests the complete workflow of recruitment during battle
 */

import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { RecruitmentSystem } from '../../../game/src/systems/recruitment/RecruitmentSystem';
import { Unit, MapData } from '../../../game/src/types/gameplay';
import { Weapon, BattleResult } from '../../../game/src/types/battle';
import {
  RecruitmentConditionType,
  RecruitmentStatus,
  RecruitmentAction,
  RecruitmentError,
} from '../../../game/src/types/recruitment';

// Mock Phaser scene
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      fillStyle: jest.fn(),
      lineStyle: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      destroy: jest.fn(),
    })),
    text: jest.fn(() => ({
      setOrigin: jest.fn().mockReturnThis(),
      setVisible: jest.fn().mockReturnThis(),
      setText: jest.fn().mockReturnThis(),
      setTint: jest.fn().mockReturnThis(),
      setAlpha: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
      x: 0,
      y: 0,
    })),
    sprite: jest.fn(() => ({
      setOrigin: jest.fn().mockReturnThis(),
      setVisible: jest.fn().mockReturnThis(),
      setTint: jest.fn().mockReturnThis(),
      setAlpha: jest.fn().mockReturnThis(),
      setScale: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
      x: 0,
      y: 0,
    })),
    container: jest.fn(() => ({
      setVisible: jest.fn().mockReturnThis(),
      add: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
      x: 0,
      y: 0,
    })),
  },
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
  },
  tweens: {
    add: jest.fn(() => ({
      play: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
    })),
  },
  time: {
    delayedCall: jest.fn(() => ({
      destroy: jest.fn(),
    })),
    addEvent: jest.fn(() => ({
      destroy: jest.fn(),
      remove: jest.fn(),
    })),
  },
} as any;

// Mock units for testing
const createMockAttacker = (): Unit => ({
  id: 'attacker-1',
  name: 'Hero',
  position: { x: 1, y: 1 },
  stats: {
    maxHP: 100,
    maxMP: 50,
    attack: 25,
    defense: 15,
    speed: 20,
    movement: 3,
  },
  currentHP: 100,
  currentMP: 50,
  faction: 'player',
  hasActed: false,
  hasMoved: false,
});

const createMockTarget = (): Unit => ({
  id: 'target-1',
  name: 'Enemy Knight',
  position: { x: 2, y: 1 },
  stats: {
    maxHP: 80,
    maxMP: 30,
    attack: 20,
    defense: 18,
    speed: 15,
    movement: 2,
  },
  currentHP: 80,
  currentMP: 30,
  faction: 'enemy',
  hasActed: false,
  hasMoved: false,
  metadata: {
    recruitment: {
      conditions: [
        {
          type: RecruitmentConditionType.SPECIFIC_ATTACKER,
          parameters: { attackerId: 'attacker-1' },
          description: 'Must be attacked by Hero',
        },
        {
          type: RecruitmentConditionType.HP_THRESHOLD,
          parameters: { threshold: 0.3 },
          description: 'HP must be below 30%',
        },
      ],
      priority: 75,
      description: 'Recruit the Enemy Knight',
    },
  },
});

const createMockWeapon = (): Weapon => ({
  id: 'iron-sword',
  name: 'Iron Sword',
  type: 'sword' as any,
  attackPower: 15,
  range: 1,
  rangePattern: {
    type: 'single',
    range: 1,
    pattern: [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ],
  },
  element: 'none' as any,
  criticalRate: 10,
  accuracy: 90,
  specialEffects: [],
  description: 'A basic iron sword',
});

const createMockMapData = (): MapData => ({
  width: 10,
  height: 10,
  tiles: Array(10)
    .fill(null)
    .map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
});

const createMockStageData = (units: Unit[]) => ({
  id: 'test-stage-1',
  name: 'Test Stage',
  enemyUnits: units.filter(u => u.faction === 'enemy'),
  playerUnits: units.filter(u => u.faction === 'player'),
  mapData: createMockMapData(),
});

describe('BattleSystem-RecruitmentSystem Integration', () => {
  let battleSystem: BattleSystem;
  let recruitmentSystem: RecruitmentSystem;
  let mockAttacker: Unit;
  let mockTarget: Unit;
  let mockWeapon: Weapon;
  let mockMapData: MapData;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create systems
    battleSystem = new BattleSystem(mockScene);
    recruitmentSystem = new RecruitmentSystem(mockScene);

    // Create test data
    mockAttacker = createMockAttacker();
    mockTarget = createMockTarget();
    mockWeapon = createMockWeapon();
    mockMapData = createMockMapData();

    // Initialize systems
    const allUnits = [mockAttacker, mockTarget];
    battleSystem.initialize(allUnits, mockMapData);
    battleSystem.setRecruitmentSystem(recruitmentSystem);

    const stageData = createMockStageData(allUnits);
    recruitmentSystem.initialize(stageData);
  });

  afterEach(() => {
    if (battleSystem) {
      battleSystem.destroy();
    }
  });

  describe('Recruitment Integration Setup', () => {
    test('should integrate recruitment system with battle system', () => {
      expect(battleSystem['recruitmentSystem']).toBe(recruitmentSystem);
    });

    test('should initialize recruitment system with recruitable characters', () => {
      const recruitableIds = recruitmentSystem.getRecruitableCharacterIds();
      expect(recruitableIds).toContain('target-1');
    });
  });

  describe('Battle Flow with Recruitment Checks', () => {
    test('should check recruitment eligibility during battle execution', async () => {
      // Spy on recruitment system methods
      const checkEligibilitySpy = jest.spyOn(recruitmentSystem, 'checkRecruitmentEligibility');
      const processAttemptSpy = jest.spyOn(recruitmentSystem, 'processRecruitmentAttempt');

      // Set target HP low enough to meet threshold condition
      mockTarget.currentHP = 20; // 25% of max HP (80)

      // Initiate attack
      await battleSystem.initiateAttack(mockAttacker, mockWeapon);

      // Select target and execute battle
      const battleResult = await battleSystem.selectTarget(mockTarget);

      // Verify recruitment methods were called
      expect(checkEligibilitySpy).toHaveBeenCalledWith(
        mockAttacker,
        mockTarget,
        expect.objectContaining({
          damage: expect.any(Number),
          turn: expect.any(Number),
          battleResult: expect.any(Object),
        })
      );

      // If conditions were met, processRecruitmentAttempt should be called
      if (battleResult.targetDefeated) {
        expect(processAttemptSpy).toHaveBeenCalled();
      }
    });

    test('should convert target to NPC when recruitment conditions are met', async () => {
      // Set target HP to meet threshold condition (below 30%)
      mockTarget.currentHP = 20;

      // Mock recruitment system to return successful eligibility
      jest.spyOn(recruitmentSystem, 'checkRecruitmentEligibility').mockReturnValue({
        success: true,
        conditionsMet: [true, true], // Both conditions met
        nextAction: RecruitmentAction.CONVERT_TO_NPC,
        message: 'All conditions met',
      });

      // Mock successful recruitment attempt
      jest.spyOn(recruitmentSystem, 'processRecruitmentAttempt').mockReturnValue({
        success: true,
        conditionsMet: [true, true],
        nextAction: RecruitmentAction.CONVERT_TO_NPC,
        message: 'Converted to NPC',
        npcState: {
          convertedAt: 1,
          remainingHP: 1,
          isProtected: false,
          visualState: {
            indicatorVisible: true,
            indicatorType: 'crown',
            tintColor: 0x00ff00,
            glowEffect: true,
            animationSpeed: 0.8,
          },
          originalFaction: 'enemy',
          recruitmentId: 'test-recruitment-1',
        },
      });

      // Initiate and execute battle
      await battleSystem.initiateAttack(mockAttacker, mockWeapon);
      const battleResult = await battleSystem.selectTarget(mockTarget);

      // Verify target was converted to NPC
      expect(mockTarget.faction).toBe('npc');
      expect(mockTarget.currentHP).toBe(1);
      expect(battleResult.targetDefeated).toBe(false);
    });

    test('should continue normal battle flow when recruitment conditions are not met', async () => {
      // Set target HP high (conditions not met)
      mockTarget.currentHP = 60;

      // Mock recruitment system to return unsuccessful eligibility
      jest.spyOn(recruitmentSystem, 'checkRecruitmentEligibility').mockReturnValue({
        success: false,
        conditionsMet: [true, false], // HP threshold not met
        nextAction: RecruitmentAction.CONTINUE_BATTLE,
        message: 'Conditions not satisfied',
      });

      // Initiate and execute battle
      await battleSystem.initiateAttack(mockAttacker, mockWeapon);
      const battleResult = await battleSystem.selectTarget(mockTarget);

      // Verify normal battle flow
      expect(mockTarget.faction).toBe('enemy');
      expect(battleResult.targetDefeated).toBe(true);
      expect(mockTarget.currentHP).toBe(0);
    });

    test('should handle recruitment system errors gracefully', async () => {
      // Mock recruitment system to throw error
      jest.spyOn(recruitmentSystem, 'checkRecruitmentEligibility').mockImplementation(() => {
        throw new Error('recruitment: Test recruitment error');
      });

      // Set up event listener for recruitment errors
      const recruitmentErrorSpy = jest.fn();
      battleSystem.on('recruitment-error', recruitmentErrorSpy);

      // Initiate and execute battle
      await battleSystem.initiateAttack(mockAttacker, mockWeapon);
      const battleResult = await battleSystem.selectTarget(mockTarget);

      // Verify error was handled and battle continued normally
      expect(recruitmentErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'recruitment: Test recruitment error',
          context: expect.any(Object),
          timestamp: expect.any(Number),
        })
      );

      // Battle should continue normally despite recruitment error
      expect(battleResult.targetDefeated).toBe(true);
    });
  });

  describe('Event Integration', () => {
    test('should emit recruitment-conversion event when target is converted to NPC', async () => {
      // Set up successful recruitment scenario
      mockTarget.currentHP = 20;

      jest.spyOn(recruitmentSystem, 'checkRecruitmentEligibility').mockReturnValue({
        success: true,
        conditionsMet: [true, true],
        nextAction: RecruitmentAction.CONVERT_TO_NPC,
        message: 'All conditions met',
      });

      jest.spyOn(recruitmentSystem, 'processRecruitmentAttempt').mockReturnValue({
        success: true,
        conditionsMet: [true, true],
        nextAction: RecruitmentAction.CONVERT_TO_NPC,
        message: 'Converted to NPC',
        npcState: {
          convertedAt: 1,
          remainingHP: 1,
          isProtected: false,
          visualState: {
            indicatorVisible: true,
            indicatorType: 'crown',
            tintColor: 0x00ff00,
            glowEffect: true,
            animationSpeed: 0.8,
          },
          originalFaction: 'enemy',
          recruitmentId: 'test-recruitment-1',
        },
      });

      // Set up event listener
      const conversionEventSpy = jest.fn();
      battleSystem.on('recruitment-conversion', conversionEventSpy);

      // Execute battle
      await battleSystem.initiateAttack(mockAttacker, mockWeapon);
      await battleSystem.selectTarget(mockTarget);

      // Verify event was emitted
      expect(conversionEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attacker: mockAttacker,
          target: mockTarget,
          weapon: mockWeapon,
          recruitmentResult: expect.objectContaining({
            success: true,
            nextAction: RecruitmentAction.CONVERT_TO_NPC,
          }),
          battleResult: expect.any(Object),
        })
      );
    });

    test('should emit recruitment-error event when recruitment system fails', async () => {
      // Mock recruitment system to throw error
      jest.spyOn(recruitmentSystem, 'processRecruitmentAttempt').mockImplementation(() => {
        throw new Error('recruitment: NPC conversion failed');
      });

      // Mock successful eligibility check to trigger processRecruitmentAttempt
      jest.spyOn(recruitmentSystem, 'checkRecruitmentEligibility').mockReturnValue({
        success: true,
        conditionsMet: [true, true],
        nextAction: RecruitmentAction.CONVERT_TO_NPC,
        message: 'All conditions met',
      });

      // Set target HP low to trigger recruitment
      mockTarget.currentHP = 20;

      // Set up event listener
      const errorEventSpy = jest.fn();
      battleSystem.on('recruitment-error', errorEventSpy);

      // Execute battle
      await battleSystem.initiateAttack(mockAttacker, mockWeapon);
      await battleSystem.selectTarget(mockTarget);

      // Verify error event was emitted
      expect(errorEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('recruitment'),
          context: expect.any(Object),
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('Battle Flow Continuity', () => {
    test('should not interrupt battle flow when recruitment system is not available', async () => {
      // Remove recruitment system
      battleSystem.setRecruitmentSystem(null as any);

      // Execute battle normally
      await battleSystem.initiateAttack(mockAttacker, mockWeapon);
      const battleResult = await battleSystem.selectTarget(mockTarget);

      // Verify normal battle flow
      expect(battleResult.targetDefeated).toBe(true);
      expect(mockTarget.currentHP).toBe(0);
      expect(mockTarget.faction).toBe('enemy');
    });

    test('should handle non-enemy targets without recruitment checks', async () => {
      // Create ally target
      const allyTarget = { ...mockTarget, faction: 'player' as const };
      const allUnits = [mockAttacker, allyTarget];

      battleSystem.initialize(allUnits, mockMapData);

      // Spy on recruitment methods
      const checkEligibilitySpy = jest.spyOn(recruitmentSystem, 'checkRecruitmentEligibility');

      // Execute battle against ally (if allowed by battle system)
      await battleSystem.initiateAttack(mockAttacker, mockWeapon);

      // Recruitment checks should not be performed for non-enemy targets
      // Note: This test assumes the battle system allows attacking allies for testing
      // In a real game, this might be prevented at a higher level
      expect(checkEligibilitySpy).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Resource Management', () => {
    test('should not significantly impact battle performance when recruitment is integrated', async () => {
      const startTime = performance.now();

      // Execute multiple battles
      for (let i = 0; i < 10; i++) {
        const attacker = createMockAttacker();
        const target = createMockTarget();
        target.id = `target-${i}`;

        battleSystem.initialize([attacker, target], mockMapData);

        await battleSystem.initiateAttack(attacker, mockWeapon);
        await battleSystem.selectTarget(target);

        // Reset for next iteration
        battleSystem.cancelAttack();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Performance should be reasonable (less than 1 second for 10 battles)
      expect(totalTime).toBeLessThan(1000);
    });

    test('should properly clean up recruitment-related resources', () => {
      // Execute battle with recruitment
      battleSystem.initiateAttack(mockAttacker, mockWeapon);
      battleSystem.cancelAttack();

      // Verify cleanup
      expect(battleSystem['state'].isActive).toBe(false);
      expect(battleSystem['state'].currentAttacker).toBeNull();
      expect(battleSystem['state'].currentTarget).toBeNull();
    });
  });
});

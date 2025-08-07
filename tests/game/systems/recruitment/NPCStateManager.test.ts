/**
 * Unit tests for NPCStateManager
 * Tests NPC state management functionality including conversion, damage handling, and visual updates
 */

import {
  NPCStateManager,
  NPCStateManagerConfig,
  NPCConversionResult,
  NPCDamageResult,
} from '../../../../game/src/systems/recruitment/NPCStateManager';
import {
  NPCState,
  NPCVisualState,
  RecruitmentError,
  RecruitmentUtils,
} from '../../../../game/src/types/recruitment';
import { Unit, Position } from '../../../../game/src/types/gameplay';

// Mock Phaser objects
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
} as any;

// Helper function to create mock units
function createMockUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'test-unit-1',
    name: 'Test Unit',
    position: { x: 5, y: 5 },
    stats: {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      movement: 3,
    },
    currentHP: 80,
    currentMP: 30,
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    equipment: {},
    sprite: {
      x: 160,
      y: 160,
      setTint: jest.fn(),
      clearTint: jest.fn(),
      setScale: jest.fn(),
      scale: 1.0,
    } as any,
    ...overrides,
  };
}

describe('NPCStateManager', () => {
  let npcStateManager: NPCStateManager;
  let mockUnit: Unit;

  beforeEach(() => {
    jest.clearAllMocks();
    npcStateManager = new NPCStateManager(mockScene, undefined, mockEventEmitter);
    mockUnit = createMockUnit();
  });

  afterEach(() => {
    npcStateManager.destroy();
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      const manager = new NPCStateManager();
      const config = manager.getConfig();

      expect(config.defaultNPCPriority).toBe(100);
      expect(config.maxNPCsPerStage).toBe(3);
      expect(config.autoShowIndicators).toBe(true);
      expect(config.enableProtection).toBe(true);
    });

    test('should accept custom configuration', () => {
      const customConfig: Partial<NPCStateManagerConfig> = {
        defaultNPCPriority: 150,
        maxNPCsPerStage: 5,
        autoShowIndicators: false,
      };

      const manager = new NPCStateManager(undefined, customConfig);
      const config = manager.getConfig();

      expect(config.defaultNPCPriority).toBe(150);
      expect(config.maxNPCsPerStage).toBe(5);
      expect(config.autoShowIndicators).toBe(false);
      expect(config.enableProtection).toBe(true); // Should keep default
    });
  });

  describe('convertToNPC', () => {
    test('should successfully convert unit to NPC', () => {
      const recruitmentId = 'recruitment-123';
      const currentTurn = 5;

      const result = npcStateManager.convertToNPC(mockUnit, recruitmentId, currentTurn);

      expect(result.success).toBe(true);
      expect(result.npcState).toBeDefined();
      expect(result.npcState!.convertedAt).toBe(currentTurn);
      expect(result.npcState!.remainingHP).toBe(mockUnit.currentHP);
      expect(result.npcState!.originalFaction).toBe('enemy');
      expect(result.npcState!.recruitmentId).toBe(recruitmentId);

      // Unit should be marked as acted and moved
      expect(mockUnit.hasActed).toBe(true);
      expect(mockUnit.hasMoved).toBe(true);
      expect(mockUnit.faction).toBe('player');
    });

    test('should emit npc-converted event', () => {
      const recruitmentId = 'recruitment-123';
      const currentTurn = 5;

      npcStateManager.convertToNPC(mockUnit, recruitmentId, currentTurn);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-converted', {
        unitId: mockUnit.id,
        unit: mockUnit,
        npcState: expect.any(Object),
        turn: currentTurn,
      });
    });

    test('should fail with invalid unit', () => {
      const result = npcStateManager.convertToNPC(null as any, 'recruitment-123', 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
      expect(result.message).toContain('Invalid unit provided');
    });

    test('should fail with invalid recruitment ID', () => {
      const result = npcStateManager.convertToNPC(mockUnit, '', 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe(RecruitmentError.SYSTEM_ERROR);
      expect(result.message).toContain('Invalid recruitment ID');
    });

    test('should fail with invalid turn number', () => {
      const result = npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe(RecruitmentError.SYSTEM_ERROR);
      expect(result.message).toContain('Invalid turn number');
    });

    test('should fail if unit is already an NPC', () => {
      // First conversion should succeed
      const firstResult = npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
      expect(firstResult.success).toBe(true);

      // Second conversion should fail
      const secondResult = npcStateManager.convertToNPC(mockUnit, 'recruitment-456', 6);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe(RecruitmentError.SYSTEM_ERROR);
      expect(secondResult.message).toContain('already an NPC');
    });

    test('should fail when NPC limit is reached', () => {
      const customConfig: Partial<NPCStateManagerConfig> = {
        maxNPCsPerStage: 1,
      };
      const limitedManager = new NPCStateManager(undefined, customConfig);

      const unit1 = createMockUnit({ id: 'unit-1' });
      const unit2 = createMockUnit({ id: 'unit-2' });

      // First conversion should succeed
      const firstResult = limitedManager.convertToNPC(unit1, 'recruitment-1', 5);
      expect(firstResult.success).toBe(true);

      // Second conversion should fail due to limit
      const secondResult = limitedManager.convertToNPC(unit2, 'recruitment-2', 5);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe(RecruitmentError.SYSTEM_ERROR);
      expect(secondResult.message).toContain('Maximum NPCs per stage');

      limitedManager.destroy();
    });
  });

  describe('isNPC', () => {
    test('should return false for non-NPC unit', () => {
      expect(npcStateManager.isNPC(mockUnit)).toBe(false);
    });

    test('should return true for NPC unit', () => {
      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
      expect(npcStateManager.isNPC(mockUnit)).toBe(true);
    });

    test('should handle invalid unit gracefully', () => {
      expect(npcStateManager.isNPC(null as any)).toBe(false);
      expect(npcStateManager.isNPC(undefined as any)).toBe(false);
      expect(npcStateManager.isNPC({} as any)).toBe(false);
    });
  });

  describe('getNPCState', () => {
    test('should return undefined for non-NPC unit', () => {
      expect(npcStateManager.getNPCState(mockUnit)).toBeUndefined();
    });

    test('should return NPC state for NPC unit', () => {
      const recruitmentId = 'recruitment-123';
      const currentTurn = 5;

      npcStateManager.convertToNPC(mockUnit, recruitmentId, currentTurn);
      const npcState = npcStateManager.getNPCState(mockUnit);

      expect(npcState).toBeDefined();
      expect(npcState!.convertedAt).toBe(currentTurn);
      expect(npcState!.recruitmentId).toBe(recruitmentId);
    });

    test('should handle invalid unit gracefully', () => {
      expect(npcStateManager.getNPCState(null as any)).toBeUndefined();
      expect(npcStateManager.getNPCState(undefined as any)).toBeUndefined();
    });
  });

  describe('getNPCPriority', () => {
    test('should return 0 for non-NPC unit', () => {
      expect(npcStateManager.getNPCPriority(mockUnit)).toBe(0);
    });

    test('should return high priority for NPC unit', () => {
      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
      const priority = npcStateManager.getNPCPriority(mockUnit);

      expect(priority).toBeGreaterThan(0);
      expect(priority).toBeGreaterThanOrEqual(100); // Default base priority
    });

    test('should handle invalid unit gracefully', () => {
      expect(npcStateManager.getNPCPriority(null as any)).toBe(0);
      expect(npcStateManager.getNPCPriority(undefined as any)).toBe(0);
    });
  });

  describe('handleNPCDamage', () => {
    beforeEach(() => {
      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
    });

    test('should successfully handle damage to NPC', () => {
      const initialHP = mockUnit.currentHP;
      const damage = 20;

      const result = npcStateManager.handleNPCDamage(mockUnit, damage);

      expect(result.success).toBe(true);
      expect(result.remainingHP).toBe(initialHP - damage);
      expect(result.wasDefeated).toBe(false);
      expect(mockUnit.currentHP).toBe(initialHP - damage);
    });

    test('should handle NPC defeat', () => {
      const damage = mockUnit.currentHP + 10; // More than current HP

      const result = npcStateManager.handleNPCDamage(mockUnit, damage);

      expect(result.success).toBe(true);
      expect(result.remainingHP).toBe(0);
      expect(result.wasDefeated).toBe(true);
      expect(mockUnit.currentHP).toBe(0);

      // NPC should no longer be in NPC state
      expect(npcStateManager.isNPC(mockUnit)).toBe(false);
    });

    test('should emit npc-damaged event', () => {
      const damage = 20;

      npcStateManager.handleNPCDamage(mockUnit, damage);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-damaged', {
        unitId: mockUnit.id,
        unit: mockUnit,
        damage: damage,
        remainingHP: mockUnit.currentHP,
        wasDefeated: false,
        npcState: expect.any(Object),
      });
    });

    test('should emit npc-defeated event when NPC is defeated', () => {
      const damage = mockUnit.currentHP + 10;

      npcStateManager.handleNPCDamage(mockUnit, damage);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-defeated', {
        unitId: mockUnit.id,
        unit: mockUnit,
        recruitmentFailed: true,
      });
    });

    test('should fail with invalid unit', () => {
      const result = npcStateManager.handleNPCDamage(null as any, 20);

      expect(result.success).toBe(false);
      expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
    });

    test('should fail with invalid damage', () => {
      const result = npcStateManager.handleNPCDamage(mockUnit, -10);

      expect(result.success).toBe(false);
      expect(result.error).toBe(RecruitmentError.SYSTEM_ERROR);
      expect(result.message).toContain('Invalid damage amount');
    });

    test('should fail with non-NPC unit', () => {
      const nonNPCUnit = createMockUnit({ id: 'non-npc' });
      const result = npcStateManager.handleNPCDamage(nonNPCUnit, 20);

      expect(result.success).toBe(false);
      expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
      expect(result.message).toContain('Unit is not an NPC');
    });
  });

  describe('updateNPCVisuals', () => {
    beforeEach(() => {
      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
    });

    test('should update sprite tint', () => {
      npcStateManager.updateNPCVisuals(mockUnit);

      expect(mockUnit.sprite!.setTint).toHaveBeenCalled();
    });

    test('should handle unit without sprite gracefully', () => {
      const unitWithoutSprite = createMockUnit({ sprite: undefined });
      npcStateManager.convertToNPC(unitWithoutSprite, 'recruitment-123', 5);

      expect(() => {
        npcStateManager.updateNPCVisuals(unitWithoutSprite);
      }).not.toThrow();
    });

    test('should handle non-NPC unit gracefully', () => {
      const nonNPCUnit = createMockUnit({ id: 'non-npc' });

      expect(() => {
        npcStateManager.updateNPCVisuals(nonNPCUnit);
      }).not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    test('getNPCUnitIds should return array of NPC unit IDs', () => {
      expect(npcStateManager.getNPCUnitIds()).toEqual([]);

      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
      expect(npcStateManager.getNPCUnitIds()).toEqual([mockUnit.id]);

      const unit2 = createMockUnit({ id: 'unit-2' });
      npcStateManager.convertToNPC(unit2, 'recruitment-456', 6);
      expect(npcStateManager.getNPCUnitIds()).toEqual([mockUnit.id, unit2.id]);
    });

    test('getNPCCount should return correct count', () => {
      expect(npcStateManager.getNPCCount()).toBe(0);

      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
      expect(npcStateManager.getNPCCount()).toBe(1);

      const unit2 = createMockUnit({ id: 'unit-2' });
      npcStateManager.convertToNPC(unit2, 'recruitment-456', 6);
      expect(npcStateManager.getNPCCount()).toBe(2);
    });

    test('isAtNPCLimit should check limit correctly', () => {
      const customConfig: Partial<NPCStateManagerConfig> = {
        maxNPCsPerStage: 2,
      };
      const limitedManager = new NPCStateManager(undefined, customConfig);

      expect(limitedManager.isAtNPCLimit()).toBe(false);

      const unit1 = createMockUnit({ id: 'unit-1' });
      const unit2 = createMockUnit({ id: 'unit-2' });

      limitedManager.convertToNPC(unit1, 'recruitment-1', 5);
      expect(limitedManager.isAtNPCLimit()).toBe(false);

      limitedManager.convertToNPC(unit2, 'recruitment-2', 5);
      expect(limitedManager.isAtNPCLimit()).toBe(true);

      limitedManager.destroy();
    });

    test('removeNPCState should remove NPC state', () => {
      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
      expect(npcStateManager.isNPC(mockUnit)).toBe(true);

      const result = npcStateManager.removeNPCState(mockUnit);
      expect(result).toBe(true);
      expect(npcStateManager.isNPC(mockUnit)).toBe(false);
    });

    test('removeNPCState should return false for non-NPC', () => {
      const result = npcStateManager.removeNPCState(mockUnit);
      expect(result).toBe(false);
    });

    test('clearAllNPCStates should clear all NPCs', () => {
      const unit1 = createMockUnit({ id: 'unit-1' });
      const unit2 = createMockUnit({ id: 'unit-2' });

      npcStateManager.convertToNPC(unit1, 'recruitment-1', 5);
      npcStateManager.convertToNPC(unit2, 'recruitment-2', 5);

      expect(npcStateManager.getNPCCount()).toBe(2);

      npcStateManager.clearAllNPCStates();

      expect(npcStateManager.getNPCCount()).toBe(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('all-npcs-cleared');
    });
  });

  describe('Configuration Management', () => {
    test('updateConfig should update configuration', () => {
      const newConfig: Partial<NPCStateManagerConfig> = {
        defaultNPCPriority: 200,
        autoShowIndicators: false,
      };

      npcStateManager.updateConfig(newConfig);
      const config = npcStateManager.getConfig();

      expect(config.defaultNPCPriority).toBe(200);
      expect(config.autoShowIndicators).toBe(false);
      expect(config.maxNPCsPerStage).toBe(3); // Should keep original value
    });

    test('getConfig should return copy of configuration', () => {
      const config1 = npcStateManager.getConfig();
      const config2 = npcStateManager.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });

  describe('Validation and Statistics', () => {
    test('validateNPCStates should return empty array for valid states', () => {
      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
      const errors = npcStateManager.validateNPCStates();

      expect(errors).toEqual([]);
    });

    test('getNPCStatistics should return correct statistics', () => {
      expect(npcStateManager.getNPCStatistics().totalNPCs).toBe(0);

      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
      const stats = npcStateManager.getNPCStatistics();

      expect(stats.totalNPCs).toBe(1);
      expect(stats.averageHP).toBe(mockUnit.currentHP);
      expect(stats.protectedNPCs).toBe(1); // Default is protected
      expect(stats.originalFactions.enemy).toBe(1);
      expect(stats.originalFactions.player).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully in all methods', () => {
      // Test with malformed unit object
      const malformedUnit = { id: null } as any;

      expect(() => npcStateManager.isNPC(malformedUnit)).not.toThrow();
      expect(() => npcStateManager.getNPCState(malformedUnit)).not.toThrow();
      expect(() => npcStateManager.getNPCPriority(malformedUnit)).not.toThrow();
      expect(() => npcStateManager.updateNPCVisuals(malformedUnit)).not.toThrow();
    });

    test('should handle scene without required methods', () => {
      const incompleteScene = {} as any;
      const manager = new NPCStateManager(incompleteScene);

      manager.convertToNPC(mockUnit, 'recruitment-123', 5);

      expect(() => {
        manager.updateNPCVisuals(mockUnit);
      }).not.toThrow();

      manager.destroy();
    });
  });

  describe('Cleanup', () => {
    test('destroy should clean up all resources', () => {
      npcStateManager.convertToNPC(mockUnit, 'recruitment-123', 5);
      expect(npcStateManager.getNPCCount()).toBe(1);

      npcStateManager.destroy();

      expect(npcStateManager.getNPCCount()).toBe(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-state-manager-destroyed');
    });
  });
});

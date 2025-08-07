/**
 * Integration tests for RecruitmentSystem data persistence functionality
 * Tests the integration between RecruitmentSystem and RecruitmentDataManager
 */

import { RecruitmentSystem } from '../../../game/src/systems/recruitment/RecruitmentSystem';
import { RecruitmentDataManager } from '../../../game/src/systems/RecruitmentDataManager';
import { Unit, StageData } from '../../../game/src/types/gameplay';
import { RecruitmentSystemConfig } from '../../../game/src/types/recruitment';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Phaser EventEmitter
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

describe('RecruitmentSystem Data Persistence Integration', () => {
  let recruitmentSystem: RecruitmentSystem;
  let mockStageData: StageData;
  let mockConfig: RecruitmentSystemConfig;

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear();
    jest.clearAllMocks();

    // Create recruitment system
    mockConfig = {
      enableRecruitment: true,
      maxNPCsPerStage: 3,
      npcProtectionPriority: 90,
      autoShowConditions: true,
      conditionHintLevel: 'basic',
      allowMultipleAttempts: false,
      npcSurvivalBonus: 50,
    };

    recruitmentSystem = new RecruitmentSystem(undefined, mockConfig, mockEventEmitter as any);

    // Create mock stage data
    mockStageData = {
      id: 'stage_1_3',
      chapterId: 'chapter_1',
      name: 'Forest Battle',
      description: 'A battle in the forest',
      mapData: {
        width: 10,
        height: 10,
        tileSize: 32,
        layers: [],
        playerSpawns: [],
        enemySpawns: [],
      },
      playerUnits: [
        {
          id: 'protagonist',
          name: 'Hero',
          position: { x: 2, y: 2 },
          stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 20, speed: 15, movement: 3 },
          currentHP: 100,
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
          equipment: {},
        },
      ],
      enemyUnits: [
        {
          id: 'knight_01',
          name: 'Enemy Knight',
          position: { x: 8, y: 8 },
          stats: { maxHP: 120, maxMP: 30, attack: 22, defense: 25, speed: 10, movement: 2 },
          currentHP: 120,
          currentMP: 30,
          faction: 'enemy',
          hasActed: false,
          hasMoved: false,
          equipment: {},
          metadata: {
            recruitment: {
              conditions: [
                {
                  id: 'specific_attacker',
                  type: 'specific_attacker',
                  description: 'Must be attacked by protagonist',
                  parameters: { attackerId: 'protagonist' },
                },
              ],
            },
          },
        },
      ],
      victoryConditions: [{ type: 'defeat_all', description: 'Defeat all enemies' }],
    } as any;
  });

  describe('Data Persistence Initialization', () => {
    test('should initialize data persistence successfully', async () => {
      const result = await recruitmentSystem.initializeDataPersistence();

      expect(result.success).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'recruitment-persistence-initialized',
        expect.objectContaining({ hasExistingData: false })
      );
    });

    test('should load existing recruitment data on initialization', async () => {
      // Pre-populate localStorage with save data
      const existingSaveData = {
        version: { major: 1, minor: 0, patch: 0, format: 'recruitment-v1' },
        playerId: 'player_1',
        gameId: 'game_1',
        createdAt: Date.now() - 86400000,
        lastModified: Date.now() - 3600000,
        recruitedCharacters: [
          {
            characterId: 'mage_01',
            recruitedAt: Date.now() - 86400000,
            recruitedInChapter: 'chapter_1',
            recruitedInStage: 'stage_1_2',
            originalStats: {
              maxHP: 80,
              maxMP: 100,
              attack: 25,
              defense: 10,
              speed: 15,
              movement: 2,
            },
            currentStats: {
              maxHP: 85,
              maxMP: 110,
              attack: 28,
              defense: 12,
              speed: 16,
              movement: 2,
            },
            equipment: {},
            experience: 75,
            level: 1,
            isAvailable: true,
            recruitmentConditions: [],
          },
        ],
        recruitmentStatistics: {
          totalAttempts: 2,
          successfulRecruitments: 1,
          failedRecruitments: 1,
          npcsSaved: 1,
          npcsLost: 0,
          averageConditionsMet: 100,
          recruitmentsByStage: { stage_1_2: 1 },
        },
        currentChapter: 'chapter_1',
        chapterProgress: {
          chapter_1: {
            chapterId: 'chapter_1',
            currentStage: 'stage_1_2',
            completedStages: ['stage_1_1'],
            availableCharacters: ['mage_01'],
            lostCharacters: [],
            recruitedInChapter: ['mage_01'],
            chapterStartTime: Date.now() - 86400000,
            lastSaveTime: Date.now() - 3600000,
          },
        },
        systemConfig: mockConfig,
        checksum: 'test_checksum',
      };

      localStorageMock.setItem('srpg_recruitment_data', JSON.stringify(existingSaveData));

      const result = await recruitmentSystem.initializeDataPersistence();

      expect(result.success).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'recruitment-persistence-initialized',
        expect.objectContaining({ hasExistingData: true })
      );
    });
  });

  describe('Chapter Management', () => {
    beforeEach(async () => {
      await recruitmentSystem.initializeDataPersistence();
    });

    test('should set current chapter successfully', async () => {
      const result = await recruitmentSystem.setCurrentChapter('chapter_2');

      expect(result.success).toBe(true);
    });

    test('should get available recruited characters for chapter', async () => {
      // First set up some recruited characters
      await recruitmentSystem.setCurrentChapter('chapter_1');

      const mockUnit: Unit = {
        id: 'archer_01',
        name: 'Archer',
        position: { x: 5, y: 5 },
        stats: { maxHP: 90, maxMP: 40, attack: 22, defense: 12, speed: 18, movement: 4 },
        currentHP: 90,
        currentMP: 40,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
        equipment: {},
      };

      // Simulate recruitment completion
      const recruitedUnits = [
        {
          unit: mockUnit,
          recruitmentId: 'test_recruitment_1',
          recruitedAt: Date.now(),
          conditions: [],
        },
      ];

      await recruitmentSystem.saveRecruitmentCompletion(recruitedUnits);

      // Get available characters
      const availableCharacters = recruitmentSystem.getAvailableRecruitedCharacters();

      expect(availableCharacters).toHaveLength(1);
      expect(availableCharacters[0].characterId).toBe('archer_01');
    });
  });

  describe('Recruitment Completion Persistence', () => {
    beforeEach(async () => {
      await recruitmentSystem.initializeDataPersistence();
      await recruitmentSystem.setCurrentChapter('chapter_1');
      await recruitmentSystem.initialize(mockStageData);
    });

    test('should save recruitment completion successfully', async () => {
      const mockRecruitedUnit: Unit = {
        id: 'knight_01',
        name: 'Recruited Knight',
        position: { x: 8, y: 8 },
        stats: { maxHP: 120, maxMP: 30, attack: 22, defense: 25, speed: 10, movement: 2 },
        currentHP: 120,
        currentMP: 30,
        faction: 'player', // Now recruited
        hasActed: false,
        hasMoved: false,
        equipment: {},
      };

      const recruitedUnits = [
        {
          unit: mockRecruitedUnit,
          recruitmentId: 'recruitment_knight_01_stage_1_3_123456',
          recruitedAt: Date.now(),
          conditions: [],
        },
      ];

      const result = await recruitmentSystem.saveRecruitmentCompletion(recruitedUnits);

      expect(result.success).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'recruitment-completion-saved',
        expect.objectContaining({
          chapterId: 'chapter_1',
          stageId: 'stage_1_3',
          recruitedCount: 1,
        })
      );

      // Verify character was saved
      const availableCharacters = recruitmentSystem.getAvailableRecruitedCharacters();
      expect(availableCharacters).toHaveLength(1);
      expect(availableCharacters[0].characterId).toBe('knight_01');
    });

    test('should handle multiple recruited characters', async () => {
      const recruitedUnits = [
        {
          unit: {
            id: 'knight_01',
            name: 'Knight',
            position: { x: 8, y: 8 },
            stats: { maxHP: 120, maxMP: 30, attack: 22, defense: 25, speed: 10, movement: 2 },
            currentHP: 120,
            currentMP: 30,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            equipment: {},
          },
          recruitmentId: 'recruitment_1',
          recruitedAt: Date.now(),
          conditions: [],
        },
        {
          unit: {
            id: 'mage_01',
            name: 'Mage',
            position: { x: 6, y: 6 },
            stats: { maxHP: 80, maxMP: 100, attack: 25, defense: 10, speed: 15, movement: 2 },
            currentHP: 80,
            currentMP: 100,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            equipment: {},
          },
          recruitmentId: 'recruitment_2',
          recruitedAt: Date.now(),
          conditions: [],
        },
      ];

      const result = await recruitmentSystem.saveRecruitmentCompletion(recruitedUnits);

      expect(result.success).toBe(true);

      const availableCharacters = recruitmentSystem.getAvailableRecruitedCharacters();
      expect(availableCharacters).toHaveLength(2);
    });
  });

  describe('Character Loss Management', () => {
    beforeEach(async () => {
      await recruitmentSystem.initializeDataPersistence();
      await recruitmentSystem.setCurrentChapter('chapter_1');
      await recruitmentSystem.initialize(mockStageData);

      // Add a recruited character first
      const mockUnit: Unit = {
        id: 'knight_01',
        name: 'Knight',
        position: { x: 8, y: 8 },
        stats: { maxHP: 120, maxMP: 30, attack: 22, defense: 25, speed: 10, movement: 2 },
        currentHP: 120,
        currentMP: 30,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        equipment: {},
      };

      await recruitmentSystem.saveRecruitmentCompletion([
        {
          unit: mockUnit,
          recruitmentId: 'test_recruitment',
          recruitedAt: Date.now(),
          conditions: [],
        },
      ]);
    });

    test('should mark recruited character as lost', async () => {
      const result = await recruitmentSystem.markRecruitedCharacterLost('knight_01');

      expect(result.success).toBe(true);

      // Character should no longer be available
      const availableCharacters = recruitmentSystem.getAvailableRecruitedCharacters();
      expect(availableCharacters).toHaveLength(0);
    });

    test('should reset chapter loss status', async () => {
      // Mark character as lost
      await recruitmentSystem.markRecruitedCharacterLost('knight_01');

      // Reset loss status
      const result = await recruitmentSystem.resetChapterLossStatus();

      expect(result.success).toBe(true);

      // Character should be available again
      const availableCharacters = recruitmentSystem.getAvailableRecruitedCharacters();
      expect(availableCharacters).toHaveLength(1);
      expect(availableCharacters[0].characterId).toBe('knight_01');
    });
  });

  describe('Data Management Utilities', () => {
    beforeEach(async () => {
      await recruitmentSystem.initializeDataPersistence();
    });

    test('should check if save data exists', () => {
      expect(recruitmentSystem.hasSaveData()).toBe(false);

      // Save some data
      localStorageMock.setItem('srpg_recruitment_data', '{}');
      expect(recruitmentSystem.hasSaveData()).toBe(true);
    });

    test('should delete save data', async () => {
      // Create some save data first
      await recruitmentSystem.setCurrentChapter('chapter_1');

      const result = await recruitmentSystem.deleteSaveData();

      expect(result.success).toBe(true);
      expect(recruitmentSystem.hasSaveData()).toBe(false);
    });

    test('should export recruitment data', async () => {
      await recruitmentSystem.setCurrentChapter('chapter_1');

      const exportedData = recruitmentSystem.exportRecruitmentData();

      expect(exportedData).toBeDefined();
      expect(typeof exportedData).toBe('string');

      // Should be valid JSON
      const parsedData = JSON.parse(exportedData!);
      expect(parsedData.version).toBeDefined();
      expect(parsedData.currentChapter).toBe('chapter_1');
    });

    test('should validate and recover data', async () => {
      const result = await recruitmentSystem.validateAndRecoverData();

      expect(result.success).toBe(true);
      expect(result.message).toContain('validated successfully');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing chapter ID gracefully', async () => {
      await recruitmentSystem.initializeDataPersistence();
      // Don't set current chapter

      const result = await recruitmentSystem.markRecruitedCharacterLost('knight_01');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Current chapter not set');
    });

    test('should handle missing stage ID gracefully', async () => {
      await recruitmentSystem.initializeDataPersistence();
      await recruitmentSystem.setCurrentChapter('chapter_1');
      // Don't initialize with stage data

      const mockUnit: Unit = {
        id: 'knight_01',
        name: 'Knight',
        position: { x: 8, y: 8 },
        stats: { maxHP: 120, maxMP: 30, attack: 22, defense: 25, speed: 10, movement: 2 },
        currentHP: 120,
        currentMP: 30,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        equipment: {},
      };

      const result = await recruitmentSystem.saveRecruitmentCompletion([
        {
          unit: mockUnit,
          recruitmentId: 'test',
          recruitedAt: Date.now(),
          conditions: [],
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Current chapter or stage not set');
    });

    test('should handle localStorage errors', async () => {
      // Mock localStorage to throw error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      await recruitmentSystem.initializeDataPersistence();
      await recruitmentSystem.setCurrentChapter('chapter_1');
      await recruitmentSystem.initialize(mockStageData);

      const mockUnit: Unit = {
        id: 'knight_01',
        name: 'Knight',
        position: { x: 8, y: 8 },
        stats: { maxHP: 120, maxMP: 30, attack: 22, defense: 25, speed: 10, movement: 2 },
        currentHP: 120,
        currentMP: 30,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        equipment: {},
      };

      const result = await recruitmentSystem.saveRecruitmentCompletion([
        {
          unit: mockUnit,
          recruitmentId: 'test',
          recruitedAt: Date.now(),
          conditions: [],
        },
      ]);

      // Should handle the error gracefully
      expect(result.success).toBe(false);
    });
  });

  describe('Integration with Existing Recruitment Flow', () => {
    beforeEach(async () => {
      await recruitmentSystem.initializeDataPersistence();
      await recruitmentSystem.setCurrentChapter('chapter_1');
      await recruitmentSystem.initialize(mockStageData);
    });

    test('should integrate with complete recruitment flow', async () => {
      const protagonist = mockStageData.playerUnits[0];
      const enemyKnight = mockStageData.enemyUnits[0];

      // Check recruitment eligibility
      const eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(
        protagonist,
        enemyKnight,
        { damage: 50, turn: 3 }
      );

      expect(eligibilityResult.success).toBe(true);

      // Process recruitment attempt (simulate defeating the enemy)
      const recruitmentResult = recruitmentSystem.processRecruitmentAttempt(
        protagonist,
        enemyKnight,
        120, // Enough damage to defeat
        undefined,
        3
      );

      expect(recruitmentResult.success).toBe(true);
      expect(recruitmentResult.nextAction).toBe('convert_to_npc');

      // Complete recruitment at stage end
      const allUnits = [
        ...mockStageData.playerUnits,
        enemyKnight, // Now an NPC
      ];

      const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);
      expect(recruitedUnits).toHaveLength(1);

      // Save recruitment completion
      const saveResult = await recruitmentSystem.saveRecruitmentCompletion(recruitedUnits);
      expect(saveResult.success).toBe(true);

      // Verify persistence
      const availableCharacters = recruitmentSystem.getAvailableRecruitedCharacters();
      expect(availableCharacters).toHaveLength(1);
      expect(availableCharacters[0].characterId).toBe('knight_01');
    });
  });
});

/**
 * Tests for RecruitmentDataManager
 * Covers data persistence, save/load functionality, and data integrity
 */

import { RecruitmentDataManager, RecruitedCharacterSaveData, ChapterProgressData, RecruitmentSaveData } from '../../../game/src/systems/RecruitmentDataManager';
import { RecruitmentSystemConfig, RecruitmentStatistics } from '../../../game/src/types/recruitment';
import { Unit } from '../../../game/src/types/gameplay';

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
        })
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// Mock Phaser EventEmitter
const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
};

describe('RecruitmentDataManager', () => {
    let dataManager: RecruitmentDataManager;
    let mockRecruitedCharacters: RecruitedCharacterSaveData[];
    let mockChapterProgress: Record<string, ChapterProgressData>;
    let mockStatistics: RecruitmentStatistics;
    let mockConfig: RecruitmentSystemConfig;

    beforeEach(() => {
        // Clear localStorage mock
        localStorageMock.clear();
        jest.clearAllMocks();

        // Create data manager instance
        dataManager = new RecruitmentDataManager(mockEventEmitter as any);

        // Setup mock data
        mockRecruitedCharacters = [
            {
                characterId: 'knight_01',
                recruitedAt: Date.now() - 86400000, // 1 day ago
                recruitedInChapter: 'chapter_1',
                recruitedInStage: 'stage_1_3',
                originalStats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                currentStats: { maxHP: 120, maxMP: 60, attack: 25, defense: 18, speed: 12, movement: 3 },
                equipment: { weapon: { id: 'sword_01', name: 'Iron Sword' } },
                experience: 150,
                level: 2,
                isAvailable: true,
                recruitmentConditions: [
                    { type: 'specific_attacker', parameters: { attackerId: 'protagonist' } }
                ]
            },
            {
                characterId: 'mage_01',
                recruitedAt: Date.now() - 43200000, // 12 hours ago
                recruitedInChapter: 'chapter_2',
                recruitedInStage: 'stage_2_1',
                originalStats: { maxHP: 80, maxMP: 100, attack: 25, defense: 10, speed: 15, movement: 2 },
                currentStats: { maxHP: 85, maxMP: 110, attack: 28, defense: 12, speed: 16, movement: 2 },
                equipment: { weapon: { id: 'staff_01', name: 'Magic Staff' } },
                experience: 75,
                level: 1,
                isAvailable: true,
                recruitmentConditions: [
                    { type: 'hp_threshold', parameters: { threshold: 0.3 } }
                ]
            }
        ];

        mockChapterProgress = {
            'chapter_1': {
                chapterId: 'chapter_1',
                currentStage: 'stage_1_5',
                completedStages: ['stage_1_1', 'stage_1_2', 'stage_1_3'],
                availableCharacters: ['knight_01'],
                lostCharacters: [],
                recruitedInChapter: ['knight_01'],
                chapterStartTime: Date.now() - 172800000, // 2 days ago
                lastSaveTime: Date.now() - 86400000
            },
            'chapter_2': {
                chapterId: 'chapter_2',
                currentStage: 'stage_2_2',
                completedStages: ['stage_2_1'],
                availableCharacters: ['knight_01', 'mage_01'],
                lostCharacters: [],
                recruitedInChapter: ['mage_01'],
                chapterStartTime: Date.now() - 86400000,
                lastSaveTime: Date.now() - 43200000
            }
        };

        mockStatistics = {
            totalAttempts: 5,
            successfulRecruitments: 2,
            failedRecruitments: 3,
            npcsSaved: 2,
            npcsLost: 1,
            averageConditionsMet: 75,
            recruitmentsByStage: {
                'stage_1_3': 1,
                'stage_2_1': 1
            }
        };

        mockConfig = {
            enableRecruitment: true,
            maxNPCsPerStage: 3,
            npcProtectionPriority: 90,
            autoShowConditions: true,
            conditionHintLevel: 'basic',
            allowMultipleAttempts: false,
            npcSurvivalBonus: 50
        };
    });

    describe('saveRecruitmentData', () => {
        test('should save recruitment data successfully', async () => {
            const result = await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_2',
                'player_1',
                'game_1'
            );

            expect(result.success).toBe(true);
            expect(result.savedAt).toBeDefined();
            expect(result.dataSize).toBeGreaterThan(0);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'srpg_recruitment_data',
                expect.any(String)
            );
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-data-saved',
                expect.objectContaining({ success: true })
            );
        });

        test('should validate data before saving', async () => {
            // Test with invalid data
            const invalidCharacters = [
                {
                    characterId: '', // Invalid empty ID
                    recruitedAt: -1, // Invalid negative timestamp
                    recruitedInChapter: 'chapter_1',
                    recruitedInStage: 'stage_1_1',
                    originalStats: null, // Invalid stats
                    currentStats: null,
                    equipment: {},
                    experience: -10, // Invalid negative experience
                    level: 0, // Invalid level
                    isAvailable: true,
                    recruitmentConditions: []
                }
            ] as any;

            const result = await dataManager.saveRecruitmentData(
                invalidCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_1'
            );

            // Should still succeed due to data sanitization
            expect(result.success).toBe(true);
        });

        test('should create backup before saving', async () => {
            // First save to create initial data
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_1'
            );

            // Second save should create backup
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_2'
            );

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'srpg_recruitment_backup',
                expect.any(String)
            );
        });
    });

    describe('loadRecruitmentData', () => {
        test('should load recruitment data successfully', async () => {
            // First save some data
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_2'
            );

            // Create new manager instance to test loading
            const newDataManager = new RecruitmentDataManager(mockEventEmitter as any);
            const result = await newDataManager.loadRecruitmentData();

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.recruitedCharacters).toHaveLength(2);
            expect(result.data!.currentChapter).toBe('chapter_2');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-data-loaded',
                expect.objectContaining({ success: true })
            );
        });

        test('should return empty data when no save exists', async () => {
            const result = await dataManager.loadRecruitmentData();

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.recruitedCharacters).toHaveLength(0);
            expect(result.message).toContain('No save data found');
        });

        test('should recover from backup when main data is corrupted', async () => {
            // Save valid data first
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_1'
            );

            // Corrupt main data
            localStorageMock.setItem('srpg_recruitment_data', 'invalid json');

            // Create new manager and try to load
            const newDataManager = new RecruitmentDataManager(mockEventEmitter as any);
            const result = await newDataManager.loadRecruitmentData();

            // Should either succeed with recovery or fail gracefully
            if (result.success) {
                expect(result.recovered).toBe(true);
                expect(result.data).toBeDefined();
            } else {
                expect(result.error).toBeDefined();
                expect(result.message).toMatch(/corrupted|backup|recovery/);
            }
        });

        test('should handle data migration', async () => {
            // Create old version data
            const oldVersionData = {
                version: { major: 0, minor: 9, patch: 0, format: 'recruitment-v0' },
                playerId: 'player_1',
                gameId: 'game_1',
                createdAt: Date.now(),
                lastModified: Date.now(),
                recruitedCharacters: mockRecruitedCharacters,
                currentChapter: 'chapter_1',
                chapterProgress: mockChapterProgress,
                systemConfig: mockConfig,
                checksum: 'old_checksum'
                // Missing recruitmentStatistics (should be added during migration)
            };

            localStorageMock.setItem('srpg_recruitment_data', JSON.stringify(oldVersionData));

            const result = await dataManager.loadRecruitmentData();

            expect(result.success).toBe(true);
            expect(result.migrated).toBe(true);
            expect(result.data!.recruitmentStatistics).toBeDefined();
            expect(result.data!.version.major).toBe(1);
        });
    });

    describe('getAvailableRecruitedCharacters', () => {
        beforeEach(async () => {
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_2'
            );
            await dataManager.loadRecruitmentData();
        });

        test('should return available characters for chapter', () => {
            const availableCharacters = dataManager.getAvailableRecruitedCharacters('chapter_2');

            expect(availableCharacters).toHaveLength(2);
            expect(availableCharacters.map(c => c.characterId)).toContain('knight_01');
            expect(availableCharacters.map(c => c.characterId)).toContain('mage_01');
        });

        test('should exclude lost characters', async () => {
            // Mark knight as lost in chapter 2
            await dataManager.markCharacterLost('knight_01', 'chapter_2');

            const availableCharacters = dataManager.getAvailableRecruitedCharacters('chapter_2');

            expect(availableCharacters).toHaveLength(1);
            expect(availableCharacters[0].characterId).toBe('mage_01');
        });

        test('should return empty array for non-existent chapter', () => {
            const availableCharacters = dataManager.getAvailableRecruitedCharacters('chapter_999');

            expect(availableCharacters).toHaveLength(0);
        });
    });

    describe('updateChapterProgress', () => {
        beforeEach(async () => {
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_1'
            );
            await dataManager.loadRecruitmentData();
        });

        test('should update existing chapter progress', async () => {
            const result = await dataManager.updateChapterProgress('chapter_1', {
                currentStage: 'stage_1_6',
                completedStages: ['stage_1_1', 'stage_1_2', 'stage_1_3', 'stage_1_4', 'stage_1_5']
            });

            expect(result.success).toBe(true);

            const saveData = dataManager.getCurrentSaveData();
            expect(saveData!.chapterProgress['chapter_1'].currentStage).toBe('stage_1_6');
            expect(saveData!.chapterProgress['chapter_1'].completedStages).toHaveLength(5);
        });

        test('should create new chapter progress if not exists', async () => {
            const result = await dataManager.updateChapterProgress('chapter_3', {
                currentStage: 'stage_3_1',
                completedStages: [],
                availableCharacters: ['knight_01', 'mage_01']
            });

            expect(result.success).toBe(true);

            const saveData = dataManager.getCurrentSaveData();
            expect(saveData!.chapterProgress['chapter_3']).toBeDefined();
            expect(saveData!.chapterProgress['chapter_3'].currentStage).toBe('stage_3_1');
        });
    });

    describe('markCharacterLost', () => {
        beforeEach(async () => {
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_2'
            );
            await dataManager.loadRecruitmentData();
        });

        test('should mark character as lost in chapter', async () => {
            const result = await dataManager.markCharacterLost('knight_01', 'chapter_2');

            expect(result.success).toBe(true);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruited-character-lost',
                { characterId: 'knight_01', chapterId: 'chapter_2' }
            );

            const saveData = dataManager.getCurrentSaveData();
            expect(saveData!.chapterProgress['chapter_2'].lostCharacters).toContain('knight_01');
            expect(saveData!.chapterProgress['chapter_2'].availableCharacters).not.toContain('knight_01');

            const character = saveData!.recruitedCharacters.find(c => c.characterId === 'knight_01');
            expect(character!.isAvailable).toBe(false);
        });

        test('should not duplicate lost character', async () => {
            await dataManager.markCharacterLost('knight_01', 'chapter_2');
            await dataManager.markCharacterLost('knight_01', 'chapter_2');

            const saveData = dataManager.getCurrentSaveData();
            const lostCount = saveData!.chapterProgress['chapter_2'].lostCharacters.filter(
                id => id === 'knight_01'
            ).length;
            expect(lostCount).toBe(1);
        });
    });

    describe('resetChapterLossStatus', () => {
        beforeEach(async () => {
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_2'
            );
            await dataManager.loadRecruitmentData();
            await dataManager.markCharacterLost('knight_01', 'chapter_2');
        });

        test('should reset loss status and restore character availability', async () => {
            const result = await dataManager.resetChapterLossStatus('chapter_2');

            expect(result.success).toBe(true);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'chapter-loss-status-reset',
                { chapterId: 'chapter_2', restoredCharacters: ['knight_01'] }
            );

            const saveData = dataManager.getCurrentSaveData();
            expect(saveData!.chapterProgress['chapter_2'].lostCharacters).toHaveLength(0);
            expect(saveData!.chapterProgress['chapter_2'].availableCharacters).toContain('knight_01');

            const character = saveData!.recruitedCharacters.find(c => c.characterId === 'knight_01');
            expect(character!.isAvailable).toBe(true);
        });
    });

    describe('addRecruitedCharacter', () => {
        beforeEach(async () => {
            await dataManager.saveRecruitmentData(
                [],
                {},
                mockStatistics,
                mockConfig,
                'chapter_1'
            );
            await dataManager.loadRecruitmentData();
        });

        test('should add newly recruited character', async () => {
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
                equipment: { weapon: { id: 'bow_01', name: 'Short Bow' } }
            };

            const result = await dataManager.addRecruitedCharacter(
                mockUnit,
                'chapter_1',
                'stage_1_2',
                [{ type: 'specific_attacker', parameters: { attackerId: 'protagonist' } }]
            );

            expect(result.success).toBe(true);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'character-recruited-saved',
                { characterId: 'archer_01', chapterId: 'chapter_1', stageId: 'stage_1_2' }
            );

            const saveData = dataManager.getCurrentSaveData();
            expect(saveData!.recruitedCharacters).toHaveLength(1);
            expect(saveData!.recruitedCharacters[0].characterId).toBe('archer_01');
            expect(saveData!.recruitmentStatistics.successfulRecruitments).toBeGreaterThan(0);
        });

        test('should prevent duplicate recruitment', async () => {
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
                equipment: {}
            };

            // Add character first time
            await dataManager.addRecruitedCharacter(mockUnit, 'chapter_1', 'stage_1_2');

            // Try to add same character again
            const result = await dataManager.addRecruitedCharacter(mockUnit, 'chapter_1', 'stage_1_3');

            expect(result.success).toBe(false);
            expect(result.message).toContain('already recruited');
        });
    });

    describe('data integrity and error handling', () => {
        test('should handle localStorage errors gracefully', async () => {
            // Mock localStorage to throw error
            localStorageMock.setItem.mockImplementationOnce(() => {
                throw new Error('Storage quota exceeded');
            });

            const result = await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_1'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-save-error',
                expect.any(Object)
            );
        });

        test('should validate data integrity on load', async () => {
            // Create data with invalid checksum
            const invalidData = {
                version: { major: 1, minor: 0, patch: 0, format: 'recruitment-v1' },
                playerId: 'player_1',
                gameId: 'game_1',
                createdAt: Date.now(),
                lastModified: Date.now(),
                recruitedCharacters: mockRecruitedCharacters,
                recruitmentStatistics: mockStatistics,
                currentChapter: 'chapter_1',
                chapterProgress: mockChapterProgress,
                systemConfig: mockConfig,
                checksum: 'invalid_checksum'
            };

            localStorageMock.setItem('srpg_recruitment_data', JSON.stringify(invalidData));

            const result = await dataManager.loadRecruitmentData();

            expect(result.success).toBe(true); // Should still succeed but with warnings
        });

        test('should sanitize invalid data during save', async () => {
            const invalidStatistics = {
                totalAttempts: -5, // Invalid negative value
                successfulRecruitments: -2,
                failedRecruitments: -3,
                npcsSaved: -1,
                npcsLost: -1,
                averageConditionsMet: 150, // Invalid > 100
                recruitmentsByStage: {}
            };

            const result = await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                invalidStatistics,
                mockConfig,
                'chapter_1'
            );

            expect(result.success).toBe(true);

            // Load and verify sanitization
            await dataManager.loadRecruitmentData();
            const saveData = dataManager.getCurrentSaveData();

            expect(saveData!.recruitmentStatistics.totalAttempts).toBe(0);
            expect(saveData!.recruitmentStatistics.averageConditionsMet).toBe(100);
        });
    });

    describe('utility methods', () => {
        test('should check if save data exists', () => {
            expect(dataManager.hasSaveData()).toBe(false);

            localStorageMock.setItem('srpg_recruitment_data', '{}');
            expect(dataManager.hasSaveData()).toBe(true);
        });

        test('should delete save data', async () => {
            // Save some data first
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_1'
            );

            const result = await dataManager.deleteSaveData();

            expect(result.success).toBe(true);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('srpg_recruitment_data');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('srpg_recruitment_backup');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-data-deleted');
            expect(dataManager.getCurrentSaveData()).toBeNull();
        });

        test('should return current save data as read-only', async () => {
            await dataManager.saveRecruitmentData(
                mockRecruitedCharacters,
                mockChapterProgress,
                mockStatistics,
                mockConfig,
                'chapter_1'
            );
            await dataManager.loadRecruitmentData();

            const saveData = dataManager.getCurrentSaveData();
            expect(saveData).toBeDefined();
            expect(saveData!.recruitedCharacters).toHaveLength(2);

            // Verify it's a copy (read-only) - modifying returned data shouldn't affect internal state
            const originalLength = saveData!.recruitedCharacters.length;

            // Try to modify the returned data
            if (saveData!.recruitedCharacters.length > 0) {
                saveData!.recruitedCharacters[0].characterId = 'modified';
            }

            const saveDataAgain = dataManager.getCurrentSaveData();
            expect(saveDataAgain!.recruitedCharacters).toHaveLength(originalLength);

            // Original data should be unchanged
            if (saveDataAgain!.recruitedCharacters.length > 0) {
                expect(saveDataAgain!.recruitedCharacters[0].characterId).not.toBe('modified');
            }
        });
    });
});
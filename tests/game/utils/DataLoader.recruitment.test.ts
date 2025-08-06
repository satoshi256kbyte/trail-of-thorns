/**
 * Unit tests for DataLoader recruitment data functionality
 */

import { DataLoader, DataValidationError } from '../../../game/src/utils/DataLoader';
import { RecruitmentConditionType } from '../../../game/src/types/recruitment';

// Mock fetch for testing
global.fetch = jest.fn();

describe('DataLoader - Recruitment Data', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('loadCharacterData', () => {
        test('should load and validate valid character data', async () => {
            const mockCharacterData = {
                characters: [
                    {
                        id: 'protagonist',
                        name: '主人公',
                        description: 'Test protagonist',
                        faction: 'player',
                        baseStats: {
                            maxHP: 100,
                            maxMP: 50,
                            attack: 20,
                            defense: 15,
                            speed: 10,
                            movement: 3
                        },
                        jobClass: 'warrior',
                        level: 1,
                        isRecruitable: false,
                        recruitmentData: null
                    },
                    {
                        id: 'enemy_knight',
                        name: 'Enemy Knight',
                        description: 'Test enemy knight',
                        faction: 'enemy',
                        baseStats: {
                            maxHP: 80,
                            maxMP: 30,
                            attack: 18,
                            defense: 20,
                            speed: 8,
                            movement: 2
                        },
                        jobClass: 'knight',
                        level: 2,
                        isRecruitable: true,
                        recruitmentData: {
                            priority: 70,
                            description: 'Test recruitment',
                            conditions: [
                                {
                                    id: 'test_condition',
                                    type: 'specific_attacker',
                                    description: 'Must be attacked by protagonist',
                                    parameters: { attackerId: 'protagonist' }
                                }
                            ],
                            rewards: [
                                {
                                    type: 'experience',
                                    amount: 100,
                                    target: 'recruiter',
                                    description: 'Experience reward'
                                }
                            ]
                        }
                    }
                ]
            };

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockCharacterData
            });

            const characters = await DataLoader.loadCharacterData();

            expect(characters).toHaveLength(2);
            expect(characters[0].id).toBe('protagonist');
            expect(characters[0].isRecruitable).toBe(false);
            expect(characters[1].id).toBe('enemy_knight');
            expect(characters[1].isRecruitable).toBe(true);
            expect(characters[1].recruitmentData).toBeTruthy();
            expect(characters[1].recruitmentData?.conditions).toHaveLength(1);
        });

        test('should throw error for invalid character data structure', async () => {
            const invalidData = {
                characters: [
                    {
                        id: 'invalid_character',
                        // Missing required fields
                        faction: 'player'
                    }
                ]
            };

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => invalidData
            });

            await expect(DataLoader.loadCharacterData()).rejects.toThrow(DataValidationError);
        });

        test('should throw error for recruitable character without recruitment data', async () => {
            const invalidData = {
                characters: [
                    {
                        id: 'invalid_character',
                        name: 'Invalid Character',
                        description: 'Test character',
                        faction: 'enemy',
                        baseStats: {
                            maxHP: 100,
                            maxMP: 50,
                            attack: 20,
                            defense: 15,
                            speed: 10,
                            movement: 3
                        },
                        jobClass: 'warrior',
                        level: 1,
                        isRecruitable: true,
                        recruitmentData: null // Invalid: recruitable but no data
                    }
                ]
            };

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => invalidData
            });

            await expect(DataLoader.loadCharacterData()).rejects.toThrow(DataValidationError);
        });

        test('should handle network errors', async () => {
            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            await expect(DataLoader.loadCharacterData()).rejects.toThrow('Network error');
        });

        test('should handle 404 errors', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(DataLoader.loadCharacterData()).rejects.toThrow(
                'Failed to load characters.json: 404 Not Found'
            );
        });
    });

    describe('loadGameData', () => {
        test('should load and cross-validate character and stage data', async () => {
            const mockCharacterData = {
                characters: [
                    {
                        id: 'protagonist',
                        name: '主人公',
                        description: 'Test protagonist',
                        faction: 'player',
                        baseStats: {
                            maxHP: 100,
                            maxMP: 50,
                            attack: 20,
                            defense: 15,
                            speed: 10,
                            movement: 3
                        },
                        jobClass: 'warrior',
                        level: 1,
                        isRecruitable: false,
                        recruitmentData: null
                    },
                    {
                        id: 'enemy_knight',
                        name: 'Enemy Knight',
                        description: 'Test enemy knight',
                        faction: 'enemy',
                        baseStats: {
                            maxHP: 80,
                            maxMP: 30,
                            attack: 18,
                            defense: 20,
                            speed: 8,
                            movement: 2
                        },
                        jobClass: 'knight',
                        level: 2,
                        isRecruitable: true,
                        recruitmentData: {
                            priority: 70,
                            description: 'Test recruitment',
                            conditions: [
                                {
                                    id: 'test_condition',
                                    type: 'specific_attacker',
                                    description: 'Must be attacked by protagonist',
                                    parameters: { attackerId: 'protagonist' }
                                }
                            ]
                        }
                    }
                ]
            };

            const mockStageData = {
                stages: [
                    {
                        id: 'stage-001',
                        name: 'Test Stage',
                        description: 'Test stage description',
                        isUnlocked: true,
                        difficulty: 1,
                        order: 1,
                        mapData: {
                            width: 10,
                            height: 8,
                            tileset: 'test'
                        },
                        playerUnits: [
                            {
                                characterId: 'protagonist',
                                startPosition: { x: 1, y: 4 }
                            }
                        ],
                        enemyUnits: [
                            {
                                characterId: 'enemy_knight',
                                startPosition: { x: 8, y: 4 }
                            }
                        ],
                        recruitableCharacters: [
                            {
                                characterId: 'enemy_knight',
                                isActive: true,
                                stageSpecificConditions: []
                            }
                        ],
                        victoryConditions: [
                            {
                                type: 'defeat_all_enemies',
                                description: 'Defeat all enemies'
                            }
                        ],
                        defeatConditions: [
                            {
                                type: 'all_allies_defeated',
                                description: 'All allies defeated'
                            }
                        ]
                    }
                ]
            };

            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockCharacterData
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockStageData
                });

            const gameData = await DataLoader.loadGameData();

            expect(gameData.characters).toHaveLength(2);
            expect(gameData.stages).toHaveLength(1);
            expect(gameData.stages[0].recruitableCharacters).toHaveLength(1);
            expect(gameData.stages[0].recruitableCharacters[0].characterId).toBe('enemy_knight');
        });

        test('should throw error for invalid character reference in stage', async () => {
            const mockCharacterData = {
                characters: [
                    {
                        id: 'protagonist',
                        name: '主人公',
                        description: 'Test protagonist',
                        faction: 'player',
                        baseStats: {
                            maxHP: 100,
                            maxMP: 50,
                            attack: 20,
                            defense: 15,
                            speed: 10,
                            movement: 3
                        },
                        jobClass: 'warrior',
                        level: 1,
                        isRecruitable: false,
                        recruitmentData: null
                    }
                ]
            };

            const mockStageData = {
                stages: [
                    {
                        id: 'stage-001',
                        name: 'Test Stage',
                        description: 'Test stage description',
                        isUnlocked: true,
                        difficulty: 1,
                        order: 1,
                        mapData: {
                            width: 10,
                            height: 8,
                            tileset: 'test'
                        },
                        playerUnits: [
                            {
                                characterId: 'nonexistent_character', // Invalid reference
                                startPosition: { x: 1, y: 4 }
                            }
                        ],
                        enemyUnits: [],
                        recruitableCharacters: [],
                        victoryConditions: [
                            {
                                type: 'defeat_all_enemies',
                                description: 'Defeat all enemies'
                            }
                        ],
                        defeatConditions: [
                            {
                                type: 'all_allies_defeated',
                                description: 'All allies defeated'
                            }
                        ]
                    }
                ]
            };

            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockCharacterData
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockStageData
                });

            await expect(DataLoader.loadGameData()).rejects.toThrow(DataValidationError);
        });

        test('should throw error for non-recruitable character listed as recruitable in stage', async () => {
            const mockCharacterData = {
                characters: [
                    {
                        id: 'enemy_knight',
                        name: 'Enemy Knight',
                        description: 'Test enemy knight',
                        faction: 'enemy',
                        baseStats: {
                            maxHP: 80,
                            maxMP: 30,
                            attack: 18,
                            defense: 20,
                            speed: 8,
                            movement: 2
                        },
                        jobClass: 'knight',
                        level: 2,
                        isRecruitable: false, // Not recruitable
                        recruitmentData: null
                    }
                ]
            };

            const mockStageData = {
                stages: [
                    {
                        id: 'stage-001',
                        name: 'Test Stage',
                        description: 'Test stage description',
                        isUnlocked: true,
                        difficulty: 1,
                        order: 1,
                        mapData: {
                            width: 10,
                            height: 8,
                            tileset: 'test'
                        },
                        playerUnits: [],
                        enemyUnits: [
                            {
                                characterId: 'enemy_knight',
                                startPosition: { x: 8, y: 4 }
                            }
                        ],
                        recruitableCharacters: [
                            {
                                characterId: 'enemy_knight', // Listed as recruitable but character is not
                                isActive: true,
                                stageSpecificConditions: []
                            }
                        ],
                        victoryConditions: [
                            {
                                type: 'defeat_all_enemies',
                                description: 'Defeat all enemies'
                            }
                        ],
                        defeatConditions: [
                            {
                                type: 'all_allies_defeated',
                                description: 'All allies defeated'
                            }
                        ]
                    }
                ]
            };

            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockCharacterData
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockStageData
                });

            await expect(DataLoader.loadGameData()).rejects.toThrow(DataValidationError);
        });
    });

    describe('getDefaultCharacterData', () => {
        test('should return valid default character data', () => {
            const defaultCharacters = DataLoader.getDefaultCharacterData();

            expect(defaultCharacters).toHaveLength(1);
            expect(defaultCharacters[0].id).toBe('protagonist');
            expect(defaultCharacters[0].isRecruitable).toBe(false);
            expect(defaultCharacters[0].recruitmentData).toBeNull();
            expect(defaultCharacters[0].baseStats.maxHP).toBeGreaterThan(0);
            expect(defaultCharacters[0].baseStats.attack).toBeGreaterThan(0);
        });
    });

    describe('getDefaultStageData', () => {
        test('should return valid default stage data with recruitment structure', () => {
            const defaultStages = DataLoader.getDefaultStageData();

            expect(defaultStages).toHaveLength(1);
            expect(defaultStages[0].id).toBe('stage-001');
            expect(defaultStages[0].mapData).toBeDefined();
            expect(defaultStages[0].playerUnits).toBeDefined();
            expect(defaultStages[0].enemyUnits).toBeDefined();
            expect(defaultStages[0].recruitableCharacters).toBeDefined();
            expect(defaultStages[0].victoryConditions).toBeDefined();
            expect(defaultStages[0].defeatConditions).toBeDefined();
            expect(defaultStages[0].recruitableCharacters).toHaveLength(0);
        });
    });
});
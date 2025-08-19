/**
 * ExperienceGameplaySceneIntegration.test.ts
 * 
 * 統合テスト: GameplaySceneと経験値システムの統合
 * 
 * このテストは以下の統合機能をテストします:
 * - 経験値システムの基本機能
 * - 戦闘経験値の処理
 * - スキル経験値の処理
 * - レベルアップ処理
 * 
 * 要件: 2.4, 6.1, 6.2, 6.4
 */

import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import { Unit } from '../../game/src/types/gameplay';
import { ExperienceAction, ExperienceSource, ExperienceContext } from '../../game/src/types/experience';

// Mock Phaser Scene for testing
class MockScene {
    public events = {
        on: jest.fn(),
        emit: jest.fn(),
        off: jest.fn()
    };
    public add = {
        container: jest.fn(() => ({
            setScrollFactor: jest.fn(() => ({
                setDepth: jest.fn(() => ({}))
            })),
            add: jest.fn()
        })),
        graphics: jest.fn(() => ({
            fillStyle: jest.fn(() => ({
                fillRect: jest.fn(() => ({})),
                fillRoundedRect: jest.fn(() => ({})),
                lineStyle: jest.fn(() => ({
                    strokeRoundedRect: jest.fn(() => ({}))
                })),
                fillCircle: jest.fn(() => ({}))
            }))
        })),
        text: jest.fn(() => ({
            setOrigin: jest.fn(() => ({}))
        }))
    };
    public cameras = {
        main: { width: 800, height: 600 }
    };
    public tweens = {
        add: jest.fn()
    };
    public time = {
        delayedCall: jest.fn()
    };
}

// モックデータ
const createMockUnit = (id: string, name: string, faction: 'player' | 'enemy' = 'player'): Unit => ({
    id,
    name,
    position: { x: 1, y: 1 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3
    },
    currentHP: 100,
    currentMP: 50,
    faction,
    hasActed: false,
    hasMoved: false
});

describe('ExperienceGameplaySceneIntegration', () => {
    let mockScene: MockScene;
    let experienceSystem: ExperienceSystem;

    beforeEach(async () => {
        mockScene = new MockScene();
        experienceSystem = new ExperienceSystem(mockScene as any);

        // Initialize the experience system
        await experienceSystem.initialize();
    });

    afterEach(() => {
        if (experienceSystem) {
            experienceSystem.destroy();
        }
    });

    describe('Experience System Integration', () => {
        test('should initialize experience system successfully', () => {
            // Given: ExperienceSystemが作成されている
            expect(experienceSystem).toBeDefined();

            // When: システム状態を確認
            const systemState = experienceSystem.getSystemState();

            // Then: システムが正常に初期化されている
            expect(systemState.isInitialized).toBe(true);
        });

        test('should register characters in experience system', () => {
            // Given: テストキャラクター
            const character = createMockUnit('player-1', 'Hero', 'player');

            // When: キャラクターを登録
            experienceSystem.registerCharacter(character, 1, 0);

            // Then: キャラクターが登録されている
            const systemState = experienceSystem.getSystemState();
            expect(systemState.activeCharacters.has('player-1')).toBe(true);

            const experienceInfo = experienceSystem.getExperienceInfo('player-1');
            expect(experienceInfo.currentLevel).toBe(1);
            expect(experienceInfo.currentExperience).toBe(0);
        });
    });

    describe('Battle Experience Integration', () => {
        let character: Unit;

        beforeEach(() => {
            character = createMockUnit('player-1', 'Hero', 'player');
            experienceSystem.registerCharacter(character, 1, 0);
        });

        test('should award experience for attack hits', () => {
            // Given: 攻撃命中の経験値コンテキスト
            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            // When: 経験値を付与
            const result = experienceSystem.awardExperience('player-1', ExperienceAction.ATTACK, context);

            // Then: 経験値が付与されている
            expect(result).not.toBeNull();
            expect(result!.finalAmount).toBeGreaterThan(0);

            const experienceInfo = experienceSystem.getExperienceInfo('player-1');
            expect(experienceInfo.currentExperience).toBeGreaterThan(0);
        });

        test('should award experience for enemy defeat', () => {
            // Given: 敵撃破の経験値コンテキスト
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                timestamp: Date.now()
            };

            // When: 経験値を付与
            const result = experienceSystem.awardExperience('player-1', ExperienceAction.DEFEAT, context);

            // Then: 撃破経験値が付与されている
            expect(result).not.toBeNull();
            expect(result!.finalAmount).toBeGreaterThan(0);

            const experienceInfo = experienceSystem.getExperienceInfo('player-1');
            expect(experienceInfo.currentExperience).toBeGreaterThan(0);
        });

        test('should handle battle experience through handleBattleExperience', () => {
            // Given: 戦闘コンテキスト
            const battleContext = {
                attacker: character,
                target: createMockUnit('enemy-1', 'Orc', 'enemy'),
                damage: 25,
                wasHit: true,
                wasCritical: false,
                turnNumber: 1,
                timestamp: Date.now()
            };

            // When: 戦闘経験値を処理
            experienceSystem.handleBattleExperience('player-1', ExperienceAction.ATTACK, battleContext);

            // Then: 経験値が付与されている
            const experienceInfo = experienceSystem.getExperienceInfo('player-1');
            expect(experienceInfo.currentExperience).toBeGreaterThan(0);
        });
    });

    describe('Skill Experience Integration', () => {
        let character: Unit;

        beforeEach(() => {
            character = createMockUnit('player-2', 'Mage', 'player');
            experienceSystem.registerCharacter(character, 1, 0);
        });

        test('should award experience for healing actions', () => {
            // Given: 回復行動の経験値コンテキスト
            const context: ExperienceContext = {
                source: ExperienceSource.HEALING,
                action: ExperienceAction.HEAL,
                timestamp: Date.now()
            };

            // When: 経験値を付与
            const result = experienceSystem.awardExperience('player-2', ExperienceAction.HEAL, context);

            // Then: 回復経験値が付与されている
            expect(result).not.toBeNull();
            expect(result!.finalAmount).toBeGreaterThan(0);

            const experienceInfo = experienceSystem.getExperienceInfo('player-2');
            expect(experienceInfo.currentExperience).toBeGreaterThan(0);
        });

        test('should award experience for support actions', () => {
            // Given: 支援行動の経験値コンテキスト
            const context: ExperienceContext = {
                source: ExperienceSource.ALLY_SUPPORT,
                action: ExperienceAction.SUPPORT,
                timestamp: Date.now()
            };

            // When: 経験値を付与
            const result = experienceSystem.awardExperience('player-2', ExperienceAction.SUPPORT, context);

            // Then: 支援経験値が付与されている
            expect(result).not.toBeNull();
            expect(result!.finalAmount).toBeGreaterThan(0);

            const experienceInfo = experienceSystem.getExperienceInfo('player-2');
            expect(experienceInfo.currentExperience).toBeGreaterThan(0);
        });
    });

    describe('Level Up Processing', () => {
        let character: Unit;

        beforeEach(() => {
            character = createMockUnit('player-1', 'Hero', 'player');
            experienceSystem.registerCharacter(character, 1, 0);
        });

        test('should process level up when sufficient experience is gained', () => {
            // Given: 大量の経験値を付与してレベルアップを発生させる
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                timestamp: Date.now()
            };

            // When: 複数回経験値を付与
            for (let i = 0; i < 10; i++) {
                experienceSystem.awardExperience('player-1', ExperienceAction.DEFEAT, context);
            }

            // レベルアップ判定を実行
            const levelUpResult = experienceSystem.checkAndProcessLevelUp('player-1');

            // Then: レベルアップが発生している可能性がある
            const experienceInfo = experienceSystem.getExperienceInfo('player-1');
            expect(experienceInfo.currentExperience).toBeGreaterThan(0);

            // レベルアップが発生した場合の検証
            if (levelUpResult) {
                expect(levelUpResult.newLevel).toBeGreaterThan(levelUpResult.oldLevel);
                expect(levelUpResult.characterId).toBe('player-1');
            }
        });

        test('should handle pending level ups processing', () => {
            // Given: 経験値システムが初期化されている
            expect(experienceSystem).toBeDefined();

            // When: 保留レベルアップを処理
            experienceSystem.processPendingLevelUps('player-1');

            // Then: エラーが発生しない
            expect(experienceSystem.getSystemState().isInitialized).toBe(true);
        });
    });

    describe('Experience Information Display', () => {
        let character: Unit;

        beforeEach(() => {
            character = createMockUnit('player-1', 'Hero', 'player');
            experienceSystem.registerCharacter(character, 1, 0);
        });

        test('should provide complete experience information', () => {
            // Given: 経験値を付与
            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };
            experienceSystem.awardExperience('player-1', ExperienceAction.ATTACK, context);

            // When: 経験値情報を取得
            const experienceInfo = experienceSystem.getExperienceInfo('player-1');

            // Then: 完全な経験値情報が取得できる
            expect(experienceInfo).toMatchObject({
                currentLevel: expect.any(Number),
                currentExperience: expect.any(Number),
                experienceToNextLevel: expect.any(Number),
                canLevelUp: expect.any(Boolean),
                isMaxLevel: expect.any(Boolean),
                experienceProgress: expect.any(Number)
            });

            expect(experienceInfo.currentExperience).toBeGreaterThan(0);
            expect(experienceInfo.experienceProgress).toBeGreaterThanOrEqual(0);
            expect(experienceInfo.experienceProgress).toBeLessThanOrEqual(1);
        });

        test('should get all characters experience information', () => {
            // Given: 複数キャラクターを登録
            const character2 = createMockUnit('player-2', 'Mage', 'player');
            experienceSystem.registerCharacter(character2, 1, 0);

            // When: 全キャラクターの経験値情報を取得
            const allExperienceInfo = experienceSystem.getAllExperienceInfo();

            // Then: 全キャラクターの情報が取得できる
            expect(allExperienceInfo.size).toBe(2);
            expect(allExperienceInfo.has('player-1')).toBe(true);
            expect(allExperienceInfo.has('player-2')).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid character ID gracefully', () => {
            // Given: 存在しないキャラクターID
            const invalidId = 'non-existent-character';

            // When: 存在しないキャラクターに経験値を付与しようとする
            const result = experienceSystem.awardExperience(invalidId, ExperienceAction.ATTACK, {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            });

            // Then: エラーが適切にハンドリングされている
            expect(result).toBeNull();
        });

        test('should handle system not initialized error', () => {
            // Given: 初期化されていない経験値システム
            const uninitializedSystem = new ExperienceSystem(mockScene as any);

            // When: 初期化前に操作を実行
            expect(() => {
                uninitializedSystem.awardExperience('player-1', ExperienceAction.ATTACK, {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                });
            }).toThrow('SYSTEM_NOT_INITIALIZED');

            // Cleanup
            uninitializedSystem.destroy();
        });
    });

    describe('System Configuration', () => {
        test('should allow experience multiplier configuration', () => {
            // Given: キャラクターが登録されている
            const character = createMockUnit('player-1', 'Hero', 'player');
            experienceSystem.registerCharacter(character, 1, 0);

            // When: 経験値倍率を設定
            experienceSystem.setExperienceMultiplier(2.0, 'Test multiplier');

            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            const result = experienceSystem.awardExperience('player-1', ExperienceAction.ATTACK, context);

            // Then: 倍率が適用されている
            expect(result).not.toBeNull();
            expect(result!.multipliedAmount).toBeGreaterThan(result!.baseAmount);
        });

        test('should allow system configuration updates', () => {
            // Given: デフォルト設定
            const initialState = experienceSystem.getSystemState();

            // When: 設定を更新
            experienceSystem.updateConfig({
                enableExperienceGain: false,
                showExperiencePopups: false
            });

            // Then: 設定が更新されている
            const updatedState = experienceSystem.getSystemState();
            expect(updatedState.config.enableExperienceGain).toBe(false);
            expect(updatedState.config.showExperiencePopups).toBe(false);
        });
    });
});
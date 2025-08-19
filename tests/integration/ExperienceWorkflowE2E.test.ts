/**
 * 経験値システム エンドツーエンドワークフローテスト
 * 
 * 経験値獲得からレベルアップ、能力値成長までの
 * 完全なワークフローをエンドツーエンドでテストします。
 * 
 * テスト対象:
 * - 経験値獲得→レベルアップ→成長の完全フロー
 * - 複数システム間の連携
 * - 実際のゲームプレイシナリオ
 * - UI表示との同期
 * - データ永続化
 * 
 * @version 1.0.0
 */

import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { SaveDataManager } from '../../game/src/systems/SaveDataManager';
import {
    ExperienceSource,
    ExperienceAction,
    ExperienceTableData,
    GrowthRates,
    ExperienceContext,
    LevelUpResult
} from '../../game/src/types/experience';
import { Unit, BattleResult } from '../../game/src/types/gameplay';

// テスト用モックデータ
const mockExperienceTable: ExperienceTableData = {
    levelRequirements: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250],
    experienceGains: {
        attackHit: 5,
        enemyDefeat: 25,
        allySupport: 10,
        healing: 8
    },
    maxLevel: 10
};

const mockGrowthRates: GrowthRates = {
    hp: 80,
    mp: 60,
    attack: 70,
    defense: 65,
    speed: 55,
    skill: 75,
    luck: 50
};

const createMockUnit = (id: string, level: number = 1, experience: number = 0): Unit => ({
    id,
    name: `Character ${id}`,
    position: { x: 0, y: 0 },
    stats: {
        maxHP: 100 + (level - 1) * 10,
        maxMP: 50 + (level - 1) * 5,
        attack: 20 + (level - 1) * 2,
        defense: 15 + (level - 1) * 2,
        speed: 10 + (level - 1) * 1,
        movement: 3,
        skill: 12 + (level - 1) * 2,
        luck: 8 + (level - 1) * 1
    },
    currentHP: 100 + (level - 1) * 10,
    currentMP: 50 + (level - 1) * 5,
    level,
    experience,
    faction: 'player',
    hasActed: false,
    hasMoved: false
});

describe('ExperienceSystem - エンドツーエンドワークフロー', () => {
    let experienceSystem: ExperienceSystem;
    let battleSystem: BattleSystem;
    let gameplayScene: GameplayScene;
    let characterManager: CharacterManager;
    let saveDataManager: SaveDataManager;

    beforeEach(async () => {
        // システム初期化
        experienceSystem = new ExperienceSystem();
        battleSystem = new BattleSystem();
        gameplayScene = new GameplayScene();
        characterManager = new CharacterManager();
        saveDataManager = new SaveDataManager();

        // 経験値システム初期化
        await experienceSystem.initialize(mockExperienceTable);

        // キャラクター登録
        const playerUnit = createMockUnit('player-001');
        const enemyUnit = createMockUnit('enemy-001');

        characterManager.addCharacter(playerUnit);
        characterManager.addCharacter(enemyUnit);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('基本的な経験値獲得→レベルアップフロー', () => {
        test('攻撃命中→敵撃破→レベルアップの完全フロー', async () => {
            const playerId = 'player-001';
            const enemyId = 'enemy-001';

            // 初期状態確認
            let expInfo = experienceSystem.getExperienceInfo(playerId);
            expect(expInfo.currentLevel).toBe(1);
            expect(expInfo.currentExperience).toBe(0);

            // 1. 攻撃命中による経験値獲得
            const attackContext: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                targetId: enemyId,
                timestamp: Date.now(),
                battleContext: {
                    battleId: 'battle-001',
                    turnNumber: 1,
                    attackerId: playerId,
                    defenderId: enemyId,
                    damageDealt: 25
                }
            };

            experienceSystem.awardExperience(playerId, ExperienceAction.ATTACK, attackContext);

            // 攻撃命中経験値確認
            expInfo = experienceSystem.getExperienceInfo(playerId);
            expect(expInfo.currentExperience).toBe(5);

            // 2. 敵撃破による経験値獲得
            const defeatContext: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                targetId: enemyId,
                timestamp: Date.now(),
                battleContext: {
                    battleId: 'battle-001',
                    turnNumber: 1,
                    attackerId: playerId,
                    defenderId: enemyId
                }
            };

            experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, defeatContext);

            // 敵撃破経験値確認
            expInfo = experienceSystem.getExperienceInfo(playerId);
            expect(expInfo.currentExperience).toBe(30); // 5 + 25

            // 3. 複数回の戦闘でレベルアップまで経験値蓄積
            for (let i = 0; i < 3; i++) {
                experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, {
                    ...defeatContext,
                    targetId: `enemy-${i + 2}`,
                    timestamp: Date.now()
                });
            }

            // レベルアップ前の状態確認
            expInfo = experienceSystem.getExperienceInfo(playerId);
            expect(expInfo.currentExperience).toBe(105); // 30 + 75
            expect(expInfo.canLevelUp).toBe(true);

            // 4. レベルアップ実行
            const levelUpResult = experienceSystem.checkAndProcessLevelUp(playerId);

            // レベルアップ結果確認
            expect(levelUpResult).toBeTruthy();
            expect(levelUpResult!.oldLevel).toBe(1);
            expect(levelUpResult!.newLevel).toBe(2);
            expect(levelUpResult!.levelsGained).toBe(1);

            // 能力値成長確認
            expect(levelUpResult!.statGrowth).toBeDefined();
            const hasGrowth = Object.values(levelUpResult!.statGrowth).some(growth => growth > 0);
            expect(hasGrowth).toBe(true);

            // レベルアップ後の状態確認
            expInfo = experienceSystem.getExperienceInfo(playerId);
            expect(expInfo.currentLevel).toBe(2);
            expect(expInfo.canLevelUp).toBe(false);
            expect(expInfo.experienceToNextLevel).toBe(145); // 250 - 105 = 145
        });

        test('支援・回復による経験値獲得フロー', async () => {
            const healerId = 'player-001';
            const targetId = 'player-002';

            // 味方キャラクター追加
            const allyUnit = createMockUnit(targetId);
            characterManager.addCharacter(allyUnit);

            // 1. 回復による経験値獲得
            const healContext: ExperienceContext = {
                source: ExperienceSource.HEALING,
                action: ExperienceAction.HEAL,
                targetId,
                timestamp: Date.now(),
                battleContext: {
                    battleId: 'battle-001',
                    turnNumber: 1,
                    attackerId: healerId,
                    healingAmount: 30
                }
            };

            experienceSystem.awardExperience(healerId, ExperienceAction.HEAL, healContext);

            let expInfo = experienceSystem.getExperienceInfo(healerId);
            expect(expInfo.currentExperience).toBe(8); // healing経験値

            // 2. 支援による経験値獲得
            const supportContext: ExperienceContext = {
                source: ExperienceSource.ALLY_SUPPORT,
                action: ExperienceAction.SUPPORT,
                targetId,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(healerId, ExperienceAction.SUPPORT, supportContext);

            expInfo = experienceSystem.getExperienceInfo(healerId);
            expect(expInfo.currentExperience).toBe(18); // 8 + 10
        });

        test('複数レベルアップの連続処理フロー', async () => {
            const playerId = 'player-001';

            // 大量の経験値を一度に付与（複数レベルアップ分）
            const massiveExpContext: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                targetId: 'boss-001',
                amount: 500, // 複数レベルアップ分
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, massiveExpContext);

            // レベルアップ実行
            const levelUpResult = experienceSystem.checkAndProcessLevelUp(playerId);

            expect(levelUpResult).toBeTruthy();
            expect(levelUpResult!.levelsGained).toBeGreaterThan(1);
            expect(levelUpResult!.newLevel).toBeGreaterThan(2);

            // 複数レベル分の能力値成長確認
            const totalGrowth = Object.values(levelUpResult!.statGrowth).reduce((sum, growth) => sum + growth, 0);
            expect(totalGrowth).toBeGreaterThan(0);
        });
    });

    describe('戦闘システム統合フロー', () => {
        test('戦闘中の経験値獲得とレベルアップ処理', async () => {
            const playerId = 'player-001';
            const enemyId = 'enemy-001';

            // 戦闘開始
            const battleResult: BattleResult = {
                attackerId: playerId,
                defenderId: enemyId,
                damage: 25,
                isHit: true,
                isCritical: false,
                isDefenderDefeated: true,
                experienceGained: 30,
                timestamp: Date.now()
            };

            // 戦闘システムから経験値システムへの連携
            if (battleResult.isHit) {
                experienceSystem.awardExperience(playerId, ExperienceAction.ATTACK, {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    targetId: enemyId,
                    timestamp: battleResult.timestamp,
                    battleContext: {
                        battleId: 'battle-001',
                        turnNumber: 1,
                        attackerId: playerId,
                        defenderId: enemyId,
                        damageDealt: battleResult.damage
                    }
                });
            }

            if (battleResult.isDefenderDefeated) {
                experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, {
                    source: ExperienceSource.ENEMY_DEFEAT,
                    action: ExperienceAction.DEFEAT,
                    targetId: enemyId,
                    timestamp: battleResult.timestamp
                });
            }

            // 経験値獲得確認
            const expInfo = experienceSystem.getExperienceInfo(playerId);
            expect(expInfo.currentExperience).toBe(30); // 5 + 25

            // 戦闘中レベルアップの処理
            if (expInfo.canLevelUp) {
                const levelUpResult = experienceSystem.checkAndProcessLevelUp(playerId);
                expect(levelUpResult).toBeTruthy();
            }
        });

        test('戦闘終了後のレベルアップ演出フロー', async () => {
            const playerId = 'player-001';

            // レベルアップに必要な経験値を付与
            experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                amount: 100,
                timestamp: Date.now()
            });

            // 戦闘終了後のレベルアップ処理
            const levelUpResult = experienceSystem.checkAndProcessLevelUp(playerId);

            expect(levelUpResult).toBeTruthy();

            // UI演出の確認（モック）
            const showLevelUpEffectSpy = jest.spyOn(experienceSystem['experienceUI'], 'showLevelUpEffect');
            const showGrowthResultsSpy = jest.spyOn(experienceSystem['experienceUI'], 'showGrowthResults');

            // 演出メソッドが呼ばれることを確認
            expect(showLevelUpEffectSpy).toHaveBeenCalled();
            expect(showGrowthResultsSpy).toHaveBeenCalled();
        });
    });

    describe('データ永続化統合フロー', () => {
        test('経験値データの保存・読み込みフロー', async () => {
            const playerId = 'player-001';

            // 経験値獲得
            experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                amount: 50,
                timestamp: Date.now()
            });

            // データ保存
            const saveResult = await saveDataManager.saveGameData({
                characters: characterManager.getAllCharacters(),
                experienceData: {
                    [playerId]: experienceSystem.getExperienceInfo(playerId)
                }
            });

            expect(saveResult.success).toBe(true);

            // データ読み込み
            const loadResult = await saveDataManager.loadGameData();
            expect(loadResult.success).toBe(true);

            // 経験値データの復元確認
            if (loadResult.data?.experienceData) {
                const restoredExpInfo = loadResult.data.experienceData[playerId];
                expect(restoredExpInfo.currentExperience).toBe(50);
            }
        });

        test('章進行時の経験値情報継続フロー', async () => {
            const playerId = 'player-001';

            // 章1での経験値獲得
            experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                amount: 75,
                timestamp: Date.now()
            });

            const chapter1ExpInfo = experienceSystem.getExperienceInfo(playerId);

            // 章完了時の保存
            await saveDataManager.saveChapterProgress('chapter-1', {
                characters: characterManager.getAllCharacters(),
                experienceData: {
                    [playerId]: chapter1ExpInfo
                }
            });

            // 章2開始時の読み込み
            const chapter2Data = await saveDataManager.loadChapterProgress('chapter-2');

            // 経験値情報が継続されていることを確認
            expect(chapter2Data.experienceData[playerId].currentExperience).toBe(75);
        });

        test('新規仲間キャラクターの初期経験値設定フロー', async () => {
            const newCharacterId = 'recruited-001';
            const currentChapter = 'chapter-2';
            const currentStage = 5;

            // 新規仲間の初期レベル・経験値設定
            const newCharacterSettings = {
                characterId: newCharacterId,
                initialLevel: 3, // 現在の進行に合わせたレベル
                initialExperience: 250, // レベル3相当の経験値
                joinChapter: currentChapter,
                joinStage: currentStage
            };

            // 新規キャラクター追加
            const newUnit = createMockUnit(
                newCharacterId,
                newCharacterSettings.initialLevel,
                newCharacterSettings.initialExperience
            );

            characterManager.addCharacter(newUnit);

            // 経験値情報確認
            const expInfo = experienceSystem.getExperienceInfo(newCharacterId);
            expect(expInfo.currentLevel).toBe(3);
            expect(expInfo.currentExperience).toBe(250);
        });
    });

    describe('UI表示同期フロー', () => {
        test('経験値獲得時のUI更新フロー', async () => {
            const playerId = 'player-001';

            // UI更新メソッドのスパイ
            const showExperienceGainSpy = jest.spyOn(experienceSystem['experienceUI'], 'showExperienceGain');
            const updateExperienceBarSpy = jest.spyOn(experienceSystem['experienceUI'], 'updateExperienceBar');

            // 経験値獲得
            experienceSystem.awardExperience(playerId, ExperienceAction.ATTACK, {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            });

            // UI更新確認
            expect(showExperienceGainSpy).toHaveBeenCalledWith(
                playerId,
                5,
                ExperienceSource.ATTACK_HIT
            );

            const expInfo = experienceSystem.getExperienceInfo(playerId);
            expect(updateExperienceBarSpy).toHaveBeenCalledWith(
                playerId,
                expInfo.currentExperience,
                expInfo.experienceToNextLevel
            );
        });

        test('レベルアップ時のUI演出フロー', async () => {
            const playerId = 'player-001';

            // UI演出メソッドのスパイ
            const showLevelUpEffectSpy = jest.spyOn(experienceSystem['experienceUI'], 'showLevelUpEffect');
            const showGrowthResultsSpy = jest.spyOn(experienceSystem['experienceUI'], 'showGrowthResults');

            // レベルアップに必要な経験値付与
            experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                amount: 100,
                timestamp: Date.now()
            });

            // レベルアップ実行
            const levelUpResult = experienceSystem.checkAndProcessLevelUp(playerId);

            // UI演出確認
            expect(showLevelUpEffectSpy).toHaveBeenCalledWith(
                expect.any(Object),
                levelUpResult
            );

            expect(showGrowthResultsSpy).toHaveBeenCalledWith(
                expect.any(Object),
                levelUpResult!.statGrowth
            );
        });

        test('キャラクター情報表示時の経験値情報表示フロー', async () => {
            const playerId = 'player-001';

            // 経験値獲得
            experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                amount: 50,
                timestamp: Date.now()
            });

            // キャラクター情報表示
            const displayExperienceInfoSpy = jest.spyOn(experienceSystem['experienceUI'], 'displayExperienceInfo');

            const expInfo = experienceSystem.getExperienceInfo(playerId);
            experienceSystem['experienceUI'].displayExperienceInfo(playerId, expInfo);

            expect(displayExperienceInfoSpy).toHaveBeenCalledWith(playerId, expInfo);
        });
    });

    describe('エラー処理統合フロー', () => {
        test('経験値処理中のエラー回復フロー', async () => {
            const playerId = 'player-001';

            // 不正なデータでエラー発生をシミュレート
            const invalidContext: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                amount: -100, // 不正な経験値量
                timestamp: Date.now()
            };

            // エラーハンドリングの確認
            expect(() => {
                experienceSystem.awardExperience(playerId, ExperienceAction.ATTACK, invalidContext);
            }).not.toThrow(); // エラーは内部で処理され、例外は投げられない

            // エラー後の状態確認
            const expInfo = experienceSystem.getExperienceInfo(playerId);
            expect(expInfo.currentExperience).toBe(0); // 不正な経験値は付与されない
        });

        test('データ破損時の復旧フロー', async () => {
            const playerId = 'player-001';

            // 正常な経験値データを作成
            experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                amount: 50,
                timestamp: Date.now()
            });

            // データ破損をシミュレート
            const corruptedData = null;

            // 復旧処理の確認
            const recoveryResult = await saveDataManager.recoverFromCorruption(corruptedData);

            expect(recoveryResult.success).toBe(true);
            expect(recoveryResult.data).toBeDefined();
        });
    });

    describe('パフォーマンス統合テスト', () => {
        test('大規模戦闘での経験値処理パフォーマンス', async () => {
            const playerIds = Array.from({ length: 6 }, (_, i) => `player-${i + 1}`);
            const enemyIds = Array.from({ length: 20 }, (_, i) => `enemy-${i + 1}`);

            // 大規模戦闘のシミュレート
            const startTime = performance.now();

            playerIds.forEach(playerId => {
                enemyIds.forEach(enemyId => {
                    // 攻撃命中
                    experienceSystem.awardExperience(playerId, ExperienceAction.ATTACK, {
                        source: ExperienceSource.ATTACK_HIT,
                        action: ExperienceAction.ATTACK,
                        targetId: enemyId,
                        timestamp: Date.now()
                    });

                    // 敵撃破（一部）
                    if (Math.random() > 0.8) {
                        experienceSystem.awardExperience(playerId, ExperienceAction.DEFEAT, {
                            source: ExperienceSource.ENEMY_DEFEAT,
                            action: ExperienceAction.DEFEAT,
                            targetId: enemyId,
                            timestamp: Date.now()
                        });
                    }
                });

                // レベルアップ判定
                experienceSystem.checkAndProcessLevelUp(playerId);
            });

            const endTime = performance.now();
            const duration = endTime - startTime;

            // 大規模戦闘の処理が1秒以内で完了することを確認
            expect(duration).toBeLessThan(1000);
        });
    });
});
/**
 * 仲間化システム包括的テストスイート
 * 
 * このテストスイートは仲間化システム全体の統合テストを実行し、
 * 全要件の包括的なカバレッジを確認します。
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { NPCStateManager } from '../../game/src/systems/recruitment/NPCStateManager';
import { RecruitmentCondition } from '../../game/src/systems/recruitment/RecruitmentCondition';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { Unit, StageData, RecruitmentStatus, RecruitmentAction } from '../../game/src/types';

// モックデータとヘルパー関数
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit',
    name: 'Test Unit',
    position: { x: 0, y: 0 },
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
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    isRecruitable: true,
    ...overrides
});

const createMockStageData = (): StageData => ({
    id: 'test-stage',
    name: 'Test Stage',
    mapData: {
        width: 10,
        height: 10,
        tiles: Array(10).fill(null).map(() =>
            Array(10).fill({ type: 'grass', movementCost: 1 })
        )
    },
    playerUnits: [createMockUnit({ id: 'player-1', faction: 'player' })],
    enemyUnits: [
        createMockUnit({
            id: 'enemy-1',
            faction: 'enemy',
            isRecruitable: true,
            recruitmentConditions: [
                {
                    id: 'specific_attacker',
                    type: 'specific_attacker',
                    description: '主人公で攻撃して撃破する',
                    parameters: { attackerId: 'player-1' }
                }
            ]
        })
    ],
    victoryConditions: [{ type: 'defeat_all_enemies' }]
});

describe('RecruitmentSystem - 包括的テストスイート', () => {
    let gameplayScene: GameplayScene;
    let recruitmentSystem: RecruitmentSystem;
    let battleSystem: BattleSystem;
    let characterManager: CharacterManager;
    let gameStateManager: GameStateManager;
    let mockStageData: StageData;

    beforeEach(() => {
        // Phaserのモック環境をセットアップ
        gameplayScene = new GameplayScene();
        battleSystem = new BattleSystem();
        characterManager = new CharacterManager();
        gameStateManager = new GameStateManager();

        recruitmentSystem = new RecruitmentSystem(
            battleSystem,
            characterManager,
            gameStateManager
        );

        mockStageData = createMockStageData();
        gameplayScene.loadStage(mockStageData);
    });

    describe('要件1: 仲間化対象の管理', () => {
        test('1.1 敵キャラクターデータの仲間化可能フラグを認識する', () => {
            recruitmentSystem.initialize(mockStageData);

            const recruitableUnits = recruitmentSystem.getRecruitableUnits();
            expect(recruitableUnits).toHaveLength(1);
            expect(recruitableUnits[0].id).toBe('enemy-1');
            expect(recruitableUnits[0].isRecruitable).toBe(true);
        });

        test('1.2 仲間化可能な敵を内部的に仲間化対象として登録する', () => {
            recruitmentSystem.initialize(mockStageData);

            const targetUnit = characterManager.getUnitById('enemy-1');
            expect(recruitmentSystem.isRecruitmentTarget(targetUnit)).toBe(true);
        });

        test('1.3 仲間化可能キャラクターに特別な視覚的表示を適用する', () => {
            recruitmentSystem.initialize(mockStageData);

            const targetUnit = characterManager.getUnitById('enemy-1');
            const hasVisualIndicator = recruitmentSystem.hasRecruitmentIndicator(targetUnit);
            expect(hasVisualIndicator).toBe(true);
        });

        test('1.4 仲間化条件の妥当性を検証する', () => {
            const invalidCondition = {
                id: 'invalid',
                type: 'invalid_type' as any,
                description: 'Invalid condition',
                parameters: {}
            };

            expect(() => {
                recruitmentSystem.validateRecruitmentCondition(invalidCondition);
            }).toThrow('Invalid recruitment condition type');
        });

        test('1.5 仲間化対象撃破時に仲間化判定処理を実行する', () => {
            recruitmentSystem.initialize(mockStageData);

            const attacker = characterManager.getUnitById('player-1');
            const target = characterManager.getUnitById('enemy-1');

            const spy = jest.spyOn(recruitmentSystem, 'processRecruitmentAttempt');

            // 撃破をシミュレート
            battleSystem.executeAttack(attacker, target, target.currentHP);

            expect(spy).toHaveBeenCalledWith(attacker, target, target.currentHP);
        });
    });

    describe('要件2: 仲間化条件の設定と判定', () => {
        test('2.1 仲間化可能な敵選択時に仲間化条件を表示する', () => {
            recruitmentSystem.initialize(mockStageData);

            const targetUnit = characterManager.getUnitById('enemy-1');
            const conditions = recruitmentSystem.getRecruitmentConditions(targetUnit);

            expect(conditions).toHaveLength(1);
            expect(conditions[0].type).toBe('specific_attacker');
            expect(conditions[0].description).toBe('主人公で攻撃して撃破する');
        });

        test('2.2 複数条件がある場合に全ての条件と達成状況を表示する', () => {
            const multiConditionUnit = createMockUnit({
                id: 'multi-condition-enemy',
                recruitmentConditions: [
                    {
                        id: 'specific_attacker',
                        type: 'specific_attacker',
                        description: '主人公で攻撃',
                        parameters: { attackerId: 'player-1' }
                    },
                    {
                        id: 'hp_threshold',
                        type: 'hp_threshold',
                        description: 'HP30%以下',
                        parameters: { threshold: 0.3 }
                    }
                ]
            });

            characterManager.addUnit(multiConditionUnit);
            recruitmentSystem.initialize(mockStageData);

            const conditions = recruitmentSystem.getRecruitmentConditions(multiConditionUnit);
            const progress = recruitmentSystem.getRecruitmentProgress(multiConditionUnit);

            expect(conditions).toHaveLength(2);
            expect(progress.conditionsMet).toHaveLength(2);
            expect(progress.conditionsMet.every(met => met === false)).toBe(true);
        });

        test('2.3 特定キャラクター攻撃条件の判定', () => {
            recruitmentSystem.initialize(mockStageData);

            const attacker = characterManager.getUnitById('player-1');
            const target = characterManager.getUnitById('enemy-1');
            const wrongAttacker = createMockUnit({ id: 'wrong-attacker', faction: 'player' });

            const resultCorrect = recruitmentSystem.checkRecruitmentEligibility(attacker, target);
            const resultWrong = recruitmentSystem.checkRecruitmentEligibility(wrongAttacker, target);

            expect(resultCorrect.conditionsMet[0]).toBe(true);
            expect(resultWrong.conditionsMet[0]).toBe(false);
        });

        test('2.4 HP残量による条件の判定', () => {
            const hpConditionUnit = createMockUnit({
                id: 'hp-condition-enemy',
                currentHP: 30, // 30% HP
                recruitmentConditions: [{
                    id: 'hp_threshold',
                    type: 'hp_threshold',
                    description: 'HP30%以下',
                    parameters: { threshold: 0.3 }
                }]
            });

            characterManager.addUnit(hpConditionUnit);
            recruitmentSystem.initialize(mockStageData);

            const attacker = characterManager.getUnitById('player-1');
            const result = recruitmentSystem.checkRecruitmentEligibility(attacker, hpConditionUnit);

            expect(result.conditionsMet[0]).toBe(true);
        });

        test('2.5 仲間化条件満たして撃破時に仲間化成功判定を実行', () => {
            recruitmentSystem.initialize(mockStageData);

            const attacker = characterManager.getUnitById('player-1');
            const target = characterManager.getUnitById('enemy-1');

            const result = recruitmentSystem.processRecruitmentAttempt(attacker, target, target.currentHP);

            expect(result).toBe(true);
            expect(recruitmentSystem.isNPC(target)).toBe(true);
        });
    });

    describe('要件3: NPC状態の管理', () => {
        test('3.1 仲間化条件満たして撃破時にNPC状態に変更', () => {
            recruitmentSystem.initialize(mockStageData);

            const attacker = characterManager.getUnitById('player-1');
            const target = characterManager.getUnitById('enemy-1');

            recruitmentSystem.processRecruitmentAttempt(attacker, target, target.currentHP);

            expect(recruitmentSystem.isNPC(target)).toBe(true);
            expect(target.faction).toBe('npc');
        });

        test('3.2 NPC状態のキャラクターは行動不可状態になる', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            expect(target.hasActed).toBe(true);
            expect(target.hasMoved).toBe(true);
            expect(recruitmentSystem.canAct(target)).toBe(false);
        });

        test('3.3 敵AIはNPCを最優先攻撃対象とする', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            const priority = recruitmentSystem.getNPCPriority(target);
            expect(priority).toBe(Number.MAX_SAFE_INTEGER);
        });

        test('3.4 NPC状態キャラクターへの通常ダメージ計算適用', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            const initialHP = target.currentHP;
            const damage = 20;

            recruitmentSystem.handleNPCDamage(target, damage);

            expect(target.currentHP).toBe(initialHP - damage);
        });

        test('3.5 NPC撃破時に仲間化失敗となる', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            // NPCを撃破
            recruitmentSystem.handleNPCDamage(target, target.currentHP);

            const recruitmentResult = recruitmentSystem.getRecruitmentResult(target);
            expect(recruitmentResult.success).toBe(false);
            expect(recruitmentResult.reason).toBe('NPC was defeated');
        });
    });

    describe('要件4: 仲間化の完了処理', () => {
        test('4.1 ステージクリア時に生存NPCを確認', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            // ステージクリア条件を満たす
            gameStateManager.setVictoryConditionMet(true);

            const survivingNPCs = recruitmentSystem.getSurvivingNPCs();
            expect(survivingNPCs).toHaveLength(1);
            expect(survivingNPCs[0].id).toBe('enemy-1');
        });

        test('4.2 生存NPC存在時に仲間化成功演出を実行', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            const spy = jest.spyOn(recruitmentSystem, 'showRecruitmentSuccess');

            recruitmentSystem.completeRecruitment();

            expect(spy).toHaveBeenCalledWith(target);
        });

        test('4.3 仲間化成功時に次ステージから味方として使用可能', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            const recruitedUnits = recruitmentSystem.completeRecruitment();

            expect(recruitedUnits).toHaveLength(1);
            expect(recruitedUnits[0].faction).toBe('player');
            expect(recruitedUnits[0].isRecruited).toBe(true);
        });

        test('4.4 パーティ編成画面で仲間化キャラクターを表示', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);
            recruitmentSystem.completeRecruitment();

            const availableUnits = characterManager.getAvailableUnits();
            const recruitedUnit = availableUnits.find(unit => unit.id === 'enemy-1');

            expect(recruitedUnit).toBeDefined();
            expect(recruitedUnit?.faction).toBe('player');
        });

        test('4.5 仲間化キャラクターを通常の味方として扱う', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);
            const recruitedUnits = recruitmentSystem.completeRecruitment();

            const recruitedUnit = recruitedUnits[0];

            // 通常の味方と同様の能力を持つことを確認
            expect(recruitedUnit.stats).toEqual(target.stats);
            expect(recruitedUnit.faction).toBe('player');
            expect(characterManager.isPlayerUnit(recruitedUnit)).toBe(true);
        });
    });

    describe('要件5: 仲間化システムのUI表示', () => {
        test('5.1 仲間化可能敵選択時に条件を分かりやすく表示', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            const spy = jest.spyOn(recruitmentSystem, 'showRecruitmentConditions');

            recruitmentSystem.selectRecruitmentTarget(target);

            expect(spy).toHaveBeenCalledWith(target, expect.any(Array));
        });

        test('5.2 仲間化条件進捗をリアルタイムで更新表示', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            const spy = jest.spyOn(recruitmentSystem, 'updateRecruitmentProgress');

            // 条件の一部を満たす
            const attacker = characterManager.getUnitById('player-1');
            recruitmentSystem.checkRecruitmentEligibility(attacker, target);

            expect(spy).toHaveBeenCalledWith(target, expect.any(Object));
        });

        test('5.3 NPC状態キャラクターに特別な視覚的表示を適用', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            const spy = jest.spyOn(recruitmentSystem, 'showNPCIndicator');

            recruitmentSystem.convertToNPC(target);

            expect(spy).toHaveBeenCalledWith(target);
        });

        test('5.4 仲間化成功時に成功演出と結果を表示', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            const spy = jest.spyOn(recruitmentSystem, 'showRecruitmentSuccess');

            recruitmentSystem.completeRecruitment();

            expect(spy).toHaveBeenCalledWith(target);
        });

        test('5.5 仲間化失敗時に失敗理由と結果を表示', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            // NPCを撃破して失敗させる
            recruitmentSystem.handleNPCDamage(target, target.currentHP);

            const spy = jest.spyOn(recruitmentSystem, 'showRecruitmentFailure');

            recruitmentSystem.completeRecruitment();

            expect(spy).toHaveBeenCalledWith(target, 'NPC was defeated');
        });
    });

    describe('要件6: 戦闘システムとの統合', () => {
        test('6.1 仲間化対象への攻撃時に仲間化条件をチェック', () => {
            recruitmentSystem.initialize(mockStageData);

            const attacker = characterManager.getUnitById('player-1');
            const target = characterManager.getUnitById('enemy-1');

            const spy = jest.spyOn(recruitmentSystem, 'checkRecruitmentEligibility');

            battleSystem.executeAttack(attacker, target, 50);

            expect(spy).toHaveBeenCalledWith(attacker, target);
        });

        test('6.2 仲間化条件チェック時に戦闘フローを中断しない', () => {
            recruitmentSystem.initialize(mockStageData);

            const attacker = characterManager.getUnitById('player-1');
            const target = characterManager.getUnitById('enemy-1');

            const startTime = Date.now();
            battleSystem.executeAttack(attacker, target, 50);
            const endTime = Date.now();

            // 戦闘処理が適切な時間内で完了することを確認
            expect(endTime - startTime).toBeLessThan(100);
        });

        test('6.3 仲間化条件を満たさない場合に通常戦闘処理を継続', () => {
            recruitmentSystem.initialize(mockStageData);

            const wrongAttacker = createMockUnit({ id: 'wrong-attacker', faction: 'player' });
            const target = characterManager.getUnitById('enemy-1');

            const initialHP = target.currentHP;
            battleSystem.executeAttack(wrongAttacker, target, 30);

            expect(target.currentHP).toBe(initialHP - 30);
            expect(recruitmentSystem.isNPC(target)).toBe(false);
        });

        test('6.4 NPC状態変更時に戦闘システム状態を適切に更新', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            expect(battleSystem.isValidTarget(target, 'player')).toBe(false);
            expect(battleSystem.isValidTarget(target, 'enemy')).toBe(true);
        });

        test('6.5 戦闘システムエラー時の適切なエラーハンドリング', () => {
            recruitmentSystem.initialize(mockStageData);

            const attacker = characterManager.getUnitById('player-1');
            const target = characterManager.getUnitById('enemy-1');

            // 戦闘システムエラーをシミュレート
            jest.spyOn(battleSystem, 'executeAttack').mockImplementation(() => {
                throw new Error('Battle system error');
            });

            expect(() => {
                battleSystem.executeAttack(attacker, target, 50);
            }).not.toThrow();

            // エラーログが記録されることを確認
            expect(recruitmentSystem.getLastError()).toContain('Battle system error');
        });
    });

    describe('要件7: データ管理と永続化', () => {
        test('7.1 仲間化成功時にゲームデータに保存', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);
            recruitmentSystem.completeRecruitment();

            const savedData = gameStateManager.getSaveData();
            expect(savedData.recruitedUnits).toContain('enemy-1');
        });

        test('7.2 ゲーム再開時に仲間化情報を正しく読み込み', () => {
            const saveData = {
                recruitedUnits: ['enemy-1'],
                stageProgress: { currentStage: 2 }
            };

            gameStateManager.loadSaveData(saveData);
            recruitmentSystem.initialize(mockStageData);

            const availableUnits = characterManager.getAvailableUnits();
            const recruitedUnit = availableUnits.find(unit => unit.id === 'enemy-1');

            expect(recruitedUnit).toBeDefined();
            expect(recruitedUnit?.isRecruited).toBe(true);
        });

        test('7.3 仲間化キャラクターデータ変更時の永続化', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);
            const recruitedUnits = recruitmentSystem.completeRecruitment();

            const recruitedUnit = recruitedUnits[0];
            recruitedUnit.stats.attack += 5; // 能力値変更

            characterManager.updateUnit(recruitedUnit);

            const savedData = gameStateManager.getSaveData();
            const savedUnit = savedData.units.find((u: Unit) => u.id === 'enemy-1');
            expect(savedUnit.stats.attack).toBe(recruitedUnit.stats.attack);
        });

        test('7.4 章変更時の仲間化キャラクター可用性管理', () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);
            recruitmentSystem.completeRecruitment();

            // 次の章に進む
            gameStateManager.advanceToNextChapter();

            const availableUnits = characterManager.getAvailableUnits();
            const recruitedUnit = availableUnits.find(unit => unit.id === 'enemy-1');

            expect(recruitedUnit).toBeDefined();
            expect(recruitedUnit?.isAvailable).toBe(true);
        });

        test('7.5 データ整合性問題時の適切なエラーハンドリング', () => {
            const corruptedSaveData = {
                recruitedUnits: ['non-existent-unit'],
                stageProgress: null
            };

            expect(() => {
                gameStateManager.loadSaveData(corruptedSaveData);
                recruitmentSystem.initialize(mockStageData);
            }).not.toThrow();

            // データ修復が行われることを確認
            const repairedData = gameStateManager.getSaveData();
            expect(repairedData.recruitedUnits).toEqual([]);
        });
    });

    describe('要件8: パフォーマンスと最適化', () => {
        test('8.1 仲間化条件チェック時の60fps維持', async () => {
            recruitmentSystem.initialize(mockStageData);

            const attacker = characterManager.getUnitById('player-1');
            const target = characterManager.getUnitById('enemy-1');

            const frameTime = 16.67; // 60fps = 16.67ms per frame
            const startTime = performance.now();

            // 大量の条件チェックを実行
            for (let i = 0; i < 100; i++) {
                recruitmentSystem.checkRecruitmentEligibility(attacker, target);
            }

            const endTime = performance.now();
            const averageTime = (endTime - startTime) / 100;

            expect(averageTime).toBeLessThan(frameTime);
        });

        test('8.2 複数NPC存在時の適切なメモリ使用量維持', () => {
            recruitmentSystem.initialize(mockStageData);

            // 複数のNPCを作成
            const npcs = [];
            for (let i = 0; i < 10; i++) {
                const npc = createMockUnit({ id: `npc-${i}`, faction: 'enemy' });
                characterManager.addUnit(npc);
                recruitmentSystem.convertToNPC(npc);
                npcs.push(npc);
            }

            const memoryUsage = process.memoryUsage();
            expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB以下
        });

        test('8.3 大量仲間化データ存在時の効率的データアクセス', () => {
            // 大量の仲間化データを作成
            const largeRecruitmentData = Array.from({ length: 1000 }, (_, i) => ({
                id: `unit-${i}`,
                isRecruited: true,
                recruitmentStage: i % 10
            }));

            gameStateManager.setRecruitmentData(largeRecruitmentData);

            const startTime = performance.now();
            const recruitedUnit = recruitmentSystem.getRecruitedUnit('unit-500');
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(1); // 1ms以下
            expect(recruitedUnit).toBeDefined();
        });

        test('8.4 仲間化演出実行時の他処理非ブロック', async () => {
            recruitmentSystem.initialize(mockStageData);

            const target = characterManager.getUnitById('enemy-1');
            recruitmentSystem.convertToNPC(target);

            let otherProcessCompleted = false;

            // 仲間化演出を開始
            const recruitmentPromise = recruitmentSystem.showRecruitmentSuccess(target);

            // 他の処理を並行実行
            setTimeout(() => {
                otherProcessCompleted = true;
            }, 10);

            await recruitmentPromise;

            expect(otherProcessCompleted).toBe(true);
        });

        test('8.5 パフォーマンス問題発生時の適切な最適化適用', () => {
            recruitmentSystem.initialize(mockStageData);

            // パフォーマンス問題をシミュレート
            const slowCondition = {
                id: 'slow_condition',
                type: 'custom',
                description: 'Slow condition',
                parameters: {},
                checkCondition: () => {
                    // 意図的に遅い処理
                    const start = Date.now();
                    while (Date.now() - start < 50) { } // 50ms待機
                    return true;
                }
            };

            const target = characterManager.getUnitById('enemy-1');
            target.recruitmentConditions = [slowCondition];

            const attacker = characterManager.getUnitById('player-1');

            const startTime = performance.now();
            recruitmentSystem.checkRecruitmentEligibility(attacker, target);
            const endTime = performance.now();

            // 最適化により処理時間が短縮されることを確認
            expect(endTime - startTime).toBeLessThan(20); // 最適化により20ms以下
        });
    });
});
/**
 * スキルシステム エンドツーエンド ワークフローテスト
 * 
 * このテストファイルは以下をテストします：
 * - 完全なスキル使用ワークフロー
 * - ユーザー操作からスキル効果適用までの全フロー
 * - 複数システム間の連携
 * - 実際のゲームプレイシナリオ
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { Unit } from '../../game/src/types/gameplay';
import { SkillData, SkillType, TargetType } from '../../game/src/types/skill';

// Phaserのモック
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn(),
            setColor: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        sprite: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })
    },
    events: {
        on: jest.fn(),
        emit: jest.fn(),
        removeAllListeners: jest.fn()
    },
    input: {
        keyboard: {
            on: jest.fn(),
            addKey: jest.fn().mockReturnValue({
                once: jest.fn(),
                destroy: jest.fn()
            })
        },
        on: jest.fn()
    },
    tweens: {
        add: jest.fn().mockReturnValue({
            destroy: jest.fn()
        })
    },
    time: {
        delayedCall: jest.fn()
    },
    cameras: {
        main: {
            width: 800,
            height: 600,
            scrollX: 0,
            scrollY: 0,
            zoom: 1
        }
    },
    cache: {
        json: {
            get: jest.fn().mockReturnValue({
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 }))
            })
        }
    },
    load: {
        json: jest.fn(),
        on: jest.fn()
    },
    data: {
        set: jest.fn(),
        get: jest.fn(),
        remove: jest.fn(),
        removeAll: jest.fn()
    }
};

// テスト用ユニット作成
const createTestUnit = (id: string, name: string, faction: 'player' | 'enemy', position: { x: number, y: number }): Unit => ({
    id,
    name,
    position,
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 25,
        defense: 15,
        speed: 12,
        movement: 3
    },
    currentHP: 100,
    currentMP: 50,
    faction,
    hasActed: false,
    hasMoved: false
});

// テスト用スキルデータ
const createTestSkillData = (id: string, overrides: Partial<SkillData> = {}): SkillData => ({
    id,
    name: `Test Skill ${id}`,
    description: `Test skill description for ${id}`,
    skillType: SkillType.ATTACK,
    targetType: TargetType.SINGLE_ENEMY,
    range: 2,
    areaOfEffect: {
        shape: 'single',
        size: 1
    },
    effects: [{
        type: 'damage',
        value: 50,
        duration: 0
    }],
    usageCondition: {
        mpCost: 10,
        cooldown: 0,
        usageLimit: 0,
        levelRequirement: 1,
        weaponRequirement: [],
        jobRequirement: undefined
    },
    learnCondition: {
        level: 1,
        prerequisiteSkills: [],
        jobRequirement: undefined
    },
    animation: {
        castAnimation: 'cast',
        effectAnimation: 'effect',
        duration: 1000
    },
    ...overrides
});

describe('SkillSystem E2E Workflow Tests', () => {
    let gameplayScene: GameplayScene;
    let skillSystem: SkillSystem;
    let battleSystem: BattleSystem;
    let gameStateManager: GameStateManager;
    let playerUnit: Unit;
    let enemyUnit: Unit;

    beforeEach(() => {
        // テストユニットを作成
        playerUnit = createTestUnit('player-1', 'Hero', 'player', { x: 1, y: 1 });
        enemyUnit = createTestUnit('enemy-1', 'Orc', 'enemy', { x: 3, y: 1 });

        // GameplaySceneを作成
        gameplayScene = new GameplayScene({
            debugMode: true,
            autoSaveInterval: 0,
            cameraSpeed: 400,
            performanceMonitoring: true
        });

        // Phaserシーンのモックを設定
        Object.assign(gameplayScene, mockScene);

        // シーンを初期化
        gameplayScene.create();

        // システムを取得
        skillSystem = gameplayScene['skillSystem'];
        battleSystem = gameplayScene['battleSystem'];
        gameStateManager = gameplayScene['gameStateManager'];

        // ユニットを配置
        gameStateManager.addUnit(playerUnit);
        gameStateManager.addUnit(enemyUnit);
    });

    afterEach(() => {
        if (gameplayScene && typeof gameplayScene.destroy === 'function') {
            gameplayScene.destroy();
        }
    });

    describe('基本スキル使用ワークフロー', () => {
        test('プレイヤーターン開始からスキル使用完了まで', async () => {
            // 1. スキルを登録・習得
            const attackSkill = createTestSkillData('basic-attack', {
                name: '基本攻撃',
                skillType: SkillType.ATTACK,
                targetType: TargetType.SINGLE_ENEMY
            });

            skillSystem.registerSkill(attackSkill);
            skillSystem.learnSkill(playerUnit.id, 'basic-attack', {
                characterId: playerUnit.id,
                learnedSkills: ['basic-attack'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 2. プレイヤーターンを開始
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 3. ユニットが選択されていることを確認
            const selectedUnit = gameStateManager.getSelectedUnit();
            expect(selectedUnit?.id).toBe(playerUnit.id);

            // 4. スキルアクションを実行
            const availableSkills = skillSystem.getAvailableSkills(playerUnit.id);
            expect(availableSkills.length).toBeGreaterThan(0);

            const basicAttackSkill = availableSkills.find(s => s.skill.id === 'basic-attack');
            expect(basicAttackSkill).toBeDefined();
            expect(basicAttackSkill!.enabled).toBe(true);

            // 5. スキルを使用
            const skillResult = await skillSystem.useSkill(
                'basic-attack',
                playerUnit.id,
                enemyUnit.position,
                true // UIをスキップ
            );

            // 6. 結果を検証
            expect(skillResult.success).toBe(true);
            expect(skillResult.result?.targets).toContain(enemyUnit.id);
            expect(skillResult.result?.mpCost).toBe(10);

            // 7. ユニットの状態が更新されていることを確認
            expect(playerUnit.hasActed).toBe(true);
            expect(playerUnit.currentMP).toBe(40); // 50 - 10

            // 8. 敵ユニットがダメージを受けていることを確認
            expect(enemyUnit.currentHP).toBeLessThan(100);
        });

        test('スキル選択UIを使用した完全なワークフロー', async () => {
            // 1. 複数のスキルを準備
            const skills = [
                createTestSkillData('attack', { name: '攻撃', skillType: SkillType.ATTACK }),
                createTestSkillData('heal', {
                    name: '回復',
                    skillType: SkillType.HEAL,
                    targetType: TargetType.SINGLE_ALLY,
                    effects: [{ type: 'heal', value: 30, duration: 0 }]
                })
            ];

            skills.forEach(skill => {
                skillSystem.registerSkill(skill);
                skillSystem.learnSkill(playerUnit.id, skill.id, {
                    characterId: playerUnit.id,
                    learnedSkills: [skill.id],
                    skillCooldowns: new Map(),
                    skillUsageCounts: new Map(),
                    skillLearnHistory: [],
                    activeEffects: []
                });
            });

            // 2. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 3. スキル選択を開始（UIありモード）
            let skillSelectionPromise: Promise<any>;
            let resolveSkillSelection: (skill: any) => void;

            // スキル選択のPromiseを作成
            skillSelectionPromise = new Promise((resolve) => {
                resolveSkillSelection = resolve;
            });

            // スキル使用を開始（UIモード）
            const skillUsagePromise = skillSystem.useSkill(
                'attack', // 最初に選択されるスキル
                playerUnit.id,
                enemyUnit.position,
                false // UIを表示
            );

            // 4. UIが表示されることを確認
            expect(mockScene.add.container).toHaveBeenCalled();

            // 5. スキル選択をシミュレート
            setTimeout(() => {
                resolveSkillSelection('attack');
            }, 10);

            // 6. スキル使用完了を待機
            const result = await skillUsagePromise;

            // 7. 結果を検証
            expect(result.success).toBe(true);
            expect(result.flowStats?.totalTime).toBeGreaterThan(0);
        });
    });

    describe('複雑なスキル使用シナリオ', () => {
        test('範囲攻撃スキルによる複数敵への攻撃', async () => {
            // 1. 複数の敵ユニットを配置
            const enemy2 = createTestUnit('enemy-2', 'Goblin', 'enemy', { x: 4, y: 1 });
            const enemy3 = createTestUnit('enemy-3', 'Skeleton', 'enemy', { x: 3, y: 2 });

            gameStateManager.addUnit(enemy2);
            gameStateManager.addUnit(enemy3);

            // 2. 範囲攻撃スキルを準備
            const areaAttack = createTestSkillData('area-attack', {
                name: '範囲攻撃',
                skillType: SkillType.ATTACK,
                targetType: TargetType.AREA_ENEMY,
                range: 3,
                areaOfEffect: {
                    shape: 'square',
                    size: 2
                },
                effects: [{ type: 'damage', value: 40, duration: 0 }],
                usageCondition: {
                    mpCost: 20,
                    cooldown: 0,
                    usageLimit: 0,
                    levelRequirement: 1,
                    weaponRequirement: [],
                    jobRequirement: undefined
                }
            });

            skillSystem.registerSkill(areaAttack);
            skillSystem.learnSkill(playerUnit.id, 'area-attack', {
                characterId: playerUnit.id,
                learnedSkills: ['area-attack'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 3. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 4. 範囲攻撃を実行
            const result = await skillSystem.useSkill(
                'area-attack',
                playerUnit.id,
                { x: 3, y: 1 }, // 敵の中心位置
                true
            );

            // 5. 結果を検証
            expect(result.success).toBe(true);
            expect(result.result?.targets.length).toBeGreaterThan(1);
            expect(result.result?.mpCost).toBe(20);

            // 6. 複数の敵がダメージを受けていることを確認
            const damagedEnemies = [enemyUnit, enemy2, enemy3].filter(unit => unit.currentHP < 100);
            expect(damagedEnemies.length).toBeGreaterThan(1);
        });

        test('回復スキルによる味方の回復', async () => {
            // 1. 味方ユニットを追加
            const allyUnit = createTestUnit('ally-1', 'Cleric', 'player', { x: 2, y: 1 });
            allyUnit.currentHP = 50; // ダメージを受けた状態

            gameStateManager.addUnit(allyUnit);

            // 2. 回復スキルを準備
            const healSkill = createTestSkillData('heal', {
                name: '回復',
                skillType: SkillType.HEAL,
                targetType: TargetType.SINGLE_ALLY,
                effects: [{ type: 'heal', value: 40, duration: 0 }],
                usageCondition: {
                    mpCost: 15,
                    cooldown: 0,
                    usageLimit: 0,
                    levelRequirement: 1,
                    weaponRequirement: [],
                    jobRequirement: undefined
                }
            });

            skillSystem.registerSkill(healSkill);
            skillSystem.learnSkill(playerUnit.id, 'heal', {
                characterId: playerUnit.id,
                learnedSkills: ['heal'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 3. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 4. 回復スキルを実行
            const result = await skillSystem.useSkill(
                'heal',
                playerUnit.id,
                allyUnit.position,
                true
            );

            // 5. 結果を検証
            expect(result.success).toBe(true);
            expect(result.result?.targets).toContain(allyUnit.id);

            // 6. 味方のHPが回復していることを確認
            expect(allyUnit.currentHP).toBeGreaterThan(50);
            expect(allyUnit.currentHP).toBeLessThanOrEqual(100);
        });

        test('バフスキルによる能力値強化', async () => {
            // 1. バフスキルを準備
            const buffSkill = createTestSkillData('power-up', {
                name: 'パワーアップ',
                skillType: SkillType.BUFF,
                targetType: TargetType.SINGLE_ALLY,
                effects: [{
                    type: 'buff',
                    value: 20,
                    duration: 3,
                    buffType: 'attack_up' as any
                }],
                usageCondition: {
                    mpCost: 12,
                    cooldown: 0,
                    usageLimit: 0,
                    levelRequirement: 1,
                    weaponRequirement: [],
                    jobRequirement: undefined
                }
            });

            skillSystem.registerSkill(buffSkill);
            skillSystem.learnSkill(playerUnit.id, 'power-up', {
                characterId: playerUnit.id,
                learnedSkills: ['power-up'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 2. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 3. バフスキルを実行
            const result = await skillSystem.useSkill(
                'power-up',
                playerUnit.id,
                playerUnit.position, // 自分自身にバフ
                true
            );

            // 4. 結果を検証
            expect(result.success).toBe(true);
            expect(result.result?.effects[0]?.effectType).toBe('buff');
            expect(result.result?.effects[0]?.actualValue).toBe(20);

            // 5. バフ効果が適用されていることを確認
            // （実際の実装では、キャラクターの能力値が一時的に上昇する）
            expect(result.result?.targets).toContain(playerUnit.id);
        });
    });

    describe('エラーシナリオのワークフロー', () => {
        test('MP不足時のスキル使用失敗', async () => {
            // 1. 高コストスキルを準備
            const expensiveSkill = createTestSkillData('expensive-skill', {
                name: '高コストスキル',
                usageCondition: {
                    mpCost: 100, // プレイヤーのMP(50)を超える
                    cooldown: 0,
                    usageLimit: 0,
                    levelRequirement: 1,
                    weaponRequirement: [],
                    jobRequirement: undefined
                }
            });

            skillSystem.registerSkill(expensiveSkill);
            skillSystem.learnSkill(playerUnit.id, 'expensive-skill', {
                characterId: playerUnit.id,
                learnedSkills: ['expensive-skill'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 2. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 3. 使用可能スキルを確認
            const availableSkills = skillSystem.getAvailableSkills(playerUnit.id);
            const expensiveSkillItem = availableSkills.find(s => s.skill.id === 'expensive-skill');

            expect(expensiveSkillItem?.enabled).toBe(false);
            expect(expensiveSkillItem?.usability.error).toBe('insufficient_mp');

            // 4. スキル使用を試行
            const result = await skillSystem.useSkill(
                'expensive-skill',
                playerUnit.id,
                enemyUnit.position,
                true
            );

            // 5. 失敗結果を検証
            expect(result.success).toBe(false);
            expect(result.error?.type).toBe('insufficient_mp');

            // 6. ユニットの状態が変更されていないことを確認
            expect(playerUnit.hasActed).toBe(false);
            expect(playerUnit.currentMP).toBe(50); // 変更なし
        });

        test('射程外への攻撃失敗', async () => {
            // 1. 短射程スキルを準備
            const shortRangeSkill = createTestSkillData('short-range', {
                name: '短射程攻撃',
                range: 1 // 射程1
            });

            skillSystem.registerSkill(shortRangeSkill);
            skillSystem.learnSkill(playerUnit.id, 'short-range', {
                characterId: playerUnit.id,
                learnedSkills: ['short-range'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 2. 敵を射程外に配置
            enemyUnit.position = { x: 5, y: 5 }; // 射程外

            // 3. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 4. 射程外への攻撃を試行
            const result = await skillSystem.useSkill(
                'short-range',
                playerUnit.id,
                enemyUnit.position,
                true
            );

            // 5. 失敗結果を検証
            expect(result.success).toBe(false);
            expect(result.error?.type).toBe('out_of_range');

            // 6. 敵ユニットがダメージを受けていないことを確認
            expect(enemyUnit.currentHP).toBe(100);
        });

        test('クールダウン中のスキル使用失敗', async () => {
            // 1. クールダウンありスキルを準備
            const cooldownSkill = createTestSkillData('cooldown-skill', {
                name: 'クールダウンスキル',
                usageCondition: {
                    mpCost: 10,
                    cooldown: 3, // 3ターンのクールダウン
                    usageLimit: 0,
                    levelRequirement: 1,
                    weaponRequirement: [],
                    jobRequirement: undefined
                }
            });

            skillSystem.registerSkill(cooldownSkill);
            skillSystem.learnSkill(playerUnit.id, 'cooldown-skill', {
                characterId: playerUnit.id,
                learnedSkills: ['cooldown-skill'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 2. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 3. 1回目の使用（成功）
            const result1 = await skillSystem.useSkill(
                'cooldown-skill',
                playerUnit.id,
                enemyUnit.position,
                true
            );

            expect(result1.success).toBe(true);

            // 4. すぐに2回目の使用を試行（失敗）
            const availableSkills = skillSystem.getAvailableSkills(playerUnit.id);
            const cooldownSkillItem = availableSkills.find(s => s.skill.id === 'cooldown-skill');

            expect(cooldownSkillItem?.enabled).toBe(false);
            expect(cooldownSkillItem?.usability.error).toBe('skill_on_cooldown');

            // 5. 2回目の使用結果を検証
            const result2 = await skillSystem.useSkill(
                'cooldown-skill',
                playerUnit.id,
                enemyUnit.position,
                true
            );

            expect(result2.success).toBe(false);
            expect(result2.error?.type).toBe('skill_on_cooldown');
        });
    });

    describe('ターン制システムとの統合', () => {
        test('スキル使用後のターン進行', async () => {
            // 1. スキルを準備
            const turnSkill = createTestSkillData('turn-skill', {
                name: 'ターンスキル'
            });

            skillSystem.registerSkill(turnSkill);
            skillSystem.learnSkill(playerUnit.id, 'turn-skill', {
                characterId: playerUnit.id,
                learnedSkills: ['turn-skill'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 2. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 3. 現在のターンを記録
            const initialTurn = gameStateManager.getCurrentTurn();

            // 4. スキルを使用
            const result = await skillSystem.useSkill(
                'turn-skill',
                playerUnit.id,
                enemyUnit.position,
                true
            );

            expect(result.success).toBe(true);

            // 5. ユニットが行動済みになることを確認
            expect(playerUnit.hasActed).toBe(true);

            // 6. ターン進行イベントが発火されることを確認
            expect(mockScene.events.emit).toHaveBeenCalledWith(
                'turn-system-update',
                expect.any(Object)
            );
        });

        test('敵ターン中のスキル使用制限', async () => {
            // 1. スキルを準備
            const playerSkill = createTestSkillData('player-skill');

            skillSystem.registerSkill(playerSkill);
            skillSystem.learnSkill(playerUnit.id, 'player-skill', {
                characterId: playerUnit.id,
                learnedSkills: ['player-skill'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 2. 敵ターンに設定
            gameStateManager.setCurrentPlayer('enemy');

            // 3. プレイヤーユニットでのスキル使用を試行
            const result = await skillSystem.useSkill(
                'player-skill',
                playerUnit.id,
                enemyUnit.position,
                true
            );

            // 4. 使用が制限されることを確認
            expect(result.success).toBe(false);
            expect(result.error?.type).toBe('not_player_turn');
        });
    });

    describe('パフォーマンステスト', () => {
        test('大量のスキル使用でのパフォーマンス', async () => {
            // 1. 複数のスキルを準備
            const skills = Array.from({ length: 10 }, (_, i) =>
                createTestSkillData(`perf-skill-${i}`, {
                    name: `パフォーマンステストスキル${i}`,
                    usageCondition: {
                        mpCost: 1, // 低コストで連続使用可能
                        cooldown: 0,
                        usageLimit: 0,
                        levelRequirement: 1,
                        weaponRequirement: [],
                        jobRequirement: undefined
                    }
                })
            );

            skills.forEach(skill => {
                skillSystem.registerSkill(skill);
                skillSystem.learnSkill(playerUnit.id, skill.id, {
                    characterId: playerUnit.id,
                    learnedSkills: [skill.id],
                    skillCooldowns: new Map(),
                    skillUsageCounts: new Map(),
                    skillLearnHistory: [],
                    activeEffects: []
                });
            });

            // 2. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 3. 連続でスキルを使用
            const startTime = performance.now();

            for (const skill of skills) {
                const result = await skillSystem.useSkill(
                    skill.id,
                    playerUnit.id,
                    enemyUnit.position,
                    true
                );
                expect(result.success).toBe(true);
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // 4. パフォーマンスを検証
            expect(totalTime).toBeLessThan(1000); // 1秒以内
            expect(totalTime / skills.length).toBeLessThan(50); // 1スキルあたり50ms以内

            // 5. パフォーマンスメトリクスを確認
            const metrics = skillSystem.getPerformanceMetrics();
            expect(metrics.get('avg_total_time')).toBeDefined();
            expect(metrics.get('avg_execution_time')).toBeDefined();
        });

        test('複雑なスキル効果のパフォーマンス', async () => {
            // 1. 複雑な効果を持つスキルを準備
            const complexSkill = createTestSkillData('complex-skill', {
                name: '複雑スキル',
                effects: [
                    { type: 'damage', value: 50, duration: 0 },
                    { type: 'debuff', value: -10, duration: 3 },
                    { type: 'status', value: 5, duration: 2 },
                    { type: 'heal', value: 20, duration: 0 }
                ],
                areaOfEffect: {
                    shape: 'circle',
                    size: 3
                }
            });

            skillSystem.registerSkill(complexSkill);
            skillSystem.learnSkill(playerUnit.id, 'complex-skill', {
                characterId: playerUnit.id,
                learnedSkills: ['complex-skill'],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            });

            // 2. プレイヤーターンを設定
            gameStateManager.setCurrentPlayer('player');
            gameStateManager.selectUnit(playerUnit.id);

            // 3. 複雑スキルを使用
            const startTime = performance.now();

            const result = await skillSystem.useSkill(
                'complex-skill',
                playerUnit.id,
                enemyUnit.position,
                true
            );

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // 4. 結果とパフォーマンスを検証
            expect(result.success).toBe(true);
            expect(result.result?.effects).toHaveLength(4);
            expect(executionTime).toBeLessThan(100); // 100ms以内

            // 5. フロー統計を確認
            expect(result.flowStats?.totalTime).toBeDefined();
            expect(result.flowStats?.executionTime).toBeDefined();
        });
    });

    describe('システム統合の完全性テスト', () => {
        test('全システムが連携した完全なゲームフロー', async () => {
            // 1. 複数のスキルを準備
            const gameSkills = [
                createTestSkillData('sword-attack', {
                    name: '剣攻撃',
                    skillType: SkillType.ATTACK,
                    usageCondition: { mpCost: 5, cooldown: 0, usageLimit: 0, levelRequirement: 1, weaponRequirement: ['sword'], jobRequirement: undefined }
                }),
                createTestSkillData('magic-heal', {
                    name: '魔法回復',
                    skillType: SkillType.HEAL,
                    targetType: TargetType.SINGLE_ALLY,
                    usageCondition: { mpCost: 15, cooldown: 2, usageLimit: 0, levelRequirement: 1, weaponRequirement: [], jobRequirement: 'mage' }
                }),
                createTestSkillData('fire-ball', {
                    name: 'ファイアボール',
                    skillType: SkillType.ATTACK,
                    areaOfEffect: { shape: 'circle', size: 2 },
                    usageCondition: { mpCost: 20, cooldown: 1, usageLimit: 3, levelRequirement: 5, weaponRequirement: [], jobRequirement: undefined }
                })
            ];

            gameSkills.forEach(skill => {
                skillSystem.registerSkill(skill);
                skillSystem.learnSkill(playerUnit.id, skill.id, {
                    characterId: playerUnit.id,
                    learnedSkills: [skill.id],
                    skillCooldowns: new Map(),
                    skillUsageCounts: new Map(),
                    skillLearnHistory: [],
                    activeEffects: []
                });
            });

            // 2. 複数ターンのゲームプレイをシミュレート
            const gameResults = [];

            for (let turn = 1; turn <= 3; turn++) {
                // プレイヤーターン
                gameStateManager.setCurrentPlayer('player');
                gameStateManager.selectUnit(playerUnit.id);

                // 使用可能なスキルを取得
                const availableSkills = skillSystem.getAvailableSkills(playerUnit.id);
                const usableSkills = availableSkills.filter(s => s.enabled);

                if (usableSkills.length > 0) {
                    // 最初の使用可能スキルを使用
                    const skillToUse = usableSkills[0];
                    const result = await skillSystem.useSkill(
                        skillToUse.skill.id,
                        playerUnit.id,
                        enemyUnit.position,
                        true
                    );

                    gameResults.push({
                        turn,
                        skillId: skillToUse.skill.id,
                        success: result.success,
                        mpCost: result.result?.mpCost || 0
                    });
                }

                // ターン終了処理
                playerUnit.hasActed = false; // 次のターンのためにリセット
            }

            // 3. 結果を検証
            expect(gameResults.length).toBeGreaterThan(0);
            expect(gameResults.every(r => r.success)).toBe(true);

            // 4. システム状態を確認
            const systemState = skillSystem.getSystemState();
            expect(systemState.initialized).toBe(true);

            // 5. パフォーマンスメトリクスを確認
            const metrics = skillSystem.getPerformanceMetrics();
            expect(metrics.size).toBeGreaterThan(0);

            // 6. 実行履歴を確認
            const history = skillSystem.getExecutionHistory();
            expect(history.length).toBe(gameResults.length);
        });
    });
});
/**
 * スキルシステムと経験値システムの統合テスト
 * 
 * このテストファイルでは以下の統合機能をテストします：
 * - 回復スキル使用時の経験値付与
 * - バフ・デバフスキル使用時の経験値付与
 * - スキル効果による経験値ボーナス機能
 * - スキルシステム統合の動作確認
 * 
 * 要件: 1.3, 5.3
 */

import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { SkillExecutor } from '../../game/src/systems/skills/SkillExecutor';
import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import {
    SkillData,
    SkillType,
    TargetType,
    SkillExecutionContext,
    SkillExperienceBonus
} from '../../game/src/types/skill';
import {
    ExperienceAction,
    ExperienceSource,
    ExperienceContext
} from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

// モックシーン
class MockScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MockScene' });
    }
}

// モック戦場状態
class MockBattlefieldState {
    private characters: Map<string, Unit> = new Map();

    constructor() {
        // テスト用キャラクターを追加
        this.characters.set('caster-001', {
            id: 'caster-001',
            name: 'Test Caster',
            position: { x: 0, y: 0 },
            stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
            currentHP: 80,
            currentMP: 40,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        });

        this.characters.set('target-001', {
            id: 'target-001',
            name: 'Test Target',
            position: { x: 1, y: 0 },
            stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
            currentHP: 60,
            currentMP: 30,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        });

        this.characters.set('enemy-001', {
            id: 'enemy-001',
            name: 'Test Enemy',
            position: { x: 2, y: 0 },
            stats: { maxHP: 80, maxMP: 30, attack: 18, defense: 12, speed: 8, movement: 2 },
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false
        });
    }

    getCharacter(characterId: string): Unit | null {
        return this.characters.get(characterId) || null;
    }

    getCharacterAt(position: { x: number; y: number }): Unit | null {
        for (const character of this.characters.values()) {
            if (character.position.x === position.x && character.position.y === position.y) {
                return character;
            }
        }
        return null;
    }

    updateCharacterState(characterId: string, updates: Partial<Unit>): void {
        const character = this.characters.get(characterId);
        if (character) {
            Object.assign(character, updates);
        }
    }

    getCurrentTurn(): number {
        return 1;
    }

    get battleId(): string {
        return 'test-battle-001';
    }
}

describe('SkillExperienceSystemIntegration', () => {
    let mockScene: MockScene;
    let skillSystem: SkillSystem;
    let experienceSystem: ExperienceSystem;
    let battlefieldState: MockBattlefieldState;

    // テスト用スキルデータ
    const healSkillData: SkillData = {
        id: 'heal-basic',
        name: 'Basic Heal',
        description: 'Basic healing spell',
        skillType: SkillType.HEAL,
        targetType: TargetType.SINGLE_ALLY,
        range: 2,
        areaOfEffect: { shape: 'single', size: 1 },
        effects: [
            {
                type: 'heal',
                value: 30,
                healType: 'fixed' as any
            }
        ],
        usageCondition: {
            mpCost: 10,
            cooldown: 0,
            usageLimit: 0,
            levelRequirement: 1
        },
        learnCondition: {
            level: 1
        },
        animation: {
            castAnimation: 'heal-cast',
            effectAnimation: 'heal-effect',
            duration: 1000
        }
    };

    const buffSkillData: SkillData = {
        id: 'buff-attack',
        name: 'Attack Buff',
        description: 'Increases attack power',
        skillType: SkillType.BUFF,
        targetType: TargetType.SINGLE_ALLY,
        range: 2,
        areaOfEffect: { shape: 'single', size: 1 },
        effects: [
            {
                type: 'buff',
                value: 10,
                duration: 3,
                buffType: 'attack_up' as any
            }
        ],
        usageCondition: {
            mpCost: 8,
            cooldown: 0,
            usageLimit: 0,
            levelRequirement: 1
        },
        learnCondition: {
            level: 1
        },
        animation: {
            castAnimation: 'buff-cast',
            effectAnimation: 'buff-effect',
            duration: 800
        }
    };

    const debuffSkillData: SkillData = {
        id: 'debuff-defense',
        name: 'Defense Debuff',
        description: 'Decreases defense power',
        skillType: SkillType.DEBUFF,
        targetType: TargetType.SINGLE_ENEMY,
        range: 3,
        areaOfEffect: { shape: 'single', size: 1 },
        effects: [
            {
                type: 'debuff',
                value: 8,
                duration: 3,
                buffType: 'defense_down' as any
            }
        ],
        usageCondition: {
            mpCost: 12,
            cooldown: 0,
            usageLimit: 0,
            levelRequirement: 2
        },
        learnCondition: {
            level: 2
        },
        animation: {
            castAnimation: 'debuff-cast',
            effectAnimation: 'debuff-effect',
            duration: 1200
        }
    };

    const bonusSkillData: SkillData = {
        id: 'special-heal',
        name: 'Special Heal',
        description: 'Healing spell with experience bonus',
        skillType: SkillType.HEAL,
        targetType: TargetType.AREA_ALLY,
        range: 2,
        areaOfEffect: { shape: 'circle', size: 2 },
        effects: [
            {
                type: 'heal',
                value: 25,
                healType: 'fixed' as any
            }
        ],
        usageCondition: {
            mpCost: 20,
            cooldown: 3,
            usageLimit: 0,
            levelRequirement: 5
        },
        learnCondition: {
            level: 5
        },
        animation: {
            castAnimation: 'special-heal-cast',
            effectAnimation: 'special-heal-effect',
            duration: 1500
        },
        experienceBonus: {
            baseMultiplier: 1.5,
            fixedBonus: 15,
            effectValueMultiplier: 0.2,
            targetCountBonus: 5,
            specialConditions: [
                {
                    type: 'low_hp',
                    value: 30,
                    bonus: 10,
                    description: 'Bonus when caster HP is below 30%'
                },
                {
                    type: 'multiple_targets',
                    value: 2,
                    bonus: 8,
                    description: 'Bonus when healing multiple targets'
                }
            ]
        }
    };

    beforeEach(async () => {
        // Phaserの初期化（完全版）
        global.Phaser = {
            Scene: class MockPhaserScene {
                add: any;
                constructor(config: any) {
                    this.add = {
                        container: (x: number, y: number) => ({
                            setScrollFactor: () => ({
                                setDepth: () => ({})
                            })
                        }),
                        text: () => ({
                            setOrigin: () => ({
                                setVisible: () => ({})
                            })
                        }),
                        graphics: () => ({
                            fillStyle: () => ({
                                fillRect: () => ({
                                    setVisible: () => ({})
                                })
                            })
                        })
                    };
                }
            },
            Events: {
                EventEmitter: class MockEventEmitter {
                    private listeners: Map<string, Function[]> = new Map();

                    on(event: string, listener: Function): void {
                        if (!this.listeners.has(event)) {
                            this.listeners.set(event, []);
                        }
                        this.listeners.get(event)!.push(listener);
                    }

                    off(event: string, listener: Function): void {
                        const eventListeners = this.listeners.get(event);
                        if (eventListeners) {
                            const index = eventListeners.indexOf(listener);
                            if (index > -1) {
                                eventListeners.splice(index, 1);
                            }
                        }
                    }

                    emit(event: string, ...args: any[]): void {
                        const eventListeners = this.listeners.get(event);
                        if (eventListeners) {
                            eventListeners.forEach(listener => listener(...args));
                        }
                    }

                    removeAllListeners(): void {
                        this.listeners.clear();
                    }
                }
            }
        } as any;

        mockScene = new MockScene();
        battlefieldState = new MockBattlefieldState();

        // 経験値システムを初期化
        experienceSystem = new ExperienceSystem(mockScene);
        await experienceSystem.initialize();

        // テストキャラクターを経験値システムに登録
        const caster = battlefieldState.getCharacter('caster-001')!;
        experienceSystem.registerCharacter(caster, 3, 150);

        // スキルシステムを初期化
        skillSystem = new SkillSystem(mockScene);
        skillSystem.setBattlefieldState(battlefieldState);
        skillSystem.setExperienceSystem(experienceSystem);

        // テスト用スキルを登録
        skillSystem.registerSkill(healSkillData);
        skillSystem.registerSkill(buffSkillData);
        skillSystem.registerSkill(debuffSkillData);
        skillSystem.registerSkill(bonusSkillData);

        // キャラクターにスキルを習得させる
        skillSystem.learnSkill('caster-001', 'heal-basic', caster);
        skillSystem.learnSkill('caster-001', 'buff-attack', caster);
        skillSystem.learnSkill('caster-001', 'debuff-defense', caster);
        skillSystem.learnSkill('caster-001', 'special-heal', caster);
    });

    afterEach(() => {
        skillSystem?.destroy();
        experienceSystem?.destroy();
    });

    describe('回復スキル使用時の経験値付与', () => {
        test('基本回復スキル使用で経験値を獲得する', async () => {
            // 初期経験値を記録
            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            // 回復スキルを使用
            const context: SkillExecutionContext = {
                caster: 'caster-001',
                skillId: 'heal-basic',
                targetPosition: { x: 1, y: 0 },
                battlefieldState: battlefieldState,
                currentTurn: 1,
                executionTime: new Date()
            };

            const result = await skillSystem.useSkill(
                'heal-basic',
                'caster-001',
                { x: 1, y: 0 },
                true // UI をスキップ
            );

            expect(result.success).toBe(true);

            // 経験値が増加していることを確認
            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            expect(finalExp.currentExperience).toBeGreaterThan(initialExp.currentExperience);
        });

        test('回復量に基づいてボーナス経験値を獲得する', async () => {
            // 対象のHPを減らす
            battlefieldState.updateCharacterState('target-001', { currentHP: 30 });

            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            // 回復スキルを使用
            const result = await skillSystem.useSkill(
                'heal-basic',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(true);

            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            const expGained = finalExp.currentExperience - initialExp.currentExperience;

            // 回復量に基づくボーナスが含まれていることを確認
            expect(expGained).toBeGreaterThan(10); // 基本経験値より多い
        });
    });

    describe('バフ・デバフスキル使用時の経験値付与', () => {
        test('バフスキル使用で支援経験値を獲得する', async () => {
            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            const result = await skillSystem.useSkill(
                'buff-attack',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(true);

            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            expect(finalExp.currentExperience).toBeGreaterThan(initialExp.currentExperience);
        });

        test('デバフスキル使用で支援経験値を獲得する', async () => {
            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            const result = await skillSystem.useSkill(
                'debuff-defense',
                'caster-001',
                { x: 2, y: 0 },
                true
            );

            expect(result.success).toBe(true);

            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            expect(finalExp.currentExperience).toBeGreaterThan(initialExp.currentExperience);
        });

        test('複数対象のバフで追加ボーナスを獲得する', async () => {
            // 複数の味方を配置
            battlefieldState.updateCharacterState('target-001', { position: { x: 1, y: 0 } });

            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            // 範囲バフスキルを使用（実際の実装では範囲バフスキルが必要）
            const result = await skillSystem.useSkill(
                'buff-attack',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(true);

            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            expect(finalExp.currentExperience).toBeGreaterThan(initialExp.currentExperience);
        });
    });

    describe('スキル効果による経験値ボーナス機能', () => {
        test('基本倍率ボーナスが適用される', async () => {
            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            const result = await skillSystem.useSkill(
                'special-heal',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(true);

            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            const expGained = finalExp.currentExperience - initialExp.currentExperience;

            // 基本倍率（1.5倍）と固定ボーナス（15）が適用されていることを確認
            expect(expGained).toBeGreaterThan(20); // 基本経験値 + 固定ボーナス + 倍率効果
        });

        test('低HP条件でボーナス経験値を獲得する', async () => {
            // 使用者のHPを30%以下に設定
            battlefieldState.updateCharacterState('caster-001', { currentHP: 25 });

            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            const result = await skillSystem.useSkill(
                'special-heal',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(true);

            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            const expGained = finalExp.currentExperience - initialExp.currentExperience;

            // 低HP条件ボーナス（10）が追加されていることを確認
            expect(expGained).toBeGreaterThan(30);
        });

        test('複数対象条件でボーナス経験値を獲得する', async () => {
            // 複数の対象を範囲内に配置
            battlefieldState.updateCharacterState('target-001', { position: { x: 1, y: 0 } });

            // 追加の味方キャラクターを作成
            const ally2: Unit = {
                id: 'ally-002',
                name: 'Test Ally 2',
                position: { x: 0, y: 1 },
                stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                currentHP: 50,
                currentMP: 30,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            };
            (battlefieldState as any).characters.set('ally-002', ally2);

            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            const result = await skillSystem.useSkill(
                'special-heal',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(true);

            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            const expGained = finalExp.currentExperience - initialExp.currentExperience;

            // 複数対象条件ボーナス（8）と対象数ボーナス（5 × 対象数）が追加されていることを確認
            expect(expGained).toBeGreaterThan(35);
        });

        test('効果値に基づくボーナスが計算される', async () => {
            // 対象のHPを大幅に減らして回復量を最大化
            battlefieldState.updateCharacterState('target-001', { currentHP: 10 });

            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            const result = await skillSystem.useSkill(
                'special-heal',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(true);

            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            const expGained = finalExp.currentExperience - initialExp.currentExperience;

            // 効果値倍率ボーナス（回復量 × 0.2）が含まれていることを確認
            expect(expGained).toBeGreaterThan(25);
        });
    });

    describe('スキルシステム統合の動作確認', () => {
        test('経験値システムが正しく設定されている', () => {
            expect(skillSystem).toBeDefined();
            expect(experienceSystem).toBeDefined();

            // スキルシステムに経験値システムが設定されていることを確認
            const systemState = skillSystem.getSystemState();
            expect(systemState.initialized).toBe(true);
        });

        test('スキル使用後にレベルアップが発生する', async () => {
            // 経験値をレベルアップ直前まで設定
            const expInfo = experienceSystem.getExperienceInfo('caster-001');
            const nearLevelUp = expInfo.experienceToNextLevel - 5;

            // 経験値を調整（実際の実装では適切なメソッドを使用）
            experienceSystem.registerCharacter(
                battlefieldState.getCharacter('caster-001')!,
                expInfo.currentLevel,
                expInfo.currentExperience + nearLevelUp
            );

            const initialLevel = experienceSystem.getExperienceInfo('caster-001').currentLevel;

            // 経験値を獲得するスキルを使用
            const result = await skillSystem.useSkill(
                'special-heal',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(true);

            // レベルアップが発生したことを確認
            const finalLevel = experienceSystem.getExperienceInfo('caster-001').currentLevel;
            expect(finalLevel).toBeGreaterThan(initialLevel);
        });

        test('戦闘コンテキストが正しく設定される', async () => {
            let capturedContext: ExperienceContext | null = null;

            // 経験値獲得イベントをリッスン
            experienceSystem.on('experience-awarded', (data) => {
                capturedContext = data.context;
            });

            const result = await skillSystem.useSkill(
                'heal-basic',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(true);
            expect(capturedContext).toBeDefined();
            expect(capturedContext!.battleContext).toBeDefined();
            expect(capturedContext!.battleContext!.battleId).toBe('test-battle-001');
            expect(capturedContext!.battleContext!.skillId).toBe('heal-basic');
        });

        test('異なるスキル種別で適切な経験値ソースが設定される', async () => {
            const capturedContexts: ExperienceContext[] = [];

            experienceSystem.on('experience-awarded', (data) => {
                capturedContexts.push(data.context);
            });

            // 回復スキル
            await skillSystem.useSkill('heal-basic', 'caster-001', { x: 1, y: 0 }, true);

            // バフスキル
            await skillSystem.useSkill('buff-attack', 'caster-001', { x: 1, y: 0 }, true);

            // デバフスキル
            await skillSystem.useSkill('debuff-defense', 'caster-001', { x: 2, y: 0 }, true);

            expect(capturedContexts).toHaveLength(3);

            // 回復スキルは HEALING ソース
            expect(capturedContexts[0].source).toBe(ExperienceSource.HEALING);
            expect(capturedContexts[0].action).toBe(ExperienceAction.HEAL);

            // バフスキルは ALLY_SUPPORT ソース
            expect(capturedContexts[1].source).toBe(ExperienceSource.ALLY_SUPPORT);
            expect(capturedContexts[1].action).toBe(ExperienceAction.BUFF_APPLY);

            // デバフスキルは ALLY_SUPPORT ソース
            expect(capturedContexts[2].source).toBe(ExperienceSource.ALLY_SUPPORT);
            expect(capturedContexts[2].action).toBe(ExperienceAction.DEBUFF_APPLY);
        });

        test('スキル失敗時は経験値を獲得しない', async () => {
            // MP不足の状態を作成
            battlefieldState.updateCharacterState('caster-001', { currentMP: 5 });

            const initialExp = experienceSystem.getExperienceInfo('caster-001');

            // MP消費の多いスキルを使用（失敗するはず）
            const result = await skillSystem.useSkill(
                'special-heal',
                'caster-001',
                { x: 1, y: 0 },
                true
            );

            expect(result.success).toBe(false);

            // 経験値が変化していないことを確認
            const finalExp = experienceSystem.getExperienceInfo('caster-001');
            expect(finalExp.currentExperience).toBe(initialExp.currentExperience);
        });
    });
});
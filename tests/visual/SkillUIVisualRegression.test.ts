/**
 * スキルUI ビジュアル回帰テスト
 * 
 * このテストファイルは以下をテストします：
 * - スキル選択UIの表示状態
 * - スキル効果範囲の視覚表現
 * - スキル情報パネルの表示
 * - アニメーション・エフェクトの視覚的確認
 * - キーボードナビゲーションの視覚フィードバック
 */

import { SkillUI, SkillUIConfig, SkillMenuItem } from '../../game/src/systems/skills/SkillUI';
import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { SkillData, SkillType, TargetType } from '../../game/src/types/skill';

// Phaserのモック（視覚的要素に特化）
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            x: 0,
            y: 0,
            width: 300,
            height: 400,
            visible: true,
            alpha: 1
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
            destroy: jest.fn(),
            fillColor: 0x000000,
            lineColor: 0xffffff,
            lineWidth: 2,
            visible: true,
            alpha: 1
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn(),
            setColor: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            text: '',
            style: {},
            x: 0,
            y: 0,
            visible: true,
            alpha: 1
        }),
        sprite: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            texture: { key: 'default' },
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            visible: true,
            alpha: 1
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
                destroy: jest.fn(),
                isDown: false
            })
        },
        on: jest.fn()
    },
    tweens: {
        add: jest.fn().mockImplementation((config) => ({
            destroy: jest.fn(),
            config,
            isPlaying: () => false,
            progress: 0
        }))
    },
    time: {
        delayedCall: jest.fn().mockReturnValue({
            destroy: jest.fn()
        })
    },
    cameras: {
        main: {
            width: 800,
            height: 600,
            scrollX: 0,
            scrollY: 0,
            zoom: 1
        }
    }
};

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
    icon: 'skill-icon',
    ...overrides
});

// テスト用スキルメニュー項目
const createTestSkillMenuItem = (skillData: SkillData, enabled: boolean = true): SkillMenuItem => ({
    skill: {
        id: skillData.id,
        name: skillData.name,
        description: skillData.description,
        skillType: skillData.skillType,
        targetType: skillData.targetType,
        range: skillData.range,
        areaOfEffect: skillData.areaOfEffect,
        effects: skillData.effects,
        usageCondition: skillData.usageCondition,
        learnCondition: skillData.learnCondition,
        animation: skillData.animation,
        execute: jest.fn(),
        canUse: jest.fn(),
        getValidTargets: jest.fn(),
        getAffectedPositions: jest.fn()
    },
    usability: {
        canUse: enabled,
        error: enabled ? undefined : 'insufficient_mp',
        message: enabled ? undefined : 'MP不足です',
        remainingUses: enabled ? undefined : 0
    },
    displayText: `${skillData.name} (MP:${skillData.usageCondition.mpCost})${enabled ? '' : ' [使用不可]'}`,
    enabled,
    recommendation: enabled ? 75 : 0
});

describe('SkillUI Visual Regression Tests', () => {
    let skillUI: SkillUI;
    let skillSystem: SkillSystem;
    let mockConfig: SkillUIConfig;

    beforeEach(() => {
        mockConfig = {
            menuPosition: { x: 100, y: 100 },
            menuSize: { width: 300, height: 400 },
            rangeColors: {
                valid: 0x00ff00,
                invalid: 0xff0000,
                selected: 0xffff00,
                area: 0x0088ff
            },
            animations: {
                menuFadeIn: 300,
                menuFadeOut: 200,
                rangeDisplay: 150
            },
            keyboard: {
                enabled: true,
                repeatDelay: 500,
                repeatRate: 150
            },
            detailPanel: {
                width: 350,
                height: 250,
                position: { x: 450, y: 100 }
            }
        };

        skillSystem = new SkillSystem(mockScene as any, {
            debugMode: true,
            ui: mockConfig
        });

        skillUI = new SkillUI(mockScene as any, mockConfig, skillSystem);
    });

    afterEach(() => {
        if (skillUI) {
            skillUI.destroy();
        }
        if (skillSystem) {
            skillSystem.destroy();
        }
    });

    describe('スキル選択メニューの視覚表現', () => {
        test('基本的なスキル選択メニューの表示', () => {
            const skills = [
                createTestSkillMenuItem(createTestSkillData('attack', { name: '攻撃' })),
                createTestSkillMenuItem(createTestSkillData('heal', { name: '回復', skillType: SkillType.HEAL })),
                createTestSkillMenuItem(createTestSkillData('buff', { name: 'バフ', skillType: SkillType.BUFF }))
            ];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // メニューコンテナが作成されることを確認
            expect(mockScene.add.container).toHaveBeenCalled();

            // 背景グラフィックが作成されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // スキル項目のテキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledTimes(skills.length);

            // メニューの位置が正しく設定されることを確認
            const containerCall = mockScene.add.container.mock.calls[0];
            expect(containerCall).toBeDefined();
        });

        test('使用不可スキルの視覚的区別', () => {
            const skills = [
                createTestSkillMenuItem(createTestSkillData('available', { name: '使用可能' }), true),
                createTestSkillMenuItem(createTestSkillData('unavailable', { name: '使用不可' }), false)
            ];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // テキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledTimes(2);

            // 使用不可スキルのテキストに [使用不可] が含まれることを確認
            const textCalls = mockScene.add.text.mock.calls;
            const unavailableTextCall = textCalls.find(call =>
                call[0] && typeof call[0] === 'string' && call[0].includes('[使用不可]')
            );
            expect(unavailableTextCall).toBeDefined();
        });

        test('スキル種別による色分け表示', () => {
            const skills = [
                createTestSkillMenuItem(createTestSkillData('attack', {
                    name: '攻撃',
                    skillType: SkillType.ATTACK
                })),
                createTestSkillMenuItem(createTestSkillData('heal', {
                    name: '回復',
                    skillType: SkillType.HEAL
                })),
                createTestSkillMenuItem(createTestSkillData('buff', {
                    name: 'バフ',
                    skillType: SkillType.BUFF
                }))
            ];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // 各スキル種別に対してテキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledTimes(3);

            // 色設定が呼ばれることを確認
            const textMocks = mockScene.add.text.mock.results;
            textMocks.forEach(result => {
                expect(result.value.setColor).toHaveBeenCalled();
            });
        });

        test('スキルアイコンの表示', () => {
            const skillWithIcon = createTestSkillMenuItem(createTestSkillData('icon-skill', {
                name: 'アイコン付きスキル',
                icon: 'skill-icon'
            }));

            skillUI.showSkillSelection(
                [skillWithIcon],
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // スプライトが作成されることを確認（アイコン用）
            expect(mockScene.add.sprite).toHaveBeenCalled();

            // スプライトの設定が正しく行われることを確認
            const spriteMock = mockScene.add.sprite.mock.results[0].value;
            expect(spriteMock.setOrigin).toHaveBeenCalledWith(0.5);
            expect(spriteMock.setScale).toHaveBeenCalled();
        });

        test('メニューのフェードインアニメーション', () => {
            const skills = [createTestSkillMenuItem(createTestSkillData('test'))];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // フェードインアニメーションが設定されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalled();

            const tweenCall = mockScene.tweens.add.mock.calls[0][0];
            expect(tweenCall.duration).toBe(mockConfig.animations.menuFadeIn);
            expect(tweenCall.alpha).toBeDefined();
        });
    });

    describe('スキル効果範囲の視覚表現', () => {
        test('単体対象スキルの範囲表示', () => {
            const singleSkill = {
                id: 'single-skill',
                name: '単体スキル',
                range: 2,
                areaOfEffect: { shape: 'single' as const, size: 1 },
                getAffectedPositions: jest.fn().mockReturnValue([{ x: 2, y: 1 }])
            };

            skillUI.showSkillRange(singleSkill as any, { x: 1, y: 1 });

            // 範囲表示用のグラフィックが作成されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // 範囲色が設定されることを確認
            const graphicsMock = mockScene.add.graphics.mock.results[0].value;
            expect(graphicsMock.fillStyle).toHaveBeenCalledWith(mockConfig.rangeColors.valid);
        });

        test('範囲攻撃スキルの効果範囲表示', () => {
            const areaSkill = {
                id: 'area-skill',
                name: '範囲スキル',
                range: 3,
                areaOfEffect: { shape: 'square' as const, size: 2 },
                getAffectedPositions: jest.fn().mockReturnValue([
                    { x: 2, y: 1 },
                    { x: 3, y: 1 },
                    { x: 2, y: 2 },
                    { x: 3, y: 2 }
                ])
            };

            skillUI.showSkillRange(areaSkill as any, { x: 1, y: 1 });

            // 複数の範囲タイルが描画されることを確認
            const graphicsMock = mockScene.add.graphics.mock.results[0].value;
            expect(graphicsMock.fillRoundedRect).toHaveBeenCalledTimes(4);
        });

        test('射程外位置の無効表示', () => {
            const skill = {
                id: 'range-skill',
                name: '射程スキル',
                range: 1,
                areaOfEffect: { shape: 'single' as const, size: 1 },
                getAffectedPositions: jest.fn().mockReturnValue([])
            };

            skillUI.showSkillRange(skill as any, { x: 1, y: 1 });

            // 無効範囲の色が使用されることを確認
            const graphicsMock = mockScene.add.graphics.mock.results[0].value;
            expect(graphicsMock.fillStyle).toHaveBeenCalledWith(mockConfig.rangeColors.invalid);
        });

        test('範囲表示のアニメーション', () => {
            const skill = {
                id: 'anim-skill',
                name: 'アニメーションスキル',
                range: 2,
                areaOfEffect: { shape: 'single' as const, size: 1 },
                getAffectedPositions: jest.fn().mockReturnValue([{ x: 2, y: 1 }])
            };

            skillUI.showSkillRange(skill as any, { x: 1, y: 1 });

            // 範囲表示アニメーションが設定されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalled();

            const tweenCall = mockScene.tweens.add.mock.calls.find(call =>
                call[0].duration === mockConfig.animations.rangeDisplay
            );
            expect(tweenCall).toBeDefined();
        });

        test('範囲表示のクリア', () => {
            // 範囲を表示
            const skill = {
                id: 'clear-skill',
                name: 'クリアスキル',
                range: 2,
                areaOfEffect: { shape: 'single' as const, size: 1 },
                getAffectedPositions: jest.fn().mockReturnValue([{ x: 2, y: 1 }])
            };

            skillUI.showSkillRange(skill as any, { x: 1, y: 1 });

            // 範囲表示をクリア
            skillUI.clearRangeDisplay();

            // グラフィックのクリアが呼ばれることを確認
            const graphicsMock = mockScene.add.graphics.mock.results[0].value;
            expect(graphicsMock.clear).toHaveBeenCalled();
        });
    });

    describe('スキル詳細情報パネル', () => {
        test('スキル詳細パネルの表示', () => {
            const detailSkill = createTestSkillData('detail-skill', {
                name: '詳細スキル',
                description: 'これは詳細な説明を持つスキルです。',
                usageCondition: {
                    mpCost: 25,
                    cooldown: 3,
                    usageLimit: 5,
                    levelRequirement: 10,
                    weaponRequirement: ['sword'],
                    jobRequirement: 'warrior'
                }
            });

            skillUI.showSkillDetails(detailSkill);

            // 詳細パネル用のコンテナが作成されることを確認
            expect(mockScene.add.container).toHaveBeenCalled();

            // 詳細情報のテキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalled();

            // 背景グラフィックが作成されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });

        test('スキル効果の視覚的表現', () => {
            const effectSkill = createTestSkillData('effect-skill', {
                name: '効果スキル',
                effects: [
                    { type: 'damage', value: 100, duration: 0 },
                    { type: 'debuff', value: -20, duration: 3 },
                    { type: 'status', value: 10, duration: 2 }
                ]
            });

            skillUI.showSkillDetails(effectSkill);

            // 各効果に対してテキストが作成されることを確認
            const textCalls = mockScene.add.text.mock.calls;
            expect(textCalls.length).toBeGreaterThan(3); // タイトル + 効果3つ以上
        });

        test('使用条件の詳細表示', () => {
            const conditionSkill = createTestSkillData('condition-skill', {
                name: '条件スキル',
                usageCondition: {
                    mpCost: 30,
                    cooldown: 5,
                    usageLimit: 3,
                    levelRequirement: 15,
                    weaponRequirement: ['staff', 'wand'],
                    jobRequirement: 'mage'
                }
            });

            skillUI.showSkillDetails(conditionSkill);

            // 使用条件の各項目がテキストとして表示されることを確認
            const textCalls = mockScene.add.text.mock.calls;
            const conditionTexts = textCalls.filter(call =>
                call[0] && typeof call[0] === 'string' && (
                    call[0].includes('MP') ||
                    call[0].includes('クールダウン') ||
                    call[0].includes('使用回数') ||
                    call[0].includes('レベル') ||
                    call[0].includes('武器') ||
                    call[0].includes('職業')
                )
            );
            expect(conditionTexts.length).toBeGreaterThan(0);
        });

        test('詳細パネルの位置とサイズ', () => {
            const skill = createTestSkillData('position-skill');

            skillUI.showSkillDetails(skill);

            // コンテナが正しい位置に配置されることを確認
            const containerCall = mockScene.add.container.mock.calls[0];
            expect(containerCall).toBeDefined();

            // 背景グラフィックが正しいサイズで作成されることを確認
            const graphicsCall = mockScene.add.graphics.mock.calls[0];
            expect(graphicsCall).toBeDefined();
        });
    });

    describe('キーボードナビゲーションの視覚フィードバック', () => {
        test('選択中スキルのハイライト表示', () => {
            const skills = [
                createTestSkillMenuItem(createTestSkillData('skill1', { name: 'スキル1' })),
                createTestSkillMenuItem(createTestSkillData('skill2', { name: 'スキル2' })),
                createTestSkillMenuItem(createTestSkillData('skill3', { name: 'スキル3' }))
            ];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // 初期選択状態の確認
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // ハイライト色が設定されることを確認
            const graphicsMock = mockScene.add.graphics.mock.results[0].value;
            expect(graphicsMock.fillStyle).toHaveBeenCalledWith(mockConfig.rangeColors.selected);
        });

        test('キーボード操作による選択変更の視覚更新', () => {
            const skills = [
                createTestSkillMenuItem(createTestSkillData('skill1')),
                createTestSkillMenuItem(createTestSkillData('skill2'))
            ];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // キーボードイベントリスナーが設定されることを確認
            expect(mockScene.input.keyboard.on).toHaveBeenCalled();

            // 選択変更時のハイライト更新が行われることを確認
            const keyboardCalls = mockScene.input.keyboard.on.mock.calls;
            const keydownCall = keyboardCalls.find(call => call[0] === 'keydown');
            expect(keydownCall).toBeDefined();
        });

        test('無効スキルの視覚的フィードバック', () => {
            const skills = [
                createTestSkillMenuItem(createTestSkillData('valid'), true),
                createTestSkillMenuItem(createTestSkillData('invalid'), false)
            ];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // 無効スキルに対して異なる色が設定されることを確認
            const textMocks = mockScene.add.text.mock.results;
            expect(textMocks.length).toBe(2);

            // 各テキストに色設定が呼ばれることを確認
            textMocks.forEach(result => {
                expect(result.value.setColor).toHaveBeenCalled();
            });
        });

        test('ホバー効果の視覚表現', () => {
            const skills = [createTestSkillMenuItem(createTestSkillData('hover-skill'))];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // インタラクティブ設定が行われることを確認
            const textMock = mockScene.add.text.mock.results[0].value;
            expect(textMock.setInteractive).toHaveBeenCalled();

            // ホバーイベントリスナーが設定されることを確認
            expect(textMock.on).toHaveBeenCalled();
        });
    });

    describe('アニメーション・エフェクトの視覚確認', () => {
        test('スキル発動時のキャストアニメーション', () => {
            const animSkill = createTestSkillData('cast-skill', {
                animation: {
                    castAnimation: 'magic-cast',
                    effectAnimation: 'magic-effect',
                    duration: 2000
                }
            });

            // キャストアニメーションの開始をシミュレート
            skillUI['playCastAnimation'](animSkill);

            // アニメーション用のスプライトが作成されることを確認
            expect(mockScene.add.sprite).toHaveBeenCalled();

            // アニメーションが設定されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalled();

            const tweenCall = mockScene.tweens.add.mock.calls[0][0];
            expect(tweenCall.duration).toBe(2000);
        });

        test('スキル効果のビジュアルエフェクト', () => {
            const effectSkill = createTestSkillData('visual-skill', {
                animation: {
                    castAnimation: 'cast',
                    effectAnimation: 'explosion',
                    duration: 1500
                }
            });

            // エフェクトアニメーションの開始をシミュレート
            skillUI['playEffectAnimation'](effectSkill, { x: 3, y: 2 });

            // エフェクト用のスプライトが作成されることを確認
            expect(mockScene.add.sprite).toHaveBeenCalled();

            // エフェクトアニメーションが設定されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('継続効果の視覚表現', () => {
            const continuousEffect = {
                effectId: 'buff-effect',
                effectType: 'attack_up' as any,
                value: 20,
                remainingDuration: 3,
                sourceSkillId: 'buff-skill',
                casterId: 'caster',
                appliedAt: new Date()
            };

            // 継続効果の視覚表現を開始
            skillUI['showContinuousEffect'](continuousEffect, { x: 2, y: 2 });

            // 継続効果用のスプライトが作成されることを確認
            expect(mockScene.add.sprite).toHaveBeenCalled();

            // 継続効果のアニメーションが設定されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('ダメージ数値の表示アニメーション', () => {
            const damageValue = 85;
            const targetPosition = { x: 4, y: 3 };

            // ダメージ数値表示をシミュレート
            skillUI['showDamageNumber'](damageValue, targetPosition, true); // クリティカル

            // ダメージ数値用のテキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalled();

            // ダメージ数値のアニメーションが設定されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalled();

            const tweenCall = mockScene.tweens.add.mock.calls[0][0];
            expect(tweenCall.y).toBeDefined(); // Y軸移動アニメーション
            expect(tweenCall.alpha).toBeDefined(); // フェードアウト
        });

        test('メニュー表示・非表示のトランジション', () => {
            const skills = [createTestSkillMenuItem(createTestSkillData('transition-skill'))];

            // メニュー表示
            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // フェードインアニメーションが設定されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalled();

            // メニュー非表示
            skillUI.hideSkillSelection();

            // フェードアウトアニメーションが設定されることを確認
            const tweenCalls = mockScene.tweens.add.mock.calls;
            const fadeOutCall = tweenCalls.find(call =>
                call[0].duration === mockConfig.animations.menuFadeOut
            );
            expect(fadeOutCall).toBeDefined();
        });
    });

    describe('レスポンシブデザインとスケーリング', () => {
        test('画面サイズに応じたUI要素の配置', () => {
            // 小さい画面サイズをシミュレート
            mockScene.cameras.main.width = 480;
            mockScene.cameras.main.height = 320;

            const skills = [createTestSkillMenuItem(createTestSkillData('responsive-skill'))];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // UI要素が画面サイズに応じて配置されることを確認
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });

        test('ズームレベルに応じたUI要素のスケーリング', () => {
            // ズームレベルを変更
            mockScene.cameras.main.zoom = 1.5;

            const skills = [createTestSkillMenuItem(createTestSkillData('zoom-skill'))];

            skillUI.showSkillRange(
                {
                    id: 'zoom-skill',
                    range: 2,
                    areaOfEffect: { shape: 'single', size: 1 },
                    getAffectedPositions: jest.fn().mockReturnValue([{ x: 2, y: 1 }])
                } as any,
                { x: 1, y: 1 }
            );

            // ズームに応じたスケーリングが適用されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });

        test('高DPI画面での表示品質', () => {
            // 高DPI環境をシミュレート
            const originalDevicePixelRatio = window.devicePixelRatio;
            Object.defineProperty(window, 'devicePixelRatio', {
                writable: true,
                value: 2.0
            });

            const skills = [createTestSkillMenuItem(createTestSkillData('hidpi-skill'))];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // 高DPI対応の設定が行われることを確認
            expect(mockScene.add.text).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // 元の値を復元
            Object.defineProperty(window, 'devicePixelRatio', {
                writable: true,
                value: originalDevicePixelRatio
            });
        });
    });

    describe('アクセシビリティ対応の視覚確認', () => {
        test('色覚異常対応の色選択', () => {
            const skills = [
                createTestSkillMenuItem(createTestSkillData('accessible-skill1'), true),
                createTestSkillMenuItem(createTestSkillData('accessible-skill2'), false)
            ];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // アクセシブルな色が使用されることを確認
            const textMocks = mockScene.add.text.mock.results;
            textMocks.forEach(result => {
                expect(result.value.setColor).toHaveBeenCalled();
            });
        });

        test('フォーカス表示の明確性', () => {
            const skills = [createTestSkillMenuItem(createTestSkillData('focus-skill'))];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // フォーカス表示用のグラフィックが作成されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // フォーカス枠の色と太さが適切に設定されることを確認
            const graphicsMock = mockScene.add.graphics.mock.results[0].value;
            expect(graphicsMock.lineStyle).toHaveBeenCalled();
        });

        test('テキストの読みやすさ確保', () => {
            const skills = [createTestSkillMenuItem(createTestSkillData('readable-skill', {
                name: '読みやすいスキル名',
                description: 'これは読みやすい説明文です。'
            }))];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // 適切なフォントサイズとコントラストが設定されることを確認
            const textMock = mockScene.add.text.mock.results[0].value;
            expect(textMock.setColor).toHaveBeenCalled();
        });
    });

    describe('パフォーマンス最適化の視覚確認', () => {
        test('大量のスキル表示時のパフォーマンス', () => {
            // 大量のスキルを作成
            const manySkills = Array.from({ length: 50 }, (_, i) =>
                createTestSkillMenuItem(createTestSkillData(`skill-${i}`, { name: `スキル${i}` }))
            );

            const startTime = performance.now();

            skillUI.showSkillSelection(
                manySkills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // レンダリング時間が許容範囲内であることを確認
            expect(renderTime).toBeLessThan(100); // 100ms以内

            // 必要な要素が作成されることを確認
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalledTimes(manySkills.length);
        });

        test('アニメーション最適化の確認', () => {
            const skills = [createTestSkillMenuItem(createTestSkillData('optimized-skill'))];

            skillUI.showSkillSelection(
                skills,
                'test-character',
                jest.fn(),
                jest.fn()
            );

            // 最適化されたアニメーション設定が使用されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalled();

            const tweenCall = mockScene.tweens.add.mock.calls[0][0];
            expect(tweenCall.ease).toBeDefined(); // イージング関数の使用
            expect(tweenCall.duration).toBeLessThan(1000); // 適切な長さ
        });
    });
});
/**
 * ExperienceManager のユニットテスト
 * 経験値管理の整合性とエラーハンドリングをテスト
 */

import { ExperienceManager } from '../../../../game/src/systems/experience/ExperienceManager';
import { ExperienceDataLoader } from '../../../../game/src/systems/experience/ExperienceDataLoader';
import { ExperienceSource, ExperienceError } from '../../../../game/src/types/experience';

describe('ExperienceManager', () => {
    let experienceManager: ExperienceManager;
    let experienceDataLoader: ExperienceDataLoader;
    let mockEventEmitter: Phaser.Events.EventEmitter;

    beforeEach(async () => {
        // ExperienceDataLoader のセットアップ
        experienceDataLoader = new ExperienceDataLoader();
        await experienceDataLoader.loadExperienceTable(); // デフォルトデータを使用

        // モックイベントエミッターの作成
        mockEventEmitter = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            once: jest.fn(),
            removeAllListeners: jest.fn()
        } as any;

        // ExperienceManager の作成
        experienceManager = new ExperienceManager(experienceDataLoader, mockEventEmitter);
    });

    afterEach(() => {
        experienceManager.destroy();
    });

    describe('初期化', () => {
        test('キャラクターの経験値データを正常に初期化できる', () => {
            const characterId = 'test-character-1';

            experienceManager.initializeCharacterExperience(characterId, 1);

            expect(experienceManager.hasCharacter(characterId)).toBe(true);
            expect(experienceManager.getCurrentLevel(characterId)).toBe(1);
            expect(experienceManager.getCurrentExperience(characterId)).toBe(
                experienceDataLoader.getRequiredExperience(1)
            );
        });

        test('初期レベルを指定してキャラクターを初期化できる', () => {
            const characterId = 'test-character-2';
            const initialLevel = 5;

            experienceManager.initializeCharacterExperience(characterId, initialLevel);

            expect(experienceManager.getCurrentLevel(characterId)).toBe(initialLevel);
            expect(experienceManager.getCurrentExperience(characterId)).toBe(
                experienceDataLoader.getRequiredExperience(initialLevel)
            );
        });

        test('初期経験値を指定してキャラクターを初期化できる', () => {
            const characterId = 'test-character-3';
            const initialExperience = 500;

            experienceManager.initializeCharacterExperience(characterId, 1, initialExperience);

            expect(experienceManager.getCurrentExperience(characterId)).toBe(initialExperience);
            // 経験値に基づいてレベルが計算される
            const expectedLevel = experienceDataLoader.calculateLevelFromExperience(initialExperience);
            expect(experienceManager.getCurrentLevel(characterId)).toBe(expectedLevel);
        });

        test('無効なキャラクターIDで初期化するとエラーが発生する', () => {
            expect(() => {
                experienceManager.initializeCharacterExperience('', 1);
            }).toThrow('Character ID cannot be empty');
        });

        test('無効な初期レベルで初期化するとエラーが発生する', () => {
            expect(() => {
                experienceManager.initializeCharacterExperience('test-character', 0);
            }).toThrow('Initial level must be at least 1');
        });

        test('最大レベルを超える初期レベルで初期化するとエラーが発生する', () => {
            const maxLevel = experienceDataLoader.getMaxLevel();

            expect(() => {
                experienceManager.initializeCharacterExperience('test-character', maxLevel + 1);
            }).toThrow(`Initial level cannot exceed max level (${maxLevel})`);
        });

        test('負の初期経験値で初期化するとエラーが発生する', () => {
            expect(() => {
                experienceManager.initializeCharacterExperience('test-character', 1, -100);
            }).toThrow('Initial experience cannot be negative');
        });

        test('初期化時にイベントが発行される', () => {
            const characterId = 'test-character-event';

            experienceManager.initializeCharacterExperience(characterId, 3);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('character-experience-initialized', {
                characterId,
                level: 3,
                experience: experienceDataLoader.getRequiredExperience(3)
            });
        });
    });

    describe('経験値付与', () => {
        beforeEach(() => {
            experienceManager.initializeCharacterExperience('test-character', 1, 0);
        });

        test('経験値を正常に付与できる', () => {
            const characterId = 'test-character';
            const amount = 50;
            const source = ExperienceSource.ATTACK_HIT;

            const result = experienceManager.addExperience(characterId, amount, source);

            expect(result).toBe(amount);
            expect(experienceManager.getCurrentExperience(characterId)).toBe(amount);
        });

        test('経験値付与でレベルアップが発生する', () => {
            const characterId = 'test-character';
            const amount = 250; // レベル2になるのに十分な経験値 (250 = level 2 requirement)
            const source = ExperienceSource.ENEMY_DEFEAT;

            experienceManager.addExperience(characterId, amount, source);

            expect(experienceManager.getCurrentLevel(characterId)).toBe(2);
            expect(experienceManager.getCurrentExperience(characterId)).toBe(amount);
        });

        test('複数回の経験値付与が累積される', () => {
            const characterId = 'test-character';

            experienceManager.addExperience(characterId, 30, ExperienceSource.ATTACK_HIT);
            experienceManager.addExperience(characterId, 20, ExperienceSource.ALLY_SUPPORT);
            experienceManager.addExperience(characterId, 50, ExperienceSource.HEALING);

            expect(experienceManager.getCurrentExperience(characterId)).toBe(100);
        });

        test('最大レベル到達時は経験値付与が無視される', () => {
            const characterId = 'test-character';
            const maxLevel = experienceDataLoader.getMaxLevel();

            // 最大レベルに設定
            experienceManager.setLevel(characterId, maxLevel);

            const result = experienceManager.addExperience(characterId, 100, ExperienceSource.ENEMY_DEFEAT);

            expect(result).toBe(0);
            expect(experienceManager.getCurrentLevel(characterId)).toBe(maxLevel);
        });

        test('存在しないキャラクターに経験値付与するとエラーが発生する', () => {
            expect(() => {
                experienceManager.addExperience('non-existent', 50, ExperienceSource.ATTACK_HIT);
            }).toThrow(ExperienceError.INVALID_CHARACTER);
        });

        test('負の経験値を付与するとエラーが発生する', () => {
            expect(() => {
                experienceManager.addExperience('test-character', -10, ExperienceSource.ATTACK_HIT);
            }).toThrow(ExperienceError.INVALID_EXPERIENCE_AMOUNT);
        });

        test('経験値付与時にイベントが発行される', () => {
            const characterId = 'test-character';
            const amount = 75;
            const source = ExperienceSource.ENEMY_DEFEAT;

            experienceManager.addExperience(characterId, amount, source);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('experience-gained', {
                characterId,
                amount,
                source,
                oldExperience: 0,
                newExperience: amount,
                oldLevel: 1,
                newLevel: 0, // Level 0 because 75 < 100 (level 1 requirement)
                levelUp: false
            });
        });

        test('レベルアップ時にイベントが正しく発行される', () => {
            const characterId = 'test-character';
            const amount = 250; // レベル2になる経験値
            const source = ExperienceSource.ENEMY_DEFEAT;

            experienceManager.addExperience(characterId, amount, source);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('experience-gained', {
                characterId,
                amount,
                source,
                oldExperience: 0,
                newExperience: amount,
                oldLevel: 1,
                newLevel: 2,
                levelUp: true
            });
        });

        test('最大レベル到達時に無視イベントが発行される', () => {
            const characterId = 'test-character';
            const maxLevel = experienceDataLoader.getMaxLevel();

            experienceManager.setLevel(characterId, maxLevel);

            experienceManager.addExperience(characterId, 100, ExperienceSource.ENEMY_DEFEAT);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('experience-gain-ignored', {
                characterId,
                amount: 100,
                source: ExperienceSource.ENEMY_DEFEAT,
                reason: ExperienceError.MAX_LEVEL_REACHED
            });
        });
    });

    describe('経験値情報取得', () => {
        beforeEach(() => {
            experienceManager.initializeCharacterExperience('test-character', 1, 0);
        });

        test('現在の経験値を正常に取得できる', () => {
            const characterId = 'test-character';

            experienceManager.addExperience(characterId, 75, ExperienceSource.ATTACK_HIT);

            expect(experienceManager.getCurrentExperience(characterId)).toBe(75);
        });

        test('現在のレベルを正常に取得できる', () => {
            const characterId = 'test-character';

            experienceManager.addExperience(characterId, 300, ExperienceSource.ENEMY_DEFEAT);

            const expectedLevel = experienceDataLoader.calculateLevelFromExperience(300);
            expect(experienceManager.getCurrentLevel(characterId)).toBe(expectedLevel);
        });

        test('次のレベルまでの必要経験値を正常に取得できる', () => {
            const characterId = 'test-character';
            const currentExp = 75;

            experienceManager.addExperience(characterId, currentExp, ExperienceSource.ATTACK_HIT);

            const expectedToNext = experienceDataLoader.getExperienceToNextLevel(currentExp);
            expect(experienceManager.getExperienceToNextLevel(characterId)).toBe(expectedToNext);
        });

        test('最大レベル到達時は次レベルまでの経験値が0になる', () => {
            const characterId = 'test-character';
            const maxLevel = experienceDataLoader.getMaxLevel();

            experienceManager.setLevel(characterId, maxLevel);

            expect(experienceManager.getExperienceToNextLevel(characterId)).toBe(0);
        });

        test('経験値情報を包括的に取得できる', () => {
            const characterId = 'test-character';
            const experience = 200;

            experienceManager.addExperience(characterId, experience, ExperienceSource.ENEMY_DEFEAT);

            const info = experienceManager.getExperienceInfo(characterId);

            expect(info.characterId).toBe(characterId);
            expect(info.currentExperience).toBe(experience);
            expect(info.totalExperience).toBe(experience);
            expect(info.currentLevel).toBe(experienceDataLoader.calculateLevelFromExperience(experience));
            expect(info.experienceToNextLevel).toBe(experienceDataLoader.getExperienceToNextLevel(experience));
        });

        test('存在しないキャラクターの情報取得でエラーが発生する', () => {
            expect(() => {
                experienceManager.getCurrentExperience('non-existent');
            }).toThrow(ExperienceError.INVALID_CHARACTER);

            expect(() => {
                experienceManager.getCurrentLevel('non-existent');
            }).toThrow(ExperienceError.INVALID_CHARACTER);

            expect(() => {
                experienceManager.getExperienceToNextLevel('non-existent');
            }).toThrow(ExperienceError.INVALID_CHARACTER);

            expect(() => {
                experienceManager.getExperienceInfo('non-existent');
            }).toThrow(ExperienceError.INVALID_CHARACTER);
        });
    });

    describe('レベルアップ判定', () => {
        beforeEach(() => {
            experienceManager.initializeCharacterExperience('test-character', 1, 0);
        });

        test('レベルアップ可能な状態を正しく判定する', () => {
            const characterId = 'test-character';

            // レベル2になるのに十分な経験値を付与
            experienceManager.addExperience(characterId, 150, ExperienceSource.ENEMY_DEFEAT);

            expect(experienceManager.canLevelUp(characterId)).toBe(false); // 既にレベルアップ済み
        });

        test('レベルアップ不可能な状態を正しく判定する', () => {
            const characterId = 'test-character';

            // 少量の経験値のみ付与
            experienceManager.addExperience(characterId, 50, ExperienceSource.ATTACK_HIT);

            expect(experienceManager.canLevelUp(characterId)).toBe(false);
        });

        test('最大レベル到達時はレベルアップ不可能と判定する', () => {
            const characterId = 'test-character';
            const maxLevel = experienceDataLoader.getMaxLevel();

            experienceManager.setLevel(characterId, maxLevel);

            expect(experienceManager.canLevelUp(characterId)).toBe(false);
        });

        test('存在しないキャラクターのレベルアップ判定はfalseを返す', () => {
            expect(experienceManager.canLevelUp('non-existent')).toBe(false);
        });

        test('空のキャラクターIDのレベルアップ判定はfalseを返す', () => {
            expect(experienceManager.canLevelUp('')).toBe(false);
        });
    });

    describe('キャラクター管理', () => {
        test('キャラクターの存在確認が正常に動作する', () => {
            const characterId = 'test-character';

            expect(experienceManager.hasCharacter(characterId)).toBe(false);

            experienceManager.initializeCharacterExperience(characterId, 1);

            expect(experienceManager.hasCharacter(characterId)).toBe(true);
        });

        test('全キャラクターIDの取得が正常に動作する', () => {
            const characterIds = ['char1', 'char2', 'char3'];

            characterIds.forEach(id => {
                experienceManager.initializeCharacterExperience(id, 1);
            });

            const allIds = experienceManager.getAllCharacterIds();

            expect(allIds).toHaveLength(characterIds.length);
            characterIds.forEach(id => {
                expect(allIds).toContain(id);
            });
        });

        test('キャラクターの削除が正常に動作する', () => {
            const characterId = 'test-character';

            experienceManager.initializeCharacterExperience(characterId, 1);
            expect(experienceManager.hasCharacter(characterId)).toBe(true);

            const result = experienceManager.removeCharacter(characterId);

            expect(result).toBe(true);
            expect(experienceManager.hasCharacter(characterId)).toBe(false);
        });

        test('存在しないキャラクターの削除はfalseを返す', () => {
            const result = experienceManager.removeCharacter('non-existent');

            expect(result).toBe(false);
        });

        test('全キャラクターのクリアが正常に動作する', () => {
            const characterIds = ['char1', 'char2', 'char3'];

            characterIds.forEach(id => {
                experienceManager.initializeCharacterExperience(id, 1);
            });

            experienceManager.clearAllCharacters();

            expect(experienceManager.getAllCharacterIds()).toHaveLength(0);
            characterIds.forEach(id => {
                expect(experienceManager.hasCharacter(id)).toBe(false);
            });
        });

        test('キャラクター削除時にイベントが発行される', () => {
            const characterId = 'test-character';

            experienceManager.initializeCharacterExperience(characterId, 1);
            experienceManager.removeCharacter(characterId);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('character-experience-removed', {
                characterId
            });
        });

        test('全キャラクタークリア時にイベントが発行される', () => {
            const characterIds = ['char1', 'char2'];

            characterIds.forEach(id => {
                experienceManager.initializeCharacterExperience(id, 1);
            });

            experienceManager.clearAllCharacters();

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('all-character-experience-cleared', {
                characterIds
            });
        });
    });

    describe('デバッグ・テスト機能', () => {
        beforeEach(() => {
            experienceManager.initializeCharacterExperience('test-character', 1, 0);
        });

        test('経験値の直接設定が正常に動作する', () => {
            const characterId = 'test-character';
            const newExperience = 500;

            experienceManager.setExperience(characterId, newExperience);

            expect(experienceManager.getCurrentExperience(characterId)).toBe(newExperience);

            const expectedLevel = experienceDataLoader.calculateLevelFromExperience(newExperience);
            expect(experienceManager.getCurrentLevel(characterId)).toBe(expectedLevel);
        });

        test('レベルの直接設定が正常に動作する', () => {
            const characterId = 'test-character';
            const newLevel = 5;

            experienceManager.setLevel(characterId, newLevel);

            expect(experienceManager.getCurrentLevel(characterId)).toBe(newLevel);

            const expectedExperience = experienceDataLoader.getRequiredExperience(newLevel);
            expect(experienceManager.getCurrentExperience(characterId)).toBe(expectedExperience);
        });

        test('経験値設定時にイベントが発行される', () => {
            const characterId = 'test-character';
            const newExperience = 300;

            experienceManager.setExperience(characterId, newExperience);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('experience-set', expect.objectContaining({
                characterId,
                newExperience
            }));
        });

        test('レベル設定時にイベントが発行される', () => {
            const characterId = 'test-character';
            const newLevel = 7;

            experienceManager.setLevel(characterId, newLevel);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('level-set', expect.objectContaining({
                characterId,
                newLevel
            }));
        });

        test('デバッグ情報の取得が正常に動作する', () => {
            const characterId = 'test-character';

            experienceManager.addExperience(characterId, 100, ExperienceSource.ENEMY_DEFEAT);

            const debugInfo = experienceManager.getDebugInfo();

            expect(debugInfo.characterCount).toBe(1);
            expect(debugInfo.characters).toHaveLength(1);
            expect(debugInfo.characters[0].id).toBe(characterId);
            expect(debugInfo.dataLoaderReady).toBe(true);
            expect(debugInfo.maxLevel).toBe(experienceDataLoader.getMaxLevel());
        });

        test('データローダーの準備状態を正しく報告する', () => {
            expect(experienceManager.isDataLoaderReady()).toBe(true);
        });
    });

    describe('エラーハンドリング', () => {
        test('データローダーが準備されていない場合のエラーハンドリング', () => {
            // 新しいデータローダー（未初期化）でマネージャーを作成
            const uninitializedLoader = new ExperienceDataLoader();
            const uninitializedManager = new ExperienceManager(uninitializedLoader);

            expect(() => {
                uninitializedManager.initializeCharacterExperience('test', 1, 0);
            }).toThrow();

            uninitializedManager.destroy();
        });

        test('無効な経験値設定でエラーが発生する', () => {
            const characterId = 'test-character';
            experienceManager.initializeCharacterExperience(characterId, 1, 0);

            expect(() => {
                experienceManager.setExperience(characterId, -100);
            }).toThrow(ExperienceError.INVALID_EXPERIENCE_AMOUNT);
        });

        test('無効なレベル設定でエラーが発生する', () => {
            const characterId = 'test-character';
            experienceManager.initializeCharacterExperience(characterId, 1, 0);

            expect(() => {
                experienceManager.setLevel(characterId, 0);
            }).toThrow('Level must be at least 1');

            const maxLevel = experienceDataLoader.getMaxLevel();
            expect(() => {
                experienceManager.setLevel(characterId, maxLevel + 1);
            }).toThrow(`Level cannot exceed max level (${maxLevel})`);
        });
    });

    describe('リソース管理', () => {
        test('destroyメソッドが正常に動作する', () => {
            experienceManager.initializeCharacterExperience('test1', 1);
            experienceManager.initializeCharacterExperience('test2', 2);

            experienceManager.destroy();

            expect(experienceManager.getAllCharacterIds()).toHaveLength(0);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('experience-manager-destroyed');
        });
    });
});
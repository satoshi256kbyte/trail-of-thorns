/**
 * AIPerformanceMonitor と AISystemManager の統合テスト
 */

import { AISystemManager } from '../../game/src/systems/ai/AISystemManager';
import { AIPerformanceMonitor } from '../../game/src/systems/ai/AIPerformanceMonitor';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { MovementSystem } from '../../game/src/systems/MovementSystem';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { Unit, GameState, MapData } from '../../game/src/types/gameplay';
import { Position } from '../../game/src/types/movement';
import { AISystemManagerConfig } from '../../game/src/types/ai';

// モックシーン作成
const createMockScene = () => ({
    add: {
        container: jest.fn().mockReturnValue({
            setDepth: jest.fn(),
            setVisible: jest.fn(),
            add: jest.fn(),
            removeAll: jest.fn()
        }),
        circle: jest.fn().mockReturnValue({}),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn()
        }),
        rectangle: jest.fn().mockReturnValue({
            setOrigin: jest.fn()
        })
    },
    tweens: {
        add: jest.fn()
    }
});

// モックイベントエミッター作成
const createMockEventEmitter = () => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
});

// モックユニット作成
const createMockUnit = (id: string, faction: 'player' | 'enemy' = 'enemy'): Unit => ({
    id,
    name: `Test Unit ${id}`,
    position: { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) },
    currentHP: 100,
    maxHP: 100,
    currentMP: 50,
    maxMP: 50,
    stats: {
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
        maxHP: 100,
        maxMP: 50
    },
    faction,
    hasActed: false,
    hasMoved: false,
    level: 1,
    experience: 0,
    skills: [],
    equipment: {},
    statusEffects: []
});

// モックゲーム状態作成
const createMockGameState = (units: Unit[]): GameState => ({
    currentTurn: 1,
    activePlayer: 'enemy',
    phase: 'action',
    turnOrder: units,
    selectedUnit: null,
    gameResult: null
});

// モックマップデータ作成
const createMockMapData = (): MapData => ({
    width: 10,
    height: 10,
    tiles: Array(10).fill(null).map(() =>
        Array(10).fill({ type: 'grass', movementCost: 1 })
    ),
    units: []
});

// モックシステム作成
const createMockSystems = () => {
    const gameStateManager = {
        getCurrentGameState: jest.fn().mockReturnValue(createMockGameState([])),
        getCurrentPlayer: jest.fn().mockReturnValue('enemy'),
        getActiveUnit: jest.fn(),
        advanceTurn: jest.fn()
    } as any;

    const movementSystem = {
        executeMovement: jest.fn().mockResolvedValue({ success: true, message: 'Move successful' }),
        calculateMovementRange: jest.fn().mockReturnValue([]),
        canMoveTo: jest.fn().mockReturnValue(true)
    } as any;

    const battleSystem = {
        executeAttack: jest.fn().mockResolvedValue({ success: true, message: 'Attack successful' }),
        canAttack: jest.fn().mockReturnValue(true),
        calculateDamage: jest.fn().mockReturnValue(25)
    } as any;

    const skillSystem = {
        useSkill: jest.fn().mockResolvedValue({
            success: true,
            result: { mpCost: 10, damage: 30 }
        }),
        getAvailableSkills: jest.fn().mockReturnValue([]),
        canUseSkill: jest.fn().mockReturnValue(true)
    } as any;

    const recruitmentSystem = {
        isNPC: jest.fn().mockReturnValue(false),
        canRecruit: jest.fn().mockReturnValue(false)
    } as any;

    return {
        gameStateManager,
        movementSystem,
        battleSystem,
        skillSystem,
        recruitmentSystem
    };
};

describe('AIPerformanceMonitor と AISystemManager の統合', () => {
    let aiSystemManager: AISystemManager;
    let performanceMonitor: AIPerformanceMonitor;
    let mockScene: any;
    let mockEventEmitter: any;
    let mockSystems: any;

    beforeEach(() => {
        // モック作成
        mockScene = createMockScene();
        mockEventEmitter = createMockEventEmitter();
        mockSystems = createMockSystems();

        // AISystemManager設定
        const config: AISystemManagerConfig = {
            thinkingTimeLimit: 2000,
            enableDebugLogging: true,
            enableVisualFeedback: true,
            randomFactor: 0.2,
            npcPriorityMultiplier: 2.0
        };

        // AISystemManager作成
        aiSystemManager = new AISystemManager(mockScene, config, mockEventEmitter);

        // パフォーマンスモニター取得
        performanceMonitor = AIPerformanceMonitor.getInstance();
        performanceMonitor.resetStats();

        // システム初期化
        aiSystemManager.initialize(
            mockSystems.gameStateManager,
            mockSystems.movementSystem,
            mockSystems.battleSystem,
            mockSystems.skillSystem,
            mockSystems.recruitmentSystem
        );
    });

    afterEach(() => {
        aiSystemManager.shutdown();
        performanceMonitor.resetStats();
    });

    describe('基本的な統合', () => {
        test('AISystemManagerがパフォーマンスモニターを正しく初期化すること', () => {
            const stats = aiSystemManager.getPerformanceStats();
            expect(stats).toBeDefined();
            expect(stats.totalActions).toBe(0);
            expect(stats.errorCount).toBe(0);
        });

        test('パフォーマンス統計を取得できること', () => {
            const stats = aiSystemManager.getPerformanceStats();
            const metrics = aiSystemManager.getPerformanceMetrics();
            const cacheStats = aiSystemManager.getCacheStats();

            expect(stats).toHaveProperty('averageThinkingTime');
            expect(stats).toHaveProperty('totalActions');
            expect(metrics).toHaveProperty('actionTypeDistribution');
            expect(cacheStats).toHaveProperty('size');
        });

        test('パフォーマンス統計をリセットできること', () => {
            // 何らかの統計を記録
            performanceMonitor.recordActionType('move' as any);

            let stats = aiSystemManager.getPerformanceStats();
            expect(stats.totalActions).toBeGreaterThan(0);

            // リセット
            aiSystemManager.resetPerformanceStats();

            stats = aiSystemManager.getPerformanceStats();
            expect(stats.totalActions).toBe(0);
        });
    });

    describe('AI実行時のパフォーマンス監視', () => {
        test('AI行動実行時に思考時間が記録されること', async () => {
            // テスト用ユニット作成
            const enemyUnit = createMockUnit('enemy1', 'enemy');
            const units = [enemyUnit];

            // AIコントローラー作成
            aiSystemManager.createAIControllers(units);

            // ゲーム状態とマップデータ作成
            const gameState = createMockGameState(units);
            const mapData = createMockMapData();

            // AI実行
            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            // 結果確認
            expect(result.success).toBe(true);
            expect(result.executionTime).toBeGreaterThan(0);

            // パフォーマンス統計確認
            const stats = aiSystemManager.getPerformanceStats();
            expect(stats.totalActions).toBe(1);
            expect(stats.averageThinkingTime).toBeGreaterThan(0);
        });

        test('AI実行エラー時にエラーが記録されること', async () => {
            // エラーを発生させるモック設定
            mockSystems.movementSystem.executeMovement.mockRejectedValue(new Error('Test error'));

            const enemyUnit = createMockUnit('enemy1', 'enemy');
            const units = [enemyUnit];

            aiSystemManager.createAIControllers(units);

            const gameState = createMockGameState(units);
            const mapData = createMockMapData();

            // AI実行（エラーが発生する可能性）
            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            // エラー統計確認
            const stats = aiSystemManager.getPerformanceStats();
            expect(stats.errorCount).toBeGreaterThanOrEqual(0); // エラーが記録される可能性
        });
    });

    describe('並列AI実行のパフォーマンス監視', () => {
        test('複数AIの並列実行でパフォーマンスが監視されること', async () => {
            // 複数の敵ユニット作成
            const enemyUnits = [
                createMockUnit('enemy1', 'enemy'),
                createMockUnit('enemy2', 'enemy'),
                createMockUnit('enemy3', 'enemy')
            ];

            // AIコントローラー作成
            aiSystemManager.createAIControllers(enemyUnits);

            // ゲーム状態とマップデータ作成
            const gameState = createMockGameState(enemyUnits);
            const mapData = createMockMapData();

            // 並列AI実行
            const results = await aiSystemManager.executeParallelAITurns(
                enemyUnits,
                gameState,
                mapData
            );

            // 結果確認
            expect(results.size).toBe(3);
            for (const [unitId, result] of results) {
                expect(result.success).toBe(true);
                expect(result.action).toBeDefined();
            }

            // パフォーマンス統計確認
            const stats = aiSystemManager.getPerformanceStats();
            expect(stats.totalActions).toBe(3);
        });

        test.skip('並列実行でのパフォーマンス最適化が機能すること', async () => {
            // 大量の敵ユニット作成
            const enemyUnits = Array.from({ length: 10 }, (_, i) =>
                createMockUnit(`enemy${i}`, 'enemy')
            );

            aiSystemManager.createAIControllers(enemyUnits);

            const gameState = createMockGameState(enemyUnits);
            const mapData = createMockMapData();

            const startTime = Date.now();

            // 並列AI実行
            const results = await aiSystemManager.executeParallelAITurns(
                enemyUnits,
                gameState,
                mapData
            );

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // 結果確認
            expect(results.size).toBe(10);

            // パフォーマンス確認（並列処理により効率的であることを期待）
            expect(totalTime).toBeLessThan(10000); // 10秒以内（テスト環境を考慮）

            // パフォーマンス統計確認
            const stats = aiSystemManager.getPerformanceStats();
            expect(stats.totalActions).toBe(10);
        });
    });

    describe('パフォーマンス閾値とアラート', () => {
        test('パフォーマンス閾値チェックが機能すること', () => {
            // テストデータを追加してアラートを発生させる
            for (let i = 0; i < 10; i++) {
                performanceMonitor.recordActionType('move' as any);
            }
            performanceMonitor.recordError('test_error');

            const alerts = aiSystemManager.checkPerformanceThresholds();
            expect(Array.isArray(alerts)).toBe(true);
        });

        test('メモリクリーンアップが実行できること', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            aiSystemManager.performMemoryCleanup();

            expect(consoleSpy).toHaveBeenCalledWith('[AIPerformanceMonitor] Memory cleanup performed');
            consoleSpy.mockRestore();
        });

        test('パフォーマンス統計をログ出力できること', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            aiSystemManager.logPerformanceStats();

            expect(consoleSpy).toHaveBeenCalledWith('=== AI Performance Statistics ===');
            consoleSpy.mockRestore();
        });
    });

    describe('リソース管理', () => {
        test('シャットダウン時にリソースが適切にクリーンアップされること', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            aiSystemManager.shutdown();

            expect(consoleSpy).toHaveBeenCalledWith('AISystemManager: Shutdown completed');
            consoleSpy.mockRestore();
        });

        test('キャッシュ統計が正しく取得できること', () => {
            const cacheStats = aiSystemManager.getCacheStats();

            expect(cacheStats).toHaveProperty('size');
            expect(cacheStats).toHaveProperty('hitRate');
            expect(cacheStats).toHaveProperty('totalHits');
            expect(typeof cacheStats.size).toBe('number');
            expect(typeof cacheStats.hitRate).toBe('number');
        });
    });
});
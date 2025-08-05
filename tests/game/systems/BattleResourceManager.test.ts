/**
 * Tests for BattleResourceManager
 * Verifies resource tracking, cleanup, and memory leak prevention
 */

import { BattleResourceManager, ResourceType } from '../../../game/src/systems/BattleResourceManager';
import { Unit } from '../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
    events: {
        once: jest.fn()
    },
    time: {
        addEvent: jest.fn().mockReturnValue({
            destroy: jest.fn()
        })
    }
} as any;

// Mock graphics object
const createMockGraphics = () => ({
    destroy: jest.fn(),
    id: Math.random().toString()
});

// Mock tween object
const createMockTween = () => ({
    destroy: jest.fn(),
    once: jest.fn(),
    id: Math.random().toString()
});

// Mock timer object
const createMockTimer = () => ({
    destroy: jest.fn(),
    callback: jest.fn(),
    callbackScope: null,
    id: Math.random().toString()
});

// Mock container object
const createMockContainer = () => ({
    destroy: jest.fn(),
    id: Math.random().toString()
});

// Mock event target
const createMockEventTarget = () => ({
    off: jest.fn(),
    removeEventListener: jest.fn(),
    id: Math.random().toString()
});

describe('BattleResourceManager', () => {
    let resourceManager: BattleResourceManager;

    beforeEach(() => {
        jest.clearAllMocks();
        resourceManager = new BattleResourceManager(mockScene, {
            enableAutoCleanup: false, // Disable for controlled testing
            enableDetailedLogging: false,
            maxResourceAge: 1000, // 1 second for testing
            resourceWarningThreshold: 10
        });
    });

    afterEach(() => {
        resourceManager.destroy();
    });

    describe('Resource Registration', () => {
        test('should register graphics resources', () => {
            const graphics = createMockGraphics();
            const id = resourceManager.registerGraphics(graphics as any, { test: true });

            expect(id).toBeDefined();
            expect(id).toMatch(/graphics_\d+_\d+/);

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(1);
            expect(stats.resourcesByType.get(ResourceType.GRAPHICS)).toBe(1);
        });

        test('should register tween resources', () => {
            const tween = createMockTween();
            const id = resourceManager.registerTween(tween as any, { test: true });

            expect(id).toBeDefined();
            expect(tween.once).toHaveBeenCalledWith('complete', expect.any(Function));

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(1);
            expect(stats.resourcesByType.get(ResourceType.TWEENS)).toBe(1);
        });

        test('should register timer resources', () => {
            const timer = createMockTimer();
            const originalCallback = timer.callback;

            const id = resourceManager.registerTimer(timer as any, { test: true });

            expect(id).toBeDefined();
            expect(timer.callback).not.toBe(originalCallback); // Should be wrapped

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(1);
            expect(stats.resourcesByType.get(ResourceType.TIMERS)).toBe(1);
        });

        test('should register event listeners', () => {
            const target = createMockEventTarget();
            const callback = jest.fn();

            const id = resourceManager.registerEventListener(target, 'click', callback, { test: true });

            expect(id).toBeDefined();

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(1);
            expect(stats.resourcesByType.get(ResourceType.EVENT_LISTENERS)).toBe(1);
        });

        test('should register container resources', () => {
            const container = createMockContainer();
            const id = resourceManager.registerContainer(container as any, { test: true });

            expect(id).toBeDefined();

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(1);
            expect(stats.resourcesByType.get(ResourceType.CONTAINERS)).toBe(1);
        });

        test('should register particle emitter resources', () => {
            const emitter = { destroy: jest.fn() };
            const id = resourceManager.registerParticleEmitter(emitter, { test: true });

            expect(id).toBeDefined();

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(1);
            expect(stats.resourcesByType.get(ResourceType.PARTICLES)).toBe(1);
        });
    });

    describe('Resource Access and Tracking', () => {
        test('should track resource access', () => {
            const graphics = createMockGraphics();
            const id = resourceManager.registerGraphics(graphics as any);

            const entry1 = resourceManager.accessResource(id);
            expect(entry1).toBeDefined();
            expect(entry1!.references).toBe(2); // 1 from registration + 1 from access

            const entry2 = resourceManager.accessResource(id);
            expect(entry2!.references).toBe(3); // Previous + 1
            expect(entry2!.lastAccessed).toBeGreaterThan(entry1!.lastAccessed);
        });

        test('should return null for non-existent resources', () => {
            const entry = resourceManager.accessResource('non-existent');
            expect(entry).toBeNull();
        });

        test('should update last accessed time', () => {
            const graphics = createMockGraphics();
            const id = resourceManager.registerGraphics(graphics as any);

            const entry1 = resourceManager.accessResource(id);
            const firstAccessTime = entry1!.lastAccessed;

            // Wait a bit
            setTimeout(() => {
                const entry2 = resourceManager.accessResource(id);
                expect(entry2!.lastAccessed).toBeGreaterThan(firstAccessTime);
            }, 10);
        });
    });

    describe('Resource Cleanup', () => {
        test('should unregister and cleanup graphics resources', () => {
            const graphics = createMockGraphics();
            const id = resourceManager.registerGraphics(graphics as any);

            const success = resourceManager.unregisterResource(id);
            expect(success).toBe(true);
            expect(graphics.destroy).toHaveBeenCalled();

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(0);
        });

        test('should unregister and cleanup tween resources', () => {
            const tween = createMockTween();
            const id = resourceManager.registerTween(tween as any);

            const success = resourceManager.unregisterResource(id);
            expect(success).toBe(true);
            expect(tween.destroy).toHaveBeenCalled();
        });

        test('should unregister and cleanup timer resources', () => {
            const timer = createMockTimer();
            const id = resourceManager.registerTimer(timer as any);

            const success = resourceManager.unregisterResource(id);
            expect(success).toBe(true);
            expect(timer.destroy).toHaveBeenCalled();
        });

        test('should unregister and cleanup event listeners', () => {
            const target = createMockEventTarget();
            const callback = jest.fn();
            const id = resourceManager.registerEventListener(target, 'click', callback);

            const success = resourceManager.unregisterResource(id);
            expect(success).toBe(true);
            expect(target.off).toHaveBeenCalledWith('click', callback);
        });

        test('should handle event listeners with removeEventListener', () => {
            const target = { removeEventListener: jest.fn() }; // No 'off' method
            const callback = jest.fn();
            const id = resourceManager.registerEventListener(target, 'click', callback);

            const success = resourceManager.unregisterResource(id);
            expect(success).toBe(true);
            expect(target.removeEventListener).toHaveBeenCalledWith('click', callback);
        });

        test('should return false for non-existent resource cleanup', () => {
            const success = resourceManager.unregisterResource('non-existent');
            expect(success).toBe(false);
        });

        test('should handle cleanup errors gracefully', () => {
            const graphics = {
                destroy: jest.fn().mockImplementation(() => {
                    throw new Error('Cleanup error');
                })
            };

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const id = resourceManager.registerGraphics(graphics as any);
            const success = resourceManager.unregisterResource(id);

            expect(success).toBe(true); // Should still return true
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('Automatic Cleanup', () => {
        test('should perform automatic cleanup of old resources', async () => {
            const shortAgeManager = new BattleResourceManager(mockScene, {
                enableAutoCleanup: false,
                maxResourceAge: 50 // 50ms
            });

            const graphics1 = createMockGraphics();
            const graphics2 = createMockGraphics();

            const id1 = shortAgeManager.registerGraphics(graphics1 as any);

            // Wait for first resource to age
            await new Promise(resolve => setTimeout(resolve, 60));

            const id2 = shortAgeManager.registerGraphics(graphics2 as any);

            // Perform cleanup
            shortAgeManager.performCleanup();

            // First resource should be cleaned up, second should remain
            expect(graphics1.destroy).toHaveBeenCalled();
            expect(graphics2.destroy).not.toHaveBeenCalled();

            const stats = shortAgeManager.getStatistics();
            expect(stats.totalResources).toBe(1);

            shortAgeManager.destroy();
        });

        test('should not cleanup recently accessed resources', async () => {
            const shortAgeManager = new BattleResourceManager(mockScene, {
                enableAutoCleanup: false,
                maxResourceAge: 50 // 50ms
            });

            const graphics = createMockGraphics();
            const id = shortAgeManager.registerGraphics(graphics as any);

            // Wait for resource to age
            await new Promise(resolve => setTimeout(resolve, 60));

            // Access the resource to update lastAccessed
            shortAgeManager.accessResource(id);

            // Perform cleanup
            shortAgeManager.performCleanup();

            // Resource should not be cleaned up because it was recently accessed
            expect(graphics.destroy).not.toHaveBeenCalled();

            const stats = shortAgeManager.getStatistics();
            expect(stats.totalResources).toBe(1);

            shortAgeManager.destroy();
        });

        test('should not cleanup resources with high reference count', async () => {
            const shortAgeManager = new BattleResourceManager(mockScene, {
                enableAutoCleanup: false,
                maxResourceAge: 50 // 50ms
            });

            const graphics = createMockGraphics();
            const id = shortAgeManager.registerGraphics(graphics as any);

            // Increase reference count
            shortAgeManager.accessResource(id);
            shortAgeManager.accessResource(id);

            // Wait for resource to age
            await new Promise(resolve => setTimeout(resolve, 60));

            // Perform cleanup
            shortAgeManager.performCleanup();

            // Resource should not be cleaned up due to high reference count
            expect(graphics.destroy).not.toHaveBeenCalled();

            shortAgeManager.destroy();
        });
    });

    describe('Battle-Specific Cleanup', () => {
        test('should cleanup resources by battle ID', () => {
            const graphics1 = createMockGraphics();
            const graphics2 = createMockGraphics();
            const graphics3 = createMockGraphics();

            resourceManager.registerGraphics(graphics1 as any, { battleId: 'battle1' });
            resourceManager.registerGraphics(graphics2 as any, { battleId: 'battle1' });
            resourceManager.registerGraphics(graphics3 as any, { battleId: 'battle2' });

            resourceManager.cleanupBattleResources('battle1');

            expect(graphics1.destroy).toHaveBeenCalled();
            expect(graphics2.destroy).toHaveBeenCalled();
            expect(graphics3.destroy).not.toHaveBeenCalled();

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(1);
        });

        test('should cleanup resources by unit ID', () => {
            const mockUnit: Unit = {
                id: 'unit1',
                name: 'Test Unit',
                position: { x: 0, y: 0 },
                stats: { maxHP: 100, maxMP: 50, attack: 10, defense: 10, speed: 10, movement: 3 },
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false,
                sprite: null
            };

            const graphics1 = createMockGraphics();
            const graphics2 = createMockGraphics();
            const graphics3 = createMockGraphics();

            resourceManager.registerGraphics(graphics1 as any, { unitId: 'unit1' });
            resourceManager.registerGraphics(graphics2 as any, { unitId: 'unit1' });
            resourceManager.registerGraphics(graphics3 as any, { unitId: 'unit2' });

            resourceManager.cleanupUnitResources(mockUnit);

            expect(graphics1.destroy).toHaveBeenCalled();
            expect(graphics2.destroy).toHaveBeenCalled();
            expect(graphics3.destroy).not.toHaveBeenCalled();

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(1);
        });
    });

    describe('Memory Leak Detection', () => {
        test('should detect potential memory leaks', () => {
            // Create old resources
            const oldTime = Date.now() - 700000; // 11+ minutes ago

            // Mock Date.now to simulate old resources
            const originalNow = Date.now;
            Date.now = jest.fn().mockReturnValue(oldTime);

            const graphics = createMockGraphics();
            resourceManager.registerGraphics(graphics as any);

            // Restore Date.now
            Date.now = originalNow;

            const leakResult = resourceManager.detectMemoryLeaks();

            expect(leakResult.leaksFound).toBe(true);
            expect(leakResult.suspiciousResources.length).toBeGreaterThan(0);
            expect(leakResult.severity).toMatch(/low|medium|high|critical/);
            expect(leakResult.recommendations.length).toBeGreaterThan(0);
        });

        test('should detect resources with high reference counts', () => {
            const graphics = createMockGraphics();
            const id = resourceManager.registerGraphics(graphics as any);

            // Access resource many times to increase reference count
            for (let i = 0; i < 150; i++) {
                resourceManager.accessResource(id);
            }

            const leakResult = resourceManager.detectMemoryLeaks();

            expect(leakResult.leaksFound).toBe(true);
            expect(leakResult.suspiciousResources.length).toBeGreaterThan(0);
        });

        test('should classify leak severity correctly', () => {
            // Create many old resources for critical severity
            const oldTime = Date.now() - 700000;
            Date.now = jest.fn().mockReturnValue(oldTime);

            for (let i = 0; i < 60; i++) {
                const graphics = createMockGraphics();
                resourceManager.registerGraphics(graphics as any);
            }

            Date.now = Date.now as jest.MockedFunction<typeof Date.now>;
            (Date.now as jest.MockedFunction<typeof Date.now>).mockRestore();

            const leakResult = resourceManager.detectMemoryLeaks();

            expect(leakResult.severity).toBe('critical');
        });
    });

    describe('Statistics and Monitoring', () => {
        test('should provide accurate resource statistics', () => {
            const graphics1 = createMockGraphics();
            const graphics2 = createMockGraphics();
            const tween = createMockTween();
            const timer = createMockTimer();

            resourceManager.registerGraphics(graphics1 as any);
            resourceManager.registerGraphics(graphics2 as any);
            resourceManager.registerTween(tween as any);
            resourceManager.registerTimer(timer as any);

            const stats = resourceManager.getStatistics();

            expect(stats.totalResources).toBe(4);
            expect(stats.resourcesByType.get(ResourceType.GRAPHICS)).toBe(2);
            expect(stats.resourcesByType.get(ResourceType.TWEENS)).toBe(1);
            expect(stats.resourcesByType.get(ResourceType.TIMERS)).toBe(1);
            expect(stats.memoryUsage).toBeGreaterThan(0);
            expect(stats.cleanupOperations).toBe(0); // No cleanup performed yet
        });

        test('should get resources by type', () => {
            const graphics1 = createMockGraphics();
            const graphics2 = createMockGraphics();
            const tween = createMockTween();

            resourceManager.registerGraphics(graphics1 as any);
            resourceManager.registerGraphics(graphics2 as any);
            resourceManager.registerTween(tween as any);

            const graphicsResources = resourceManager.getResourcesByType(ResourceType.GRAPHICS);
            const tweenResources = resourceManager.getResourcesByType(ResourceType.TWEENS);

            expect(graphicsResources.length).toBe(2);
            expect(tweenResources.length).toBe(1);
        });

        test('should provide health report', () => {
            const graphics = createMockGraphics();
            resourceManager.registerGraphics(graphics as any);

            const healthReport = resourceManager.getHealthReport();

            expect(healthReport.status).toMatch(/healthy|warning|critical/);
            expect(healthReport.totalResources).toBe(1);
            expect(healthReport.oldestResourceAge).toBeGreaterThanOrEqual(0);
            expect(healthReport.memoryUsage).toBeGreaterThanOrEqual(0);
            expect(healthReport.leaksDetected).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(healthReport.recommendations)).toBe(true);
        });

        test('should warn about high resource count', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            // Create resources above warning threshold
            for (let i = 0; i < 15; i++) {
                const graphics = createMockGraphics();
                resourceManager.registerGraphics(graphics as any);
            }

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('High resource count')
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Configuration Management', () => {
        test('should update configuration', () => {
            expect(() => {
                resourceManager.updateConfig({
                    enableAutoCleanup: true,
                    maxResourceAge: 5000,
                    resourceWarningThreshold: 50
                });
            }).not.toThrow();
        });

        test('should restart auto cleanup when configuration changes', () => {
            const timerSpy = jest.spyOn(mockScene.time, 'addEvent');

            resourceManager.updateConfig({
                enableAutoCleanup: true,
                cleanupInterval: 2000
            });

            expect(timerSpy).toHaveBeenCalled();
        });

        test('should stop auto cleanup when disabled', () => {
            // First enable auto cleanup
            resourceManager.updateConfig({ enableAutoCleanup: true });

            // Then disable it
            resourceManager.updateConfig({ enableAutoCleanup: false });

            expect(() => resourceManager.stopAutoCleanup()).not.toThrow();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle resources without destroy method', () => {
            const resourceWithoutDestroy = { id: 'test' };

            expect(() => {
                const id = resourceManager.registerResource(
                    resourceWithoutDestroy,
                    ResourceType.GRAPHICS
                );
                resourceManager.unregisterResource(id);
            }).not.toThrow();
        });

        test('should handle event listeners without proper cleanup methods', () => {
            const targetWithoutMethods = { id: 'test' };
            const callback = jest.fn();

            expect(() => {
                const id = resourceManager.registerEventListener(
                    targetWithoutMethods,
                    'click',
                    callback
                );
                resourceManager.unregisterResource(id);
            }).not.toThrow();
        });

        test('should handle force garbage collection when available', () => {
            // Mock global.gc
            (global as any).gc = jest.fn();

            expect(() => {
                resourceManager.forceGarbageCollection();
            }).not.toThrow();

            expect((global as any).gc).toHaveBeenCalled();

            delete (global as any).gc;
        });

        test('should handle force garbage collection when not available', () => {
            expect(() => {
                resourceManager.forceGarbageCollection();
            }).not.toThrow();
        });
    });

    describe('Complete Cleanup', () => {
        test('should cleanup all resources', () => {
            const graphics1 = createMockGraphics();
            const graphics2 = createMockGraphics();
            const tween = createMockTween();
            const timer = createMockTimer();

            resourceManager.registerGraphics(graphics1 as any);
            resourceManager.registerGraphics(graphics2 as any);
            resourceManager.registerTween(tween as any);
            resourceManager.registerTimer(timer as any);

            resourceManager.cleanup();

            expect(graphics1.destroy).toHaveBeenCalled();
            expect(graphics2.destroy).toHaveBeenCalled();
            expect(tween.destroy).toHaveBeenCalled();
            expect(timer.destroy).toHaveBeenCalled();

            const stats = resourceManager.getStatistics();
            expect(stats.totalResources).toBe(0);
        });

        test('should handle destroy method', () => {
            const graphics = createMockGraphics();
            resourceManager.registerGraphics(graphics as any);

            expect(() => resourceManager.destroy()).not.toThrow();
            expect(graphics.destroy).toHaveBeenCalled();
        });

        test('should handle multiple destroy calls', () => {
            expect(() => {
                resourceManager.destroy();
                resourceManager.destroy(); // Should not throw
            }).not.toThrow();
        });
    });
});
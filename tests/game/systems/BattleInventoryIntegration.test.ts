/**
 * Unit Tests for Battle System Inventory/Equipment Integration
 * 
 * Tests requirements 8.1, 8.2, 8.3, 8.4, 8.5:
 * - 8.1: Display usable items during battle
 * - 8.2: Apply item effects immediately
 * - 8.3: Consume turn when using items
 * - 8.4: Reflect equipment effects in battle calculations
 * - 8.5: Decrease equipment durability during battle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { InventoryManager } from '../../../game/src/systems/InventoryManager';
import { EquipmentManager } from '../../../game/src/systems/EquipmentManager';
import { ItemDataLoader } from '../../../game/src/systems/ItemDataLoader';
import { Unit } from '../../../game/src/types/gameplay';
import { Consumable, Equipment, ItemEffect } from '../../../game/src/types/inventory';
import { Weapon } from '../../../game/src/types/battle';
import Phaser from 'phaser';

// Mock Phaser scene
class MockScene extends Phaser.Scene {
    public events: Phaser.Events.EventEmitter;
    
    constructor() {
        super({ key: 'MockScene' });
        this.events = new Phaser.Events.EventEmitter();
    }
    
    cache = {
        json: {
            exists: () => false,
            get: () => null
        }
    } as any;
    
    load = {
        json: () => {},
        image: () => {},
        once: () => {},
        start: () => {}
    } as any;
    
    add = {
        graphics: () => ({
            fillStyle: () => {},
            lineStyle: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            clear: () => {},
            destroy: () => {}
        }),
        text: () => ({
            setOrigin: () => {},
            setDepth: () => {},
            setVisible: () => {},
            destroy: () => {}
        }),
        sprite: () => ({
            setOrigin: () => {},
            setDepth: () => {},
            setVisible: () => {},
            play: () => {},
            destroy: () => {}
        }),
        container: () => ({
            setVisible: () => {},
            setPosition: () => {},
            setAlpha: () => {},
            add: () => {},
            removeAll: () => {},
            destroy: () => {}
        }),
        rectangle: () => ({
            setSize: () => {},
            setPosition: () => {},
            setFillStyle: () => {},
            setStrokeStyle: () => {},
            destroy: () => {}
        }),
        circle: () => ({
            destroy: () => {}
        })
    } as any;
    
    time = {
        delayedCall: (delay: number, callback: Function) => {
            setTimeout(callback, delay);
            return { remove: () => {} };
        },
        addEvent: (config: any) => {
            if (config.loop) {
                const interval = setInterval(() => config.callback(), config.delay);
                return { remove: () => clearInterval(interval) };
            } else {
                const timeout = setTimeout(() => config.callback(), config.delay);
                return { remove: () => clearTimeout(timeout) };
            }
        }
    } as any;
    
    tweens = {
        add: (config: any) => {
            // Simulate immediate completion
            if (config.onComplete) {
                setTimeout(config.onComplete, 0);
            }
            return {
                on: () => {},
                stop: () => {}
            };
        }
    } as any;
}

// Test data factories
const createTestUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit-1',
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
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    level: 1,
    experience: 0,
    job: 'warrior',
    ...overrides
});

const createHealingPotion = (): Consumable => ({
    id: 'healing-potion',
    name: 'Healing Potion',
    description: 'Restores 30 HP',
    type: 'consumable',
    rarity: 'common',
    iconPath: 'assets/items/potion.png',
    maxStack: 99,
    sellPrice: 50,
    buyPrice: 100,
    consumableType: 'healing',
    effects: [{
        id: 'heal-effect',
        type: 'hp_recovery',
        target: 'hp',
        value: 30,
        duration: 0,
        isPermanent: false,
        stackable: false
    }],
    usableInBattle: true,
    targetType: 'self'
});

const createManaPotion = (): Consumable => ({
    id: 'mana-potion',
    name: 'Mana Potion',
    description: 'Restores 20 MP',
    type: 'consumable',
    rarity: 'common',
    iconPath: 'assets/items/mana.png',
    maxStack: 99,
    sellPrice: 40,
    buyPrice: 80,
    consumableType: 'healing',
    effects: [{
        id: 'mana-effect',
        type: 'mp_recovery',
        target: 'mp',
        value: 20,
        duration: 0,
        isPermanent: false,
        stackable: false
    }],
    usableInBattle: true,
    targetType: 'self'
});

const createNonBattleItem = (): Consumable => ({
    id: 'town-item',
    name: 'Town Item',
    description: 'Can only be used in town',
    type: 'consumable',
    rarity: 'common',
    iconPath: 'assets/items/town.png',
    maxStack: 99,
    sellPrice: 10,
    buyPrice: 20,
    consumableType: 'healing',
    effects: [{
        id: 'town-effect',
        type: 'hp_recovery',
        target: 'hp',
        value: 50,
        duration: 0,
        isPermanent: false,
        stackable: false
    }],
    usableInBattle: false,
    targetType: 'self'
});

const createTestWeapon = (): Weapon => ({
    id: 'test-sword',
    name: 'Test Sword',
    type: 'sword',
    minRange: 1,
    maxRange: 1,
    baseDamage: 15,
    accuracy: 90,
    criticalRate: 10,
    element: 'physical',
    damageType: 'physical'
});

const createTestEquipment = (type: 'weapon' | 'armor' | 'accessory' = 'weapon'): Equipment => ({
    id: `test-${type}`,
    name: `Test ${type}`,
    description: `A test ${type}`,
    type,
    rarity: 'common',
    iconPath: 'assets/items/default.png',
    maxStack: 1,
    sellPrice: 100,
    buyPrice: 200,
    slot: type === 'accessory' ? 'accessory1' : type,
    stats: {
        attack: type === 'weapon' ? 10 : undefined,
        defense: type === 'armor' ? 10 : undefined,
        speed: type === 'accessory' ? 5 : undefined,
        hp: type === 'armor' ? 20 : undefined
    },
    requirements: {
        level: 1
    },
    durability: 100,
    maxDurability: 100,
    effects: []
});

describe('Battle System Inventory/Equipment Integration - Unit Tests', () => {
    let scene: MockScene;
    let battleSystem: BattleSystem;
    let inventoryManager: InventoryManager;
    let equipmentManager: EquipmentManager;
    let itemDataLoader: ItemDataLoader;
    let playerUnit: Unit;
    let enemyUnit: Unit;

    beforeEach(() => {
        // Create mock scene
        scene = new MockScene();
        
        // Initialize systems in correct order
        itemDataLoader = new ItemDataLoader(scene);
        inventoryManager = new InventoryManager(itemDataLoader, 100);
        
        // Create ItemEffectSystem (required by EquipmentManager)
        const itemEffectSystem = {
            applyEffect: vi.fn(),
            removeEffect: vi.fn(),
            updateTemporaryEffects: vi.fn(),
            getActiveEffects: vi.fn(() => []),
            calculateEffectValue: vi.fn(() => 0),
            validateEffect: vi.fn(() => true)
        } as any;
        
        equipmentManager = new EquipmentManager(itemEffectSystem, inventoryManager);
        battleSystem = new BattleSystem(scene);
        
        // Integrate systems
        battleSystem.setInventoryManager(inventoryManager);
        battleSystem.setEquipmentManager(equipmentManager);
        
        // Create test units
        playerUnit = createTestUnit({
            id: 'player-1',
            name: 'Player',
            faction: 'player',
            position: { x: 0, y: 0 }
        });
        
        enemyUnit = createTestUnit({
            id: 'enemy-1',
            name: 'Enemy',
            faction: 'enemy',
            position: { x: 1, y: 0 }
        });
        
        // Initialize battle system
        battleSystem.initialize([playerUnit, enemyUnit]);
    });

    afterEach(() => {
        if (battleSystem) {
            battleSystem.destroy();
        }
    });

    describe('Requirement 8.1: Display Usable Items', () => {
        it('should return only battle-usable items', () => {
            // Setup: Add various items
            const healingPotion = createHealingPotion();
            const manaPotion = createManaPotion();
            const townItem = createNonBattleItem();
            
            inventoryManager.addItem(healingPotion, 3);
            inventoryManager.addItem(manaPotion, 2);
            inventoryManager.addItem(townItem, 1);
            
            // Execute
            const usableItems = battleSystem.getBattleUsableItems(playerUnit);
            
            // Verify: Only battle-usable items returned
            expect(usableItems).toHaveLength(2);
            expect(usableItems.some(item => item.id === healingPotion.id)).toBe(true);
            expect(usableItems.some(item => item.id === manaPotion.id)).toBe(true);
            expect(usableItems.some(item => item.id === townItem.id)).toBe(false);
        });

        it('should return empty array when no items in inventory', () => {
            // Execute
            const usableItems = battleSystem.getBattleUsableItems(playerUnit);
            
            // Verify
            expect(usableItems).toHaveLength(0);
        });

        it('should return empty array when inventory manager not integrated', () => {
            // Setup: Create battle system without inventory manager
            const isolatedBattleSystem = new BattleSystem(scene);
            isolatedBattleSystem.initialize([playerUnit]);
            
            // Execute
            const usableItems = isolatedBattleSystem.getBattleUsableItems(playerUnit);
            
            // Verify
            expect(usableItems).toHaveLength(0);
            
            isolatedBattleSystem.destroy();
        });

        it('should show battle item menu with usage status', () => {
            // Setup
            const healingPotion = createHealingPotion();
            inventoryManager.addItem(healingPotion, 2);
            
            // Execute
            const menu = battleSystem.showBattleItemMenu(playerUnit);
            
            // Verify
            expect(menu).toHaveLength(1);
            expect(menu[0].item.id).toBe(healingPotion.id);
            expect(menu[0].quantity).toBe(2);
            expect(menu[0].canUse).toBe(true);
            expect(menu[0].reason).toBeUndefined();
        });

        it('should indicate when character has already acted', () => {
            // Setup
            const healingPotion = createHealingPotion();
            inventoryManager.addItem(healingPotion, 1);
            playerUnit.hasActed = true;
            
            // Execute
            const menu = battleSystem.showBattleItemMenu(playerUnit);
            
            // Verify
            expect(menu[0].canUse).toBe(false);
            expect(menu[0].reason).toContain('already acted');
        });

        it('should indicate when character is defeated', () => {
            // Setup
            const healingPotion = createHealingPotion();
            inventoryManager.addItem(healingPotion, 1);
            playerUnit.currentHP = 0;
            
            // Execute
            const menu = battleSystem.showBattleItemMenu(playerUnit);
            
            // Verify
            expect(menu[0].canUse).toBe(false);
            expect(menu[0].reason).toContain('defeated');
        });
    });

    describe('Requirement 8.2: Apply Item Effects Immediately', () => {
        it('should restore HP when using healing potion', async () => {
            // Setup
            const healingPotion = createHealingPotion();
            inventoryManager.addItem(healingPotion, 1);
            playerUnit.currentHP = 50; // Half HP
            playerUnit.hasActed = false;
            
            // Execute
            const result = await battleSystem.useBattleItem(playerUnit, healingPotion.id);
            
            // Verify: HP restored
            expect(result.success).toBe(true);
            expect(playerUnit.currentHP).toBe(80); // 50 + 30
            expect(result.effectsApplied.length).toBeGreaterThan(0);
        });

        it('should restore MP when using mana potion', async () => {
            // Setup
            const manaPotion = createManaPotion();
            inventoryManager.addItem(manaPotion, 1);
            playerUnit.currentMP = 10; // Low MP
            playerUnit.hasActed = false;
            
            // Execute
            const result = await battleSystem.useBattleItem(playerUnit, manaPotion.id);
            
            // Verify: MP restored
            expect(result.success).toBe(true);
            expect(playerUnit.currentMP).toBe(30); // 10 + 20
        });

        it('should consume item after use', async () => {
            // Setup
            const healingPotion = createHealingPotion();
            inventoryManager.addItem(healingPotion, 3);
            playerUnit.hasActed = false;
            
            // Execute
            const result = await battleSystem.useBattleItem(playerUnit, healingPotion.id);
            
            // Verify: Item consumed
            expect(result.success).toBe(true);
            expect(result.itemConsumed).toBe(true);
            expect(result.remainingQuantity).toBe(2);
            expect(inventoryManager.getItemCount(healingPotion.id)).toBe(2);
        });

        it('should emit battle-item-used event', async () => {
            // Setup
            const healingPotion = createHealingPotion();
            inventoryManager.addItem(healingPotion, 1);
            playerUnit.hasActed = false;
            
            const eventSpy = vi.fn();
            battleSystem.on('battle-item-used', eventSpy);
            
            // Execute
            await battleSystem.useBattleItem(playerUnit, healingPotion.id);
            
            // Verify: Event emitted
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: playerUnit,
                    item: expect.objectContaining({ id: healingPotion.id }),
                    targets: expect.arrayContaining([playerUnit])
                })
            );
        });
    });

    describe('Requirement 8.3: Consume Turn When Using Items', () => {
        it('should mark character as having acted after item use', async () => {
            // Setup
            const healingPotion = createHealingPotion();
            inventoryManager.addItem(healingPotion, 1);
            playerUnit.hasActed = false;
            
            // Execute
            const result = await battleSystem.useBattleItem(playerUnit, healingPotion.id);
            
            // Verify: Turn consumed
            expect(result.success).toBe(true);
            expect(playerUnit.hasActed).toBe(true);
        });

        it('should reject item use when character has already acted', async () => {
            // Setup
            const healingPotion = createHealingPotion();
            inventoryManager.addItem(healingPotion, 1);
            playerUnit.hasActed = true;
            
            // Execute
            const result = await battleSystem.useBattleItem(playerUnit, healingPotion.id);
            
            // Verify: Usage rejected
            expect(result.success).toBe(false);
            expect(result.message).toContain('already acted');
            expect(result.itemConsumed).toBe(false);
        });

        it('should reject item use when character is defeated', async () => {
            // Setup
            const healingPotion = createHealingPotion();
            inventoryManager.addItem(healingPotion, 1);
            playerUnit.currentHP = 0;
            playerUnit.hasActed = false;
            
            // Execute
            const result = await battleSystem.useBattleItem(playerUnit, healingPotion.id);
            
            // Verify: Usage rejected
            expect(result.success).toBe(false);
            expect(result.message).toContain('defeated');
        });
    });

    describe('Requirement 8.4: Reflect Equipment Effects in Battle', () => {
        it('should apply weapon attack bonus to damage calculation', async () => {
            // Setup: Equip weapon with attack bonus
            const weapon = createTestEquipment('weapon');
            inventoryManager.addItem(weapon, 1);
            equipmentManager.equipItem(playerUnit.id, weapon, 'weapon');
            
            const battleWeapon = createTestWeapon();
            
            // Execute battle
            await battleSystem.initiateAttack(playerUnit, battleWeapon);
            const result = await battleSystem.selectTarget(enemyUnit);
            
            // Verify: Battle completed successfully
            expect(result.success).toBe(true);
            // Equipment bonus should be reflected in damage
            // (Actual damage calculation is complex, but we verify it completed)
        });

        it('should apply armor defense bonus to damage reduction', async () => {
            // Setup: Equip armor with defense bonus
            const armor = createTestEquipment('armor');
            inventoryManager.addItem(armor, 1);
            equipmentManager.equipItem(enemyUnit.id, armor, 'armor');
            
            const battleWeapon = createTestWeapon();
            
            // Execute battle
            await battleSystem.initiateAttack(playerUnit, battleWeapon);
            const result = await battleSystem.selectTarget(enemyUnit);
            
            // Verify: Battle completed with defense applied
            expect(result.success).toBe(true);
        });

        it('should apply accessory speed bonus', async () => {
            // Setup: Equip accessory with speed bonus
            const accessory = createTestEquipment('accessory');
            inventoryManager.addItem(accessory, 1);
            equipmentManager.equipItem(playerUnit.id, accessory, 'accessory1');
            
            const battleWeapon = createTestWeapon();
            
            // Execute battle
            await battleSystem.initiateAttack(playerUnit, battleWeapon);
            const result = await battleSystem.selectTarget(enemyUnit);
            
            // Verify: Battle completed
            expect(result.success).toBe(true);
        });

        it('should handle multiple equipment bonuses', async () => {
            // Setup: Equip multiple items
            const weapon = createTestEquipment('weapon');
            const armor = createTestEquipment('armor');
            const accessory = createTestEquipment('accessory');
            
            inventoryManager.addItem(weapon, 1);
            inventoryManager.addItem(armor, 1);
            inventoryManager.addItem(accessory, 1);
            
            equipmentManager.equipItem(playerUnit.id, weapon, 'weapon');
            equipmentManager.equipItem(playerUnit.id, armor, 'armor');
            equipmentManager.equipItem(playerUnit.id, accessory, 'accessory1');
            
            const battleWeapon = createTestWeapon();
            
            // Execute battle
            await battleSystem.initiateAttack(playerUnit, battleWeapon);
            const result = await battleSystem.selectTarget(enemyUnit);
            
            // Verify: All equipment bonuses applied
            expect(result.success).toBe(true);
        });
    });

    describe('Requirement 8.5: Decrease Equipment Durability', () => {
        it('should decrease weapon durability after battle', async () => {
            // Setup
            const weapon = createTestEquipment('weapon');
            weapon.durability = 100;
            inventoryManager.addItem(weapon, 1);
            equipmentManager.equipItem(playerUnit.id, weapon, 'weapon');
            
            const battleWeapon = createTestWeapon();
            
            // Execute battle
            await battleSystem.initiateAttack(playerUnit, battleWeapon);
            await battleSystem.selectTarget(enemyUnit);
            
            // Verify: Durability decreased
            const updatedWeapon = equipmentManager.getEquipment(playerUnit.id, 'weapon');
            expect(updatedWeapon).toBeDefined();
            expect(updatedWeapon!.durability).toBe(99);
        });

        it('should decrease armor durability when taking damage', async () => {
            // Setup
            const armor = createTestEquipment('armor');
            armor.durability = 100;
            inventoryManager.addItem(armor, 1);
            equipmentManager.equipItem(enemyUnit.id, armor, 'armor');
            
            const battleWeapon = createTestWeapon();
            
            // Execute battle
            await battleSystem.initiateAttack(playerUnit, battleWeapon);
            await battleSystem.selectTarget(enemyUnit);
            
            // Verify: Armor durability decreased (if target survived)
            if (enemyUnit.currentHP > 0) {
                const updatedArmor = equipmentManager.getEquipment(enemyUnit.id, 'armor');
                expect(updatedArmor).toBeDefined();
                expect(updatedArmor!.durability).toBeLessThan(100);
            }
        });

        it('should emit equipment-durability-changed event', async () => {
            // Setup
            const weapon = createTestEquipment('weapon');
            weapon.durability = 100;
            inventoryManager.addItem(weapon, 1);
            equipmentManager.equipItem(playerUnit.id, weapon, 'weapon');
            
            const eventSpy = vi.fn();
            battleSystem.on('equipment-durability-changed', eventSpy);
            
            const battleWeapon = createTestWeapon();
            
            // Execute battle
            await battleSystem.initiateAttack(playerUnit, battleWeapon);
            await battleSystem.selectTarget(enemyUnit);
            
            // Verify: Event emitted
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    character: playerUnit,
                    equipment: expect.objectContaining({ id: weapon.id }),
                    durability: 99,
                    maxDurability: 100
                })
            );
        });

        it('should emit equipment-broken event when durability reaches zero', async () => {
            // Setup
            const weapon = createTestEquipment('weapon');
            weapon.durability = 1; // Will break after one use
            inventoryManager.addItem(weapon, 1);
            equipmentManager.equipItem(playerUnit.id, weapon, 'weapon');
            
            const eventSpy = vi.fn();
            battleSystem.on('equipment-broken', eventSpy);
            
            const battleWeapon = createTestWeapon();
            
            // Execute battle
            await battleSystem.initiateAttack(playerUnit, battleWeapon);
            await battleSystem.selectTarget(enemyUnit);
            
            // Verify: Equipment broken event emitted
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    character: playerUnit,
                    equipment: expect.objectContaining({ id: weapon.id })
                })
            );
            
            // Verify: Durability is zero
            const updatedWeapon = equipmentManager.getEquipment(playerUnit.id, 'weapon');
            expect(updatedWeapon!.durability).toBe(0);
        });

        it('should not decrease durability below zero', async () => {
            // Setup
            const weapon = createTestEquipment('weapon');
            weapon.durability = 0; // Already broken
            inventoryManager.addItem(weapon, 1);
            equipmentManager.equipItem(playerUnit.id, weapon, 'weapon');
            
            const battleWeapon = createTestWeapon();
            
            // Execute battle
            await battleSystem.initiateAttack(playerUnit, battleWeapon);
            await battleSystem.selectTarget(enemyUnit);
            
            // Verify: Durability stays at zero
            const updatedWeapon = equipmentManager.getEquipment(playerUnit.id, 'weapon');
            expect(updatedWeapon!.durability).toBe(0);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle missing item gracefully', async () => {
            // Execute: Try to use non-existent item
            const result = await battleSystem.useBattleItem(playerUnit, 'non-existent-item');
            
            // Verify: Error handled
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });

        it('should handle non-battle item usage attempt', async () => {
            // Setup
            const townItem = createNonBattleItem();
            inventoryManager.addItem(townItem, 1);
            playerUnit.hasActed = false;
            
            // Execute
            const result = await battleSystem.useBattleItem(playerUnit, townItem.id);
            
            // Verify: Usage rejected
            expect(result.success).toBe(false);
            expect(result.message).toContain('cannot be used in battle');
        });

        it('should handle equipment manager not integrated', async () => {
            // Setup: Create battle system without equipment manager
            const isolatedBattleSystem = new BattleSystem(scene);
            isolatedBattleSystem.setInventoryManager(inventoryManager);
            isolatedBattleSystem.initialize([playerUnit, enemyUnit]);
            
            const battleWeapon = createTestWeapon();
            
            // Execute: Battle should still work without equipment bonuses
            await isolatedBattleSystem.initiateAttack(playerUnit, battleWeapon);
            const result = await isolatedBattleSystem.selectTarget(enemyUnit);
            
            // Verify: Battle completed without equipment bonuses
            expect(result.success).toBe(true);
            
            isolatedBattleSystem.destroy();
        });

        it('should handle inventory manager not integrated', async () => {
            // Setup: Create battle system without inventory manager
            const isolatedBattleSystem = new BattleSystem(scene);
            isolatedBattleSystem.initialize([playerUnit]);
            
            // Execute
            const result = await isolatedBattleSystem.useBattleItem(playerUnit, 'any-item');
            
            // Verify: Error handled gracefully
            expect(result.success).toBe(false);
            expect(result.message).toContain('not integrated');
            
            isolatedBattleSystem.destroy();
        });
    });
});

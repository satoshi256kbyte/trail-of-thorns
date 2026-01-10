/**
 * Error Handling Integration Unit Tests
 * 
 * Tests error handling across InventoryManager, EquipmentManager, and ItemEffectSystem
 * 
 * 要件: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { InventoryManager } from '../../../../game/src/systems/InventoryManager';
import { EquipmentManager } from '../../../../game/src/systems/EquipmentManager';
import { ItemEffectSystem, Character } from '../../../../game/src/systems/ItemEffectSystem';
import { ItemDataLoader } from '../../../../game/src/systems/ItemDataLoader';
import {
  InventoryErrorHandler,
  ErrorSeverity,
  UserNotificationCallback,
  SafeStateRecoveryCallback,
} from '../../../../game/src/systems/inventory/InventoryErrorHandler';
import {
  Item,
  Equipment,
  EquipmentSlotType,
  ItemType,
  ItemRarity,
  EffectType,
  EffectTarget,
} from '../../../../game/src/types/inventory';

describe('Error Handling Integration - 要件10.1, 10.2, 10.3, 10.4, 10.5', () => {
  let inventoryManager: InventoryManager;
  let equipmentManager: EquipmentManager;
  let itemEffectSystem: ItemEffectSystem;
  let itemDataLoader: ItemDataLoader;
  let errorHandler: InventoryErrorHandler;
  let mockNotificationCallback: UserNotificationCallback;
  let mockRecoveryCallback: SafeStateRecoveryCallback;

  // Test data
  let testItem: Item;
  let testEquipment: Equipment;
  let testCharacter: Character;

  beforeEach(() => {
    // Create error handler with callbacks
    errorHandler = new InventoryErrorHandler({
      enableConsoleLogging: false, // Disable console logging for tests
      enableUserNotifications: true,
    });

    mockNotificationCallback = vi.fn();
    mockRecoveryCallback = vi.fn();

    errorHandler.setUserNotificationCallback(mockNotificationCallback);
    errorHandler.setSafeStateRecoveryCallback(mockRecoveryCallback);

    // Create systems
    itemDataLoader = new ItemDataLoader();
    inventoryManager = new InventoryManager(itemDataLoader, 100, errorHandler);
    itemEffectSystem = new ItemEffectSystem(errorHandler);
    equipmentManager = new EquipmentManager(itemEffectSystem, inventoryManager, errorHandler);

    inventoryManager.setItemEffectSystem(itemEffectSystem);

    // Create test data
    testItem = {
      id: 'test_item',
      name: 'Test Item',
      description: 'Test description',
      type: ItemType.MATERIAL,
      rarity: ItemRarity.COMMON,
      iconPath: 'test.png',
      maxStack: 10,
      sellPrice: 100,
      buyPrice: 200,
    };

    testEquipment = {
      id: 'test_equipment',
      name: 'Test Equipment',
      description: 'Test equipment',
      type: ItemType.WEAPON,
      rarity: ItemRarity.COMMON,
      iconPath: 'test.png',
      maxStack: 1,
      sellPrice: 500,
      buyPrice: 1000,
      slot: EquipmentSlotType.WEAPON,
      stats: {
        attack: 10,
        defense: 5,
      },
      requirements: {
        level: 5,
      },
      durability: 100,
      maxDurability: 100,
      effects: [],
    };

    testCharacter = {
      id: 'test_character',
      name: 'Test Character',
      level: 10,
      currentHP: 100,
      maxHP: 100,
      currentMP: 50,
      maxMP: 50,
      stats: {
        attack: 20,
        defense: 15,
        speed: 10,
        accuracy: 80,
        evasion: 20,
      },
      statusEffects: [],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('InventoryManager Error Handling - 要件10.2', () => {
    test('should reject invalid item addition', () => {
      // Arrange
      const invalidItem = null as any;

      // Act
      const result = inventoryManager.addItem(invalidItem, 1);

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.stringContaining('操作が拒否されました'),
        ErrorSeverity.WARNING
      );

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.some(e => e.code === 'INVALID_OPERATION')).toBe(true);
    });

    test('should reject negative quantity addition', () => {
      // Act
      const result = inventoryManager.addItem(testItem, -1);

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    test('should reject addition when inventory is full', () => {
      // Arrange - Fill inventory
      for (let i = 0; i < 100; i++) {
        const item = { ...testItem, id: `item_${i}` };
        inventoryManager.addItem(item, 1);
      }

      // Act
      const result = inventoryManager.addItem({ ...testItem, id: 'overflow_item' }, 1);

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.stringContaining('操作が拒否されました'),
        ErrorSeverity.WARNING
      );
    });

    test('should reject removal of non-existent item', () => {
      // Act
      const result = inventoryManager.removeItem('non_existent_item', 1);

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    test('should reject removal of more items than available', () => {
      // Arrange
      inventoryManager.addItem(testItem, 5);

      // Act
      const result = inventoryManager.removeItem(testItem.id, 10);

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    test('should reject use of non-consumable item', () => {
      // Arrange
      inventoryManager.addItem(testItem, 1);

      // Act
      const result = inventoryManager.useItem(testItem.id);

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    test('should reject use of non-existent item', () => {
      // Act
      const result = inventoryManager.useItem('non_existent_item');

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalled();
    });
  });

  describe('EquipmentManager Error Handling - 要件10.3', () => {
    test('should reject invalid equipment', () => {
      // Arrange
      const invalidEquipment = null as any;

      // Act - Should handle null equipment gracefully
      const result = equipmentManager.equipItem(
        testCharacter.id,
        invalidEquipment,
        EquipmentSlotType.WEAPON,
        testCharacter
      );

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalled();

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);
    });

    test('should reject equipment in wrong slot', () => {
      // Arrange
      inventoryManager.addItem(testEquipment, 1);

      // Act - Try to equip weapon in armor slot
      const result = equipmentManager.equipItem(
        testCharacter.id,
        testEquipment,
        EquipmentSlotType.ARMOR,
        testCharacter
      );

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    test('should reject equipment when level requirement not met', () => {
      // Arrange
      const highLevelEquipment = {
        ...testEquipment,
        requirements: { level: 20 },
      };
      inventoryManager.addItem(highLevelEquipment, 1);

      const lowLevelCharacter = { ...testCharacter, level: 5 };

      // Act
      const result = equipmentManager.equipItem(
        lowLevelCharacter.id,
        highLevelEquipment,
        EquipmentSlotType.WEAPON,
        lowLevelCharacter
      );

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.stringContaining('装備条件を満たしていません'),
        ErrorSeverity.WARNING
      );
    });

    test('should reject equipment when item not in inventory', () => {
      // Act - Try to equip without adding to inventory first
      const result = equipmentManager.equipItem(
        testCharacter.id,
        testEquipment,
        EquipmentSlotType.WEAPON,
        testCharacter
      );

      // Assert
      expect(result.success).toBe(false);
    });

    test('should maintain state when equipment fails - 要件10.3', () => {
      // Arrange
      const equipment1 = { ...testEquipment, id: 'equipment_1' };
      const equipment2 = {
        ...testEquipment,
        id: 'equipment_2',
        requirements: { level: 20 },
      };

      inventoryManager.addItem(equipment1, 1);
      inventoryManager.addItem(equipment2, 1);

      // Equip first equipment successfully
      equipmentManager.equipItem(
        testCharacter.id,
        equipment1,
        EquipmentSlotType.WEAPON,
        testCharacter
      );

      const beforeEquipment = equipmentManager.getEquipment(
        testCharacter.id,
        EquipmentSlotType.WEAPON
      );
      const beforeInventoryCount = inventoryManager.getItemCount(equipment1.id);

      // Act - Try to equip second equipment (should fail due to level requirement)
      const lowLevelCharacter = { ...testCharacter, level: 5 };
      const result = equipmentManager.equipItem(
        lowLevelCharacter.id,
        equipment2,
        EquipmentSlotType.WEAPON,
        lowLevelCharacter
      );

      // Assert - State should be unchanged
      expect(result.success).toBe(false);

      const afterEquipment = equipmentManager.getEquipment(
        testCharacter.id,
        EquipmentSlotType.WEAPON
      );
      const afterInventoryCount = inventoryManager.getItemCount(equipment1.id);

      expect(afterEquipment?.id).toBe(beforeEquipment?.id);
      expect(afterInventoryCount).toBe(beforeInventoryCount);
    });
  });

  describe('ItemEffectSystem Error Handling', () => {
    test('should reject invalid effect', () => {
      // Arrange
      const invalidEffect = null as any;

      // Act
      const result = itemEffectSystem.applyEffect(
        invalidEffect,
        testCharacter.id,
        testCharacter
      );

      // Assert
      expect(result.success).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    test('should handle effect application errors gracefully', () => {
      // Arrange
      const effect = {
        id: 'test_effect',
        type: EffectType.HP_RECOVERY,
        target: EffectTarget.HP,
        value: 50,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      // Act & Assert - Should not throw
      expect(() => {
        itemEffectSystem.applyEffect(effect, testCharacter.id, testCharacter);
      }).not.toThrow();
    });
  });

  describe('Cross-System Error Propagation', () => {
    test('should propagate errors from ItemEffectSystem to InventoryManager', () => {
      // Arrange
      const consumable = {
        ...testItem,
        id: 'consumable_item',
        type: ItemType.CONSUMABLE,
      };

      // Add consumable to inventory
      inventoryManager.addItem(consumable, 1);

      // Mock ItemEffectSystem to throw error
      const originalApplyEffect = itemEffectSystem.applyEffect;
      itemEffectSystem.applyEffect = vi.fn(() => {
        throw new Error('Effect application failed');
      });

      // Act
      const result = inventoryManager.useItem(consumable.id, testCharacter.id);

      // Assert
      expect(result.success).toBe(false);

      // Restore original method
      itemEffectSystem.applyEffect = originalApplyEffect;
    });

    test('should handle storage errors in InventoryManager', () => {
      // Arrange
      inventoryManager.addItem(testItem, 1);

      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      // Act & Assert
      expect(() => {
        inventoryManager.saveToLocalStorage();
      }).toThrow();

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.stringContaining('データの保存に失敗しました'),
        ErrorSeverity.ERROR
      );

      // Restore original method
      Storage.prototype.setItem = originalSetItem;
    });

    test('should handle storage errors in EquipmentManager', () => {
      // Arrange
      inventoryManager.addItem(testEquipment, 1);
      equipmentManager.equipItem(
        testCharacter.id,
        testEquipment,
        EquipmentSlotType.WEAPON,
        testCharacter
      );

      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      // Act & Assert
      expect(() => {
        equipmentManager.saveToLocalStorage();
      }).toThrow();

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.stringContaining('データの保存に失敗しました'),
        ErrorSeverity.ERROR
      );

      // Restore original method
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('Error Recovery - 要件10.5', () => {
    test('should recover from critical errors', () => {
      // Arrange
      const criticalError = {
        code: 'CRITICAL_ERROR',
        message: 'Critical system error',
        severity: ErrorSeverity.CRITICAL,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(criticalError);

      // Assert
      expect(mockRecoveryCallback).toHaveBeenCalled();
    });

    test('should maintain system integrity after error recovery', () => {
      // Arrange
      inventoryManager.addItem(testItem, 5);
      const beforeCount = inventoryManager.getItemCount(testItem.id);

      // Trigger critical error
      const criticalError = {
        code: 'CRITICAL_ERROR',
        message: 'Critical error',
        severity: ErrorSeverity.CRITICAL,
        timestamp: Date.now(),
      };
      errorHandler.logError(criticalError);

      // Assert - Inventory state should be maintained
      const afterCount = inventoryManager.getItemCount(testItem.id);
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe('Error Logging - 要件10.4', () => {
    test('should log all errors from InventoryManager', () => {
      // Act
      inventoryManager.addItem(null as any, 1);
      inventoryManager.removeItem('non_existent', 1);
      inventoryManager.useItem('non_existent');

      // Assert
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);
      expect(errorLog.every(e => e.timestamp)).toBe(true);
    });

    test('should log all errors from EquipmentManager', () => {
      // Act
      equipmentManager.equipItem(
        testCharacter.id,
        null as any,
        EquipmentSlotType.WEAPON,
        testCharacter
      );

      // Assert
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);
    });

    test('should log errors with context information', () => {
      // Act
      inventoryManager.addItem(testItem, -1);

      // Assert
      const errorLog = errorHandler.getErrorLog();
      const lastError = errorLog[errorLog.length - 1];
      expect(lastError.context).toBeDefined();
    });
  });

  describe('Default Values - 要件10.1', () => {
    test('should use default item when data load fails', () => {
      // Act
      const defaultItem = errorHandler.handleDataLoadError(
        'missing_item',
        new Error('Not found')
      );

      // Assert
      expect(defaultItem).toBeDefined();
      expect(defaultItem.id).toBe('default_item');
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.stringContaining('アイテムデータの読み込みに失敗しました'),
        ErrorSeverity.ERROR
      );
    });

    test('should use default inventory data when needed', () => {
      // Act
      const defaultInventory = errorHandler.useDefaultValue('defaultInventoryData');

      // Assert
      expect(defaultInventory).toBeDefined();
      expect(defaultInventory.maxSlots).toBe(100);
    });

    test('should use default equipment set when needed', () => {
      // Act
      const defaultEquipment = errorHandler.useDefaultValue('defaultEquipmentSet');

      // Assert
      expect(defaultEquipment).toBeDefined();
      expect(defaultEquipment.weapon).toBeNull();
    });
  });

  describe('Error Statistics and Monitoring', () => {
    test('should track error statistics across all systems', () => {
      // Act - Generate errors from different systems
      inventoryManager.addItem(null as any, 1);
      equipmentManager.equipItem(
        testCharacter.id,
        null as any,
        EquipmentSlotType.WEAPON,
        testCharacter
      );
      itemEffectSystem.applyEffect(null as any, testCharacter.id, testCharacter);

      // Assert
      const debugInfo = errorHandler.getDebugInfo();
      expect(debugInfo.totalErrors).toBeGreaterThan(0);
      expect(debugInfo.errorsBySeverity[ErrorSeverity.WARNING]).toBeGreaterThan(0);
    });

    test('should provide recent error history', () => {
      // Act - Generate multiple errors
      for (let i = 0; i < 5; i++) {
        inventoryManager.addItem(null as any, 1);
      }

      // Assert
      const debugInfo = errorHandler.getDebugInfo();
      expect(debugInfo.recentErrors.length).toBeGreaterThan(0);
      expect(debugInfo.recentErrors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle rapid error generation', () => {
      // Act - Generate many errors rapidly
      for (let i = 0; i < 50; i++) {
        inventoryManager.addItem(null as any, 1);
      }

      // Assert - Should not crash
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeLessThanOrEqual(100); // Max log size
    });

    test('should handle concurrent error notifications', () => {
      // Act
      inventoryManager.addItem(null as any, 1);
      equipmentManager.equipItem(
        testCharacter.id,
        null as any,
        EquipmentSlotType.WEAPON,
        testCharacter
      );

      // Assert
      expect(mockNotificationCallback).toHaveBeenCalledTimes(2);
    });

    test('should handle errors during error handling', () => {
      // Arrange - Make notification callback throw
      const throwingCallback: UserNotificationCallback = vi.fn(() => {
        throw new Error('Notification failed');
      });
      errorHandler.setUserNotificationCallback(throwingCallback);

      // Act - Try to add invalid item
      const result = inventoryManager.addItem(null as any, 1);

      // Assert - Should handle the error gracefully and return failure
      expect(result.success).toBe(false);
      expect(throwingCallback).toHaveBeenCalled();
    });
  });
});

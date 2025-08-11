/**
 * BehaviorNodes - Basic behavior nodes for AI decision making
 *
 * This module provides:
 * - Leaf nodes for specific AI actions (attack, move, wait, etc.)
 * - Condition nodes for decision making
 * - Action nodes that set the selected action in context
 * - Utility nodes for common AI behaviors
 */

import { Unit, Position } from '../../types/gameplay';
import { AIAction, AIActionType } from '../AIController';
import { BehaviorNode, BehaviorResult, AIContext } from './BehaviorTree';

/**
 * Base class for leaf nodes (nodes with no children)
 */
export abstract class LeafNode implements BehaviorNode {
    public id: string;
    public name: string;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    abstract execute(context: AIContext): BehaviorResult;

    reset(): void {
        // Most leaf nodes don't need to reset state
    }

    getDebugInfo(): any {
        return {
            id: this.id,
            name: this.name,
            type: this.constructor.name,
        };
    }
}

/**
 * Base class for condition nodes
 */
export abstract class ConditionNode extends LeafNode {
    constructor(id: string, name: string) {
        super(id, name);
    }

    abstract execute(context: AIContext): BehaviorResult;
}

/**
 * Base class for action nodes
 */
export abstract class ActionNode extends LeafNode {
    constructor(id: string, name: string) {
        super(id, name);
    }

    abstract execute(context: AIContext): BehaviorResult;
}

// ============================================================================
// CONDITION NODES
// ============================================================================

/**
 * Check if unit has low health
 */
export class HasLowHealthNode extends ConditionNode {
    private healthThreshold: number;

    constructor(id: string, healthThreshold: number = 0.3, name: string = 'Has Low Health') {
        super(id, name);
        this.healthThreshold = healthThreshold;
    }

    execute(context: AIContext): BehaviorResult {
        const healthPercentage = context.currentUnit.currentHP / context.currentUnit.stats.maxHP;
        return healthPercentage <= this.healthThreshold ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }

    getDebugInfo(): any {
        return {
            ...super.getDebugInfo(),
            healthThreshold: this.healthThreshold,
        };
    }
}

/**
 * Check if NPCs are present on the battlefield
 */
export class HasNPCTargetsNode extends ConditionNode {
    constructor(id: string, name: string = 'Has NPC Targets') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        return context.npcs.length > 0 ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }
}

/**
 * Check if unit can attack any enemy
 */
export class CanAttackEnemyNode extends ConditionNode {
    constructor(id: string, name: string = 'Can Attack Enemy') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        const enemies = context.visibleEnemies.filter(enemy =>
            enemy.currentHP > 0 && this.canAttack(context.currentUnit, enemy)
        );

        return enemies.length > 0 ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }

    private canAttack(attacker: Unit, target: Unit): boolean {
        // Simple range check - in a full implementation this would use the battle system
        const distance = Math.abs(attacker.position.x - target.position.x) +
            Math.abs(attacker.position.y - target.position.y);
        const maxRange = attacker.weapon?.range || 1;
        return distance <= maxRange;
    }
}

/**
 * Check if unit has moved this turn
 */
export class HasMovedNode extends ConditionNode {
    constructor(id: string, name: string = 'Has Moved') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        return context.currentUnit.hasMoved ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }
}

/**
 * Check if unit has acted this turn
 */
export class HasActedNode extends ConditionNode {
    constructor(id: string, name: string = 'Has Acted') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        return context.currentUnit.hasActed ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }
}

/**
 * Check if allies need healing
 */
export class AlliesNeedHealingNode extends ConditionNode {
    private healthThreshold: number;

    constructor(id: string, healthThreshold: number = 0.5, name: string = 'Allies Need Healing') {
        super(id, name);
        this.healthThreshold = healthThreshold;
    }

    execute(context: AIContext): BehaviorResult {
        const injuredAllies = context.visibleAllies.filter(ally => {
            const healthPercentage = ally.currentHP / ally.stats.maxHP;
            return healthPercentage < this.healthThreshold && ally.id !== context.currentUnit.id;
        });

        return injuredAllies.length > 0 ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }
}

/**
 * Check if unit has usable skills
 */
export class HasUsableSkillsNode extends ConditionNode {
    constructor(id: string, name: string = 'Has Usable Skills') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        return context.availableSkills.length > 0 ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }
}

// ============================================================================
// ACTION NODES
// ============================================================================

/**
 * Attack the nearest enemy
 */
export class AttackNearestEnemyNode extends ActionNode {
    constructor(id: string, name: string = 'Attack Nearest Enemy') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        const enemies = context.visibleEnemies.filter(enemy =>
            enemy.currentHP > 0 && this.canAttack(context.currentUnit, enemy)
        );

        if (enemies.length === 0) {
            return BehaviorResult.FAILURE;
        }

        // Find nearest enemy
        const nearestEnemy = enemies.reduce((nearest, enemy) => {
            const nearestDistance = this.calculateDistance(context.currentUnit.position, nearest.position);
            const enemyDistance = this.calculateDistance(context.currentUnit.position, enemy.position);
            return enemyDistance < nearestDistance ? enemy : nearest;
        });

        // Set the action in context
        context.selectedAction = {
            type: AIActionType.ATTACK,
            priority: 50,
            target: nearestEnemy,
            reasoning: `Attack nearest enemy: ${nearestEnemy.name}`,
        };

        return BehaviorResult.SUCCESS;
    }

    private canAttack(attacker: Unit, target: Unit): boolean {
        const distance = this.calculateDistance(attacker.position, target.position);
        const maxRange = attacker.weapon?.range || 1;
        return distance <= maxRange;
    }

    private calculateDistance(pos1: Position, pos2: Position): number {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }
}

/**
 * Attack the highest priority NPC
 */
export class AttackNPCNode extends ActionNode {
    constructor(id: string, name: string = 'Attack NPC') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        const attackableNPCs = context.npcs.filter(npc =>
            npc.currentHP > 0 && this.canAttack(context.currentUnit, npc)
        );

        if (attackableNPCs.length === 0) {
            return BehaviorResult.FAILURE;
        }

        // For now, attack the nearest NPC. In a full implementation,
        // this would consider NPC priority from the recruitment system
        const targetNPC = attackableNPCs.reduce((nearest, npc) => {
            const nearestDistance = this.calculateDistance(context.currentUnit.position, nearest.position);
            const npcDistance = this.calculateDistance(context.currentUnit.position, npc.position);
            return npcDistance < nearestDistance ? npc : nearest;
        });

        context.selectedAction = {
            type: AIActionType.ATTACK,
            priority: 100, // High priority for NPCs
            target: targetNPC,
            reasoning: `Attack NPC: ${targetNPC.name} (HIGH PRIORITY)`,
        };

        return BehaviorResult.SUCCESS;
    }

    private canAttack(attacker: Unit, target: Unit): boolean {
        const distance = this.calculateDistance(attacker.position, target.position);
        const maxRange = attacker.weapon?.range || 1;
        return distance <= maxRange;
    }

    private calculateDistance(pos1: Position, pos2: Position): number {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }
}

/**
 * Move to safety (away from enemies)
 */
export class MoveToSafetyNode extends ActionNode {
    constructor(id: string, name: string = 'Move To Safety') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        if (context.currentUnit.hasMoved || !context.mapData) {
            return BehaviorResult.FAILURE;
        }

        // This is a simplified implementation
        // In a full implementation, this would use the movement system to calculate safe positions
        const currentPos = context.currentUnit.position;
        const enemies = context.visibleEnemies.filter(enemy => enemy.currentHP > 0);

        if (enemies.length === 0) {
            return BehaviorResult.FAILURE;
        }

        // Find a position that maximizes distance from enemies
        // For now, just move away from the nearest enemy
        const nearestEnemy = enemies.reduce((nearest, enemy) => {
            const nearestDistance = this.calculateDistance(currentPos, nearest.position);
            const enemyDistance = this.calculateDistance(currentPos, enemy.position);
            return enemyDistance < nearestDistance ? enemy : nearest;
        });

        // Calculate a position away from the nearest enemy
        const deltaX = currentPos.x - nearestEnemy.position.x;
        const deltaY = currentPos.y - nearestEnemy.position.y;

        // Normalize and extend the vector
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (length === 0) {
            return BehaviorResult.FAILURE;
        }

        const normalizedX = deltaX / length;
        const normalizedY = deltaY / length;

        const safePosition: Position = {
            x: Math.round(currentPos.x + normalizedX * 2),
            y: Math.round(currentPos.y + normalizedY * 2),
        };

        // Basic bounds checking
        if (context.mapData) {
            safePosition.x = Math.max(0, Math.min(context.mapData.width - 1, safePosition.x));
            safePosition.y = Math.max(0, Math.min(context.mapData.height - 1, safePosition.y));
        }

        context.selectedAction = {
            type: AIActionType.MOVE,
            priority: 40,
            position: safePosition,
            reasoning: `Move to safety away from ${nearestEnemy.name}`,
        };

        return BehaviorResult.SUCCESS;
    }

    private calculateDistance(pos1: Position, pos2: Position): number {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }
}

/**
 * Move closer to target
 */
export class MoveToTargetNode extends ActionNode {
    private targetType: 'enemy' | 'npc' | 'ally';

    constructor(id: string, targetType: 'enemy' | 'npc' | 'ally' = 'enemy', name?: string) {
        super(id, name || `Move To ${targetType.charAt(0).toUpperCase() + targetType.slice(1)}`);
        this.targetType = targetType;
    }

    execute(context: AIContext): BehaviorResult {
        if (context.currentUnit.hasMoved || !context.mapData) {
            return BehaviorResult.FAILURE;
        }

        let targets: Unit[] = [];

        switch (this.targetType) {
            case 'enemy':
                targets = context.visibleEnemies.filter(enemy => enemy.currentHP > 0);
                break;
            case 'npc':
                targets = context.npcs.filter(npc => npc.currentHP > 0);
                break;
            case 'ally':
                targets = context.visibleAllies.filter(ally =>
                    ally.currentHP > 0 && ally.id !== context.currentUnit.id
                );
                break;
        }

        if (targets.length === 0) {
            return BehaviorResult.FAILURE;
        }

        // Find nearest target
        const nearestTarget = targets.reduce((nearest, target) => {
            const nearestDistance = this.calculateDistance(context.currentUnit.position, nearest.position);
            const targetDistance = this.calculateDistance(context.currentUnit.position, target.position);
            return targetDistance < nearestDistance ? target : nearest;
        });

        // Calculate position closer to target
        const currentPos = context.currentUnit.position;
        const targetPos = nearestTarget.position;

        const deltaX = targetPos.x - currentPos.x;
        const deltaY = targetPos.y - currentPos.y;

        // Move one step closer
        const moveX = deltaX === 0 ? 0 : (deltaX > 0 ? 1 : -1);
        const moveY = deltaY === 0 ? 0 : (deltaY > 0 ? 1 : -1);

        const newPosition: Position = {
            x: currentPos.x + moveX,
            y: currentPos.y + moveY,
        };

        // Basic bounds checking
        if (context.mapData) {
            newPosition.x = Math.max(0, Math.min(context.mapData.width - 1, newPosition.x));
            newPosition.y = Math.max(0, Math.min(context.mapData.height - 1, newPosition.y));
        }

        context.selectedAction = {
            type: AIActionType.MOVE,
            priority: 30,
            position: newPosition,
            reasoning: `Move closer to ${this.targetType}: ${nearestTarget.name}`,
        };

        return BehaviorResult.SUCCESS;
    }

    private calculateDistance(pos1: Position, pos2: Position): number {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }
}

/**
 * Use a skill
 */
export class UseSkillNode extends ActionNode {
    private skillType?: string;

    constructor(id: string, skillType?: string, name?: string) {
        super(id, name || `Use Skill${skillType ? ` (${skillType})` : ''}`);
        this.skillType = skillType;
    }

    execute(context: AIContext): BehaviorResult {
        if (context.availableSkills.length === 0) {
            return BehaviorResult.FAILURE;
        }

        // Filter skills by type if specified
        let availableSkills = context.availableSkills;
        if (this.skillType) {
            availableSkills = availableSkills.filter(skillId =>
                skillId.toLowerCase().includes(this.skillType!.toLowerCase())
            );
        }

        if (availableSkills.length === 0) {
            return BehaviorResult.FAILURE;
        }

        // For now, just use the first available skill
        // In a full implementation, this would consider skill effectiveness, targets, etc.
        const selectedSkill = availableSkills[0];

        // Find appropriate target for the skill
        let target: Unit | undefined;

        // Simple heuristic: if skill name contains "heal", target ally; otherwise target enemy
        if (selectedSkill.toLowerCase().includes('heal')) {
            const injuredAllies = context.visibleAllies.filter(ally =>
                ally.currentHP < ally.stats.maxHP && ally.id !== context.currentUnit.id
            );
            target = injuredAllies.length > 0 ? injuredAllies[0] : undefined;
        } else {
            const enemies = context.visibleEnemies.filter(enemy => enemy.currentHP > 0);
            target = enemies.length > 0 ? enemies[0] : undefined;
        }

        context.selectedAction = {
            type: AIActionType.SKILL,
            priority: 35,
            skillId: selectedSkill,
            target: target,
            reasoning: `Use skill: ${selectedSkill}${target ? ` on ${target.name}` : ''}`,
        };

        return BehaviorResult.SUCCESS;
    }
}

/**
 * Wait/do nothing
 */
export class WaitNode extends ActionNode {
    constructor(id: string, name: string = 'Wait') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        context.selectedAction = {
            type: AIActionType.WAIT,
            priority: 5,
            reasoning: 'Wait and observe',
        };

        return BehaviorResult.SUCCESS;
    }
}

/**
 * Heal ally
 */
export class HealAllyNode extends ActionNode {
    private healthThreshold: number;

    constructor(id: string, healthThreshold: number = 0.5, name: string = 'Heal Ally') {
        super(id, name);
        this.healthThreshold = healthThreshold;
    }

    execute(context: AIContext): BehaviorResult {
        // Check if unit has healing skills
        const healingSkills = context.availableSkills.filter(skillId =>
            skillId.toLowerCase().includes('heal') || skillId.toLowerCase().includes('cure')
        );

        if (healingSkills.length === 0) {
            return BehaviorResult.FAILURE;
        }

        // Find injured allies
        const injuredAllies = context.visibleAllies.filter(ally => {
            const healthPercentage = ally.currentHP / ally.stats.maxHP;
            return healthPercentage < this.healthThreshold && ally.id !== context.currentUnit.id;
        });

        if (injuredAllies.length === 0) {
            return BehaviorResult.FAILURE;
        }

        // Target the most injured ally
        const targetAlly = injuredAllies.reduce((mostInjured, ally) => {
            const mostInjuredPercentage = mostInjured.currentHP / mostInjured.stats.maxHP;
            const allyPercentage = ally.currentHP / ally.stats.maxHP;
            return allyPercentage < mostInjuredPercentage ? ally : mostInjured;
        });

        context.selectedAction = {
            type: AIActionType.SKILL,
            priority: 60,
            skillId: healingSkills[0],
            target: targetAlly,
            reasoning: `Heal injured ally: ${targetAlly.name}`,
        };

        return BehaviorResult.SUCCESS;
    }
}

/**
 * Guard/defend
 */
export class GuardNode extends ActionNode {
    constructor(id: string, name: string = 'Guard') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        context.selectedAction = {
            type: AIActionType.GUARD,
            priority: 15,
            reasoning: 'Take defensive stance',
        };

        return BehaviorResult.SUCCESS;
    }
}
/**
 * BehaviorTreeBuilder - Dynamic behavior tree construction system
 *
 * This system provides:
 * - Fluent API for building behavior trees
 * - Pre-built behavior tree templates for different AI types
 * - Dynamic tree modification and optimization
 * - Tree validation and debugging utilities
 */

import {
    BehaviorTree,
    BehaviorNode,
    SelectorNode,
    SequenceNode,
    ParallelNode,
    InverterNode,
    RepeaterNode
} from './BehaviorTree';

import {
    HasLowHealthNode,
    HasNPCTargetsNode,
    CanAttackEnemyNode,
    HasMovedNode,
    HasActedNode,
    AlliesNeedHealingNode,
    HasUsableSkillsNode,
    AttackNearestEnemyNode,
    AttackNPCNode,
    MoveToSafetyNode,
    MoveToTargetNode,
    UseSkillNode,
    WaitNode,
    HealAllyNode,
    GuardNode
} from './BehaviorNodes';

/**
 * AI behavior type for tree construction
 */
export enum AIBehaviorType {
    AGGRESSIVE = 'aggressive',
    DEFENSIVE = 'defensive',
    SUPPORT = 'support',
    NPC_HUNTER = 'npc_hunter',
    TACTICAL = 'tactical',
    BALANCED = 'balanced',
}

/**
 * Builder class for constructing behavior trees
 */
export class BehaviorTreeBuilder {
    private nodeIdCounter: number = 0;

    /**
     * Generate unique node ID
     */
    private generateNodeId(): string {
        return `node_${++this.nodeIdCounter}`;
    }

    /**
     * Create a selector node
     */
    selector(name?: string): SelectorNode {
        return new SelectorNode(this.generateNodeId(), name);
    }

    /**
     * Create a sequence node
     */
    sequence(name?: string): SequenceNode {
        return new SequenceNode(this.generateNodeId(), name);
    }

    /**
     * Create a parallel node
     */
    parallel(successThreshold: number = 1, failureThreshold: number = 1, name?: string): ParallelNode {
        return new ParallelNode(this.generateNodeId(), name, successThreshold, failureThreshold);
    }

    /**
     * Create an inverter decorator
     */
    inverter(child: BehaviorNode, name?: string): InverterNode {
        return new InverterNode(this.generateNodeId(), child, name);
    }

    /**
     * Create a repeater decorator
     */
    repeater(child: BehaviorNode, maxRepeats: number = -1, name?: string): RepeaterNode {
        return new RepeaterNode(this.generateNodeId(), child, maxRepeats, name);
    }

    // ============================================================================
    // CONDITION NODES
    // ============================================================================

    hasLowHealth(threshold: number = 0.3): HasLowHealthNode {
        return new HasLowHealthNode(this.generateNodeId(), threshold);
    }

    hasNPCTargets(): HasNPCTargetsNode {
        return new HasNPCTargetsNode(this.generateNodeId());
    }

    canAttackEnemy(): CanAttackEnemyNode {
        return new CanAttackEnemyNode(this.generateNodeId());
    }

    hasMoved(): HasMovedNode {
        return new HasMovedNode(this.generateNodeId());
    }

    hasActed(): HasActedNode {
        return new HasActedNode(this.generateNodeId());
    }

    alliesNeedHealing(threshold: number = 0.5): AlliesNeedHealingNode {
        return new AlliesNeedHealingNode(this.generateNodeId(), threshold);
    }

    hasUsableSkills(): HasUsableSkillsNode {
        return new HasUsableSkillsNode(this.generateNodeId());
    }

    // ============================================================================
    // ACTION NODES
    // ============================================================================

    attackNearestEnemy(): AttackNearestEnemyNode {
        return new AttackNearestEnemyNode(this.generateNodeId());
    }

    attackNPC(): AttackNPCNode {
        return new AttackNPCNode(this.generateNodeId());
    }

    moveToSafety(): MoveToSafetyNode {
        return new MoveToSafetyNode(this.generateNodeId());
    }

    moveToTarget(targetType: 'enemy' | 'npc' | 'ally' = 'enemy'): MoveToTargetNode {
        return new MoveToTargetNode(this.generateNodeId(), targetType);
    }

    useSkill(skillType?: string): UseSkillNode {
        return new UseSkillNode(this.generateNodeId(), skillType);
    }

    wait(): WaitNode {
        return new WaitNode(this.generateNodeId());
    }

    healAlly(threshold: number = 0.5): HealAllyNode {
        return new HealAllyNode(this.generateNodeId(), threshold);
    }

    guard(): GuardNode {
        return new GuardNode(this.generateNodeId());
    }

    // ============================================================================
    // PRE-BUILT BEHAVIOR TREES
    // ============================================================================

    /**
     * Create an aggressive AI behavior tree
     */
    createAggressiveTree(): BehaviorTree {
        const root = this.selector('Aggressive AI Root');

        // Priority 1: Attack NPCs if present
        const npcSequence = this.sequence('NPC Attack Sequence');
        npcSequence.addChild(this.hasNPCTargets());
        npcSequence.addChild(this.attackNPC());
        root.addChild(npcSequence);

        // Priority 2: Attack nearest enemy if possible
        const attackSequence = this.sequence('Attack Sequence');
        attackSequence.addChild(this.canAttackEnemy());
        attackSequence.addChild(this.attackNearestEnemy());
        root.addChild(attackSequence);

        // Priority 3: Move closer to enemies if not moved
        const moveSequence = this.sequence('Move to Enemy Sequence');
        moveSequence.addChild(this.inverter(this.hasMoved()));
        moveSequence.addChild(this.moveToTarget('enemy'));
        root.addChild(moveSequence);

        // Priority 4: Move closer to NPCs if present
        const moveToNPCSequence = this.sequence('Move to NPC Sequence');
        moveToNPCSequence.addChild(this.inverter(this.hasMoved()));
        moveToNPCSequence.addChild(this.hasNPCTargets());
        moveToNPCSequence.addChild(this.moveToTarget('npc'));
        root.addChild(moveToNPCSequence);

        // Fallback: Wait
        root.addChild(this.wait());

        return new BehaviorTree(root);
    }

    /**
     * Create a defensive AI behavior tree
     */
    createDefensiveTree(): BehaviorTree {
        const root = this.selector('Defensive AI Root');

        // Priority 1: Move to safety if low health
        const safetySequence = this.sequence('Safety Sequence');
        safetySequence.addChild(this.hasLowHealth(0.4));
        safetySequence.addChild(this.inverter(this.hasMoved()));
        safetySequence.addChild(this.moveToSafety());
        root.addChild(safetySequence);

        // Priority 2: Guard if low health and can't move
        const guardSequence = this.sequence('Guard Sequence');
        guardSequence.addChild(this.hasLowHealth(0.4));
        guardSequence.addChild(this.guard());
        root.addChild(guardSequence);

        // Priority 3: Attack NPCs if present (even defensive AI prioritizes NPCs)
        const npcSequence = this.sequence('NPC Attack Sequence');
        npcSequence.addChild(this.hasNPCTargets());
        npcSequence.addChild(this.canAttackEnemy());
        npcSequence.addChild(this.attackNPC());
        root.addChild(npcSequence);

        // Priority 4: Attack if safe to do so
        const safeAttackSequence = this.sequence('Safe Attack Sequence');
        safeAttackSequence.addChild(this.inverter(this.hasLowHealth(0.3)));
        safeAttackSequence.addChild(this.canAttackEnemy());
        safeAttackSequence.addChild(this.attackNearestEnemy());
        root.addChild(safeAttackSequence);

        // Fallback: Wait
        root.addChild(this.wait());

        return new BehaviorTree(root);
    }

    /**
     * Create a support AI behavior tree
     */
    createSupportTree(): BehaviorTree {
        const root = this.selector('Support AI Root');

        // Priority 1: Heal injured allies
        const healSequence = this.sequence('Heal Sequence');
        healSequence.addChild(this.alliesNeedHealing(0.6));
        healSequence.addChild(this.healAlly(0.6));
        root.addChild(healSequence);

        // Priority 2: Use support skills
        const supportSkillSequence = this.sequence('Support Skill Sequence');
        supportSkillSequence.addChild(this.hasUsableSkills());
        supportSkillSequence.addChild(this.useSkill('buff'));
        root.addChild(supportSkillSequence);

        // Priority 3: Attack NPCs if present
        const npcSequence = this.sequence('NPC Attack Sequence');
        npcSequence.addChild(this.hasNPCTargets());
        npcSequence.addChild(this.canAttackEnemy());
        npcSequence.addChild(this.attackNPC());
        root.addChild(npcSequence);

        // Priority 4: Move to support position
        const supportMoveSequence = this.sequence('Support Move Sequence');
        supportMoveSequence.addChild(this.inverter(this.hasMoved()));
        supportMoveSequence.addChild(this.alliesNeedHealing());
        supportMoveSequence.addChild(this.moveToTarget('ally'));
        root.addChild(supportMoveSequence);

        // Priority 5: Attack if nothing else to do
        const attackSequence = this.sequence('Attack Sequence');
        attackSequence.addChild(this.canAttackEnemy());
        attackSequence.addChild(this.attackNearestEnemy());
        root.addChild(attackSequence);

        // Fallback: Wait
        root.addChild(this.wait());

        return new BehaviorTree(root);
    }

    /**
     * Create an NPC hunter AI behavior tree
     */
    createNPCHunterTree(): BehaviorTree {
        const root = this.selector('NPC Hunter AI Root');

        // Priority 1: Attack NPCs if in range
        const attackNPCSequence = this.sequence('Attack NPC Sequence');
        attackNPCSequence.addChild(this.hasNPCTargets());
        attackNPCSequence.addChild(this.canAttackEnemy());
        attackNPCSequence.addChild(this.attackNPC());
        root.addChild(attackNPCSequence);

        // Priority 2: Move to NPCs if not in range
        const moveToNPCSequence = this.sequence('Move to NPC Sequence');
        moveToNPCSequence.addChild(this.hasNPCTargets());
        moveToNPCSequence.addChild(this.inverter(this.hasMoved()));
        moveToNPCSequence.addChild(this.moveToTarget('npc'));
        root.addChild(moveToNPCSequence);

        // Priority 3: Attack other enemies if no NPCs
        const attackEnemySequence = this.sequence('Attack Enemy Sequence');
        attackEnemySequence.addChild(this.inverter(this.hasNPCTargets()));
        attackEnemySequence.addChild(this.canAttackEnemy());
        attackEnemySequence.addChild(this.attackNearestEnemy());
        root.addChild(attackEnemySequence);

        // Priority 4: Move to enemies if no NPCs
        const moveToEnemySequence = this.sequence('Move to Enemy Sequence');
        moveToEnemySequence.addChild(this.inverter(this.hasNPCTargets()));
        moveToEnemySequence.addChild(this.inverter(this.hasMoved()));
        moveToEnemySequence.addChild(this.moveToTarget('enemy'));
        root.addChild(moveToEnemySequence);

        // Fallback: Wait
        root.addChild(this.wait());

        return new BehaviorTree(root);
    }

    /**
     * Create a tactical AI behavior tree
     */
    createTacticalTree(): BehaviorTree {
        const root = this.selector('Tactical AI Root');

        // Priority 1: Retreat if low health
        const retreatSequence = this.sequence('Retreat Sequence');
        retreatSequence.addChild(this.hasLowHealth(0.3));
        retreatSequence.addChild(this.inverter(this.hasMoved()));
        retreatSequence.addChild(this.moveToSafety());
        root.addChild(retreatSequence);

        // Priority 2: Attack NPCs (always high priority)
        const npcSequence = this.sequence('NPC Attack Sequence');
        npcSequence.addChild(this.hasNPCTargets());
        npcSequence.addChild(this.canAttackEnemy());
        npcSequence.addChild(this.attackNPC());
        root.addChild(npcSequence);

        // Priority 3: Use tactical skills
        const tacticalSkillSequence = this.sequence('Tactical Skill Sequence');
        tacticalSkillSequence.addChild(this.hasUsableSkills());
        tacticalSkillSequence.addChild(this.useSkill());
        root.addChild(tacticalSkillSequence);

        // Priority 4: Position for attack
        const positionSequence = this.sequence('Position Sequence');
        positionSequence.addChild(this.inverter(this.hasMoved()));
        positionSequence.addChild(this.moveToTarget('enemy'));
        root.addChild(positionSequence);

        // Priority 5: Attack if in position
        const attackSequence = this.sequence('Attack Sequence');
        attackSequence.addChild(this.canAttackEnemy());
        attackSequence.addChild(this.attackNearestEnemy());
        root.addChild(attackSequence);

        // Fallback: Wait
        root.addChild(this.wait());

        return new BehaviorTree(root);
    }

    /**
     * Create a balanced AI behavior tree
     */
    createBalancedTree(): BehaviorTree {
        const root = this.selector('Balanced AI Root');

        // Priority 1: Heal allies if critically injured
        const criticalHealSequence = this.sequence('Critical Heal Sequence');
        criticalHealSequence.addChild(this.alliesNeedHealing(0.25));
        criticalHealSequence.addChild(this.healAlly(0.25));
        root.addChild(criticalHealSequence);

        // Priority 2: Retreat if low health
        const retreatSequence = this.sequence('Retreat Sequence');
        retreatSequence.addChild(this.hasLowHealth(0.3));
        retreatSequence.addChild(this.inverter(this.hasMoved()));
        retreatSequence.addChild(this.moveToSafety());
        root.addChild(retreatSequence);

        // Priority 3: Attack NPCs
        const npcSequence = this.sequence('NPC Attack Sequence');
        npcSequence.addChild(this.hasNPCTargets());
        npcSequence.addChild(this.canAttackEnemy());
        npcSequence.addChild(this.attackNPC());
        root.addChild(npcSequence);

        // Priority 4: Use skills strategically
        const skillSequence = this.sequence('Skill Sequence');
        skillSequence.addChild(this.hasUsableSkills());
        skillSequence.addChild(this.useSkill());
        root.addChild(skillSequence);

        // Priority 5: Attack enemies
        const attackSequence = this.sequence('Attack Sequence');
        attackSequence.addChild(this.canAttackEnemy());
        attackSequence.addChild(this.attackNearestEnemy());
        root.addChild(attackSequence);

        // Priority 6: Move to position
        const moveSequence = this.sequence('Move Sequence');
        moveSequence.addChild(this.inverter(this.hasMoved()));
        moveSequence.addChild(this.moveToTarget('enemy'));
        root.addChild(moveSequence);

        // Fallback: Wait
        root.addChild(this.wait());

        return new BehaviorTree(root);
    }

    /**
     * Create a behavior tree based on AI type
     */
    createTreeForType(behaviorType: AIBehaviorType): BehaviorTree {
        switch (behaviorType) {
            case AIBehaviorType.AGGRESSIVE:
                return this.createAggressiveTree();
            case AIBehaviorType.DEFENSIVE:
                return this.createDefensiveTree();
            case AIBehaviorType.SUPPORT:
                return this.createSupportTree();
            case AIBehaviorType.NPC_HUNTER:
                return this.createNPCHunterTree();
            case AIBehaviorType.TACTICAL:
                return this.createTacticalTree();
            case AIBehaviorType.BALANCED:
                return this.createBalancedTree();
            default:
                return this.createBalancedTree();
        }
    }

    /**
     * Validate a behavior tree structure
     */
    validateTree(tree: BehaviorTree): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        const rootNode = tree.getRootNode();
        if (!rootNode) {
            errors.push('Tree has no root node');
            return { isValid: false, errors, warnings };
        }

        // Check for common issues
        this.validateNodeRecursive(rootNode, errors, warnings, new Set());

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Recursively validate nodes
     */
    private validateNodeRecursive(
        node: BehaviorNode,
        errors: string[],
        warnings: string[],
        visitedIds: Set<string>
    ): void {
        // Check for duplicate IDs
        if (visitedIds.has(node.id)) {
            errors.push(`Duplicate node ID: ${node.id}`);
            return;
        }
        visitedIds.add(node.id);

        // Check node-specific issues
        if (node instanceof SelectorNode || node instanceof SequenceNode) {
            const children = node.getChildren();
            if (children.length === 0) {
                warnings.push(`Composite node ${node.name} has no children`);
            }

            // Recursively validate children
            for (const child of children) {
                this.validateNodeRecursive(child, errors, warnings, visitedIds);
            }
        }
    }

    /**
     * Reset the node ID counter
     */
    resetIdCounter(): void {
        this.nodeIdCounter = 0;
    }
}
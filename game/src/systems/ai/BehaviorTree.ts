/**
 * BehaviorTree - AI decision making system using behavior trees
 *
 * This system provides:
 * - Hierarchical behavior tree structure for AI decision making
 * - Modular behavior nodes for different AI actions
 * - Dynamic tree construction and execution
 * - Conditional logic and priority-based decision making
 * - Integration with existing AI systems
 */

import { Unit, Position, MapData } from '../../types/gameplay';
import { AIAction, AIActionType, AIDecisionContext } from '../AIController';

/**
 * Result of behavior node execution
 */
export enum BehaviorResult {
    SUCCESS = 'success',
    FAILURE = 'failure',
    RUNNING = 'running',
}

/**
 * AI context for behavior tree execution
 */
export interface AIContext {
    currentUnit: Unit;
    allUnits: Unit[];
    mapData?: MapData;
    currentTurn: number;
    gamePhase: string;
    visibleEnemies: Unit[];
    visibleAllies: Unit[];
    npcs: Unit[];
    availableSkills: string[];
    terrainData?: any;
    difficultySettings?: any;

    // Execution state
    selectedAction?: AIAction;
    evaluatedTargets?: Array<{
        unit: Unit;
        priority: number;
        distance: number;
        isNPC: boolean;
        canAttack: boolean;
        canReach: boolean;
        reasoning: string;
    }>;

    // Temporary data for node communication
    tempData: Map<string, any>;
}

/**
 * Base interface for all behavior tree nodes
 */
export interface BehaviorNode {
    /** Unique identifier for this node */
    id: string;

    /** Human-readable name for debugging */
    name: string;

    /** Execute this node with the given context */
    execute(context: AIContext): BehaviorResult;

    /** Reset node state (for stateful nodes) */
    reset?(): void;

    /** Get debug information about this node */
    getDebugInfo?(): any;
}

/**
 * Composite node that can have child nodes
 */
export abstract class CompositeNode implements BehaviorNode {
    public id: string;
    public name: string;
    protected children: BehaviorNode[] = [];

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    /**
     * Add a child node
     */
    addChild(child: BehaviorNode): void {
        this.children.push(child);
    }

    /**
     * Remove a child node
     */
    removeChild(childId: string): boolean {
        const index = this.children.findIndex(child => child.id === childId);
        if (index !== -1) {
            this.children.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get all child nodes
     */
    getChildren(): BehaviorNode[] {
        return [...this.children];
    }

    /**
     * Reset all child nodes
     */
    reset(): void {
        this.children.forEach(child => child.reset?.());
    }

    abstract execute(context: AIContext): BehaviorResult;

    getDebugInfo(): any {
        return {
            id: this.id,
            name: this.name,
            type: this.constructor.name,
            children: this.children.map(child => child.getDebugInfo?.() || { id: child.id, name: child.name }),
        };
    }
}

/**
 * Selector node - executes children until one succeeds
 */
export class SelectorNode extends CompositeNode {
    private currentChildIndex: number = 0;

    constructor(id: string, name: string = 'Selector') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        for (let i = this.currentChildIndex; i < this.children.length; i++) {
            const result = this.children[i].execute(context);

            if (result === BehaviorResult.SUCCESS) {
                this.currentChildIndex = 0; // Reset for next execution
                return BehaviorResult.SUCCESS;
            } else if (result === BehaviorResult.RUNNING) {
                this.currentChildIndex = i; // Remember where we left off
                return BehaviorResult.RUNNING;
            }
            // Continue to next child if FAILURE
        }

        this.currentChildIndex = 0; // Reset for next execution
        return BehaviorResult.FAILURE;
    }

    reset(): void {
        super.reset();
        this.currentChildIndex = 0;
    }
}

/**
 * Sequence node - executes children until one fails
 */
export class SequenceNode extends CompositeNode {
    private currentChildIndex: number = 0;

    constructor(id: string, name: string = 'Sequence') {
        super(id, name);
    }

    execute(context: AIContext): BehaviorResult {
        for (let i = this.currentChildIndex; i < this.children.length; i++) {
            const result = this.children[i].execute(context);

            if (result === BehaviorResult.FAILURE) {
                this.currentChildIndex = 0; // Reset for next execution
                return BehaviorResult.FAILURE;
            } else if (result === BehaviorResult.RUNNING) {
                this.currentChildIndex = i; // Remember where we left off
                return BehaviorResult.RUNNING;
            }
            // Continue to next child if SUCCESS
        }

        this.currentChildIndex = 0; // Reset for next execution
        return BehaviorResult.SUCCESS;
    }

    reset(): void {
        super.reset();
        this.currentChildIndex = 0;
    }
}

/**
 * Parallel node - executes all children simultaneously
 */
export class ParallelNode extends CompositeNode {
    private successThreshold: number;
    private failureThreshold: number;

    constructor(
        id: string,
        name: string = 'Parallel',
        successThreshold: number = 1,
        failureThreshold: number = 1
    ) {
        super(id, name);
        this.successThreshold = successThreshold;
        this.failureThreshold = failureThreshold;
    }

    execute(context: AIContext): BehaviorResult {
        let successCount = 0;
        let failureCount = 0;
        let runningCount = 0;

        for (const child of this.children) {
            const result = child.execute(context);

            switch (result) {
                case BehaviorResult.SUCCESS:
                    successCount++;
                    break;
                case BehaviorResult.FAILURE:
                    failureCount++;
                    break;
                case BehaviorResult.RUNNING:
                    runningCount++;
                    break;
            }
        }

        if (successCount >= this.successThreshold) {
            return BehaviorResult.SUCCESS;
        } else if (failureCount >= this.failureThreshold) {
            return BehaviorResult.FAILURE;
        } else {
            return BehaviorResult.RUNNING;
        }
    }
}

/**
 * Decorator node that modifies child behavior
 */
export abstract class DecoratorNode implements BehaviorNode {
    public id: string;
    public name: string;
    protected child: BehaviorNode;

    constructor(id: string, name: string, child: BehaviorNode) {
        this.id = id;
        this.name = name;
        this.child = child;
    }

    abstract execute(context: AIContext): BehaviorResult;

    reset(): void {
        this.child.reset?.();
    }

    getDebugInfo(): any {
        return {
            id: this.id,
            name: this.name,
            type: this.constructor.name,
            child: this.child.getDebugInfo?.() || { id: this.child.id, name: this.child.name },
        };
    }
}

/**
 * Inverter decorator - inverts SUCCESS/FAILURE results
 */
export class InverterNode extends DecoratorNode {
    constructor(id: string, child: BehaviorNode, name: string = 'Inverter') {
        super(id, name, child);
    }

    execute(context: AIContext): BehaviorResult {
        const result = this.child.execute(context);

        switch (result) {
            case BehaviorResult.SUCCESS:
                return BehaviorResult.FAILURE;
            case BehaviorResult.FAILURE:
                return BehaviorResult.SUCCESS;
            case BehaviorResult.RUNNING:
                return BehaviorResult.RUNNING;
        }
    }
}

/**
 * Repeater decorator - repeats child execution
 */
export class RepeaterNode extends DecoratorNode {
    private maxRepeats: number;
    private currentRepeats: number = 0;

    constructor(id: string, child: BehaviorNode, maxRepeats: number = -1, name: string = 'Repeater') {
        super(id, name, child);
        this.maxRepeats = maxRepeats;
    }

    execute(context: AIContext): BehaviorResult {
        while (this.maxRepeats === -1 || this.currentRepeats < this.maxRepeats) {
            const result = this.child.execute(context);

            if (result === BehaviorResult.RUNNING) {
                return BehaviorResult.RUNNING;
            }

            this.currentRepeats++;

            if (result === BehaviorResult.FAILURE) {
                this.currentRepeats = 0;
                return BehaviorResult.FAILURE;
            }

            if (this.maxRepeats !== -1 && this.currentRepeats >= this.maxRepeats) {
                this.currentRepeats = 0;
                return BehaviorResult.SUCCESS;
            }
        }

        this.currentRepeats = 0;
        return BehaviorResult.SUCCESS;
    }

    reset(): void {
        super.reset();
        this.currentRepeats = 0;
    }
}

/**
 * Main behavior tree class
 */
export class BehaviorTree {
    private rootNode: BehaviorNode | null = null;
    private context: AIContext | null = null;
    private isRunning: boolean = false;
    private executionHistory: Array<{
        nodeId: string;
        nodeName: string;
        result: BehaviorResult;
        timestamp: number;
    }> = [];

    // Configuration
    private maxExecutionTime: number = 2000; // 2 seconds
    private enableLogging: boolean = false;

    constructor(rootNode?: BehaviorNode) {
        if (rootNode) {
            this.rootNode = rootNode;
        }
    }

    /**
     * Set the root node of the behavior tree
     */
    setRootNode(node: BehaviorNode): void {
        this.rootNode = node;
    }

    /**
     * Get the root node
     */
    getRootNode(): BehaviorNode | null {
        return this.rootNode;
    }

    /**
     * Execute the behavior tree with the given context
     */
    execute(context: AIContext): AIAction {
        if (!this.rootNode) {
            throw new Error('Behavior tree has no root node');
        }

        this.context = context;
        this.isRunning = true;

        const startTime = performance.now();

        try {
            this.log(`Executing behavior tree for ${context.currentUnit.name}`);

            // Reset the tree before execution
            this.reset();

            // Execute the root node
            const result = this.executeWithTimeout(this.rootNode, context);

            const executionTime = performance.now() - startTime;
            this.log(`Behavior tree execution completed in ${executionTime.toFixed(2)}ms with result: ${result}`);

            // Return the selected action or a default action
            if (context.selectedAction) {
                return context.selectedAction;
            } else {
                // Fallback action if no action was selected
                return {
                    type: AIActionType.WAIT,
                    priority: 0,
                    reasoning: 'Behavior tree completed but no action was selected',
                };
            }
        } catch (error) {
            this.log(`Error executing behavior tree: ${error.message}`);

            // Return safe fallback action
            return {
                type: AIActionType.WAIT,
                priority: 0,
                reasoning: `Behavior tree error: ${error.message}`,
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Execute a node with timeout protection
     */
    private executeWithTimeout(node: BehaviorNode, context: AIContext): BehaviorResult {
        const startTime = performance.now();

        const result = node.execute(context);

        const executionTime = performance.now() - startTime;

        // Record execution history
        this.executionHistory.push({
            nodeId: node.id,
            nodeName: node.name,
            result: result,
            timestamp: Date.now(),
        });

        // Keep only last 100 executions
        if (this.executionHistory.length > 100) {
            this.executionHistory.shift();
        }

        this.log(`Node ${node.name} executed in ${executionTime.toFixed(2)}ms with result: ${result}`);

        // Check for timeout
        if (executionTime > this.maxExecutionTime) {
            this.log(`Warning: Node ${node.name} exceeded maximum execution time`);
        }

        return result;
    }

    /**
     * Reset the behavior tree
     */
    reset(): void {
        if (this.rootNode) {
            this.rootNode.reset?.();
        }
    }

    /**
     * Add a node to the tree (for dynamic construction)
     */
    addNode(parentId: string, node: BehaviorNode): boolean {
        if (!this.rootNode) {
            return false;
        }

        const parent = this.findNode(this.rootNode, parentId);
        if (parent && parent instanceof CompositeNode) {
            parent.addChild(node);
            return true;
        }

        return false;
    }

    /**
     * Remove a node from the tree
     */
    removeNode(nodeId: string): boolean {
        if (!this.rootNode) {
            return false;
        }

        return this.removeNodeRecursive(this.rootNode, nodeId);
    }

    /**
     * Find a node by ID
     */
    private findNode(node: BehaviorNode, nodeId: string): BehaviorNode | null {
        if (node.id === nodeId) {
            return node;
        }

        if (node instanceof CompositeNode) {
            for (const child of node.getChildren()) {
                const found = this.findNode(child, nodeId);
                if (found) {
                    return found;
                }
            }
        } else if (node instanceof DecoratorNode) {
            return this.findNode((node as any).child, nodeId);
        }

        return null;
    }

    /**
     * Remove a node recursively
     */
    private removeNodeRecursive(node: BehaviorNode, nodeId: string): boolean {
        if (node instanceof CompositeNode) {
            if (node.removeChild(nodeId)) {
                return true;
            }

            for (const child of node.getChildren()) {
                if (this.removeNodeRecursive(child, nodeId)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get execution history
     */
    getExecutionHistory(): Array<{
        nodeId: string;
        nodeName: string;
        result: BehaviorResult;
        timestamp: number;
    }> {
        return [...this.executionHistory];
    }

    /**
     * Get debug information about the tree structure
     */
    getDebugInfo(): any {
        if (!this.rootNode) {
            return { error: 'No root node' };
        }

        return {
            rootNode: this.rootNode.getDebugInfo?.() || { id: this.rootNode.id, name: this.rootNode.name },
            isRunning: this.isRunning,
            executionHistory: this.executionHistory.slice(-10), // Last 10 executions
        };
    }

    /**
     * Enable or disable logging
     */
    setLogging(enabled: boolean): void {
        this.enableLogging = enabled;
    }

    /**
     * Set maximum execution time
     */
    setMaxExecutionTime(timeMs: number): void {
        this.maxExecutionTime = timeMs;
    }

    /**
     * Log message if logging is enabled
     */
    private log(message: string): void {
        if (this.enableLogging) {
            console.log(`[BehaviorTree] ${message}`);
        }
    }

    /**
     * Destroy the behavior tree
     */
    destroy(): void {
        this.reset();
        this.rootNode = null;
        this.context = null;
        this.executionHistory = [];
        this.isRunning = false;
    }
}
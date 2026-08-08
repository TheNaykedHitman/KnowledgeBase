/**
 * @file orchestrator.ts
 * @description Shared Master Orchestrator control loop: read historical logs,
 * fan work batches out across isolated multiplexer panes, then supervise them.
 * Concrete orchestrators supply their own agent identity, gateway, and the
 * shell command used to boot a worker.
 */

import { GatewayProxy } from './gateway';
import { AgentConfig, AgentLogEntry, MultiplexerTab } from './types';

export function createTabId(): string {
    return `tab_${Math.random().toString(36).slice(2, 11)}`;
}

export abstract class BaseOrchestrator {
    protected readonly config: AgentConfig;
    protected readonly gateway: GatewayProxy;
    protected readonly activePanes: Map<string, MultiplexerTab> = new Map();
    /** Prefix used in multiplexer log lines, e.g. "Unterm MCP". */
    protected readonly multiplexerLabel: string;

    protected constructor(config: AgentConfig, gateway: GatewayProxy, multiplexerLabel: string = 'Multiplexer MCP') {
        this.config = config;
        this.gateway = gateway;
        this.multiplexerLabel = multiplexerLabel;
    }

    /** Label given to the worker occupying the pane for batch `index` (zero-based). */
    protected abstract workerLabel(index: number): string;

    /** Non-interactive CLI instantiation string that boots the worker for `batch`. */
    protected abstract workerCommand(batch: unknown, index: number): string;

    /**
     * Entry point for decomposing a macro-objective into parallel execution blocks.
     */
    public async orchestrateWorkflow(batches: unknown[]): Promise<void> {
        console.log(`[${this.config.id}] Evaluating existing system state and historical execution logs...`);
        await this.fetchGlobalLogs();

        // Dynamically scale worker nodes across terminal tabs based on workload chunks
        batches.forEach((batch, index) => {
            this.spawnPane(this.workerLabel(index), this.workerCommand(batch, index));
        });

        this.superviseActiveSwarm();
    }

    /**
     * Communicates with the multiplexer MCP server to provision environment space.
     */
    protected spawnPane(label: string, command: string): MultiplexerTab {
        const tab: MultiplexerTab = { tabId: createTabId(), label, isActive: true, currentCommand: command };
        this.activePanes.set(tab.tabId, tab);

        // Triggers server-side terminal workspace allocation: e.g., multiplexer.spawn_tab()
        console.log(`[${this.multiplexerLabel}] Allocating isolated pane [${label}] -> executing: "${command}"`);
        return tab;
    }

    /**
     * Reads screen state and scrollbacks via MCP to verify progress without direct code polling.
     */
    protected superviseActiveSwarm(): void {
        console.log(`[${this.config.id}] Supervising ${this.activePanes.size} pipelines via multiplexer scrollback analysis.`);
    }

    /**
     * Pulls prior execution context (past faults, workarounds) from the shared datastore.
     */
    protected async fetchGlobalLogs(): Promise<AgentLogEntry[]> {
        return [];
    }
}

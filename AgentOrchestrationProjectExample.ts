/**
 * @file AgentOrchestrationProjectExample.ts
 * @description Master architecture blueprint for the MKUltra Agent Swarm: a concrete
 * instantiation of the shared orchestration core (Bifrost gateway + Unterm multiplexer).
 * Future agents should read this file to understand the system layout and hierarchy.
 */

import { GatewayProxy, GatewayToolInventory } from './core/gateway';
import { BaseOrchestrator } from './core/orchestrator';
import { AgentConfig, DEFAULT_GATEWAY_ENDPOINT } from './core/types';
import { randomUUID } from 'node:crypto';

// ============================================================================
// 1. SYSTEM ENTITIES & INTERFACES
// ============================================================================

export * from './core/types';

const BIFROST_TOOLS: GatewayToolInventory = {
    core: ['sqlite_index_db', 'plugged_in_vector_memory'],
    // Only the Brain can control terminal tabs
    orchestratorOnly: ['unterm_multiplexer_control']
};
export interface AgentConfig {
    id: string;
    role: AgentRole;
    modelPreset: ModelTier;
    gatewayRoute: string; // e.g., "http://127.0.0.1:8080/v1" via Bifrost OpenAI-override
}

export interface CompletionPayload {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: string[];
}

export interface UntermTab {
    tabId: string;
    label: string; // e.g., "OCR-Worker-1", "Archive-Scraper"
    isActive: boolean;
    currentCommand: string[]; // argv form, never a shell string
}

export interface AgentLogEntry {
    timestamp: string;
    agentId: string;
    taskDescription: string;
    status: TaskStatus;
    notes: string; // Used to document quirky code failures, ETAs, and breaking changes
}

export interface RoutedCompletion {
    agentId: string;
    tools: string[];
    response: unknown;
}

export interface PipelineResult {
    spawnedTabs: UntermTab[];
    priorLogCount: number;
}

// ============================================================================
// 2. ERROR TAXONOMY
// ============================================================================

/**
 * Base error for the swarm. Each layer wraps the underlying failure in `cause`
 * so the orchestrator can report the whole chain instead of a generic message.
 */
export class SwarmError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = new.target.name;
    }
}

export class GatewayError extends SwarmError {}
export class SpawnError extends SwarmError {}
export class SharedMemoryError extends SwarmError {}
export class MonitoringError extends SwarmError {}

// ============================================================================
// 3. CENTRALIZED GATEWAY & TOOL ARCHITECTURE (BIFROST)
// ============================================================================

const GATEWAY_ROUTE = process.env.AGENT_GATEWAY_ENDPOINT ?? "http://127.0.0.1:8080/v1";

export class BifrostGateway {
    private localEndpoint: string = GATEWAY_ROUTE;

    /**
     * Intercepts standard OpenAI /chat/completions payloads from Cursor,
     * attaches context-specific MCP tools, and proxies them to the correct target LLM.
     *
     * Rejects with a GatewayError when routing fails so callers cannot mistake a
     * logged failure for a completed request.
     */
    public async routeRequest(payload: unknown, agent: AgentConfig): Promise<RoutedCompletion> {
        if (agent.gatewayRoute !== this.localEndpoint) {
            throw new GatewayError(
                `Agent ${agent.id} routes to ${agent.gatewayRoute} but this gateway serves ${this.localEndpoint}.`
            );
        }

        const tools = this.injectMcpToolsForRole(agent.role);

        try {
            // Bifrost server-side handles translation (e.g., translating OpenAI format to Claude format)
            const response = await this.sendToTargetLlm(payload, agent, tools);
            console.log(`[Bifrost] Injecting ${tools.length} tools for ${agent.id} -> Fetching LLM Response.`);
            return { agentId: agent.id, tools, response };
        } catch (error) {
            throw new GatewayError(`Bifrost routing failed for ${agent.id}.`, { cause: error });
        }
    }

    /**
     * Transport seam for the concrete Bifrost client. Implementations must
     * reject on upstream failures rather than resolving with an empty response.
     */
    protected async sendToTargetLlm(payload: unknown, agent: AgentConfig, tools: string[]): Promise<unknown> {
        void payload;
        void tools;
        throw new GatewayError(`No Bifrost transport is configured for ${agent.id}.`);
    public async routeRequest(payload: CompletionPayload, agent: AgentConfig): Promise<void> {
        const apiKey = process.env.AGENT_GATEWAY_API_KEY;
        if (!apiKey) {
            throw new Error("AGENT_GATEWAY_API_KEY is not set; refusing to call the gateway unauthenticated.");
        }
        const tools = this.injectMcpToolsForRole(agent.role);
        // Bifrost server-side handles translation (e.g., translating OpenAI format to Claude format)
        console.log(`[Bifrost] Injecting ${tools.length} tools for ${agent.id} -> Fetching LLM Response from ${this.localEndpoint}.`);
    }

/**
 * Intercepts standard OpenAI /chat/completions payloads from Cursor, attaches
 * context-specific MCP tools, and proxies them to the correct target LLM.
 */
export class BifrostGateway extends GatewayProxy {
    constructor(endpoint: string = DEFAULT_GATEWAY_ENDPOINT) {
        super(BIFROST_TOOLS, 'Bifrost', endpoint);
    }
}

export class SuperBrainBrian extends BaseOrchestrator {
    constructor(id: string = 'Super-Brain-Brian') {
        const config: AgentConfig = {
            id,
            role: 'MasterOrchestrator',
            modelTier: 'HighReasoning',
            gatewayEndpoint: DEFAULT_GATEWAY_ENDPOINT
        };
        super(config, new BifrostGateway(config.gatewayEndpoint), 'Unterm MCP');
    }

    /**
     * Fans PDF chunks out across headless Cursor CLI agents, one per Unterm pane.
     * Historical SQLite logs are consulted first; scrollbacks are supervised after.
     */
    public async executeProjectPipeline(pdfChunks: string[][]): Promise<void> {
        return this.orchestrateWorkflow(pdfChunks);
    }

    protected workerLabel(index: number): string {
        return `OCR-Worker-${index + 1}`;
    }

    protected workerCommand(_chunk: unknown, index: number): string {
        return `cursor-cli --agent "Process batch ${index + 1} using Kimi Vision OCR via /model Auto"`;
    }
}
// ============================================================================
// 4. ORCHESTRATION LAYER (SUPER-BRAIN-BRIAN EXECUTION LOOP)
// ============================================================================

export class SuperBrainBrian {
    private config: AgentConfig = {
        id: "Super-Brain-Brian",
        role: "MasterOrchestrator",
        modelPreset: "HighReasoning",
        gatewayRoute: GATEWAY_ROUTE
    };

    private activeSwarmTabs: Map<string, UntermTab> = new Map();
    private gateway: BifrostGateway = new BifrostGateway();

    /**
     * High-level workflow orchestration logic.
     *
     * Per-chunk spawn failures are collected instead of aborting the batch, and
     * re-thrown as an AggregateError so no failure is lost.
     */
    public async executeProjectPipeline(pdfChunks: string[][]): Promise<PipelineResult> {
        console.log(`[${this.config.id}] Starting orchestration loop...`);

        // Step 1: Query shared SQLite logs to see past context/failures before running tasks
        const pastLogs = await this.querySharedMemory();
        console.log(`[${this.config.id}] Loaded ${pastLogs.length} prior log entries before delegating.`);

        // Step 2: Delegate high-volume, parallel tasks via Unterm terminal multiplexing
        const spawnedTabs: UntermTab[] = [];
        const failures: SpawnError[] = [];

        pdfChunks.forEach((chunk, index) => {
            void chunk;
            const workerLabel = `OCR-Worker-${index + 1}`;

            // Generate the shell command to boot the headless background Cursor CLI agent
            const command = `cursor-cli --agent "Process batch ${index + 1} using Kimi Vision OCR via /model Auto"`;

            try {
                spawnedTabs.push(this.spawnSubAgent(workerLabel, command));
            } catch (error) {
                failures.push(new SpawnError(`Failed to spawn ${workerLabel} for chunk ${index + 1}.`, { cause: error }));
            }
            
            // argv form keeps chunk-derived values out of shell interpretation
            const command = [
                "cursor-cli",
                "--agent",
                `Process batch ${index + 1} using Kimi Vision OCR via /model Auto`
            ];
            
            this.spawnSubAgent(workerLabel, command);
        });

        // Step 3: Enter supervision loop (Reading scrollbacks via Unterm MCP)
        try {
            if (this.activeSwarmTabs.size > 0) {
                this.monitorSwarmProgress();
            }
        } catch (error) {
            const monitoringFailure = new MonitoringError(
                `Monitoring loop failed after spawning ${spawnedTabs.length} tabs.`,
                { cause: error }
            );
            if (failures.length === 0) {
                throw monitoringFailure;
            }
            throw new AggregateError([...failures, monitoringFailure], `Spawn and monitoring failures in ${this.config.id}.`);
        }

        if (failures.length > 0) {
            throw new AggregateError(
                failures,
                `${failures.length} of ${pdfChunks.length} chunks could not be delegated.`
            );
        }

        return { spawnedTabs, priorLogCount: pastLogs.length };
    }

    /**
     * Allocates a pane through the Unterm MCP tool.
     * Throws a SpawnError instead of leaving the swarm map in a partial state.
     */
    private spawnSubAgent(label: string, command: string): UntermTab {
        if (label.trim().length === 0 || command.trim().length === 0) {
            throw new SpawnError("A sub-agent requires a non-empty label and command.");
        }

        const tabId = `tab_${Math.random().toString(36).slice(2, 11)}`;
        if (this.activeSwarmTabs.has(tabId)) {
            throw new SpawnError(`Tab identifier collision for ${tabId}; refusing to overwrite an active tab.`);
        }

    private spawnSubAgent(label: string, command: string[]): void {
        const tabId = `tab_${randomUUID()}`;
        
        const newTab: UntermTab = { tabId, label, isActive: true, currentCommand: command };
        this.activeSwarmTabs.set(tabId, newTab);

        // Execute command via Unterm MCP tool: unterm.spawn_tab()
        console.log(`[Unterm MCP] Spawning new pane [${label}] executing: "${command}"`);
        return newTab;
        console.log(`[Unterm MCP] Spawning new pane [${label}] executing: ${JSON.stringify(command)}`);
    }

    private monitorSwarmProgress(): void {
        // Master agent utilizes unterm.read_scrollback() or unterm.take_screenshot()
        // to maintain full optical/textual awareness of the other active terminals.
        if (this.activeSwarmTabs.size === 0) {
            throw new MonitoringError("No active tabs to monitor; the pipeline produced no workers.");
        }
        console.log(`[${this.config.id}] Monitoring background tabs via visual terminal state...`);
    }

    /**
     * Queries index.db -> agent_logs table to pull execution context.
     * An empty array means "no history"; a query failure surfaces as a SharedMemoryError.
     */
    private async querySharedMemory(): Promise<AgentLogEntry[]> {
        try {
            return await this.readAgentLogTable();
        } catch (error) {
            throw new SharedMemoryError(`Unable to read agent_logs for ${this.config.id}.`, { cause: error });
        }
    }

    /**
     * Storage seam for index.db. Implementations must reject on query failure
     * instead of returning an empty result set.
     */
    protected async readAgentLogTable(): Promise<AgentLogEntry[]> {
        return [];
    }
}


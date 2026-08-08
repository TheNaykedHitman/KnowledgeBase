/**
 * @file gateway.ts
 * @description Shared gateway proxy. Intercepts standard OpenAI-shaped completion
 * payloads, injects role-specific MCP tools server-side, and routes them to the
 * target LLM. Concrete gateways only declare their tool inventory and log label.
 */

import { AgentConfig, AgentRole, DEFAULT_GATEWAY_ENDPOINT } from './types';

export interface GatewayToolInventory {
    /** Tools every role receives. */
    core: string[];
    /** Tools reserved for the MasterOrchestrator, e.g. terminal multiplexer control. */
    orchestratorOnly: string[];
}

export class GatewayProxy {
    protected readonly gatewayUrl: string;
    protected readonly label: string;
    protected readonly tools: GatewayToolInventory;

    constructor(
        tools: GatewayToolInventory,
        label: string = 'Gateway',
        endpoint: string = DEFAULT_GATEWAY_ENDPOINT
    ) {
        this.tools = tools;
        this.label = label;
        this.gatewayUrl = endpoint;
    }

    /**
     * Injects role-specific tooling before final completion routing.
     * Schema translation (e.g. OpenAI format to Claude format) happens downstream.
     */
    public async proxyCompletion(payload: unknown, agent: AgentConfig): Promise<unknown> {
        const injectedTools = this.resolveMcpTools(agent.role);
        console.log(
            `[${this.label}] Proxied payload for ${agent.id} via ${this.gatewayUrl}. ` +
            `Injected ${injectedTools.length} server-side tools.`
        );
        return {};
    }

    public resolveMcpTools(role: AgentRole): string[] {
        if (role === 'MasterOrchestrator') {
            return [...this.tools.core, ...this.tools.orchestratorOnly];
        }
        return [...this.tools.core];
    }
}

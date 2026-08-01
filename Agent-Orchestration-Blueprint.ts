/**
 * @file Agent-Orchestration-Blueprint.ts
 * @description Universal architecture blueprint for multi-agent terminal-swarms.
 * Standard operating framework for Master Orchestrator -> Sub-Agent delegation.
 * Entities and the control loop live in core/; this file is the generic instantiation.
 */

import { GatewayProxy, GatewayToolInventory } from './core/gateway';
import { BaseOrchestrator } from './core/orchestrator';
import { AgentConfig, DEFAULT_GATEWAY_ENDPOINT } from './core/types';

export * from './core/types';
export { GatewayProxy, BaseOrchestrator };

const UNIVERSAL_TOOLS: GatewayToolInventory = {
    core: ['relational_datastore', 'vector_memory_provider'],
    // Terminal level multiplexer capabilities belong exclusively to the master orchestrator
    orchestratorOnly: ['terminal_multiplexer_control']
};

export class LocalGatewayProxy extends GatewayProxy {
    constructor(endpoint: string = DEFAULT_GATEWAY_ENDPOINT) {
        super(UNIVERSAL_TOOLS, 'Gateway', endpoint);
    }
}

export class UniversalMasterOrchestrator extends BaseOrchestrator {
    constructor(id: string = 'Master-Orchestrator-Brain') {
        const config: AgentConfig = {
            id,
            role: 'MasterOrchestrator',
            modelTier: 'HighReasoning',
            gatewayEndpoint: DEFAULT_GATEWAY_ENDPOINT
        };
        super(config, new LocalGatewayProxy(config.gatewayEndpoint), 'Multiplexer MCP');
    }

    protected workerLabel(index: number): string {
        return `Worker-Node-${index + 1}`;
    }

    protected workerCommand(_batch: unknown, index: number): string {
        return `cli-agent-command --run "Process batch index ${index} using /model Auto configuration"`;
    }
}

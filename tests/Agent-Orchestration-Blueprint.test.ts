import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    LocalGatewayProxy,
    UniversalMasterOrchestrator,
    type AgentConfig,
    type MultiplexerTab
} from '../Agent-Orchestration-Blueprint';

const workerConfig: AgentConfig = {
    id: 'Worker-1',
    role: 'WorkerAgent',
    modelTier: 'CostOptimizedAuto',
    gatewayEndpoint: 'http://localhost:8080/v1'
};

const masterConfig: AgentConfig = {
    id: 'Master-1',
    role: 'MasterOrchestrator',
    modelTier: 'HighReasoning',
    gatewayEndpoint: 'http://localhost:8080/v1'
};

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('LocalGatewayProxy', () => {
    it('defaults to the local gateway endpoint', () => {
        const proxy = new LocalGatewayProxy();
        expect(Reflect.get(proxy, 'gatewayUrl')).toBe('http://localhost:8080/v1');
    });

    it('uses an explicitly provided endpoint', () => {
        const proxy = new LocalGatewayProxy('https://gateway.example.com/v1');
        expect(Reflect.get(proxy, 'gatewayUrl')).toBe('https://gateway.example.com/v1');
    });

    it('resolves core tools only for worker agents', () => {
        const proxy = new LocalGatewayProxy();
        expect(proxy.resolveMcpTools('WorkerAgent')).toEqual([
            'relational_datastore',
            'vector_memory_provider'
        ]);
    });

    it('adds multiplexer control for the master orchestrator', () => {
        const proxy = new LocalGatewayProxy();
        expect(proxy.resolveMcpTools('MasterOrchestrator')).toEqual([
            'relational_datastore',
            'vector_memory_provider',
            'terminal_multiplexer_control'
        ]);
    });

    it('proxies a completion and logs the injected tool count per role', async () => {
        const proxy = new LocalGatewayProxy();

        await expect(proxy.proxyCompletion({ messages: [] }, workerConfig)).resolves.toEqual({});
        expect(logSpy).toHaveBeenCalledWith(
            '[Gateway] Proxied payload for Worker-1 via http://localhost:8080/v1. Injected 2 server-side tools.'
        );

        await proxy.proxyCompletion({ messages: [] }, masterConfig);
        expect(logSpy).toHaveBeenCalledWith(
            '[Gateway] Proxied payload for Master-1 via http://localhost:8080/v1. Injected 3 server-side tools.'
        );
    });
});

describe('UniversalMasterOrchestrator', () => {
    const panes = (orchestrator: UniversalMasterOrchestrator) =>
        Reflect.get(orchestrator, 'activePanes') as Map<string, MultiplexerTab>;

    it('builds a master orchestrator config with the default id', () => {
        const config = Reflect.get(new UniversalMasterOrchestrator(), 'config') as AgentConfig;
        expect(config).toEqual({
            id: 'Master-Orchestrator-Brain',
            role: 'MasterOrchestrator',
            modelTier: 'HighReasoning',
            gatewayEndpoint: 'http://localhost:8080/v1'
        });
    });

    it('honours a custom id', () => {
        const config = Reflect.get(new UniversalMasterOrchestrator('Custom'), 'config') as AgentConfig;
        expect(config.id).toBe('Custom');
    });

    it('allocates one pane per data batch', async () => {
        const orchestrator = new UniversalMasterOrchestrator();
        await orchestrator.orchestrateWorkflow([{ a: 1 }, { b: 2 }, { c: 3 }]);

        const tabs = [...panes(orchestrator).values()];
        expect(tabs).toHaveLength(3);
        expect(tabs.map((tab) => tab.label)).toEqual([
            'Worker-Node-1',
            'Worker-Node-2',
            'Worker-Node-3'
        ]);
        expect(tabs.every((tab) => tab.isActive)).toBe(true);
        expect(tabs[0].currentCommand).toBe(
            'cli-agent-command --run "Process batch index 0 using /model Auto configuration"'
        );
    });

    it('keys each pane by its own generated tab id', async () => {
        const orchestrator = new UniversalMasterOrchestrator();
        await orchestrator.orchestrateWorkflow([{}, {}]);

        for (const [tabId, tab] of panes(orchestrator)) {
            expect(tabId).toBe(tab.tabId);
            expect(tabId).toMatch(/^tab_[0-9a-z]+$/);
        }
    });

    it('allocates no panes for an empty batch list but still supervises', async () => {
        const orchestrator = new UniversalMasterOrchestrator();
        await orchestrator.orchestrateWorkflow([]);

        expect(panes(orchestrator).size).toBe(0);
        expect(logSpy).toHaveBeenCalledWith(
            '[Master-Orchestrator-Brain] Supervising 0 pipelines via multiplexer scrollback analysis.'
        );
    });

    it('starts with no historical logs', async () => {
        const orchestrator = new UniversalMasterOrchestrator();
        await expect(Reflect.get(orchestrator, 'fetchGlobalLogs').call(orchestrator)).resolves.toEqual([]);
    });
});

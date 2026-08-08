import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    DelegationError,
    GatewayError,
    LocalGatewayProxy,
    MemoryError,
    SupervisionError,
    UniversalMasterOrchestrator,
    type AgentConfig,
    type GlobalAgentLog,
    type MultiplexerTab
} from '../Agent-Orchestration-Blueprint';

const workerConfig: AgentConfig = {
    id: 'Worker-1',
    role: 'WorkerAgent',
    modelTier: 'CostOptimizedAuto',
    gatewayEndpoint: 'http://127.0.0.1:8080/v1'
};

const masterConfig: AgentConfig = {
    id: 'Master-1',
    role: 'MasterOrchestrator',
    modelTier: 'HighReasoning',
    gatewayEndpoint: 'http://127.0.0.1:8080/v1'
};

const payload = { model: 'test-model', messages: [] };

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubEnv('AGENT_GATEWAY_API_KEY', 'test-key');
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
});

describe('LocalGatewayProxy', () => {
    it('defaults to the local gateway endpoint', () => {
        const proxy = new LocalGatewayProxy();
        expect(Reflect.get(proxy, 'gatewayUrl')).toBe('http://127.0.0.1:8080/v1');
    });

    it('rejects a remote endpoint that is not using TLS', () => {
        expect(() => new LocalGatewayProxy('http://gateway.example.com/v1')).toThrow(/must use https/);
    });

    it('uses an explicitly provided endpoint', () => {
        const proxy = new LocalGatewayProxy('https://gateway.example.com/v1');
        expect(Reflect.get(proxy, 'gatewayUrl')).toBe('https://gateway.example.com/v1');
    });

    it('resolves core tools only for worker agents', () => {
        const proxy = new LocalGatewayProxy();
        const tools = Reflect.get(proxy, 'resolveMcpTools').call(proxy, 'WorkerAgent');
        expect(tools).toEqual(['relational_datastore', 'vector_memory_provider']);
    });

    it('adds multiplexer control for the master orchestrator', () => {
        const proxy = new LocalGatewayProxy();
        const tools = Reflect.get(proxy, 'resolveMcpTools').call(proxy, 'MasterOrchestrator');
        expect(tools).toEqual([
            'relational_datastore',
            'vector_memory_provider',
            'terminal_multiplexer_control'
        ]);
    });

    it('rejects an endpoint mismatch instead of proxying', async () => {
        const proxy = new LocalGatewayProxy('https://gateway.example.com/v1');
        await expect(proxy.proxyCompletion({ messages: [] }, workerConfig)).rejects.toBeInstanceOf(GatewayError);
    });

    it('rejects with a GatewayError when no upstream transport is wired up', async () => {
        const proxy = new LocalGatewayProxy();
        await expect(proxy.proxyCompletion({ messages: [] }, workerConfig)).rejects.toBeInstanceOf(GatewayError);
    });

    it('wraps an upstream failure and keeps the original cause', async () => {
        const upstream = new Error('socket hang up');
        class FailingProxy extends LocalGatewayProxy {
            protected override async forwardToUpstream(): Promise<unknown> {
                throw upstream;
            }
        }

        await expect(new FailingProxy().proxyCompletion({}, workerConfig)).rejects.toMatchObject({
            name: 'GatewayError',
            cause: upstream
        });
    });

    it('returns the completion and logs the injected tool count per role', async () => {
        class WiredProxy extends LocalGatewayProxy {
            protected override async forwardToUpstream(): Promise<unknown> {
                return { ok: true };
            }
        }
        const proxy = new WiredProxy();

        await expect(proxy.proxyCompletion({ messages: [] }, workerConfig)).resolves.toEqual({
            agentId: 'Worker-1',
            injectedTools: ['relational_datastore', 'vector_memory_provider'],
            response: { ok: true }
        });
        await expect(proxy.proxyCompletion(payload, workerConfig)).resolves.toEqual({});
        expect(logSpy).toHaveBeenCalledWith(
            '[Gateway] Proxied payload for Worker-1 to http://127.0.0.1:8080/v1. Injected 2 server-side tools with 1 auth header(s).'
        );

        await proxy.proxyCompletion(payload, masterConfig);
        expect(logSpy).toHaveBeenCalledWith(
            '[Gateway] Proxied payload for Master-1 to http://127.0.0.1:8080/v1. Injected 3 server-side tools with 1 auth header(s).'
        );
    });

    it('refuses to proxy without a gateway api key', async () => {
        vi.stubEnv('AGENT_GATEWAY_API_KEY', '');
        const proxy = new LocalGatewayProxy();

        await expect(proxy.proxyCompletion(payload, workerConfig)).rejects.toThrow(
            /AGENT_GATEWAY_API_KEY is not set/
        );
    });

    it('keeps payload contents out of the logs', async () => {
        const proxy = new LocalGatewayProxy();
        await proxy.proxyCompletion(
            { model: 'test-model', messages: [{ role: 'user', content: 'sensitive-user-content' }] },
            workerConfig
        );

        expect(logSpy.mock.calls.flat().join(' ')).not.toContain('sensitive-user-content');
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
            gatewayEndpoint: 'http://127.0.0.1:8080/v1'
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
        expect(tabs[0].currentCommand).toEqual([
            'cli-agent-command',
            '--run',
            'Process batch index 0 using /model Auto configuration'
        ]);
    });

    it('keys each pane by its own generated tab id', async () => {
        const orchestrator = new UniversalMasterOrchestrator();
        await orchestrator.orchestrateWorkflow([{}, {}]);

        for (const [tabId, tab] of panes(orchestrator)) {
            expect(tabId).toBe(tab.tabId);
            expect(tabId).toMatch(/^tab_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        }
    });

    it('allocates no panes for an empty batch list and skips supervision', async () => {
        const orchestrator = new UniversalMasterOrchestrator();
        await expect(orchestrator.orchestrateWorkflow([])).resolves.toEqual({
            delegatedPanes: [],
            historicalLogCount: 0
        });

        expect(panes(orchestrator).size).toBe(0);
        expect(logSpy).not.toHaveBeenCalledWith(
            '[Master-Orchestrator-Brain] Supervising active pipelines via terminal multiplexer scrollback analysis.'
        );
    });

    it('rejects a pane without a label or command', () => {
        const orchestrator = new UniversalMasterOrchestrator();
        const delegate = Reflect.get(orchestrator, 'delegateToMultiplexer') as (label: string, command: string) => MultiplexerTab;
        expect(() => delegate.call(orchestrator, '  ', 'run')).toThrow(DelegationError);
    });

    it('refuses to supervise when no panes are allocated', () => {
        const orchestrator = new UniversalMasterOrchestrator();
        const supervise = Reflect.get(orchestrator, 'superviseActiveSwarm') as () => void;
        expect(() => supervise.call(orchestrator)).toThrow(SupervisionError);
    });

    it('starts with no historical logs', async () => {
        const orchestrator = new UniversalMasterOrchestrator();
        await expect(Reflect.get(orchestrator, 'fetchGlobalLogs').call(orchestrator)).resolves.toEqual([]);
    });

    it('surfaces a log store failure as a MemoryError instead of an empty history', async () => {
        const dbFailure = new Error('index.db is locked');
        class BrokenMemoryOrchestrator extends UniversalMasterOrchestrator {
            protected override async readLogStore(): Promise<GlobalAgentLog[]> {
                throw dbFailure;
            }
        }

        const orchestrator = new BrokenMemoryOrchestrator();
        await expect(orchestrator.orchestrateWorkflow([{}])).rejects.toMatchObject({
            name: 'MemoryError',
            cause: dbFailure
        });
        expect(panes(orchestrator).size).toBe(0);
    });

    it('exposes MemoryError as part of the error taxonomy', () => {
        expect(new MemoryError('boom')).toBeInstanceOf(Error);
    });
});

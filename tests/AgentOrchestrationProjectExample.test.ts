import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    BifrostGateway,
    SuperBrainBrian,
    type AgentConfig,
    type MultiplexerTab
} from '../AgentOrchestrationProjectExample';

const workerConfig: AgentConfig = {
    id: 'OCR-Worker-1',
    role: 'WorkerAgent',
    modelTier: 'CostOptimizedAuto',
    gatewayEndpoint: 'http://localhost:8080/v1'
};

const masterConfig: AgentConfig = {
    id: 'Super-Brain-Brian',
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

describe('BifrostGateway', () => {
    it('injects only base tools for worker agents', () => {
        const gateway = new BifrostGateway();
        expect(gateway.resolveMcpTools('WorkerAgent')).toEqual([
            'sqlite_index_db',
            'plugged_in_vector_memory'
        ]);
    });

    it('grants multiplexer control only to the master orchestrator', () => {
        const gateway = new BifrostGateway();
        expect(gateway.resolveMcpTools('MasterOrchestrator')).toEqual([
            'sqlite_index_db',
            'plugged_in_vector_memory',
            'unterm_multiplexer_control'
        ]);
    });

    it('logs the injected tool count when routing a request', async () => {
        const gateway = new BifrostGateway();

        await gateway.proxyCompletion({ messages: [] }, workerConfig);
        expect(logSpy).toHaveBeenCalledWith(
            '[Bifrost] Proxied payload for OCR-Worker-1 via http://localhost:8080/v1. Injected 2 server-side tools.'
        );

        await gateway.proxyCompletion({ messages: [] }, masterConfig);
        expect(logSpy).toHaveBeenCalledWith(
            '[Bifrost] Proxied payload for Super-Brain-Brian via http://localhost:8080/v1. Injected 3 server-side tools.'
        );
    });
});

describe('SuperBrainBrian', () => {
    const tabs = (brain: SuperBrainBrian) =>
        Reflect.get(brain, 'activePanes') as Map<string, MultiplexerTab>;

    it('is configured as a high reasoning master orchestrator', () => {
        expect(Reflect.get(new SuperBrainBrian(), 'config')).toEqual(masterConfig);
    });

    it('spawns one OCR worker pane per chunk with a numbered command', async () => {
        const brain = new SuperBrainBrian();
        await brain.executeProjectPipeline([['page-1'], ['page-2']]);

        const spawned = [...tabs(brain).values()];
        expect(spawned.map((tab) => tab.label)).toEqual(['OCR-Worker-1', 'OCR-Worker-2']);
        expect(spawned[1].currentCommand).toBe(
            'cursor-cli --agent "Process batch 2 using Kimi Vision OCR via /model Auto"'
        );
        expect(spawned.every((tab) => tab.isActive)).toBe(true);
    });

    it('keys each pane by its own generated tab id', async () => {
        const brain = new SuperBrainBrian();
        await brain.executeProjectPipeline([['a'], ['b'], ['c']]);

        for (const [tabId, tab] of tabs(brain)) {
            expect(tabId).toBe(tab.tabId);
            expect(tabId).toMatch(/^tab_[0-9a-z]+$/);
        }
    });

    it('spawns nothing for an empty pipeline but still monitors', async () => {
        const brain = new SuperBrainBrian();
        await brain.executeProjectPipeline([]);

        expect(tabs(brain).size).toBe(0);
        expect(logSpy).toHaveBeenCalledWith(
            '[Super-Brain-Brian] Supervising 0 pipelines via multiplexer scrollback analysis.'
        );
    });

    it('returns no shared memory entries before any run', async () => {
        const brain = new SuperBrainBrian();
        await expect(Reflect.get(brain, 'fetchGlobalLogs').call(brain)).resolves.toEqual([]);
    });
});

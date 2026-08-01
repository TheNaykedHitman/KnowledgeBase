import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    BifrostGateway,
    SuperBrainBrian,
    type AgentConfig,
    type UntermTab
} from '../AgentOrchestrationProjectExample';

const workerConfig: AgentConfig = {
    id: 'OCR-Worker-1',
    role: 'WorkerAgent',
    modelPreset: 'CostOptimizedAuto',
    gatewayRoute: 'http://localhost:8080/v1'
};

const masterConfig: AgentConfig = {
    id: 'Super-Brain-Brian',
    role: 'MasterOrchestrator',
    modelPreset: 'HighReasoning',
    gatewayRoute: 'http://localhost:8080/v1'
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
        const tools = Reflect.get(gateway, 'injectMcpToolsForRole').call(gateway, 'WorkerAgent');
        expect(tools).toEqual(['sqlite_index_db', 'plugged_in_vector_memory']);
    });

    it('grants multiplexer control only to the master orchestrator', () => {
        const gateway = new BifrostGateway();
        const tools = Reflect.get(gateway, 'injectMcpToolsForRole').call(gateway, 'MasterOrchestrator');
        expect(tools).toEqual([
            'sqlite_index_db',
            'plugged_in_vector_memory',
            'unterm_multiplexer_control'
        ]);
    });

    it('logs the injected tool count when routing a request', async () => {
        const gateway = new BifrostGateway();

        await gateway.routeRequest({ messages: [] }, workerConfig);
        expect(logSpy).toHaveBeenCalledWith(
            '[Bifrost] Injecting 2 tools for OCR-Worker-1 -> Fetching LLM Response.'
        );

        await gateway.routeRequest({ messages: [] }, masterConfig);
        expect(logSpy).toHaveBeenCalledWith(
            '[Bifrost] Injecting 3 tools for Super-Brain-Brian -> Fetching LLM Response.'
        );
    });
});

describe('SuperBrainBrian', () => {
    const tabs = (brain: SuperBrainBrian) =>
        Reflect.get(brain, 'activeSwarmTabs') as Map<string, UntermTab>;

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
            '[Super-Brain-Brian] Monitoring background tabs via visual terminal state...'
        );
    });

    it('returns no shared memory entries before any run', async () => {
        const brain = new SuperBrainBrian();
        await expect(Reflect.get(brain, 'querySharedMemory').call(brain)).resolves.toEqual([]);
    });
});

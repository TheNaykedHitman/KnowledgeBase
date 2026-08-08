/**
 * @file types.ts
 * @description Shared entity definitions for the orchestration framework.
 * Both the universal blueprint and concrete project implementations build on these types.
 */

export type AgentRole = 'MasterOrchestrator' | 'WorkerAgent';
export type ModelTier = 'HighReasoning' | 'CostOptimizedAuto';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'WORKAROUND_APPLIED';

export interface AgentConfig {
    id: string;
    role: AgentRole;
    modelTier: ModelTier;
    /** Central routing proxy, e.g. "http://localhost:8080/v1" */
    gatewayEndpoint: string;
}

export interface MultiplexerTab {
    tabId: string;
    /** Internal identifier for tracking, e.g. "OCR-Worker-1" */
    label: string;
    isActive: boolean;
    currentCommand: string;
}

export interface AgentLogEntry {
    timestamp: string;
    agentId: string;
    taskDescription: string;
    status: TaskStatus;
    /** Execution notes: edge cases, failure context, ETAs, and breaking changes */
    notes: string;
}

export const DEFAULT_GATEWAY_ENDPOINT = 'http://localhost:8080/v1';

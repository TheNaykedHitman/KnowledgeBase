# Architecture

This project uses a layered structure to make agentic workflows predictable, observable, and maintainable.

## Core layers

- Orchestration layer: a Master Orchestrator that decomposes goals, delegates work, and supervises progress.
- Gateway layer: a central proxy that injects the correct tools and context for each agent role.
- Execution layer: worker agents operating within isolated terminal panes or execution spaces.
- Memory layer: shared logs, Pinecone-backed retrieval, and execution history that inform future tasks and prevent repeated mistakes.
- Context layer: folder-based knowledge buckets that define the domain context each agent should use.

## Routing model

Each agent should be routed to the smallest relevant set of context folders. This keeps prompts focused and reduces unnecessary noise.

Example:

- Master Orchestrator -> strategy + requirements + engineering
- Worker Agent -> engineering + quality
- Reviewer -> engineering + standards + quality
- Operator -> operations + deployment

## Operational pattern

1. The orchestrator evaluates the objective and available context.
2. It splits the work into delegable tasks.
3. Each worker is launched with a scoped context and appropriate tools.
4. The system monitors progress through visible execution surfaces and shared logs.
5. The orchestrator consolidates results and decides what to do next.

## Design principles

- Keep context local and explicit.
- Favor modular directories over monolithic files.
- Make the control plane visible and auditable.
- Treat memory and logs as first-class infrastructure.
- Design for extensibility across future projects.

# Bootstrap Blueprint

This document defines how to start a new project from this knowledge base as a reusable agentic foundation.

## 1. Create the project shell

- Copy the repository structure into a new project workspace.
- Preserve the core directories: agents/, contexts/, docs/, templates/, workflows/, config/.
- Keep the README as the top-level entry point.

## 2. Define the initial context map

Populate the contexts/ folder with the first domain buckets:

- strategy/
- requirements/
- engineering/
- quality/
- operations/

These folders become the routing boundaries for agent access.

## 3. Define the initial agent roles

Create or update role documentation in agents/ for:

- master_orchestrator
- worker_agent
- reviewer
- operator

Each role should include its responsibility, required context, and expected outputs.

## 4. Configure the gateway and memory

- Connect the orchestration layer to the MCP gateway.
- Configure Pinecone-backed retrieval for long-term memory.
- Use config/memory-config.yaml as the default memory settings.

## 5. Select a workflow

Choose one of the starter workflows:

- feature-development
- bugfix-cycle
- knowledge-retention

Use the appropriate template for planning, implementation, review, or release.

## 6. Instantiate the first run

For the first project run:

1. Create a planning document from the planning template.
2. Route the master orchestrator to the relevant context folders.
3. Delegate scoped work to worker agents.
4. Use memory retrieval before executing similar tasks.
5. Record outcomes for future reuse.

## 7. Standard operating expectations

- Keep context explicit.
- Keep agents scoped.
- Keep memory retrieval useful and grounded.
- Keep the workflow observable.

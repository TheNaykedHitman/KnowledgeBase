# Agents

This folder contains the role-based structure for AI agents that operate within this knowledge base.

## Agent roles

- master_orchestrator — owns workflow decomposition, delegation, and supervision
- worker_agent — executes scoped tasks inside isolated execution spaces
- reviewer — checks outputs for correctness, quality, and completeness
- operator — handles deployment and operational concerns

## Routing guidance

Each agent should be pointed at a narrow set of context folders so that it receives the right background without unnecessary noise. This repo is intentionally designed around a control-plane pattern rather than a generic assistant loop.

Use the routing file in config/agent-routing.yaml as the canonical map for how agents should be directed.

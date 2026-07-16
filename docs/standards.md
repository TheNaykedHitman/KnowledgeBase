# Development Standards

These standards define how this repository should evolve as a foundation for future work.

## General standards

- Prefer clarity over cleverness.
- Keep files focused on a single responsibility.
- Document intent before adding implementation details.
- Make decisions traceable through folders, docs, and templates.

## Orchestration standards

- Use an explicit orchestrator for multi-step work rather than relying on loosely coordinated prompt chains.
- Keep worker agents scoped to a narrow task and a narrow set of context folders.
- Preserve execution history through logs and memory rather than leaving context only in transient chat state.
- Treat the MCP memory interface and Pinecone-backed retrieval as first-class infrastructure for continuity.
- Separate planning, execution, review, and operations concerns intentionally.

## Agent workflow standards

- Assign each task to an explicit role.
- Provide the agent with only the context needed for that role.
- Record outputs in structured locations.
- Use templates to reduce ambiguity.
- Treat the gateway and multiplexer as part of the system design, not as afterthoughts.

## Project standards

- Maintain a predictable folder structure.
- Keep knowledge in durable markdown files where possible.
- Separate strategy, implementation, and operations concerns.
- Review changes against the architecture before expanding the system.

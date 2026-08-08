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

## Error handling standards

- Never swallow an error: a catch block either recovers meaningfully or re-throws.
- Re-throw with the original failure attached as `cause` and a layer-specific error type.
- Treat an empty result as "no data", never as a failed query.
- Aggregate per-item failures in fan-out work and surface them once the batch completes.
- See `docs/error-handling.md` for the full rules and reference patterns.

## Agent workflow standards

- Assign each task to an explicit role.
- Provide the agent with only the context needed for that role.
- Record outputs in structured locations.
- Use templates to reduce ambiguity.
- Treat the gateway and multiplexer as part of the system design, not as afterthoughts.

## Security standards

- Never commit credentials. Pinecone, MCP, and gateway keys are read from the environment (`AGENT_GATEWAY_API_KEY`, `AGENT_GATEWAY_ENDPOINT`) at call time and are excluded from version control via `.gitignore`.
- Require authentication on every gateway call; a missing key is a hard failure, not a fallback to an unauthenticated request.
- Bind the gateway to loopback. Any non-loopback endpoint must use TLS.
- Build sub-agent commands as argv arrays, never as interpolated shell strings, so task-derived values cannot be interpreted by a shell.
- Use `crypto.randomUUID()` for identifiers; `Math.random()` is not suitable for anything that gates access or must be unguessable.
- Treat model payloads as untrusted input: type them explicitly, validate before forwarding, and keep their contents out of logs.
- Scope MCP tool grants by role and re-check the role server-side rather than trusting the client-supplied payload.

## Project standards

- Maintain a predictable folder structure.
- Keep knowledge in durable markdown files where possible.
- Separate strategy, implementation, and operations concerns.
- Review changes against the architecture before expanding the system.

# Memory Architecture

This repository assumes that agent memory will be handled through a plugged-in MCP server and Pinecone vector storage.

## Memory layers

- Short-term working memory: transient execution context for the current workflow.
- Long-term memory: durable, retrieval-oriented memory stored in Pinecone.
- Shared operational memory: logs and prior outcomes that help future agents avoid repeated failures.

## Integration model

1. The orchestrator gathers context from the current task and available memory.
2. The MCP server exposes memory operations to agents in a consistent interface.
3. Pinecone stores embeddings and retrieval-ready summaries for semantic recall.
4. Agents can retrieve relevant prior experiences before acting.

## Recommended usage

- Store summaries of completed tasks, common patterns, and past failures.
- Keep retrieval queries scoped to the relevant domain.
- Use memory to support continuity, not to replace explicit context folders.

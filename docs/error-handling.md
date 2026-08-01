# Error Handling

Failures in an orchestration system are information. An agent that hides a failure is worse than one that crashes, because the orchestrator then plans against a state that never happened.

## Rules

- Never swallow an error. A `catch` block either recovers meaningfully or re-throws.
- Never log-and-continue. `console.log` is not error handling; it produces a run that looks successful.
- Wrap, don't flatten. When re-throwing, attach the original failure as `cause` so the whole chain survives to the orchestrator.
- Use a typed error taxonomy per layer (gateway, delegation, memory, supervision) so callers can branch on failure class instead of parsing message strings.
- An empty result must mean "no data", never "the query failed". Storage seams reject on failure; they do not return `[]`.
- Placeholders must throw. An unimplemented transport returns a rejected promise, not an empty object.
- Await everything. An un-awaited promise in a delegation loop turns a real failure into an unhandled rejection.

## Partial failure in fan-out

Delegating N chunks should not abort on the first bad chunk, and it must not silently drop it either. Collect per-item failures, finish the batch, then throw an `AggregateError` carrying every failure:

```ts
const failures: DelegationError[] = [];
for (const [index, batch] of batches.entries()) {
    try {
        panes.push(delegate(batch, index));
    } catch (error) {
        failures.push(new DelegationError(`Batch ${index} failed to delegate.`, { cause: error }));
    }
}
if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length} of ${batches.length} batches failed.`);
}
```

## Recording failures

- Every failure becomes a log entry with `status: 'FAILED'` (or `'WORKAROUND_APPLIED'` when a fallback was used) plus the failure context in the notes field.
- Workarounds are recorded explicitly so the next run can tell a real success from a degraded one.

Reference implementations live in `Agent-Orchestration-Blueprint.ts` and `AgentOrchestrationProjectExample.ts`.

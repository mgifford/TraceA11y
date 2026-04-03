# Learning Registry

TraceA11y stores learning as JSON artifacts in `data/learning`.

## Files

- `data/learning/trusted-patterns.json`: human-approved patterns used by the engine.
- `data/learning/candidate-patterns.json`: low-confidence and ambiguous candidates captured during attribution runs.
- `data/learning/decision-log.json`: immutable audit trail of promotion/rejection decisions.

## Candidate Capture Rules

The attribution engine writes candidates when any condition is true:

- Owner is `Ambiguous`
- Confidence is below `0.80`
- AI fallback was used (`usedAiFallback=true`)

## Promote a Candidate

```bash
npm run learning:promote -- --promote <candidateId> --owner "Content Author"
```

Owner override is optional. If omitted, the candidate owner is used.

## Reject a Candidate

```bash
npm run learning:reject -- --reject <candidateId> --note "False positive from utility class"
```

## Trusted Pattern Shape

Promoted candidates are converted into trusted signatures with:

- `owner`
- `ruleHints`
- `selectorPatterns` (regex source + flags)
- provenance fields (`source`, `promotedAt`, `promotedBy`)

On the next attribution run, trusted patterns are loaded and merged into runtime signatures automatically.

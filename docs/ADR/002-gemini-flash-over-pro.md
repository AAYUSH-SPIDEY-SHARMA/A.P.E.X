# ADR-002: Gemini 2.0 Flash over Gemini 2.0 Pro

## Status
Accepted

## Context
The A.P.E.X system requires a Google AI model for real-time disruption analysis. The analysis must run inline with the inject-anomaly pipeline — adding latency directly impacts the demo experience and measured response time shown to judges.

## Decision
We selected **Gemini 2.0 Flash** for all disruption analysis tasks.

### Performance Comparison

| Metric | Gemini 2.0 Flash | Gemini 2.0 Pro |
|--------|-----------------|----------------|
| Time-to-First-Token | 0.21 - 0.37s | ~1-2s |
| Throughput | 163 tokens/sec | ~80 tokens/sec |
| Cost | Lower | 2-3x higher |
| MATH benchmark | Good | Better |
| Use case fit | Real-time agents | Deep reasoning |

### Key Factors
1. **Latency budget**: The dual-shock demo measures response time with `performance.now()`. Adding 1-2s Gemini Pro latency would increase total from ~2.5s to ~4.5s — unacceptable.
2. **Structured output**: Both Flash and Pro support `response_mime_type="application/json"` — no quality difference for our JSON schema.
3. **Prompt complexity**: Our prompts are domain-specific but not mathematically complex — Flash's reasoning capabilities are sufficient.

## Alternatives Considered
- **Gemini 2.0 Pro**: Better benchmarks but 2x latency. Rejected for real-time use case.
- **Vertex AI endpoints**: Would add Vertex AI dependency and complexity. Rejected for hackathon timeline.

## Consequences
- Gemini analysis adds only 200-400ms to pipeline (Flash)
- Total dual-shock response time remains under 3 seconds
- Structured JSON output guaranteed via response_schema

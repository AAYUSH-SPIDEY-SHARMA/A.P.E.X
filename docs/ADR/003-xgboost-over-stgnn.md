# ADR-003: XGBoost over Spatio-Temporal GNN

## Status
Accepted

## Context
The disruption prediction pipeline must classify impending supply chain bottlenecks in real-time. Two primary model architectures were evaluated:

1. **XGBoost** (Extreme Gradient Boosting) — tabular ensemble model
2. **ST-GNN** (Spatio-Temporal Graph Neural Networks) — deep learning on graph topology

## Decision
We chose **XGBoost + Random Forest dual-model ensemble** for the MVP.

### Decision Matrix

| Criterion | XGBoost | ST-GNN |
|-----------|---------|--------|
| Inference latency | <15ms | 50-200ms |
| Training data requirement | Hundreds of samples | Thousands+ |
| Interpretability | High (feature importance) | Low (black box) |
| Graph-awareness | Features via NetworkX | Native |
| Implementation time | 2 hours | 2+ weeks |
| Model size | <8MB (pkl) | 50-200MB |
| Cold-start deployment | Fast | Slow (PyTorch/TF) |

### Key Factors
1. **Inference speed**: 15ms XGBoost vs 50-200ms ST-GNN. In a pipeline that also runs A* routing and Gemini analysis, every millisecond matters.
2. **Data availability**: We have simulated FASTag data, not years of historical highway telemetry. XGBoost performs well with limited training data.
3. **Hackathon timeline**: Building, training, and deploying a GNN would consume the entire 2-week timeline.
4. **Feature engineering**: NetworkX betweenness centrality + M/M/1 utilization captures the graph topology information that ST-GNN would learn natively.

## Alternatives Considered
- **ST-GNN (DCRNN, STGCN)**: Superior graph-aware predictions but impractical for our timeline and data constraints.
- **LSTM/GRU**: Sequential models for time-series. Rejected — our features are instantaneous snapshots, not time series.
- **Prophet/ARIMA**: Forecasting models. Rejected — we need classification, not forecasting.

## Consequences
- Sub-15ms inference enables real-time autonomous detection
- Model fits in <8MB — fast Cloud Run cold starts
- Future work: transition to ST-GNN when historical FASTag data is available at scale

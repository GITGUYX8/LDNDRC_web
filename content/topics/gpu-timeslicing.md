A consumer GeForce cannot be partitioned the way a datacentre card can. Time-slicing fakes it: the NVIDIA device plugin advertises several logical GPUs on one physical card, and the scheduler hands them out as if they were separate.

## The shape

- Install the NVIDIA GPU Operator.
- Patch the `ClusterPolicy` with a time-slicing ConfigMap (`replicas: 4`).
- Session pods request `nvidia.com/gpu: 1` each.
- Set `SESSION_GPU_LIMIT=1` in the panel.

The result is up to four session pods per physical GPU, sharing it by time rather than memory. Four students on one gaming laptop is the whole economic argument for the platform.

## The honest caveat

Time-sliced GPUs do not isolate memory. One student's oversized scene can push another's frame rate down. For a workshop that is acceptable; for an exam it would not be. The roadmap's R7 track is where limits and dashboards would go.

## Check it yourself

```bash
kubectl get nodes -o jsonpath='{.items[*].status.allocatable.nvidia\.com/gpu}'
# 4 on a time-sliced single-GPU Host
```

The panel keeps two small pieces of state: active sessions and node approvals. Today both live on `emptyDir` — a temporary shelf wiped when the pod is replaced.

## What already works

Small restarts lose nothing. The panel writes `sessions.json`; on boot it re-reads it and adopts pods that still exist. If a pod is gone, the session is marked `stopped` rather than pretending it is alive. That was CP21, and it removed a whole class of phantom sessions.

## What is left

A full redeploy replaces the pod, and with it the shelf. The fix is a PVC (or a small database) plus a rollout strategy that always keeps one panel answering:

- move `NODES_DB` and the sessions store onto a PVC
- set `maxUnavailable: 1` so the old copy dies only after the new one is ready
- prove it by replacing the deployment with live sessions and asserting zero loss

## Why it matters

Every workshop begins with a deploy. Losing the state that says "these laptops were approved" means re-approving twenty machines by hand in front of a room. This is why R2-final sits at the top of the [[roadmap]].

## Check it yourself

```bash
kubectl -n ldndrc get deploy -o jsonpath='{.items[*].spec.strategy}'
kubectl -n ldndrc get pvc
```

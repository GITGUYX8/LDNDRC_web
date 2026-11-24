The unit of tenancy is not a database row. It is a set of Kubernetes objects with the student's name on it.

## What the panel creates

For each session, in the `ldndrc` namespace:

| Object | Purpose |
|---|---|
| `Deployment` | Runs the workspace pod; carries the image, env, and resource requests |
| `Service` | A stable in-cluster address the gateway can proxy to |
| `PersistentVolumeClaim` | `5Gi` by default, mounted as the student's home directory |

All three are named from the session ID, so teardown is a single lookup.

## Why a Deployment and not a bare Pod

A bare Pod is not restarted if the node reboots. A Deployment gives you a ReplicaSet, a rollout strategy, and a readiness signal the panel can read. The panel only needs one replica, but it needs the controller semantics around it.

## Why the service account is namespace-scoped

The panel creates these objects through its ServiceAccount. That account can create and delete Deployments, Services, and PVCs **in `ldndrc` only**. It cannot see other namespaces and cannot list nodes cluster-wide.

This is what keeps a compromised panel from owning the cluster. It is checked explicitly in the deployment checklist — see [[control-panel-deploy]].

## Resource requests are the scheduling contract

The pod requests CPU, memory, and `nvidia.com/gpu`. Those requests are how Kubernetes decides which Host can take it. When a pod sits `Pending`, the reason is almost always in one of two places:

- no node labelled `role=host` (see [[hardware-gate]])
- no allocatable GPU because `SESSION_GPU_LIMIT=1` on a GPU-less demo

```bash
kubectl -n ldndrc describe pod <session-pod>
kubectl -n ldndrc get events --sort-by=.lastTimestamp
```

## The volume is the student's work

Everything in `~/dev_ws` lives on that PVC. Tearing a session down with `DELETE` removes the PVC along with the Deployment and Service, so "delete the session" and "delete my files" are the same operation today. That is a known sharp edge, and it is part of [[durable-state]].

## Check it yourself

```bash
kubectl -n ldndrc get deploy,svc,pvc
kubectl -n ldndrc get pod -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName
```

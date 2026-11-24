Frequently asked questions about LDNDRC, grouped around the problems, architecture, operations, and trade-offs.

## The five clusters

1. **Why** — the problem, the LAN constraint, the economics of donated compute.
2. **Architecture** — pods, namespaces, sessions, gateway, isolation.
3. **Kubernetes specifics** — RBAC scope, PVCs, probes, rollouts, scheduling.
4. **Failure modes** — what breaks, how you would know, what you would do.
5. **Trade-offs** — what was rejected and why.

## How to use it

Read the question, answer it out loud in three sentences, then check the source. If you cannot name the failure mode, you do not know the feature — a rule that comes straight from [[dev-timeline]]'s verify-everything habit.

## The one question that covers the most ground

*"Why can two students run the same ROS topic name without interfering?"* A good answer touches the pod network namespace, Flannel's traffic profile, the domain ID, and the fact that teardown removes the namespace — that is [[dds-isolation]] in one breath.

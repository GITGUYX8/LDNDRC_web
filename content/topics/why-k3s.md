Kubernetes is the right shape for this problem: it already knows how to schedule a pod onto whichever machine has room, restart it when it dies, and hold a volume next to it. The question was never *whether* Kubernetes. It was how much of it you can afford on a laptop.

## What K3s removes

K3s is a single binary under 100 MB that packages the API server, scheduler, controller manager, kubelet, and containerd. It replaces etcd with a small embedded datastore by default and ships sensible defaults for the things a laptop does not have: no cloud provider, no load balancer controller, no CSI driver zoo.

The practical result: `curl -sfL https://get.k3s.io | sh -` is the entire control plane install. On the master laptop. No container to bootstrap the container runtime.

## What it keeps

Everything that matters for this design:

- **Namespaces** — the tenancy boundary.
- **Deployments and Services** — one per student session.
- **PersistentVolumeClaims** — the student's home directory.
- **RBAC** — the control panel is namespace-scoped on purpose.
- **Ingress** — Traefik is bundled, so the front door exists out of the box.

## Why not kubeadm or a managed cluster?

`kubeadm` is a two-hour install with certificate rotation you have to think about. A managed cluster is a cloud bill and an internet dependency, both ruled out by [[lan-first]].

## The one honest weakness

K3s with an embedded datastore is a single control-plane node. If the master dies, the cluster is gone until it comes back. There is no failover, and the roadmap does not pretend otherwise. For a workshop, the recovery plan is "rebuild the master and re-add the Hosts", which takes about ten minutes.

## Check it yourself

```bash
k3s --version
kubectl get nodes -o wide
```

One server, zero control-plane taints to worry about. Next: [[k3d-demo]] runs the same thing without a second machine.

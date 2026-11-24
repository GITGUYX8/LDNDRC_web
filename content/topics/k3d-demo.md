You should be able to see the whole platform before you own a cluster. `k3d` runs K3s inside Docker, so a single laptop can host the control plane, the demo image, the ingress, and a working session in about ten minutes.

The demo deliberately does **not** use the real 10 GB workspace image. It uses `ldndrc/demo-standin`, a tiny HTTP server that answers on the same ports. That is enough to prove the provisioning path, the gateway, and the UI without waiting on a GPU.

## The short version

```bash
# 1. cluster
k3d cluster create ldndrc -p "80:80@loadbalancer" -p "443:443@loadbalancer"

# 2. images
docker build -t ldndrc/control-panel:dev ./control-panel
docker build -t ldndrc/demo-standin:dev ./images/demo-standin
k3d image import ldndrc/control-panel:dev ldndrc/demo-standin:dev -c ldndrc

# 3. control plane
kubectl create namespace ldndrc
kubectl -n ldndrc create secret generic ldndrc-control-panel \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)"
kubectl apply -f manifests/control-panel-rbac.yaml
kubectl apply -f manifests/control-panel-deployment.yaml
kubectl apply -f manifests/control-panel-service.yaml
kubectl apply -f manifests/control-panel-ingress.yaml
```

## The part people skip, then regret

`k3d image import` is not a registry. The image is copied into the cluster's containerd store at that moment. If you rebuild the tag and forget to re-import, the Deployment keeps running the old image and the failure looks like "my code change did nothing".

## Why the demo is configured differently

Two environment overrides matter:

| Variable | Real cluster | Demo |
|---|---|---|
| `SESSION_IMAGE` | `ldndrc/ros2-gz:jazzy-harmonic-<sha>` | `ldndrc/demo-standin:dev` |
| `SESSION_GPU_LIMIT` | `1` | `0` |

`SESSION_GPU_LIMIT=0` means the session schedules on any node with no GPU request, so a laptop without an NVIDIA card still reaches `ready`. The GPU path is [[gpu-timeslicing]].

## Teardown is one command

```bash
k3d cluster delete ldndrc
```

Everything goes: workloads, volumes, secrets. That is the beauty of the demo — it is disposable, so you can break it while learning. The real cluster in [[control-panel-deploy]] is not.

## Check it yourself

```bash
k3d cluster list
kubectl -n ldndrc get pods
```

Then follow [[goal-demo]] if you want the guided route through this.

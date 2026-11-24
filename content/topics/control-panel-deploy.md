The control panel is a single Go binary. It is the only stateful brain in the system: it authenticates users, provisions sessions, proxies tool traffic, and approves laptops. Deploying it is four manifests and one secret.

## What gets applied

```bash
kubectl create namespace ldndrc
kubectl -n ldndrc create secret generic ldndrc-control-panel \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)"

kubectl apply -f manifests/control-panel-rbac.yaml
kubectl apply -f manifests/control-panel-deployment.yaml
kubectl apply -f manifests/control-panel-service.yaml
kubectl apply -f manifests/control-panel-ingress.yaml
```

## The RBAC decision that matters

The panel's ServiceAccount is **namespace-scoped**. It can create and delete Deployments, Services, and PVCs in `ldndrc`. It cannot list nodes cluster-wide, and it cannot touch other namespaces.

That is enforced by a set of `auth can-i` checks that are part of the deployment checklist:

```bash
kubectl -n ldndrc auth can-i create deployments \
  --as=system:serviceaccount:ldndrc:ldndrc-control-panel   # expect: yes
kubectl -n ldndrc auth can-i delete persistentvolumeclaims \
  --as=system:serviceaccount:ldndrc:ldndrc-control-panel   # expect: yes
kubectl -n ldndrc auth can-i list nodes \
  --as=system:serviceaccount:ldndrc:ldndrc-control-panel   # expect: no
```

The third one is the one people get wrong. The node onboarding feature needs a separate, narrowly-scoped nodes permission — not a cluster-admin shortcut.

## Configuration is environment variables

Everything the panel needs to know is injected, not baked in:

| Variable | Why it exists |
|---|---|
| `JWT_SECRET` | Signs tokens and the gateway cookie; the process exits if unset |
| `SESSION_IMAGE` | Which workspace image to run |
| `SESSION_HOME_STORAGE` | PVC size per student, default `5Gi` |
| `SESSION_GPU_LIMIT` | `1` for real Hosts, `0` for the demo |
| `K3S_JOIN_URL` | Where approved laptops should send their agent |
| `COOKIE_DOMAIN` | `.ros-platform.local`, so one login covers four hosts |

## Rolling it out

```bash
kubectl -n ldndrc rollout status deployment/ldndrc-control-panel
kubectl -n ldndrc port-forward svc/ldndrc-control-panel 8082:8082 &
curl -s http://127.0.0.1:8082/healthz
```

On a one-service-port cluster the rollout can briefly have zero available replicas. That is why the panel's persistence and probe settings are not cosmetic — see [[durable-state]] for what happens when they are wrong.

## Check it yourself

```bash
kubectl -n ldndrc rollout status deployment/ldndrc-control-panel
kubectl -n ldndrc get deploy,svc,ingress
```

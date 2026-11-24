The `manifests/` directory is the whole declared surface of the platform. If it is not in here, it does not exist in a fresh cluster.

| File | Object | Notes |
|---|---|---|
| `control-panel-rbac.yaml` | ServiceAccount, Role, RoleBinding | namespace-scoped on purpose |
| `control-panel-deployment.yaml` | Deployment | image, env, probes, volumes |
| `control-panel-service.yaml` | Service | port `8082` |
| `control-panel-ingress.yaml` | Ingress | the four hostnames |
| `headlamp.yaml` | Deployment + Service | operator dashboard |
| `control-panel-hostnetwork-patch.yaml` | patch | optional, for mDNS on real masters |
| `secret.example.yaml` | docs | shape of the JWT secret |

## The rule for adding a file

One concern per file, and the filename says which concern. A manifest that both patches and deploys is a manifest nobody can reason about during an incident.

## Check it yourself

```bash
kubectl apply --dry-run=server -f manifests/
```

The commands an operator actually types, in the order they are needed during a session. This topic is the distilled index; the full table lives in the library.

## Is it up?

```bash
kubectl -n ldndrc get pods
curl -s http://127.0.0.1:8082/healthz
```

## Read the logs

```bash
kubectl -n ldndrc logs deploy/ldndrc-control-panel -f
kubectl -n ldndrc logs <session-pod> -c workspace -f
```

## Test the money path

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'Host: editor.ros-platform.local' -H "Cookie: $COOKIE" \
  http://127.0.0.1:8082/
```

## If X, run Y

| Symptom | First command |
|---|---|
| Pod `Pending` | `kubectl -n ldndrc describe pod <pod>` |
| Gateway `503` | `kubectl -n ldndrc get deploy` |
| Gateway `502` | `kubectl -n ldndrc get pods` |
| Editor blank | `kubectl -n ldndrc logs <pod> -c workspace` |
| Sim blank | `supervisorctl status` inside the pod |
| Node never joins | `kubectl get nodes` and `K3S_JOIN_URL` |

## The rule

Never debug two layers at once. Confirm the pod, then the service, then the gateway, then the browser — in that order. See [[gateway-proxy]] for what each status code means.

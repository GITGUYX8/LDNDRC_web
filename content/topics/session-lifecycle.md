A session is a student's private robot workspace. Asking for one is fast; getting one is asynchronous. The API is honest about that, which is the single most important detail to internalise.

## The five calls

```bash
BASE=http://127.0.0.1:8082
TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -X POST $BASE/api/sessions -H "Authorization: Bearer $TOKEN"   # 202 provisioning
curl -s $BASE/api/sessions -H "Authorization: Bearer $TOKEN"           # list, poll status
curl -s $BASE/api/sessions/<id> -H "Authorization: Bearer $TOKEN"      # detail
curl -s -X DELETE $BASE/api/sessions/<id> -H "Authorization: Bearer $TOKEN"
```

## Why 202 and not 200

`POST /api/sessions` has done its job when the Deployment object exists. It has not done its job when a pod is running. Returning `200` would be a lie, so it returns `202 Accepted` with `status: provisioning`, and the client polls.

The gateway enforces the same honesty: it answers `503` until the Deployment reports an available replica. A student cannot reach an editor that is not ready.

## The status ladder

```text
provisioning ──▶ ready ──▶ stopping ──▶ stopped
      │
      └──▶ error
```

Every state has exactly one sensible next action, which is why the UI can be simple: launch, wait, open, stop.

## What "ready" actually means

Not "the pod is Running". It means the Deployment has at least one available replica, which means the readiness probe passed. A pod can be `Running` and still be useless because code-server has not bound its port yet. This distinction is the difference between a launch screen that lies and one that does not.

## Teardown

`DELETE` removes the Deployment, the Service, and the PVC. That is the whole session, including the student's home directory. It is deliberately not soft-deleted; see [[durable-state]] for the storage caveats.

## Check it yourself

```bash
curl -s $BASE/api/sessions -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
kubectl -n ldndrc get pods -w
```

Watch the pod appear while the API still says `provisioning`. That gap is the design.

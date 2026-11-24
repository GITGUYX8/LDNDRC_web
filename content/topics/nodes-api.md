A laptop that wants to become a Host has no credential. The nodes API is built around that fact: it lets strangers knock, but only an operator can open the door.

## The four states

```text
register → pending → approved → joined
                 └─▶ denied
```

## Register — unauthenticated by design

```bash
curl -X POST $BASE/api/nodes/register \
  -H 'Content-Type: application/json' \
  -d '{"hostname":"laptop-a","os":"linux","arch":"amd64",
       "cpu":12,"ram_gb":32,"gpu":"NVIDIA RTX"}'
# → {"id":"<id>","status":"pending"}
```

This endpoint is rate-limited and can require an optional pre-shared `JOIN_KEY`. It cannot be CSRF-protected, because the caller has no session yet.

## Approve — operator only

```bash
curl -X POST $BASE/api/nodes/<id>/approve -H "Authorization: Bearer $TOKEN"
curl -X POST $BASE/api/nodes/<id>/deny -H "Authorization: Bearer $TOKEN" -d '{"reason":"unknown device"}'
```

Approval is a human decision, and it is the security boundary. Hardware checks tell you whether a machine *can* be a Host; this tells you whether it *may* be one.

## Poll — the token mint

```bash
curl $BASE/api/nodes/<id>
# {"status":"approved","k3s_url":"https://192.168.1.50:6443",
#  "k3s_token":"K10...","node_name":"ldndrc-<id>"}
```

The K3s token is minted on the **first poll after approval**. It is short-lived and single-use from the client's perspective: the laptop joins, and the token is no longer useful.

If `K3S_JOIN_URL` is unset, approved polls answer `503`. That is a configuration error, not a bug.

## Joined — confirmed, not assumed

A 5-second in-cluster watcher looks for Ready nodes and labels them `role=host`. Only then is the node marked `joined`. This is why approval and readiness are separate states: approving a laptop that never manages to join should be visible, not hidden.

## The demo shortcut

`AUTO_APPROVE=true` exists for development. It is never used in a workshop, because it removes the only human check in the onboarding path.

## Check it yourself

```bash
curl -s $BASE/api/nodes -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
kubectl get nodes -L node-role.kubernetes.io/role
```

Headlamp is a Kubernetes dashboard deployed as a normal manifest. It exists so the operator can answer "what is actually running?" without composing `kubectl` output by hand.

```bash
kubectl apply -f manifests/headlamp.yaml
kubectl -n ldndrc port-forward svc/ldndrc-headlamp 8080:80 &
kubectl -n ldndrc create token ldndrc-headlamp --duration=24h
```

Paste the token into `http://localhost:8080`.

## What it is good for

- Seeing session pods appear and disappear while a class is provisioning.
- Reading events on a `Pending` pod without switching terminals.
- Showing the cluster to someone who does not live in a shell.

## What it is not

It is not the student-facing UI, and it is not exposed to Guests. It is an operator tool, reachable by port-forward only. The "glass wall" metaphor in the journey report is literal: you can see in, students cannot.

## Check it yourself

```bash
kubectl -n ldndrc get svc ldndrc-headlamp
```

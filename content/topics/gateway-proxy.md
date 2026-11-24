The gateway is the piece that makes three separate tools feel like one product. It is not a separate service — it is the control panel's reverse proxy, and it routes on two facts at once.

## The two facts

1. **Hostname** → which tool is being asked for.
2. **Cookie** → whose session it should be routed to.

```text
editor.ros-platform.local   + valid cookie → user's pod :7682
desktop.ros-platform.local  + valid cookie → user's pod :8080
gazebo.ros-platform.local   + valid cookie → user's pod :9002
```

There is no path prefix and no query parameter. The hostname is the entire tool selector, which is why the four subdomains are not cosmetic.

## Why the cookie and not the JWT

Iframes and WebSockets cannot attach an `Authorization` header reliably. A cookie is sent automatically by the browser on every request, including the WebSocket upgrade. That is the only reason the second credential exists — see [[auth-csrf]].

## The error contract

The gateway does not return vague failures. Each status means exactly one thing:

| Status | Meaning |
|---|---|
| `401` | No valid cookie — log in again |
| `404` | No active session for this user |
| `503` | Session is still `provisioning` |
| `502` | Session pod is unhealthy |

This is the single best debugging surface in the system. A student reading "503" knows to wait; an operator reading "502" knows to look at the pod.

## WebSockets

`/ws/{session}` proxies the upgrade into the pod. Everything downstream — code-server's terminal, gzweb's scene stream, Selkies' signalling — rides the same proxy. If one tool works and another does not, the gateway is usually fine and the upstream port is not.

## Check it yourself

```bash
COOKIE=$(curl -s -D - -o /dev/null -X POST http://127.0.0.1:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"secret123"}' \
  | grep -i '^Set-Cookie:' | head -1 | sed 's/^Set-Cookie: //; s/;.*//')

curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: editor.ros-platform.local' -H "Cookie: $COOKIE" http://127.0.0.1:8082/   # 200
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: editor.ros-platform.local' http://127.0.0.1:8082/                        # 401
```

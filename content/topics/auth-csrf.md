The platform uses two credentials for two different jobs, and most of the confusing bugs in its history came from mixing them up.

## Credential one: the JWT

`POST /api/auth/login` returns a signed token with a 24-hour TTL. It is sent as `Authorization: Bearer <token>` on API calls. It is stateless: the panel verifies the signature and does not look anything up.

This is the operator and student *API* credential. It never reaches the browser as a cookie.

## Credential two: the session cookie

The same login response also sets a cookie scoped to `COOKIE_DOMAIN=.ros-platform.local`. That cookie is what makes one login cover four hostnames. It is what the gateway reads when a student opens `editor.ros-platform.local`.

The cookie is not the JWT. It is a separate, signed value whose only job is to identify the user to the gateway.

## The CSRF stamp

A cookie-authenticated request is vulnerable to cross-site forgery: another site can make the browser send the cookie. The defence is a third value, `csrf_token`, returned at login and held in memory by the SPA.

Every cookie-authenticated **mutation** must carry it:

```text
X-CSRF-Token: <csrf_token>
```

Reads do not need it. Creation, stopping, approval, and denial do.

## The bug worth remembering

The CSRF check was applied too broadly and caught `/api/auth/login` itself. A returning visitor with an old cookie got `403` instead of a new login — locked out by the security feature meant to protect them.

The fix was to exempt login from the check while keeping it on every mutation. The roadmap keeps this visible as R3's "one small fix left" until the deployment was verified live.

## Why the join endpoint is different

`POST /api/nodes/register` is intentionally unauthenticated: a stranger's laptop has no credential yet. It is protected by rate limiting and an optional pre-shared `JOIN_KEY`, not by CSRF. See [[nodes-api]].

## Check it yourself

```bash
# no token → expect 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8082/api/sessions

# with token → expect 202 (or a session-already-exists error)
curl -s -X POST http://127.0.0.1:8082/api/sessions -H "Authorization: Bearer $TOKEN"
```

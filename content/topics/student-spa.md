The student web app is a small state machine with a route for each state. It is React 18 and Vite, served as static assets by the Go panel.

## The routes

| Route | Screen |
|---|---|
| `/login` | sign in |
| `/launch` | workspace status, Launch/Stop, tool cards |
| `/app?view=code` | code-server fills the stage |
| `/app?view=sim` | gzweb fills the stage |
| `/app?view=split` | code and sim side by side |
| `/desktop` | Selkies, own tab |

## The state machine

```text
LOGGED_OUT → LOGGED_IN → NO_SESSION → PROVISIONING → READY ⇄ STOPPING → STOPPED
                              ↑                          ↓
                              └──────── ERROR ───────────┘
```

Every state has exactly one primary action. That constraint is what keeps the UI from growing a dashboard nobody reads — see [[uiux-principles]].

## Check it yourself

```bash
curl -s http://127.0.0.1:8082/ | head -5
```

Selkies streams a real Linux desktop to the browser over WebRTC. It exists because some tools will never work in a browser pane: RViz, rqt, Gazebo's GUI, anything that needs a window manager and a GPU-accelerated surface.

It runs on port `8080` inside the session pod and is reachable at `desktop.ros-platform.local`.

## When to use it

- Visualising TF trees in RViz.
- Running `rqt` plugins.
- Debugging a Gazebo world that will not stream through the browser viewer.
- Anything that needs a second window.

## The 2.0.0 migration

Selkies 2.0.0 changed its signalling and container layout. The migration checkpoint verified the desktop returns `200` through the gateway and that input works end to end. It is the reason the workspace image pins a specific Selkies version rather than tracking latest.

## The cost

WebRTC is bandwidth-hungry and latency-sensitive. On a congested workshop Wi-Fi, the editor stays usable while the desktop degrades. That is why it is an escape hatch, not the default tool — see [[uiux-principles]].

## Check it yourself

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'Host: desktop.ros-platform.local' -H "Cookie: $COOKIE" \
  http://127.0.0.1:8082/
```

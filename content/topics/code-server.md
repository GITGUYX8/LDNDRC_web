`code-server` is VS Code compiled to run on a server and render in a browser. For most students it is the actual product: the editor, the integrated terminal, and the place every command in these docs is typed.

It runs inside the session pod on port `7682`, behind the gateway at `editor.ros-platform.local`.

## Why not a local editor?

Because the code has to run where ROS and Gazebo run. A local editor would need a tunnel, a matching toolchain, and a way to ship files back and forth. The editor living next to the robot removes all three problems.

## The trade-off

The browser editor is limited by the browser: no native extensions that need a GUI, no local filesystem, keyboard shortcuts that fight the host OS. For ROS 2 Python and launch files it is more than enough. For heavy C++ debugging, the [[selkies]] desktop exists.

## Check it yourself

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'Host: editor.ros-platform.local' -H "Cookie: $COOKIE" \
  http://127.0.0.1:8082/
# 200
```

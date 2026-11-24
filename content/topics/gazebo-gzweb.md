The simulator is split in two: physics runs headless inside the pod, and only the scene is sent to the browser.

## The pieces

| Piece | Where | Port |
|---|---|---|
| `gz sim` (Gazebo Harmonic) | session pod | headless |
| `gazebo-web` bridge | session pod | `9002` |
| gzweb viewer (Three.js) | browser | — |
| `turtlebot3-sim` launcher | editor terminal | — |

`gazebo-web` is supervised, so it restarts on its own. Gazebo is **not** supervised — the student launches it in the foreground so they can see its logs and choose a world.

## Starting a world

From the editor terminal:

```bash
turtlebot3-sim              # obstacle world, burger model
turtlebot3-sim empty        # empty world
turtlebot3-sim house        # house world
TURTLEBOT3_MODEL=waffle_pi turtlebot3-sim house
```

Then open the `gazebo` tab. The scene streams in over the websocket. Drive it from a second terminal:

```bash
turtlebot3-teleop.sh
```

## The rule that causes most blank screens

**One Gazebo server per workspace.** A second `gz sim` creates a duplicate world and robot, and the viewer cannot tell which one to draw. Stop the first with `Ctrl-C`, or use:

```bash
turtlebot3-sim --force house
```

## Why the scene is blank

A blank viewer is almost always one of three things, in this order:

1. no Gazebo server running (nothing to broadcast)
2. the world lacks the `SceneBroadcaster` plugin
3. the bridge on `:9002` is down or not proxied

```bash
supervisorctl status
tail -50 /tmp/gazebo-web.err.log
```

## Custom worlds

```bash
gz sim -s -v 3 ~/dev_ws/src/my_workshop/worlds/maze.sdf -r
```

The `SceneBroadcaster` plugin is mandatory. Without it Gazebo renders locally and publishes nothing.

## Desktop fallback

If a student needs Gazebo's GUI, set `TURTLEBOT3_GAZEBO_GUI=true` and use the Selkies desktop tab. It is slower, but it is the escape hatch when a custom plugin does not stream.

## Check it yourself

```bash
kubectl -n ldndrc exec <session-pod> -- supervisorctl status
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: gazebo.ros-platform.local' http://127.0.0.1:8082/
```

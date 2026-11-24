The session image is where ROS, Gazebo, the editor, the desktop, and the scene bridge all meet. Building it is a chain, not a single `docker build`.

## The chain

1. **Base layers** — Ubuntu, NVIDIA runtime hooks, common tooling.
2. **ROS 2 Jazzy + Gazebo Harmonic** — the robotics payload.
3. **Workspace layer** — code-server, Selkies, `gazebo-web`, supervisor config, `turtlebot3` packages and worlds.
4. **Immutable tag** — a content hash, never `latest`.

## Why the tag is a hash

The image is imported into each Host's containerd. If two Hosts have different images under the same tag, two students in the same class get different robots and nobody can reproduce the bug. An immutable sha tag makes that impossible to do by accident.

## Getting it onto a laptop

```bash
docker save ldndrc/ros2-gz:<sha> -o workspace.tar
k3d image import workspace.tar -c ldndrc     # demo
# real cluster: push to a local registry the Hosts can pull from
```

The budget for all of this is [[disk-budget]].

## Check it yourself

```bash
kubectl -n ldndrc get deploy \
  -o jsonpath='{.items[*].spec.template.spec.containers[*].image}'
```

A robotics workshop needs a room full of gaming laptops and one machine that can show everyone a robot. That normally means a cloud account, a GPU server, and a network engineer. LDNDRC replaces all three with the laptops people already brought.

The product is a **local-first ROS 2 lab**. High-end laptops become compute. Everything else becomes a thin client. The only thing a student installs is nothing — they open a browser.

## The three clocks

Everything in the system runs on one of three clocks, and keeping them separate is most of the architecture:

| Clock | Unit | What it means |
|---|---|---|
| Cluster | minutes | Nodes join, images import, the control panel rolls out |
| Session | seconds | A student asks for a workspace and gets one |
| Robot | milliseconds | Gazebo physics and the websocket scene stream |

A student never sees the first clock. They see a launch screen, and then they see their robot.

## What a student actually gets

One login, four hostnames, one private pod:

- `control.ros-platform.local` — the panel: login, launch, stop
- `editor.ros-platform.local` — code-server, VS Code with terminals
- `desktop.ros-platform.local` — a full Linux desktop over WebRTC
- `gazebo.ros-platform.local` — the 3D scene, streamed

The cluster, the pods, and the images are invisible. That is the point: the interface is the product.

## What it is not

It is not a general Kubernetes tutorial, and it is not a robot simulator. It is the plumbing that turns laptops into a classroom, built so that a single instructor can run it without a cloud bill.

## Check it yourself

```bash
curl -s http://127.0.0.1:8082/healthz
# {"status":"ok"}
```

If that answers, a control panel is alive somewhere and you can start asking it questions. Next: [[roles]] to see which machine you are standing at.

ROS 2 uses DDS for discovery and message passing. DDS is chatty: it multicasts, it discovers peers automatically, and it assumes a flat network. Put twenty student robots on one LAN and every node sees every other node.

The platform's answer is not a firewall rule. It is a **network namespace**.

## The mechanism

A Kubernetes pod shares one network namespace across all its containers. `code-server`, Selkies, Gazebo, and the ROS processes all see the same `localhost`. DDS multicast never crosses the pod boundary because, as far as the kernel is concerned, there is nowhere to cross to.

Flannel — the CNI — carries only HTTP, WebSocket, and WebRTC between pods. No DDS packet ever traverses the overlay.

## Defense in depth

Namespace isolation alone is enough in theory. The platform adds two more layers anyway:

1. A **unique `ROS_DOMAIN_ID` per session pod**. Two pods that somehow shared a network would still not discover each other's topics.
2. `ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST`, which pins discovery to loopback even inside the pod.

The second layer costs nothing and turns a subtle misconfiguration into a non-event.

## Why not just use separate VLANs?

VLANs require switch configuration and physical control of the network. The workshop happens on whatever Wi-Fi the venue has. A pod namespace is a property of the deployment, not of the venue.

## What this buys

- A student cannot accidentally publish `/cmd_vel` into another student's robot.
- Two students can run the same world and the same topic names with no coordination.
- Teardown is `DELETE /api/sessions/{id}` — the namespace goes with it.

The cost is that cross-session collaboration is impossible by construction. If two students need to share a topic, they have to share a session. That is a deliberate limitation, not a missing feature.

## Check it yourself

```bash
kubectl -n ldndrc exec <session-pod> -- env | grep ROS_DOMAIN_ID
kubectl -n ldndrc exec <session-pod> -- env | grep ROS_AUTOMATIC_DISCOVERY_RANGE
```

Compare the domain IDs of two sessions. They must differ. Then read [[ros-domain-id]] for how the value is assigned.

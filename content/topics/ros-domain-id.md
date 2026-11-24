If pod namespaces already isolate DDS, why give each session a different `ROS_DOMAIN_ID`? Because isolation you cannot see is isolation you cannot verify.

## Assigning the value

The panel derives a domain ID per session and injects it into the pod environment. The value is unique across active sessions and stable for the life of the session, so a restarted container keeps talking to the same graph.

Two more variables travel with it:

```text
ROS_DOMAIN_ID=<unique per session>
ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST
RMW_IMPLEMENTATION=<pinned>
```

`LOCALHOST` is the important one. Even if two pods somehow shared a network namespace — a mistake in a manifest, a host-network patch, a debugging override — their DDS discovery would still not cross loopback.

## Why not random?

Random IDs collide. With a small integer space and a workshop of twenty laptops, collisions are likely enough to matter. The panel allocates and tracks them, so two live sessions never share a value.

## What a student sees

Nothing. `turtlebot3-sim` starts Gazebo, and its topics are visible to the student's own terminal. Peers on other laptops are invisible. The domain ID is infrastructure, not a setting.

## The debugging consequence

If a student says "my node cannot see the topic", the answer is never "another student stole it". It is one of:

- the node was launched in a different shell without the pod environment
- the discovery range was overridden
- Gazebo is not running (see [[gazebo-gzweb]])

That narrows a whole class of support questions to three causes.

## Check it yourself

```bash
kubectl -n ldndrc exec <session-pod> -- bash -c 'echo $ROS_DOMAIN_ID'
kubectl -n ldndrc get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].env[?(@.name=="ROS_DOMAIN_ID")].value}{"\n"}{end}'
```

Every row must have a different number.

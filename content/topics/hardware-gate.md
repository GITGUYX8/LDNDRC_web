Not every laptop should become a Host. The gate is a deterministic check run before anything is installed, so a weak machine is never offered a K3s agent it cannot carry.

## The bar

| Resource | Minimum | Why |
|---|---|---|
| CPU cores | 8 | A session pod runs an editor, a desktop, Gazebo, and ROS |
| RAM | 16 GB | Gazebo plus DDS plus the browser tooling |
| GPU | NVIDIA | The workspace image requests `nvidia.com/gpu: 1` |
| Disk | ~25 GB free | The image is roughly 10 GB, imported per node |

## The verdicts

```text
High-end laptop detected. Joining as HOST.
Low-end laptop detected. Staying a Guest — use the browser.
```

There is no third option and no manual override in the normal path. That is intentional: a Host that cannot carry a session makes the whole workshop worse for one student, silently.

## Testing the gate without hardware

The detection logic is separated from the install so it can be exercised in two seconds:

```bash
./test-join.sh
TEST_CPU=12 TEST_RAM=16 TEST_GPU=nvidia ./join-cluster.sh
```

`TEST_*` overrides exist because CI and developer machines rarely look like workshop laptops. They change only the input to the decision, not the decision itself.

## The real lesson

The gate is deliberately conservative. A laptop with 15 GB of RAM is a Guest even though it would probably cope. Being wrong in that direction costs one unused machine. Being wrong in the other direction costs a student their session in the middle of a lesson.

## How it connects

- The gate decides whether a laptop can even reach [[nodes-api]]'s approval step as a Host.
- It is why the join binary can say "you cannot join" before downloading anything — see [[join-binary]].
- GPU capacity is then shared with [[gpu-timeslicing]].

## Check it yourself

```bash
TEST_CPU=12 TEST_RAM=16 TEST_GPU=nvidia ./join-cluster.sh
# High-end laptop detected. Joining as HOST.
```

The workspace image is roughly 10 GB. That is not a build problem — it is a planning problem, because every Host has to hold it.

## The numbers that matter

| Item | Budget |
|---|---|
| Image, compressed | ~4–5 GB |
| Image, on disk per node | ~10 GB |
| Free disk required | ~25 GB |
| Student home PVC | `5Gi` |

Multiply by the number of Hosts. A five-laptop workshop is asking for 50 GB of image storage before a single student has saved a file.

## What the compression work bought

The compression checkpoint recorded what each layer costs and which ones can be squashed or reordered. The result was a smaller image and a documented number, so "it fits on a workshop laptop" became a measurement rather than a hope.

## The failure mode

`ImagePullBackOff` on a session pod usually means the image is missing on the node that got scheduled — not that the registry is down. On the demo, re-run `k3d image import`. On a real cluster, check the local registry and the node's disk.

## Check it yourself

```bash
docker images | grep ldndrc
df -h /var/lib/rancher
```

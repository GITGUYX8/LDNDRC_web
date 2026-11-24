Before the console existed, approving a laptop meant a JWT, a curl command, and a node ID copied out of JSON. The instructor console puts that on a screen.

## What it does

- Lists pending join requests with hardware details.
- Approves or denies with a reason.
- Shows the live download counter from the onboarding portal.
- Distinguishes approved from joined, so a laptop that never connected is visible.

## Why it matters

Approval is the security boundary of the whole onboarding path — see [[nodes-api]]. If only one person can perform it, and that person needs a shell, the workshop is one forgotten token away from stalling.

## Check it yourself

Open `control.ros-platform.local/admin` with an operator login and confirm a pending request appears after `POST /api/nodes/register`.

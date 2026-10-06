# 1. Run on one EC2 instance with Docker Compose

Accepted, 2026-10-05.

## Context

Glazecalc is a small app with a handful of users, run by one person on a budget. The old server
was a hand-started Debian 12 instance that stopped serving after a reboot and cost $15-17 a month.
The new setup had to be cheap, restart itself, be rebuilt from scripts in the repository, and use
tools worth knowing.

## Decision

One `t4g.micro` (Graviton, 1 GB) running Debian 13 in us-west-2. Docker Compose runs two
containers, the app image and `mongo:9.0` with a named volume, started at boot by a systemd unit.
nginx runs on the host in front of the app (see [0003](0003-nginx-and-lets-encrypt.md)). Images
are built for arm64 in GitHub Actions and pulled from GHCR; nothing is built on the instance.
Data is protected by daily EBS snapshots (kept 7 days) and a nightly `mongodump` to S3 (kept 30).
Everything is in `deploy/`, and `deploy/aws/README.md` lists every AWS step.

## Alternatives

- **ECS on Fargate, or App Runner:** no servers to patch, but a load balancer or the service fee
  alone costs more than this whole setup, and MongoDB would still need a home.
- **MongoDB Atlas or DocumentDB:** Atlas's free tier is small and adds a second vendor;
  DocumentDB is only partly compatible and expensive. MongoDB in a container on the instance is
  free, and arm64 needs it anyway (MongoDB publishes no arm64 Debian packages).
- **A bigger instance:** `t4g.small` (2 GB) is the step up if memory gets tight.

## Consequences

- About $13 a month. CPU credits are `standard`, so a busy spell slows down instead of billing.
- One instance means downtime during a failure or a reboot (unattended upgrades reboot at 11:30
  UTC when needed). Status-check alarms recover the instance; restores come from snapshots or S3.
- The app and its database share 1 GB: MongoDB's cache is capped at 0.25 GB with 2 GB of swap.

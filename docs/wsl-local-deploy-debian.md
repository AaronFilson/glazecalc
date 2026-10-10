# Local Docker on WSL Debian

Notes from setting up Docker Engine in a WSL Debian distro on the author's
Windows 10 machine, the same way as the EC2 Debian production server. Started
2026-10-04 on the `building10-4` branch, and kept as a record: the paths, user
name and helper scripts in `D:\WSL` are that machine's and are not in the
repository. Step 3 gives the commands the setup script ran, to use on your own
machine. `npm run test:e2e:linux` needs only Docker Engine working inside WSL.

## Status

| Step                                 | State                                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Check the machine                    | Done                                                                                                                                                                 |
| Update WSL                           | Done: WSL 3.0.1, kernel 6.18 (was the 2022 built-in version)                                                                                                         |
| Install Debian to `D:\WSL\Debian`    | Done 2026-10-04 after the restart: Debian 13 (trixie), WSL 2                                                                                                         |
| Docker setup script                  | Done: `D:\WSL\setup-docker.sh`; Docker 29.8.2, Compose 5.6.0                                                                                                         |
| Docker Engine installed and verified | Done: systemd service, hello-world, port forwarding to Windows (`D:\WSL\check-docker.sh`)                                                                            |
| Linux password for `bellows`         | To do (you)                                                                                                                                                          |
| Sparse disk image                    | Skipped: WSL currently disables it (see step 6)                                                                                                                      |
| Project Docker files                 | Done: `Dockerfile`, `.dockerignore`, `compose.yaml`, CI "Docker image" job; checked in WSL (`D:\WSL\compose-smoke.sh`, `compose-lifecycle.sh`, `ci-docker-local.sh`) |

## Machine facts

- Windows 10 Pro 22H2 (build 19045), still receiving security updates through
  Extended Security Updates (latest installed 2026-09-15).
- Intel i7-7700, 32 GB RAM. Hardware virtualization works (a hypervisor is
  running, which is why Windows reports the CPU virtualization flags as False).
- Disk: C: is tight, D: has plenty of space, so WSL distros and Docker data go
  on D:.

## Why Docker Engine in WSL rather than Docker Desktop

- Free with no license terms, and doesn't depend on Docker Desktop's support for
  Windows 10, which only covers Windows versions Microsoft still services.
- Matches production: Debian with Docker's own apt packages.
- No GUI; `docker` runs inside the Debian terminal (VS Code's WSL extension
  makes that comfortable).

## Steps after the restart

1. Restart Windows. `wsl --install` enabled a Windows component that only takes
   effect after a reboot.
2. Install Debian straight to D: (no admin rights needed now):

   ```powershell
   wsl --install Debian --location D:\WSL\Debian --no-launch
   ```

3. Set up Docker as root (`wsl -d Debian -u root`), with your Linux user name
   for `<you>`, then restart the distro (`wsl --terminate Debian`). The setup
   script (`D:\WSL\setup-docker.sh`, not in the repository) did this:
   - creates the user with sudo and makes it the default:
     `useradd -m -s /bin/bash -G sudo <you>`, and in `/etc/wsl.conf`:

     ```ini
     [boot]
     systemd=true

     [user]
     default=<you>
     ```

     systemd lets Docker run as a service;

   - removes unofficial Docker packages, then installs `docker-ce`,
     `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin` and
     `docker-compose-plugin` from Docker's apt repository, as
     [Install Docker Engine on Debian](https://docs.docker.com/engine/install/debian/)
     describes;
   - caps container logs at 3 files of 10 MB in `/etc/docker/daemon.json`:
     `{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }`;
   - adds the user to the `docker` group: `usermod -aG docker <you>` (note: that
     group is root-equivalent).

4. Set the Linux password yourself:

   ```powershell
   wsl -d Debian -u root passwd <you>
   ```

5. Verify:

   ```powershell
   wsl -d Debian -- docker run --rm hello-world
   wsl -d Debian -- docker compose version
   wsl -l -v                      # Debian, version 2
   ```

   Also check that Docker starts by itself when the distro starts, and that the
   distro's disk image (`ext4.vhdx`) is under `D:\WSL\Debian`.

6. Let the virtual disk give space back when images are deleted. **Not done:**
   WSL 3.0.1 refuses with "Sparse VHD support is currently disabled due to
   potential data corruption" and only offers an `--allow-unsafe` override,
   which is not worth the risk. Without it, `D:\WSL\Debian\ext4.vhdx` grows
   with use and does not shrink by itself. To reclaim space later: remove unused
   images and build cache (`docker system prune`), shut WSL down
   (`wsl --shutdown`), then compact the file from an admin PowerShell with
   `Optimize-VHD` (needs the Hyper-V module) or `diskpart` (`select vdisk
file=...`, `compact vdisk`). Try `--set-sparse true` again after future WSL
   updates.

7. Project Docker files (done; the files themselves are current):
   - multi-stage `Dockerfile` on `node:24-slim` (Debian-based, which bcrypt's
     prebuilt binaries need): build the Angular client, then a small runtime
     image running the single `server/main.ts`;
   - runs as the image's non-root `node` user with `NODE_ENV=production`;
   - `HEALTHCHECK` on `/api/health` (planned on `/api/verify` at first);
   - `.dockerignore` excluding `node_modules`, `db`, `dist` and `.env`;
   - `compose.yaml` with the app plus `mongo:9.0` and a named volume;
     `APP_SECRET` supplied at run time, never baked into the image;
   - a CI job that builds the image, so a broken Dockerfile fails CI.

## Windows 10 networking notes

- Containers are reachable from Windows: WSL forwards ports, so the app on port
  3000 inside Debian opens at `http://localhost:3000` in the Windows browser.
- Containers cannot easily reach the Windows `mongod` on 127.0.0.1. WSL's
  "mirrored" networking mode would allow it, but needs Windows 11. So the Docker
  setup runs its own MongoDB 9 container, with its data inside the Debian disk on
  D:. The Windows `mongod` (`D:\MongoDB\mongodb-win32-x86_64-windows-9.0.2`)
  stays as it is for non-Docker development.

## Optional

- Cap WSL's memory with `%UserProfile%\.wslconfig`:

  ```ini
  [wsl2]
  memory=8GB
  ```

  Without it, WSL may use up to half of RAM (16 GB here).

## Notes from setup

- Before the WSL update, `wsl -l -v` listed an `Ubuntu-20.04` distro (WSL 1).
  After the update it was gone. No Ubuntu files were found anywhere on C: or D:
  and no Ubuntu app is installed, so it was most likely a stale entry left by an
  Ubuntu app uninstalled earlier, which the new WSL cleaned up. This was not
  checked before the update.

## Production (EC2 Debian) for later

The same Docker packages and repository as the setup script, plus:

- publish the app only on localhost in Compose (`127.0.0.1:3000:3000`) and put
  nginx in front for HTTPS, because ports Docker publishes bypass `ufw`; the EC2
  security group still applies;
- the same log caps in `/etc/docker/daemon.json`;
- `restart: unless-stopped`, so containers come back after reboots and Docker
  upgrades;
- keep the existing apt-installed MongoDB at first and connect the app container
  to it; moving the database into a container is a separate, later step. (Not
  what was done: production runs MongoDB in a `mongo:9.0` container from the
  start, [ADR 1](adr/0001-one-ec2-instance.md).)

Sources: [Install Docker Engine on Debian](https://docs.docker.com/engine/install/debian/),
[Docker Desktop for Windows requirements](https://docs.docker.com/desktop/setup/install/windows-install/).

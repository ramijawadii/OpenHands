# OpenHands Quick-Start Script
# Uses the pre-built ghcr.io image — no local build needed.
# UI available at http://localhost:3000

$WORKSPACE = "$PSScriptRoot\workspace"

docker run -it --rm `
  -e SANDBOX_RUNTIME_CONTAINER_IMAGE=ghcr.io/all-hands-ai/runtime:0.59-nikolaik `
  -e LOG_ALL_EVENTS=true `
  -v /var/run/docker.sock:/var/run/docker.sock `
  -v "${WORKSPACE}:/opt/workspace_base" `
  -p 3000:3000 `
  --add-host host.docker.internal:host-gateway `
  --name openhands-app `
  ghcr.io/all-hands-ai/openhands:latest

# Docker Compose Guide

This guide explains how to use Docker Compose for local testing before deploying to ROFL.

## Purpose of compose.yaml

The `compose.yaml` file serves two purposes:

1. **Local Testing** - Test your containerized app locally before ROFL deployment
2. **ROFL Reference** - ROFL CLI may use this configuration as a reference

## Prerequisites

- Docker Desktop or Docker Engine with Compose plugin
- `.env.docker` file with your configuration

## Quick Start

### 1. Update compose.yaml

Edit `compose.yaml` and replace `YOUR_USERNAME` with your Docker Hub username:

```yaml
image: "docker.io/your-username/invoice-rwa-backend:latest"
```

Or use GitHub Container Registry:

```yaml
image: "ghcr.io/your-username/invoice-rwa-backend:latest"
```

### 2. Configure Environment Variables

Copy `.env.docker` and update with your values:

```bash
cp .env.docker .env.docker.local
# Edit .env.docker.local with your private keys and settings
```

### 3. Build and Run

```bash
# Build the image
docker compose build

# Run the container
docker compose --env-file .env.docker.local up

# Or run in background
docker compose --env-file .env.docker.local up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Testing the Container

Once running, test the endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Run API tests
./test-api.sh --skip-invoice
```

## Persistent Data

Docker Compose creates a named volume `invoice-data` for the SQLite database:

```bash
# View volumes
docker volume ls | grep invoice

# Inspect volume
docker volume inspect backend_invoice-data

# Backup database
docker compose exec invoice-rwa-backend \
  sqlite3 /rofl/storage/invoice_rwa.db .dump > backup.sql

# Restore database
docker compose exec -T invoice-rwa-backend \
  sqlite3 /rofl/storage/invoice_rwa.db < backup.sql
```

## Push to Registry

After testing locally, push to a public registry:

### Docker Hub

```bash
# Login
docker login

# Tag (if needed)
docker tag invoice-rwa-backend:latest your-username/invoice-rwa-backend:latest

# Push
docker push your-username/invoice-rwa-backend:latest

# For production, pin with SHA256
docker push your-username/invoice-rwa-backend:latest
docker inspect your-username/invoice-rwa-backend:latest | jq -r '.[0].RepoDigests[0]'
# Update compose.yaml with: docker.io/your-username/invoice-rwa-backend@sha256:...
```

### GitHub Container Registry

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Make package public on GitHub:
# https://github.com/users/YOUR_USERNAME/packages/container/invoice-rwa-backend/settings

# Tag
docker tag invoice-rwa-backend:latest ghcr.io/your-username/invoice-rwa-backend:latest

# Push
docker push ghcr.io/your-username/invoice-rwa-backend:latest
```

## Troubleshooting

### Container fails to start

Check logs:
```bash
docker compose logs invoice-rwa-backend
```

### Database initialization errors

Remove volume and restart:
```bash
docker compose down -v
docker compose up
```

### Port already in use

Change port in compose.yaml:
```yaml
ports:
  - "3001:3000"  # Use port 3001 instead
```

Then test with:
```bash
curl http://localhost:3001/health
```

### Environment variables not loaded

Make sure to use `--env-file`:
```bash
docker compose --env-file .env.docker.local up
```

## Platform Compatibility

The `compose.yaml` specifies `platform: linux/amd64` which is required for ROFL.

If you're on Apple Silicon (M1/M2/M3), Docker will automatically use emulation.

## Next Steps

After successful local testing:

1. Push image to public registry
2. Update `rofl.yaml` with the image URL
3. Follow `ROFL_DEPLOYMENT.md` for ROFL deployment

## Important Notes

⚠️ **Security Warning**:
- `.env.docker` contains private keys - never commit to git!
- For ROFL deployment, use `oasis rofl secret set` instead

⚠️ **Production Deployment**:
- Pin images with SHA256 digest in production
- Use `ghcr.io` or `docker.io` with FQDN (not shorthand)
- Ensure package visibility is set to public

## Reference

- [ROFL Containerize App Guide](https://docs.oasis.io/build/rofl/workflow/containerize-app/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

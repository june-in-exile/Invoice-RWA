# Quick Start Guide

Three deployment options for Invoice-RWA Backend with SQLite.

## Option 1: Local Development (SQLite)

**Fastest way to develop and test**

```bash
# 1. Install dependencies
npm install

# 2. Initialize database
npm run db:init

# 3. Start development server
npm run dev

# 4. Test APIs
./test-api.sh --skip-invoice
```

✅ **Use this for**: Day-to-day development, debugging, rapid testing

---

## Option 2: Docker Compose (Local Container)

**Test the exact container that will run in ROFL**

```bash
# 1. Update image name in compose.yaml
# Replace: docker.io/YOUR_USERNAME/invoice-rwa-backend:latest
# With:    docker.io/your-dockerhub-username/invoice-rwa-backend:latest

# 2. Build and test
chmod +x test-docker.sh
./test-docker.sh

# 3. Test APIs
./test-api.sh --skip-invoice

# 4. Stop when done
docker compose down
```

✅ **Use this for**: Pre-deployment testing, container debugging, verifying Docker setup

📚 **Detailed guide**: See `DOCKER_COMPOSE_GUIDE.md`

---

## Option 3: ROFL Deployment (Production)

**Deploy to ROFL network in TEE**

### Prerequisites

- Oasis CLI installed
- ~150 testnet tokens
- Public Docker image (from Option 2)

### Steps

```bash
# 1. Push image to public registry
docker login
docker push your-username/invoice-rwa-backend:latest

# 2. Update rofl.yaml with your image URL
# Edit: container.image

# 3. Initialize ROFL
oasis rofl init

# 4. Register app on-chain
oasis rofl create --network testnet

# 5. Set secrets
oasis rofl secret set RELAYER_PRIVATE_KEY 0x...
oasis rofl secret set ORACLE_PRIVATE_KEY 0x...
# ... (all environment variables)
oasis rofl update

# 6. Build and deploy
oasis rofl build
oasis rofl deploy

# 7. Monitor
oasis rofl machine logs --follow
```

✅ **Use this for**: Production deployment, mainnet/testnet, secure TEE execution

📚 **Detailed guide**: See `ROFL_DEPLOYMENT.md`

---

## Comparison

| Feature          | Local Dev   | Docker Compose | ROFL             |
| ---------------- | ----------- | -------------- | ---------------- |
| **Speed**        | ⚡️ Fastest | 🔥 Fast        | ⏱️ Moderate      |
| **Setup**        | Simple      | Medium         | Complex          |
| **TEE Security** | ❌ No       | ❌ No          | ✅ Yes           |
| **Blockchain**   | Optional    | Optional       | Required         |
| **Cost**         | Free        | Free           | ~50 tokens/month |
| **Best for**     | Development | Testing        | Production       |

---

## Common Tasks

### View Database

```bash
# Local dev
sqlite3 data/invoice_rwa.db ".tables"

# Docker Compose
docker compose exec invoice-rwa-backend sqlite3 /rofl/storage/invoice_rwa.db ".tables"

# ROFL
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db ".tables"
```

### View Logs

```bash
# Local dev
tail -f logs/combined.log

# Docker Compose
docker compose logs -f

# ROFL
oasis rofl machine logs --follow
```

### Backup Database

```bash
# Local dev
cp data/invoice_rwa.db backup-$(date +%Y%m%d).db

# Docker Compose
docker compose exec invoice-rwa-backend sqlite3 /rofl/storage/invoice_rwa.db .dump > backup.sql

# ROFL
oasis rofl machine exec -- sqlite3 /rofl/storage/invoice_rwa.db .dump > backup.sql
```

---

## Next Steps

### For Development

1. Start with **Option 1** for fast iteration
2. Use `./test-api.sh --skip-invoice` to verify changes
3. Commit working code to git

### For Deployment

1. Test with **Option 2** to verify container works
2. Push image to Docker Hub or GitHub Container Registry
3. Deploy with **Option 3** to ROFL testnet
4. Monitor and iterate
5. Deploy to ROFL mainnet when ready

---

## Troubleshooting

### "Cannot find package 'sqlite3'"

```bash
npm install
```

### "Database file not found"

```bash
npm run db:init
```

### "Port 3000 already in use"

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or change PORT in .env
PORT=3001
```

### Docker build fails

```bash
# Check Docker is running
docker info

# Clean and rebuild
docker compose down -v
docker system prune -f
docker compose build --no-cache
```

### ROFL deployment fails

```bash
# Check logs
oasis rofl machine logs

# Verify image is public
docker pull your-username/invoice-rwa-backend:latest

# Check ROFL status
oasis rofl machine show
```

---

## Support

- **Local Issues**: Check logs in `logs/` directory
- **Docker Issues**: Run `docker compose logs`
- **ROFL Issues**: Check [ROFL Documentation](https://docs.oasis.io/build/rofl/)
- **API Issues**: Run `./test-api.sh --verbose`

---

## File Reference

| File                      | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `package.json`            | Node.js dependencies (now with sqlite3) |
| `compose.yaml`            | Docker Compose configuration            |
| `Dockerfile`              | Container image definition              |
| `rofl.yaml`               | ROFL deployment manifest                |
| `.env`                    | Local development config                |
| `.env.docker`             | Docker Compose config                   |
| `ROFL_DEPLOYMENT.md`      | Detailed ROFL guide                     |
| `DOCKER_COMPOSE_GUIDE.md` | Detailed Docker guide                   |
| `test-api.sh`             | API testing script                      |
| `test-docker.sh`          | Docker testing script                   |

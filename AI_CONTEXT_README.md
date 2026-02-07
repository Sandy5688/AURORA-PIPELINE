# 🤖 AI Context - Quick Recovery File

> **Start Here** - Read this first when beginning any new AI session.

---

## 📍 Current Project State

| Aspect | Status |
|--------|--------|
| **Project Name** | Aurora Automated Content Engine |
| **Phase** | Phase 2 - Orbit Layer Development |
| **Current Focus** | Building topic normalization module |
| **Blocking Issues** | None (Green) |
| **Last Updated** | 2026-02-07 |

---

## 🎯 Mission Statement

Build a **fully automated content engine** that:
1. Pulls hot topics from **TrendRadar**
2. Feeds topics into **Aurora** for script, voice, video generation
3. Publishes content without manual intervention
4. Runs on autopilot on a server

---

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   TrendRadar    │────▶│    Orbit     │────▶│     Aurora      │
│ (Topic Ingest)  │     │ (Normalize)  │     │ (Generate)      │
└─────────────────┘     └──────────────┘     └─────────────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │   Publishing    │
                                            │ YT/IG/TikTok    │
                                            └─────────────────┘
```

---

## 📁 Key Repository Paths

| Component | Path |
|-----------|------|
| **Main Aurora Pipeline** | `/AURORA-PIPELINE/` |
| **TrendRadar Integration** | `/AURORA-PIPELINE/Aurora-Pipeline-TrendRadar/` |
| **Aurora Server** | `/AURORA-PIPELINE/server/aurora/` |
| **Configuration** | `/AURORA-PIPELINE/.env.example` |
| **Docker Setup** | `/AURORA-PIPELINE/docker-compose.yml` |

---

## 🔧 Quick Server Access

```bash
# Navigate to project
cd /Users/rajatsingh/Documents/Sandys_project/AURORA-PIPELINE

# Start Development
npm run dev

# Start Production (PM2)
pm2 start ecosystem.config.js

# Health Check
curl http://localhost:3000/health

# View Logs
pm2 logs aurora-pipeline
```

---

## ✅ What's Done

- [x] Aurora Pipeline cloned and production-ready
- [x] Aurora-Pipeline-TrendRadar repository cloned
- [x] Health endpoints implemented (/health, /ready, /metrics)
- [x] PM2 process management configured
- [x] API integrations wired (OpenAI, ElevenLabs, HeyGen)
- [x] Dead Letter Queue (DLQ) implemented
- [x] **TrendRadar configured with English keywords** (AI, tech, robotics, crypto)
- [x] **TrendRadar tested - 255 news items from 11 platforms**
- [x] **Python venv created for TrendRadar**
- [x] **Timezone set to Asia/Kolkata**

---

## 🔄 What's In Progress

- [/] Orbit layer - Topic normalization module
- [ ] TrendRadar → Orbit data pipeline
- [ ] Topic memory & deduplication
- [ ] Priority scoring algorithm

---

## ⚠️ Current Blockers

**None currently**

---

## 📖 Related Context Files

| File | Purpose |
|------|---------|
| [PROGRESS_LOG.md](./PROGRESS_LOG.md) | Detailed action history & evidence |
| [PROJECT_MASTER_PLAN.md](./PROJECT_MASTER_PLAN.md) | Full roadmap & success criteria |
| [PRODUCTION_READY.md](./PRODUCTION_READY.md) | Aurora production status |

---

## 🚀 Next Actions

1. Create `/server/orbit/` directory structure
2. Build TrendRadar Ingestor module
3. Implement topic normalization and deduplication
4. Connect Orbit output to Aurora pipeline

---

*For detailed history, see [PROGRESS_LOG.md](./PROGRESS_LOG.md)*  
*For full roadmap, see [PROJECT_MASTER_PLAN.md](./PROJECT_MASTER_PLAN.md)*

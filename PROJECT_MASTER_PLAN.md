# 🗺️ Project Master Plan - Aurora Automated Content Engine

> **High-level roadmap** with phases, success criteria, and pending items.

---

## 🎯 Project Objective

Build a **fully automated content engine** that:
- Pulls hot topics from TrendRadar
- Feeds those topics into Aurora for script, voice, video generation
- Publishes without manual intervention
- Runs on autopilot on a server

---

## 📊 Phase Overview

| Phase | Name | Status | Target Date |
|-------|------|--------|-------------|
| 0 | Planning & Setup | ✅ Complete | Week 1 |
| 1 | TrendRadar Integration | ✅ Complete | Week 1 |
| 2 | Orbit Layer Development | 🟡 In Progress | Week 2 |
| 3 | Aurora Integration | ⬜ Not Started | Week 3 |
| 4 | Publishing & Autopilot | ⬜ Not Started | Week 4 |
| 5 | Hardening & Security | ⬜ Not Started | Week 5 |

---

## 📋 Phase Details

---

### Phase 0: Planning & Setup ✅

**Objective:** Set up project structure and context files

**Tasks:**
- [x] Clone Aurora-Pipeline-TrendRadar repository
- [x] Review existing Aurora Pipeline codebase
- [x] Create AI context files for session recovery
- [x] Define integration architecture
- [x] Set up development environment (Python venv)

**Success Criteria:**
- ✅ All repositories cloned and accessible
- ✅ Context files created (AI_CONTEXT_README.md, PROGRESS_LOG.md, PROJECT_MASTER_PLAN.md)
- ✅ Development environment running locally

---

### Phase 1: TrendRadar Integration ✅

**Objective:** Deploy and configure TrendRadar for topic ingestion

**Tasks:**
- [x] Deploy TrendRadar (Python venv)
- [x] Configure `frequency_words.txt` with target keywords
- [x] Add RSS feeds for content sources
- [x] Set timezone to Asia/Kolkata
- [x] Persist results to SQLite database
- [x] Test TrendRadar output (255 items from 11 platforms)

**Success Criteria:**
- ✅ TrendRadar running successfully
- ✅ Topics being captured and stored in `output/news/{date}.db`
- ✅ Output schema documented for Orbit layer

**Key Files:**
```
/Aurora-Pipeline-TrendRadar/
├── config/
│   ├── config.yaml         # Timezone: Asia/Kolkata
│   └── frequency_words.txt # English keywords configured
├── venv/                   # Python virtual environment
└── output/
    ├── news/{date}.db      # SQLite with news_items table
    └── rss/{date}.db       # RSS items
```

---

### Phase 2: Orbit Layer Development 🟡

**Objective:** Build topic normalization and filtering module

**Tasks:**
- [ ] Create `/server/orbit/` directory structure
- [ ] Build TrendRadar Ingestor module
- [ ] Implement topic normalization
- [ ] Add deduplication logic
- [ ] Implement priority scoring algorithm
- [ ] Create topic memory storage with metadata:
  ```json
  {
    "topic_id": "",
    "headline": "",
    "source": "",
    "trend_score": "",
    "timestamp": "",
    "category": "",
    "emotion_vector": "",
    "used_recently": false
  }
  ```
- [ ] Connect Orbit output to Aurora input

**Success Criteria:**
- ⬜ Topics normalized and deduplicated
- ⬜ Scoring system prioritizing best topics
- ⬜ Topic memory preventing duplicates
- ⬜ Emotional cycle consideration in selection

---

### Phase 3: Aurora Integration ⬜

**Objective:** Wire Aurora pipeline to receive Orbit topics

**Tasks:**
- [ ] Connect Orbit → Aurora topic feed
- [ ] Verify OpenAI script generation works with topics
- [ ] Test ElevenLabs voice synthesis
- [ ] Test HeyGen/RunwayML video generation
- [ ] Enforce calm/neutral tone constraints
- [ ] End-to-end pipeline test

**Success Criteria:**
- ⬜ Topics flowing from Orbit to Aurora
- ⬜ Scripts generated successfully
- ⬜ Voice audio generated
- ⬜ Video content created
- ⬜ Pipeline runs without errors

**Existing Aurora APIs:**
| Service | Purpose | Status |
|---------|---------|--------|
| OpenAI GPT-4 | Script/Text | ✅ Wired |
| ElevenLabs | Voice Synthesis | ✅ Wired |
| HeyGen/RunwayML | Video Gen | ✅ Wired |

---

### Phase 4: Publishing & Autopilot ⬜

**Objective:** Automated content distribution

**Tasks:**
- [ ] Create auto-scheduler cron job
- [ ] Configure to run TrendRadar → Orbit → Aurora
- [ ] Pick top N scored topics per run
- [ ] Ensure 1-2 posts per day minimum
- [ ] Integrate publishing to:
  - [ ] YouTube Shorts
  - [ ] Instagram Reels
  - [ ] TikTok
  - [ ] Or use default repio
- [ ] Implement logging and alerts
- [ ] Add failure handling and retry logic

**Success Criteria:**
- ⬜ Automated runs executing on schedule
- ⬜ Content publishing to platforms
- ⬜ 1-2 posts per day achieved
- ⬜ Alerts on failure

---

### Phase 5: Hardening & Security ⬜

**Objective:** Production-ready security and reliability

**Tasks:**
- [ ] Security audit
- [ ] Implement autoretry logic
- [ ] Configure scaling settings
- [ ] Set up monitoring dashboards
- [ ] API key rotation procedure
- [ ] Rate limiting
- [ ] HTTPS enforcement
- [ ] Backup procedures

**Success Criteria:**
- ⬜ Security vulnerabilities addressed
- ⬜ Automatic recovery from failures
- ⬜ Monitoring and alerting active
- ⬜ Documentation complete

---

## 🏆 Final Success Criteria

The project is complete when:

1. **Automation**: System runs without manual intervention for 7+ days
2. **Output**: Minimum 1-2 posts per day published automatically
3. **Quality**: Content meets calm/neutral tone guidelines
4. **Reliability**: Less than 5% failure rate
5. **Recovery**: Automatic retry on failures
6. **Monitoring**: Real-time visibility into pipeline status

---

## ⚠️ Pending Decisions

| Decision | Options | Status |
|----------|---------|--------|
| TrendRadar deployment method | Docker vs Python | ✅ Python venv |
| Database for topic storage | PostgreSQL vs SQLite | ✅ SQLite (TrendRadar default) |
| Primary publishing platform | YouTube/IG/TikTok/Repio | ⬜ Pending |
| Posting frequency | 1x/day vs 2x/day | ⬜ Pending |

---

## 📁 Repository Structure (Target)

```
/AURORA-PIPELINE/
├── server/
│   ├── aurora/           # ✅ Existing - Content generation
│   │   ├── text-engine/  # Script generation
│   │   ├── voice-engine/ # Voice synthesis
│   │   ├── video-engine/ # Video generation
│   │   └── distribution/ # Social publishing
│   └── orbit/            # 🆕 TO BUILD - Topic management
│       ├── ingestor/     # TrendRadar data fetch
│       ├── normalizer/   # Topic normalization
│       ├── scorer/       # Priority scoring
│       └── memory/       # Topic history
├── Aurora-Pipeline-TrendRadar/  # ✅ Cloned
├── AI_CONTEXT_README.md  # ✅ Created
├── PROGRESS_LOG.md       # ✅ Created
├── PROJECT_MASTER_PLAN.md # ✅ Created (this file)
└── ...
```

---

## 📅 Timeline Estimate

| Week | Focus |
|------|-------|
| 1 | Planning, context setup, TrendRadar config |
| 2 | TrendRadar deployment, initial testing |
| 3 | Orbit layer development |
| 4 | Aurora integration, E2E testing |
| 5 | Publishing module, autopilot setup |
| 6 | Hardening, security, monitoring |

---

## 📖 Related Documents

- [AI_CONTEXT_README.md](./AI_CONTEXT_README.md) - Quick session recovery
- [PROGRESS_LOG.md](./PROGRESS_LOG.md) - Detailed action history
- [PRODUCTION_READY.md](./PRODUCTION_READY.md) - Aurora production status
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Deployment guide

---

*Last updated: 2026-02-07*

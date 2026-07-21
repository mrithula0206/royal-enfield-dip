# Royal Enfield — Digital Intelligence Platform (Scaffold)

A working full-stack scaffold for the platform described in the spec:

1. **Executive Digital Intelligence Dashboard** — KPIs, drilldowns, MoM/DoD/Target-vs-Actual comparisons, Top/Bottom views
2. **Campaign Hygiene Automation** — OTP / Form / CRM / Landing Page / MSD Push check status, consecutive-failure streak detection
3. **AI Daily Business Summary** — rule-based insight engine, served from stored insights or regenerated live from current data
4. **Lead Journey Intelligence** — full lifecycle timeline per lead, lead age / conversion time / dealer transfers / drop reasons / retail conversion / bounce rate

**Stack:** FastAPI + SQLite (backend) · React + Vite + Recharts (frontend). Data source is your
`Royal_Enfield_Digital_Intelligence_Platform.xlsx` workbook, ingested once into SQLite.

```
royal-enfield-dip/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app + router registration
│   │   ├── ingest.py           Excel -> SQLite loader
│   │   ├── db.py                SQLite/pandas helpers
│   │   ├── logic.py             Shared funnel/KPI business logic
│   │   └── routers/             kpis, drilldowns, comparisons, top_bottom,
│   │                            campaign_hygiene, ai_insights, lead_journey
│   ├── data/                    put the .xlsx workbook here
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api.js                fetch wrapper for every endpoint
    │   ├── pages/                ExecutiveDashboard, CampaignHygiene, AIDailySummary, LeadJourney
    │   └── components/           Topbar, Sidebar, KpiCard
    └── package.json
```

---

## Step-by-step: run it locally

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# The workbook should already be at backend/data/Royal_Enfield_Digital_Intelligence_Platform.xlsx
# (it's included). To use a different/updated workbook, drop it in backend/data/ with the
# same filename, or edit XLSX_PATH in app/ingest.py.

python -m app.ingest        # builds backend/data/royal_enfield.db from the workbook
uvicorn app.main:app --reload --port 8000
```

Leave this running. Check it worked:
- http://localhost:8000/api/health → `{"status":"ok",...}`
- http://localhost:8000/docs → interactive Swagger UI for every endpoint

### 2. Frontend

In a **new terminal**:

```bash
cd frontend
npm install
cp .env.example .env         # defaults to VITE_API_BASE=http://localhost:8000
npm run dev
```

Open the URL it prints (usually **http://localhost:5173**). You should see the Executive
Dashboard load real numbers from your workbook, with an "API CONNECTED" badge top-left.

### 3. Re-ingesting after you update the workbook

Any time you regenerate or edit the Excel workbook:

```bash
cd backend
python -m app.ingest
```

Then just refresh the frontend — no restart needed (SQLite is re-read per request).

---

## What's real vs. what's a stub

**Fully working:**
- All 7 router groups, tested end-to-end against the 20,000-row workbook (KPIs, drilldowns,
  MoM/DoD/target-vs-actual, top/bottom, hygiene streak detection, AI insight generation, full
  lead-journey timelines).
- All four frontend pages fetch live data from the API — nothing is hardcoded/mocked.

**Scaffolded but intentionally simple (next steps for production):**
- **Auth** — there's no login; add an auth layer (e.g. Azure AD / SSO, since this would sit inside
  Royal Enfield's network) before deploying anywhere non-local.
- **AI Daily Summary** — the `/api/ai-insights/generate` endpoint is rule-based (mirrors the logic
  used to seed the workbook's `AI_Insights` sheet). Swapping in an LLM call (e.g. via the Claude
  API) to turn the same aggregates into more naturally-worded, prioritized insights is a drop-in
  replacement for that one function.
- **Scheduling** — campaign hygiene checks and AI insight generation are computed on-demand per
  request right now. In production these become scheduled jobs (cron / Celery / cloud scheduler)
  that write results to the DB each morning, which the API then just reads.
- **Database** — SQLite is fine for a demo; for concurrent production use, swap `db.py` for
  Postgres (the SQL is close to portable as-is).
- **Real data source** — replace the ingest step with a connector to Royal Enfield's actual CRM /
  campaign systems instead of the Excel workbook.

---

## API reference (quick)

| Endpoint | Purpose |
|---|---|
| `GET /api/kpis` | Executive KPI strip, filterable by date/region/model/source/dealer/campaign |
| `GET /api/drilldowns/{region\|dealer\|model\|source\|affiliate\|campaign}` | Funnel KPIs grouped by dimension |
| `GET /api/comparisons/month-on-month` | Two periods + deltas |
| `GET /api/comparisons/day-on-day` | Two days + deltas |
| `GET /api/comparisons/target-vs-actual?level=region\|model\|source` | Target attainment |
| `GET /api/top-bottom/{dealers\|regions\|models}` | Ranked top/bottom performers |
| `GET /api/campaign-hygiene/summary` | Today's automated check status, all campaigns |
| `GET /api/campaign-hygiene/{id}/history` | Daily check history for one campaign |
| `GET /api/campaign-hygiene/{id}/streaks` | Longest consecutive-failure streak per check |
| `GET /api/ai-insights` | Stored insights, filterable by category/severity |
| `POST /api/ai-insights/generate` | Recompute insights live from current data |
| `GET /api/lead-journey/{lead_id}` | Full lifecycle timeline for one lead |
| `GET /api/lead-journey?mobile=...&customer_name=...` | Search leads |
| `GET /api/lead-journey/metrics/summary` | Lead age, conversion time, drop reasons, bounce rate |

Full interactive docs (with example values) are always at **`/docs`** while the backend is running.

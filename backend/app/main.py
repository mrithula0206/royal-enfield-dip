from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import (
    kpis, drilldowns, comparisons, top_bottom, campaign_hygiene, ai_insights, lead_journey,
    reports, master_data,
)

app = FastAPI(
    title="Royal Enfield Digital Intelligence Platform API",
    description="Executive Dashboard, Campaign Hygiene Automation, AI Daily Summary, "
                 "and Lead Journey Intelligence — backed by the synthetic demo workbook.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the frontend's origin before production deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(kpis.router)
app.include_router(drilldowns.router)
app.include_router(comparisons.router)
app.include_router(top_bottom.router)
app.include_router(campaign_hygiene.router)
app.include_router(ai_insights.router)
app.include_router(lead_journey.router)
app.include_router(reports.router)
app.include_router(master_data.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "royal-enfield-dip-api"}


@app.get("/")
def root():
    return {
        "message": "Royal Enfield Digital Intelligence Platform API",
        "docs": "/docs",
        "health": "/api/health",
    }

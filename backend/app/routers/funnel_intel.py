from fastapi import APIRouter
from typing import Optional
from ..logic import load_leads, compute_kpis

router = APIRouter(prefix="/api/funnel", tags=["Funnel Intelligence"])


@router.get("/dropoff")
def dropoff(start: Optional[str] = None, end: Optional[str] = None, region: Optional[str] = None,
            model: Optional[str] = None, source: Optional[str] = None):
    """Stage-by-stage funnel with the count and % lost at each transition —
    pinpoints exactly where leakage happens (Lead->Enquiry, Enquiry->Booking, Booking->Retail)."""
    df = load_leads(start, end, region, model, source)
    k = compute_kpis(df)

    stages = [
        {"stage": "Leads", "value": k["Leads"]},
        {"stage": "Enquiries", "value": k["Enquiries"]},
        {"stage": "Bookings", "value": k["Bookings"]},
        {"stage": "Retail", "value": k["Retail"]},
    ]
    for i in range(1, len(stages)):
        prev, cur = stages[i - 1], stages[i]
        lost = prev["value"] - cur["value"]
        cur["dropped"] = lost
        cur["drop_pct"] = round(lost / prev["value"], 4) if prev["value"] else 0
        cur["carry_pct"] = round(cur["value"] / prev["value"], 4) if prev["value"] else 0
    stages[0]["dropped"] = None
    stages[0]["drop_pct"] = None
    stages[0]["carry_pct"] = 1.0

    worst = max(stages[1:], key=lambda s: s["drop_pct"])

    return {
        "stages": stages,
        "worst_leak_stage": worst["stage"],
        "worst_leak_pct": worst["drop_pct"],
        "kpis": k,
    }

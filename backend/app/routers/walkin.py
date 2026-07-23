from fastapi import APIRouter
from typing import Optional
from ..logic import load_leads, compute_kpis
from ..db import query_df

router = APIRouter(prefix="/api/walkin", tags=["Walk-In Intelligence"])


@router.get("/summary")
def summary(start: Optional[str] = None, end: Optional[str] = None):
    """Walk-in funnel performance and its daily trend, for a before/after uplift read
    (Source = 'Walk-In'; there's no A/B split so this is trend, not a controlled experiment)."""
    df = load_leads(start, end, source="Walk-In")
    all_df = load_leads(start, end)
    k = compute_kpis(df)
    k["Share_of_Total_Leads_pct"] = round(len(df) / len(all_df), 4) if len(all_df) else 0

    trend = query_df(
        "SELECT Created_Date AS Date, COUNT(*) AS Leads, "
        "SUM(CASE WHEN Lead_Status='Booked' THEN 1 ELSE 0 END) AS Bookings "
        "FROM leads WHERE Source = 'Walk-In' GROUP BY Created_Date ORDER BY Created_Date"
    )
    return {"kpis": k, "trend": trend.to_dict(orient="records")}

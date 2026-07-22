from fastapi import APIRouter
from ..db import table_df, query_df

router = APIRouter(prefix="/api/follow-up", tags=["Follow-Up"])


@router.get("/summary")
def summary():
    """Overall follow-up discipline: done/missed/pending rates and average delay."""
    df = table_df("follow_up")
    total = len(df)
    by_status = df.groupby("Status").size().reset_index(name="Count")
    done = df[df.Status == "Done"]
    return {
        "total_follow_ups": int(total),
        "done_rate": round(len(done) / total, 4) if total else 0,
        "avg_delay_days": round(float(done["Delay_Days"].mean()), 2) if len(done) else 0,
        "by_status": by_status.to_dict(orient="records"),
    }


@router.get("/by-status")
def by_status():
    """Follow-up outcomes broken down by the lead's current funnel status."""
    q = """
        SELECT l.Lead_Status,
               COUNT(*) AS Total,
               SUM(CASE WHEN fu.Status='Done' THEN 1 ELSE 0 END) AS Done,
               SUM(CASE WHEN fu.Status='Missed' THEN 1 ELSE 0 END) AS Missed,
               SUM(CASE WHEN fu.Status='Pending' THEN 1 ELSE 0 END) AS Pending,
               AVG(fu.Delay_Days) AS Avg_Delay_Days
        FROM follow_up fu JOIN leads l ON fu.Lead_ID = l.Lead_ID
        GROUP BY l.Lead_Status
    """
    df = query_df(q)
    df["Done_Rate"] = (df["Done"] / df["Total"]).round(4)
    df["Avg_Delay_Days"] = df["Avg_Delay_Days"].round(2)
    return {"rows": df.to_dict(orient="records")}

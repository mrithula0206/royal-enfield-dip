from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import pandas as pd
from ..db import table_df, query_df

router = APIRouter(prefix="/api/campaign-hygiene", tags=["Campaign Hygiene"])

CHECK_COLS = ["OTP_Status", "Form_Status", "CRM_Status", "Landing_Page_Status", "MSD_Push_Status"]


@router.get("/summary")
def hygiene_summary(as_of: Optional[str] = Query(None, description="YYYY-MM-DD; defaults to latest date in data")):
    hygiene = table_df("campaign_hygiene")
    campaigns = table_df("campaign_master")
    if as_of is None:
        as_of = hygiene["Date"].max()

    today = hygiene[hygiene.Date == as_of].merge(
        campaigns[["Campaign_ID", "Campaign_Name", "Campaign_Status"]], on="Campaign_ID", how="left"
    )
    if today.empty:
        raise HTTPException(404, f"No hygiene checks found for {as_of}")

    rows = today.to_dict(orient="records")
    counts = today["Overall_Status"].value_counts().to_dict()
    return {
        "as_of": as_of,
        "total_campaigns": len(rows),
        "pass_count": counts.get("Pass", 0),
        "fail_count": counts.get("Fail", 0),
        "campaigns": rows,
    }


@router.get("/{campaign_id}/history")
def hygiene_history(campaign_id: str, days: int = Query(61, ge=1, le=365)):
    hygiene = table_df("campaign_hygiene")
    sub = hygiene[hygiene.Campaign_ID == campaign_id].sort_values("Date")
    if sub.empty:
        raise HTTPException(404, f"No hygiene data for campaign '{campaign_id}'")
    sub = sub.tail(days)
    return {"campaign_id": campaign_id, "days": len(sub), "history": sub.to_dict(orient="records")}


@router.get("/{campaign_id}/streaks")
def hygiene_streaks(campaign_id: str):
    """Detect consecutive-day failure streaks per check, and overall - powers
    insights like 'Campaign_04 experienced OTP failures for 3 consecutive days.'"""
    hygiene = table_df("campaign_hygiene")
    sub = hygiene[hygiene.Campaign_ID == campaign_id].sort_values("Date").reset_index(drop=True)
    if sub.empty:
        raise HTTPException(404, f"No hygiene data for campaign '{campaign_id}'")

    def longest_streak(series: pd.Series):
        max_run, run, start_idx, best_start = 0, 0, None, None
        for i, v in enumerate(series):
            if v == "Fail":
                if run == 0:
                    start_idx = i
                run += 1
                if run > max_run:
                    max_run, best_start = run, start_idx
            else:
                run = 0
        if max_run == 0:
            return {"max_consecutive_fail_days": 0, "start_date": None, "end_date": None}
        return {
            "max_consecutive_fail_days": max_run,
            "start_date": sub.loc[best_start, "Date"],
            "end_date": sub.loc[best_start + max_run - 1, "Date"],
        }

    streaks = {check: longest_streak(sub[check]) for check in CHECK_COLS}
    streaks["Overall"] = longest_streak(sub["Overall_Status"])
    return {"campaign_id": campaign_id, "streaks": streaks}


@router.get("/status-master")
def status_master():
    return table_df("campaign_status_master").to_dict(orient="records")

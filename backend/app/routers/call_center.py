from fastapi import APIRouter
import pandas as pd
from ..db import table_df, query_df

router = APIRouter(prefix="/api/call-center", tags=["Call Center"])


@router.get("/summary")
def summary():
    """Overall call-center KPIs: connect rate, volume, avg attempts/duration, channel split."""
    calls = table_df("call_log")
    total = len(calls)
    connected = calls[calls.Outcome == "Connected"]
    connect_rate = len(connected) / total if total else 0
    avg_duration = connected["Duration_Sec"].mean() if len(connected) else 0
    leads_called = calls["Lead_ID"].nunique()
    avg_attempts = calls.groupby("Lead_ID")["Attempt_Number"].max().mean()

    channel = calls.groupby("Channel").size().reset_index(name="Calls")
    outcome = calls.groupby("Outcome").size().reset_index(name="Calls")

    return {
        "total_calls": int(total),
        "leads_called": int(leads_called),
        "connect_rate": round(connect_rate, 4),
        "avg_duration_sec_connected": round(float(avg_duration), 1),
        "avg_attempts_per_lead": round(float(avg_attempts), 2),
        "by_channel": channel.to_dict(orient="records"),
        "by_outcome": outcome.to_dict(orient="records"),
    }


@router.get("/by-status")
def by_status():
    """Connect rate and call volume broken down by the lead's current funnel status."""
    q = """
        SELECT l.Lead_Status,
               COUNT(*) AS Calls,
               SUM(CASE WHEN c.Outcome='Connected' THEN 1 ELSE 0 END) AS Connected,
               AVG(c.Duration_Sec) AS Avg_Duration_Sec
        FROM call_log c JOIN leads l ON c.Lead_ID = l.Lead_ID
        GROUP BY l.Lead_Status
    """
    df = query_df(q)
    df["Connect_Rate"] = (df["Connected"] / df["Calls"]).round(4)
    df["Avg_Duration_Sec"] = df["Avg_Duration_Sec"].round(1)
    return {"rows": df.to_dict(orient="records")}


@router.get("/by-dealer")
def by_dealer():
    """Dealer-level call handling: volume + connect rate, joined with dealer name/tier."""
    q = """
        SELECT c.Dealer_ID,
               COUNT(*) AS Calls,
               SUM(CASE WHEN c.Outcome='Connected' THEN 1 ELSE 0 END) AS Connected
        FROM call_log c
        WHERE c.Channel = 'Dealer'
        GROUP BY c.Dealer_ID
    """
    df = query_df(q)
    df["Connect_Rate"] = (df["Connected"] / df["Calls"]).round(4)
    dealers = table_df("dealer_master")[["Dealer_ID", "Dealer_Name", "Tier", "Region"]]
    df = df.merge(dealers, on="Dealer_ID", how="left")
    return {"rows": df.sort_values("Connect_Rate", ascending=False).to_dict(orient="records")}

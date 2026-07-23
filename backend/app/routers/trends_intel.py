from fastapi import APIRouter
import pandas as pd
from ..db import table_df

router = APIRouter(prefix="/api/trends", tags=["Trend Intelligence"])


@router.get("/week-on-week")
def week_on_week():
    """Last complete ISO week vs the one before it, same shape as month-on-month."""
    df = table_df("daily_report").sort_values("Date")
    df["Date"] = pd.to_datetime(df["Date"])
    df["Week"] = df["Date"].dt.to_period("W")

    weekly = df.groupby("Week").agg(
        Leads=("Leads", "sum"), Enquiries=("Enquiries", "sum"), Bookings=("Bookings", "sum"),
        Open_Enquiries=("Open_Enquiries", "sum"), Dropped=("Dropped", "sum"), n_days=("Date", "count"),
    ).reset_index()
    complete = weekly[weekly.n_days == 7]
    if len(complete) < 2:
        complete = weekly  # fall back to whatever partial weeks exist
    complete = complete.sort_values("Week")
    if len(complete) < 2:
        return {"current_week": None, "previous_week": None, "deltas": {}}

    cur, prev = complete.iloc[-1], complete.iloc[-2]

    def pct_delta(c, p):
        return round((c - p) / p, 4) if p else None

    deltas = {k: pct_delta(cur[k], prev[k]) for k in ["Leads", "Enquiries", "Bookings", "Open_Enquiries", "Dropped"]}

    return {
        "current_week": {"label": str(cur["Week"]), "Leads": int(cur.Leads), "Enquiries": int(cur.Enquiries),
                          "Bookings": int(cur.Bookings), "Open_Enquiries": int(cur.Open_Enquiries), "Dropped": int(cur.Dropped)},
        "previous_week": {"label": str(prev["Week"]), "Leads": int(prev.Leads), "Enquiries": int(prev.Enquiries),
                           "Bookings": int(prev.Bookings), "Open_Enquiries": int(prev.Open_Enquiries), "Dropped": int(prev.Dropped)},
        "deltas": deltas,
    }


@router.get("/spike-drop")
def spike_drop(threshold: float = 1.5):
    """Flags days where Leads deviate from the 7-day rolling average by more than
    `threshold` standard deviations — a simple, honest anomaly detector (no ML)."""
    df = table_df("daily_report").sort_values("Date").reset_index(drop=True)
    df["rolling_mean"] = df["Leads"].rolling(7, min_periods=3).mean()
    df["rolling_std"] = df["Leads"].rolling(7, min_periods=3).std()
    df["z"] = (df["Leads"] - df["rolling_mean"]) / df["rolling_std"]
    df["z"] = df["z"].replace([float("inf"), float("-inf")], 0).fillna(0)

    flagged = df[df["z"].abs() >= threshold].copy()
    flagged["type"] = flagged["z"].apply(lambda z: "Spike" if z > 0 else "Drop")
    out = flagged[["Date", "Leads", "rolling_mean", "z", "type"]].rename(columns={"rolling_mean": "Expected_Leads"})
    out["Expected_Leads"] = out["Expected_Leads"].round(1)
    out["z"] = out["z"].round(2)
    return {"threshold": threshold, "flagged": out.to_dict(orient="records")}

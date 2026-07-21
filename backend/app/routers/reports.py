from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import pandas as pd
from ..db import table_df

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/daily-trend")
def daily_trend(
    granularity: str = Query("daily", description="daily | weekly | monthly"),
    days: int = Query(61, ge=1, le=365, description="how many trailing days of daily_report to use as the base window"),
):
    """Leads / Enquiries / Bookings trend, rolled up to the requested granularity."""
    df = table_df("daily_report").sort_values("Date")
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.tail(days)

    if granularity == "daily":
        df["bucket"] = df["Date"].dt.strftime("%Y-%m-%d")
    elif granularity == "weekly":
        df["bucket"] = df["Date"].dt.to_period("W").apply(lambda p: p.start_time.strftime("%Y-%m-%d"))
    elif granularity == "monthly":
        df["bucket"] = df["Date"].dt.strftime("%Y-%m")
    else:
        raise HTTPException(404, "granularity must be one of: daily, weekly, monthly")

    grouped = df.groupby("bucket").agg(
        Leads=("Leads", "sum"), Enquiries=("Enquiries", "sum"), Bookings=("Bookings", "sum"),
        Open_Enquiries=("Open_Enquiries", "sum"), Dropped=("Dropped", "sum"),
    ).reset_index().sort_values("bucket")

    return {"granularity": granularity, "points": grouped.to_dict(orient="records")}


@router.get("/daily-summary")
def daily_summary(date: Optional[str] = Query(None, description="YYYY-MM-DD; defaults to latest date in daily_report")):
    """Single-day auto-generated snapshot: KPI counts plus the top items needing attention,
    drawn from High-severity AI insights and campaigns with active failure streaks."""
    df = table_df("daily_report")
    if date is None:
        date = df["Date"].max()
    row = df[df.Date == date]
    if row.empty:
        raise HTTPException(404, f"No daily report for {date}")
    snapshot = row.iloc[0].to_dict()

    insights = table_df("ai_insights")
    high = insights[insights.Severity == "High"].sort_values("Insight_ID").head(3)
    needs_attention = high["Insight_Text"].tolist()

    return {"date": date, "snapshot": snapshot, "needs_attention": needs_attention}

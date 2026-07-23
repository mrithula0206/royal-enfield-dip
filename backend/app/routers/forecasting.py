from fastapi import APIRouter
import numpy as np
import pandas as pd
from ..db import table_df
from ..logic import load_leads

router = APIRouter(prefix="/api/forecast", tags=["Forecasting"])


def _naive_projection(series: pd.Series, periods_ahead: int) -> dict:
    """Linear trend fit over the available history, projected forward.
    Honest caveat: with ~2 months of data this is a trend line, not a validated forecast."""
    y = series.values.astype(float)
    x = np.arange(len(y))
    if len(y) < 3:
        return {"next_period_total": None, "daily_avg_projected": None, "trend": "insufficient_data"}
    slope, intercept = np.polyfit(x, y, 1)
    future_x = np.arange(len(y), len(y) + periods_ahead)
    projected = slope * future_x + intercept
    projected = np.clip(projected, 0, None)
    trend = "up" if slope > 0.5 else "down" if slope < -0.5 else "flat"
    return {
        "next_period_total": round(float(projected.sum()), 0),
        "daily_avg_projected": round(float(projected.mean()), 1),
        "slope_per_day": round(float(slope), 2),
        "trend": trend,
    }


@router.get("/summary")
def summary():
    """Naive next-30-day trend projection for Leads, Bookings, and Retail, off the daily report."""
    df = table_df("daily_report").sort_values("Date")
    leads_fc = _naive_projection(df["Leads"], 30)
    bookings_fc = _naive_projection(df["Bookings"], 30)

    retail = load_leads()
    retail_by_day = retail[retail.Retail_Status == "Delivered"].groupby("Created_Date").size()
    all_days = pd.date_range(df["Date"].min(), df["Date"].max())
    retail_series = retail_by_day.reindex(all_days.strftime("%Y-%m-%d"), fill_value=0)
    retail_fc = _naive_projection(retail_series, 30)

    return {
        "history_days": len(df),
        "caveat": "Only ~2 months of daily history — this is a trend-line projection, not a validated seasonal forecast.",
        "leads": leads_fc, "bookings": bookings_fc, "retail": retail_fc,
    }


@router.get("/by-region")
def by_region(top_n: int = 8):
    """Region-wise naive lead forecast — flags the fastest-rising and fastest-falling regions."""
    df = load_leads()
    daily = df.groupby(["Created_Date", "Region"]).size().reset_index(name="Leads")
    rows = []
    for region, g in daily.groupby("Region"):
        g = g.sort_values("Created_Date")
        fc = _naive_projection(g["Leads"], 30)
        rows.append({"Region": region, **fc, "Current_Total_Leads": int(g["Leads"].sum())})
    rows = [r for r in rows if r["trend"] != "insufficient_data"]
    rows.sort(key=lambda r: r["slope_per_day"], reverse=True)
    return {"rising": rows[:top_n], "falling": list(reversed(rows[-top_n:]))}

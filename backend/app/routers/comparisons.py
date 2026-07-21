from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import pandas as pd
from ..logic import load_leads, compute_kpis, kpi_deltas, month_bounds
from ..db import table_df, query_df

router = APIRouter(prefix="/api/comparisons", tags=["Comparisons"])


@router.get("/month-on-month")
def month_on_month(
    current_month: str = Query("Jun-2026", description="e.g. 'Jun-2026'"),
    previous_month: str = Query("May-2026", description="e.g. 'May-2026'"),
    region: Optional[str] = None,
    model: Optional[str] = None,
    source: Optional[str] = None,
):
    cur_start, cur_end = month_bounds(current_month)
    prev_start, prev_end = month_bounds(previous_month)

    cur_df = load_leads(cur_start, cur_end, region, model, source)
    prev_df = load_leads(prev_start, prev_end, region, model, source)

    current = compute_kpis(cur_df)
    previous = compute_kpis(prev_df)
    deltas = kpi_deltas(current, previous)

    return {
        "current_period": {"label": current_month, "start": cur_start, "end": cur_end, "kpis": current},
        "previous_period": {"label": previous_month, "start": prev_start, "end": prev_end, "kpis": previous},
        "deltas": deltas,
    }


@router.get("/day-on-day")
def day_on_day(
    current_date: str = Query(..., description="YYYY-MM-DD"),
    previous_date: Optional[str] = Query(None, description="YYYY-MM-DD; defaults to the prior calendar day"),
):
    cur = pd.to_datetime(current_date)
    prev = pd.to_datetime(previous_date) if previous_date else cur - pd.Timedelta(days=1)
    cur_s, prev_s = cur.strftime("%Y-%m-%d"), prev.strftime("%Y-%m-%d")

    cur_df = load_leads(cur_s, cur_s)
    prev_df = load_leads(prev_s, prev_s)

    current = compute_kpis(cur_df)
    previous = compute_kpis(prev_df)
    deltas = kpi_deltas(current, previous)

    return {
        "current_day": {"date": cur_s, "kpis": current},
        "previous_day": {"date": prev_s, "kpis": previous},
        "deltas": deltas,
    }


@router.get("/target-vs-actual")
def target_vs_actual(
    level: str = Query("region", description="region | model | source"),
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    table_map = {
        "region": ("targets_region", "Region"),
        "model": ("targets_model", "Model"),
        "source": ("targets_source", "Source"),
    }
    if level not in table_map:
        raise HTTPException(404, "level must be one of: region, model, source")

    target_table, key_col = table_map[level]
    targets = table_df(target_table)

    df = load_leads(start, end)
    actual_leads = df.groupby(key_col).size()
    actual_bookings = df[df.Lead_Status == "Booked"].groupby(key_col).size()
    actual_enq = df[df.Enquiry_Flag == "Yes"].groupby(key_col).size()

    rows = []
    for _, t in targets.iterrows():
        key = t[key_col]
        al = int(actual_leads.get(key, 0))
        ab = int(actual_bookings.get(key, 0))
        ae = int(actual_enq.get(key, 0))
        row = {
            key_col: key,
            "Lead_Target": int(t["Lead_Target"]),
            "Lead_Actual": al,
            "Lead_Achievement_pct": round(al / t["Lead_Target"], 4) if t["Lead_Target"] else 0,
            "Booking_Target": int(t["Booking_Target"]),
            "Booking_Actual": ab,
            "Booking_Achievement_pct": round(ab / t["Booking_Target"], 4) if t["Booking_Target"] else 0,
            "E2B_Target": float(t["E2B_Target"]),
            "E2B_Actual": round(ab / ae, 4) if ae else 0,
        }
        rows.append(row)

    rows.sort(key=lambda r: r["Booking_Achievement_pct"], reverse=True)
    return {"level": level, "rows": rows}

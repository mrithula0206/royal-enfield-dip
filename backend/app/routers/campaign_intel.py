from fastapi import APIRouter
from typing import Optional
import pandas as pd
from ..logic import load_leads, drilldown
from ..db import table_df

router = APIRouter(prefix="/api/campaign-intelligence", tags=["Campaign Intelligence"])


@router.get("/ranked")
def ranked(n: int = 5, min_leads: int = 20):
    """Best and worst campaigns by L2B%, with a floor on lead volume so tiny samples don't rank."""
    df = load_leads()
    rows = drilldown(df, "Campaign_ID")
    rows = [r for r in rows if r["Leads"] >= min_leads]
    rows_sorted = sorted(rows, key=lambda r: r["L2B_pct"], reverse=True)
    master = table_df("campaign_master").set_index("Campaign_ID")

    def enrich(r):
        if r["Campaign_ID"] in master.index:
            info = master.loc[r["Campaign_ID"]]
            r["Campaign_Name"] = info["Campaign_Name"]
            r["Model"] = info["Model"]
        return r

    top = [enrich(r) for r in rows_sorted[:n]]
    bottom = [enrich(r) for r in reversed(rows_sorted[-n:])] if len(rows_sorted) >= n else []
    return {"top": top, "bottom": bottom}


@router.get("/cost-efficiency")
def cost_efficiency():
    """CPL and Cost-per-Booking using Campaign_Master.Budget as an allocated-spend proxy,
    with a wastage flag for campaigns spending well above the fleet-average cost per booking."""
    df = load_leads()
    rows = drilldown(df, "Campaign_ID")
    funnel = {r["Campaign_ID"]: r for r in rows}
    master = table_df("campaign_master")

    out = []
    for _, c in master.iterrows():
        f = funnel.get(c["Campaign_ID"], {"Leads": 0, "Bookings": 0})
        leads, bookings = f["Leads"], f["Bookings"]
        cpl = round(c["Budget"] / leads, 2) if leads else None
        cpb = round(c["Budget"] / bookings, 2) if bookings else None
        out.append({
            "Campaign_ID": c["Campaign_ID"], "Campaign_Name": c["Campaign_Name"], "Budget": c["Budget"],
            "Leads": leads, "Bookings": bookings, "CPL": cpl, "Cost_Per_Booking": cpb,
        })

    valid_cpb = [o["Cost_Per_Booking"] for o in out if o["Cost_Per_Booking"]]
    avg_cpb = sum(valid_cpb) / len(valid_cpb) if valid_cpb else 0
    for o in out:
        o["Wastage_Flag"] = bool(o["Cost_Per_Booking"] and avg_cpb and o["Cost_Per_Booking"] > avg_cpb * 1.5)
    out.sort(key=lambda o: (o["Cost_Per_Booking"] is None, -(o["Cost_Per_Booking"] or 0)))
    return {"avg_cost_per_booking": round(avg_cpb, 2), "rows": out}


@router.get("/impact")
def impact():
    """Leads/day inside each campaign's active window vs. leads/day in an equal-length
    window immediately before it started — a before/after read, not a controlled experiment."""
    master = table_df("campaign_master")
    leads = table_df("leads")
    leads["Created_Date"] = pd.to_datetime(leads["Created_Date"])

    out = []
    for _, c in master.iterrows():
        cstart, cend = pd.to_datetime(c["Campaign_Start_Date"]), pd.to_datetime(c["Campaign_End_Date"])
        duration = max((cend - cstart).days + 1, 1)
        pre_start = cstart - pd.Timedelta(days=duration)
        pre_end = cstart - pd.Timedelta(days=1)

        during = leads[(leads.Campaign_ID == c["Campaign_ID"]) & (leads.Created_Date >= cstart) & (leads.Created_Date <= cend)]
        before = leads[(leads.Campaign_ID == c["Campaign_ID"]) & (leads.Created_Date >= pre_start) & (leads.Created_Date <= pre_end)]

        during_per_day = round(len(during) / duration, 2)
        before_per_day = round(len(before) / duration, 2)
        uplift_pct = round((during_per_day - before_per_day) / before_per_day, 4) if before_per_day else None

        out.append({
            "Campaign_ID": c["Campaign_ID"], "Campaign_Name": c["Campaign_Name"],
            "Duration_Days": duration, "Leads_During": len(during), "Leads_Before": len(before),
            "Leads_Per_Day_During": during_per_day, "Leads_Per_Day_Before": before_per_day,
            "Uplift_pct": uplift_pct,
        })
    out.sort(key=lambda o: (o["Uplift_pct"] is None, -(o["Uplift_pct"] or -999)))
    return {"rows": out}

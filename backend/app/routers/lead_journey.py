from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import math
import pandas as pd
from ..db import table_df
from ..logic import load_leads

router = APIRouter(prefix="/api/lead-journey", tags=["Lead Journey"])


def clean_nan(d: dict) -> dict:
    """Replace pandas/NumPy NaN with None so FastAPI can JSON-encode the dict."""
    out = {}
    for k, v in d.items():
        if isinstance(v, float) and math.isnan(v):
            out[k] = None
        else:
            out[k] = v
    return out


@router.get("/velocity")
def journey_velocity(by: str = Query("region", description="region | dealer | model")):
    """Stage-wise conversion speed (Lead->Enquiry, Enquiry->Booking, Booking->Retail),
    grouped by region/dealer/model, with a slow-pipeline flag on the worst quartile."""
    col_map = {"region": "Region", "dealer": "Dealer_ID", "model": "Model"}
    if by not in col_map:
        raise HTTPException(404, "by must be one of: region, dealer, model")
    col = col_map[by]

    leads = table_df("leads").copy()
    for c in ["Created_Date", "Enquiry_Date", "Booking_Date"]:
        leads[c] = pd.to_datetime(leads[c], errors="coerce")
    leads["L2E_Days"] = (leads["Enquiry_Date"] - leads["Created_Date"]).dt.days
    leads["E2B_Days"] = (leads["Booking_Date"] - leads["Enquiry_Date"]).dt.days

    history = table_df("lead_history")
    retail_events = history[history.Remarks == "Retail Delivered"][["Lead_ID", "Event_Date"]]
    retail_events = retail_events.rename(columns={"Event_Date": "Retail_Date"})
    leads = leads.merge(retail_events, on="Lead_ID", how="left")
    leads["Retail_Date"] = pd.to_datetime(leads["Retail_Date"], errors="coerce")
    leads["B2R_Days"] = (leads["Retail_Date"] - leads["Booking_Date"]).dt.days

    grp = leads.groupby(col).agg(
        Avg_L2E_Days=("L2E_Days", "mean"), Avg_E2B_Days=("E2B_Days", "mean"), Avg_B2R_Days=("B2R_Days", "mean"),
        Leads=("Lead_ID", "count"),
    ).reset_index()
    for c in ["Avg_L2E_Days", "Avg_E2B_Days", "Avg_B2R_Days"]:
        grp[c] = grp[c].round(1)
    grp["Total_Cycle_Days"] = (grp["Avg_L2E_Days"].fillna(0) + grp["Avg_E2B_Days"].fillna(0) + grp["Avg_B2R_Days"].fillna(0)).round(1)

    threshold = grp["Total_Cycle_Days"].quantile(0.75)
    grp["Slow_Pipeline"] = grp["Total_Cycle_Days"] >= threshold
    grp = grp.sort_values("Total_Cycle_Days", ascending=False)

    rows = grp.to_dict(orient="records")
    for r in rows:
        for k, v in list(r.items()):
            if isinstance(v, float) and math.isnan(v):
                r[k] = None
    return {"by": by, "rows": rows}


@router.get("/metrics/summary")
def journey_metrics_summary(start: Optional[str] = None, end: Optional[str] = None):
    """Aggregate lead-journey metrics: avg lead age, avg conversion time,
    dealer-transfer rate, drop-reason mix, retail conversion, bounce rate."""
    df = load_leads(start, end)
    history = table_df("lead_history")

    booked = df[df.Lead_Status == "Booked"]
    avg_lead_age = round(df["Lead_Age_Days"].mean(), 1) if len(df) else 0

    # conversion time needs the full Booking_Date/Created_Date, pull from leads table directly
    leads_full = table_df("leads")
    booked_full = leads_full[leads_full.Lead_ID.isin(booked.Lead_ID)]
    conv_times = (pd.to_datetime(booked_full.Booking_Date) - pd.to_datetime(booked_full.Created_Date)).dt.days
    avg_conversion_time = round(conv_times.mean(), 1) if len(conv_times) else None

    transfer_events = history[history.Remarks == "Dealer Transfer - workload balancing"]
    dealer_transfer_rate = round(transfer_events.Lead_ID.nunique() / df.Lead_ID.nunique(), 4) if len(df) else 0

    dropped = df[df.Lead_Status == "Dropped"]
    drop_reasons = {
        "No response after multiple follow-ups": int((dropped.Enquiry_Flag == "No").sum()),
        "Customer opted out / lost to competition": int((dropped.Enquiry_Flag == "Yes").sum()),
    }

    retail_conversion = round((leads_full.Retail_Status == "Delivered").sum() / len(booked_full), 4) \
        if len(booked_full) else 0

    # bounce = New Lead that never progressed (proxy for lost-at-first-touch)
    bounce_rate = round((df.Lead_Status == "New Lead").sum() / len(df), 4) if len(df) else 0

    return {
        "Avg_Lead_Age_Days": avg_lead_age,
        "Avg_Conversion_Time_Days": avg_conversion_time,
        "Dealer_Transfer_Rate": dealer_transfer_rate,
        "Drop_Reasons": drop_reasons,
        "Retail_Conversion_pct": retail_conversion,
        "Bounce_Rate_pct": bounce_rate,
    }


@router.get("/{lead_id}")
def get_lead_journey(lead_id: str):
    """Full lifecycle timeline for a single lead: creation, status transitions,
    dealer transfers, and any retail/invoice events, in chronological order."""
    leads = table_df("leads")
    lead = leads[leads.Lead_ID == lead_id]
    if lead.empty:
        raise HTTPException(404, f"Lead '{lead_id}' not found")
    lead = clean_nan(lead.iloc[0].to_dict())

    history = table_df("lead_history")
    events = history[history.Lead_ID == lead_id].sort_values("Event_Date")

    timeline = [{
        "Event_Date": lead["Created_Date"],
        "Event": "Lead Created",
        "Status": "New Lead",
        "Detail": f"Captured via {lead['Source']} for {lead['Model']}",
    }]
    for _, e in events.iterrows():
        e = clean_nan(e.to_dict())
        label = e["Remarks"] if e["Remarks"] else f"{e['Old_Status']} -> {e['New_Status']}"
        timeline.append({
            "Event_Date": e["Event_Date"],
            "Event": label,
            "Status": e["New_Status"],
            "Detail": (f"Dealer transfer: {e['Old_Dealer']} -> {e['New_Dealer']}"
                       if e.get("Old_Dealer") else e["Remarks"]),
        })

    conversion_time_days = None
    if lead.get("Booking_Date") and lead.get("Created_Date"):
        conversion_time_days = (pd.to_datetime(lead["Booking_Date"]) - pd.to_datetime(lead["Created_Date"])).days

    dealer_transfers = int((history[history.Lead_ID == lead_id]["Remarks"] == "Dealer Transfer - workload balancing").sum())

    return {
        "lead": lead,
        "metrics": {
            "Lead_Age_Days": lead["Lead_Age_Days"],
            "Conversion_Time_Days": conversion_time_days,
            "Dealer_Transfers": dealer_transfers,
            "Retail_Status": lead.get("Retail_Status") or "Not Booked",
        },
        "timeline": timeline,
    }


@router.get("")
def search_leads(
    mobile: Optional[str] = None,
    customer_name: Optional[str] = None,
    dealer_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
):
    leads = table_df("leads")
    if mobile:
        leads = leads[leads.Mobile_Number.astype(str).str.contains(mobile)]
    if customer_name:
        leads = leads[leads.Customer_Name.str.contains(customer_name, case=False, na=False)]
    if dealer_id:
        leads = leads[leads.Dealer_ID == dealer_id]
    cols = ["Lead_ID", "Customer_Name", "Mobile_Number", "Region", "Dealer_ID", "Model",
            "Source", "Lead_Status", "Created_Date"]
    return leads[cols].head(limit).to_dict(orient="records")

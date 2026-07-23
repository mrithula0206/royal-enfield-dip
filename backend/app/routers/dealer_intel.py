from fastapi import APIRouter
from typing import Optional
from ..logic import load_leads
from ..db import table_df

router = APIRouter(prefix="/api/dealer-intelligence", tags=["Dealer Intelligence"])


@router.get("/summary")
def summary(start: Optional[str] = None, end: Optional[str] = None):
    """Active/inactive status, lead->booking and booking->retail leakage, and
    performance vs each dealer's own region average — over/under/at-par."""
    df = load_leads(start, end)
    all_dealers = table_df("dealer_master")[["Dealer_ID", "Dealer_Name", "Region", "City", "Tier"]]

    grp = df.groupby("Dealer_ID").agg(
        Leads=("Lead_ID", "count"),
        Bookings=("Lead_Status", lambda s: (s == "Booked").sum()),
        Retail=("Retail_Status", lambda s: (s == "Delivered").sum()),
    ).reset_index()
    grp["L2B_pct"] = (grp["Bookings"] / grp["Leads"]).round(4)
    grp["Lead_No_Booking_Leakage"] = grp["Leads"] - grp["Bookings"]
    grp["Booking_No_Retail_Leakage"] = grp["Bookings"] - grp["Retail"]

    merged = all_dealers.merge(grp, on="Dealer_ID", how="left")
    merged[["Leads", "Bookings", "Retail", "Lead_No_Booking_Leakage", "Booking_No_Retail_Leakage"]] = \
        merged[["Leads", "Bookings", "Retail", "Lead_No_Booking_Leakage", "Booking_No_Retail_Leakage"]].fillna(0)
    merged["L2B_pct"] = merged["L2B_pct"].fillna(0)
    merged["Active"] = merged["Leads"] > 0

    region_avg = merged[merged.Leads > 0].groupby("Region")["L2B_pct"].mean().to_dict()

    def vs_region(row):
        avg = region_avg.get(row["Region"])
        if avg is None or row["Leads"] == 0:
            return "N/A"
        if row["L2B_pct"] > avg * 1.1:
            return "Over"
        if row["L2B_pct"] < avg * 0.9:
            return "Under"
        return "At Par"

    merged["Region_Avg_L2B_pct"] = merged["Region"].map(region_avg).fillna(0).round(4)
    merged["Vs_Region"] = merged.apply(vs_region, axis=1)

    for col in ["Leads", "Bookings", "Retail", "Lead_No_Booking_Leakage", "Booking_No_Retail_Leakage"]:
        merged[col] = merged[col].astype(int)

    merged = merged.sort_values("Leads", ascending=False)
    return {
        "active_count": int(merged["Active"].sum()),
        "inactive_count": int((~merged["Active"]).sum()),
        "rows": merged.to_dict(orient="records"),
    }

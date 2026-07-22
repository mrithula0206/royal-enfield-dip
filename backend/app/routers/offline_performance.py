from fastapi import APIRouter
from ..db import table_df

router = APIRouter(prefix="/api/offline", tags=["Offline Channels"])


def _with_derived(df):
    df = df.copy()
    df["CPL"] = df.apply(lambda r: round(r["Spend"] / r["Leads_Generated"], 2) if r["Leads_Generated"] else 0, axis=1)
    df["L2B_pct"] = df.apply(lambda r: round(r["Bookings_Generated"] / r["Leads_Generated"], 4) if r["Leads_Generated"] else 0, axis=1)
    return df


@router.get("/summary")
def summary():
    """TV / Print / OOH spend, leads, bookings and CPL — offline media channel comparison."""
    df = table_df("offline_channel_performance")
    grp = df.groupby("Channel").agg(
        Spend=("Spend", "sum"), Leads_Generated=("Leads_Generated", "sum"), Bookings_Generated=("Bookings_Generated", "sum"),
    ).reset_index()
    grp = _with_derived(grp)

    totals = {
        "spend": round(float(df["Spend"].sum()), 2), "leads": int(df["Leads_Generated"].sum()),
        "bookings": int(df["Bookings_Generated"].sum()),
    }
    return {"totals": totals, "by_channel": grp.sort_values("Spend", ascending=False).to_dict(orient="records")}


@router.get("/by-region")
def by_region():
    """Offline media performance broken down by region, joined with State/Zone."""
    df = table_df("offline_channel_performance")
    grp = df.groupby("Region").agg(
        Spend=("Spend", "sum"), Leads_Generated=("Leads_Generated", "sum"), Bookings_Generated=("Bookings_Generated", "sum"),
    ).reset_index()
    grp = _with_derived(grp)
    region_info = table_df("region_master")[["Region", "State", "Zone"]]
    grp = grp.merge(region_info, on="Region", how="left")
    return {"rows": grp.sort_values("Spend", ascending=False).to_dict(orient="records")}

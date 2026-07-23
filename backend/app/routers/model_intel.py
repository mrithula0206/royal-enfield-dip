from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..logic import load_leads, drilldown
from ..db import table_df

router = APIRouter(prefix="/api/model-intelligence", tags=["Model Intelligence"])


@router.get("/cross")
def cross(dim: str = Query("zone", description="zone | region | city"),
          start: Optional[str] = None, end: Optional[str] = None):
    """Model demand cross-tabbed against Zone, Region, or dealer City."""
    df = load_leads(start, end).copy()
    if dim == "zone":
        region_zone = table_df("region_master").set_index("Region")["Zone"].to_dict()
        df["dim"] = df["Region"].map(region_zone)
    elif dim == "region":
        df["dim"] = df["Region"]
    elif dim == "city":
        dealer_city = table_df("dealer_master").set_index("Dealer_ID")["City"].to_dict()
        df["dim"] = df["Dealer_ID"].map(dealer_city)
    else:
        raise HTTPException(404, "dim must be one of: zone, region, city")

    grouped = df.groupby(["Model", "dim"]).agg(
        Leads=("Lead_ID", "count"),
        Bookings=("Lead_Status", lambda s: (s == "Booked").sum()),
    ).reset_index()
    grouped["L2B_pct"] = (grouped["Bookings"] / grouped["Leads"]).round(4)
    grouped = grouped.rename(columns={"dim": dim.capitalize()})

    dims = sorted(grouped[dim.capitalize()].dropna().unique().tolist())
    models = sorted(grouped["Model"].unique().tolist())
    return {"dimension": dim, "dims": dims, "models": models, "rows": grouped.to_dict(orient="records")}


@router.get("/dropoff")
def dropoff(start: Optional[str] = None, end: Optional[str] = None):
    """Flags models with above-average lead volume but below-average L2B% — high visibility, weak conversion."""
    df = load_leads(start, end)
    rows = drilldown(df, "Model")
    if not rows:
        return {"rows": [], "avg_leads": 0, "avg_l2b_pct": 0}
    avg_leads = sum(r["Leads"] for r in rows) / len(rows)
    avg_l2b = sum(r["L2B_pct"] for r in rows) / len(rows)
    for r in rows:
        r["Above_Avg_Leads"] = r["Leads"] > avg_leads
        r["Below_Avg_L2B"] = r["L2B_pct"] < avg_l2b
        r["Flagged"] = r["Above_Avg_Leads"] and r["Below_Avg_L2B"]
    rows.sort(key=lambda r: (not r["Flagged"], -r["Leads"]))
    return {"rows": rows, "avg_leads": round(avg_leads, 1), "avg_l2b_pct": round(avg_l2b, 4)}

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from ..logic import load_leads, drilldown
from ..db import table_df

router = APIRouter(prefix="/api/drilldowns", tags=["Drilldowns"])

DIMENSION_MAP = {
    "region": "Region",
    "dealer": "Dealer_ID",
    "model": "Model",
    "source": "Source",
    "campaign": "Campaign_ID",
}


@router.get("/{dimension}")
def get_drilldown(
    dimension: str,
    start: Optional[str] = None,
    end: Optional[str] = None,
    region: Optional[str] = None,
    model: Optional[str] = None,
    source: Optional[str] = None,
):
    """dimension: region | dealer | model | source | campaign | affiliate"""
    dim = "source" if dimension == "affiliate" else dimension
    if dim not in DIMENSION_MAP:
        raise HTTPException(404, f"Unknown dimension '{dimension}'. Use one of: "
                                  f"{list(DIMENSION_MAP.keys()) + ['affiliate']}")
    col = DIMENSION_MAP[dim]
    df = load_leads(start, end, region, model, source)

    if dimension == "affiliate":
        aff_sources = table_df("source_master")
        aff_sources = aff_sources[aff_sources.Source_Category == "Affiliate"].Source.tolist()
        df = df[df.Source.isin(aff_sources)]

    rows = drilldown(df, col)

    # enrich with master data (name/region/tier for dealer, zone/band for region, etc.)
    if dim == "dealer":
        master = table_df("dealer_master").set_index("Dealer_ID")
        for r in rows:
            info = master.loc[r["Dealer_ID"]] if r["Dealer_ID"] in master.index else None
            if info is not None:
                r["Dealer_Name"] = info["Dealer_Name"]
                r["Region"] = info["Region"]
                r["Tier"] = info["Tier"]
    elif dim == "region":
        master = table_df("region_master").set_index("Region")
        for r in rows:
            info = master.loc[r["Region"]] if r["Region"] in master.index else None
            if info is not None:
                r["Zone"] = info["Zone"]
                r["Performance_Band"] = info["Performance_Band"]
    elif dim == "campaign":
        master = table_df("campaign_master").set_index("Campaign_ID")
        for r in rows:
            if r["Campaign_ID"] in master.index:
                info = master.loc[r["Campaign_ID"]]
                r["Campaign_Name"] = info["Campaign_Name"]
                r["Campaign_Status"] = info["Campaign_Status"]

    return {"dimension": dimension, "count": len(rows), "rows": rows}

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from ..logic import load_leads, top_bottom
from ..db import table_df

router = APIRouter(prefix="/api/top-bottom", tags=["Top / Bottom"])

DIMENSION_MAP = {"dealers": "Dealer_ID", "regions": "Region", "models": "Model"}


@router.get("/{dimension}")
def get_top_bottom(
    dimension: str,
    metric: str = Query("L2B_pct", description="L2B_pct | E2B_pct | Bookings | Leads"),
    n: int = Query(10, ge=1, le=50),
    min_leads: int = Query(20, ge=0),
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    if dimension not in DIMENSION_MAP:
        raise HTTPException(404, f"dimension must be one of {list(DIMENSION_MAP.keys())}")
    col = DIMENSION_MAP[dimension]
    df = load_leads(start, end)
    result = top_bottom(df, col, metric=metric, n=n, min_leads=min_leads)

    if dimension == "dealers":
        master = table_df("dealer_master").set_index("Dealer_ID")
        for bucket in ("top", "bottom"):
            for r in result[bucket]:
                if r["Dealer_ID"] in master.index:
                    info = master.loc[r["Dealer_ID"]]
                    r["Dealer_Name"] = info["Dealer_Name"]
                    r["Region"] = info["Region"]
                    r["Tier"] = info["Tier"]

    return {"dimension": dimension, "metric": metric, **result}

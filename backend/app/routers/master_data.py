from fastapi import APIRouter, HTTPException
from ..db import table_df

router = APIRouter(prefix="/api/master-data", tags=["Master Data"])

TABLE_MAP = {
    "region": "region_master",
    "dealer": "dealer_master",
    "model": "model_master",
    "source": "source_master",
    "campaign": "campaign_master",
}


@router.get("/{entity}")
def get_master(entity: str):
    if entity not in TABLE_MAP:
        raise HTTPException(404, f"entity must be one of: {list(TABLE_MAP.keys())}")
    df = table_df(TABLE_MAP[entity])
    return {"entity": entity, "count": len(df), "rows": df.to_dict(orient="records")}

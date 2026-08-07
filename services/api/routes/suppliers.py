from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from tinydb import Query as TinyQuery

from database import get_db
from models import (
    CountryEnum,
    SupplierCreate,
    SupplierRatePatch,
    SupplierResponse,
    SupplierStatusPatch,
    SupplierStored,
)
from security import get_current_user

router = APIRouter(tags=["suppliers"], dependencies=[Depends(get_current_user)])


def _to_response(doc_id: int, doc: dict) -> SupplierResponse:
    return SupplierResponse(id=doc_id, **doc)


@router.post("/supplier", response_model=SupplierResponse, status_code=201)
def create_supplier(payload: SupplierCreate) -> SupplierResponse:
    db = get_db()
    stored = SupplierStored(**payload.model_dump())
    doc_id = db.insert(stored.model_dump(mode="json"))
    created = db.get(doc_id=doc_id)
    return _to_response(doc_id, dict(created))


@router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers(
    country: CountryEnum | None = Query(default=None),
    category: str | None = Query(default=None),
) -> list[SupplierResponse]:
    db = get_db()
    docs = db.all()

    result: list[SupplierResponse] = []
    for doc in docs:
        data = dict(doc)
        if country and data.get("country") != country.value:
            continue
        if category and category not in data.get("categories", []):
            continue
        result.append(_to_response(doc.doc_id, data))

    return result


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int) -> SupplierResponse:
    db = get_db()
    doc = db.get(doc_id=supplier_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return _to_response(supplier_id, dict(doc))


@router.patch("/suppliers/{supplier_id}/rate", response_model=SupplierResponse)
@router.patch("/sppliers/{supplier_id}/rate", response_model=SupplierResponse)
def patch_supplier_rate(supplier_id: int, payload: SupplierRatePatch) -> SupplierResponse:
    db = get_db()
    doc = db.get(doc_id=supplier_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Supplier not found")

    db.update(
        {
            "rate_per_unit": payload.rate_per_unit,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        doc_ids=[supplier_id],
    )

    updated = db.get(doc_id=supplier_id)
    return _to_response(supplier_id, dict(updated))


@router.patch("/suppliers/{supplier_id}/status", response_model=SupplierResponse)
def patch_supplier_status(supplier_id: int, payload: SupplierStatusPatch) -> SupplierResponse:
    db = get_db()
    doc = db.get(doc_id=supplier_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Supplier not found")

    db.update({"status": payload.status.value}, doc_ids=[supplier_id])
    updated = db.get(doc_id=supplier_id)
    return _to_response(supplier_id, dict(updated))


@router.delete("/suppliers")
def delete_by_query(name: str) -> dict[str, str]:
    """Internal helper endpoint not exposed in docs by default usage.

    Kept to support occasional cleanup in demos when needed.
    """
    db = get_db()
    q = TinyQuery()
    if not db.contains(q.name == name):
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.remove(q.name == name)
    return {"message": "Supplier deleted"}


@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int) -> dict[str, str]:
    db = get_db()
    doc = db.get(doc_id=supplier_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Supplier not found")

    db.remove(doc_ids=[supplier_id])
    return {"message": "Supplier deleted"}

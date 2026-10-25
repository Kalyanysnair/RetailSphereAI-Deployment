from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, defer
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import random
import string
import json

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/quality", tags=["Quality Control & Rework"])


# --- PYDANTIC SCHEMAS ---

class QualityInspectionCreatePayload(BaseModel):
    order_type: str  # Custom / Fabrication / Readymade
    order_id: int
    stage_id: Optional[int] = None
    inspector_id: Optional[int] = None
    result: str  # PASS / FAIL
    dimensions_check: bool = True
    finishing_check: bool = True
    structure_check: bool = True
    specifications_check: bool = True
    material_check: bool = True
    functionality_check: bool = True
    fabrication_check: bool = True
    customer_specs_check: bool = True
    checklist_details: Optional[Dict[str, Any]] = None
    inspection_notes: Optional[str] = None
    photos: Optional[str] = None
    rework_worker_id: Optional[int] = None
    rework_reason: Optional[str] = None
    responsible_team: Optional[str] = None
    is_repeat: bool = False
    rework_ticket_id: Optional[int] = None


class CustomerReworkRequestPayload(BaseModel):
    order_type: str  # Custom / Fabrication
    order_id: int
    issue_description: str
    reported_issue_type: Optional[str] = "Quality Defect"
    evidence_photos: Optional[str] = None
    preferred_transport: Optional[str] = "STORE_DROP_OFF"  # STORE_DROP_OFF / CARRIER_PARTNER / INTERNAL_FLEET


class ResponsibilityAssessmentPayload(BaseModel):
    responsibility_type: str  # RETAILSPHERE_ERROR / CUSTOMER_CHANGE / UNCLEAR_DISPUTED
    responsibility_notes: str
    required_changes: Optional[str] = None
    transportation_mode: Optional[str] = "INTERNAL_FLEET"  # INTERNAL_FLEET / CARRIER_PARTNER / STORE_DROP_OFF
    carrier_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None


class DisputeResolutionPayload(BaseModel):
    resolution: str  # RETAILSPHERE_ERROR / CUSTOMER_CHANGE
    resolution_notes: str


class QuotationCreatePayload(BaseModel):
    material_cost: float = 0.0
    labour_cost: float = 0.0
    machine_cost: float = 0.0
    finishing_cost: float = 0.0
    transportation_cost: float = 0.0
    notes: Optional[str] = None
    estimated_duration: Optional[str] = "2-3 business days"


class CustomerDecisionPayload(BaseModel):
    decision: str  # APPROVE / REJECT
    notes: Optional[str] = None
    selected_transport: Optional[str] = None  # STORE_DROP_OFF / CARRIER_PARTNER


class ReworkPaymentPayload(BaseModel):
    payment_reference: Optional[str] = None
    payment_method: Optional[str] = "Online Payment"
    amount: Optional[float] = None


class AssignWorkerPayload(BaseModel):
    assigned_worker_id: int
    assigned_supervisor_id: Optional[int] = None
    instructions: Optional[str] = None


class ReworkResolvePayload(BaseModel):
    notes: Optional[str] = None


class ReworkDispatchPayload(BaseModel):
    transportation_mode: Optional[str] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    carrier_id: Optional[int] = None
    tracking_number: Optional[str] = None
    dispatch_notes: Optional[str] = None


# --- HELPER FUNCTIONS ---

def generate_ticket_code(db: Session) -> str:
    year = datetime.utcnow().year
    while True:
        rand_suffix = "".join(random.choices(string.digits, k=4))
        code = f"RWK-{year}-{rand_suffix}"
        exists = db.query(models.ReworkJob).filter(models.ReworkJob.ticket_code == code).first()
        if not exists:
            return code


def is_authorized_inspector(user: models.User, db: Optional[Session] = None) -> bool:
    if not user:
        return False
    try:
        if user.role and user.role.role_name:
            role_name = user.role.role_name.strip().lower()
            return role_name in ["retail staff", "admin", "quality inspector", "supervisor"]
    except Exception:
        pass
    if getattr(user, "role_id", None):
        if db:
            role_obj = db.query(models.Role).filter(models.Role.role_id == user.role_id).first()
            if role_obj:
                return role_obj.role_name.strip().lower() in ["retail staff", "admin", "quality inspector", "supervisor"]
        if user.role_id in [1, 4]:  # Standard Admin and Retail Staff role IDs
            return True
    return False


def get_order_approved_specs(order_type: str, order_id: int, db: Session) -> Dict[str, Any]:
    ot_clean = order_type.strip().capitalize()
    if ot_clean in ["Custom", "Customization"]:
        ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
        if not ord_obj:
            return {}
        cust = ord_obj.customer
        cust_user = cust.user if cust else None
        return {
            "order_type": "Custom",
            "order_id": ord_obj.custom_order_id,
            "title": ord_obj.furniture_type,
            "dimensions": ord_obj.dimensions,
            "material": ord_obj.material,
            "color": ord_obj.color,
            "design_description": ord_obj.design_description or "",
            "reference_image": ord_obj.reference_image or "",
            "estimated_price": float(ord_obj.estimated_price or 0.0),
            "customer_id": ord_obj.customer_id,
            "customer_name": cust_user.full_name if cust_user else "Valued Customer",
            "customer_email": cust_user.email if cust_user else "",
            "customer_phone": cust_user.phone if cust_user else (cust.phone if cust else "")
        }
    elif ot_clean == "Fabrication":
        fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == order_id).first()
        if not fab_obj:
            return {}
        cust = fab_obj.customer
        cust_user = cust.user if cust else None
        return {
            "order_type": "Fabrication",
            "order_id": fab_obj.fabrication_id,
            "title": fab_obj.service_type,
            "dimensions": fab_obj.dimensions,
            "quantity": fab_obj.quantity,
            "material_source": fab_obj.material_source,
            "requirements": fab_obj.requirements or "",
            "drawing_image": fab_obj.drawing_image or "",
            "cutting_layout": fab_obj.cutting_layout or "",
            "estimated_price": float(fab_obj.estimated_price or 0.0),
            "customer_id": fab_obj.customer_id,
            "customer_name": cust_user.full_name if cust_user else "Valued Customer",
            "customer_email": cust_user.email if cust_user else "",
            "customer_phone": cust_user.phone if cust_user else (cust.phone if cust else "")
        }
    return {}


# --- ENDPOINTS ---

# 1. GET /api/quality/jobs: All Customisation and Fabrication jobs in QC or Production Completion pipeline
@router.get("/jobs")
def get_quality_control_jobs(
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns all Customisation and Fabrication jobs that have completed workshop stages
    or are in the QC / Rework pipeline. Excludes ready-made retail orders.
    """
    results = []

    # Pre-fetch lookup tables in bulk to eliminate remote PostgreSQL N+1 latency
    from collections import defaultdict
    all_stages = db.query(models.ProductionStage).all()
    stages_by_job = defaultdict(list)
    for s in all_stages:
        stages_by_job[((s.order_type or '').strip().capitalize(), s.order_id)].append(s)
    for k in stages_by_job:
        stages_by_job[k].sort(key=lambda x: x.sequence_order or 0)

    all_inspections = db.query(models.QualityInspection).options(defer(models.QualityInspection.photos)).order_by(models.QualityInspection.inspected_at.desc()).all()
    inspections_by_job = defaultdict(list)
    for insp in all_inspections:
        inspections_by_job[((insp.order_type or '').strip().capitalize(), insp.order_id)].append(insp)

    all_reworks = db.query(models.ReworkJob).options(defer(models.ReworkJob.evidence_photos), defer(models.ReworkJob.approved_specifications)).order_by(models.ReworkJob.created_at.desc()).all()
    reworks_by_job = defaultdict(list)
    for rw in all_reworks:
        reworks_by_job[((rw.order_type or '').strip().capitalize(), rw.order_id)].append(rw)

    all_users = {u.user_id: u for u in db.query(models.User).all()}
    all_customers = {c.customer_id: c for c in db.query(models.Customer).all()}

    # 1. Custom Orders
    custom_orders = db.query(models.CustomOrder).options(
        defer(models.CustomOrder.reference_image),
        defer(models.CustomOrder.design_description)
    ).all()
    for c in custom_orders:
        st = (c.order_status or "").strip()
        st_upper = st.upper()

        # Check production stages from in-memory cache
        stages = stages_by_job.get(("Custom", c.custom_order_id), [])
        stages_completed = len(stages) > 0 and all(s.status == "COMPLETED" for s in stages)

        # Check inspections and rework tickets from in-memory cache
        inspections = inspections_by_job.get(("Custom", c.custom_order_id), [])
        reworks = reworks_by_job.get(("Custom", c.custom_order_id), [])

        # Eligible if reached QC_PENDING, COMPLETED, stages completed, or has inspections/reworks
        in_qc_pipeline = (
            st_upper in ["QC_PENDING", "QC PENDING", "QC_PASSED", "QC_FAILED", "REWORK_REQUIRED", "REWORK_IN_PROGRESS", "REWORK_COMPLETED", "READY_FOR_PACKING", "PACKED", "READY_FOR_DISPATCH", "DISPATCHED", "COMPLETED"]
            or stages_completed
            or len(inspections) > 0
            or len(reworks) > 0
        )

        if not in_qc_pipeline:
            continue

        latest_insp = inspections[0] if inspections else None
        active_rework = reworks[0] if reworks else None

        # Determine logical QC status
        qc_status = "QC_PENDING"
        if st_upper in ["DISPATCHED"]:
            qc_status = "DISPATCHED"
        elif st_upper in ["READY_FOR_DISPATCH", "PACKED"]:
            qc_status = "READY_FOR_DISPATCH"
        elif active_rework and active_rework.status == "REWORK_COMPLETED":
            qc_status = "REWORK_COMPLETED"
        elif active_rework and active_rework.status in ["REWORK_IN_PROGRESS", "RECEIVED_AT_STORE", "AWAITING_PICKUP", "AWAITING_CUSTOMER_DECISION", "UNDER_ASSESSMENT", "OPEN"]:
            qc_status = "REWORK_IN_PROGRESS"
        elif latest_insp:
            if latest_insp.result == "PASS":
                qc_status = "QC_PASSED"
            else:
                qc_status = "QC_FAILED"
        elif st_upper in ["QC_PENDING", "QC PENDING"]:
            qc_status = "QC_PENDING"

        # Production supervisor/staff
        prod_staff_user = all_users.get(c.production_staff_id) if c.production_staff_id else None
        prod_staff_name = prod_staff_user.full_name if prod_staff_user else "Production Supervisor"

        cust_obj = all_customers.get(c.customer_id)
        cust_user = all_users.get(cust_obj.user_id) if (cust_obj and cust_obj.user_id) else None
        customer_name = cust_user.full_name if cust_user else "Valued Customer"
        customer_email = cust_user.email if cust_user else ""
        customer_phone = cust_user.phone if (cust_user and cust_user.phone) else (cust_obj.phone if (cust_obj and cust_obj.phone) else "")

        # Format latest inspection
        latest_insp_dict = None
        if latest_insp:
            insp_user = all_users.get(latest_insp.inspector_id)
            insp_user_name = insp_user.full_name if insp_user else "QC Inspector"
            chk_details = {}
            if latest_insp.checklist_details:
                try:
                    chk_details = json.loads(latest_insp.checklist_details) if isinstance(latest_insp.checklist_details, str) else latest_insp.checklist_details
                except Exception:
                    pass
            latest_insp_dict = {
                "inspection_id": latest_insp.inspection_id,
                "inspector_id": latest_insp.inspector_id,
                "inspector_name": insp_user_name,
                "result": latest_insp.result,
                "checklist": {
                    "dimensions": latest_insp.dimensions_check,
                    "finishing": latest_insp.finishing_check,
                    "structure": latest_insp.structure_check,
                    "specifications": latest_insp.specifications_check,
                    "material": latest_insp.material_check,
                    "functionality": latest_insp.functionality_check,
                    "fabrication": latest_insp.fabrication_check,
                    "customer_specs": latest_insp.customer_specs_check,
                },
                "checklist_details": chk_details,
                "inspection_notes": latest_insp.inspection_notes or "",
                "photos": latest_insp.photos or "",
                "inspected_at": latest_insp.inspected_at.isoformat() if latest_insp.inspected_at else None
            }

        # Format active rework ticket
        rework_dict = None
        if active_rework:
            w_user = all_users.get(active_rework.assigned_worker_id) if active_rework.assigned_worker_id else None
            w_user_name = w_user.full_name if w_user else "Artisan Worker"
            rework_dict = {
                "rework_id": active_rework.rework_id,
                "ticket_code": active_rework.ticket_code or f"RWK-{active_rework.rework_id:04d}",
                "status": active_rework.status,
                "source": active_rework.source,
                "responsibility_type": active_rework.responsibility_type,
                "rework_reason": active_rework.rework_reason,
                "required_changes": active_rework.required_changes or "",
                "transportation_mode": active_rework.transportation_mode,
                "additional_cost": float(active_rework.additional_cost or 0.0),
                "quotation_status": active_rework.quotation_status,
                "payment_status": active_rework.payment_status,
                "assigned_worker_name": w_user_name,
                "created_at": active_rework.created_at.isoformat() if active_rework.created_at else None
            }

        can_dispatch = (latest_insp is not None and latest_insp.result == "PASS" and (not active_rework or active_rework.status in ["QC_PASSED", "CLOSED", "READY_FOR_DISPATCH"]))
        dispatch_blocked = not can_dispatch
        dispatch_block_reason = None
        if dispatch_blocked:
            if qc_status == "QC_PENDING":
                dispatch_block_reason = "Inspection pending: QC inspection must be completed and passed before packing and dispatch."
            elif qc_status == "QC_FAILED":
                dispatch_block_reason = "QC inspection failed: Active rework required before item can be dispatched."
            elif qc_status == "REWORK_IN_PROGRESS":
                dispatch_block_reason = "Rework in progress: Workshop must complete rework and item must pass repeat QC."
            elif qc_status == "REWORK_COMPLETED":
                dispatch_block_reason = "Repeat QC required: Rework is finished but item must pass repeat QC before dispatch."
            else:
                dispatch_block_reason = "QC verification required prior to dispatch."

        results.append({
            "job_id": f"CUS-{c.custom_order_id:04d}",
            "numeric_id": c.custom_order_id,
            "order_type": "Custom",
            "customer_id": c.customer_id,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "job_title": c.furniture_type,
            "specifications": {
                "dimensions": c.dimensions,
                "material": c.material,
                "color": c.color,
                "design_description": "",
                "reference_image": "",
                "estimated_price": float(c.estimated_price or 0.0)
            },
            "production_status": c.order_status,
            "production_staff_name": prod_staff_name,
            "completion_date": stages[-1].completed_at.isoformat() if (stages and stages[-1].completed_at) else (c.order_date.isoformat() if c.order_date else None),
            "qc_status": qc_status,
            "latest_inspection": latest_insp_dict,
            "active_rework_ticket": rework_dict,
            "can_dispatch": can_dispatch,
            "dispatch_blocked": dispatch_blocked,
            "dispatch_block_reason": dispatch_block_reason
        })

    # 2. Fabrication Requests
    fabs = db.query(models.FabricationRequest).options(
        defer(models.FabricationRequest.drawing_image),
        defer(models.FabricationRequest.cutting_layout),
        defer(models.FabricationRequest.requirements)
    ).all()
    for f in fabs:
        fst = (f.status or "").strip()
        fst_upper = fst.upper()

        stages = stages_by_job.get(("Fabrication", f.fabrication_id), [])
        stages_completed = len(stages) > 0 and all(s.status == "COMPLETED" for s in stages)

        inspections = inspections_by_job.get(("Fabrication", f.fabrication_id), [])
        reworks = reworks_by_job.get(("Fabrication", f.fabrication_id), [])

        in_qc_pipeline = (
            fst_upper in ["QC_PENDING", "QC PENDING", "QC_PASSED", "QC_FAILED", "REWORK_REQUIRED", "REWORK_IN_PROGRESS", "REWORK_COMPLETED", "READY_FOR_PACKING", "PACKED", "READY_FOR_DISPATCH", "DISPATCHED", "COMPLETED"]
            or stages_completed
            or len(inspections) > 0
            or len(reworks) > 0
        )

        if not in_qc_pipeline:
            continue

        latest_insp = inspections[0] if inspections else None
        active_rework = reworks[0] if reworks else None

        qc_status = "QC_PENDING"
        if fst_upper in ["DISPATCHED"]:
            qc_status = "DISPATCHED"
        elif fst_upper in ["READY_FOR_DISPATCH", "PACKED"]:
            qc_status = "READY_FOR_DISPATCH"
        elif active_rework and active_rework.status == "REWORK_COMPLETED":
            qc_status = "REWORK_COMPLETED"
        elif active_rework and active_rework.status in ["REWORK_IN_PROGRESS", "RECEIVED_AT_STORE", "AWAITING_PICKUP", "AWAITING_CUSTOMER_DECISION", "UNDER_ASSESSMENT", "OPEN"]:
            qc_status = "REWORK_IN_PROGRESS"
        elif latest_insp:
            if latest_insp.result == "PASS":
                qc_status = "QC_PASSED"
            else:
                qc_status = "QC_FAILED"
        elif fst_upper in ["QC_PENDING", "QC PENDING"]:
            qc_status = "QC_PENDING"

        cust_obj = all_customers.get(f.customer_id)
        cust_user = all_users.get(cust_obj.user_id) if (cust_obj and cust_obj.user_id) else None
        customer_name = cust_user.full_name if cust_user else "Valued Customer"
        customer_email = cust_user.email if cust_user else ""
        customer_phone = cust_user.phone if (cust_user and cust_user.phone) else (cust_obj.phone if (cust_obj and cust_obj.phone) else "")

        latest_insp_dict = None
        if latest_insp:
            insp_user = all_users.get(latest_insp.inspector_id)
            insp_user_name = insp_user.full_name if insp_user else "QC Inspector"
            chk_details = {}
            if latest_insp.checklist_details:
                try:
                    chk_details = json.loads(latest_insp.checklist_details) if isinstance(latest_insp.checklist_details, str) else latest_insp.checklist_details
                except Exception:
                    pass
            latest_insp_dict = {
                "inspection_id": latest_insp.inspection_id,
                "inspector_id": latest_insp.inspector_id,
                "inspector_name": insp_user_name,
                "result": latest_insp.result,
                "checklist": {
                    "dimensions": latest_insp.dimensions_check,
                    "finishing": latest_insp.finishing_check,
                    "structure": latest_insp.structure_check,
                    "specifications": latest_insp.specifications_check,
                    "material": latest_insp.material_check,
                    "functionality": latest_insp.functionality_check,
                    "fabrication": latest_insp.fabrication_check,
                    "customer_specs": latest_insp.customer_specs_check,
                },
                "checklist_details": chk_details,
                "inspection_notes": latest_insp.inspection_notes or "",
                "photos": latest_insp.photos or "",
                "inspected_at": latest_insp.inspected_at.isoformat() if latest_insp.inspected_at else None
            }

        rework_dict = None
        if active_rework:
            w_user = all_users.get(active_rework.assigned_worker_id) if active_rework.assigned_worker_id else None
            w_user_name = w_user.full_name if w_user else "Artisan Worker"
            rework_dict = {
                "rework_id": active_rework.rework_id,
                "ticket_code": active_rework.ticket_code or f"RWK-{active_rework.rework_id:04d}",
                "status": active_rework.status,
                "source": active_rework.source,
                "responsibility_type": active_rework.responsibility_type,
                "rework_reason": active_rework.rework_reason,
                "required_changes": active_rework.required_changes or "",
                "transportation_mode": active_rework.transportation_mode,
                "additional_cost": float(active_rework.additional_cost or 0.0),
                "quotation_status": active_rework.quotation_status,
                "payment_status": active_rework.payment_status,
                "assigned_worker_name": w_user_name,
                "created_at": active_rework.created_at.isoformat() if active_rework.created_at else None
            }

        can_dispatch = (latest_insp is not None and latest_insp.result == "PASS" and (not active_rework or active_rework.status in ["QC_PASSED", "CLOSED", "READY_FOR_DISPATCH"]))
        dispatch_blocked = not can_dispatch
        dispatch_block_reason = None
        if dispatch_blocked:
            if qc_status == "QC_PENDING":
                dispatch_block_reason = "Inspection pending: QC inspection must be completed and passed before packing and dispatch."
            elif qc_status == "QC_FAILED":
                dispatch_block_reason = "QC inspection failed: Active rework required before item can be dispatched."
            elif qc_status == "REWORK_IN_PROGRESS":
                dispatch_block_reason = "Rework in progress: Workshop must complete rework and item must pass repeat QC."
            elif qc_status == "REWORK_COMPLETED":
                dispatch_block_reason = "Repeat QC required: Rework is finished but item must pass repeat QC before dispatch."
            else:
                dispatch_block_reason = "QC verification required prior to dispatch."

        results.append({
            "job_id": f"FAB-{f.fabrication_id:04d}",
            "numeric_id": f.fabrication_id,
            "order_type": "Fabrication",
            "customer_id": f.customer_id,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "job_title": f.service_type,
            "specifications": {
                "dimensions": f.dimensions,
                "quantity": f.quantity,
                "material_source": f.material_source,
                "requirements": "",
                "drawing_image": "",
                "cutting_layout": "",
                "estimated_price": float(f.estimated_price or 0.0)
            },
            "production_status": f.status,
            "production_staff_name": "Fabrication Lead Specialist",
            "completion_date": stages[-1].completed_at.isoformat() if (stages and stages[-1].completed_at) else (f.created_at.isoformat() if f.created_at else None),
            "qc_status": qc_status,
            "latest_inspection": latest_insp_dict,
            "active_rework_ticket": rework_dict,
            "can_dispatch": can_dispatch,
            "dispatch_blocked": dispatch_blocked,
            "dispatch_block_reason": dispatch_block_reason
        })

    return results


# 2. GET /api/quality/inspections: Inspection records
@router.get("/inspections")
def get_inspections(
    order_type: Optional[str] = None,
    order_id: Optional[int] = None,
    result: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.QualityInspection)
    if order_type:
        query = query.filter(models.QualityInspection.order_type.ilike(order_type))
    if order_id:
        query = query.filter(models.QualityInspection.order_id == order_id)
    if result:
        query = query.filter(models.QualityInspection.result == result.upper())

    inspections = query.order_by(models.QualityInspection.inspected_at.desc()).all()

    res = []
    for i in inspections:
        insp_user = db.query(models.User).filter(models.User.user_id == i.inspector_id).first()
        chk_details = {}
        if i.checklist_details:
            try:
                chk_details = json.loads(i.checklist_details) if isinstance(i.checklist_details, str) else i.checklist_details
            except Exception:
                pass

        res.append({
            "inspection_id": i.inspection_id,
            "order_type": i.order_type,
            "order_id": i.order_id,
            "stage_id": i.stage_id,
            "inspector_id": i.inspector_id,
            "inspector_name": insp_user.full_name if insp_user else "QC Lead Inspector",
            "result": i.result,
            "checklist": {
                "dimensions": i.dimensions_check,
                "finishing": i.finishing_check,
                "structure": i.structure_check,
                "specifications": i.specifications_check,
                "material": i.material_check,
                "functionality": i.functionality_check,
                "fabrication": i.fabrication_check,
                "customer_specs": i.customer_specs_check,
            },
            "checklist_details": chk_details,
            "inspection_notes": i.inspection_notes or "",
            "photos": i.photos or "",
            "rework_ticket_id": i.rework_ticket_id,
            "inspected_at": i.inspected_at.isoformat() if i.inspected_at else None
        })
    return res


# 3. POST /api/quality/inspections: Record QC inspection (Pass or Fail)
@router.post("/inspections", status_code=status.HTTP_201_CREATED)
def record_quality_inspection(
    payload: QualityInspectionCreatePayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    # Enforce role permission: Only Retail Staff or Admin can perform QC inspections
    acting_user = current_user
    if acting_user and not is_authorized_inspector(acting_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Only Retail Staff and Admin are permitted to record Quality Control inspections."
        )

    # Derive inspector identity automatically from authenticated session
    valid_inspector_id = acting_user.user_id if acting_user else (payload.inspector_id or 1)
    insp_user = db.query(models.User).filter(models.User.user_id == valid_inspector_id).first()
    if not insp_user:
        insp_fallback = db.query(models.User).filter(models.User.role_id.in_([2, 3, 1])).first()
        valid_inspector_id = insp_fallback.user_id if insp_fallback else 1

    res_upper = payload.result.strip().upper()
    if res_upper not in ["PASS", "FAIL"]:
        raise HTTPException(status_code=400, detail="QC result must be either 'PASS' or 'FAIL'")

    # Serialize checklist details
    chk_str = None
    if payload.checklist_details:
        chk_str = json.dumps(payload.checklist_details)

    # 1. Create the QualityInspection record (always preserved, never overwritten)
    insp = models.QualityInspection(
        order_type=payload.order_type,
        order_id=payload.order_id,
        stage_id=payload.stage_id,
        inspector_id=valid_inspector_id,
        result=res_upper,
        dimensions_check=payload.dimensions_check,
        finishing_check=payload.finishing_check,
        structure_check=payload.structure_check,
        specifications_check=payload.specifications_check,
        material_check=payload.material_check,
        functionality_check=payload.functionality_check,
        fabrication_check=payload.fabrication_check,
        customer_specs_check=payload.customer_specs_check,
        checklist_details=chk_str,
        inspection_notes=payload.inspection_notes,
        photos=payload.photos,
        rework_ticket_id=payload.rework_ticket_id,
        inspected_at=datetime.utcnow()
    )
    db.add(insp)
    db.commit()
    db.refresh(insp)

    rework_ticket_obj = None

    if res_upper == "PASS":
        # Handle successful QC inspection
        if payload.order_type.strip().capitalize() in ["Custom", "Customization"]:
            ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.order_id).first()
            if ord_obj:
                ord_obj.order_status = "Completed"
                # Add completion progress entry
                qc_prog = models.ProductionProgress(
                    custom_order_id=ord_obj.custom_order_id,
                    updated_by=valid_inspector_id,
                    stage="Completed (QC Passed)",
                    progress_percentage=100,
                    remarks="Quality Control inspection passed. Order completed and permitted for dispatch.",
                    updated_at=datetime.utcnow()
                )
                db.add(qc_prog)
        elif payload.order_type.strip().capitalize() == "Fabrication":
            fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.order_id).first()
            if fab_obj:
                fab_obj.status = "COMPLETED"

        # If this is a repeat QC for a linked rework ticket
        if payload.rework_ticket_id:
            rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == payload.rework_ticket_id).first()
            if rw:
                rw.repeat_inspection_id = insp.inspection_id
                rw.status = "QC_PASSED"
                # If RetailSphere responsibility case: set ready for internal fleet redelivery
                if rw.responsibility_type == "RETAILSPHERE_ERROR":
                    rw.status = "READY_FOR_DISPATCH"
                elif rw.responsibility_type == "CUSTOMER_CHANGE":
                    rw.status = "READY_FOR_DISPATCH"
                rework_ticket_obj = rw

        db.commit()
        try:
            from app.routers.production import invalidate_custom_orders_cache
            invalidate_custom_orders_cache()
        except Exception:
            pass

    elif res_upper == "FAIL":
        # Handle failed QC inspection: Automatically create or update Rework Ticket
        ot_norm = "Custom" if payload.order_type.strip().capitalize() in ["Custom", "Customization"] else "Fabrication"

        # Update order status to QC_FAILED / REWORK_REQUIRED
        cust_id = None
        approved_specs = get_order_approved_specs(ot_norm, payload.order_id, db)
        cust_id = approved_specs.get("customer_id")

        if ot_norm == "Custom":
            ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.order_id).first()
            if ord_obj:
                ord_obj.order_status = "REWORK_REQUIRED"
        elif ot_norm == "Fabrication":
            fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.order_id).first()
            if fab_obj:
                fab_obj.status = "REWORK_REQUIRED"

        # Identify failed checks
        failed_checks = []
        if not payload.dimensions_check:
            failed_checks.append("Dimensions & Measurements")
        if not payload.specifications_check:
            failed_checks.append("Approved Design Specifications")
        if not payload.material_check:
            failed_checks.append("Material Type & Quality")
        if not payload.finishing_check:
            failed_checks.append("Finish & Surface Quality")
        if not payload.structure_check:
            failed_checks.append("Structural Stability & Assembly")
        if not payload.functionality_check:
            failed_checks.append("Functionality & Workmanship")
        if not payload.fabrication_check:
            failed_checks.append("Fabrication Precision")
        if not payload.customer_specs_check:
            failed_checks.append("Customer-Specific Requirements")

        failed_summary = ", ".join(failed_checks) if failed_checks else "Defects detected during QC audit"
        reason = payload.inspection_notes or f"QC Inspection Failed. Non-compliant items: {failed_summary}."

        # If already linked to rework ticket, update repeat QC history
        if payload.rework_ticket_id:
            rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == payload.rework_ticket_id).first()
            if rw:
                rw.repeat_inspection_id = insp.inspection_id
                rw.status = "REWORK_REQUIRED"
                rw.rework_reason = f"Repeat QC Failed: {reason}"
                rw.required_changes = failed_summary
                rework_ticket_obj = rw
        else:
            # Check for existing OPEN ticket for this job to avoid duplicate incidents
            existing_rw = db.query(models.ReworkJob).filter(
                models.ReworkJob.order_type == ot_norm,
                models.ReworkJob.order_id == payload.order_id,
                ~models.ReworkJob.status.in_(["CLOSED", "CANCELLED", "QC_PASSED", "RESOLVED"])
            ).first()

            if existing_rw:
                existing_rw.inspection_id = insp.inspection_id
                existing_rw.status = "OPEN"
                existing_rw.rework_reason = reason
                existing_rw.required_changes = failed_summary
                existing_rw.evidence_photos = payload.photos or existing_rw.evidence_photos
                insp.rework_ticket_id = existing_rw.rework_id
                rework_ticket_obj = existing_rw
            else:
                ticket_code = generate_ticket_code(db)
                new_rw = models.ReworkJob(
                    ticket_code=ticket_code,
                    inspection_id=insp.inspection_id,
                    order_type=ot_norm,
                    order_id=payload.order_id,
                    customer_id=cust_id,
                    source="QC_FAILURE",
                    approved_specifications=json.dumps(approved_specs) if approved_specs else None,
                    issue_description=reason,
                    evidence_photos=payload.photos,
                    responsibility_type="RETAILSPHERE_ERROR",  # Factory QC failure is RetailSphere responsibility
                    responsibility_notes="Auto-classified as RetailSphere Production Error due to internal QC failure.",
                    rework_reason=reason,
                    required_changes=failed_summary,
                    transportation_mode="INTERNAL_FLEET",
                    additional_cost=0.0,
                    quotation_status="NOT_APPLICABLE",
                    payment_status="NOT_REQUIRED",
                    assigned_worker_id=payload.rework_worker_id,
                    status="OPEN",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_rw)
                db.commit()
                db.refresh(new_rw)
                insp.rework_ticket_id = new_rw.rework_id
                rework_ticket_obj = new_rw

        db.commit()

    return {
        "message": f"Quality inspection recorded: {insp.result}",
        "inspection_id": insp.inspection_id,
        "result": insp.result,
        "rework_ticket_id": insp.rework_ticket_id,
        "rework_ticket_code": rework_ticket_obj.ticket_code if rework_ticket_obj else None
    }


# 4. GET /api/quality/rework: List Rework Jobs / Tickets
@router.get("/rework")
@router.get("/rework-tickets")
def get_rework_jobs(
    status_filter: Optional[str] = None,
    order_type: Optional[str] = None,
    customer_id: Optional[int] = None,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(models.ReworkJob)

    # Role Security: If customer, only return customer's own tickets
    if current_user and current_user.role and current_user.role.role_name.strip().lower() == "customer":
        cust_profile = current_user.customer_profile
        if cust_profile:
            query = query.filter(models.ReworkJob.customer_id == cust_profile.customer_id)
        else:
            return []

    if status_filter and status_filter != "All":
        query = query.filter(models.ReworkJob.status == status_filter)
    if order_type and order_type != "All":
        query = query.filter(models.ReworkJob.order_type.ilike(order_type))
    if customer_id:
        query = query.filter(models.ReworkJob.customer_id == customer_id)

    jobs = query.options(defer(models.ReworkJob.evidence_photos)).order_by(models.ReworkJob.created_at.desc()).all()

    # Pre-fetch lookup tables in bulk to eliminate remote roundtrips per row
    all_users = {u.user_id: u for u in db.query(models.User).all()}
    all_vehicles = {v.vehicle_id: v for v in db.query(models.Vehicle).all()}
    all_carriers = {c.carrier_id: c for c in db.query(models.CarrierPartner).all()}

    res = []
    for r in jobs:
        insp = r.inspection
        repeat_insp = r.repeat_inspection
        worker = all_users.get(r.assigned_worker_id) if r.assigned_worker_id else None
        supervisor = all_users.get(r.assigned_supervisor_id) if r.assigned_supervisor_id else None
        assessed_by = all_users.get(r.assessed_by_id) if r.assessed_by_id else None
        vehicle = all_vehicles.get(r.vehicle_id) if r.vehicle_id else None
        carrier = all_carriers.get(r.carrier_id) if r.carrier_id else None

        cust = r.customer
        cust_user = cust.user if cust else None

        # Parse approved specs
        specs_dict = {}
        if r.approved_specifications:
            try:
                specs_dict = json.loads(r.approved_specifications) if isinstance(r.approved_specifications, str) else r.approved_specifications
            except Exception:
                pass
        if not specs_dict:
            specs_dict = get_order_approved_specs(r.order_type or "Custom", r.order_id or 0, db)

        res.append({
            "rework_id": r.rework_id,
            "ticket_code": r.ticket_code or f"RWK-{r.rework_id:04d}",
            "inspection_id": r.inspection_id,
            "repeat_inspection_id": r.repeat_inspection_id,
            "order_type": r.order_type or "Custom",
            "order_id": r.order_id or 0,
            "display_order_id": f"CUS-{r.order_id:04d}" if r.order_type == "Custom" else f"FAB-{r.order_id:04d}",
            "customer_id": r.customer_id,
            "customer_name": cust_user.full_name if cust_user else "Valued Customer",
            "customer_email": cust_user.email if cust_user else "",
            "customer_phone": cust_user.phone if cust_user else "",
            "source": r.source or "QC_FAILURE",
            "approved_specifications": specs_dict,
            "issue_description": r.issue_description or r.rework_reason,
            "evidence_photos": r.evidence_photos or (insp.photos if insp else None),
            "responsibility_type": r.responsibility_type or "UNDER_ASSESSMENT",
            "responsibility_notes": r.responsibility_notes or "",
            "assessed_by_name": assessed_by.full_name if assessed_by else None,
            "assessed_at": r.assessed_at.isoformat() if r.assessed_at else None,
            "rework_reason": r.rework_reason,
            "required_changes": r.required_changes or "",
            "transportation_mode": r.transportation_mode or "INTERNAL_FLEET",
            "transportation_cost": float(r.transportation_cost or 0.0),
            "additional_cost": float(r.additional_cost or 0.0),
            "quotation_status": r.quotation_status or "NOT_APPLICABLE",
            "quotation_notes": r.quotation_notes or "",
            "payment_status": r.payment_status or "NOT_REQUIRED",
            "payment_reference": r.payment_reference,
            "assigned_worker_id": r.assigned_worker_id,
            "worker_name": worker.full_name if worker else "Unassigned Artisan",
            "assigned_supervisor_name": supervisor.full_name if supervisor else None,
            "vehicle_code": f"VH-{vehicle.vehicle_id:03d} ({vehicle.registration_number})" if vehicle else None,
            "carrier_name": carrier.carrier_name if carrier else None,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
            "initial_inspection_result": insp.result if insp else None,
            "repeat_inspection_result": repeat_insp.result if repeat_insp else None
        })
    return res


# 5. GET /api/quality/rework/{rework_id}: Single Ticket Details
@router.get("/rework/{rework_id}")
def get_rework_ticket_details(
    rework_id: int,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == rework_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    # Customer security check
    if current_user and current_user.role and current_user.role.role_name.strip().lower() == "customer":
        cust = current_user.customer_profile
        if not cust or rw.customer_id != cust.customer_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to this rework ticket.")

    quote = db.query(models.QuotationBreakdown).filter(
        models.QuotationBreakdown.order_type == "Rework",
        models.QuotationBreakdown.order_id == rework_id
    ).order_by(models.QuotationBreakdown.version.desc()).first()

    insp = rw.inspection
    repeat_insp = rw.repeat_inspection
    worker = db.query(models.User).filter(models.User.user_id == rw.assigned_worker_id).first() if rw.assigned_worker_id else None
    cust_user = rw.customer.user if (rw.customer and rw.customer.user) else None

    specs_dict = {}
    if rw.approved_specifications:
        try:
            specs_dict = json.loads(rw.approved_specifications) if isinstance(rw.approved_specifications, str) else rw.approved_specifications
        except Exception:
            pass
    if not specs_dict:
        specs_dict = get_order_approved_specs(rw.order_type or "Custom", rw.order_id or 0, db)

    return {
        "rework_id": rw.rework_id,
        "ticket_code": rw.ticket_code or f"RWK-{rw.rework_id:04d}",
        "order_type": rw.order_type,
        "order_id": rw.order_id,
        "customer_id": rw.customer_id,
        "customer_name": cust_user.full_name if cust_user else "Valued Customer",
        "customer_email": cust_user.email if cust_user else "",
        "customer_phone": cust_user.phone if cust_user else "",
        "source": rw.source,
        "approved_specifications": specs_dict,
        "issue_description": rw.issue_description,
        "evidence_photos": rw.evidence_photos,
        "responsibility_type": rw.responsibility_type,
        "responsibility_notes": rw.responsibility_notes,
        "rework_reason": rw.rework_reason,
        "required_changes": rw.required_changes,
        "transportation_mode": rw.transportation_mode,
        "transportation_cost": float(rw.transportation_cost or 0.0),
        "additional_cost": float(rw.additional_cost or 0.0),
        "quotation_status": rw.quotation_status,
        "quotation_notes": rw.quotation_notes,
        "payment_status": rw.payment_status,
        "payment_reference": rw.payment_reference,
        "worker_name": worker.full_name if worker else "Unassigned Artisan",
        "status": rw.status,
        "created_at": rw.created_at.isoformat() if rw.created_at else None,
        "quotation_breakdown": {
            "material_cost": float(quote.material_cost or 0.0),
            "labour_cost": float(quote.labour_cost or 0.0),
            "machine_cost": float(quote.machine_cost or 0.0),
            "finishing_cost": float(quote.finishing_cost or 0.0),
            "transportation_cost": float(quote.transportation_cost or 0.0),
            "total_amount": float(quote.total_amount or 0.0),
            "notes": quote.notes,
            "version": quote.version
        } if quote else None,
        "initial_inspection": {
            "inspection_id": insp.inspection_id,
            "result": insp.result,
            "notes": insp.inspection_notes,
            "inspected_at": insp.inspected_at.isoformat() if insp.inspected_at else None
        } if insp else None,
        "repeat_inspection": {
            "inspection_id": repeat_insp.inspection_id,
            "result": repeat_insp.result,
            "notes": repeat_insp.inspection_notes,
            "inspected_at": repeat_insp.inspected_at.isoformat() if repeat_insp.inspected_at else None
        } if repeat_insp else None
    }


# 6. POST /api/quality/rework/customer-request: Customer submits rework request after delivery
@router.post("/rework/customer-request", status_code=status.HTTP_201_CREATED)
def submit_customer_rework_request(
    payload: CustomerReworkRequestPayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    ot_norm = "Custom" if payload.order_type.strip().capitalize() in ["Custom", "Customization"] else "Fabrication"

    # Fetch original approved specs
    approved_specs = get_order_approved_specs(ot_norm, payload.order_id, db)
    if not approved_specs:
        raise HTTPException(status_code=404, detail="Order not found to request rework")

    cust_id = approved_specs.get("customer_id")

    # Check for active existing ticket
    existing_ticket = db.query(models.ReworkJob).filter(
        models.ReworkJob.order_type == ot_norm,
        models.ReworkJob.order_id == payload.order_id,
        ~models.ReworkJob.status.in_(["CLOSED", "CANCELLED", "QC_PASSED", "RESOLVED"])
    ).first()

    if existing_ticket:
        raise HTTPException(
            status_code=400,
            detail=f"An active rework ticket ({existing_ticket.ticket_code}) is already open for this job. Duplicate requests are prevented."
        )

    ticket_code = generate_ticket_code(db)
    rework = models.ReworkJob(
        ticket_code=ticket_code,
        order_type=ot_norm,
        order_id=payload.order_id,
        customer_id=cust_id,
        source="CUSTOMER_REQUEST",
        approved_specifications=json.dumps(approved_specs),
        issue_description=payload.issue_description,
        evidence_photos=payload.evidence_photos,
        responsibility_type="UNDER_ASSESSMENT",
        responsibility_notes="Customer reported post-delivery defect. Awaiting Retail Staff / Admin assessment.",
        rework_reason=f"[{payload.reported_issue_type}] {payload.issue_description}",
        required_changes="To be determined during technical responsibility assessment",
        transportation_mode=payload.preferred_transport or "STORE_DROP_OFF",
        additional_cost=0.0,
        quotation_status="NOT_APPLICABLE",
        payment_status="NOT_REQUIRED",
        status="UNDER_ASSESSMENT",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(rework)
    db.commit()
    db.refresh(rework)

    return {
        "message": f"Rework request submitted successfully. Ticket ID: {rework.ticket_code}",
        "ticket_code": rework.ticket_code,
        "rework_id": rework.rework_id,
        "status": rework.status
    }


# 7. POST /api/quality/rework/{ticket_id}/assess: Responsibility assessment by Retail Staff / Admin
@router.post("/rework/{ticket_id}/assess")
def assess_rework_responsibility(
    ticket_id: int,
    payload: ResponsibilityAssessmentPayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    acting_user = current_user
    if acting_user and not is_authorized_inspector(acting_user):
        raise HTTPException(status_code=403, detail="Unauthorized: Only Retail Staff and Admin can record responsibility assessments.")

    resp_type = payload.responsibility_type.strip().upper()
    if resp_type not in ["RETAILSPHERE_ERROR", "CUSTOMER_CHANGE", "UNCLEAR_DISPUTED"]:
        raise HTTPException(status_code=400, detail="Invalid responsibility assessment type")

    valid_staff_id = acting_user.user_id if acting_user else 1

    rw.responsibility_type = resp_type
    rw.responsibility_notes = payload.responsibility_notes
    rw.assessed_by_id = valid_staff_id
    rw.assessed_at = datetime.utcnow()
    if payload.required_changes:
        rw.required_changes = payload.required_changes
    rw.updated_at = datetime.utcnow()

    if resp_type == "RETAILSPHERE_ERROR":
        # Free rework: no charges
        rw.additional_cost = 0.0
        rw.quotation_status = "NOT_APPLICABLE"
        rw.payment_status = "NOT_REQUIRED"
        rw.transportation_mode = "INTERNAL_FLEET"

        # Check actual internal fleet availability
        available_vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.status == "AVAILABLE"
        ).first()

        if available_vehicle:
            rw.vehicle_id = available_vehicle.vehicle_id
            rw.driver_id = available_vehicle.assigned_driver_id
            available_vehicle.status = "ASSIGNED"
            rw.status = "AWAITING_PICKUP"
        else:
            # Fleet unavailable: Do not invent availability or charge customer
            rw.status = "AWAITING_PICKUP"  # Shown in dashboard as awaiting fleet availability

    elif resp_type == "CUSTOMER_CHANGE":
        # Customer requested modification
        rw.transportation_mode = payload.transportation_mode or "STORE_DROP_OFF"
        rw.quotation_status = "PENDING_APPROVAL"
        rw.status = "AWAITING_CUSTOMER_DECISION"

    elif resp_type == "UNCLEAR_DISPUTED":
        # Disputed case: Escalated for Admin review
        rw.status = "UNDER_ASSESSMENT"

    db.commit()
    db.refresh(rw)

    return {
        "message": f"Responsibility assessment saved as '{rw.responsibility_type}'",
        "ticket_code": rw.ticket_code,
        "responsibility_type": rw.responsibility_type,
        "status": rw.status,
        "additional_cost": float(rw.additional_cost or 0.0)
    }


# 8. POST /api/quality/rework/{ticket_id}/resolve-dispute: Admin resolution of unclear/disputed cases
@router.post("/rework/{ticket_id}/resolve-dispute")
def resolve_rework_dispute(
    ticket_id: int,
    payload: DisputeResolutionPayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    res_type = payload.resolution.strip().upper()
    if res_type not in ["RETAILSPHERE_ERROR", "CUSTOMER_CHANGE"]:
        raise HTTPException(status_code=400, detail="Resolution must be either RETAILSPHERE_ERROR or CUSTOMER_CHANGE")

    rw.responsibility_type = res_type
    rw.responsibility_notes = f"[ADMIN RESOLUTION] {payload.resolution_notes}"
    rw.updated_at = datetime.utcnow()

    if res_type == "RETAILSPHERE_ERROR":
        rw.additional_cost = 0.0
        rw.quotation_status = "NOT_APPLICABLE"
        rw.payment_status = "NOT_REQUIRED"
        rw.transportation_mode = "INTERNAL_FLEET"
        rw.status = "AWAITING_PICKUP"
    else:
        rw.quotation_status = "PENDING_APPROVAL"
        rw.status = "AWAITING_CUSTOMER_DECISION"

    db.commit()
    return {
        "message": f"Dispute resolved by Admin as '{rw.responsibility_type}'",
        "ticket_code": rw.ticket_code,
        "responsibility_type": rw.responsibility_type,
        "status": rw.status
    }


# 9. POST /api/quality/rework/{ticket_id}/quotation: Create quotation for customer-paid rework
@router.post("/rework/{ticket_id}/quotation")
def create_rework_quotation(
    ticket_id: int,
    payload: QuotationCreatePayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    acting_user = current_user
    if acting_user and not is_authorized_inspector(acting_user):
        raise HTTPException(status_code=403, detail="Unauthorized: Only Retail Staff and Admin can create rework quotations.")

    if rw.responsibility_type == "RETAILSPHERE_ERROR":
        raise HTTPException(
            status_code=400,
            detail="Cannot add chargeable quotation to a verified RetailSphere error. Responsibility rework is free under warranty."
        )

    total = payload.material_cost + payload.labour_cost + payload.machine_cost + payload.finishing_cost + payload.transportation_cost
    valid_staff_id = current_user.user_id if current_user else 1

    # Check for latest quotation version
    existing_quote = db.query(models.QuotationBreakdown).filter(
        models.QuotationBreakdown.order_type == "Rework",
        models.QuotationBreakdown.order_id == ticket_id
    ).order_by(models.QuotationBreakdown.version.desc()).first()

    next_version = (existing_quote.version + 1) if existing_quote else 1

    quote = models.QuotationBreakdown(
        order_type="Rework",
        order_id=ticket_id,
        material_cost=payload.material_cost,
        labour_cost=payload.labour_cost,
        machine_cost=payload.machine_cost,
        finishing_cost=payload.finishing_cost,
        transportation_cost=payload.transportation_cost,
        total_amount=total,
        status="CUSTOMER_APPROVAL_PENDING",
        version=next_version,
        is_latest=True,
        estimated_duration=payload.estimated_duration,
        notes=payload.notes or "Quotation for customer-requested modifications.",
        created_by_id=valid_staff_id,
        created_at=datetime.utcnow()
    )
    db.add(quote)

    rw.additional_cost = total
    rw.transportation_cost = payload.transportation_cost
    rw.quotation_status = "PENDING_APPROVAL"
    rw.quotation_notes = payload.notes
    rw.status = "AWAITING_CUSTOMER_DECISION"
    rw.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(quote)

    return {
        "message": f"Quotation version {next_version} created (Total: ₹{total:,.2f})",
        "ticket_code": rw.ticket_code,
        "total_amount": total,
        "version": next_version,
        "status": rw.status
    }


# 10. POST /api/quality/rework/{ticket_id}/customer-decision: Customer approves or rejects quotation
@router.post("/rework/{ticket_id}/customer-decision")
def customer_rework_decision(
    ticket_id: int,
    payload: CustomerDecisionPayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    dec = payload.decision.strip().upper()
    quote = db.query(models.QuotationBreakdown).filter(
        models.QuotationBreakdown.order_type == "Rework",
        models.QuotationBreakdown.order_id == ticket_id
    ).order_by(models.QuotationBreakdown.version.desc()).first()

    if dec == "APPROVE":
        rw.quotation_status = "APPROVED"
        rw.payment_status = "PENDING"
        rw.status = "AWAITING_CUSTOMER_DECISION"  # Next step: payment
        if payload.selected_transport:
            rw.transportation_mode = payload.selected_transport
        if quote:
            quote.status = "CUSTOMER_APPROVED"
            quote.approved_at = datetime.utcnow()
    elif dec == "REJECT":
        rw.quotation_status = "REJECTED"
        rw.status = "CANCELLED"
        if quote:
            quote.status = "CUSTOMER_REJECTED"
            quote.rejected_at = datetime.utcnow()
    else:
        raise HTTPException(status_code=400, detail="Decision must be APPROVE or REJECT")

    rw.updated_at = datetime.utcnow()
    db.commit()
    return {
        "message": f"Customer decision recorded: {dec}",
        "ticket_code": rw.ticket_code,
        "quotation_status": rw.quotation_status,
        "status": rw.status
    }


# 11. POST /api/quality/rework/{ticket_id}/pay: Record payment for customer-paid rework
@router.post("/rework/{ticket_id}/pay")
def pay_rework_quotation(
    ticket_id: int,
    payload: ReworkPaymentPayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    if rw.quotation_status != "APPROVED":
        raise HTTPException(status_code=400, detail="Cannot process payment before customer approves the quotation.")

    pay_ref = payload.payment_reference or f"PAY-RWK-{ticket_id}-{int(datetime.utcnow().timestamp())}"
    rw.payment_status = "PAID"
    rw.payment_reference = pay_ref
    rw.updated_at = datetime.utcnow()

    # If carrier partner transportation chosen: Awaiting Pickup; if store dropoff: Awaiting Receipt
    if rw.transportation_mode == "CARRIER_PARTNER":
        rw.status = "AWAITING_PICKUP"
    else:
        rw.status = "RECEIVED_AT_STORE"

    db.commit()
    return {
        "message": f"Payment of ₹{float(rw.additional_cost):,.2f} recorded successfully",
        "ticket_code": rw.ticket_code,
        "payment_status": "PAID",
        "payment_reference": pay_ref,
        "status": rw.status
    }


# 12. POST /api/quality/rework/{ticket_id}/record-receipt: Record item received at store
@router.post("/rework/{ticket_id}/record-receipt")
def record_item_store_receipt(
    ticket_id: int,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    rw.status = "RECEIVED_AT_STORE"
    rw.updated_at = datetime.utcnow()
    db.commit()
    return {
        "message": f"Item for ticket {rw.ticket_code} recorded as Received at Store",
        "ticket_code": rw.ticket_code,
        "status": rw.status
    }


# 13. POST /api/quality/rework/{ticket_id}/assign-worker: Assign artisan worker for rework
@router.post("/rework/{ticket_id}/assign-worker")
def assign_rework_worker(
    ticket_id: int,
    payload: AssignWorkerPayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    # Prerequisite verification: Workers cannot be assigned before authorization & payment requirements satisfied!
    if rw.responsibility_type == "CUSTOMER_CHANGE":
        if rw.quotation_status != "APPROVED":
            raise HTTPException(status_code=400, detail="Cannot assign worker: Customer has not approved the modification quotation.")
        if rw.payment_status != "PAID":
            raise HTTPException(status_code=400, detail="Cannot assign worker: Payment is required before starting chargeable rework.")

    worker_obj = db.query(models.User).filter(models.User.user_id == payload.assigned_worker_id).first()
    if not worker_obj:
        raise HTTPException(status_code=404, detail="Artisan worker user not found")

    rw.assigned_worker_id = payload.assigned_worker_id
    if payload.assigned_supervisor_id:
        rw.assigned_supervisor_id = payload.assigned_supervisor_id
    rw.status = "REWORK_IN_PROGRESS"
    rw.updated_at = datetime.utcnow()

    db.commit()
    return {
        "message": f"Assigned rework {rw.ticket_code} to artisan {worker_obj.full_name}",
        "ticket_code": rw.ticket_code,
        "worker_name": worker_obj.full_name,
        "status": rw.status
    }


# 14. POST /api/quality/rework/{ticket_id}/complete-rework: Artisan marks rework completed
@router.post("/rework/{ticket_id}/complete-rework")
def complete_rework_production(
    ticket_id: int,
    payload: ReworkResolvePayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    rw.status = "REWORK_COMPLETED"
    rw.resolved_at = datetime.utcnow()
    rw.updated_at = datetime.utcnow()

    # Move order back to QC_PENDING for Retail Staff Repeat Inspection
    if rw.order_type == "Custom":
        ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == rw.order_id).first()
        if ord_obj:
            ord_obj.order_status = "QC_PENDING"
    elif rw.order_type == "Fabrication":
        fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == rw.order_id).first()
        if fab_obj:
            fab_obj.status = "QC_PENDING"

    db.commit()
    return {
        "message": f"Rework #{rw.ticket_code} completed and submitted for Repeat QC inspection",
        "ticket_code": rw.ticket_code,
        "status": rw.status
    }


# 15. PUT /api/quality/rework/{rework_id}/resolve: Existing resolve endpoint (preserved)
@router.put("/rework/{rework_id}/resolve")
def resolve_rework_job(rework_id: int, payload: ReworkResolvePayload, db: Session = Depends(get_db)):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == rework_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework job not found")

    rw.status = "RESOLVED"
    rw.resolved_at = datetime.utcnow()
    rw.updated_at = datetime.utcnow()

    if rw.inspection and rw.inspection.order_type == "Custom":
        ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == rw.inspection.order_id).first()
        if ord_obj:
            ord_obj.order_status = "QC_PENDING"
    elif rw.inspection and rw.inspection.order_type == "Fabrication":
        fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == rw.inspection.order_id).first()
        if fab_obj:
            fab_obj.status = "QC_PENDING"

    db.commit()
    return {"message": f"Rework job #{rework_id} marked as resolved and submitted for repeat inspection"}


# 16. POST /api/quality/rework/{ticket_id}/dispatch: Redelivery dispatch after passing Repeat QC
@router.post("/rework/{ticket_id}/dispatch")
def dispatch_rework_redelivery(
    ticket_id: int,
    payload: ReworkDispatchPayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework ticket not found")

    # Gate: Dispatch requires passed repeat QC!
    if rw.status not in ["QC_PASSED", "READY_FOR_DISPATCH"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot dispatch item in status '{rw.status}'. Repeat Quality Inspection must be PASSED before dispatch."
        )

    rw.status = "CLOSED"
    rw.resolved_at = datetime.utcnow()
    rw.updated_at = datetime.utcnow()

    # Free internal fleet redelivery for RetailSphere Error
    if rw.responsibility_type == "RETAILSPHERE_ERROR":
        # Check available internal vehicle
        avail_vh = db.query(models.Vehicle).filter(models.Vehicle.status == "AVAILABLE").first()
        if avail_vh:
            rw.vehicle_id = avail_vh.vehicle_id
            rw.driver_id = avail_vh.assigned_driver_id
            avail_vh.status = "ASSIGNED"

    db.commit()
    return {
        "message": f"Rework {rw.ticket_code} dispatched successfully and ticket closed.",
        "ticket_code": rw.ticket_code,
        "status": rw.status
    }


# 17. GET /api/quality/fleet-carriers: Available transport options
@router.get("/fleet-carriers")
def get_quality_transport_options(db: Session = Depends(get_db)):
    vehicles = db.query(models.Vehicle).filter(models.Vehicle.status.in_(["AVAILABLE", "Available", "ACTIVE", "Active"])).all()
    if not vehicles:
        vehicles = db.query(models.Vehicle).all()
    carriers = db.query(models.CarrierPartner).filter(models.CarrierPartner.status == True).all()

    vh_list = []
    for v in vehicles:
        d_name = "Unassigned"
        if v.assigned_driver:
            d_name = v.assigned_driver.full_name
        vh_list.append({
            "vehicle_id": v.vehicle_id,
            "registration_number": v.registration_number,
            "vehicle_type": v.vehicle_type,
            "assigned_driver_name": d_name,
            "status": v.status
        })

    c_list = []
    for c in carriers:
        c_list.append({
            "carrier_id": c.carrier_id,
            "carrier_name": c.carrier_name,
            "phone": c.contact_phone,
            "coverage_areas": c.coverage_areas
        })

    return {
        "available_fleet_vehicles": vh_list,
        "active_carrier_partners": c_list
    }

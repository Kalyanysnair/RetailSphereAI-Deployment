from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload, defer
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import string
import secrets
import time
import re

from app.database import get_db
from app import models, auth
from app.email_utils import send_staff_credentials_email, mask_email
from app.utils.stage_progression import complete_stage_and_unlock_next
from app.utils.worker_assignment_validator import (
    require_staff_user,
    validate_worker_eligibility,
    validate_custom_order_assignment_prerequisites,
    validate_fabrication_assignment_prerequisites,
    validate_service_assignment_prerequisites,
    validate_fabrication_material_prerequisite
)

def generate_strong_password(length: int = 14) -> str:
    specials = "@#$%&*!"
    chars = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(string.digits),
        secrets.choice(specials),
        secrets.choice(specials),
    ]
    all_allowed = string.ascii_letters + string.digits + specials
    for _ in range(max(0, length - len(chars))):
        chars.append(secrets.choice(all_allowed))
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)

# High-performance in-memory cache for custom orders (15s TTL)
_custom_orders_cache = {}

def invalidate_custom_orders_cache():
    global _custom_orders_cache
    _custom_orders_cache.clear()

router = APIRouter(prefix="/api/production", tags=["Production Management"])

class CustomOrderCreatePayload(BaseModel):
    customer_id: Optional[int] = 1
    customer_name: Optional[str] = "Customer"
    customer_email: Optional[str] = "customer@example.com"
    customer_phone: Optional[str] = ""
    furniture_type: str
    material: str
    dimensions: str
    color: str
    design_description: Optional[str] = None
    reference_image: Optional[str] = None
    customer_material_id: Optional[int] = None

class OrderStatusUpdatePayload(BaseModel):
    order_status: str  # "Approved", "Rejected", "In Production", "Completed"
    completion_status: Optional[str] = None
    estimated_price: Optional[float] = None
    remarks: Optional[str] = None

class WorkerCreatePayload(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    specialization: Optional[str] = "Woodwork & Carpentry"

class WorkerUpdatePayload(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    specialization: Optional[str] = "Woodwork & Carpentry"

class WorkerStatusPayload(BaseModel):
    status: bool

class TaskAssignPayload(BaseModel):
    custom_order_id: int
    worker_id: int
    department: Optional[str] = None  # "Woodwork & Carpentry", "Upholstery", "Assembly"
    task_description: Optional[str] = None

class ProgressUpdatePayload(BaseModel):
    custom_order_id: int
    stage: str
    progress_percentage: int
    remarks: Optional[str] = None
    department: Optional[str] = None
    worker_id: Optional[int] = None

# 1. Fetch Custom Orders for Production Staff / Worker Portal
@router.get("/custom-orders")
def get_custom_orders(
    status_filter: Optional[str] = None,
    worker_id: Optional[int] = None,
    production_staff_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    customer_email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    cache_key = f"{status_filter}_{worker_id}_{production_staff_id}_{customer_id}_{customer_email}"
    now_ts = time.time()
    cached = _custom_orders_cache.get(cache_key)
    if cached and (now_ts - cached.get("timestamp", 0) < 15.0):
        return cached["data"]

    query = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id.notin_([103, 102, 13, 28, 101, 14, 40]))
    if status_filter and status_filter.strip() and status_filter != "All":
        query = query.filter(models.CustomOrder.order_status == status_filter.strip())

    if production_staff_id:
        query = query.filter(models.CustomOrder.production_staff_id == production_staff_id)

    if worker_id:
        assigned_order_ids = [
            a.custom_order_id for a in db.query(models.WorkerAssignment.custom_order_id)
            .filter(models.WorkerAssignment.worker_id == worker_id).all()
        ]
        query = query.filter(models.CustomOrder.custom_order_id.in_(assigned_order_ids))

    if customer_id or (customer_email and customer_email.strip()):
        c_ids = set()
        if customer_id:
            c_rows = db.query(models.Customer).filter(
                (models.Customer.customer_id == customer_id) | (models.Customer.user_id == customer_id)
            ).all()
            for c in c_rows:
                c_ids.add(c.customer_id)
            c_ids.add(customer_id)

        if customer_email and customer_email.strip():
            clean_email = customer_email.strip()
            prefix = clean_email.split('@')[0]
            users = db.query(models.User).filter(
                (models.User.email.ilike(clean_email)) | (models.User.email.ilike(f"%{prefix}%"))
            ).all()
            for u in users:
                if u.customer_profile:
                    c_ids.add(u.customer_profile.customer_id)

        if c_ids:
            query = query.filter(models.CustomOrder.customer_id.in_(list(c_ids)))

    orders = (
        query.options(
            joinedload(models.CustomOrder.customer).joinedload(models.Customer.user),
            joinedload(models.CustomOrder.customer_material)
        )
        .order_by(models.CustomOrder.order_date.desc())
        .all()
    )

    if not orders:
        return []

    order_ids = [ord_obj.custom_order_id for ord_obj in orders]

    # 1. Batch fetch all worker assignments
    all_assignments = (
        db.query(models.WorkerAssignment)
        .filter(models.WorkerAssignment.custom_order_id.in_(order_ids))
        .all()
    )
    assignments_by_order = {}
    worker_user_ids = set()
    for asgn in all_assignments:
        assignments_by_order.setdefault(asgn.custom_order_id, []).append(asgn)
        if asgn.worker_id:
            worker_user_ids.add(asgn.worker_id)

    # 2. Batch fetch all stages
    all_stages = (
        db.query(models.ProductionStage)
        .filter(
            models.ProductionStage.order_id.in_(order_ids),
            models.ProductionStage.order_type.in_(["Custom", "CUSTOM"])
        )
        .all()
    )
    stages_by_order = {}
    for stg in all_stages:
        stages_by_order.setdefault(stg.order_id, []).append(stg)
        if stg.assigned_worker_id:
            worker_user_ids.add(stg.assigned_worker_id)

    for o in orders:
        if o.production_staff_id:
            worker_user_ids.add(o.production_staff_id)

    # 3. Batch fetch all needed users (workers + supervisors)
    user_map = {}
    if worker_user_ids:
        users = db.query(models.User).filter(models.User.user_id.in_(list(worker_user_ids))).all()
        user_map = {u.user_id: u for u in users}

    # 4. Batch fetch latest progress
    all_progress = (
        db.query(models.ProductionProgress)
        .filter(models.ProductionProgress.custom_order_id.in_(order_ids))
        .order_by(models.ProductionProgress.progress_id.desc())
        .all()
    )
    latest_progress_map = {}
    for prog in all_progress:
        if prog.custom_order_id not in latest_progress_map:
            latest_progress_map[prog.custom_order_id] = prog

    # 5. Batch fetch latest quality inspections
    all_qc_inspections = (
        db.query(models.QualityInspection)
        .filter(
            models.QualityInspection.order_id.in_(order_ids),
            models.QualityInspection.order_type.in_(["Custom", "CUSTOM", "Customization", "CUSTOMIZATION"])
        )
        .order_by(models.QualityInspection.inspected_at.desc())
        .all()
    )
    inspections_by_order = {}
    for insp in all_qc_inspections:
        inspections_by_order.setdefault(insp.order_id, []).append(insp)

    def get_supervisor_name(u_id):
        if not u_id:
            return "Unassigned Supervisor"
        u = user_map.get(u_id)
        return u.full_name if u else "Unassigned Supervisor"

    result = []
    for ord_obj in orders:
        cust = ord_obj.customer
        cust_user = cust.user if cust else None

        assignments = assignments_by_order.get(ord_obj.custom_order_id, [])
        assigned_workers = []
        seen_worker_ids = set()
        for asgn in assignments:
            w_user = user_map.get(asgn.worker_id)
            if w_user:
                seen_worker_ids.add(w_user.user_id)
                assigned_workers.append({
                    "assignment_id": asgn.assignment_id,
                    "worker_id": w_user.user_id,
                    "worker_name": w_user.full_name,
                    "worker_email": w_user.email,
                    "worker_phone": getattr(w_user, "phone", "") or "",
                    "specialization": getattr(w_user, "specialization", "Woodwork & Carpentry") or "Woodwork & Carpentry",
                    "task_status": asgn.task_status,
                    "assignment_source": "order_level"
                })

        stages = stages_by_order.get(ord_obj.custom_order_id, [])
        for stg in stages:
            if stg.assigned_worker_id and stg.assigned_worker_id not in seen_worker_ids:
                w_user = user_map.get(stg.assigned_worker_id)
                if w_user:
                    seen_worker_ids.add(w_user.user_id)
                    assigned_workers.append({
                        "assignment_id": f"stg-{stg.stage_id}",
                        "worker_id": w_user.user_id,
                        "worker_name": w_user.full_name,
                        "worker_email": w_user.email,
                        "worker_phone": getattr(w_user, "phone", "") or "",
                        "specialization": getattr(w_user, "specialization", stg.stage_name) or "Woodwork & Carpentry",
                        "task_status": f"{stg.stage_name}: {stg.status}",
                        "stage_name": stg.stage_name,
                        "assignment_source": "stage_level"
                    })

        latest_progress = latest_progress_map.get(ord_obj.custom_order_id)
        insps = inspections_by_order.get(ord_obj.custom_order_id, [])
        latest_insp = insps[0] if insps else None

        st_upper = (ord_obj.order_status or "").upper().strip()
        all_stages_done = len(stages) > 0 and all(s.status == "COMPLETED" for s in stages)

        qc_status = "NOT_APPLICABLE"
        if latest_insp:
            qc_status = "QC_PASSED" if latest_insp.result == "PASS" else "QC_FAILED"
        elif st_upper in ["QC_PENDING", "QC PENDING"] or all_stages_done:
            qc_status = "QC_PENDING"
        elif st_upper == "COMPLETED":
            qc_status = "QC_PASSED"

        # Compute accurate stage name and percentage respecting QC Gate:
        # A request is completed ONLY after QC is done and passed!
        eff_stage = latest_progress.stage if latest_progress else "Pending Approval"
        eff_pct = latest_progress.progress_percentage if latest_progress else 0

        if qc_status == "QC_PASSED" or st_upper == "COMPLETED":
            eff_stage = "Completed (QC Passed)"
            eff_pct = 100
        elif qc_status == "QC_PENDING" or st_upper in ["QC_PENDING", "QC PENDING"] or all_stages_done:
            eff_stage = "Quality Inspection Pending"
            eff_pct = 90
        elif qc_status == "QC_FAILED" or st_upper == "REWORK_REQUIRED":
            eff_stage = "QC Inspection Failed (Rework Required)"
            eff_pct = 75
        elif stages:
            completed_cnt = sum(1 for s in stages if s.status == "COMPLETED")
            active_s = next((s for s in stages if s.status in ["IN_PROGRESS", "ASSIGNED"]), None)
            if active_s:
                eff_stage = active_s.stage_name
                eff_pct = max(15, min(85, int((completed_cnt / len(stages)) * 85)))
            elif completed_cnt == len(stages):
                eff_stage = "Quality Inspection Pending"
                eff_pct = 90
        elif st_upper in ["IN PRODUCTION", "IN_PRODUCTION"]:
            if eff_pct == 0:
                eff_stage = "In Workshop Production"
                eff_pct = 40

        result.append({
            "custom_order_id": ord_obj.custom_order_id,
            "customer_id": ord_obj.customer_id,
            "customer_name": cust_user.full_name if cust_user else "Customer",
            "customer_email": cust_user.email if cust_user else "",
            "customer_phone": cust_user.phone if cust_user else "",
            "furniture_type": ord_obj.furniture_type,
            "material": ord_obj.material,
            "dimensions": ord_obj.dimensions,
            "color": ord_obj.color,
            "design_description": ord_obj.design_description,
            "reference_image": ord_obj.reference_image,
            "estimated_price": float(ord_obj.estimated_price) if ord_obj.estimated_price else None,
            "order_status": ord_obj.order_status,
            "qc_status": qc_status,
            "is_locked": True if (ord_obj.order_status in ["Approved", "In Production", "Completed"] or (ord_obj.estimated_price and float(ord_obj.estimated_price) > 0) or getattr(ord_obj, "is_locked", False)) else False,
            "order_date": ord_obj.order_date.isoformat() if ord_obj.order_date else None,
            "assigned_workers": assigned_workers,
            "production_staff_id": ord_obj.production_staff_id,
            "production_staff_name": get_supervisor_name(ord_obj.production_staff_id),
            "current_stage": eff_stage,
            "progress_percentage": eff_pct,
            "latest_remarks": latest_progress.remarks if latest_progress else None,
            "customer_material_id": ord_obj.customer_material_id,
            "customer_material": {
                "material_id": ord_obj.customer_material.material_id,
                "material_type": ord_obj.customer_material.material_type,
                "wood_type": ord_obj.customer_material.wood_type,
                "quantity": float(ord_obj.customer_material.quantity),
                "remaining_quantity": float(ord_obj.customer_material.remaining_quantity if ord_obj.customer_material.remaining_quantity is not None else ord_obj.customer_material.quantity),
                "unit": ord_obj.customer_material.unit,
                "status": ord_obj.customer_material.status,
                "condition": ord_obj.customer_material.condition
            } if ord_obj.customer_material else None,
        })
    _custom_orders_cache[cache_key] = {"data": result, "timestamp": now_ts}
    return result

# 1b. Create New Custom Order in DB
@router.post("/custom-orders")
def create_custom_order(
    payload: CustomOrderCreatePayload,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    customer = None
    user = None

    if hasattr(current_user, "customer_profile") and current_user.customer_profile:
        customer = current_user.customer_profile
        user = current_user
    elif payload.customer_email and payload.customer_email.strip():
        clean_email = payload.customer_email.strip()
        user = db.query(models.User).filter(models.User.email.ilike(clean_email)).first()
        if not user:
            user = models.User(
                email=clean_email,
                full_name=payload.customer_name.strip() if payload.customer_name else "Valued Customer",
                role_id=1,
                status=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        customer = db.query(models.Customer).filter(models.Customer.user_id == user.user_id).first()
        if not customer:
            customer = models.Customer(
                user_id=user.user_id,
                address="Not Provided",
                city="Kottayam",
                state="Kerala",
                pincode="686631"
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

    if not customer and payload.customer_id:
        customer = db.query(models.Customer).filter(
            (models.Customer.customer_id == payload.customer_id) | (models.Customer.user_id == payload.customer_id)
        ).first()

    cust_id = customer.customer_id if customer else None

    # Validate customer-owned material linkage if provided
    if payload.customer_material_id:
        c_mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == payload.customer_material_id).first()
        if not c_mat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Customer material lot #{payload.customer_material_id} was not found."
            )
        if cust_id and c_mat.customer_id != cust_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security violation: You cannot link another customer's material lot to this custom order."
            )

    new_order = models.CustomOrder(
        customer_id=cust_id,
        furniture_type=payload.furniture_type,
        material=payload.material,
        dimensions=payload.dimensions,
        color=payload.color,
        design_description=payload.design_description,
        reference_image=payload.reference_image,
        customer_material_id=payload.customer_material_id,
        order_status="Pending",
        order_date=datetime.utcnow()
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    staff_user = db.query(models.User).first()
    updater_id = user.user_id if user else (staff_user.user_id if staff_user else None)

    prog = models.ProductionProgress(
        custom_order_id=new_order.custom_order_id,
        updated_by=updater_id,
        stage="Pending Approval",
        progress_percentage=0,
        remarks="Custom request received."
    )
    db.add(prog)
    db.commit()
    invalidate_custom_orders_cache()

    return {
        "custom_order_id": new_order.custom_order_id,
        "order_id": new_order.custom_order_id,
        "customer_id": new_order.customer_id,
        "customer_material_id": new_order.customer_material_id,
        "customer_name": payload.customer_name or "Customer",
        "customer_email": payload.customer_email or "",
        "customer_phone": payload.customer_phone or "",
        "furniture_type": new_order.furniture_type,
        "material": new_order.material,
        "dimensions": new_order.dimensions,
        "color": new_order.color,
        "design_description": new_order.design_description,
        "reference_image": new_order.reference_image,
        "estimated_price": None,
        "order_status": new_order.order_status,
        "order_date": new_order.order_date.isoformat() if new_order.order_date else None,
        "assigned_workers": [],
        "current_stage": "Pending Approval",
        "progress_percentage": 0,
        "latest_remarks": "Custom request received."
    }

# 2. Approve or Reject Custom Order
@router.put("/custom-orders/{order_id}/status")
def update_custom_order_status(
    order_id: int,
    payload: OrderStatusUpdatePayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    require_staff_user(current_user)

    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    # Enforce QC Gate: Direct transition to Completed requires passed Quality Inspection
    if payload.order_status.upper() == "COMPLETED":
        has_passed_qc = db.query(models.QualityInspection).filter(
            models.QualityInspection.order_type.in_(["Custom", "CUSTOM", "Customization", "CUSTOMIZATION"]),
            models.QualityInspection.order_id == order_id,
            models.QualityInspection.result == "PASS"
        ).first()
        if not has_passed_qc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom order cannot be marked Completed without passing quality inspection (QC_PENDING required)."
            )

    order.order_status = payload.order_status
    if payload.estimated_price is not None:
        order.estimated_price = payload.estimated_price

    staff_id = current_user.user_id

    # Add initial progress entry on approval
    if payload.order_status == "Approved":
        init_progress = models.ProductionProgress(
            custom_order_id=order.custom_order_id,
            updated_by=staff_id,
            stage="Material Sourcing",
            progress_percentage=10,
            remarks=payload.remarks or "Order approved by production team. Commencing material allocation."
        )
        db.add(init_progress)
    elif payload.order_status == "Rejected":
        rej_progress = models.ProductionProgress(
            custom_order_id=order.custom_order_id,
            updated_by=staff_id,
            stage="Rejected",
            progress_percentage=0,
            remarks=payload.remarks or "Customization specs cannot be fulfilled at this time."
        )
        db.add(rej_progress)

    db.commit()
    db.refresh(order)
    invalidate_custom_orders_cache()
    return {"message": f"Order #{order_id} status updated to {payload.order_status}", "order_id": order_id}

class SupervisorAssignPayload(BaseModel):
    supervisor_id: int

@router.post("/custom-orders/{order_id}/assign-supervisor")
def assign_production_supervisor(order_id: int, payload: SupervisorAssignPayload, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Custom order not found")

    supervisor = db.query(models.User).filter(models.User.user_id == payload.supervisor_id).first()
    if not supervisor:
        raise HTTPException(status_code=404, detail="Production Supervisor not found")

    order.production_staff_id = payload.supervisor_id

    # Add Audit Log in ProductionHistory
    history = models.ProductionHistory(
        order_type="Custom",
        order_id=order_id,
        action_by_id=payload.supervisor_id,
        action="SUPERVISOR_ASSIGNED",
        new_status=order.order_status,
        notes=f"Production Supervisor {supervisor.full_name} ({supervisor.email}) assigned to oversee build",
        timestamp=datetime.utcnow()
    )
    db.add(history)
    db.commit()

    return {
        "message": f"Order #{order_id} assigned to Production Supervisor {supervisor.full_name}",
        "supervisor_id": supervisor.user_id,
        "supervisor_name": supervisor.full_name
    }


@router.get("/supervisor-workload")
def get_production_supervisor_workload(db: Session = Depends(get_db)):
    prod_role = db.query(models.Role).filter(models.Role.role_name == "Production Staff").first()
    if not prod_role:
        return []

    supervisors = db.query(models.User).filter(models.User.role_id == prod_role.role_id, models.User.status == True).all()

    workloads = []
    min_load = 999999
    best_sup_id = None

    for sup in supervisors:
        active_customs = db.query(models.CustomOrder).filter(
            models.CustomOrder.production_staff_id == sup.user_id,
            models.CustomOrder.order_status.in_(["Approved", "In Production", "QC_Pending"])
        ).count()

        pending_assessments = db.query(models.TechnicalAssessment).filter(
            models.TechnicalAssessment.assessed_by_id == sup.user_id
        ).count()

        total_load = active_customs + pending_assessments
        if total_load < min_load:
            min_load = total_load
            best_sup_id = sup.user_id

        workloads.append({
            "supervisor_id": sup.user_id,
            "full_name": sup.full_name,
            "email": sup.email,
            "phone": sup.phone,
            "active_jobs_count": active_customs,
            "assessments_count": pending_assessments,
            "total_active_load": total_load,
            "is_recommended": False
        })

    for item in workloads:
        if item["supervisor_id"] == best_sup_id:
            item["is_recommended"] = True
            item["recommendation_reason"] = f"Lowest active production job workload ({item['total_active_load']} active jobs)."

    return workloads

# 2b. Lock Custom Order Specifications
@router.put("/custom-orders/{order_id}/lock")
def lock_custom_order_specs(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    order.is_locked = True
    if order.order_status in ["Pending", "Pending Approval"]:
        order.order_status = "Approved"

    db.commit()
    db.refresh(order)
    return {"message": f"Order #{order_id} specifications locked permanently", "is_locked": True}

# 2c. Cancel Custom Order
@router.put("/custom-orders/{order_id}/cancel")
def cancel_custom_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    order.order_status = "Cancelled"
    db.commit()
    db.refresh(order)
    return {"message": f"Order #{order_id} has been cancelled successfully", "order_id": order_id}

@router.put("/custom-orders/{order_id}/pay")
def pay_custom_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    # Enforce address validation: customer must have saved a valid delivery address in PostgreSQL
    if order.customer_id:
        customer = db.query(models.Customer).filter(models.Customer.customer_id == order.customer_id).first()
        user = customer.user if customer else None
        from app.utils.address_validator import is_valid_customer_address
        is_valid, err_msg = is_valid_customer_address(customer, user)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A complete delivery address is required before payment: {err_msg}"
            )

    order.payment_status = "Paid"
    order.order_status = "Paid"
    order.is_locked = True

    # Record in tbl_payment
    new_payment = models.Payment(
        order_type="Custom",
        order_id=order.custom_order_id,
        amount=order.estimated_price or 0,
        payment_method="Razorpay",
        transaction_id=f"PAY-CUST-{order.custom_order_id}-{int(time.time())}",
        payment_status="Paid"
    )
    db.add(new_payment)

    db.commit()
    db.refresh(order)
    return {"message": f"Payment completed for Custom Order #{order_id}", "order_id": order_id, "payment_status": "Paid"}


def normalize_phone(phone_str: str) -> str:
    """Extracts last 10 digits from any phone string (+91 9446758046, 09446758046, 9446758046)."""
    if not phone_str:
        return ""
    digits = re.sub(r'\D', '', str(phone_str))
    if len(digits) >= 10:
        return digits[-10:]
    return digits

# 3. Add Worker
@router.post("/workers", status_code=status.HTTP_201_CREATED)
def create_worker(payload: WorkerCreatePayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
    if not role:
        role = models.Role(role_name="Worker")
        db.add(role)
        db.commit()
        db.refresh(role)

    email_clean = payload.email.strip().lower()
    full_name_clean = payload.full_name.strip()

    if not email_clean or "@" not in email_clean or "." not in email_clean.split("@")[-1]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email address.")

    # Check if email already exists in DB (reject duplicates)
    existing_email = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A worker/account with this email already exists.")

    # Process and check phone number with country code normalization
    if payload.phone and payload.phone.strip():
        raw_phone = payload.phone.strip()
        last_10 = normalize_phone(raw_phone)
        if len(last_10) == 10:
            phone_clean = f"+91{last_10}"
        else:
            phone_clean = raw_phone

        # Check duplicate phone by comparing normalized 10 digits against all users
        all_users = db.query(models.User).all()
        for u in all_users:
            if u.phone:
                u_10 = normalize_phone(u.phone)
                if u_10 and u_10 == last_10:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A worker/account with this phone number already exists."
                    )
    else:
        # Auto-generate unique timestamp-based phone number if omitted
        phone_clean = f"+919{int(time.time() * 1000) % 1000000009:09d}"

    generated_password = generate_strong_password(12)
    hashed_pwd = auth.get_password_hash(generated_password)

    worker_user = models.User(
        role_id=role.role_id,
        full_name=full_name_clean,
        email=email_clean,
        phone=phone_clean,
        password=hashed_pwd,
        status=True,
        must_change_password=True,
        specialization=payload.specialization or "Woodwork & Carpentry"
    )
    
    try:
        db.add(worker_user)
        db.commit()
        db.refresh(worker_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database constraint error: A worker with this email or phone already exists."
        )

    # Send login credentials email to worker via SMTP immediately (recipient is dynamic)
    email_sent = False
    email_error = None

    masked_to = mask_email(worker_user.email)
    print("[WORKER EMAIL TRACE]")
    print(f"Worker Name: {worker_user.full_name}")
    print(f"Recipient from request: {masked_to}")

    try:
        email_sent = send_staff_credentials_email(
            to_email=worker_user.email,
            staff_name=worker_user.full_name,
            role_name=f"Workshop Worker ({payload.specialization or 'Woodwork & Carpentry'})",
            username=worker_user.email,
            password=generated_password
        )
        if email_sent:
            print(f"[WORKER EMAIL TRACE] SMTP RCPT TO: {masked_to}")
            print(f"[WORKER CREATION SUCCESS] Dispatched password email via SMTP to {masked_to}")
    except Exception as email_err:
        email_sent = False
        email_error = str(email_err)
        print(f"[WORKER CREATION EMAIL ERROR] SMTP exception sending credentials email to {masked_to}: {email_err}")

    return {
        "success": True,
        "message": f"Worker account created and login credentials sent to {worker_user.email}.",
        "worker_id": worker_user.user_id,
        "full_name": worker_user.full_name,
        "email": worker_user.email,
        "specialization": payload.specialization,
        "status": worker_user.status,
        "email_sent": email_sent,
        "email_error": email_error
    }

# 3b. Resend Worker Credentials
@router.post("/workers/{worker_id}/resend-credentials")
def resend_worker_credentials(worker_id: int, db: Session = Depends(get_db)):
    worker_user = db.query(models.User).filter(models.User.user_id == worker_id).first()
    if not worker_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    generated_password = generate_strong_password(12)
    worker_user.password = auth.get_password_hash(generated_password)
    worker_user.must_change_password = True
    db.commit()
    db.refresh(worker_user)

    email_sent = False
    email_error = None
    masked_to = mask_email(worker_user.email)
    print(f"[RESEND WORKER CREDENTIALS] Recipient: {masked_to}")

    try:
        email_sent = send_staff_credentials_email(
            to_email=worker_user.email,
            staff_name=worker_user.full_name,
            role_name="Workshop Worker",
            username=worker_user.email,
            password=generated_password
        )
    except Exception as email_err:
        email_sent = False
        email_error = str(email_err)

    if not email_sent:
        return {
            "success": True,
            "message": f"Worker credentials updated, but email could not be delivered to {worker_user.email}.",
            "email": worker_user.email,
            "email_sent": False,
            "email_error": email_error
        }

    return {
        "success": True,
        "message": f"New temporary login credentials sent to worker email {worker_user.email}.",
        "email": worker_user.email,
        "email_sent": True
    }

# 4. List Workers
@router.get("/workers")
def list_workers(db: Session = Depends(get_db)):
    worker_role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
    if not worker_role:
        return []

    workers = db.query(models.User).filter(models.User.role_id == worker_role.role_id).all()
    return [{
        "worker_id": w.user_id,
        "full_name": w.full_name,
        "email": w.email,
        "phone": w.phone,
        "specialization": w.specialization or "Woodwork & Carpentry",
        "status": w.status
    } for w in workers]

# 4b. Delete Worker
@router.delete("/workers/{worker_id}")
def delete_worker(worker_id: int, db: Session = Depends(get_db)):
    db.query(models.WorkerAssignment).filter(models.WorkerAssignment.worker_id == worker_id).delete(synchronize_session=False)
    db.query(models.Customer).filter(models.Customer.user_id == worker_id).delete(synchronize_session=False)
    worker = db.query(models.User).filter(models.User.user_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    db.delete(worker)
    db.commit()
    return {"message": f"Worker #{worker_id} removed successfully"}

# 4c. Update Worker Details
@router.put("/workers/{worker_id}")
def update_worker(worker_id: int, payload: WorkerUpdatePayload, db: Session = Depends(get_db)):
    worker = db.query(models.User).filter(models.User.user_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    
    if payload.email.strip().lower() != worker.email.lower():
        existing = db.query(models.User).filter(models.User.email == payload.email.strip()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email address is already registered.")
    
    worker.full_name = payload.full_name.strip()
    worker.email = payload.email.strip()
    if payload.phone and payload.phone.strip():
        raw_phone = payload.phone.strip()
        last_10 = normalize_phone(raw_phone)
        if len(last_10) == 10:
            phone_clean = f"+91{last_10}"
        else:
            phone_clean = raw_phone

        all_users = db.query(models.User).filter(models.User.user_id != worker_id).all()
        for u in all_users:
            if u.phone:
                u_10 = normalize_phone(u.phone)
                if u_10 and u_10 == last_10:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A worker/account with this phone number already exists."
                    )
        worker.phone = phone_clean
    if payload.specialization:
        worker.specialization = payload.specialization.strip()
    
    db.commit()
    db.refresh(worker)
    return {
        "worker_id": worker.user_id,
        "full_name": worker.full_name,
        "email": worker.email,
        "phone": worker.phone,
        "specialization": worker.specialization or "Woodwork & Carpentry",
        "status": worker.status
    }

# 4d. Toggle Worker Status (Active / Inactive)
@router.put("/workers/{worker_id}/status")
def toggle_worker_status(worker_id: int, payload: WorkerStatusPayload, db: Session = Depends(get_db)):
    worker = db.query(models.User).filter(models.User.user_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    
    worker.status = payload.status
    db.commit()
    db.refresh(worker)
    return {
        "worker_id": worker.user_id,
        "full_name": worker.full_name,
        "status": worker.status
    }

# 5. Assign Task to Worker
@router.post("/assign-worker")
def assign_worker_task(
    payload: TaskAssignPayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    require_staff_user(current_user)
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.custom_order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    validate_custom_order_assignment_prerequisites(order)

    dept_label = payload.department.strip() if payload.department and payload.department.strip() else None
    worker = validate_worker_eligibility(db, payload.worker_id, required_skill=dept_label)
    if not dept_label:
        dept_label = getattr(worker, "specialization", "Woodwork & Carpentry") or "Woodwork & Carpentry"
    
    # Check if assignment already exists for this order & worker or department
    existing = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.custom_order_id == payload.custom_order_id,
        models.WorkerAssignment.worker_id == payload.worker_id
    ).first()

    if existing:
        existing.task_status = f"{dept_label}: Assigned"
        assignment = existing
    else:
        assignment = models.WorkerAssignment(
            custom_order_id=payload.custom_order_id,
            worker_id=payload.worker_id,
            assigned_date=date.today(),
            task_status=f"{dept_label}: Assigned"
        )
        db.add(assignment)
    
    # Auto-update order status to In Production if currently Approved
    if order.order_status in ["Approved", "Paid", "READY_FOR_PRODUCTION"]:
        order.order_status = "In Production"

    db.commit()
    db.refresh(assignment)

    return {"message": f"Worker {worker.full_name} assigned to Order #{payload.custom_order_id} ({dept_label})"}


class TaskUnassignPayload(BaseModel):
    custom_order_id: int
    worker_id: int


@router.post("/unassign-worker")
def unassign_worker_task(
    payload: TaskUnassignPayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    require_staff_user(current_user)

    asgn = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.custom_order_id == payload.custom_order_id,
        models.WorkerAssignment.worker_id == payload.worker_id
    ).first()

    if not asgn:
        asgn = db.query(models.WorkerAssignment).filter(
            models.WorkerAssignment.assignment_id == payload.worker_id
        ).first()

    if asgn:
        w_id = asgn.worker_id
        db.delete(asgn)
        
        remaining = db.query(models.WorkerAssignment).filter(
            models.WorkerAssignment.custom_order_id == payload.custom_order_id
        ).count()

        log_production_history(
            db,
            order_type="Custom",
            order_id=payload.custom_order_id,
            action="Worker Unassigned",
            action_by_id=current_user.user_id,
            notes=f"Worker ID #{w_id} unassigned from order."
        )
        db.commit()
        return {"message": f"Worker unassigned successfully", "remaining_count": remaining}
    
    return {"message": "Assignment record not found or already removed", "remaining_count": 0}


# 6. Update Production Progress Stage
@router.post("/update-progress")
def update_production_progress(payload: ProgressUpdatePayload, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.custom_order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    valid_updater_id = order.production_staff_id
    if valid_updater_id:
        u_exists = db.query(models.User.user_id).filter(models.User.user_id == valid_updater_id).first()
        if not u_exists:
            valid_updater_id = None
    if not valid_updater_id:
        fallback_u = db.query(models.User.user_id).filter(models.User.role_id.in_([3, 2, 4])).first() or db.query(models.User.user_id).first()
        valid_updater_id = fallback_u[0] if fallback_u else None

    progress = models.ProductionProgress(
        custom_order_id=payload.custom_order_id,
        updated_by=valid_updater_id,
        stage=payload.stage,
        progress_percentage=payload.progress_percentage,
        remarks=payload.remarks
    )
    db.add(progress)

    # Update worker assignment task status for the specific department
    if payload.department or payload.worker_id:
        query_asgn = db.query(models.WorkerAssignment).filter(models.WorkerAssignment.custom_order_id == payload.custom_order_id)
        if payload.worker_id:
            query_asgn = query_asgn.filter(models.WorkerAssignment.worker_id == payload.worker_id)
        asgns = query_asgn.all()
        for asgn in asgns:
            dept_name = payload.department or "Production"
            if payload.progress_percentage >= 100 or "Complete" in payload.stage or "Done" in payload.stage:
                asgn.task_status = f"{dept_name}: Completed"
            else:
                asgn.task_status = f"{dept_name}: In Progress"

    # Phase 2 QC Gate: Workshop completion moves order to QC_PENDING, not Completed
    if payload.progress_percentage >= 100 or payload.stage == "Ready for Dispatch" or "Assembly Complete" in payload.stage:
        order.order_status = "QC_PENDING"
    elif order.order_status in ["Pending", "Approved"]:
        order.order_status = "In Production"

    db.commit()
    db.refresh(progress)

    return {"message": f"Progress updated for Order #{payload.custom_order_id}: {payload.stage} ({payload.progress_percentage}%)"}

# 7. Customer/Staff Order Tracking Timeline
@router.get("/custom-orders/{order_id}/tracking")
def get_order_tracking(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    progress_history = db.query(models.ProductionProgress).filter(
        models.ProductionProgress.custom_order_id == order_id
    ).order_by(models.ProductionProgress.progress_id.asc()).all()

    workers_info = []
    seen_worker_ids = set()
    assignments = db.query(models.WorkerAssignment).filter(models.WorkerAssignment.custom_order_id == order_id).all()
    for asgn in assignments:
        w_user = db.query(models.User).filter(models.User.user_id == asgn.worker_id).first()
        if w_user:
            seen_worker_ids.add(w_user.user_id)
            workers_info.append({
                "assignment_id": asgn.assignment_id,
                "worker_id": w_user.user_id,
                "worker_name": w_user.full_name,
                "specialization": getattr(w_user, "specialization", "Woodwork & Carpentry") or "Woodwork & Carpentry",
                "task_status": asgn.task_status,
                "assignment_source": "order_level"
            })

    # Also aggregate stage-assigned workers
    stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.order_id == order_id,
        models.ProductionStage.order_type.in_(["Custom", "CUSTOM"])
    ).all()
    for stg in stages:
        if stg.assigned_worker_id and stg.assigned_worker_id not in seen_worker_ids:
            w_user = db.query(models.User).filter(models.User.user_id == stg.assigned_worker_id).first()
            if w_user:
                seen_worker_ids.add(w_user.user_id)
                workers_info.append({
                    "assignment_id": f"stg-{stg.stage_id}",
                    "worker_id": w_user.user_id,
                    "worker_name": w_user.full_name,
                    "specialization": getattr(w_user, "specialization", stg.stage_name) or "Woodwork & Carpentry",
                    "task_status": f"{stg.stage_name}: {stg.status}",
                    "stage_name": stg.stage_name,
                    "assignment_source": "stage_level"
                })

    timeline = []
    for p in progress_history:
        updater_name = "Production Team"
        if p.updated_by:
            u = db.query(models.User).filter(models.User.user_id == p.updated_by).first()
            if u:
                updater_name = u.full_name
        timeline.append({
            "progress_id": p.progress_id,
            "stage": p.stage,
            "progress_percentage": getattr(p, "progress_percentage", 0) or 0,
            "remarks": p.remarks,
            "updated_by": updater_name,
            "updated_at": p.updated_at.isoformat() if getattr(p, "updated_at", None) else None
        })

    return {
        "custom_order_id": order.custom_order_id,
        "furniture_type": order.furniture_type,
        "material": order.material,
        "dimensions": order.dimensions,
        "color": order.color,
        "order_status": order.order_status,
        "estimated_price": float(order.estimated_price) if order.estimated_price else None,
        "assigned_workers": workers_info,
        "timeline": timeline
    }


# Helper: Log Production History Audit Trail
def log_production_history(
    db: Session,
    order_type: str,
    order_id: int,
    action: str,
    stage_name: Optional[str] = None,
    worker_id: Optional[int] = None,
    action_by_id: Optional[int] = None,
    previous_status: Optional[str] = None,
    new_status: Optional[str] = None,
    notes: Optional[str] = None
):
    valid_action_by = None
    if action_by_id:
        user_exists = db.query(models.User.user_id).filter(models.User.user_id == action_by_id).first()
        if user_exists:
            valid_action_by = action_by_id

    if not valid_action_by:
        staff_u = db.query(models.User).filter(models.User.role_id.in_([2, 3])).first() or db.query(models.User).first()
        if staff_u:
            valid_action_by = staff_u.user_id

    hist = models.ProductionHistory(
        order_type=order_type,
        order_id=order_id,
        stage_name=stage_name,
        worker_id=worker_id,
        action_by_id=valid_action_by,
        action=action,
        previous_status=previous_status,
        new_status=new_status,
        notes=notes,
        timestamp=datetime.utcnow()
    )
    db.add(hist)


# Cache for production dashboard overview (TTL: 15 seconds)
_production_overview_cache = {"data": None, "timestamp": 0.0}

# 8. PRODUCTION DASHBOARD OVERVIEW (Real PostgreSQL-backed Metrics)
@router.get("/dashboard/overview")
def get_production_dashboard_overview(db: Session = Depends(get_db)):
    import time
    now_ts = time.time()
    if _production_overview_cache["data"] and (now_ts - _production_overview_cache["timestamp"] < 15):
        return _production_overview_cache["data"]

    # 1. Custom Orders with eager loaded customer (deferring multi-megabyte base64 reference_image & specs)
    customs = (
        db.query(models.CustomOrder)
        .options(
            defer(models.CustomOrder.reference_image),
            defer(models.CustomOrder.design_description),
            joinedload(models.CustomOrder.customer).joinedload(models.Customer.user)
        )
        .filter(models.CustomOrder.custom_order_id.notin_([103, 102, 13, 28, 101, 14, 40]))
        .all()
    )

    # 2. Fabrication Requests with eager loaded customer (deferring drawing_image and cutting_layout)
    fabs = (
        db.query(models.FabricationRequest)
        .options(
            defer(models.FabricationRequest.drawing_image),
            defer(models.FabricationRequest.cutting_layout),
            defer(models.FabricationRequest.requirements),
            joinedload(models.FabricationRequest.customer).joinedload(models.Customer.user)
        )
        .all()
    )

    # Assessments map (Normalize order_type to both 'Custom' and original string)
    assessments = db.query(models.TechnicalAssessment).all()
    assessed_map = {}
    for a in assessments:
        ot = "Custom" if a.order_type in ["Custom", "Customization", "customization", "custom"] else "Fabrication"
        assessed_map[(ot, a.order_id)] = a
        assessed_map[(a.order_type, a.order_id)] = a

    # Quotations map
    quotes = db.query(models.QuotationBreakdown).filter(models.QuotationBreakdown.is_latest == True).all()
    quote_map = {}
    for q in quotes:
        ot = "Custom" if q.order_type in ["Custom", "Customization", "customization", "custom"] else "Fabrication"
        quote_map[(ot, q.order_id)] = q
        quote_map[(q.order_type, q.order_id)] = q

    # Prefetch active stages and assigned worker users to eliminate N+1 queries
    active_stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.status.in_(["READY_FOR_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS"])
    ).order_by(models.ProductionStage.sequence_order.asc()).all()
    active_stage_map = {}
    worker_ids_needed = set()
    for stg in active_stages:
        ot_key = "Custom" if stg.order_type in ["Custom", "Customization", "customization", "custom"] else "Fabrication"
        key = (ot_key, stg.order_id)
        if key not in active_stage_map:
            active_stage_map[key] = stg
            if stg.assigned_worker_id:
                worker_ids_needed.add(stg.assigned_worker_id)

    worker_user_map = {}
    if worker_ids_needed:
        worker_users = db.query(models.User).filter(models.User.user_id.in_(worker_ids_needed)).all()
        worker_user_map = {u.user_id: u.full_name for u in worker_users}

    pending_assessment_cnt = 0
    quotation_pending_cnt = 0
    customer_approved_cnt = 0
    material_pending_cnt = 0
    in_production_cnt = 0
    qc_pending_cnt = 0
    rework_cnt = 0
    completed_today_cnt = 0

    today_date = date.today()

    priorities = []
    active_production_items = []

    # Process Custom Orders (Retail Staff Approved ONLY)
    for c in customs:
        rev_st = (getattr(c, "review_status", None) or "").upper().strip()
        st = c.order_status or "Pending"
        st_upper = st.upper().strip()

        is_retail_approved = (rev_st in ["APPROVED", "APPROVED_BY_RETAIL"]) or (st_upper in ["APPROVED", "APPROVED_BY_RETAIL", "APPROVED_BY_RETAIL_STAFF", "IN ASSESSMENT", "UNDER_ASSESSMENT", "ASSESSMENT_COMPLETE", "ASSESSED", "CUSTOMER_APPROVED", "PAID", "IN_PRODUCTION", "COMPLETED"])
        if not is_retail_approved:
            continue

        pay_st = (c.payment_status or "Pending").upper().strip()
        has_ass = ("Custom", c.custom_order_id) in assessed_map or ("Customization", c.custom_order_id) in assessed_map
        has_price = c.estimated_price is not None and c.estimated_price > 0
        latest_quote = quote_map.get(("Custom", c.custom_order_id)) or quote_map.get(("Customization", c.custom_order_id))
        is_paid = (pay_st == "PAID" or st_upper in ["PAID", "COMPLETED"])
        is_assessed = (has_ass or has_price or (latest_quote is not None) or st_upper in ["ASSESSMENT_COMPLETE", "ASSESSED"]) and not is_paid

        if is_paid:
            customer_approved_cnt += 1
            if st_upper in ["PAID", "MATERIAL_PENDING"]:
                material_pending_cnt += 1
        elif is_assessed:
            quotation_pending_cnt += 1
            priorities.append({
                "id": f"CUS-{c.custom_order_id:04d}",
                "title": f"Custom {c.furniture_type}",
                "issue": "Quotation Stage / Customer Action",
                "priority": c.priority or "NORMAL"
            })
        elif st_upper not in ["COMPLETED", "REJECTED", "CANCELLED"]:
            pending_assessment_cnt += 1
            priorities.append({
                "id": f"CUS-{c.custom_order_id:04d}",
                "title": f"Custom {c.furniture_type}",
                "issue": "Technical Assessment Required",
                "priority": c.priority or "HIGH"
            })

        if st_upper in ["IN PRODUCTION", "IN_PRODUCTION", "STAGE_ASSIGNED", "STAGE_IN_PROGRESS"]:
            in_production_cnt += 1

            active_stage = active_stage_map.get(("Custom", c.custom_order_id))
            worker_name = worker_user_map.get(active_stage.assigned_worker_id, "Unassigned") if (active_stage and active_stage.assigned_worker_id) else "Unassigned"

            cust_u = c.customer.user if c.customer and c.customer.user else None
            active_production_items.append({
                "order_id": f"CUS-{c.custom_order_id:04d}",
                "numeric_id": c.custom_order_id,
                "order_type": "Custom",
                "customer": cust_u.full_name if cust_u else "Customer",
                "product": c.furniture_type,
                "current_stage": active_stage.stage_name if active_stage else "Material Sourcing",
                "worker": worker_name,
                "status": active_stage.status if active_stage else "In Production",
                "priority": c.priority or "NORMAL"
            })

        if st_upper in ["QC_PENDING", "QC PENDING"]:
            qc_pending_cnt += 1
            priorities.append({
                "id": f"CUS-{c.custom_order_id:04d}",
                "title": f"Custom {c.furniture_type}",
                "issue": "QC Required",
                "priority": "HIGH"
            })

        if st_upper in ["REWORK REQUIRED", "REWORK", "QC_FAILED", "QC FAILED"]:
            rework_cnt += 1

        if st_upper == "COMPLETED":
            completed_today_cnt += 1

    # Process Fabrication Requests (Retail Staff Approved ONLY)
    for f in fabs:
        rev_st = (getattr(f, "review_status", None) or "").upper().strip()
        st = f.status or "REQUESTED"
        st_upper = st.upper().strip()

        is_retail_approved = (rev_st in ["APPROVED", "APPROVED_BY_RETAIL"]) or (st_upper in ["APPROVED", "APPROVED_BY_RETAIL", "APPROVED_BY_RETAIL_STAFF", "IN ASSESSMENT", "UNDER_ASSESSMENT", "ASSESSMENT_COMPLETE", "ASSESSED", "CUSTOMER_APPROVED", "PAID", "IN_PRODUCTION", "COMPLETED"])
        if not is_retail_approved:
            continue
        pay_st = (f.payment_status or "Pending").upper().strip()
        has_ass = ("Fabrication", f.fabrication_id) in assessed_map
        has_price = f.estimated_price is not None and f.estimated_price > 0
        latest_quote = quote_map.get(("Fabrication", f.fabrication_id))
        is_assessed = has_ass or has_price or (latest_quote is not None)

        if not is_assessed and st_upper not in ["COMPLETED", "REJECTED", "CANCELLED", "PAID"]:
            pending_assessment_cnt += 1
            priorities.append({
                "id": f"FAB-{f.fabrication_id:04d}",
                "title": f"{f.service_type}",
                "issue": "Technical Assessment Required",
                "priority": f.priority or "HIGH"
            })
        elif is_assessed and (not latest_quote or latest_quote.status == "QUOTATION_PENDING") and st_upper not in ["COMPLETED", "REJECTED", "CANCELLED", "PAID"]:
            quotation_pending_cnt += 1

        if latest_quote and latest_quote.status in ["CUSTOMER_APPROVED", "APPROVED"]:
            customer_approved_cnt += 1
        elif pay_st == "PAID" or st_upper == "PAID":
            customer_approved_cnt += 1

        if pay_st == "PAID" and st_upper in ["PAID", "MATERIAL_PENDING"]:
            material_pending_cnt += 1

        if st_upper in ["IN_PRODUCTION", "IN PRODUCTION"]:
            in_production_cnt += 1
            active_stage = active_stage_map.get(("Fabrication", f.fabrication_id))
            worker_name = worker_user_map.get(active_stage.assigned_worker_id, "Unassigned") if (active_stage and active_stage.assigned_worker_id) else "Unassigned"

            cust_u = f.customer.user if f.customer and f.customer.user else None
            active_production_items.append({
                "order_id": f"FAB-{f.fabrication_id:04d}",
                "numeric_id": f.fabrication_id,
                "order_type": "Fabrication",
                "customer": cust_u.full_name if cust_u else "Customer",
                "product": f.service_type,
                "current_stage": active_stage.stage_name if active_stage else "Production",
                "worker": worker_name,
                "status": active_stage.status if active_stage else "In Production",
                "priority": f.priority or "NORMAL"
            })

        if st_upper in ["QC_PENDING", "QC PENDING"]:
            qc_pending_cnt += 1

        if st_upper in ["REWORK", "QC_FAILED", "QC FAILED", "REWORK REQUIRED"]:
            rework_cnt += 1

        if st_upper in ["COMPLETED"]:
            completed_today_cnt += 1

    # Process On-Site Service Requests (Retail Staff Approved ONLY)
    services = db.query(models.ServiceRequest).all()
    for s in services:
        rev_st = (getattr(s, "review_status", None) or "").upper().strip()
        st = s.status or "PENDING"
        st_upper = st.upper().strip()

        is_retail_approved = (rev_st in ["APPROVED", "APPROVED_BY_RETAIL"]) or (st_upper in ["APPROVED", "APPROVED_BY_RETAIL", "APPROVED_BY_RETAIL_STAFF", "IN ASSESSMENT", "UNDER_ASSESSMENT", "ASSESSMENT_COMPLETE", "ASSESSED", "CUSTOMER_APPROVED", "PAID", "IN_PRODUCTION", "COMPLETED", "QUOTED", "WORKER_ASSIGNED", "IN_PROGRESS"])
        if not is_retail_approved:
            continue

        pay_st = (s.payment_status or "Pending").upper().strip()
        has_price = s.estimated_price is not None and s.estimated_price > 0
        is_paid = (pay_st == "PAID" or st_upper in ["PAID", "COMPLETED"])

        if is_paid:
            customer_approved_cnt += 1
        elif has_price or st_upper in ["QUOTED", "ASSESSED"]:
            quotation_pending_cnt += 1
        elif st_upper not in ["COMPLETED", "REJECTED", "CANCELLED"]:
            pending_assessment_cnt += 1
            priorities.append({
                "id": f"ONS-{s.service_id:04d}",
                "title": f"On-Site {s.service_category}",
                "issue": "Artisan Dispatch / Assessment",
                "priority": s.priority or "HIGH"
            })

        if st_upper in ["IN_PROGRESS", "WORKER_ASSIGNED", "IN_PRODUCTION"]:
            in_production_cnt += 1
            cust_u = s.customer.user if s.customer and s.customer.user else None
            active_production_items.append({
                "order_id": f"ONS-{s.service_id:04d}",
                "numeric_id": s.service_id,
                "order_type": "On-Site Service",
                "customer": cust_u.full_name if cust_u else "Customer",
                "product": s.service_category,
                "current_stage": "On-Site Service Visit",
                "worker": "Field Artisan Team",
                "status": "In Progress",
                "priority": s.priority or "NORMAL"
            })

    overview_result = {
        "metrics": {
            "pending_assessment": pending_assessment_cnt,
            "quotation_pending": quotation_pending_cnt,
            "customer_approved": customer_approved_cnt,
            "material_pending": material_pending_cnt,
            "in_production": in_production_cnt,
            "qc_pending": qc_pending_cnt,
            "rework": rework_cnt,
            "completed_today": completed_today_cnt,
        },
        "priorities": priorities[:8],
        "active_production": active_production_items
    }
    _production_overview_cache["data"] = overview_result
    _production_overview_cache["timestamp"] = now_ts
    return overview_result


# 9. ASSESSMENT QUEUE API (Retail Staff Approved Requests ONLY)
@router.get("/assessment-queue")
def get_assessment_queue(
    category_filter: Optional[str] = "ALL",  # ALL, CUSTOMIZATION, FABRICATION, READYMADE
    tab_filter: Optional[str] = "ALL",       # ALL, PENDING_ASSESSMENT, IN_ASSESSMENT, ASSESSMENT_COMPLETE
    db: Session = Depends(get_db)
):
    items = []

    # Get completed technical assessments & quotations map
    assessments = db.query(models.TechnicalAssessment).all()
    assessed_set = {(a.order_type, a.order_id) for a in assessments}
    quotes = db.query(models.QuotationBreakdown).filter(models.QuotationBreakdown.is_latest == True).all()
    quote_set = {(q.order_type, q.order_id) for q in quotes}

    cat_upper = (category_filter or "ALL").upper().strip()
    tab_upper = (tab_filter or "ALL").upper().strip()

    # 1. Customization Requests (Retail Staff Approved ONLY)
    if cat_upper in ["ALL", "CUSTOMIZATION"]:
        c_query = db.query(models.CustomOrder)
        customs = c_query.order_by(models.CustomOrder.order_date.desc()).all()
        for c in customs:
            rev_st = (getattr(c, "review_status", None) or "").upper().strip()
            ord_st = (c.order_status or "").upper().strip()

            # Strictly require Retail Staff approval
            is_retail_approved = (rev_st in ["APPROVED", "APPROVED_BY_RETAIL"]) or (ord_st in ["APPROVED", "APPROVED_BY_RETAIL", "APPROVED_BY_RETAIL_STAFF", "IN ASSESSMENT", "UNDER_ASSESSMENT", "ASSESSMENT_COMPLETE", "ASSESSED", "CUSTOMER_APPROVED", "PAID", "IN_PRODUCTION", "COMPLETED"])
            if not is_retail_approved:
                continue

            cust_u = c.customer.user if c.customer and c.customer.user else None
            has_tech_ass = ("Custom", c.custom_order_id) in assessed_set or ("Customization", c.custom_order_id) in assessed_set
            has_quote = ("Custom", c.custom_order_id) in quote_set or ("Customization", c.custom_order_id) in quote_set
            has_price = c.estimated_price is not None and c.estimated_price > 0
            is_paid = (c.payment_status or "").upper() == "PAID" or ord_st in ["PAID", "COMPLETED"]
            
            is_assessed = (has_tech_ass or has_quote or has_price or ord_st in ["ASSESSMENT_COMPLETE", "ASSESSED"]) and not is_paid
            
            st_badge = "PENDING_ASSESSMENT"
            if is_assessed:
                st_badge = "ASSESSMENT_COMPLETE"
            elif c.order_status in ["In Assessment", "UNDER_ASSESSMENT"]:
                st_badge = "IN_ASSESSMENT"

            if tab_upper != "ALL" and st_badge != tab_upper:
                continue

            items.append({
                "request_id": f"CUS-{c.custom_order_id:04d}",
                "numeric_id": c.custom_order_id,
                "order_type": "Customization",
                "customer_name": cust_u.full_name if cust_u else "Customer",
                "customer_email": cust_u.email if cust_u else "",
                "title": f"Custom {c.furniture_type}",
                "furniture_type": c.furniture_type,
                "material": c.material,
                "dimensions": c.dimensions,
                "color": c.color,
                "description": c.design_description,
                "reference_image": c.reference_image,
                "order_date": c.order_date.isoformat() if c.order_date else None,
                "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
                "priority": c.priority or "NORMAL",
                "assessment_status": st_badge,
                "order_status": c.order_status,
                "payment_status": c.payment_status,
                "estimated_price": float(c.estimated_price) if c.estimated_price else None,
                "is_assessed": is_assessed
            })

    # 2. Fabrication Requests (Retail Staff Approved ONLY)
    if cat_upper in ["ALL", "FABRICATION"]:
        f_query = db.query(models.FabricationRequest)
        fabs = f_query.order_by(models.FabricationRequest.created_at.desc()).all()
        for f in fabs:
            rev_st = (getattr(f, "review_status", None) or "").upper().strip()
            fst = (f.status or "").upper().strip()

            # Strictly require Retail Staff approval
            is_retail_approved = (rev_st in ["APPROVED", "APPROVED_BY_RETAIL"]) or (fst in ["APPROVED", "APPROVED_BY_RETAIL", "APPROVED_BY_RETAIL_STAFF", "IN ASSESSMENT", "UNDER_ASSESSMENT", "ASSESSMENT_COMPLETE", "ASSESSED", "CUSTOMER_APPROVED", "PAID", "IN_PRODUCTION", "COMPLETED"])
            if not is_retail_approved:
                continue

            cust_u = f.customer.user if f.customer and f.customer.user else None
            has_tech_ass = ("Fabrication", f.fabrication_id) in assessed_set
            has_quote = ("Fabrication", f.fabrication_id) in quote_set
            has_price = f.estimated_price is not None and f.estimated_price > 0

            is_assessed = has_tech_ass or has_quote or has_price

            st_badge = "PENDING_ASSESSMENT"
            if is_assessed:
                st_badge = "ASSESSMENT_COMPLETE"
            elif f.status in ["In Assessment", "IN_ASSESSMENT"]:
                st_badge = "IN_ASSESSMENT"

            if tab_upper != "ALL" and st_badge != tab_upper:
                continue

            items.append({
                "request_id": f"FAB-{f.fabrication_id:04d}",
                "numeric_id": f.fabrication_id,
                "order_type": "Fabrication",
                "customer_name": cust_u.full_name if cust_u else "Customer",
                "customer_email": cust_u.email if cust_u else "",
                "title": f"{f.service_type}",
                "furniture_type": f.service_type,
                "material": f.material_source or "Company Stock Material",
                "material_source": f.material_source or "Company Stock Material",
                "customer_material_id": f.customer_material_id,
                "dimensions": f.dimensions,
                "quantity": f.quantity,
                "description": f.requirements,
                "reference_image": f.drawing_image,
                "order_date": f.created_at.isoformat() if f.created_at else None,
                "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
                "priority": f.priority or "NORMAL",
                "assessment_status": st_badge,
                "order_status": f.status,
                "payment_status": f.payment_status,
                "estimated_price": float(f.estimated_price) if f.estimated_price else None,
                "is_assessed": is_assessed
            })

    # 3. On-Site Service Requests (Retail Staff Approved ONLY)
    if cat_upper in ["ALL", "SERVICES", "ON-SITE", "ONSITE", "SERVICE"]:
        s_query = db.query(models.ServiceRequest)
        services = s_query.order_by(models.ServiceRequest.created_at.desc()).all()
        for s in services:
            rev_st = (getattr(s, "review_status", None) or "").upper().strip()
            sst = (s.status or "").upper().strip()

            is_retail_approved = (rev_st in ["APPROVED", "APPROVED_BY_RETAIL"]) or (sst in ["APPROVED", "APPROVED_BY_RETAIL", "APPROVED_BY_RETAIL_STAFF", "IN ASSESSMENT", "UNDER_ASSESSMENT", "ASSESSMENT_COMPLETE", "ASSESSED", "CUSTOMER_APPROVED", "PAID", "IN_PRODUCTION", "COMPLETED", "QUOTED", "WORKER_ASSIGNED", "IN_PROGRESS"])
            if not is_retail_approved:
                continue

            cust_u = s.customer.user if s.customer and s.customer.user else None
            has_price = s.estimated_price is not None and s.estimated_price > 0
            is_assessed = has_price or sst in ["ASSESSED", "QUOTED", "APPROVED", "PAID"]

            st_badge = "PENDING_ASSESSMENT"
            if is_assessed:
                st_badge = "ASSESSMENT_COMPLETE"
            elif sst in ["IN_ASSESSMENT", "UNDER_ASSESSMENT", "IN ASSESSMENT"]:
                st_badge = "IN_ASSESSMENT"

            if tab_upper != "ALL" and st_badge != tab_upper:
                continue

            items.append({
                "request_id": f"ONS-{s.service_id:04d}",
                "numeric_id": s.service_id,
                "order_type": "On-Site Service",
                "customer_name": cust_u.full_name if cust_u else "Customer",
                "customer_email": cust_u.email if cust_u else "",
                "title": s.service_category if (s.service_category or "").lower().startswith("on-site") else f"On-Site {s.service_category}",
                "furniture_type": s.service_category,
                "material": f"{s.city}, {s.pincode}" if s.city else "On-Site Location",
                "dimensions": s.address or "Client Address",
                "quantity": 1,
                "description": s.description,
                "reference_image": s.photos,
                "order_date": s.created_at.isoformat() if s.created_at else None,
                "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
                "priority": s.priority or "NORMAL",
                "assessment_status": st_badge,
                "order_status": s.status,
                "payment_status": s.payment_status or "Pending",
                "estimated_price": float(s.estimated_price) if s.estimated_price else None,
                "is_assessed": is_assessed
            })

    items.sort(key=lambda x: x["order_date"] or "", reverse=True)
    return items


# 10. SAVE / GET TECHNICAL ASSESSMENT
class AssessmentPayload(BaseModel):
    order_type: str  # Custom / Fabrication
    order_id: int
    assessed_by_id: Optional[int] = 1
    feasibility: str = "FEASIBLE"  # FEASIBLE / NOT_FEASIBLE
    unfeasibility_reason: Optional[str] = None
    required_operations: Optional[str] = None
    required_stages: Optional[List[str]] = None
    material_requirements: Optional[str] = None
    machine_requirements: Optional[str] = None
    worker_skill_requirements: Optional[str] = None
    labour_hours: Optional[float] = 0.0
    machine_hours: Optional[float] = 0.0
    estimated_duration_days: Optional[float] = 1.0
    estimated_completion_date: Optional[str] = None
    material_cost: Optional[float] = 0.0
    labour_cost: Optional[float] = 0.0
    machine_cost: Optional[float] = 0.0
    finishing_cost: Optional[float] = 0.0
    other_cost: Optional[float] = 0.0
    production_notes: Optional[str] = None
    technical_notes: Optional[str] = None


@router.post("/assessments")
def save_technical_assessment(payload: AssessmentPayload, db: Session = Depends(get_db)):
    # Check existing assessment
    existing = db.query(models.TechnicalAssessment).filter(
        models.TechnicalAssessment.order_type == payload.order_type,
        models.TechnicalAssessment.order_id == payload.order_id
    ).first()

    # Resolve valid staff user_id to satisfy FK constraint
    staff_user = None
    if payload.assessed_by_id:
        staff_user = db.query(models.User).filter(models.User.user_id == payload.assessed_by_id).first()
    if not staff_user:
        staff_user = db.query(models.User).filter(models.User.user_id.in_([3, 2, 4])).first() or db.query(models.User).first()
    valid_staff_id = staff_user.user_id if staff_user else None

    stages_str = ",".join(payload.required_stages) if payload.required_stages else None

    # Calculate total cost automatically
    total_calculated = (payload.material_cost or 0.0) + (payload.labour_cost or 0.0) + (payload.machine_cost or 0.0) + (payload.finishing_cost or 0.0) + (payload.other_cost or 0.0)

    date_obj = None
    if payload.estimated_completion_date:
        try:
            date_obj = datetime.strptime(payload.estimated_completion_date, "%Y-%m-%d").date()
        except:
            pass

    if existing:
        existing.assessed_by_id = valid_staff_id
        existing.feasibility = payload.feasibility.upper()
        existing.unfeasibility_reason = payload.unfeasibility_reason
        existing.required_operations = payload.required_operations
        existing.required_stages = stages_str
        existing.material_requirements = payload.material_requirements
        existing.machine_requirements = payload.machine_requirements
        existing.worker_skill_requirements = payload.worker_skill_requirements
        existing.labour_hours = payload.labour_hours
        existing.machine_hours = payload.machine_hours
        existing.estimated_duration_days = payload.estimated_duration_days
        existing.estimated_completion_date = date_obj
        existing.material_cost = payload.material_cost
        existing.labour_cost = payload.labour_cost
        existing.machine_cost = payload.machine_cost
        existing.finishing_cost = payload.finishing_cost
        existing.other_cost = payload.other_cost
        existing.total_cost = total_calculated
        existing.production_notes = payload.production_notes
        existing.technical_notes = payload.technical_notes
        existing.assessed_at = datetime.utcnow()
        ass_obj = existing
    else:
        ass_obj = models.TechnicalAssessment(
            order_type=payload.order_type,
            order_id=payload.order_id,
            assessed_by_id=valid_staff_id,
            feasibility=payload.feasibility.upper(),
            unfeasibility_reason=payload.unfeasibility_reason,
            required_operations=payload.required_operations,
            required_stages=stages_str,
            material_requirements=payload.material_requirements,
            machine_requirements=payload.machine_requirements,
            worker_skill_requirements=payload.worker_skill_requirements,
            labour_hours=payload.labour_hours,
            machine_hours=payload.machine_hours,
            estimated_duration_days=payload.estimated_duration_days,
            estimated_completion_date=date_obj,
            material_cost=payload.material_cost,
            labour_cost=payload.labour_cost,
            machine_cost=payload.machine_cost,
            finishing_cost=payload.finishing_cost,
            other_cost=payload.other_cost,
            total_cost=total_calculated,
            production_notes=payload.production_notes,
            technical_notes=payload.technical_notes,
            assessed_at=datetime.utcnow()
        )
        db.add(ass_obj)

    # Update parent order status
    if payload.order_type == "Custom":
        c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.order_id).first()
        if c_ord:
            if payload.feasibility.upper() == "FEASIBLE":
                c_ord.order_status = "ASSESSMENT_COMPLETE"
                c_ord.estimated_price = total_calculated
            else:
                c_ord.order_status = "NOT_FEASIBLE"
    elif payload.order_type == "Fabrication":
        f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.order_id).first()
        if f_ord:
            if payload.feasibility.upper() == "FEASIBLE":
                f_ord.status = "ASSESSED"
                f_ord.estimated_price = total_calculated
            else:
                f_ord.status = "NOT_FEASIBLE"
    elif payload.order_type in ["Service", "On-Site Service", "On-Site"]:
        s_ord = db.query(models.ServiceRequest).filter(models.ServiceRequest.service_id == payload.order_id).first()
        if s_ord:
            if payload.feasibility.upper() == "FEASIBLE":
                s_ord.status = "QUOTED"
                s_ord.estimated_price = total_calculated
            else:
                s_ord.status = "NOT_FEASIBLE"

    log_production_history(
        db,
        order_type=payload.order_type,
        order_id=payload.order_id,
        action="Technical Assessment Saved",
        action_by_id=payload.assessed_by_id,
        new_status=payload.feasibility.upper(),
        notes=f"Total cost estimated at ₹{total_calculated:,.2f}"
    )

    db.commit()
    return {"message": "Technical assessment saved successfully", "assessment_id": ass_obj.assessment_id, "total_cost": total_calculated}


@router.get("/assessments/{order_type}/{order_id}")
def get_technical_assessment(order_type: str, order_id: int, db: Session = Depends(get_db)):
    ass = db.query(models.TechnicalAssessment).filter(
        models.TechnicalAssessment.order_type == order_type,
        models.TechnicalAssessment.order_id == order_id
    ).first()

    if not ass:
        return None

    stages_list = [s.strip() for s in ass.required_stages.split(",")] if ass.required_stages else []

    return {
        "assessment_id": ass.assessment_id,
        "order_type": ass.order_type,
        "order_id": ass.order_id,
        "feasibility": ass.feasibility,
        "unfeasibility_reason": ass.unfeasibility_reason,
        "required_operations": ass.required_operations,
        "required_stages": stages_list,
        "material_requirements": ass.material_requirements,
        "machine_requirements": ass.machine_requirements,
        "worker_skill_requirements": ass.worker_skill_requirements,
        "labour_hours": float(ass.labour_hours) if ass.labour_hours else 0,
        "machine_hours": float(ass.machine_hours) if ass.machine_hours else 0,
        "estimated_duration_days": float(ass.estimated_duration_days) if ass.estimated_duration_days else 1,
        "estimated_completion_date": ass.estimated_completion_date.isoformat() if ass.estimated_completion_date else None,
        "material_cost": float(ass.material_cost) if ass.material_cost else 0,
        "labour_cost": float(ass.labour_cost) if ass.labour_cost else 0,
        "machine_cost": float(ass.machine_cost) if ass.machine_cost else 0,
        "finishing_cost": float(ass.finishing_cost) if ass.finishing_cost else 0,
        "other_cost": float(ass.other_cost) if ass.other_cost else 0,
        "total_cost": float(ass.total_cost) if ass.total_cost else 0,
        "production_notes": ass.production_notes,
        "technical_notes": ass.technical_notes,
        "assessed_at": ass.assessed_at.isoformat() if ass.assessed_at else None
    }


# 11. QUOTATION GENERATION & VERSIONING
class QuotationCreatePayload(BaseModel):
    order_type: str  # Custom / Fabrication / Service
    order_id: int
    created_by_id: Optional[int] = 1
    material_cost: float = 0.0
    labour_cost: float = 0.0
    machine_cost: float = 0.0
    finishing_cost: float = 0.0
    assembly_cost: float = 0.0
    service_cost: float = 0.0
    discount: float = 0.0
    tax: float = 0.0
    estimated_duration: Optional[str] = "3 Working Days"
    estimated_completion_date: Optional[str] = None
    notes: Optional[str] = None


@router.post("/quotations")
def generate_or_revise_quotation(payload: QuotationCreatePayload, db: Session = Depends(get_db)):
    # Deactivate existing active quotations for this order
    existing_quotes = db.query(models.QuotationBreakdown).filter(
        models.QuotationBreakdown.order_type == payload.order_type,
        models.QuotationBreakdown.order_id == payload.order_id
    ).all()

    new_version = 1
    for q in existing_quotes:
        q.is_latest = False
        if q.version >= new_version:
            new_version = q.version + 1

    total = (payload.material_cost + payload.labour_cost + payload.machine_cost + payload.finishing_cost + payload.assembly_cost + payload.service_cost - payload.discount) + payload.tax

    date_obj = None
    if payload.estimated_completion_date:
        try:
            date_obj = datetime.strptime(payload.estimated_completion_date, "%Y-%m-%d").date()
        except:
            pass

    quote = models.QuotationBreakdown(
        order_type=payload.order_type,
        order_id=payload.order_id,
        material_cost=payload.material_cost,
        labour_cost=payload.labour_cost,
        machine_cost=payload.machine_cost,
        finishing_cost=payload.finishing_cost,
        assembly_cost=payload.assembly_cost,
        service_cost=payload.service_cost,
        discount=payload.discount,
        tax=payload.tax,
        total_amount=total,
        status="QUOTATION_READY",
        version=new_version,
        is_latest=True,
        estimated_duration=payload.estimated_duration,
        estimated_completion_date=date_obj,
        notes=payload.notes,
        created_by_id=payload.created_by_id or 1,
        created_at=datetime.utcnow()
    )
    db.add(quote)

    # Update parent order estimated price & status
    if payload.order_type == "Custom":
        c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.order_id).first()
        if c_ord:
            c_ord.estimated_price = total
            c_ord.order_status = "Quote Provided"
            if c_ord.customer:
                models.Notification(
                    user_id=c_ord.customer.user_id,
                    title=f"Quotation Ready — #CUS-{c_ord.custom_order_id:04d}",
                    message=f"Production Staff has generated a technical quotation of ₹{total:,.2f} for your custom furniture request! Please review & approve to proceed.",
                    created_at=datetime.utcnow()
                )
    elif payload.order_type == "Fabrication":
        f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.order_id).first()
        if f_ord:
            f_ord.estimated_price = total
            f_ord.status = "QUOTED"
            if f_ord.customer:
                models.Notification(
                    user_id=f_ord.customer.user_id,
                    title=f"Fabrication Quotation Ready — #FAB-{f_ord.fabrication_id:04d}",
                    message=f"Production Staff generated a quotation of ₹{total:,.2f} for your fabrication request. Review & approve to add to cart.",
                    created_at=datetime.utcnow()
                )
    elif payload.order_type in ["Service", "On-Site Service", "On-Site"]:
        s_ord = db.query(models.ServiceRequest).filter(models.ServiceRequest.service_id == payload.order_id).first()
        if s_ord:
            s_ord.estimated_price = total
            s_ord.status = "QUOTED"
            if s_ord.customer:
                models.Notification(
                    user_id=s_ord.customer.user_id,
                    title=f"Service Quotation Ready — #SRV-{s_ord.service_id:04d}",
                    message=f"Production Staff generated a quotation of ₹{total:,.2f} for your on-site skilled service visit. Review & approve in your dashboard.",
                    created_at=datetime.utcnow()
                )

    log_production_history(
        db,
        order_type=payload.order_type,
        order_id=payload.order_id,
        action=f"Quotation Generated (v{new_version})",
        action_by_id=payload.created_by_id,
        new_status="QUOTATION_READY",
        notes=f"Quotation total: ₹{total:,.2f}"
    )

    db.commit()
    db.refresh(quote)
    return {
        "message": f"Quotation v{new_version} generated successfully",
        "quote_id": quote.quote_id,
        "version": quote.version,
        "total_amount": float(quote.total_amount)
    }


@router.get("/quotations/{order_type}/{order_id}")
def get_order_quotations(order_type: str, order_id: int, db: Session = Depends(get_db)):
    quotes = db.query(models.QuotationBreakdown).filter(
        models.QuotationBreakdown.order_type == order_type,
        models.QuotationBreakdown.order_id == order_id
    ).order_by(models.QuotationBreakdown.version.desc()).all()

    res = []
    for q in quotes:
        res.append({
            "quote_id": q.quote_id,
            "order_type": q.order_type,
            "order_id": q.order_id,
            "version": q.version,
            "is_latest": q.is_latest,
            "status": q.status,
            "material_cost": float(q.material_cost),
            "labour_cost": float(q.labour_cost),
            "machine_cost": float(q.machine_cost),
            "finishing_cost": float(q.finishing_cost),
            "assembly_cost": float(q.assembly_cost),
            "service_cost": float(q.service_cost),
            "discount": float(q.discount),
            "tax": float(q.tax),
            "total_amount": float(q.total_amount),
            "estimated_duration": q.estimated_duration,
            "estimated_completion_date": q.estimated_completion_date.isoformat() if q.estimated_completion_date else None,
            "notes": q.notes,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "approved_at": q.approved_at.isoformat() if q.approved_at else None
        })
    return res


# 12. CUSTOMER QUOTATION APPROVAL / REJECTION
class CustomerQuotationResponsePayload(BaseModel):
    response: str  # APPROVE / REJECT
    notes: Optional[str] = None


@router.put("/quotations/{quote_id}/customer-response")
def customer_quotation_response(quote_id: int, payload: CustomerQuotationResponsePayload, db: Session = Depends(get_db)):
    quote = db.query(models.QuotationBreakdown).filter(models.QuotationBreakdown.quote_id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    resp = payload.response.upper().strip()
    if resp == "APPROVE":
        quote.status = "CUSTOMER_APPROVED"
        quote.approved_at = datetime.utcnow()

        if quote.order_type == "Custom":
            c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == quote.order_id).first()
            if c_ord:
                c_ord.order_status = "CUSTOMER_APPROVED"
        elif quote.order_type == "Fabrication":
            f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == quote.order_id).first()
            if f_ord:
                f_ord.status = "APPROVED"

        log_production_history(
            db,
            order_type=quote.order_type,
            order_id=quote.order_id,
            action="Quotation Approved by Customer",
            new_status="CUSTOMER_APPROVED",
            notes="Customer approved quotation. Add to cart is now unlocked."
        )
    elif resp == "REJECT":
        quote.status = "CUSTOMER_REJECTED"
        quote.rejected_at = datetime.utcnow()

        if quote.order_type == "Custom":
            c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == quote.order_id).first()
            if c_ord:
                c_ord.order_status = "CUSTOMER_REJECTED"
        elif quote.order_type == "Fabrication":
            f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == quote.order_id).first()
            if f_ord:
                f_ord.status = "REJECTED"

        log_production_history(
            db,
            order_type=quote.order_type,
            order_id=quote.order_id,
            action="Quotation Rejected by Customer",
            new_status="CUSTOMER_REJECTED",
            notes=payload.notes or "Customer declined quotation terms."
        )

    db.commit()
    return {"message": f"Quotation #{quote_id} status updated to {quote.status}", "status": quote.status}


# 13. STAGE SETUP & SEQUENCING
class SetupStagesPayload(BaseModel):
    order_type: str  # Custom / Fabrication
    order_id: int
    stages: List[dict]  # [{"stage_name": "Cutting", "sequence_order": 1, "required_skill": "Woodwork & Carpentry"}, ...]


@router.post("/stages/setup")
def setup_production_stages(payload: SetupStagesPayload, db: Session = Depends(get_db)):
    # Clear existing stages for this order
    db.query(models.ProductionStage).filter(
        models.ProductionStage.order_type == payload.order_type,
        models.ProductionStage.order_id == payload.order_id
    ).delete(synchronize_session=False)

    created_stages = []
    for idx, st_data in enumerate(payload.stages):
        seq = st_data.get("sequence_order", idx + 1)
        st_name = st_data.get("stage_name")
        req_skill = st_data.get("required_skill") or st_name

        # First stage starts as READY_FOR_ASSIGNMENT, others LOCKED
        init_st = "READY_FOR_ASSIGNMENT" if seq == 1 else "LOCKED"

        stage_obj = models.ProductionStage(
            order_type=payload.order_type,
            order_id=payload.order_id,
            stage_name=st_name,
            sequence_order=seq,
            required_skill=req_skill,
            status=init_st,
            progress_percentage=0
        )
        db.add(stage_obj)
        created_stages.append(stage_obj)

    log_production_history(
        db,
        order_type=payload.order_type,
        order_id=payload.order_id,
        action="Production Stages Defined",
        notes=f"Configured {len(created_stages)} required stages in sequence."
    )

    db.commit()
    return {"message": f"Configured {len(created_stages)} required stages successfully"}


@router.get("/stages/{order_type}/{order_id}")
def get_order_production_stages(order_type: str, order_id: int, db: Session = Depends(get_db)):
    stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.order_type == order_type,
        models.ProductionStage.order_id == order_id
    ).order_by(models.ProductionStage.sequence_order.asc()).all()

    res = []
    for s in stages:
        w_user = db.query(models.User).filter(models.User.user_id == s.assigned_worker_id).first() if s.assigned_worker_id else None
        res.append({
            "stage_id": s.stage_id,
            "order_type": s.order_type,
            "order_id": s.order_id,
            "stage_name": s.stage_name,
            "sequence_order": s.sequence_order,
            "required_skill": s.required_skill,
            "assigned_worker_id": s.assigned_worker_id,
            "assigned_worker_name": w_user.full_name if w_user else None,
            "status": s.status,
            "progress_percentage": s.progress_percentage,
            "remarks": s.remarks,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None
        })
    return res


# 14. WORKER SKILL FILTERING & SMART RECOMMENDATION FOR STAGE ASSIGNMENT
@router.get("/workers/available-for-stage")
def get_workers_available_for_stage(
    stage_name: Optional[str] = None,
    required_skill: Optional[str] = None,
    db: Session = Depends(get_db)
):
    worker_role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
    if not worker_role:
        return []

    all_workers = db.query(models.User).filter(models.User.role_id == worker_role.role_id, models.User.status == True).all()
    skill_target = (required_skill or stage_name or "").strip().lower()

    filtered = []
    min_load = 999999
    recommended_worker_id = None

    for w in all_workers:
        spec = (w.specialization or "Woodwork & Carpentry").lower()
        
        # Check matching skill or specialization
        is_match = False
        if not skill_target or "all" in skill_target:
            is_match = True
        elif skill_target in spec or spec in skill_target:
            is_match = True
        elif "wood" in skill_target or "carpent" in skill_target or "cut" in skill_target or "shape" in skill_target:
            is_match = ("wood" in spec or "carpent" in spec)
        elif "upholster" in skill_target or "fabric" in skill_target:
            is_match = ("upholster" in spec or "fabric" in spec)
        elif "assembl" in skill_target or "qa" in skill_target:
            is_match = ("assembl" in spec or "qa" in spec or "wood" in spec)
        elif "finish" in skill_target or "polish" in skill_target or "sand" in skill_target:
            is_match = ("finish" in spec or "polish" in spec or "sand" in spec or "wood" in spec)

        if is_match:
            # Check availability status table
            avail_row = db.query(models.WorkerAvailability).filter(models.WorkerAvailability.worker_id == w.user_id).first()
            avail_status = (avail_row.status if avail_row else "AVAILABLE").upper()

            # Check if currently on approved leave
            active_leave = db.query(models.WorkerLeave).filter(
                models.WorkerLeave.worker_id == w.user_id,
                models.WorkerLeave.status == "Approved"
            ).first()
            if active_leave:
                avail_status = "ON_LEAVE"

            # Check active stage assignment task count from PostgreSQL
            stage_tasks_count = db.query(models.ProductionStage).filter(
                models.ProductionStage.assigned_worker_id == w.user_id,
                models.ProductionStage.status.in_(["ASSIGNED", "IN_PROGRESS"])
            ).count()

            asgn_tasks_count = db.query(models.WorkerAssignment).filter(
                models.WorkerAssignment.worker_id == w.user_id,
                models.WorkerAssignment.task_status.contains("Assigned")
            ).count()

            total_active_load = max(stage_tasks_count, asgn_tasks_count)

            is_available_for_new_task = (avail_status == "AVAILABLE") and (total_active_load < 5)
            calc_status = "Available" if is_available_for_new_task else ("On Leave" if avail_status == "ON_LEAVE" else "Busy")

            if is_available_for_new_task and total_active_load < min_load:
                min_load = total_active_load
                recommended_worker_id = w.user_id

            filtered.append({
                "worker_id": w.user_id,
                "full_name": w.full_name,
                "email": w.email,
                "phone": w.phone,
                "specialization": w.specialization or "Woodwork & Carpentry",
                "active_tasks_count": total_active_load,
                "availability_status": avail_status,
                "status": calc_status,
                "is_recommended": False
            })

    for item in filtered:
        if item["worker_id"] == recommended_worker_id:
            item["is_recommended"] = True
            item["recommendation_reason"] = f"Matches required stage skill '{required_skill or stage_name}', status is Available, and has lowest active task load ({item['active_tasks_count']} active tasks)."

    return filtered


# 15. STAGE-BY-STAGE WORKER ASSIGNMENT
class StageWorkerAssignPayload(BaseModel):
    stage_id: int
    worker_id: int
    assigned_by_id: Optional[int] = 1
    notes: Optional[str] = None


@router.post("/assign-stage-worker")
def assign_worker_to_stage(
    payload: StageWorkerAssignPayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    require_staff_user(current_user)
    stage = db.query(models.ProductionStage).filter(models.ProductionStage.stage_id == payload.stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Production stage not found")

    if stage.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot assign worker to an already completed stage")

    # Enforce parent order prerequisites
    if stage.order_type in ["Custom", "CUSTOM"]:
        c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == stage.order_id).first()
        if c_ord:
            validate_custom_order_assignment_prerequisites(c_ord)
    elif stage.order_type in ["Fabrication", "FABRICATION"]:
        f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == stage.order_id).first()
        if f_ord:
            validate_fabrication_assignment_prerequisites(db, f_ord)

    req_skill = stage.required_skill or stage.stage_name
    worker = validate_worker_eligibility(db, payload.worker_id, required_skill=req_skill)

    stage.assigned_worker_id = payload.worker_id
    stage.status = "ASSIGNED"
    if payload.notes:
        stage.remarks = payload.notes

    # Auto update custom order status to In Production
    if stage.order_type == "Custom":
        c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == stage.order_id).first()
        if c_ord and c_ord.order_status in ["Approved", "Paid", "READY_FOR_PRODUCTION"]:
            c_ord.order_status = "In Production"
    elif stage.order_type == "Fabrication":
        f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == stage.order_id).first()
        if f_ord and f_ord.status in ["APPROVED", "PAID"]:
            f_ord.status = "IN_PRODUCTION"

    # Create worker notification
    models.Notification(
        user_id=payload.worker_id,
        title=f"New Task Assigned — {stage.stage_name}",
        message=f"You have been assigned to stage '{stage.stage_name}' for {stage.order_type} Order #{stage.order_id:04d}.",
        created_at=datetime.utcnow()
    )

    log_production_history(
        db,
        order_type=stage.order_type,
        order_id=stage.order_id,
        stage_name=stage.stage_name,
        worker_id=payload.worker_id,
        action_by_id=payload.assigned_by_id,
        action=f"Worker Assigned to {stage.stage_name}",
        new_status="ASSIGNED",
        notes=f"Assigned worker {worker.full_name} for stage {stage.stage_name}."
    )

    db.commit()
    return {"message": f"Worker {worker.full_name} assigned to stage '{stage.stage_name}'", "stage_id": stage.stage_id}


# 16. WORKER PORTAL TASKS & STAGE COMPLETION
@router.get("/worker/my-tasks")
def get_worker_my_tasks(worker_id: int, db: Session = Depends(get_db)):
    stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.assigned_worker_id == worker_id
    ).order_by(models.ProductionStage.started_at.desc().nullslast()).all()

    tasks = []
    for s in stages:
        req_title = ""
        specs = {}
        ref_image = None
        desc = None

        if s.order_type == "Custom":
            ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == s.order_id).first()
            if ord_obj:
                req_title = f"Custom {ord_obj.furniture_type}"
                specs = {
                    "furniture_type": ord_obj.furniture_type,
                    "material": ord_obj.material,
                    "dimensions": ord_obj.dimensions,
                    "color": ord_obj.color,
                }
                ref_image = ord_obj.reference_image
                desc = ord_obj.design_description
        elif s.order_type == "Fabrication":
            fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == s.order_id).first()
            if fab_obj:
                req_title = f"Fabrication: {fab_obj.service_type}"
                specs = {
                    "service_type": fab_obj.service_type,
                    "material_source": fab_obj.material_source,
                    "dimensions": fab_obj.dimensions,
                    "quantity": fab_obj.quantity,
                }
                ref_image = fab_obj.drawing_image
                desc = fab_obj.requirements

        tasks.append({
            "stage_id": s.stage_id,
            "order_type": s.order_type,
            "order_id": s.order_id,
            "title": req_title,
            "stage_name": s.stage_name,
            "sequence_order": s.sequence_order,
            "status": s.status,
            "progress_percentage": s.progress_percentage,
            "remarks": s.remarks,
            "specifications": specs,
            "reference_image": ref_image,
            "design_description": desc,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None
        })

    return tasks


class WorkerStageActionPayload(BaseModel):
    action: str  # START / COMPLETE
    remarks: Optional[str] = None
    photos: Optional[str] = None
    progress_percentage: Optional[int] = 100


@router.put("/worker/stages/{stage_id}/action")
def update_worker_stage_action(stage_id: int, payload: WorkerStageActionPayload, db: Session = Depends(get_db)):
    stage = db.query(models.ProductionStage).filter(models.ProductionStage.stage_id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Production stage not found")

    act = payload.action.upper().strip()
    if act == "START":
        if stage.status == "LOCKED":
            raise HTTPException(status_code=400, detail=f"Cannot start locked stage '{stage.stage_name}'. Previous stage must be completed first.")
        if stage.status == "COMPLETED":
            raise HTTPException(status_code=400, detail=f"Stage '{stage.stage_name}' has already been completed.")

        # Prerequisite check: Customer material receipt for fabrication
        if stage.order_type == "Fabrication":
            fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == stage.order_id).first()
            if fab_obj:
                validate_fabrication_material_prerequisite(db, fab_obj)

        stage.status = "IN_PROGRESS"
        stage.started_at = datetime.utcnow()
        if payload.remarks:
            stage.remarks = payload.remarks

        log_production_history(
            db,
            order_type=stage.order_type,
            order_id=stage.order_id,
            stage_name=stage.stage_name,
            worker_id=stage.assigned_worker_id,
            action=f"Stage Started ({stage.stage_name})",
            new_status="IN_PROGRESS"
        )
        db.commit()
    elif act == "COMPLETE":
        # Use shared helper to complete stage and unlock next stage in sequence
        try:
            res = complete_stage_and_unlock_next(
                db=db,
                stage=stage,
                worker_id=stage.assigned_worker_id,
                action_by_id=stage.assigned_worker_id or 1,
                notes=payload.remarks,
                progress_percentage=payload.progress_percentage or 100,
                photos=payload.photos
            )
            db.commit()
            return {"message": res["message"], "status": res["status"], "next_stage_id": res.get("next_stage_id")}
        except Exception:
            db.rollback()
            raise

    return {"message": f"Stage '{stage.stage_name}' action {act} recorded successfully", "status": stage.status}


# 17. MATERIAL RECEIPT LOGGING (Customer-Owned Material)
class MaterialReceivePayload(BaseModel):
    order_type: str  # Custom / Fabrication
    order_id: int
    received_by_id: Optional[int] = 1
    condition: str = "Good"
    quantity: float = 1.0
    unit: str = "pieces"
    notes: Optional[str] = None
    photos: Optional[str] = None


@router.post("/materials/receive")
def receive_customer_material(
    payload: MaterialReceivePayload,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    if payload.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Received material quantity must be strictly greater than zero."
        )

    eff_user_id = current_user.user_id if hasattr(current_user, "user_id") else (payload.received_by_id or 1)
    c_mat = None
    ot_clean = payload.order_type.strip().capitalize()

    if ot_clean in ["Custom", "Customization"]:
        c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.order_id).first()
        if not c_ord:
            raise HTTPException(status_code=404, detail=f"Custom Order #{payload.order_id} not found.")
        c_ord.order_status = "READY_FOR_PRODUCTION"
        if getattr(c_ord, "customer_material_id", None):
            c_mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == c_ord.customer_material_id).first()
    elif ot_clean in ["Fabrication"]:
        f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.order_id).first()
        if not f_ord:
            raise HTTPException(status_code=404, detail=f"Fabrication Request #{payload.order_id} not found.")
        f_ord.status = "MATERIAL_RECEIVED"
        if f_ord.customer_material_id:
            c_mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == f_ord.customer_material_id).first()

    if c_mat:
        from app.utils.material_ledger import record_customer_material_transaction
        record_customer_material_transaction(
            db=db,
            customer_material_id=c_mat.material_id,
            quantity=payload.quantity,
            transaction_type="RECEIVED",
            order_id=payload.order_id,
            order_type=ot_clean,
            unit=payload.unit,
            notes=f"Physical receipt & verification. Condition: {payload.condition}. {payload.notes or ''}".strip(),
            user_id=eff_user_id,
            new_status="RECEIVED",
            new_remaining_qty=payload.quantity
        )
        c_mat.condition = payload.condition
        if payload.photos:
            c_mat.photos = payload.photos

    log_production_history(
        db,
        order_type=ot_clean,
        order_id=payload.order_id,
        action="Customer Material Received",
        action_by_id=eff_user_id,
        new_status="MATERIAL_RECEIVED",
        notes=f"Received {payload.quantity} {payload.unit}. Condition: {payload.condition}. {payload.notes or ''}"
    )

    db.commit()
    return {"message": "Customer material receipt recorded and verified successfully"}


@router.get("/materials/receipts")
def get_customer_material_receipts(db: Session = Depends(get_db)):
    txs = db.query(models.MaterialTransaction).filter(
        models.MaterialTransaction.customer_material_id.isnot(None),
        models.MaterialTransaction.transaction_type == "RECEIVED"
    ).order_by(models.MaterialTransaction.created_at.desc()).all()

    receipts = []
    for tx in txs:
        mat = tx.customer_material
        client_name = "Customer"
        if mat and mat.customer:
            client_name = mat.customer.user.full_name if (mat.customer.user and mat.customer.user.full_name) else (getattr(mat.customer, "company_name", None) or "Customer")

        ord_label = f"{tx.order_type[:3].upper()}-{tx.order_id:04d}" if tx.order_id and tx.order_type else "Direct Lot"
        mat_desc = f"{mat.wood_type or mat.material_type} ({mat.dimensions or 'Standard'})" if mat else "Customer Timber"

        receipts.append({
            "log_receipt_id": f"REC-CS-{tx.transaction_id:04d}",
            "transaction_id": tx.transaction_id,
            "client_name": client_name,
            "order_id": ord_label,
            "order_type": tx.order_type,
            "numeric_order_id": tx.order_id,
            "material_id": tx.customer_material_id,
            "material_details": mat_desc,
            "quantity_condition": f"{tx.quantity} {tx.unit or 'pcs'} • {mat.condition if mat else 'Inspected'}",
            "quantity": tx.quantity,
            "unit": tx.unit or "pcs",
            "condition": mat.condition if mat else "Good",
            "status": "Verified & Inspected",
            "receipt_date": tx.created_at.strftime("%d %b %Y") if tx.created_at else datetime.utcnow().strftime("%d %b %Y"),
            "received_by": tx.performed_by.full_name if (tx.performed_by and tx.performed_by.full_name) else "Production Staff",
            "notes": tx.notes or ""
        })

    return receipts


# 18. PRODUCTION HISTORY / AUDIT LOG
@router.get("/history/{order_type}/{order_id}")
def get_order_production_history(order_type: str, order_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.ProductionHistory).filter(
        models.ProductionHistory.order_type == order_type,
        models.ProductionHistory.order_id == order_id
    ).order_by(models.ProductionHistory.timestamp.asc()).all()

    res = []
    for l in logs:
        w_user = db.query(models.User).filter(models.User.user_id == l.worker_id).first() if l.worker_id else None
        by_user = db.query(models.User).filter(models.User.user_id == l.action_by_id).first() if l.action_by_id else None

        res.append({
            "history_id": l.history_id,
            "stage_name": l.stage_name,
            "action": l.action,
            "worker_name": w_user.full_name if w_user else None,
            "action_by": by_user.full_name if by_user else "Production Staff",
            "previous_status": l.previous_status,
            "new_status": l.new_status,
            "notes": l.notes,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None
        })

    return res


# 19. ON-SITE JOBS FOR TECHNICAL COORDINATION
@router.get("/onsite-jobs")
def get_onsite_jobs_for_production(db: Session = Depends(get_db)):
    services = db.query(models.ServiceRequest).filter(
        (models.ServiceRequest.review_status == "APPROVED") |
        (models.ServiceRequest.status.in_(["APPROVED", "APPROVED_BY_RETAIL", "APPROVED_BY_RETAIL_STAFF", "PAID", "QUOTED", "WORKER_ASSIGNED", "IN_PROGRESS", "COMPLETED"]))
    ).order_by(models.ServiceRequest.created_at.desc()).all()

    res = []
    for s in services:
        cust_u = s.customer.user if s.customer and s.customer.user else None
        
        # Check assigned jobs
        jobs_list = []
        assigned_workers_list = []
        assigned_team_str = "No Artisan Assigned"
        for j in s.jobs:
            w_user = db.query(models.User).filter(models.User.user_id == j.worker_id).first()
            if w_user:
                assigned_team_str = f"{w_user.full_name} ({getattr(w_user, 'specialization', 'Artisan') or 'Artisan'})"
                assigned_workers_list.append({
                    "worker_id": w_user.user_id,
                    "worker_name": w_user.full_name,
                    "worker_email": w_user.email,
                    "worker_phone": getattr(w_user, "phone", "") or "",
                    "specialization": getattr(w_user, "specialization", "On-Site Installation & Assembly") or "On-Site Installation & Assembly",
                    "task_status": j.status or "Assigned"
                })
            jobs_list.append({
                "job_id": j.job_id,
                "worker_id": j.worker_id,
                "worker_name": w_user.full_name if w_user else "Artisan Worker",
                "worker_phone": getattr(w_user, "phone", "") if w_user else "",
                "specialization": getattr(w_user, "specialization", "Artisan") if w_user else "Artisan",
                "status": j.status,
                "scheduled_time": j.scheduled_time.isoformat() if j.scheduled_time else None
            })

        prod_status = "Approved & Ready"
        if s.status == "COMPLETED":
            prod_status = "Ready for Dispatch"
        elif s.status in ["IN_PROGRESS", "WORKER_ASSIGNED"] or len(assigned_workers_list) > 0:
            prod_status = "In Production"
        elif s.status == "PAID":
            prod_status = "Approved & Ready"

        res.append({
            "service_id": s.service_id,
            "request_id": f"ONS-{s.service_id:04d}",
            "store_name": f"{s.service_category} ({s.city})",
            "store_location": f"{s.address}, {s.city} ({s.pincode})",
            "product_name": s.service_category,
            "requested_quantity": "1 Service Visit",
            "request_date": s.created_at.strftime("%d %b %Y") if s.created_at else "Recent",
            "required_installation_date": s.preferred_date.strftime("%d %b %Y") if s.preferred_date else "Flexible",
            "priority": s.priority or "High",
            "assigned_production_team": assigned_team_str,
            "assigned_workers": assigned_workers_list,
            "production_status": prod_status,
            "store_contact": f"{cust_u.full_name if cust_u else 'Customer'} • {cust_u.phone if cust_u and cust_u.phone else 'Client'}",
            "special_instructions": s.description or "Standard on-site carpentry/upholstery service requirements.",
            "customer_name": cust_u.full_name if cust_u else "Customer",
            "customer_email": cust_u.email if cust_u else "",
            "customer_phone": cust_u.phone if cust_u else "",
            "service_category": s.service_category,
            "description": s.description,
            "address": s.address,
            "city": s.city,
            "pincode": s.pincode,
            "preferred_date": s.preferred_date.isoformat() if s.preferred_date else None,
            "preferred_time": s.preferred_time,
            "status": s.status,
            "payment_status": s.payment_status or "Pending",
            "estimated_price": float(s.estimated_price) if s.estimated_price else None,
            "photos": s.photos,
            "jobs": jobs_list
        })
    return res


# 20. FABRICATION JOBS FOR TECHNICAL PRODUCTION WORKSPACE
@router.get("/fabrication-jobs")
def get_fabrication_jobs_for_production(db: Session = Depends(get_db)):
    fabs = db.query(models.FabricationRequest).order_by(models.FabricationRequest.created_at.desc()).all()
    res = []
    for f in fabs:
        rev_st = (getattr(f, "review_status", None) or "").upper().strip()
        fst = (f.status or "").upper().strip()
        
        # Only show approved / active / paid fabrication requests
        is_valid = (rev_st in ["APPROVED", "APPROVED_BY_RETAIL"]) or (fst in ["APPROVED", "APPROVED_BY_RETAIL", "APPROVED_BY_RETAIL_STAFF", "PAID", "IN_PRODUCTION", "IN PRODUCTION", "QC_PENDING", "COMPLETED", "QUOTED", "ASSESSED"])
        if not is_valid:
            continue

        cust_u = f.customer.user if f.customer and f.customer.user else None

        # Fetch production stages for this fabrication job
        stages = db.query(models.ProductionStage).filter(
            models.ProductionStage.order_type == "Fabrication",
            models.ProductionStage.order_id == f.fabrication_id
        ).order_by(models.ProductionStage.sequence_order.asc()).all()

        assigned_workers_list = []
        stages_list = []
        total_progress = 0
        assigned_worker_names = []

        for s in stages:
            w_user = None
            if s.assigned_worker_id:
                w_user = db.query(models.User).filter(models.User.user_id == s.assigned_worker_id).first()
                if w_user and w_user.full_name not in assigned_worker_names:
                    assigned_worker_names.append(w_user.full_name)
                    assigned_workers_list.append({
                        "stage_id": s.stage_id,
                        "worker_id": w_user.user_id,
                        "worker_name": w_user.full_name,
                        "worker_email": w_user.email,
                        "worker_phone": getattr(w_user, "phone", "") or "",
                        "specialization": getattr(w_user, "specialization", s.stage_name) or s.stage_name,
                        "stage_name": s.stage_name,
                        "task_status": f"{s.stage_name}: {s.status.replace('_', ' ').title()}"
                    })

            stages_list.append({
                "stage_id": s.stage_id,
                "stage_name": s.stage_name,
                "sequence_order": s.sequence_order,
                "required_skill": s.required_skill,
                "assigned_worker_id": s.assigned_worker_id,
                "assigned_worker_name": w_user.full_name if w_user else None,
                "assigned_worker_phone": getattr(w_user, "phone", "") if w_user else "",
                "status": s.status,
                "progress_percentage": s.progress_percentage or 0,
                "remarks": s.remarks
            })
            total_progress += (s.progress_percentage or 0)

        # Check pickup logistics for customer-owned / requested pickup material
        pickup_ful = db.query(models.OrderFulfillment).filter(
            models.OrderFulfillment.fabrication_id == f.fabrication_id,
            models.OrderFulfillment.job_type == "FABRICATION_PICKUP"
        ).first()

        arr_mode = getattr(f, "material_arrival_mode", "") or "CUSTOMER_BRINGS"
        mat_src = getattr(f, "material_source", "") or ""
        needs_pickup = arr_mode in ["DOORSTEP_PICKUP", "RETAILSPHERE_PICKUP"] or "Customer" in mat_src and arr_mode != "CUSTOMER_BRINGS"
        is_pickup_done = not needs_pickup or (pickup_ful is not None and pickup_ful.delivery_status in ["Delivered", "COMPLETED", "Received", "RECEIVED_AT_WORKSHOP"])

        calc_progress = int(total_progress / len(stages)) if stages else 0

        card_status = "Pending"
        if fst == "COMPLETED" or (len(stages) > 0 and all(st.status == "COMPLETED" for st in stages)):
            card_status = "Completed"
        elif fst in ["QC_PENDING", "QUALITY CHECK"] or any(st.status == "QC_PENDING" for st in stages):
            card_status = "Quality Check"
        elif fst in ["IN_PRODUCTION", "IN PRODUCTION", "PAID"] or any(st.status in ["ASSIGNED", "IN_PROGRESS"] for st in stages) or len(assigned_workers_list) > 0:
            card_status = "In Progress"

        c_mat = f.customer_material if f.customer_material else (db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == f.customer_material_id).first() if f.customer_material_id else None)
        c_mat_summary = None
        is_mat_received = True
        if "Customer" in (mat_src or "") or f.customer_material_id:
            if c_mat:
                is_mat_received = (c_mat.status or "").upper() in ["RECEIVED", "INSPECTED", "VERIFIED", "APPROVED"]
                c_mat_summary = {
                    "material_id": c_mat.material_id,
                    "material_type": c_mat.material_type,
                    "wood_type": c_mat.wood_type,
                    "quantity": c_mat.quantity,
                    "unit": c_mat.unit,
                    "dimensions": c_mat.dimensions,
                    "condition": c_mat.condition,
                    "status": c_mat.status,
                    "remaining_quantity": c_mat.remaining_quantity
                }
            else:
                is_mat_received = False

        res.append({
            "fabrication_id": f"FAB-{f.fabrication_id:04d}",
            "numeric_id": f.fabrication_id,
            "order_id": f"REQ-{f.fabrication_id:04d}",
            "product_name": f.service_type,
            "product_thumbnail": f.drawing_image or "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=300&auto=format&fit=crop&q=60",
            "quantity": f"{f.quantity} Units" if f.quantity > 1 else "1 Unit",
            "material_required": f.material_source if f.material_source else "Hardwood / Timber",
            "material_arrival_mode": arr_mode,
            "needs_pickup": needs_pickup,
            "is_pickup_completed": is_pickup_done,
            "pickup_carrier": pickup_ful.carrier if pickup_ful else None,
            "pickup_carrier_id": pickup_ful.carrier_id if pickup_ful else None,
            "pickup_status": pickup_ful.delivery_status if pickup_ful else ("Delivered" if not needs_pickup else "Pending Allotment"),
            "pickup_fulfillment_id": pickup_ful.fulfillment_id if pickup_ful else None,
            "assigned_team": ", ".join(assigned_worker_names) if assigned_worker_names else "No Artisan Assigned",
            "assigned_workers": assigned_workers_list,
            "priority": f.priority or "High",
            "expected_completion_date": f.deadline.strftime("%d %b %Y") if f.deadline else "Flexible",
            "status": card_status,
            "progress_percentage": calc_progress,
            "customer_name": cust_u.full_name if cust_u else "Customer",
            "customer_email": cust_u.email if cust_u else "",
            "customer_phone": cust_u.phone if cust_u else "",
            "dimensions": f.dimensions,
            "requirements": f.requirements,
            "customer_material_id": f.customer_material_id,
            "customer_material": c_mat_summary,
            "is_material_received": is_mat_received,
            "stages": stages_list
        })
    return res


class AssignFabricationCarrierPayload(BaseModel):
    carrier_id: Optional[int] = None
    carrier_name: Optional[str] = None
    driver_id: Optional[int] = None
    transportation_provider: str = "CARRIER_PARTNER"  # CARRIER_PARTNER vs INTERNAL_FLEET
    notes: Optional[str] = None


@router.post("/fabrication/{fabrication_id}/assign-carrier")
def assign_fabrication_carrier_partner(
    fabrication_id: int,
    payload: AssignFabricationCarrierPayload,
    db: Session = Depends(get_db)
):
    fab = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == fabrication_id).first()
    if not fab:
        raise HTTPException(status_code=404, detail="Fabrication request not found")

    ful = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.fabrication_id == fabrication_id,
        models.OrderFulfillment.job_type == "FABRICATION_PICKUP"
    ).first()

    carrier_title = payload.carrier_name or "3PL Carrier Partner"
    if payload.carrier_id:
        c_obj = db.query(models.CarrierPartner).filter(models.CarrierPartner.carrier_id == payload.carrier_id).first()
        if c_obj:
            carrier_title = c_obj.carrier_name

    driver_name = None
    if payload.driver_id:
        d_user = db.query(models.User).filter(models.User.user_id == payload.driver_id).first()
        if d_user:
            driver_name = d_user.full_name
            carrier_title = f"Internal Fleet — {driver_name}"

    if payload.driver_id:
        ful_status = "In Transit"
        del_status = "Out for Pickup"
    else:
        ful_status = "Assigned to Carrier"
        del_status = "Pending Driver Allotment"

    if not ful:
        from datetime import timedelta
        ful = models.OrderFulfillment(
            fabrication_id=fabrication_id,
            job_type="FABRICATION_PICKUP",
            fulfillment_status=ful_status,
            delivery_status=del_status,
            transportation_provider=payload.transportation_provider,
            carrier_id=payload.carrier_id,
            carrier=carrier_title,
            driver_id=payload.driver_id,
            pickup_address=fab.material_pickup_address or "Customer Location",
            destination_address="RetailSphere Central Workshop Hub",
            expected_delivery_date=(datetime.utcnow() + timedelta(days=1)).strftime("%d %B %Y"),
            tracking_number=f"TRK-FABPK-{fabrication_id:04d}-{int(time.time()) % 10000}"
        )
        db.add(ful)
    else:
        ful.carrier_id = payload.carrier_id
        ful.carrier = carrier_title
        ful.driver_id = payload.driver_id
        ful.transportation_provider = payload.transportation_provider
        ful.fulfillment_status = ful_status
        ful.delivery_status = del_status
        if payload.notes:
            ful.delivery_notes = payload.notes

    db.commit()
    return {
        "message": f"Carrier partner '{carrier_title}' assigned for material pickup of Fabrication #{fabrication_id}.",
        "pickup_status": del_status,
        "carrier": carrier_title
    }


@router.post("/fabrication/{fabrication_id}/material-received")
def mark_fabrication_material_received(
    fabrication_id: int,
    db: Session = Depends(get_db)
):
    fab = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == fabrication_id).first()
    if not fab:
        raise HTTPException(status_code=404, detail="Fabrication request not found")

    ful = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.fabrication_id == fabrication_id,
        models.OrderFulfillment.job_type == "FABRICATION_PICKUP"
    ).first()

    arr_mode = (fab.material_arrival_mode or "").upper()
    needs_pickup = arr_mode == "DOORSTEP_PICKUP" or (arr_mode == "" and "CUSTOMER" in (fab.material_source or "").upper())

    if needs_pickup and (not ful or (not ful.carrier_id and not ful.driver_id and not ful.carrier)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mark material as received before assigning a carrier partner or internal fleet driver for pickup."
        )

    if ful:
        ful.delivery_status = "Delivered"
        ful.fulfillment_status = "Delivered"
        ful.delivered_at = datetime.utcnow()
    else:
        ful = models.OrderFulfillment(
            fabrication_id=fabrication_id,
            job_type="FABRICATION_PICKUP",
            fulfillment_status="Delivered",
            delivery_status="Delivered",
            delivered_at=datetime.utcnow(),
            pickup_address="Customer Location",
            destination_address="RetailSphere Central Workshop Hub",
            carrier="Self / Direct Received"
        )
        db.add(ful)

    db.commit()
    return {
        "message": f"Material marked as Received at Workshop Hub for Fabrication #{fabrication_id}. Artisan can now proceed with cutting & production.",
        "is_pickup_completed": True
    }


class AssignOnsiteWorkerPayload(BaseModel):
    service_id: int
    worker_id: int
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None


@router.post("/onsite/assign-worker")
def assign_worker_to_onsite_job(
    payload: AssignOnsiteWorkerPayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    require_staff_user(current_user)
    srv = db.query(models.ServiceRequest).filter(models.ServiceRequest.service_id == payload.service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service request not found")

    validate_service_assignment_prerequisites(srv)
    worker = validate_worker_eligibility(db, payload.worker_id, required_skill=srv.service_category)

    # Check if job already exists or create new
    existing_job = db.query(models.ServiceJob).filter(models.ServiceJob.service_id == payload.service_id).first()
    if existing_job:
        existing_job.worker_id = payload.worker_id
        existing_job.status = "ASSIGNED"
        if payload.notes:
            existing_job.customer_notes = payload.notes
    else:
        new_job = models.ServiceJob(
            service_id=payload.service_id,
            worker_id=payload.worker_id,
            status="ASSIGNED",
            customer_notes=payload.notes
        )
        db.add(new_job)

    srv.status = "WORKER_ASSIGNED"
    models.Notification(
        user_id=payload.worker_id,
        title="New On-Site Field Job Assigned",
        message=f"You have been assigned to On-Site Service Job #{srv.service_id:04d} ({srv.service_category}) in {srv.city}.",
        created_at=datetime.utcnow()
    )
    db.commit()
    return {"message": f"Worker {worker.full_name} assigned successfully to On-Site Job #{srv.service_id:04d}"}


class AssignFabricationWorkerPayload(BaseModel):
    fabrication_id: int
    worker_id: int
    stage_id: Optional[int] = None
    notes: Optional[str] = None


@router.post("/fabrication/assign-worker")
def assign_worker_to_fabrication(
    payload: AssignFabricationWorkerPayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    require_staff_user(current_user)
    fab = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.fabrication_id).first()
    if not fab:
        raise HTTPException(status_code=404, detail="Fabrication request not found")

    validate_fabrication_assignment_prerequisites(db, fab)
    worker = validate_worker_eligibility(db, payload.worker_id, required_skill=fab.service_type)

    if payload.stage_id:
        stage = db.query(models.ProductionStage).filter(
            models.ProductionStage.stage_id == payload.stage_id,
            models.ProductionStage.order_type == "Fabrication",
            models.ProductionStage.order_id == payload.fabrication_id
        ).first()
    else:
        # Get first stage or create default stage
        stage = db.query(models.ProductionStage).filter(
            models.ProductionStage.order_type == "Fabrication",
            models.ProductionStage.order_id == payload.fabrication_id
        ).order_by(models.ProductionStage.sequence_order.asc()).first()
        
        if not stage:
            stage = models.ProductionStage(
                order_type="Fabrication",
                order_id=payload.fabrication_id,
                stage_name=f"Precision {fab.service_type}",
                sequence_order=1,
                required_skill=worker.specialization or "Woodwork & Carpentry",
                assigned_worker_id=payload.worker_id,
                status="ASSIGNED",
                progress_percentage=0,
                remarks=payload.notes
            )
            db.add(stage)
            db.flush()

    if stage:
        stage.assigned_worker_id = payload.worker_id
        stage.status = "ASSIGNED"
        if payload.notes:
            stage.remarks = payload.notes

    if fab.status in ["APPROVED", "PAID"]:
        fab.status = "IN_PRODUCTION"

    models.Notification(
        user_id=payload.worker_id,
        title=f"Fabrication Job Assigned — {fab.service_type}",
        message=f"You have been assigned to Fabrication Job #{fab.fabrication_id:04d} ({fab.service_type}).",
        created_at=datetime.utcnow()
    )
    db.commit()
    return {"message": f"Worker {worker.full_name} assigned to Fabrication Job #{fab.fabrication_id:04d}"}


# 20. PRODUCTION ANALYTICS & REPORTS
@router.get("/reports")
def get_production_reports(db: Session = Depends(get_db)):
    total_customs = db.query(models.CustomOrder).count()
    total_fabs = db.query(models.FabricationRequest).count()
    total_inspections = db.query(models.QualityInspection).count()
    pass_inspections = db.query(models.QualityInspection).filter(models.QualityInspection.result == "PASS").count()
    fail_inspections = db.query(models.QualityInspection).filter(models.QualityInspection.result == "FAIL").count()

    pass_rate = round((pass_inspections / total_inspections * 100), 1) if total_inspections > 0 else 100.0

    return {
        "summary": {
            "total_customizations": total_customs,
            "total_fabrications": total_fabs,
            "total_inspections": total_inspections,
            "pass_rate": pass_rate,
            "avg_production_days": 3.4,
            "worker_utilization_rate": 84.5
        },
        "stage_breakdown": [
            {"stage": "Woodwork & Carpentry", "completed": 24, "in_progress": 5},
            {"stage": "Cutting & Shaping", "completed": 18, "in_progress": 3},
            {"stage": "Sanding & Finishing", "completed": 15, "in_progress": 4},
            {"stage": "Upholstery", "completed": 12, "in_progress": 2},
            {"stage": "Assembly & QA", "completed": 20, "in_progress": 3},
        ]
    }


class LeaveReviewPayload(BaseModel):
    status: str
    review_notes: Optional[str] = None


@router.get("/leave-requests")
def get_all_artisan_leave_requests(db: Session = Depends(get_db)):
    leaves = db.query(models.WorkerLeave).order_by(models.WorkerLeave.applied_on.desc()).all()
    return leaves


@router.post("/leave-requests/{leave_id}/review")
def review_artisan_leave_request(leave_id: int, payload: LeaveReviewPayload, db: Session = Depends(get_db)):
    leave = db.query(models.WorkerLeave).filter(models.WorkerLeave.leave_id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request record not found.")

    leave.status = payload.status.capitalize()
    leave.reviewed_by = "Production Staff"
    if payload.review_notes:
        leave.review_notes = payload.review_notes.strip()

    db.commit()
    db.refresh(leave)

    return {"message": f"Leave request #{leave_id} set to {leave.status}.", "leave": leave}


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import time

from app.database import get_db
from app import models, auth
from app.utils.worker_assignment_validator import (
    require_staff_user,
    validate_worker_eligibility,
    validate_service_assignment_prerequisites
)

router = APIRouter(prefix="/api/services", tags=["On-Site Skilled Services"])

class ServiceRequestCreatePayload(BaseModel):
    customer_id: Optional[int] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = "Customer"
    service_category: str  # Carpentry, Assembly, Upholstery, Repair, Installation, Modification, Polishing
    description: str
    photos: Optional[str] = None
    address: str
    city: str = "Kottayam"
    pincode: str = "686631"
    preferred_date: str
    preferred_time: str = "Morning (9 AM - 1 PM)"

class ServiceStatusUpdatePayload(BaseModel):
    status: str  # PENDING, QUOTED, APPROVED, PAID, WORKER_ASSIGNED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    estimated_price: Optional[float] = None

class ServiceJobAssignPayload(BaseModel):
    service_id: int
    worker_id: int
    scheduled_time: Optional[str] = None

@router.get("/requests")
def get_service_requests(
    customer_id: Optional[int] = None,
    customer_email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.ServiceRequest)
    if customer_id:
        query = query.filter(models.ServiceRequest.customer_id == customer_id)
    elif customer_email and customer_email.strip():
        user = db.query(models.User).filter(models.User.email.ilike(customer_email.strip())).first()
        if user and user.customer_profile:
            query = query.filter(models.ServiceRequest.customer_id == user.customer_profile.customer_id)

    requests = query.order_by(models.ServiceRequest.created_at.desc()).all()
    today_date = date.today()
    updated_records = False
    for s in requests:
        if s.preferred_date and s.preferred_date < today_date:
            if s.status not in ["COMPLETED", "Completed", "CANCELLED", "Cancelled", "Request Cancellation"]:
                s.status = "Request Cancellation"
                updated_records = True
    if updated_records:
        db.commit()

    res = []
    for s in requests:
        cust = s.customer
        cust_user = cust.user if cust else None

        jobs_list = []
        for j in s.jobs:
            w_user = db.query(models.User).filter(models.User.user_id == j.worker_id).first()
            jobs_list.append({
                "job_id": j.job_id,
                "worker_id": j.worker_id,
                "worker_name": w_user.full_name if w_user else "Artisan Worker",
                "status": j.status,
                "scheduled_time": j.scheduled_time.isoformat() if j.scheduled_time else None
            })

        res.append({
            "service_id": s.service_id,
            "customer_id": s.customer_id,
            "customer_name": cust_user.full_name if cust_user else "Customer",
            "customer_email": cust_user.email if cust_user else "",
            "customer_phone": cust_user.phone if cust_user else "",
            "service_category": s.service_category,
            "description": s.description,
            "photos": s.photos,
            "address": s.address,
            "city": s.city,
            "pincode": s.pincode,
            "preferred_date": s.preferred_date.isoformat() if s.preferred_date else None,
            "preferred_time": s.preferred_time,
            "estimated_price": float(s.estimated_price) if s.estimated_price else None,
            "status": s.status,
            "payment_status": s.payment_status or "Pending",
            "jobs": jobs_list,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return res

@router.post("/requests", status_code=status.HTTP_201_CREATED)
def create_service_request(payload: ServiceRequestCreatePayload, db: Session = Depends(get_db)):
    customer = None
    if payload.customer_email and payload.customer_email.strip():
        user = db.query(models.User).filter(models.User.email.ilike(payload.customer_email.strip())).first()
        if user and user.customer_profile:
            customer = user.customer_profile

    if not customer and payload.customer_id:
        customer = db.query(models.Customer).filter(
            (models.Customer.customer_id == payload.customer_id) | (models.Customer.user_id == payload.customer_id)
        ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid customer profile is required to book an on-site service."
        )

    cust_id = customer.customer_id

    # Validate service destination address
    srv_address = (payload.address or "").strip()
    srv_city = (payload.city or "").strip()
    srv_pin = (payload.pincode or "").strip()

    if not srv_address or len(srv_address) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A complete street/building address is required for on-site technician dispatch."
        )

    if not srv_pin or len(srv_pin) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid 6-digit PIN code is required for on-site service location."
        )

    # Check Service Area Coverage Policy
    from app.utils.distance_calculator import estimate_road_distance_km, HUB_ADDRESS
    full_loc_str = f"{srv_address}, {srv_city}, Kerala - {srv_pin}"
    est_distance = estimate_road_distance_km(HUB_ADDRESS, full_loc_str)

    # Standard on-site service coverage limit is 60 km from Ettumanoor, Kottayam
    is_distant = est_distance > 60.0
    initial_status = "PENDING_COVERAGE_REVIEW" if is_distant else "PENDING"

    coverage_notice = None
    if is_distant:
        coverage_notice = (
            f"Your service location ({srv_city}) is approximately {round(est_distance, 1)} km from our Ettumanoor, Kottayam workshop "
            f"(outside the standard 60 km technician coverage zone). Your booking request has been submitted for supervisor travel coverage review."
        )

    date_obj = date.today()
    if payload.preferred_date:
        try:
            date_obj = datetime.strptime(payload.preferred_date, "%Y-%m-%d").date()
        except:
            pass

    new_srv = models.ServiceRequest(
        customer_id=cust_id,
        service_category=payload.service_category,
        description=f"{payload.description}{(' [Note: ' + coverage_notice + ']') if coverage_notice else ''}",
        photos=payload.photos,
        address=srv_address,
        city=srv_city or "Kottayam",
        pincode=srv_pin,
        preferred_date=date_obj,
        preferred_time=payload.preferred_time,
        status=initial_status,
        payment_status="Pending",
        created_at=datetime.utcnow()
    )
    db.add(new_srv)
    db.commit()
    db.refresh(new_srv)

    return {
        "message": coverage_notice or "On-site skilled service request submitted successfully",
        "service_id": new_srv.service_id,
        "status": new_srv.status,
        "is_distant": is_distant,
        "distance_km": est_distance,
        "coverage_notice": coverage_notice
    }

@router.put("/requests/{service_id}/status")
def update_service_status(service_id: int, payload: ServiceStatusUpdatePayload, db: Session = Depends(get_db)):
    srv = db.query(models.ServiceRequest).filter(models.ServiceRequest.service_id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service request not found")

    srv.status = payload.status
    if payload.estimated_price is not None:
        srv.estimated_price = payload.estimated_price

    db.commit()
    db.refresh(srv)
    return {"message": f"Service request #{service_id} updated to {payload.status}", "service_id": service_id}

@router.put("/requests/{service_id}/pay")
def pay_service_request(service_id: int, db: Session = Depends(get_db)):
    srv = db.query(models.ServiceRequest).filter(models.ServiceRequest.service_id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service request not found")

    if srv.customer_id:
        customer = db.query(models.Customer).filter(models.Customer.customer_id == srv.customer_id).first()
        user = customer.user if customer else None
        from app.utils.address_validator import is_valid_customer_address
        is_valid, err_msg = is_valid_customer_address(customer, user)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Valid service delivery address required before confirming payment: {err_msg}"
            )

    srv.payment_status = "Paid"
    srv.status = "PAID"

    # Log Payment
    new_payment = models.Payment(
        order_type="Service",
        order_id=srv.service_id,
        amount=srv.estimated_price or 0,
        payment_method="Razorpay",
        transaction_id=f"PAY-SRV-{srv.service_id}-{int(time.time())}",
        payment_status="Paid"
    )
    db.add(new_payment)

    db.commit()
    return {"message": f"Payment completed for Service Request #{service_id}", "status": "PAID"}

@router.post("/jobs/assign")
def assign_worker_service_job(
    payload: ServiceJobAssignPayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    require_staff_user(current_user)
    srv = db.query(models.ServiceRequest).filter(models.ServiceRequest.service_id == payload.service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service request not found")

    validate_service_assignment_prerequisites(srv)
    worker = validate_worker_eligibility(db, payload.worker_id, required_skill=srv.service_category)

    sched_dt = datetime.utcnow()
    if payload.scheduled_time:
        try:
            sched_dt = datetime.fromisoformat(payload.scheduled_time)
        except:
            pass

    # Check if job already exists to prevent duplicate jobs and allow legitimate reassignment
    existing_job = db.query(models.ServiceJob).filter(models.ServiceJob.service_id == payload.service_id).first()
    if existing_job:
        existing_job.worker_id = payload.worker_id
        existing_job.scheduled_time = sched_dt
        existing_job.status = "ASSIGNED"
        job = existing_job
    else:
        job = models.ServiceJob(
            service_id=payload.service_id,
            worker_id=payload.worker_id,
            scheduled_time=sched_dt,
            status="ASSIGNED"
        )
        db.add(job)

    srv.status = "WORKER_ASSIGNED"
    db.commit()
    db.refresh(job)

    return {"message": f"Worker {worker.full_name} assigned to Service #{payload.service_id}", "job_id": job.job_id}

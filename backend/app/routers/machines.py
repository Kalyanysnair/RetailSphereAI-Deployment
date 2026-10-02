from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/machines", tags=["Machine & Equipment Management"])

class MachineCreatePayload(BaseModel):
    machine_name: str
    category: str

class MachineStatusPayload(BaseModel):
    status: str  # AVAILABLE, IN_USE, MAINTENANCE, OFFLINE
    current_job_id: Optional[int] = None
    current_worker_id: Optional[int] = None

class MachineMaintenancePayload(BaseModel):
    description: str
    performed_by: str
    maintenance_type: str = "Routine"  # Routine, Repair, Calibration

@router.get("")
def get_machines(db: Session = Depends(get_db)):
    machines = db.query(models.Machine).all()
    if not machines:
        # Seed initial machinery if empty
        initial_machines = [
            models.Machine(machine_name="CNC Timber Cutting Center #1", category="CNC Cutting", status="AVAILABLE"),
            models.Machine(machine_name="High-Precision Wood Shaper M3", category="Wood Shaper", status="AVAILABLE"),
            models.Machine(machine_name="Heavy-Duty CNC Router R500", category="CNC Router", status="AVAILABLE"),
            models.Machine(machine_name="Automated Edge Banding & Finisher", category="Edge Finisher", status="AVAILABLE"),
            models.Machine(machine_name="Orbital Surface Sanding Station", category="Sander", status="AVAILABLE"),
        ]
        db.add_all(initial_machines)
        db.commit()
        machines = db.query(models.Machine).all()

    res = []
    for m in machines:
        w_user = db.query(models.User).filter(models.User.user_id == m.current_worker_id).first() if m.current_worker_id else None
        res.append({
            "machine_id": m.machine_id,
            "machine_name": m.machine_name,
            "category": m.category,
            "status": m.status,
            "current_job_id": m.current_job_id,
            "current_worker_id": m.current_worker_id,
            "current_worker_name": w_user.full_name if w_user else None,
            "last_serviced_at": m.last_serviced_at.isoformat() if m.last_serviced_at else None
        })
    return res

@router.post("", status_code=status.HTTP_201_CREATED)
def create_machine(payload: MachineCreatePayload, db: Session = Depends(get_db)):
    new_m = models.Machine(
        machine_name=payload.machine_name.strip(),
        category=payload.category.strip(),
        status="AVAILABLE",
        last_serviced_at=datetime.utcnow()
    )
    db.add(new_m)
    db.commit()
    db.refresh(new_m)
    return {"message": "Machine added to equipment inventory", "machine_id": new_m.machine_id}

@router.put("/{machine_id}/status")
def update_machine_status(machine_id: int, payload: MachineStatusPayload, db: Session = Depends(get_db)):
    m = db.query(models.Machine).filter(models.Machine.machine_id == machine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")

    m.status = payload.status
    if payload.current_job_id is not None:
        m.current_job_id = payload.current_job_id
    if payload.current_worker_id is not None:
        m.current_worker_id = payload.current_worker_id

    db.commit()
    return {"message": f"Machine #{machine_id} status set to {payload.status}", "machine_id": machine_id}

@router.post("/{machine_id}/maintenance")
def add_machine_maintenance(machine_id: int, payload: MachineMaintenancePayload, db: Session = Depends(get_db)):
    m = db.query(models.Machine).filter(models.Machine.machine_id == machine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")

    m.last_serviced_at = datetime.utcnow()
    m.status = "MAINTENANCE" if payload.maintenance_type == "Repair" else m.status

    log = models.MachineMaintenance(
        machine_id=machine_id,
        description=payload.description,
        performed_by=payload.performed_by,
        maintenance_type=payload.maintenance_type,
        serviced_date=datetime.utcnow()
    )
    db.add(log)
    db.commit()

    return {"message": f"Maintenance record logged for Machine #{machine_id}"}


@router.get("/maintenance/all")
def get_all_machines_maintenance_logs(db: Session = Depends(get_db)):
    logs = db.query(models.MachineMaintenance).order_by(models.MachineMaintenance.serviced_date.desc()).all()
    results = []
    for l in logs:
        m = l.machine
        results.append({
            "maintenance_id": l.maintenance_id,
            "machine_id": l.machine_id,
            "machine_name": m.machine_name if m else f"Machine #{l.machine_id}",
            "machine_category": m.category if m else "Equipment",
            "description": l.description,
            "performed_by": l.performed_by,
            "maintenance_type": l.maintenance_type,
            "serviced_date": l.serviced_date.isoformat() if l.serviced_date else None
        })
    return results


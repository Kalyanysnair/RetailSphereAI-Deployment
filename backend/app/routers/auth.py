import random
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
from app.email_utils import send_contact_inquiry_email, send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def get_or_create_customer_role(db: Session) -> models.Role:
    role = db.query(models.Role).filter(models.Role.role_name == "Customer").first()
    if not role:
        role = models.Role(role_name="Customer")
        db.add(role)
        db.commit()
        db.refresh(role)
    return role

def build_user_response(user: models.User) -> schemas.UserResponse:
    customer_info = None
    if user.customer_profile:
        customer_info = schemas.CustomerBase(
            customer_id=user.customer_profile.customer_id,
            address=user.customer_profile.address,
            city=user.customer_profile.city,
            state=user.customer_profile.state,
            pincode=user.customer_profile.pincode
        )

    return schemas.UserResponse(
        user_id=user.user_id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role_name=user.role.role_name if user.role else "Customer",
        status=user.status,
        must_change_password=getattr(user, "must_change_password", False) or False,
        is_driver=bool(getattr(user, "is_driver", False)),
        specialization=getattr(user, "specialization", None),
        created_at=user.created_at,
        customer=customer_info
    )


def normalize_phone(phone_str: str) -> str:
    """Extracts last 10 digits from any phone string (+91 9446758046, 09446758046, 9446758046)."""
    if not phone_str:
        return ""
    digits = re.sub(r'\D', '', str(phone_str))
    if len(digits) >= 10:
        return digits[-10:]
    return digits

@router.post("/signup", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.UserSignup, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_email = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    phone_clean = payload.phone
    if payload.phone and payload.phone.strip():
        raw_phone = payload.phone.strip()
        last_10 = normalize_phone(raw_phone)
        if len(last_10) == 10:
            phone_clean = f"+91{last_10}"
        else:
            phone_clean = raw_phone

        all_users = db.query(models.User).all()
        for u in all_users:
            if u.phone:
                u_10 = normalize_phone(u.phone)
                if u_10 and u_10 == last_10:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="An account with this phone number already exists."
                    )

    # Ensure Customer role exists
    customer_role = get_or_create_customer_role(db)

    # Create new user
    hashed_pwd = auth.get_password_hash(payload.password)
    new_user = models.User(
        role_id=customer_role.role_id,
        full_name=payload.full_name,
        email=payload.email,
        phone=phone_clean,
        password=hashed_pwd,
        status=True,
        must_change_password=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create linked customer profile (empty until provided/edited)
    new_customer = models.Customer(
        user_id=new_user.user_id,
        address=payload.address or "",
        city=payload.city or "",
        state=payload.state or "",
        pincode=payload.pincode or ""
    )
    db.add(new_customer)

    db.commit()
    db.refresh(new_user)

    # Generate JWT token
    access_token = auth.create_access_token(data={"sub": str(new_user.user_id)})
    user_resp = build_user_response(new_user)

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )

@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    login_identifier = payload.email.strip()
    user = db.query(models.User).filter(
        (models.User.email.ilike(login_identifier)) |
        (models.User.full_name.ilike(login_identifier)) |
        (models.User.phone == login_identifier)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )
    
    if not user.password or not auth.verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )

    if not user.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact support."
        )

    access_token = auth.create_access_token(data={"sub": str(user.user_id)})
    user_resp = build_user_response(user)

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )

@router.post("/change-first-password", response_model=schemas.UserResponse)
def change_first_password(
    payload: schemas.FirstPasswordChangeRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.password or not auth.verify_password(payload.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current temporary password is incorrect."
        )

    if len(payload.new_password.strip()) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    current_user.password = auth.get_password_hash(payload.new_password.strip())
    current_user.must_change_password = False
    db.commit()
    db.refresh(current_user)
    return build_user_response(current_user)

@router.post("/change-password", response_model=schemas.UserResponse)
def change_password(
    payload: schemas.PasswordChangeRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if payload.current_password and current_user.password and not auth.verify_password(payload.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    if len(payload.new_password.strip()) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    current_user.password = auth.get_password_hash(payload.new_password.strip())
    current_user.must_change_password = False
    db.commit()
    db.refresh(current_user)
    return build_user_response(current_user)


@router.post("/google-login", response_model=schemas.Token)
def google_login(payload: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    email_extracted = None
    name_extracted = None

    if payload.google_token:
        try:
            from jose import jwt as jose_jwt
            claims = jose_jwt.get_unverified_claims(payload.google_token)
            email_extracted = claims.get("email")
            name_extracted = claims.get("name") or claims.get("given_name")
        except Exception as e:
            print(f"[GOOGLE AUTH LOG] Failed to parse ID Token claims: {e}")

    raw_email = email_extracted or payload.email
    if not raw_email or '@' not in raw_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid Google email address is required for authentication."
        )
    email_clean = raw_email.strip().lower()
    full_name = (name_extracted or payload.full_name or email_clean.split('@')[0].capitalize()).strip()

    user = db.query(models.User).filter(models.User.email == email_clean).first()

    if not user:
        # Register new Google user automatically
        customer_role = get_or_create_customer_role(db)
        
        user = models.User(
            role_id=customer_role.role_id,
            full_name=full_name,
            email=email_clean,
            phone=None,
            password=None,
            status=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Linked customer profile (empty address until user edits profile)
        new_customer = models.Customer(
            user_id=user.user_id,
            address="",
            city="",
            state="",
            pincode=""
        )
        db.add(new_customer)
        db.commit()
        db.refresh(user)


    if not user.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact support."
        )

    access_token = auth.create_access_token(data={"sub": str(user.user_id)})
    user_resp = build_user_response(user)

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )

# In-memory store for verification codes: email -> {"code": str, "expires_at": datetime}
reset_codes_db = {}

@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    identifier = payload.email.strip()
    identifier_clean = identifier.lower()
    user = db.query(models.User).filter(
        (models.User.email.ilike(identifier_clean)) | (models.User.full_name.ilike(identifier))
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user account was found with this username or email."
        )
    
    # Generate 6-digit random verification OTP
    reset_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    user_email_clean = user.email.strip().lower()
    reset_codes_db[user_email_clean] = {
        "code": reset_code,
        "expires_at": expires_at
    }

    # Extract username (full_name or name before @ if full_name is email)
    display_username = user.full_name
    if not display_username or '@' in display_username:
        display_username = user.email.split('@')[0]

    # Dispatch email (via SMTP if credentials set, or fallback logging)
    send_password_reset_email(to_email=user.email, user_name=display_username, reset_code=reset_code)

    return {
        "message": f"Verification code has been sent to {user.email}."
    }

@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email.ilike(email_clean)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )
    
    stored_data = reset_codes_db.get(email_clean)
    if not stored_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No reset code request found for this email or it has already been used."
        )

    if stored_data["code"] != payload.reset_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your email and try again."
        )

    if datetime.utcnow() > stored_data["expires_at"]:
        reset_codes_db.pop(email_clean, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters."
        )
    
    # Update user password in DB
    hashed_pwd = auth.get_password_hash(payload.new_password)
    user.password = hashed_pwd
    db.commit()
    db.refresh(user)

    # Invalidate used reset code
    reset_codes_db.pop(email_clean, None)

    return {
        "message": "Password updated successfully. You can now login with your new password."
    }

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return build_user_response(current_user)

@router.post("/contact")
def send_contact_inquiry(payload: schemas.ContactInquiryRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        send_contact_inquiry_email,
        sender_name=payload.name,
        sender_email=payload.email,
        topic=payload.subject,
        message_body=payload.message
    )
    return {
        "message": "Contact inquiry message submitted and emailed to kalyanys2004@gmail.com successfully."
    }

@router.put("/profile", response_model=schemas.UserResponse)
def update_profile(
    payload: schemas.UpdateProfileRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    current_user.full_name = payload.full_name.strip()
    if payload.phone:
        current_user.phone = payload.phone.strip()
    
    # Handle Password Update Provision
    if payload.new_password and payload.new_password.strip():
        new_pwd = payload.new_password.strip()
        if len(new_pwd) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters long."
            )
        if payload.current_password and current_user.password:
            if not auth.verify_password(payload.current_password.strip(), current_user.password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect. Password update failed."
                )

        hashed_pwd = auth.get_password_hash(new_pwd)
        current_user.password = hashed_pwd
    
    if current_user.customer_profile:
        if payload.address is not None:
            current_user.customer_profile.address = payload.address.strip()
        if payload.city is not None:
            current_user.customer_profile.city = payload.city.strip()
        if payload.state is not None:
            current_user.customer_profile.state = payload.state.strip()
        if payload.pincode is not None:
            current_user.customer_profile.pincode = payload.pincode.strip()
    else:
        new_customer = models.Customer(
            user_id=current_user.user_id,
            address=payload.address.strip() if payload.address else "",
            city=payload.city.strip() if payload.city else "",
            state=payload.state.strip() if payload.state else "",
            pincode=payload.pincode.strip() if payload.pincode else "",
        )
        db.add(new_customer)

    db.commit()
    db.refresh(current_user)
    return build_user_response(current_user)



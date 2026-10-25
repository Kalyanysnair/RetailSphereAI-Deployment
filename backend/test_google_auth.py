"""
Unit tests for Google Sign-In endpoint (/api/auth/google-login)
Using an isolated in-memory SQLite database to ensure NO production records are touched.
"""
import sys
import os
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup in-memory SQLite DB
from app.database import Base, get_db
from app.main import app
from app import models, auth

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Seed Customer role
    cust_role = models.Role(role_id=1, role_name="Customer")
    db.add(cust_role)
    # Seed an existing user
    existing_user = models.User(
        user_id=10,
        role_id=1,
        full_name="Existing Google User",
        email="existing_user@example.com",
        status=True
    )
    db.add(existing_user)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_google_login_missing_or_invalid_email():
    """Test that missing or invalid emails are rejected with 400 Bad Request."""
    # 1. Missing email and missing token
    resp = client.post("/api/auth/google-login", json={})
    assert resp.status_code == 400
    assert "A valid Google email address is required" in resp.json()["detail"]

    # 2. Token without email in claims
    with patch("jose.jwt.get_unverified_claims", return_value={"name": "No Email"}):
        resp = client.post("/api/auth/google-login", json={"google_token": "dummy_token"})
        assert resp.status_code == 400
        assert "A valid Google email address is required" in resp.json()["detail"]

def test_google_login_existing_user():
    """Test logging in an existing user via Google Sign-In."""
    mock_claims = {
        "email": "Existing_User@Example.com",  # mixed case to test normalization
        "name": "Existing Google User"
    }
    with patch("jose.jwt.get_unverified_claims", return_value=mock_claims):
        resp = client.post("/api/auth/google-login", json={"google_token": "valid_mock_token"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "existing_user@example.com"
        assert data["user"]["user_id"] == 10
        assert data["user"]["full_name"] == "Existing Google User"

def test_google_login_new_user_registration():
    """Test automatic registration of a new user via Google Sign-In."""
    mock_claims = {
        "email": "New_User_123@Example.com",
        "name": "Jane Doe 45"
    }
    with patch("jose.jwt.get_unverified_claims", return_value=mock_claims):
        resp = client.post("/api/auth/google-login", json={"google_token": "new_user_mock_token"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "new_user_123@example.com"
        # Name should have digits stripped and title-cased per project rules
        assert data["user"]["full_name"] == "Jane Doe"
        assert data["user"]["role_name"] == "Customer"

def test_google_login_new_user_fallback_name():
    """Test new user registration when Google token does not contain a name."""
    mock_claims = {
        "email": "alex.rivera@example.com"
    }
    with patch("jose.jwt.get_unverified_claims", return_value=mock_claims):
        resp = client.post("/api/auth/google-login", json={"google_token": "no_name_mock_token"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["user"]["email"] == "alex.rivera@example.com"
        assert data["user"]["full_name"] == "Alex Rivera"

def test_google_login_deactivated_user():
    """Test that deactivated users cannot log in via Google."""
    db = TestingSessionLocal()
    deact_user = models.User(
        user_id=20,
        role_id=1,
        full_name="Deactivated User",
        email="deactivated@example.com",
        status=False
    )
    db.add(deact_user)
    db.commit()
    db.close()

    mock_claims = {"email": "deactivated@example.com", "name": "Deactivated User"}
    with patch("jose.jwt.get_unverified_claims", return_value=mock_claims):
        resp = client.post("/api/auth/google-login", json={"google_token": "deactivated_token"})
        assert resp.status_code == 403
        assert "account is deactivated" in resp.json()["detail"].lower()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

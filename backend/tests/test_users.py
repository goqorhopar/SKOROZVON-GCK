"""
Tests for user management endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_create_user(client: AsyncClient, test_user_data):
    """Test creating a new user."""
    response = await client.post("/users/", json=test_user_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == test_user_data["email"].lower()
    assert data["full_name"] == test_user_data["full_name"]
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.anyio
async def test_create_user_duplicate_email(client: AsyncClient, test_user_data):
    """Test creating user with duplicate email."""
    # Create first user
    response = await client.post("/users/", json=test_user_data)
    assert response.status_code == 201
    
    # Try to create another user with same email
    response = await client.post("/users/", json=test_user_data)
    
    assert response.status_code == 400


@pytest.mark.anyio
async def test_create_user_invalid_email(client: AsyncClient):
    """Test creating user with invalid email."""
    user_data = {
        "email": "invalid-email",
        "password": "TestPass123",
        "full_name": "Test User",
    }
    response = await client.post("/users/", json=user_data)
    
    assert response.status_code == 422


@pytest.mark.anyio
async def test_create_user_weak_password(client: AsyncClient):
    """Test creating user with weak password."""
    user_data = {
        "email": "test@example.com",
        "password": "weak",  # Too short, no uppercase, no digit
        "full_name": "Test User",
    }
    response = await client.post("/users/", json=user_data)
    
    assert response.status_code == 422


@pytest.mark.anyio
async def test_get_current_user(client: AsyncClient, test_user_data):
    """Test getting current user info."""
    # Create user and login
    response = await client.post("/users/", json=test_user_data)
    assert response.status_code == 201
    
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"],
    }
    response = await client.post("/auth/login", json=login_data)
    assert response.status_code == 200
    
    token = response.json()["access_token"]
    
    # Get current user
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/users/me", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user_data["email"].lower()


@pytest.mark.anyio
async def test_update_current_user(client: AsyncClient, test_user_data):
    """Test updating current user."""
    # Create user and login
    response = await client.post("/users/", json=test_user_data)
    assert response.status_code == 201
    
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"],
    }
    response = await client.post("/auth/login", json=login_data)
    assert response.status_code == 200
    
    token = response.json()["access_token"]
    
    # Update user
    headers = {"Authorization": f"Bearer {token}"}
    update_data = {"full_name": "Updated Name"}
    response = await client.put("/users/me", json=update_data, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"


@pytest.mark.anyio
async def test_get_user_unauthorized(client: AsyncClient):
    """Test getting users without authentication."""
    response = await client.get("/users/")
    
    assert response.status_code == 401


@pytest.mark.anyio
async def test_list_users(client: AsyncClient, test_user_data):
    """Test listing users."""
    # Create user and login
    response = await client.post("/users/", json=test_user_data)
    assert response.status_code == 201
    
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"],
    }
    response = await client.post("/auth/login", json=login_data)
    assert response.status_code == 200
    
    token = response.json()["access_token"]
    
    # List users
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/users/", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

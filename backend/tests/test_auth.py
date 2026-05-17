"""
Tests for authentication endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_login_success(client: AsyncClient, test_user_data):
    """Test successful user login."""
    # First create a user
    response = await client.post("/users/", json=test_user_data)
    assert response.status_code == 201
    
    # Try to login
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"],
    }
    response = await client.post("/auth/login", json=login_data)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.anyio
async def test_login_invalid_credentials(client: AsyncClient):
    """Test login with invalid credentials."""
    login_data = {
        "email": "nonexistent@example.com",
        "password": "WrongPass123",
    }
    response = await client.post("/auth/login", json=login_data)
    
    assert response.status_code == 401


@pytest.mark.anyio
async def test_login_wrong_password(client: AsyncClient, test_user_data):
    """Test login with wrong password."""
    # Create user
    response = await client.post("/users/", json=test_user_data)
    assert response.status_code == 201
    
    # Try wrong password
    login_data = {
        "email": test_user_data["email"],
        "password": "WrongPassword123",
    }
    response = await client.post("/auth/login", json=login_data)
    
    assert response.status_code == 401


@pytest.mark.anyio
async def test_refresh_token(client: AsyncClient, test_user_data):
    """Test token refresh."""
    # Create user and login
    response = await client.post("/users/", json=test_user_data)
    assert response.status_code == 201
    
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"],
    }
    response = await client.post("/auth/login", json=login_data)
    assert response.status_code == 200
    
    tokens = response.json()
    
    # Refresh token
    refresh_data = {"refresh_token": tokens["refresh_token"]}
    response = await client.post("/auth/refresh", json=refresh_data)
    
    assert response.status_code == 200
    new_tokens = response.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens


@pytest.mark.anyio
async def test_logout(client: AsyncClient, test_user_data):
    """Test user logout."""
    # Create user and login
    response = await client.post("/users/", json=test_user_data)
    assert response.status_code == 201
    
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"],
    }
    response = await client.post("/auth/login", json=login_data)
    assert response.status_code == 200
    
    tokens = response.json()
    
    # Logout
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    response = await client.post("/auth/logout", headers=headers)
    
    assert response.status_code == 200

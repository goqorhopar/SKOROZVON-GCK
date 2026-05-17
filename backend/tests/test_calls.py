"""
Tests for call management endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_create_call(client: AsyncClient, test_user_data, test_call_data):
    """Test creating a new call."""
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
    
    # Create call
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.post("/calls/", json=test_call_data, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["from_number"] == test_call_data["from_number"]
    assert data["to_number"] == test_call_data["to_number"]
    assert data["status"] == "pending"


@pytest.mark.anyio
async def test_list_calls(client: AsyncClient, test_user_data, test_call_data):
    """Test listing calls."""
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
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a call first
    response = await client.post("/calls/", json=test_call_data, headers=headers)
    assert response.status_code == 201
    
    # List calls
    response = await client.get("/calls/", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.anyio
async def test_get_call(client: AsyncClient, test_user_data, test_call_data):
    """Test getting a specific call."""
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
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a call
    response = await client.post("/calls/", json=test_call_data, headers=headers)
    assert response.status_code == 201
    call_id = response.json()["id"]
    
    # Get the call
    response = await client.get(f"/calls/{call_id}", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == call_id


@pytest.mark.anyio
async def test_update_call(client: AsyncClient, test_user_data, test_call_data):
    """Test updating a call."""
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
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a call
    response = await client.post("/calls/", json=test_call_data, headers=headers)
    assert response.status_code == 201
    call_id = response.json()["id"]
    
    # Update the call
    update_data = {
        "status": "completed",
        "duration_seconds": 120,
        "notes": "Updated notes",
    }
    response = await client.patch(f"/calls/{call_id}", json=update_data, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["duration_seconds"] == 120


@pytest.mark.anyio
async def test_get_call_not_found(client: AsyncClient, test_user_data):
    """Test getting a non-existent call."""
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
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to get non-existent call
    response = await client.get("/calls/99999", headers=headers)
    
    assert response.status_code == 404


@pytest.mark.anyio
async def test_call_statistics(client: AsyncClient, test_user_data, test_call_data):
    """Test getting call statistics."""
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
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get statistics
    response = await client.get("/calls/stats/summary", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "total_calls" in data
    assert "calls_by_status" in data
    assert "average_duration_seconds" in data

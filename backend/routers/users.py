from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm  # Slide 12 — parses formData
from bson import ObjectId
from datetime import datetime, timezone, timedelta

from database import users_collection, activity_collection
from models import UserRegister, UserUpdate
from auth import (get_password_hash, verify_password, create_access_token,
                  get_current_user, require_admin, ACCESS_TOKEN_EXPIRE_MINUTES)

router = APIRouter(prefix="/users", tags=["users"])


# ---------------------------------------------------------------
# HELPER — log every action to activity_collection
# ---------------------------------------------------------------

async def log_activity(user_id: str, username: str, action: str, detail: str = None):
    """Save a record of what the user did — used by admin dashboard later."""
    await activity_collection.insert_one({
        "user_id":   user_id,
        "username":  username,
        "action":    action,    # e.g. "login", "logout", "create_expense"
        "detail":    detail,    # e.g. "Deleted: Coffee $5"
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


# ---------------------------------------------------------------
# REGISTER  — JSON body, our custom UserRegister model
# ---------------------------------------------------------------

@router.post("/register")
async def register(user: UserRegister):
    # 1. Check if email already exists
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Hash password before saving — never store plain text!
    new_user = {
        "username":   user.username,
        "email":      user.email,
        "password":   get_password_hash(user.password),
        "role":       "user",   # default role; change to "admin" in MongoDB Atlas manually
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result  = await users_collection.insert_one(new_user)
    user_id = str(result.inserted_id)

    await log_activity(user_id, user.username, "register")
    return {"message": "Registered successfully"}


# ---------------------------------------------------------------
# LOGIN  (Slide 12 — /token route pattern)
# ---------------------------------------------------------------

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2PasswordRequestForm automatically parses formData from the request
    and extracts 'username' and 'password' fields — exactly like Slide 12.

    We use email as the username field.
    On the frontend, send: formData.append('username', email)
                           formData.append('password', password)
    """
    # 1. Find user by email (we use email as username)
    db_user = await users_collection.find_one({"email": form_data.username})

    # 2. Check password matches stored hash
    if not db_user or not verify_password(form_data.password, db_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Create JWT token (Slide 12)
    # NOTE: Never put password inside JWT — JWTs are public!
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user["_id"]), "role": db_user["role"]},
        expires_delta=access_token_expires
    )

    await log_activity(str(db_user["_id"]), db_user["username"], "login")

    # 4. Return token — frontend stores this in localStorage (Slide 17)
    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "role":         db_user["role"],
        "username":     db_user["username"],
        "user_id":      str(db_user["_id"])
    }


# ---------------------------------------------------------------
# LOGOUT
# JWT is stateless — token deletion happens on the frontend
# (localStorage.removeItem — Slide 18). We just log it here.
# ---------------------------------------------------------------

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    db_user = await users_collection.find_one({"_id": ObjectId(current_user["user_id"])})
    if db_user:
        await log_activity(current_user["user_id"], db_user["username"], "logout")
    return {"message": "Logged out"}


# ---------------------------------------------------------------
# GET OWN PROFILE  (protected route — Slide 14)
# ---------------------------------------------------------------

@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Protected route — get_current_user runs first.
    If token is invalid/expired, user is blocked before reaching here.
    """
    db_user = await users_collection.find_one({"_id": ObjectId(current_user["user_id"])})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id":    str(db_user["_id"]),
        "username":   db_user["username"],
        "email":      db_user["email"],
        "role":       db_user["role"],
        "created_at": db_user.get("created_at")
    }


# ---------------------------------------------------------------
# ADMIN ONLY ROUTES  (require_admin dependency — Slide 14)
# ---------------------------------------------------------------

@router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(require_admin)):
    """Admin only — get list of all users."""
    users = []
    async for u in users_collection.find():
        users.append({
            "user_id":    str(u["_id"]),
            "username":   u["username"],
            "email":      u["email"],
            "role":       u["role"],
            "created_at": u.get("created_at")
        })
    return users


@router.put("/admin/users/{user_id}")
async def update_user(user_id: str, update: UserUpdate, current_user: dict = Depends(require_admin)):
    """Admin only — update any user's details."""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    await log_activity(current_user["user_id"], "admin", "update_user", f"Updated user {user_id}")
    return {"message": "User updated"}


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Admin only — delete a user account."""
    result = await users_collection.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    await log_activity(current_user["user_id"], "admin", "delete_user", f"Deleted user {user_id}")
    return {"message": "User deleted"}


@router.get("/admin/activity")
async def get_all_activity(current_user: dict = Depends(require_admin)):
    """Admin only — view all user activity logs."""
    logs = []
    async for log in activity_collection.find().sort("timestamp", -1):
        logs.append({
            "id":        str(log["_id"]),
            "user_id":   log["user_id"],
            "username":  log["username"],
            "action":    log["action"],
            "detail":    log.get("detail"),
            "timestamp": log["timestamp"]
        })
    return logs
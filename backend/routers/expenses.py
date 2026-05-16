from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone

from database import expenses_collection, users_collection, activity_collection
from models import Expense
from auth import get_current_user  # Slide 14 — protect routes with this

router = APIRouter(prefix="/expenses", tags=["expenses"])


# ---------------------------------------------------------------
# HELPER — log every expense action
# ---------------------------------------------------------------

async def log_activity(user_id: str, username: str, action: str, detail: str = None):
    await activity_collection.insert_one({
        "user_id":   user_id,
        "username":  username,
        "action":    action,
        "detail":    detail,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

async def get_username(user_id: str) -> str:
    db_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    return db_user["username"] if db_user else "unknown"


# ---------------------------------------------------------------
# READ — get all expenses for the logged-in user
# Protected route (Slide 14): get_current_user runs first
# ---------------------------------------------------------------

@router.get("/")
async def get_expenses(current_user: dict = Depends(get_current_user)):
    """
    Only returns expenses belonging to the logged-in user.
    user_id from JWT token is used to filter — Slide 14 pattern.
    """
    expenses = []
    cursor = expenses_collection.find({"user_id": current_user["user_id"]})
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        expenses.append(doc)
    return expenses


# ---------------------------------------------------------------
# CREATE — add a new expense
# Protected route (Slide 14)
# ---------------------------------------------------------------

@router.post("/")
async def create_expense(expense: Expense, current_user: dict = Depends(get_current_user)):
    data = expense.dict()
    data["user_id"] = current_user["user_id"]   # tie expense to logged-in user

    result   = await expenses_collection.insert_one(data)
    username = await get_username(current_user["user_id"])

    await log_activity(current_user["user_id"], username,
                       "create_expense", f"Created: {expense.title} ${expense.amount}")
    return {"id": str(result.inserted_id)}


# ---------------------------------------------------------------
# UPDATE — edit an existing expense
# Protected route (Slide 14)
# ---------------------------------------------------------------

@router.put("/{expense_id}")
async def update_expense(expense_id: str, expense: Expense,
                         current_user: dict = Depends(get_current_user)):
    # Make sure expense belongs to this user before updating
    existing = await expenses_collection.find_one({
        "_id":     ObjectId(expense_id),
        "user_id": current_user["user_id"]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")

    await expenses_collection.update_one(
        {"_id": ObjectId(expense_id)},
        {"$set": expense.dict()}
    )

    username = await get_username(current_user["user_id"])
    await log_activity(current_user["user_id"], username,
                       "update_expense", f"Updated: {expense.title} ${expense.amount}")
    return {"message": "Update successful"}


# ---------------------------------------------------------------
# DELETE — remove an expense
# Protected route (Slide 14)
# ---------------------------------------------------------------

@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    # Make sure expense belongs to this user before deleting
    existing = await expenses_collection.find_one({
        "_id":     ObjectId(expense_id),
        "user_id": current_user["user_id"]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")

    await expenses_collection.delete_one({"_id": ObjectId(expense_id)})

    username = await get_username(current_user["user_id"])
    await log_activity(current_user["user_id"], username,
                       "delete_expense", f"Deleted: {existing.get('title')} ${existing.get('amount')}")
    return {"message": "Deleted successfully"}
from pydantic import BaseModel
from typing import Optional


# --- USER MODELS ---

class UserRegister(BaseModel):
    username: str
    email: str
    password: str       # plain text — will be hashed before saving to DB


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None  # plain text — will be hashed before saving


# --- EXPENSE MODEL ---

class Expense(BaseModel):
    title: str
    category: str
    amount: float
    date: str
    description: Optional[str] = None
    # NOTE: user_id is NOT here — it gets injected from the JWT token on the backend
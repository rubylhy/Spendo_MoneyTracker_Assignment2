# Pydantic schemas for input validation
from pydantic import BaseModel
from typing import Optional


# ---------------------------------------------------------------
# DATA VALIDATION MODELS
# ---------------------------------------------------------------

# Pydantic models define the structure and validation
# rules for incoming request data

# Optional allows fields to be omitted,
# which is useful during updates


# ---------------------------------------------------------------
# USER DATA MODELS
# ---------------------------------------------------------------

class UserRegister(BaseModel):
    """
    Model used when creating a new user account.
    Ensures all required registration fields exist.
    """

    username: str
    email: str

    # Password initially arrives as plain text
    # and is securely hashed before database storage
    password: str


class UserUpdate(BaseModel):
    """
    Model used when updating user profile details.
    All fields are optional to support partial updates.
    """

    username: Optional[str] = None
    email: Optional[str] = None

    # Password may be updated and will
    # be hashed before saving
    password: Optional[str] = None


# ---------------------------------------------------------------
# EXPENSE DATA MODEL
# ---------------------------------------------------------------

class Expense(BaseModel):
    """
    Model used for validating expense data
    submitted by users.
    """

    title: str
    category: str
    amount: float
    date: str

    # Optional additional notes
    description: Optional[str] = None


    # user_id is intentionally excluded
    # from client input

    # User identity is retrieved securely
    # from the authenticated JWT token
    # on the backend
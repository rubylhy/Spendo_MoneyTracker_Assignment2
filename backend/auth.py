from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
import jwt
import os
from dotenv import load_dotenv

load_dotenv()

# --- Configuration (Slide 11) ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-very-secret-key")  # Keep this safe!
ALGORITHM  = "HS256"       # generates the signature based on header, payload, secret key
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Tells FastAPI where the login endpoint lives (Slide 11)
# So FastAPI knows to look for the token at /users/login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


# ---------------------------------------------------------------
# PASSWORD HASHING  (Slide 11)
# ---------------------------------------------------------------

def get_password_hash(password: str) -> str:
    """
    Hash a raw password into a scrambled string using the bcrypt algorithm.
    We never store plain text passwords in the database.
    """
    pwd_bytes = password.encode("utf-8")    # Step 1: encode to bytes
    salt      = bcrypt.gensalt(rounds=12)   # Step 2: generate salt
    # 2^12 iterations — strong enough without being too slow
    hashed    = bcrypt.hashpw(pwd_bytes, salt)  # Step 3: hash the password
    return hashed.decode("utf-8")           # Step 4: decode back to string for MongoDB


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Convert the typed password into hash and check if it matches
    the hashed_password stored in the database.
    """
    pwd_bytes    = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)  # securely compare


# ---------------------------------------------------------------
# JWT TOKEN CREATION  (Slide 12)
# ---------------------------------------------------------------

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    Create a token using username/id, expiry time, and the secret key.
    NOTE: Never put a password inside a JWT — JWTs are public (Base64 is not encryption)!
    """
    to_encode = data.copy()
    expire    = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    # jwt.encode() from pyjwt — the specified algorithm generates
    # the signature based on the header, payload, and secret key
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ---------------------------------------------------------------
# VERIFICATION FUNCTION  (Slide 13)
# ---------------------------------------------------------------

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency: grabs the token from the Authorization header,
    decodes it using SECRET_KEY, and throws a 401 error if the
    token is expired or fake.

    If the token is valid, extracts user_id and role from the token.

    HOW TO USE on any protected route (Slide 14):
        async def my_route(current_user = Depends(get_current_user)):
    """
    try:
        # Verify signature and expiration (Slide 13)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Extract user_id from the token payload
        user_id: str = payload.get("sub")
        role: str    = payload.get("role")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"user_id": user_id, "role": role}

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------
# ADMIN GUARD  (Slide 14 — role-based protection)
# ---------------------------------------------------------------

async def require_admin(current_user: dict = Depends(get_current_user)):
    """
    Dependency: only allows admin users through.
    Runs get_current_user first, then checks the role.

    HOW TO USE on admin-only routes:
        async def admin_route(current_user = Depends(require_admin)):
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins only"
        )
    return current_user
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
import jwt
import os
from dotenv import load_dotenv

# Loads environment variables from the .env file
# This allows sensitive information such as secret keys
# to be stored outside the source code
load_dotenv()


# ---------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------

# Secret key used to sign and verify JWT tokens
# Should be kept private and stored securely
SECRET_KEY = os.getenv("SECRET_KEY", "your-very-secret-key")

# HS256 is the hashing algorithm used to generate
# the token signature
ALGORITHM = "HS256"

# Token validity duration (60 minutes)
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# Defines the login endpoint used for OAuth2 authentication
# FastAPI automatically looks for Bearer tokens from this route
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


# ---------------------------------------------------------------
# PASSWORD HASHING
# ---------------------------------------------------------------

def get_password_hash(password: str) -> str:
    """
    Converts a plain text password into a secure hashed value.
    Passwords should never be stored directly in the database.
    """

    # Convert string into bytes because bcrypt works with byte data
    pwd_bytes = password.encode("utf-8")

    # Generate a random salt for stronger security
    # Salt ensures identical passwords produce different hashes
    salt = bcrypt.gensalt(rounds=12)

    # Create the hashed password
    hashed = bcrypt.hashpw(pwd_bytes, salt)

    # Convert bytes back into string format for storage
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compares a user's entered password with the
    hashed password stored in the database.
    """

    # Convert both values into bytes
    pwd_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")

    # Securely compare the entered password
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


# ---------------------------------------------------------------
# JWT TOKEN CREATION
# ---------------------------------------------------------------

def create_access_token(data: dict,
                        expires_delta: timedelta = None) -> str:
    """
    Creates a JWT token containing user information
    and an expiration timestamp.
    """

    # Create a copy so original data is unchanged
    to_encode = data.copy()

    # Set expiry time
    expire = datetime.now(timezone.utc) + (
        expires_delta or
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Add expiration into token payload
    to_encode.update({"exp": expire})

    # Generate token signature using secret key
    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


# ---------------------------------------------------------------
# TOKEN VERIFICATION
# ---------------------------------------------------------------

async def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    """
    Retrieves the token from the Authorization header,
    verifies its validity, and extracts user information.

    This function can be reused in protected routes
    to ensure only authenticated users gain access.
    """

    try:

        # Decode token and verify signature + expiration
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        # Extract information stored in token
        user_id = payload.get("sub")
        role = payload.get("role")

        # Ensure required values exist
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={
                    "WWW-Authenticate": "Bearer"
                },
            )

        # Return authenticated user details
        return {
            "user_id": user_id,
            "role": role
        }

    # Token has passed expiry time
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # Token is invalid or modified
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )


# ---------------------------------------------------------------
# ROLE-BASED ACCESS CONTROL
# ---------------------------------------------------------------

async def require_admin(
    current_user: dict = Depends(
        get_current_user
    )
):
    """
    Restricts access to administrator users only.

    First checks whether the user is authenticated,
    then verifies their role.
    """

    if current_user["role"] != "admin":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins only"
        )

    return current_user

# Spendo — Personal Expense Tracker
 
## 1. Project Description
 
**Problem this website solves:**
Managing daily expenses is difficult without a clear system. 
People often lose track of how much they spend, in which categories, 
and how their habits change over time. Spendo solves this by providing a simple, 
organised platform to log, review, and analyse personal expenses — all in one place.
 
Spendo allows users to record expenses with a title, category, amount, date, and description. 
It provides live search, category filtering, and month-by-month history reviews. 
Visual analytics including a 6-month trend chart and category percentage breakdown 
help users understand their spending patterns. 
A secure login system ensures each user's data is private, 
and an admin dashboard allows management of all user accounts and activity logs.

app features: login-logout

## 2. Technical Stack and Dependencies
 
### Frontend
| Technology | Purpose |
|---|---|
| React (Vite) | UI framework for building the single-page application |
| React Router DOM | Client-side routing between Dashboard and Admin pages |
| Tailwind CSS | Utility-first styling |
 
### Backend
| Technology | Purpose |
|---|---|
| FastAPI | Python web framework for building the REST API |
| PyJWT | JWT token generation and verification |
| bcrypt | Password hashing |
| python-dotenv | Loads environment variables from `.env` file |
| Motor | Async MongoDB driver |
| certifi | SSL certificate verification for MongoDB Atlas |
 
### Database
| Technology | Purpose |
|---|---|
| MongoDB Atlas | Cloud-based NoSQL database |


## 3. How to Run
 
### Backend
```bash
cd backend
source .venv/bin/activate     
pip3 install fastapi uvicorn motor certifi pyjwt bcrypt python-dotenv
uvicorn main:app --reload
```
 
Create a `.env` file inside `backend/` with:
```
MONGO_URL=your_mongodb_atlas_connection_string
SECRET_KEY=your_secret_key_here
```
 
### Frontend
```bash
cd frontend
npm install
npm run dev
```
 
---

## 4. Folder Structure
 
```
Spendo/
├── backend/
│   ├── routers/
│   │   ├── __init__.py     # marks routers as a Python package
│   │   ├── users.py        # register, login, logout, admin routes
│   │   └── expenses.py     # CRUD operations for expenses
│   ├── main.py             # FastAPI app entry point, CORS middleware
│   ├── auth.py             # JWT, bcrypt hashing, route protection
│   ├── database.py         # MongoDB connection and collection references
│   └── models.py           # Pydantic schemas for input validation
│
├── frontend/
│   └── src/
│       ├── components/
│       │   └── LoginModal.jsx  # login and registration modal
│       ├── pages/
│       │   ├── Dashboard.jsx   # main expense tracker page
│       │   └── AdminPage.jsx   # admin dashboard
│       ├── App.jsx             # auth state, routing, login/logout handlers
│       ├── main.jsx            # React entry point
│       └── index.css           # Tailwind CSS entry point
│
├── database/
│   ├── expenses.json       # exported expenses_collection
│   ├── users.json          # exported users_collection
│   └── activity.json       # exported activity_collection
│
├── .gitignore
└── README.md
```
 
---

## 5. Workload Allocation

| Member | Files Written |
|---|---|
| Ruby Lee | `frontend/src/App.jsx`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/AdminPage.jsx`, `frontend/src/components/LoginModal.jsx`, `database/expenses.json`, `database/users.json`, `database/activity.json` |
| Tracy Liu| `backend/main.py`, `backend/auth.py`, `backend/database.py`, `backend/models.py`, `backend/routers/users.py`, `backend/routers/expenses.py` |
feature allocation..

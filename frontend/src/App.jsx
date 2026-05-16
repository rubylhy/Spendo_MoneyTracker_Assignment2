import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginModal from "./components/LoginModal";
import Dashboard from "./pages/Dashboard";
import AdminPage from "./pages/AdminPage.jsx";

const App = () => {
  // --- Authentication State (Slide 16) ---
  // Initialise from localStorage so it survives page refreshes
  const [token, setToken]       = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));
  const [role, setRole]         = useState(localStorage.getItem("role"));

  // Controls whether the Login Modal is open — Slide 16
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // --- handleLogin (Slide 17) ---
  // Called by LoginModal when user submits the login form
  const handleLogin = async (credentials) => {
    try {
      // OAuth2 requires formData — Slide 17
      const formData = new FormData();
      formData.append("username", credentials.username);  // email goes here
      formData.append("password", credentials.password);

      const response = await fetch("http://127.0.0.1:8000/users/login", {
        method: "POST",
        body: formData,   // send as formData — Slide 17
      });

      const data = await response.json();

      if (response.ok) {
        // Store token in localStorage for persistency — Slide 17
        // Survives page refreshes, browser restarts, computer reboots
        localStorage.setItem("token",    data.access_token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("role",     data.role);

        // Also store in state — React reads from state because
        // it's fast and triggers UI updates — Slide 17
        setToken(data.access_token);
        setUsername(data.username);
        setRole(data.role);
        setIsLoginModalOpen(false);  // close modal on success
      } else {
        alert(data.detail || "Login failed. Please check your credentials.");
      }
    } catch {
      alert("Server connection failed");
    }
  };

  // --- handleLogout (Slide 18) ---
  // Clear localStorage and state when user logs out
  const handleLogout = async () => {
    try {
      // Tell backend to log the logout activity
      await fetch("http://127.0.0.1:8000/users/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Even if backend call fails, still log out on frontend
    }

    // Clear state — Slide 18
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setToken(null);
    setUsername(null);
    setRole(null);
  };

  return (
    <BrowserRouter>
      {/* ---- HEADER (Slide 19 — toggle between Login button and Welcome+Logout) ---- */}
      <header className="bg-white border-b px-8 py-3 flex justify-between items-center shadow-sm z-10">
        <h1 className="text-xl font-black text-indigo-600">💰 Spendo</h1>

        <div className="flex items-center gap-3">
          {/* Slide 19 — if no token show Login button, if token show Welcome + Logout */}
          {!token ? (
            // Not logged in — show Login button
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700"
            >
              Login
            </button>
          ) : (
            // Logged in — show username, admin link, logout
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                Welcome, <strong className="text-indigo-600">{username}</strong>
              </span>

              {/* Show Admin link only if role is admin */}
              {role === "admin" && (
                <a
                  href="/admin"
                  className="text-xs font-bold text-orange-500 hover:underline"
                >
                  Admin Panel
                </a>
              )}

              <button
                onClick={handleLogout}
                className="text-xs font-bold text-gray-400 hover:text-red-500"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ---- ROUTES ---- */}
      <Routes>
        {/* Dashboard — redirect to login if not logged in */}
        <Route
          path="/"
          element={
            token
              ? <Dashboard token={token} onLogout={handleLogout} />
              : (
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                  <h2 className="text-2xl font-black text-gray-700 mb-2">Welcome to Spendo</h2>
                  <p className="text-gray-400 mb-6 text-sm">Please log in to manage your expenses</p>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700"
                  >
                    Login
                  </button>
                </div>
              )
          }
        />

        {/* Admin page — redirect to home if not admin */}
        <Route
          path="/admin"
          element={
            role === "admin"
              ? <AdminPage token={token} />
              : <Navigate to="/" />
          }
        />
      </Routes>

      {/* ---- LOGIN MODAL (Slide 19 — show when isLoginModalOpen is true) ---- */}
      {isLoginModalOpen && (
        <LoginModal
          onLogin={handleLogin}                           // Slide 20 — pass handleLogin as prop
          onClose={() => setIsLoginModalOpen(false)}      // Slide 20 — pass onClose as prop
        />
      )}
    </BrowserRouter>
  );
};

export default App;
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginModal from "./components/LoginModal";
import Dashboard from "./pages/Dashboard";
import AdminPage from "./pages/AdminPage.jsx";

// Centralised API URL — change once here if backend URL changes
const API_URL = "http://127.0.0.1:8000";

const App = () => {

  // ---------------------------------------------------------------
  // AUTHENTICATION STATE
  // Initialised from localStorage so values survive page refreshes,
  // browser restarts, and computer reboots.
  // Both localStorage and state are used together:
  //   - localStorage provides persistence across sessions
  //   - state triggers React re-renders when values change
  // ---------------------------------------------------------------
  const [token, setToken]       = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));
  const [role, setRole]         = useState(localStorage.getItem("role"));

  // Controls whether the Login Modal is visible
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // ---------------------------------------------------------------
  // handleLogin — called by LoginModal when user submits login form
  // FastAPI's OAuth2PasswordRequestForm requires credentials to be
  // sent as FormData (not JSON), so we use the FormData API here.
  // On success, saves the token to both localStorage (persistence)
  // and state (triggers UI updates).
  // ---------------------------------------------------------------
  const handleLogin = async (credentials) => {
    try {
      // OAuth2 specification requires credentials sent as FormData
      // not as JSON — FastAPI's login endpoint expects this format
      const formData = new FormData();
      formData.append("username", credentials.username); // email used as username
      formData.append("password", credentials.password);

      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Save to localStorage for persistence across sessions
        localStorage.setItem("token",    data.access_token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("role",     data.role);

        // Save to state so React re-renders the UI immediately
        // e.g. header switches from Login button to Welcome + Logout
        setToken(data.access_token);
        setUsername(data.username);
        setRole(data.role);
        setIsLoginModalOpen(false); // close the modal on successful login
      } else {
        // Show backend error message e.g. "Incorrect email or password"
        alert(data.detail || "Login failed. Please check your credentials.");
      }
    } catch {
      // Catch network errors — e.g. backend server is not running
      alert("Unable to connect to the server. Please make sure the backend is running.");
    }
  };

  // ---------------------------------------------------------------
  // handleLogout — clears all auth data from localStorage and state
  // Also notifies the backend to log the logout activity.
  // Even if the backend call fails, the frontend still logs out —
  // this ensures the user is never stuck in a logged-in state.
  // ---------------------------------------------------------------
  const handleLogout = async () => {
    try {
      // Notify backend to record the logout in the activity log
      await fetch(`${API_URL}/users/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // If backend is unreachable, still proceed with frontend logout
      // The user should never be stuck in a broken logged-in state
    }

    // Remove token and user info from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    // Clear state — triggers UI re-render back to the logged-out view
    setToken(null);
    setUsername(null);
    setRole(null);
  };

  return (
    <BrowserRouter>

      {/* ---------------------------------------------------------------
          HEADER — shown on every page
          Conditionally renders different content based on login state:
          - Not logged in: shows Login button
          - Logged in: shows username, Admin Panel link (admin only), Logout
      --------------------------------------------------------------- */}
      <header className="bg-white border-b px-8 py-3 flex justify-between items-center shadow-sm z-10">
        <h1 className="text-xl font-black text-indigo-600">💰 Spendo</h1>

        <div className="flex items-center gap-3">
          {!token ? (
            // No token in state — user is not logged in
            // Show Login button which opens the LoginModal
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700"
            >
              Login
            </button>
          ) : (
            // Token exists — user is logged in
            // Show their username, optional Admin Panel link, and Logout button
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                Welcome, <strong className="text-indigo-600">{username}</strong>
              </span>

              {/* Admin Panel link — only visible to users with role "admin"
                  Regular users never see this link (role-based access control) */}
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

      {/* ---------------------------------------------------------------
          ROUTES — React Router handles client-side navigation
          No full page reloads — content swaps dynamically (SPA behaviour)
      --------------------------------------------------------------- */}
      <Routes>

        {/* Dashboard route — the main expense tracker page
            If the user is not logged in (no token), show a welcome
            screen with a Login button instead of the dashboard */}
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

        {/* Admin route — only accessible to users with role "admin"
            If a non-admin tries to visit /admin directly,
            Navigate redirects them back to the home page */}
        <Route
          path="/admin"
          element={
            role === "admin"
              ? <AdminPage token={token} />
              : <Navigate to="/" />  // redirect non-admins away from this page
          }
        />

      </Routes>

      {/* ---------------------------------------------------------------
          LOGIN MODAL — rendered on top of everything when open
          Only mounted in the DOM when isLoginModalOpen is true.
          Passes two props:
            onLogin — handles the login API call and state update
            onClose — closes the modal without logging in
      --------------------------------------------------------------- */}
      {isLoginModalOpen && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}

    </BrowserRouter>
  );
};

export default App;
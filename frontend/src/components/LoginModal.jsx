// login and registration modal
import { useState } from "react";

// Centralised API URL — change once here if backend URL changes
const API_URL = "http://127.0.0.1:8000";

// ---------------------------------------------------------------
// LoginModal component
// Handles both login and registration in one modal window
// Receives two props from App.jsx:
//   onLogin(credentials) — called when user submits the login form
//   onClose()            — called when user clicks X or outside modal
// ---------------------------------------------------------------
const LoginModal = ({ onLogin, onClose }) => {

  // Single state object for login fields — groups related fields together
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  // Single state object for registration fields
  const [regData, setRegData] = useState({ username: "", email: "", password: "" });

  // Controls whether to show login form or register form
  const [isRegistering, setIsRegistering] = useState(false);

  // Stores error message to show below the form if something goes wrong
  const [error, setError] = useState("");

  // ---------------------------------------------------------------
  // handleChange — updates login credentials as user types
  // Uses computed property [e.target.name] to update the correct
  // field without needing a separate handler for each input
  // ---------------------------------------------------------------
  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  // Same pattern for registration form fields
  const handleRegChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
  };

  // ---------------------------------------------------------------
  // handleSubmit — called when user clicks Login button
  // Does NOT handle the actual API call here — passes credentials
  // up to App.jsx via the onLogin prop, keeping this component
  // focused only on the UI (separation of concerns)
  // ---------------------------------------------------------------
  const handleSubmit = (e) => {
    e.preventDefault();  // prevent browser from reloading the page
    setError("");        // clear any previous error message
    onLogin(credentials); // pass credentials up to App.jsx to handle
  };

  // ---------------------------------------------------------------
  // handleRegister — called when user submits the registration form
  // Sends a POST request to create a new user account
  // On success, switches back to the login form automatically
  // ---------------------------------------------------------------
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Registered successfully! Please log in.");
        // Switch back to login form after successful registration
        setIsRegistering(false);
        // Clear registration fields for security
        setRegData({ username: "", email: "", password: "" });
      } else {
        // Show backend error message e.g. "Email already registered"
        setError(data.detail || "Registration failed. Please try again.");
      }
    } catch {
      // Catch network errors — e.g. backend is not running
      setError("Unable to connect to the server. Please make sure the backend is running.");
    }
  };

  return (
    // Modal overlay — dark background behind the modal
    // Clicking the overlay calls onClose() to dismiss the modal
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Modal content box */}
      {/* stopPropagation prevents clicks inside from bubbling up to the overlay */}
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* X button — calls onClose() prop to close the modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>

        {/* Title changes depending on which form is active */}
        <h2 className="text-2xl font-black text-gray-800 mb-1">
          {isRegistering ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          {isRegistering ? "Sign up for Spendo" : "Log in to Spendo"}
        </p>

        {/* Error message — only shown when error state is not empty */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* ---- LOGIN FORM ---- */}
        {/* Only rendered when isRegistering is false */}
        {!isRegistering && (
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Email
              </label>
              {/* Field name is "username" because FastAPI's OAuth2PasswordRequestForm
                  expects a field called "username" — we use email as the username */}
              <input
                type="email"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                placeholder="you@email.com"
                required
                className="w-full mt-1 border-2 border-gray-100 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full mt-1 border-2 border-gray-100 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Login
            </button>

            {/* Switch to register form */}
            <p className="text-center text-xs text-gray-400">
              No account?{" "}
              <button
                type="button"
                onClick={() => { setIsRegistering(true); setError(""); }}
                className="text-indigo-600 font-bold hover:underline"
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {/* ---- REGISTER FORM ---- */}
        {/* Only rendered when isRegistering is true */}
        {isRegistering && (
          <form onSubmit={handleRegister} className="space-y-4">

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={regData.username}
                onChange={handleRegChange}
                placeholder="Your name"
                required
                className="w-full mt-1 border-2 border-gray-100 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={regData.email}
                onChange={handleRegChange}
                placeholder="you@email.com"
                required
                className="w-full mt-1 border-2 border-gray-100 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={regData.password}
                onChange={handleRegChange}
                placeholder="••••••••"
                required
                className="w-full mt-1 border-2 border-gray-100 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Create Account
            </button>

            {/* Switch back to login form */}
            <p className="text-center text-xs text-gray-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setIsRegistering(false); setError(""); }}
                className="text-indigo-600 font-bold hover:underline"
              >
                Log in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
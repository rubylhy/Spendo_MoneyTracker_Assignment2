import { useState } from "react";

// LoginModal component — Slide 20
// Receives two props:
//   onLogin(credentials) — called when user clicks Login
//   onClose()            — called when user clicks Cancel or X
const LoginModal = ({ onLogin, onClose }) => {
  // One state object for both fields — lecturer's pattern Slide 20
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [isRegistering, setIsRegistering] = useState(false);
  const [regData, setRegData] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  // Update credentials state as user types — Slide 20
  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleRegChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
  };

  // Called when login form is submitted — passes credentials up to App.jsx
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    onLogin(credentials);  // Slide 20 — call onLogin() passed as prop
  };

  // Register a new account
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:8000/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Registered successfully! Please log in.");
        setIsRegistering(false);  // switch back to login form
      } else {
        setError(data.detail || "Registration failed");
      }
    } catch {
      setError("Server connection failed");
    }
  };

  return (
    // Modal overlay — clicking outside closes it
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Modal content — stop click from closing when clicking inside */}
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — Slide 20: calls onClose() prop */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>

        <h2 className="text-2xl font-black text-gray-800 mb-1">
          {isRegistering ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          {isRegistering ? "Sign up for Spendo" : "Log in to Spendo"}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* ---- LOGIN FORM ---- */}
        {!isRegistering && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username = email — Slide 20 pattern */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                name="username"       // must be "username" for OAuth2PasswordRequestForm
                value={credentials.username}
                onChange={handleChange}  // update state as user types — Slide 20
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
                onChange={handleChange}  // update state as user types — Slide 20
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

            {/* Switch to register */}
            <p className="text-center text-xs text-gray-400">
              No account?{" "}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-indigo-600 font-bold hover:underline"
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {/* ---- REGISTER FORM ---- */}
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

            <p className="text-center text-xs text-gray-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
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
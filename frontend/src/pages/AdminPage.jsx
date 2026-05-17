import { useState, useEffect } from "react";

// Centralised API URL — change once here if backend URL changes
const API_URL = "http://127.0.0.1:8000";

const AdminPage = ({ token }) => {

  // --- State declarations ---
  // useState is appropriate here as each value is independent
  const [users, setUsers]         = useState([]);       // list of all registered users
  const [activity, setActivity]   = useState([]);       // list of all activity logs
  const [activeTab, setActiveTab] = useState("users");  // controls which tab is visible
  const [loading, setLoading]     = useState(true);     // shows loading state on first fetch
  const [error, setError]         = useState("");       // stores error message if fetch fails

  // Fetch data when component mounts or token changes
  // Only fetches if a valid token exists — prevents unauthorized API calls
  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchActivity();
    }
  }, [token]);

  // ---------------------------------------------------------------
  // fetchUsers — fetch all registered users (admin only)
  // The Authorization header sends the JWT token to the backend
  // so FastAPI can verify the user is an admin before returning data
  // ---------------------------------------------------------------
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError("Failed to fetch users. Please try again.");
      }
    } catch {
      // Catch network errors — e.g. backend is not running
      setError("Unable to connect to the server. Please make sure the backend is running.");
    } finally {
      // Always hide loading spinner regardless of success or failure
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------
  // fetchActivity — fetch all user activity logs (admin only)
  // Logs include: login, logout, register, create/update/delete expense
  // ---------------------------------------------------------------
  const fetchActivity = async () => {
    try {
      const response = await fetch(`${API_URL}/users/admin/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setActivity(data);
      }
    } catch {
      // Log to console but don't block the page — users tab still works
      console.error("Failed to fetch activity logs");
    }
  };

  // ---------------------------------------------------------------
  // deleteUser — permanently delete a user account (admin only)
  // Asks for confirmation first to prevent accidental deletions
  // After deletion, updates local state directly to avoid an extra fetch
  // ---------------------------------------------------------------
  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      const response = await fetch(`${API_URL}/users/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        // Remove deleted user from local state — avoids extra network request
        setUsers(users.filter((u) => u.user_id !== userId));
        // Refresh activity log to show the delete_user action that was just logged
        fetchActivity();
      }
    } catch {
      alert("Unable to connect to the server. Please try again.");
    }
  };

  // ---------------------------------------------------------------
  // getActionColor — returns a colour class based on the action type
  // Makes the activity log easier to scan at a glance
  // Each action type has a distinct colour so admins can quickly identify
  // what kind of activity occurred
  // ---------------------------------------------------------------
  const getActionColor = (action) => {
    const colors = {
      login:          "bg-green-100 text-green-700",
      logout:         "bg-gray-100 text-gray-600",
      register:       "bg-blue-100 text-blue-700",
      create_expense: "bg-indigo-100 text-indigo-700",
      update_expense: "bg-orange-100 text-orange-700",
      delete_expense: "bg-red-100 text-red-700",
      update_user:    "bg-yellow-100 text-yellow-700",
      delete_user:    "bg-red-100 text-red-700",
    };
    // Fall back to grey if action type is not in the map
    return colors[action] || "bg-gray-100 text-gray-600";
  };

  // ---------------------------------------------------------------
  // RENDER — early returns for loading and error states
  // This prevents showing a blank or broken page to the user
  // ---------------------------------------------------------------

  // Show loading screen while first fetch is in progress
  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">
      Loading...
    </div>
  );

  // Show error screen if connection failed — instead of a blank page
  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <p className="text-red-500 font-bold">{error}</p>
      <button
        onClick={() => { setError(""); setLoading(true); fetchUsers(); fetchActivity(); }}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-800">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Manage users and view activity logs</p>
        </div>

        {/* Stats row — quick overview numbers at the top */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Users</p>
            <p className="text-3xl font-black text-indigo-600 mt-1">{users.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Activities</p>
            <p className="text-3xl font-black text-indigo-600 mt-1">{activity.length}</p>
          </div>
        </div>

        {/* Tab buttons — toggle between Users and Activity Logs views */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all
              ${activeTab === "users"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-400 border hover:border-indigo-300"}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all
              ${activeTab === "activity"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-400 border hover:border-indigo-300"}`}
          >
            Activity Logs
          </button>
        </div>

        {/* ---- USERS TAB ---- */}
        {/* Only renders when the Users tab is active */}
        {activeTab === "users" && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-xs font-bold text-gray-400 uppercase">Username</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-400 uppercase">Email</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-400 uppercase">Role</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-400 uppercase">Joined</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-800">{user.username}</td>
                    <td className="p-4 text-gray-500">{user.email}</td>
                    <td className="p-4">
                      {/* Role badge — orange for admin, indigo for regular user */}
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase
                        ${user.role === "admin"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-indigo-100 text-indigo-600"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">
                      {/* Format ISO timestamp to readable local date */}
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4">
                      {/* Admins cannot be deleted — prevents accidental lockout */}
                      {user.role !== "admin" && (
                        <button
                          onClick={() => deleteUser(user.user_id)}
                          className="text-xs text-red-500 hover:text-red-700 font-bold"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Empty state — shown if no users exist */}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- ACTIVITY TAB ---- */}
        {/* Only renders when the Activity Logs tab is active */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-xs font-bold text-gray-400 uppercase">User</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-400 uppercase">Action</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-400 uppercase">Detail</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-400 uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-800">{log.username}</td>
                    <td className="p-4">
                      {/* Colour-coded action badge — makes log easier to scan */}
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase
                        ${getActionColor(log.action)}`}>
                        {/* Replace underscore with space for readability e.g. "create expense" */}
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">
                      {/* Show detail if available, otherwise show dash */}
                      {log.detail || "—"}
                    </td>
                    <td className="p-4 text-gray-400 text-xs">
                      {/* Format ISO timestamp to readable local date and time */}
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* Empty state — shown if no activity logs exist yet */}
                {activity.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-400 text-sm">
                      No activity logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPage;
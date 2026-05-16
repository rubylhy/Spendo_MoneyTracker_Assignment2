import { useState, useEffect } from "react";

const AdminPage = ({ token }) => {
  const [users, setUsers]       = useState([]);
  const [activity, setActivity] = useState([]);
  const [activeTab, setActiveTab] = useState("users"); // "users" or "activity"
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchActivity();
    }
  }, [token]);

  // --- Fetch all users (admin only) ---
  const fetchUsers = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/users/admin/users", {
        headers: { Authorization: `Bearer ${token}` },  // Slide 18
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError("Failed to fetch users");
      }
    } catch {
      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch all activity logs (admin only) ---
  const fetchActivity = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/users/admin/activity", {
        headers: { Authorization: `Bearer ${token}` },  // Slide 18
      });
      if (response.ok) {
        const data = await response.json();
        setActivity(data);
      }
    } catch {
      console.error("Failed to fetch activity");
    }
  };

  // --- Delete a user ---
  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/users/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setUsers(users.filter((u) => u.user_id !== userId));
        fetchActivity(); // refresh activity log
      }
    } catch {
      alert("Delete failed");
    }
  };

  // --- Action badge colour ---
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
    return colors[action] || "bg-gray-100 text-gray-600";
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">
      Loading...
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen text-red-500">
      {error}
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

        {/* Stats row */}
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all
              ${activeTab === "users" ? "bg-indigo-600 text-white" : "bg-white text-gray-400 border hover:border-indigo-300"}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all
              ${activeTab === "activity" ? "bg-indigo-600 text-white" : "bg-white text-gray-400 border hover:border-indigo-300"}`}
          >
            Activity Logs
          </button>
        </div>

        {/* ---- USERS TAB ---- */}
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
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase
                        ${user.role === "admin" ? "bg-orange-100 text-orange-600" : "bg-indigo-100 text-indigo-600"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4">
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
              </tbody>
            </table>
          </div>
        )}

        {/* ---- ACTIVITY TAB ---- */}
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
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${getActionColor(log.action)}`}>
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">{log.detail || "—"}</td>
                    <td className="p-4 text-gray-400 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;

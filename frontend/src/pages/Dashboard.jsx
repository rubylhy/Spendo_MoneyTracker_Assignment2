import { useState, useEffect, useReducer, useRef } from 'react';

// Centralised API URL — change once here if backend URL changes
const API_URL = "http://127.0.0.1:8000";

// ---------------------------------------------------------------
// FORM REDUCER — manages all 5 form fields together
// useReducer is chosen over useState here because all 5 fields
// are related and frequently updated, reset, or loaded together
// as one unit. This avoids having 5 separate useState declarations
// and 5 separate setter calls every time the form resets or loads.
// ---------------------------------------------------------------
const formReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      // Update only the field that changed, keep the rest the same
      // Uses computed property [action.field] to target the correct field
      return { ...state, [action.field]: action.value };
    case 'RESET':
      // Reset all 5 fields back to empty at once — e.g. after saving
      return { title: '', category: 'Food', amount: '', date: '', description: '' };
    case 'LOAD':
      // Replace all fields with an existing expense's data — e.g. when editing
      return action.payload;
    default:
      return state;
  }
};

const Dashboard = ({ token, onLogout }) => {

  // ---------------------------------------------------------------
  // STATE DECLARATIONS
  // useState is used for simple independent values that don't
  // need to change together — each one has a single responsibility
  // ---------------------------------------------------------------
  const [expenses, setExpenses]                 = useState([]);    // full list from backend
  const [searchTerm, setSearchTerm]             = useState('');    // live search input value
  const [selectedMonth, setSelectedMonth]       = useState(new Date().toISOString().slice(0, 7)); // active month filter
  const [selectedCategory, setSelectedCategory] = useState('All'); // active category filter
  const [editingId, setEditingId]               = useState(null);  // id of expense being edited, null if creating new
  const [loading, setLoading]                   = useState(false); // true while waiting for backend response
  const [submitting, setSubmitting]             = useState(false); // true while form is being submitted — prevents double submit
  const [error, setError]                       = useState(null);  // stores error message when API call fails

  // useReducer for form — all 5 fields are managed together as one unit
  // dispatch() is used to send actions to the reducer instead of calling setters directly
  const [formData, dispatch] = useReducer(formReducer, {
    title: '', category: 'Food', amount: '', date: '', description: ''
  });

  // useRef for the search input — gives direct access to the DOM element
  // useRef is chosen over useState here because accessing a DOM element
  // (e.g. to focus it) does not need to trigger a re-render
  const searchRef = useRef(null);

  // Category colour map — defined once at component level and reused
  // throughout the component to keep colours consistent
  const categoryColors = {
    Food: 'bg-orange-400', Transport: 'bg-blue-400', Housing: 'bg-green-400',
    Entertainment: 'bg-purple-400', Healthcare: 'bg-red-400', Shopping: 'bg-pink-400',
  };

  // Fetch expenses whenever the token changes
  // The token dependency ensures we only fetch when the user is logged in
  // and re-fetches automatically if the token is refreshed
  useEffect(() => { if (token) fetchExpenses(); }, [token]);

  // Auto-focus the search bar when the dashboard first loads
  // Empty dependency array means this runs once on mount only
  // useRef.current gives direct access to the input DOM element
  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
  }, []);

  // ---------------------------------------------------------------
  // authFetch — reusable authenticated fetch helper
  // Wraps the native fetch() to automatically attach the JWT token
  // to the Authorization header on every request.
  // This avoids repeating the header in every individual fetch call.
  // Also handles automatic logout if the token expires (401 response).
  // ---------------------------------------------------------------
  const authFetch = async (url, options = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // JWT token is sent in the Authorization header with every request
        // The backend uses this to identify and verify the logged-in user
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      }
    });
    // If backend returns 401 (Unauthorized), the token has expired or is invalid
    // Automatically log the user out instead of showing a confusing error
    if (response.status === 401) { onLogout(); return null; }
    return response;
  };

  // ---------------------------------------------------------------
  // fetchExpenses — load all expenses belonging to the logged-in user
  // Sets loading state while waiting, and error state if it fails
  // so the user always sees meaningful feedback instead of a blank page
  // ---------------------------------------------------------------
  const fetchExpenses = async () => {
    setLoading(true);
    setError(null); // clear any previous error message before retrying
    try {
      const response = await authFetch('/expenses/');
      if (!response) return; // null means 401 was handled — user logged out
      if (!response.ok) throw new Error("Failed to load expenses");
      const data = await response.json();
      setExpenses(data);
    } catch {
      // Show a user-friendly message instead of a blank page or console error
      setError("Unable to connect to the server. Please make sure the backend is running.");
    } finally {
      // Always hide the loading indicator whether the request succeeded or failed
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------
  // handleChange — updates a single form field when the user types
  // Dispatches UPDATE_FIELD action to the reducer with the field
  // name and new value — works for all inputs with a matching name
  // ---------------------------------------------------------------
  const handleChange = (e) => dispatch({
    type: 'UPDATE_FIELD',
    field: e.target.name,  // matches the input's name attribute
    value: e.target.value
  });

  // ---------------------------------------------------------------
  // handleSubmit — creates a new expense or updates an existing one
  // Uses editingId to determine whether to POST (create) or PUT (update)
  // The submitting flag prevents double submission if user clicks twice
  // ---------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault(); // prevent browser default form submission behaviour
    if (submitting) return; // guard against double submit

    // Validate each required field with a specific message
    if (!formData.title.trim())                   return alert("Please enter a title");
    if (!formData.amount || formData.amount <= 0) return alert("Please enter a valid amount");
    if (!formData.date)                           return alert("Please select a date");

    // Determine endpoint and method based on whether we are editing or creating
    const url    = editingId ? `/expenses/${editingId}` : '/expenses/';
    const method = editingId ? 'PUT' : 'POST';

    setSubmitting(true); // disable the submit button to prevent duplicate requests
    try {
      const response = await authFetch(url, {
        method,
        // Convert amount to float before sending — backend expects a number not a string
        body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) }),
      });
      if (!response) return;
      if (response.ok) {
        fetchExpenses(); // refresh the expense list to show the new/updated entry
        resetForm();     // clear the form and exit edit mode
      } else {
        const data = await response.json();
        alert(data.detail || "Failed to save expense");
      }
    } catch {
      alert("Unable to connect to the server. Please try again.");
    } finally {
      setSubmitting(false); // always re-enable the button when the request finishes
    }
  };

  // ---------------------------------------------------------------
  // resetForm — clears the form and exits edit mode
  // Dispatches RESET action which sets all 5 fields back to empty at once
  // ---------------------------------------------------------------
  const resetForm = () => {
    setEditingId(null);
    dispatch({ type: 'RESET' }); // resets all 5 form fields in one action
  };

  // ---------------------------------------------------------------
  // startEdit — loads an existing expense into the form for editing
  // Dispatches LOAD action which replaces all 5 fields at once
  // Sets editingId so handleSubmit knows to use PUT instead of POST
  // ---------------------------------------------------------------
  const startEdit = (exp) => {
    setEditingId(exp.id);
    dispatch({
      type: 'LOAD',
      payload: {
        title:       exp.title,
        category:    exp.category,
        amount:      exp.amount,
        date:        exp.date,
        description: exp.description || '' // fall back to empty string if no description
      }
    });
  };

  // ---------------------------------------------------------------
  // deleteExpense — removes an expense permanently
  // Asks for confirmation first to prevent accidental deletion
  // Updates local state directly after success to avoid an extra fetch
  // ---------------------------------------------------------------
  const deleteExpense = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      const response = await authFetch(`/expenses/${id}`, { method: 'DELETE' });
      if (!response) return;
      if (response.ok) {
        // Filter out the deleted item from local state directly
        // This is faster than re-fetching all expenses from the backend
        setExpenses(expenses.filter(item => item.id !== id));
      } else {
        alert("Failed to delete expense");
      }
    } catch {
      alert("Unable to connect to the server. Please try again.");
    }
  };

  // ---------------------------------------------------------------
  // DATA CALCULATIONS — all derived from the expenses state
  // These are recalculated on every render when expenses changes
  // ---------------------------------------------------------------

  // Expenses that fall within the currently selected month
  const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(selectedMonth));

  // Total dollar amount spent in the selected month
  const totalAmount = monthlyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

  // Expenses filtered by all 3 active filters simultaneously: search, category, month
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch   = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
    const matchesMonth    = exp.date.startsWith(selectedMonth);
    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Total amount per category for the selected month — used to draw the breakdown bars
  const categoryTotals = monthlyExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {});

  // ---------------------------------------------------------------
  // getTrendData — builds spending totals for the last 6 months
  // Used to render the bar chart in the right column
  // ---------------------------------------------------------------
  const getTrendData = () => {
    const months = [];
    const today  = new Date();
    for (let i = 5; i >= 0; i--) {
      // Setting day to 1 avoids edge cases with months of different lengths (e.g. Feb 28/29)
      const d     = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year  = d.getFullYear();
      // padStart ensures the month is always 2 digits e.g. "04" not "4"
      // so it matches the "YYYY-MM" format stored in MongoDB
      const month = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
    }
    return months.map(m => ({
      month: m,
      total: expenses
        .filter(exp => exp.date && exp.date.startsWith(m))
        .reduce((sum, exp) => sum + Number(exp.amount), 0)
    }));
  };

  const trendData = getTrendData();
  // maxTrend is used to scale all bars relative to the tallest one (100% height)
  const maxTrend  = Math.max(...trendData.map(t => t.total), 0);

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  return (
    <div className="h-[calc(100vh-57px)] bg-gray-50 font-sans text-gray-800 overflow-hidden flex flex-col">
      <main className="flex-1 flex overflow-hidden">

        {/* LEFT COLUMN — Add / Edit Form */}
        <aside className="w-80 bg-white border-r p-6 overflow-y-auto shrink-0 shadow-sm">

          {/* Monthly summary card — shows total spending for selected month */}
          <div className="mb-6 p-5 bg-indigo-600 rounded-2xl text-white shadow-md">
            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider mb-1">
              {selectedMonth} Summary
            </p>
            <h2 className="text-2xl font-black">${totalAmount.toLocaleString()}</h2>
          </div>

          {/* Form title changes based on whether user is editing or creating */}
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            {editingId ? 'Edit Record' : 'New Transaction'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Title"
              className="w-full border-2 border-gray-50 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm"
            />
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border-2 border-gray-50 p-3 rounded-xl bg-white outline-none text-sm"
            >
              {/* Dynamically generate options from categoryColors keys */}
              {Object.keys(categoryColors).map(cat => <option key={cat}>{cat}</option>)}
            </select>
            <input
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Amount"
              min="0"
              step="0.01"  // allows decimal values e.g. $5.50
              className="w-full border-2 border-gray-50 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm"
            />
            <input
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full border-2 border-gray-50 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm"
            />
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description (optional)"
              rows="3"
              className="w-full border-2 border-gray-50 p-3 rounded-xl focus:border-indigo-400 outline-none resize-none text-sm"
            />

            {/* Submit button — greyed out and disabled while request is in progress */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full p-3 rounded-xl font-bold text-white transition-all
                ${submitting
                  ? 'bg-gray-400 cursor-not-allowed'  // visual feedback that button is disabled
                  : editingId
                    ? 'bg-orange-500 hover:bg-orange-600'  // orange when editing
                    : 'bg-indigo-600 hover:bg-indigo-700'  // indigo when creating
                }`}
            >
              {/* Button label changes to show progress */}
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </button>

            {/* Cancel button only shown when in edit mode */}
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full p-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
            )}
          </form>
        </aside>

        {/* MIDDLE COLUMN — Expense History List */}
        <section className="flex-1 p-6 overflow-y-auto bg-gray-50 border-r">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-800">History</h2>
              {/* Month picker — updates selectedMonth state which filters the list */}
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-gray-200 text-indigo-600 font-bold py-1 px-2 rounded-lg text-xs outline-none"
              />
            </div>

            {/* Search bar — ref attached here so it auto-focuses when page loads */}
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                placeholder="Quick search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 bg-white p-2 pl-8 rounded-xl text-xs shadow-sm outline-none border focus:border-indigo-400"
              />
              <span className="absolute left-2 top-2.5 text-xs">🔍</span>
            </div>
          </div>

          {/* Category filter pills — clicking one updates selectedCategory state */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['All', ...Object.keys(categoryColors)].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all
                  ${selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md'   // active filter
                    : 'bg-white text-gray-400 border hover:border-indigo-200'}`} // inactive filter
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {/* Loading state — shown while waiting for backend response */}
            {loading && (
              <div className="text-center mt-10">
                <p className="text-gray-400 text-sm">Loading expenses...</p>
              </div>
            )}

            {/* Error state — shown when API connection fails
                Includes a Retry button so user doesn't need to refresh the page */}
            {error && !loading && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
                <p className="text-red-500 text-sm font-bold mb-1">Connection Error</p>
                <p className="text-red-400 text-xs">{error}</p>
                <button
                  onClick={fetchExpenses}
                  className="mt-3 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state — backend connected but no expenses match current filters */}
            {!loading && !error && filteredExpenses.length === 0 && (
              <p className="text-center text-gray-400 text-sm mt-10">No expenses found</p>
            )}

            {/* Expense list — renders one card per filtered expense */}
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100 group transition-all hover:translate-x-1"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Category colour badge — first letter of category name */}
                  <div className={`h-10 w-10 rounded-xl ${categoryColors[exp.category]} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                    {exp.category[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{exp.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{exp.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-sm font-black text-gray-800">
                    ${Number(exp.amount).toLocaleString()}
                  </span>
                  {/* Edit and delete buttons — only visible on hover to keep UI clean */}
                  <div className="flex opacity-0 group-hover:opacity-100 transition-all gap-1">
                    <button
                      onClick={() => startEdit(exp)}
                      className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                    >✏️</button>
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                    >🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN — Charts and Analysis */}
        <aside className="w-72 bg-white p-6 overflow-y-auto shrink-0 shadow-inner">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            6-Month Trend
          </h3>

          {/* Bar chart — each bar height is a percentage of the tallest bar (maxTrend) */}
          <div className="flex items-end justify-between h-32 gap-2 mb-10 px-2 border-b border-gray-100 pb-2">
            {trendData.map((data, i) => {
              // Calculate this bar's height as a percentage of the maximum value
              const barHeight = maxTrend > 0 ? (data.total / maxTrend) * 100 : 0;
              const isActive  = data.month === selectedMonth;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                  {/* Hover tooltip showing exact dollar amount */}
                  <div className="absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                    ${data.total.toLocaleString()}
                  </div>
                  <div
                    className={`w-full rounded-t-sm transition-all duration-500 ease-out
                      ${isActive ? 'bg-indigo-600 shadow-md' : 'bg-indigo-100 group-hover:bg-indigo-200'}`}
                    style={{ height: `${barHeight}%`, minHeight: data.total > 0 ? '4px' : '0px' }}
                  />
                  <span className={`text-[8px] font-bold uppercase truncate w-full text-center
                    ${isActive ? 'text-indigo-600 font-black' : 'text-gray-400'}`}>
                    {/* Using "-02" instead of "-01" avoids timezone offset issues
                        where "-01" could roll back to the previous month in some timezones */}
                    {new Date(data.month + "-02").toLocaleString('default', { month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Category breakdown — horizontal progress bars showing % of monthly total */}
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
            Monthly Breakdown
          </h3>
          <div className="space-y-6">
            {Object.keys(categoryColors).map(cat => {
              const amt        = categoryTotals[cat] || 0;
              // Calculate percentage of this category out of the total monthly spend
              const percentage = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-[11px] mb-2 font-bold">
                    <span className="text-gray-600">{cat}</span>
                    <span className="text-gray-400">
                      ${amt.toLocaleString()}
                      <span className="ml-1 text-indigo-600">({percentage}%)</span>
                    </span>
                  </div>
                  {/* Progress bar width is driven by the percentage value */}
                  <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${categoryColors[cat]} h-full transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

      </main>
    </div>
  );
};

export default Dashboard;
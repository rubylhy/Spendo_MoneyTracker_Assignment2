import { useState, useEffect } from 'react';

// Centralised API URL — change once here if backend URL changes
const API_URL = "http://127.0.0.1:8000";

const Dashboard = ({ token, onLogout }) => {
  const [expenses, setExpenses]             = useState([]);
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedMonth, setSelectedMonth]   = useState(new Date().toISOString().slice(0, 7));
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingId, setEditingId]           = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);   // stores API error message
  const [formData, setFormData]             = useState({
    title: '', category: 'Food', amount: '', date: '', description: ''
  });

  const categoryColors = {
    Food: 'bg-orange-400', Transport: 'bg-blue-400', Housing: 'bg-green-400',
    Entertainment: 'bg-purple-400', Healthcare: 'bg-red-400', Shopping: 'bg-pink-400',
  };

  // Only fetch if token exists — Slide 16 pattern
  useEffect(() => { if (token) fetchExpenses(); }, [token]);

  // --- Reusable fetch helper — adds auth header automatically (Slide 18) ---
  // Avoids repeating Authorization header in every fetch call
  const authFetch = async (url, options = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,   // Slide 18
        ...options.headers,
      }
    });
    // Auto-logout if token is invalid or expired — Slide 18
    if (response.status === 401) { onLogout(); return null; }
    return response;
  };

  // --- FETCH ---
  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);   // clear any previous error before retrying
    try {
      const response = await authFetch('/expenses/');
      if (!response) return;
      if (!response.ok) throw new Error("Failed to load expenses");
      const data = await response.json();
      setExpenses(data);
    } catch {
      // Show user-friendly message instead of blank page — rubric point 5
      setError("Unable to connect to the server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // --- SUBMIT (create or update) ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Input validation — specific messages for each missing field
    if (!formData.title.trim())              return alert("Please enter a title");
    if (!formData.amount || formData.amount <= 0) return alert("Please enter a valid amount");
    if (!formData.date)                      return alert("Please select a date");

    const url    = editingId ? `/expenses/${editingId}` : '/expenses/';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await authFetch(url, {
        method,
        body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) }),
      });
      if (!response) return;
      if (response.ok) { fetchExpenses(); resetForm(); }
      else {
        const data = await response.json();
        alert(data.detail || "Failed to save expense");
      }
    } catch {
      alert("Unable to connect to the server. Please try again.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ title: '', category: 'Food', amount: '', date: '', description: '' });
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setFormData({ title: exp.title, category: exp.category, amount: exp.amount, date: exp.date, description: exp.description || '' });
  };

  // --- DELETE ---
  const deleteExpense = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      const response = await authFetch(`/expenses/${id}`, { method: 'DELETE' });
      if (!response) return;
      if (response.ok) setExpenses(expenses.filter(item => item.id !== id));
      else alert("Failed to delete expense");
    } catch {
      alert("Unable to connect to the server. Please try again.");
    }
  };

  // --- DATA CALCULATIONS ---
  const monthlyExpenses  = expenses.filter(exp => exp.date.startsWith(selectedMonth));
  const totalAmount      = monthlyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch    = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory  = selectedCategory === 'All' || exp.category === selectedCategory;
    const matchesMonth     = exp.date.startsWith(selectedMonth);
    return matchesSearch && matchesCategory && matchesMonth;
  });

  const categoryTotals = monthlyExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {});

  const getTrendData = () => {
    const months = [];
    const today  = new Date();
    for (let i = 5; i >= 0; i--) {
      const d     = new Date(today.getFullYear(), today.getMonth() - i, 1);
      // Setting day to 1 avoids issues with months having different lengths
      const year  = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      // padStart ensures format is "YYYY-MM" not "YYYY-M"
      months.push(`${year}-${month}`);
    }
    return months.map(m => ({
      month: m,
      total: expenses.filter(exp => exp.date && exp.date.startsWith(m))
                     .reduce((sum, exp) => sum + Number(exp.amount), 0)
    }));
  };

  const trendData = getTrendData();
  const maxTrend  = Math.max(...trendData.map(t => t.total), 0);

  return (
    <div className="h-[calc(100vh-57px)] bg-gray-50 font-sans text-gray-800 overflow-hidden flex flex-col">
      <main className="flex-1 flex overflow-hidden">

        {/* LEFT COLUMN — Form */}
        <aside className="w-80 bg-white border-r p-6 overflow-y-auto shrink-0 shadow-sm">
          <div className="mb-6 p-5 bg-indigo-600 rounded-2xl text-white shadow-md">
            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider mb-1">{selectedMonth} Summary</p>
            <h2 className="text-2xl font-black">${totalAmount.toLocaleString()}</h2>
          </div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            {editingId ? 'Edit Record' : 'New Transaction'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input name="title" value={formData.title} onChange={handleChange} placeholder="Title"
              className="w-full border-2 border-gray-50 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm" />
            <select name="category" value={formData.category} onChange={handleChange}
              className="w-full border-2 border-gray-50 p-3 rounded-xl bg-white outline-none text-sm">
              {Object.keys(categoryColors).map(cat => <option key={cat}>{cat}</option>)}
            </select>
            <input name="amount" type="number" value={formData.amount} onChange={handleChange} placeholder="Amount"
              className="w-full border-2 border-gray-50 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm" />
            <input name="date" type="date" value={formData.date} onChange={handleChange}
              className="w-full border-2 border-gray-50 p-3 rounded-xl focus:border-indigo-400 outline-none text-sm" />
            <textarea name="description" value={formData.description} onChange={handleChange}
              placeholder="Description (optional)" rows="3"
              className="w-full border-2 border-gray-50 p-3 rounded-xl focus:border-indigo-400 outline-none resize-none text-sm" />
            <button type="submit"
              className={`w-full p-3 rounded-xl font-bold text-white transition-all ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {editingId ? 'Update' : 'Save'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="w-full p-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200">
                Cancel
              </button>
            )}
          </form>
        </aside>

        {/* MIDDLE COLUMN — History */}
        <section className="flex-1 p-6 overflow-y-auto bg-gray-50 border-r">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-800">History</h2>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-gray-200 text-indigo-600 font-bold py-1 px-2 rounded-lg text-xs outline-none" />
            </div>
            <div className="relative">
              <input type="text" placeholder="Quick search..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 bg-white p-2 pl-8 rounded-xl text-xs shadow-sm outline-none border focus:border-indigo-400" />
              <span className="absolute left-2 top-2.5 text-xs">🔍</span>
            </div>
          </div>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['All', ...Object.keys(categoryColors)].map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all
                  ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-400 border hover:border-indigo-200'}`}>
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {/* Loading state — shown while fetching from backend */}
            {loading && (
              <div className="text-center mt-10">
                <p className="text-gray-400 text-sm">Loading expenses...</p>
              </div>
            )}

            {/* Error state — shown when API fails to connect */}
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

            {/* Empty state — shown when connected but no expenses */}
            {!loading && !error && filteredExpenses.length === 0 && (
              <p className="text-center text-gray-400 text-sm mt-10">No expenses found</p>
            )}
            {filteredExpenses.map((exp) => (
              <div key={exp.id}
                className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100 group transition-all hover:translate-x-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 rounded-xl ${categoryColors[exp.category]} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                    {exp.category[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{exp.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{exp.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-sm font-black text-gray-800">${Number(exp.amount).toLocaleString()}</span>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-all gap-1">
                    <button onClick={() => startEdit(exp)}
                      className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors">✏️</button>
                    <button onClick={() => deleteExpense(exp.id)}
                      className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN — Analysis */}
        <aside className="w-72 bg-white p-6 overflow-y-auto shrink-0 shadow-inner">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">6-Month Trend</h3>
          <div className="flex items-end justify-between h-32 gap-2 mb-10 px-2 border-b border-gray-100 pb-2">
            {trendData.map((data, i) => {
              const barHeight = maxTrend > 0 ? (data.total / maxTrend) * 100 : 0;
              const isActive  = data.month === selectedMonth;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                  <div className="absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                    ${data.total.toLocaleString()}
                  </div>
                  <div className={`w-full rounded-t-sm transition-all duration-500 ease-out ${isActive ? 'bg-indigo-600 shadow-md' : 'bg-indigo-100 group-hover:bg-indigo-200'}`}
                    style={{ height: `${barHeight}%`, minHeight: data.total > 0 ? '4px' : '0px' }} />
                  <span className={`text-[8px] font-bold uppercase truncate w-full text-center ${isActive ? 'text-indigo-600 font-black' : 'text-gray-400'}`}>
                    {new Date(data.month + "-02").toLocaleString('default', { month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Monthly Breakdown</h3>
          <div className="space-y-6">
            {Object.keys(categoryColors).map(cat => {
              const amt        = categoryTotals[cat] || 0;
              const percentage = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-[11px] mb-2 font-bold">
                    <span className="text-gray-600">{cat}</span>
                    <span className="text-gray-400">${amt.toLocaleString()} <span className="ml-1 text-indigo-600">({percentage}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                    <div className={`${categoryColors[cat]} h-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }} />
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
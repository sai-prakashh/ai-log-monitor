import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { io } from "socket.io-client";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const globalStyle = document.createElement("style");
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #090c10; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #0d1117; }
  ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
  @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes alertIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes countUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .log-row   { animation: fadeSlideIn 0.25s ease both; }
  .alert-row { animation: alertIn 0.3s ease both; }
  .count-anim { animation: countUp 0.3s ease both; }
  .btn { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 14px; border-radius: 3px; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; border: 1px solid #30363d; background: transparent; color: #8b949e; }
  .btn:hover  { background: #161b22; color: #e6edf3; border-color: #484f58; }
  .btn.active { background: #1f6feb22; color: #58a6ff; border-color: #1f6feb; }
  .btn.danger { border-color: #f85149; color: #f85149; }
  .btn.danger:hover { background: #f8514922; }
  .btn.tab { border-radius: 0; border-bottom: 2px solid transparent; border-top: none; border-left: none; border-right: none; padding: 8px 16px; }
  .btn.tab.active { border-bottom-color: #58a6ff; color: #58a6ff; background: transparent; }
  .input-field { font-family: 'IBM Plex Mono', monospace; font-size: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 4px; color: #e6edf3; padding: 9px 12px; width: 100%; outline: none; transition: border-color 0.2s; }
  .input-field:focus { border-color: #1f6feb; }
  .input-field::placeholder { color: #484f58; }
  .tag { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 2px; text-transform: uppercase; }
  .tag-info     { background: #1f6feb22; color: #58a6ff;  border: 1px solid #1f6feb44; }
  .tag-error    { background: #f8514922; color: #f85149;  border: 1px solid #f8514944; }
  .tag-warning  { background: #e3b34122; color: #e3b341;  border: 1px solid #e3b34144; }
  .tag-critical { background: #ff000022; color: #ff6b6b;  border: 1px solid #ff000044; }
  .card { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; overflow: hidden; }
  .section-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #21262d; background: #161b22; }
  .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dot-green    { background: #3fb950; box-shadow: 0 0 6px #3fb95066; }
  .dot-red      { background: #f85149; box-shadow: 0 0 6px #f8514966; animation: pulse 1.5s infinite; }
  .dot-yellow   { background: #e3b341; box-shadow: 0 0 6px #e3b34166; }
  .dot-blue     { background: #58a6ff; box-shadow: 0 0 6px #58a6ff44; }
  .dot-purple   { background: #bc8cff; box-shadow: 0 0 6px #bc8cff44; }
  .dot-inactive { background: #30363d; }
  .pagination-btn { font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 5px 12px; border-radius: 3px; border: 1px solid #30363d; background: transparent; color: #8b949e; cursor: pointer; transition: all 0.15s; }
  .pagination-btn:hover:not(:disabled) { background: #161b22; color: #e6edf3; }
  .pagination-btn:disabled { opacity: 0.3; cursor: default; }
  .stat-card { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.2s; }
  .stat-card:hover { border-color: #30363d; }
  .tab-bar { display: flex; border-bottom: 1px solid #21262d; background: #0d1117; padding: 0 16px; }
  .service-row { display: grid; grid-template-columns: 140px 60px 60px 60px 80px 1fr; padding: 9px 16px; border-bottom: 1px solid #161b22; align-items: center; transition: background 0.1s; }
  .service-row:hover { background: #161b22; }
  .rate-bar-bg { height: 4px; background: #21262d; border-radius: 2px; overflow: hidden; }
  .rate-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
  .severity-critical { background: #ff6b6b22; border-left: 3px solid #ff6b6b; }
  .severity-error    { background: transparent; border-left: 3px solid #f85149; }
  .severity-warning  { background: transparent; border-left: 3px solid #e3b341; }
  .login-btn { width: 100%; font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 11px; border-radius: 4px; cursor: pointer; background: linear-gradient(135deg, #1f6feb, #388bfd); border: none; color: #fff; margin-top: 4px; transition: opacity 0.15s; }
  .login-btn:hover { opacity: 0.85; }
  .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .error-box { background: #f8514922; border: 1px solid #f85149; border-radius: 4px; padding: 10px 14px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #f85149; word-break: break-all; line-height: 1.5; }
  .success-box { background: #3fb95022; border: 1px solid #3fb950; border-radius: 4px; padding: 10px 14px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #3fb950; }
  .spinner { width: 13px; height: 13px; border: 2px solid #ffffff44; border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
`;
document.head.appendChild(globalStyle);

// ── CRITICAL: set REACT_APP_API_URL in Render frontend env vars ──────────────
// Value should be your backend URL e.g. https://ai-log-monitor-backend.onrender.com
// NO trailing slash
const API = (process.env.REACT_APP_API_URL || "https://ai-log-monitor-backend.onrender.com").replace(/\/$/, "");

const SEVERITY_RANK = { CRITICAL: 3, ERROR: 2, WARNING: 1, INFO: 0 };
const severityColor = s => s === "CRITICAL" ? "#ff6b6b" : s === "ERROR" ? "#f85149" : s === "WARNING" ? "#e3b341" : "#8b949e";
const levelTag = level => {
  if (level === "error")   return <span className="tag tag-error">ERR</span>;
  if (level === "warning") return <span className="tag tag-warning">WARN</span>;
  return <span className="tag tag-info">INFO</span>;
};
const Timestamp = ({ date }) => {
  const d = new Date(date);
  return <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58" }}>{d.toLocaleDateString()} {d.toLocaleTimeString()}</span>;
};
const Cursor = () => <span style={{ display: "inline-block", width: 8, height: 13, background: "#58a6ff", marginLeft: 3, verticalAlign: "middle", animation: "blink 1s step-end infinite" }} />;
const StatCard = ({ label, value, dot, accent, sub }) => (
  <div className="stat-card">
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div className={`dot ${dot}`} />
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
    </div>
    <span className="count-anim" key={value} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 28, fontWeight: 600, color: accent, lineHeight: 1 }}>{value}</span>
    {sub && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58" }}>{sub}</span>}
  </div>
);
const ErrorRateBadge = ({ rate }) => {
  const color = rate > 50 ? "#ff6b6b" : rate > 20 ? "#e3b341" : "#3fb950";
  return <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 600, color, background: color + "22", border: `1px solid ${color}44`, borderRadius: 2, padding: "1px 6px" }}>{rate}%</span>;
};

function App() {
  const [token, setToken]             = useState(localStorage.getItem("token"));
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [isRegister, setIsRegister]   = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [activeTab, setActiveTab]     = useState("dashboard");
  const [logs, setLogs]               = useState([]);
  const [filter, setFilter]           = useState("");
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [pages, setPages]             = useState(1);
  const [alerts, setAlerts]           = useState([]);
  const [alertFilter, setAlertFilter] = useState("");
  const [liveCount, setLiveCount]     = useState(0);
  const [health, setHealth]           = useState(null);
  const [services, setServices]       = useState([]);
  const [timeseries, setTimeseries]   = useState([]);
  const [tsWindow, setTsWindow]       = useState(5);
  const [rateLimited, setRateLimited] = useState(false);
  const rateLimitTimer = useRef(null);

  useEffect(() => {
    if (!token) return;
    const socket = io(API, { transports: ["websocket", "polling"] });
    socket.on("new-alert", alertData => {
      setAlerts(prev => {
        const updated = [alertData, ...prev];
        updated.sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0));
        return updated;
      });
      setLiveCount(c => c + 1);
    });
    return () => socket.disconnect();
  }, [token]);

  const apiFetch = useCallback(async (url, opts = {}) => {
    try {
      const headers = { Authorization: token, ...(opts.headers || {}) };
      const res = await fetch(url, { ...opts, headers });
      if (res.status === 429) {
        setRateLimited(true);
        clearTimeout(rateLimitTimer.current);
        rateLimitTimer.current = setTimeout(() => setRateLimited(false), 5000);
        return null;
      }
      return res.json();
    } catch (err) { return null; }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const fetchAll = async () => {
      let url = `${API}/api/logs?page=${page}`;
      if (filter) url += `&level=${filter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const logData = await apiFetch(url);
      if (logData) { setLogs(logData.data || []); setPages(logData.pages || 1); }
      const alertData = await apiFetch(`${API}/api/alerts?limit=100`);
      if (alertData) setAlerts(alertData.data || []);
      const healthData = await apiFetch(`${API}/api/stats`);
      if (healthData) setHealth(healthData);
      const svcData = await apiFetch(`${API}/api/stats/services`);
      if (svcData) setServices(svcData.data || []);
    };
    fetchAll();
    const id = setInterval(fetchAll, 4000);
    return () => clearInterval(id);
  }, [filter, search, page, token, apiFetch]);

  useEffect(() => {
    if (!token) return;
    const fetchTs = async () => {
      const data = await apiFetch(`${API}/api/stats/timeseries?window=${tsWindow}`);
      if (data) setTimeseries(data.data || []);
    };
    fetchTs();
    const id = setInterval(fetchTs, 5000);
    return () => clearInterval(id);
  }, [tsWindow, token, apiFetch]);

  const register = async () => {
    if (!email || !password) { setAuthError("Email and password are required"); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await res.json();
      if (data.message) { setAuthSuccess("Registered! Now sign in."); setIsRegister(false); }
      else setAuthError(data.error || "Registration failed");
    } catch (err) {
      setAuthError("Cannot reach backend. URL: " + API + " | Error: " + err.message);
    }
    setAuthLoading(false);
  };

  const login = async () => {
    if (!email || !password) { setAuthError("Email and password are required"); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
      } else {
        setAuthError(data.error || "Login failed — wrong email or password");
      }
    } catch (err) {
      setAuthError("Cannot reach backend.\nURL being used: " + API + "\nError: " + err.message + "\n\nCheck that REACT_APP_API_URL is set correctly in Render frontend env vars.");
    }
    setAuthLoading(false);
  };

  const logout = () => { localStorage.removeItem("token"); setToken(null); };
  const criticalAlerts = alerts.filter(a => a.severity === "CRITICAL").length;
  const errorCount = logs.filter(l => l.level === "error").length;
  const infoCount  = logs.filter(l => l.level === "info").length;
  const chartData  = [{ name: "Error", value: errorCount }, { name: "Info", value: infoCount }];

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#090c10", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#21262d 1px, transparent 1px), linear-gradient(90deg, #21262d 1px, transparent 1px)", backgroundSize: "40px 40px", opacity: 0.3 }} />
        <div style={{ position: "absolute", width: 400, height: 400, background: "radial-gradient(circle, #1f6feb18 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
        <div style={{ position: "relative", width: 410, background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, padding: "36px 32px", boxShadow: "0 24px 64px #00000088", animation: "fadeSlideIn 0.4s ease" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #1f6feb, #58a6ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#58a6ff", fontWeight: 600 }}>AI LOG MONITOR</span>
            </div>
            <p style={{ fontSize: 11, color: "#484f58", fontFamily: "'IBM Plex Mono',monospace" }}>{isRegister ? "// create account" : "authenticate to continue"}</p>
          </div>

          
          <div style={{ background: "#0a0f16", border: "1px solid #21262d", borderRadius: 4, padding: "8px 10px", marginBottom: 16 }}>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#484f58", marginBottom: 2 }}>backend url:</p>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#58a6ff44", wordBreak: "break-all" }}>{API}</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, color: "#8b949e", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Email</label>
              <input className="input-field" placeholder="user@domain.com" value={email}
                onChange={e => { setEmail(e.target.value); setAuthError(""); setAuthSuccess(""); }}
                onKeyDown={e => e.key === "Enter" && (isRegister ? register() : login())}
                autoComplete="email" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, color: "#8b949e", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Password</label>
              <input className="input-field" type="password" placeholder="••••••••" value={password}
                onChange={e => { setPassword(e.target.value); setAuthError(""); setAuthSuccess(""); }}
                onKeyDown={e => e.key === "Enter" && (isRegister ? register() : login())}
                autoComplete="current-password" />
            </div>

            {authError   && <div className="error-box" style={{ whiteSpace: "pre-line" }}>{authError}</div>}
            {authSuccess && <div className="success-box">{authSuccess}</div>}

            <button className="login-btn" onClick={() => isRegister ? register() : login()} disabled={authLoading}>
              {authLoading && <span className="spinner" />}
              {authLoading ? "Please wait..." : (isRegister ? "Create Account" : "Sign In →")}
            </button>

            <p onClick={() => { setIsRegister(!isRegister); setAuthError(""); setAuthSuccess(""); }}
              style={{ textAlign: "center", fontSize: 11, color: "#484f58", fontFamily: "'IBM Plex Mono',monospace", cursor: "pointer" }}
              onMouseOver={e => e.target.style.color = "#58a6ff"} onMouseOut={e => e.target.style.color = "#484f58"}>
              {isRegister ? "← already have an account? login" : "new user? register →"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#090c10", fontFamily: "'IBM Plex Sans', sans-serif", color: "#e6edf3" }}>
      {rateLimited && (
        <div style={{ position: "fixed", top: 60, right: 20, zIndex: 999, background: "#e3b34122", border: "1px solid #e3b341", borderRadius: 6, padding: "10px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#e3b341", animation: "fadeSlideIn 0.3s ease" }}>
          ⚠ Rate limit reached — requests throttled
        </div>
      )}
      <nav style={{ background: "#0d1117", borderBottom: "1px solid #21262d", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 5, background: "linear-gradient(135deg,#1f6feb,#58a6ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>⬡</div>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 600, color: "#e6edf3", letterSpacing: "0.06em" }}>AI LOG MONITOR</span>
          <span style={{ width: 1, height: 16, background: "#21262d" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div className="dot dot-green" /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#3fb950" }}>LIVE</span></div>
          {health && (<><span style={{ width: 1, height: 16, background: "#21262d" }} /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58" }}>{health.activeServices} services active</span></>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {liveCount > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#58a6ff12", border: "1px solid #58a6ff44", borderRadius: 4, padding: "4px 10px" }}><div className="dot dot-blue" /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#58a6ff", fontWeight: 600 }}>{liveCount} live alerts</span></div>}
          {criticalAlerts > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8514912", border: "1px solid #f8514944", borderRadius: 4, padding: "4px 10px" }}><div className="dot dot-red" /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#f85149", fontWeight: 600 }}>{criticalAlerts} CRITICAL</span></div>}
          <button className="btn danger" onClick={logout}>Sign Out</button>
        </div>
      </nav>
      <div className="tab-bar">
        {[{ id: "dashboard", label: "🏠 Dashboard" }, { id: "logs", label: "📋 Logs" }, { id: "alerts", label: `🚨 Alerts${alerts.length ? ` (${alerts.length})` : ""}` }, { id: "services", label: "🔧 Services" }, { id: "timeseries", label: "📈 Trends" }].map(t => (
          <button key={t.id} className={`btn tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{t.label}</button>
        ))}
      </div>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <StatCard label="Total Logs"      value={health?.totalLogs ?? "—"}     dot="dot-blue"   accent="#58a6ff" sub={`${health?.recentLogs ?? 0} in last 5 min`} />
              <StatCard label="Error Rate"      value={`${health?.errorRate ?? 0}%`} dot={health?.errorRate > 20 ? "dot-red" : "dot-green"} accent={health?.errorRate > 20 ? "#f85149" : "#3fb950"} sub={`${health?.totalErrors ?? 0} total errors`} />
              <StatCard label="Alerts / Min"    value={health?.alertsPerMin ?? 0}    dot="dot-yellow" accent="#e3b341" sub="last 60 seconds" />
              <StatCard label="Active Services" value={health?.activeServices ?? 0}  dot="dot-purple" accent="#bc8cff" sub={health?.activeServiceNames?.join(", ") ?? ""} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <StatCard label="Critical Alerts" value={health?.criticalAlerts ?? 0} dot={health?.criticalAlerts > 0 ? "dot-red" : "dot-inactive"} accent={health?.criticalAlerts > 0 ? "#ff6b6b" : "#484f58"} />
              <StatCard label="Total Alerts"    value={health?.totalAlerts ?? 0}    dot="dot-yellow" accent="#e3b341" />
              <StatCard label="Total Errors"    value={health?.totalErrors ?? 0}    dot="dot-red"    accent="#f85149" />
              <StatCard label="Throughput"      value={health?.recentLogs ?? 0}     dot="dot-green"  accent="#3fb950" sub="logs / 5 min" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card">
                <div className="section-header"><div className="dot dot-blue" /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Log Distribution</span></div>
                <div style={{ padding: "12px 0", display: "flex", justifyContent: "center" }}>
                  <PieChart width={300} height={200}><Pie data={chartData} dataKey="value" outerRadius={72} innerRadius={36} paddingAngle={3}><Cell fill="#f85149" /><Cell fill="#1f6feb" /></Pie><Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }} itemStyle={{ color: "#e6edf3" }} /><Legend formatter={v => <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#8b949e" }}>{v}</span>} /></PieChart>
                </div>
              </div>
              <div className="card">
                <div className="section-header"><div className={criticalAlerts > 0 ? "dot dot-red" : "dot dot-inactive"} /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Top Critical Alerts</span><span style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, background: "#f8514922", color: "#f85149", border: "1px solid #f8514444", borderRadius: 2, padding: "1px 6px" }}>{criticalAlerts}</span></div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {alerts.filter(a => a.severity === "CRITICAL").slice(0, 5).length === 0 ? (
                    <div style={{ padding: "32px 16px", textAlign: "center" }}><p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#3fb950" }}>✓ no critical alerts</p></div>
                  ) : alerts.filter(a => a.severity === "CRITICAL").slice(0, 5).map((a, i) => (
                    <div key={i} className="alert-row severity-critical" style={{ padding: "10px 14px", borderBottom: "1px solid #161b22" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: "#ff6b6b" }}>CRITICAL</span><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#484f58" }}>{a.service}</span></div>
                      <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#8b949e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.message}</p>
                      {a.reason && <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#484f58", marginTop: 2 }}>↳ {a.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "logs" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#484f58" }}>$</span><input className="input-field" placeholder="search logs..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 24 }} /></div>
              {["", "error", "info", "warning"].map(f => <button key={f} className={`btn ${filter === f ? "active" : ""}`} onClick={() => { setFilter(f); setPage(1); }}>{f === "" ? "ALL" : f.toUpperCase()}</button>)}
            </div>
            <div className="card">
              <div className="section-header"><div className="dot dot-blue" /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Event Stream</span><span style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58" }}>page {page}/{pages}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "60px 140px 1fr 150px", padding: "7px 16px", borderBottom: "1px solid #21262d", background: "#0d1117" }}>
                {["level","service","message","time"].map(h => <span key={h} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>)}
              </div>
              <div style={{ maxHeight: 520, overflowY: "auto" }}>
                {logs.length === 0 ? <div style={{ padding: "40px 16px", textAlign: "center" }}><p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#484f58" }}>waiting for logs<Cursor /></p></div>
                : logs.map((log, i) => (
                  <div key={log._id} className="log-row" style={{ display: "grid", gridTemplateColumns: "60px 140px 1fr 150px", padding: "9px 16px", borderBottom: "1px solid #161b22", animationDelay: `${Math.min(i,10)*0.03}s`, transition: "background 0.1s" }} onMouseOver={e => e.currentTarget.style.background="#161b22"} onMouseOut={e => e.currentTarget.style.background="transparent"}>
                    <div>{levelTag(log.level)}</div>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.service}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#e6edf3", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{log.message}</span>
                    <Timestamp date={log.timestamp} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "10px 16px", borderTop: "1px solid #21262d", background: "#161b22" }}>
                <button className="pagination-btn" disabled={page<=1} onClick={() => setPage(p=>p-1)}>← prev</button>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58" }}>{page} / {pages}</span>
                <button className="pagination-btn" disabled={page>=pages} onClick={() => setPage(p=>p+1)}>next →</button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "alerts" && (
          <div className="card">
            <div className="section-header"><div className={alerts.length>0?"dot dot-red":"dot dot-inactive"} /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Alert Feed — sorted by severity</span><span style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, background: "#f8514922", color: "#f85149", border: "1px solid #f8514444", borderRadius: 2, padding: "1px 6px" }}>{alerts.length}</span></div>
            <div style={{ display: "flex", gap: 6, padding: "10px 12px", borderBottom: "1px solid #21262d" }}>
              {["","CRITICAL","ERROR","WARNING"].map(f => <button key={f} className={`btn ${alertFilter===f?"active":""}`} onClick={() => setAlertFilter(f)} style={{ fontSize: 10, padding: "4px 10px" }}>{f===""?"ALL":f}</button>)}
            </div>
            <div style={{ maxHeight: 600, overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr 180px 160px", padding: "7px 16px", borderBottom: "1px solid #21262d", background: "#0d1117" }}>
                {["severity","service","message","reason","time"].map(h => <span key={h} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>)}
              </div>
              {alerts.filter(a => !alertFilter||a.severity===alertFilter).length===0 ? <div style={{ padding: "40px", textAlign: "center" }}><p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#484f58" }}>no alerts detected</p></div>
              : alerts.filter(a => !alertFilter||a.severity===alertFilter).map((a,i) => (
                <div key={i} className={`alert-row severity-${(a.severity||"").toLowerCase()}`} style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr 180px 160px", padding: "10px 16px", borderBottom: "1px solid #161b22", animationDelay: `${Math.min(i,8)*0.04}s` }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: severityColor(a.severity) }}>{a.severity}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#8b949e", alignSelf: "center" }}>{a.service}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#e6edf3", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{a.message}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.reason||"—"}</span>
                  <Timestamp date={a.createdAt} />
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "services" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {services.slice(0,4).map(s => (
                <div key={s.service} className="stat-card" style={{ borderLeft: `3px solid ${s.errors>0?"#f85149":"#3fb950"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div className={`dot ${s.errors>0?"dot-red":"dot-green"}`} /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#e6edf3", fontWeight: 600 }}>{s.service}</span></div>
                  <div style={{ display: "flex", gap: 12 }}><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e" }}>logs: <span style={{ color: "#58a6ff" }}>{s.total}</span></span><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e" }}>err: <span style={{ color: "#f85149" }}>{s.errors}</span></span></div>
                  <ErrorRateBadge rate={parseFloat(s.errorRate)} />
                </div>
              ))}
            </div>
            <div className="card">
              <div className="section-header"><div className="dot dot-purple" /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Service Breakdown</span></div>
              <div className="service-row" style={{ background: "#161b22", borderBottom: "1px solid #21262d" }}>{["Service","Total","Errors","Alerts","Error Rate","Error Bar"].map(h => <span key={h} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>)}</div>
              {services.length===0 ? <div style={{ padding: "32px", textAlign: "center" }}><p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#484f58" }}>no service data yet</p></div>
              : services.map(s => { const rate=parseFloat(s.errorRate); const barColor=rate>50?"#ff6b6b":rate>20?"#e3b341":"#3fb950"; return (
                <div key={s.service} className="service-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div className={`dot ${s.errors>0?"dot-red":"dot-green"}`} /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#e6edf3" }}>{s.service}</span></div>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#58a6ff" }}>{s.total}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: s.errors>0?"#f85149":"#3fb950" }}>{s.errors}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: s.alerts>0?"#e3b341":"#484f58" }}>{s.alerts}</span>
                  <ErrorRateBadge rate={rate} />
                  <div style={{ paddingRight: 16 }}><div className="rate-bar-bg"><div className="rate-bar-fill" style={{ width: `${Math.min(rate,100)}%`, background: barColor }} /></div></div>
                </div>
              );})}
            </div>
            <div className="card">
              <div className="section-header"><div className="dot dot-red" /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Errors per Service</span></div>
              <div style={{ padding: "16px" }}>
                <ResponsiveContainer width="100%" height={220}><BarChart data={services} margin={{ top:4,right:10,bottom:4,left:0 }}><CartesianGrid strokeDasharray="3 3" stroke="#21262d" /><XAxis dataKey="service" tick={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fill:"#484f58" }} /><YAxis tick={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fill:"#484f58" }} /><Tooltip contentStyle={{ background:"#161b22",border:"1px solid #30363d",borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:11 }} itemStyle={{ color:"#e6edf3" }} /><Bar dataKey="errors" fill="#f85149" radius={[2,2,0,0]} /><Bar dataKey="alerts" fill="#e3b341" radius={[2,2,0,0]} /></BarChart></ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        {activeTab === "timeseries" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#484f58" }}>window:</span>
              {[1,5,60].map(w => <button key={w} className={`btn ${tsWindow===w?"active":""}`} onClick={() => setTsWindow(w)}>{w===1?"1 min":w===5?"5 min":"1 hour"}</button>)}
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#484f58", marginLeft: 8 }}>{timeseries.length} buckets · auto-refresh 5s</span>
            </div>
            <div className="card">
              <div className="section-header"><div className="dot dot-red" /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Errors &amp; Alerts Over Time</span></div>
              <div style={{ padding: "16px" }}>
                {timeseries.length===0 ? <div style={{ height:240,display:"flex",alignItems:"center",justifyContent:"center" }}><p style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"#484f58" }}>collecting data<Cursor /></p></div>
                : <ResponsiveContainer width="100%" height={240}><AreaChart data={timeseries} margin={{ top:4,right:10,bottom:4,left:0 }}><defs><linearGradient id="gError" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f85149" stopOpacity={0.3} /><stop offset="95%" stopColor="#f85149" stopOpacity={0} /></linearGradient><linearGradient id="gAlert" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e3b341" stopOpacity={0.3} /><stop offset="95%" stopColor="#e3b341" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#21262d" /><XAxis dataKey="label" tick={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fill:"#484f58" }} interval="preserveStartEnd" /><YAxis tick={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fill:"#484f58" }} /><Tooltip contentStyle={{ background:"#161b22",border:"1px solid #30363d",borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:11 }} itemStyle={{ color:"#e6edf3" }} /><Legend formatter={v => <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#8b949e" }}>{v}</span>} /><Area type="monotone" dataKey="error" stroke="#f85149" fill="url(#gError)" strokeWidth={2} dot={false} /><Area type="monotone" dataKey="alerts" stroke="#e3b341" fill="url(#gAlert)" strokeWidth={2} dot={false} /></AreaChart></ResponsiveContainer>}
              </div>
            </div>
            <div className="card">
              <div className="section-header"><div className="dot dot-blue" /><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8b949e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Log Volume Over Time</span></div>
              <div style={{ padding: "16px" }}>
                {timeseries.length===0 ? <div style={{ height:200,display:"flex",alignItems:"center",justifyContent:"center" }}><p style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"#484f58" }}>collecting data<Cursor /></p></div>
                : <ResponsiveContainer width="100%" height={200}><AreaChart data={timeseries.map(b=>({...b,total:(b.info||0)+(b.error||0)+(b.warning||0)}))} margin={{ top:4,right:10,bottom:4,left:0 }}><defs><linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#58a6ff" stopOpacity={0} /></linearGradient><linearGradient id="gInfo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3fb950" stopOpacity={0.2} /><stop offset="95%" stopColor="#3fb950" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#21262d" /><XAxis dataKey="label" tick={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fill:"#484f58" }} interval="preserveStartEnd" /><YAxis tick={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fill:"#484f58" }} /><Tooltip contentStyle={{ background:"#161b22",border:"1px solid #30363d",borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:11 }} itemStyle={{ color:"#e6edf3" }} /><Legend formatter={v => <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#8b949e" }}>{v}</span>} /><Area type="monotone" dataKey="total" stroke="#58a6ff" fill="url(#gTotal)" strokeWidth={2} dot={false} /><Area type="monotone" dataKey="info" stroke="#3fb950" fill="url(#gInfo)" strokeWidth={1} dot={false} /></AreaChart></ResponsiveContainer>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
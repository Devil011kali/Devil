import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  Link
} from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import * as LightweightCharts from 'lightweight-charts';
import { 
  Wallet, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ArrowRight, 
  Plus, 
  ArrowUpRight, 
  LogOut,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  ChevronRight,
  Zap,
  Activity,
  ArrowDownLeft,
  Bell,
  Search,
  Settings as SettingsIcon,
  RefreshCw,
  Sliders,
  Target,
  ShieldAlert,
  Copy,
  CheckCircle,
  XCircle,
  ExternalLink,
  Building,
  Smartphone
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Auth Context ---
interface Investment {
  id: string;
  amount: number;
  direction: 'up' | 'down';
  entryPrice: number;
  currentValue: number;
  active: boolean;
  isWinning?: boolean;
  timestamp: string;
  finalValue?: number;
  payout?: number;
  status?: 'won' | 'lost';
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  role: 'admin' | 'user';
  investments?: Investment[];
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  login: (token: string, user: UserData) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isAuthReady, setIsAuthReady] = useState(false);

  const login = (newToken: string, userData: UserData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    setIsAuthReady(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthReady(true);
  };

  const refreshUser = async () => {
    if (!token) {
      setIsAuthReady(true);
      return;
    }
    try {
      const res = await fetch('/api/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuthReady(true);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

const Input = ({ icon: Icon, label, ...props }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-violet-400 transition-colors">
        <Icon size={18} />
      </div>
      <input 
        {...props}
        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
      />
    </div>
  </div>
);

const Button = ({ children, className, variant = 'primary', ...props }: any) => (
  <button 
    {...props}
    className={cn(
      "w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
      variant === 'primary' ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700" : "bg-white/5 text-white hover:bg-white/10 border border-white/10",
      className
    )}
  >
    {children}
  </button>
);

const NeonCard = ({ children, className, ...props }: any) => (
  <div 
    className={cn(
      "bg-[#151619] border border-white/5 rounded-[32px] p-6 relative overflow-hidden group",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const TradingChart = () => {
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<any>(null);
  const seriesRef = React.useRef<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#3b82f6', // Blue for Up
      downColor: '#ef4444', // Red for Down
      borderVisible: false,
      wickUpColor: '#3b82f6',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const fetchData = async () => {
      try {
        const [historyRes, liveRes] = await Promise.all([
          fetch('/api/chart'),
          fetch('/api/chart/live')
        ]);
        const history = await historyRes.json();
        const live = await liveRes.json();
        
        if (!chartRef.current || !seriesRef.current) return;

        if (history.length > 0) {
          // Ensure history is unique and sorted
          const uniqueHistory = history.filter((v: any, i: number, a: any[]) => 
            a.findIndex(t => t.time === v.time) === i
          ).sort((a: any, b: any) => a.time - b.time);
          
          seriesRef.current.setData(uniqueHistory);
        }
        if (live && seriesRef.current) {
          seriesRef.current.update(live);
        }

        // Calculate time left for current 30s candle
        const now = Date.now();
        const nextFix = Math.ceil(now / 30000) * 30000;
        setTimeLeft(Math.ceil((nextFix - now) / 1000));
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Market Live</span>
        </div>
        <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full">
          <RefreshCw className="text-violet-400 animate-spin" size={12} />
          <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Next Candle: {timeLeft}s</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
};

// --- Pages ---

const Register = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        navigate('/login');
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setError(data.message);
        } catch (e) {
          setError(`Server error: ${res.status}`);
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-violet-500/10 text-violet-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <Zap size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Join the Future</h1>
          <p className="text-gray-500">Create your professional virtual account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input 
            icon={User} 
            label="Full Name" 
            placeholder="Enter your name" 
            required 
            value={formData.name}
            onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input 
            icon={Phone} 
            label="Phone Number" 
            placeholder="Enter phone number" 
            required 
            value={formData.phone}
            onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input 
            icon={Mail} 
            label="Email Address" 
            type="email" 
            placeholder="name@example.com" 
            required 
            value={formData.email}
            onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input 
            icon={Lock} 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            required 
            value={formData.password}
            onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
          />

          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already a member? <Link to="/login" className="text-violet-400 font-bold hover:text-violet-300 transition-colors">Login</Link>
        </p>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [activeInvestments, setActiveInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeposits = async () => {
    try {
      const res = await fetch('/api/admin/deposits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeposits(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch('/api/admin/withdrawals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveInvestments = async () => {
    try {
      const res = await fetch('/api/admin/investments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveInvestments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateSettings = async (newSettings: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          alert(data.message);
        } catch (e) {
          alert(`Server Error: ${res.status}`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDepositAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/deposits/action', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, action })
      });
      if (res.ok) {
        fetchDeposits();
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          alert(data.message);
        } catch (e) {
          alert(`Server Error: ${res.status}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWithdrawalAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/withdrawals/action', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, action })
      });
      if (res.ok) {
        fetchWithdrawals();
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          alert(data.message);
        } catch (e) {
          alert(`Server Error: ${res.status}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSettings();
      fetchDeposits();
      fetchWithdrawals();
      fetchActiveInvestments();
      const interval = setInterval(() => {
        fetchActiveInvestments();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-black text-white">Access Denied</h1>
        <p className="text-gray-500 max-w-xs">You do not have the necessary permissions to access the Admin Control Center.</p>
        <Link to="/dashboard">
          <Button className="px-8">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!settings) return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <ArrowDownLeft className="rotate-45" size={20} />
          </Link>
          <h1 className="text-2xl font-black">Admin Control Center</h1>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <NeonCard className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className={cn("text-violet-400", settings.mode === 'auto' && "animate-spin")} size={20} />
                <h3 className="font-bold">Chart Mode</h3>
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button 
                  onClick={() => updateSettings({ mode: 'auto' })}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.mode === 'auto' ? "bg-violet-600 text-white" : "text-gray-500 hover:text-white"
                  )}
                >
                  Auto
                </button>
                <button 
                  onClick={() => updateSettings({ mode: 'manual' })}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.mode === 'manual' ? "bg-violet-600 text-white" : "text-gray-500 hover:text-white"
                  )}
                >
                  Manual
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Volatility (Auto Mode)</label>
                <input 
                  type="range" 
                  min="0.001" 
                  max="0.1" 
                  step="0.001"
                  value={settings.volatility}
                  onChange={(e) => updateSettings({ volatility: parseFloat(e.target.value) })}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                  <span>Low</span>
                  <span>{Math.round(settings.volatility * 1000) / 10}%</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          </NeonCard>

          <NeonCard className="p-6 border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Sliders className="text-red-400" size={20} />
              <h3 className="font-bold">Emergency Controls</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => updateSettings({ mode: 'manual', manualTarget: settings.lastPrice * 0.5 })}
                className="py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                Force Dump
              </button>
              <button 
                onClick={() => updateSettings({ mode: 'manual', manualTarget: settings.lastPrice * 2 })}
                className="py-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-500/20 transition-all"
              >
                Force Pump
              </button>
            </div>
          </NeonCard>

          <NeonCard className="space-y-6">
            <div className="flex items-center gap-3">
              <Activity className="text-violet-400" size={20} />
              <h3 className="font-bold">Active User Investments</h3>
            </div>
            <div className="space-y-4">
              {activeInvestments.length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-xs font-bold uppercase tracking-widest">No active investments</p>
              ) : (
                <div className="space-y-3">
                  {activeInvestments.map((inv) => (
                    <div key={inv.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-white">{inv.userName}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          Amount: BDT{inv.amount} • Entry: {inv.entryPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                        inv.direction === 'up' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {inv.direction}
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Active Volume</p>
                    <p className="text-xl font-black text-violet-400">
                      BDT{activeInvestments.reduce((acc, curr) => acc + curr.amount, 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </NeonCard>

          <NeonCard className="space-y-6">
            <div className="flex items-center gap-3">
              <CreditCard className="text-violet-400" size={20} />
              <h3 className="font-bold">Pending Deposits</h3>
            </div>
            
            <div className="space-y-4">
              {deposits.filter(d => d.status === 'pending').length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-xs font-bold uppercase tracking-widest">No pending requests</p>
              ) : (
                deposits.filter(d => d.status === 'pending').map((dep) => (
                  <div key={dep.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-white">{dep.userName}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          Amount: BDT{dep.amount} • {new Date(dep.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDepositAction(dep.id, 'approve')}
                          className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-all"
                          title="Approve"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleDepositAction(dep.id, 'reject')}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"
                          title="Reject"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Transaction ID</p>
                      <p className="text-xs font-mono text-violet-400 break-all">{dep.transactionId}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </NeonCard>

          <NeonCard className="space-y-6">
            <div className="flex items-center gap-3">
              <Wallet className="text-violet-400" size={20} />
              <h3 className="font-bold">Pending Withdrawals</h3>
            </div>
            
            <div className="space-y-4">
              {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-xs font-bold uppercase tracking-widest">No pending requests</p>
              ) : (
                withdrawals.filter(w => w.status === 'pending').map((wit) => (
                  <div key={wit.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-white">{wit.userName}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          Amount: BDT{wit.amount} • {new Date(wit.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleWithdrawalAction(wit.id, 'approve')}
                          className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-all"
                          title="Approve"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleWithdrawalAction(wit.id, 'reject')}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"
                          title="Reject"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Method: {wit.method.toUpperCase()}</p>
                      {wit.method === 'bank' ? (
                        <div className="text-[10px] font-mono text-violet-400 space-y-1">
                          <p>Bank: {wit.bankDetails.bankName}</p>
                          <p>Acc: {wit.bankDetails.accountNumber}</p>
                          <p>Branch: {wit.bankDetails.branchName}</p>
                        </div>
                      ) : (
                        <p className="text-xs font-mono text-pink-400">{wit.bikashNumber}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </NeonCard>
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const data = await res.json();
        login(data.token, data.user);
        navigate('/dashboard');
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setError(data.message);
        } catch (e) {
          setError(`Server error: ${res.status}`);
        }
      }
    } catch (err) {
      setError('Invalid credentials or server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-violet-500/10 text-violet-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Welcome Back</h1>
          <p className="text-gray-500">Login to your virtual dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input 
            icon={Mail} 
            label="Email or Phone" 
            placeholder="Enter email or phone" 
            required 
            value={formData.identifier}
            onChange={(e: any) => setFormData({ ...formData, identifier: e.target.value })}
          />
          <Input 
            icon={Lock} 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            required 
            value={formData.password}
            onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
          />

          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          New here? <Link to="/register" className="text-violet-400 font-bold hover:text-violet-300 transition-colors">Register</Link>
        </p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout, token, refreshUser } = useAuth();
  const [showModal, setShowModal] = useState<'add' | 'withdraw' | 'invest' | null>(null);
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [withdrawalMethod, setWithdrawalMethod] = useState<'bank' | 'bikash'>('bikash');
  const [bankDetails, setBankDetails] = useState({ bankName: '', accountNumber: '', branchName: '' });
  const [bikashNumber, setBikashNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');

  useEffect(() => {
    const interval = setInterval(() => {
      if (token) refreshUser();
    }, 2000);
    return () => clearInterval(interval);
  }, [token]);

  if (!user) return null;

  const handleAction = async (actionType?: 'add' | 'withdraw' | 'invest', investAmount?: string, investDirection?: 'up' | 'down') => {
    const type = actionType || showModal;
    const finalAmount = investAmount || amount;
    const finalDirection = investDirection || direction;

    const val = parseInt(finalAmount);
    if (isNaN(val) || val <= 0) return;
    
    if (type === 'invest' && val < 500) {
      alert('Minimum investment amount is 500');
      return;
    }

    if (type === 'invest' && !finalDirection) {
      alert('Please select a direction (Up or Down)');
      return;
    }

    if (type === 'add' && !transactionId) {
      alert('Please enter your Transaction ID');
      return;
    }

    if (type === 'withdraw') {
      if (withdrawalMethod === 'bank' && (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.branchName)) {
        alert('Please fill all bank details');
        return;
      }
      if (withdrawalMethod === 'bikash' && !bikashNumber) {
        alert('Please enter bKash number');
        return;
      }
      if (val > user.balance) {
        alert('Insufficient balance');
        return;
      }
    }

    setLoading(true);
    try {
      let endpoint = '';
      let body = {};

      if (type === 'invest') {
        endpoint = '/api/invest';
        body = { amount: val, direction: finalDirection };
      } else if (type === 'add') {
        endpoint = '/api/deposit/request';
        body = { amount: val, transactionId };
      } else if (type === 'withdraw') {
        endpoint = '/api/withdrawal/request';
        body = { 
          amount: val, 
          method: withdrawalMethod,
          bankDetails: withdrawalMethod === 'bank' ? bankDetails : null,
          bikashNumber: withdrawalMethod === 'bikash' ? bikashNumber : null
        };
      } else {
        endpoint = '/api/update-balance';
        body = { amount: val, type };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        await refreshUser();
        setShowModal(null);
        setAmount('');
        setTransactionId('');
        setDirection(null);
        setBikashNumber('');
        setBankDetails({ bankName: '', accountNumber: '', branchName: '' });
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          alert(data.message);
        } catch (e) {
          alert(`Server Error: ${res.status}`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const closeInvestment = async (investmentId: string) => {
    try {
      const res = await fetch('/api/close-investment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ investmentId })
      });
      if (res.ok) {
        await refreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeInvestments = user.investments?.filter(i => i.active) || [];
  const closedInvestments = user.investments?.filter(i => !i.active) || [];
  
  const totalInvested = activeInvestments.reduce((acc, curr) => acc + curr.amount, 0);
  const currentInvestedValue = activeInvestments.reduce((acc, curr) => acc + (curr.isWinning ? curr.amount * 1.8 : 0), 0);
  
  // Lifetime Profit = (Sum of payouts from won trades) - (Sum of amounts from lost trades)
  const lifetimeProfit = closedInvestments.reduce((acc, curr) => {
    if (curr.status === 'won') {
      return acc + (curr.payout || 0) - curr.amount;
    } else {
      return acc - curr.amount;
    }
  }, 0);

  const sortedInvestments = [...(user.investments || [])].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (sortBy === 'amount') {
      return b.amount - a.amount;
    }
    if (sortBy === 'status') {
      // Active first, then Won, then Lost
      const statusOrder = { active: 0, won: 1, lost: 2 };
      const statusA = a.active ? 'active' : a.status || 'lost';
      const statusB = b.active ? 'active' : b.status || 'lost';
      return statusOrder[statusA as keyof typeof statusOrder] - statusOrder[statusB as keyof typeof statusOrder];
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Header */}
      <header className="bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">NEON<span className="text-violet-500">FIN</span></h2>
              <p className="text-[8px] text-gray-500 uppercase font-black tracking-[0.2em]">Virtual Pro</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <Link to="/admin" className="p-2 text-violet-400 hover:text-violet-300 transition-colors">
                <SettingsIcon size={20} />
              </Link>
            )}
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
            </button>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8 pb-24">
        {/* Profile & Wallet Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest">Welcome Back</h3>
                <h1 className="text-4xl font-black tracking-tighter">{user.name}</h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Status</span>
              </div>
            </div>

            <NeonCard className="bg-gradient-to-br from-[#151619] to-[#0A0A0B] border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.05)]">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Wallet size={160} />
              </div>
              <div className="relative z-10 space-y-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em]">Total Portfolio Balance</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black tracking-tighter">
                      BDT{user.balance.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-gray-500">VIRTUAL</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => setShowModal('add')}
                    className="flex-1 min-w-[140px] bg-white/5 text-white border border-white/10 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <Plus size={20} /> DEPOSIT
                  </button>
                  <button 
                    onClick={() => setShowModal('withdraw')}
                    className="flex-1 min-w-[140px] bg-white/5 text-white border border-white/10 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <ArrowUpRight size={20} /> WITHDRAW
                  </button>
                </div>
              </div>
            </NeonCard>

            {/* Trading Chart Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Market Performance</h3>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    lifetimeProfit >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {lifetimeProfit >= 0 ? '+' : ''}BDT{lifetimeProfit.toFixed(2)} Profit
                  </span>
                </div>
              </div>
              <NeonCard className="p-4 space-y-4">
                <TradingChart />
                
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Quick Prediction</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400">Amount:</span>
                      <select 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-black text-white focus:outline-none"
                      >
                        <option value="500">BDT500</option>
                        <option value="1000">BDT1,000</option>
                        <option value="5000">BDT5,000</option>
                        <option value="10000">BDT10,000</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      disabled={loading}
                      onClick={() => {
                        const investAmt = amount || '100';
                        handleAction('invest', investAmt, 'up');
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.2)] active:scale-95 transition-all disabled:opacity-50"
                    >
                      <ArrowUpRight size={20} /> UP
                    </button>
                    <button 
                      disabled={loading}
                      onClick={() => {
                        const investAmt = amount || '100';
                        handleAction('invest', investAmt, 'down');
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95 transition-all disabled:opacity-50"
                    >
                      <ArrowDownLeft size={20} /> DOWN
                    </button>
                  </div>
                </div>
              </NeonCard>
            </div>

            {/* Active Investments */}
            {activeInvestments.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Active Predictions</h3>
                <div className="grid grid-cols-1 gap-3">
                  {activeInvestments.map((inv) => (
                    <NeonCard key={inv.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border",
                          inv.direction === 'up' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {inv.direction === 'up' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-black">BDT{inv.amount} Prediction</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            Entry: BDT{inv.entryPrice} • {inv.direction.toUpperCase()} • UID: {user.id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-black",
                          inv.isWinning ? "text-green-400" : "text-red-400"
                        )}>
                          {inv.isWinning 
                            ? `+BDT${(inv.amount * 0.8).toFixed(2)} (Profit)` 
                            : `-BDT${inv.amount} (Loss)`}
                        </p>
                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">
                          {inv.isWinning ? 'Currently Winning' : 'Currently Losing'}
                        </p>
                      </div>
                    </NeonCard>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Quick Stats</h3>
            <div className="grid grid-cols-1 gap-4">
              <NeonCard className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center border border-green-500/20">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Profit</p>
                  <p className={cn(
                    "text-xl font-black",
                    lifetimeProfit >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {lifetimeProfit >= 0 ? '+' : ''}BDT{lifetimeProfit.toFixed(2)}
                  </p>
                </div>
              </NeonCard>
              <NeonCard className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Predictions</p>
                  <p className="text-xl font-black text-blue-400">{activeInvestments.length} Active</p>
                </div>
              </NeonCard>
              <NeonCard className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-500/10 text-violet-500 rounded-2xl flex items-center justify-center border border-violet-500/20">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Security Level</p>
                  <p className="text-xl font-black text-violet-400">Tier 3</p>
                </div>
              </NeonCard>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Transaction History</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sort By:</span>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                {(['date', 'amount', 'status'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      sortBy === option 
                        ? "bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
                        : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {sortedInvestments.map((inv) => (
              <NeonCard key={inv.id} className="p-4 flex items-center justify-between hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border",
                    inv.active 
                      ? "bg-violet-500/10 text-violet-500 border-violet-500/20" 
                      : inv.status === 'won' 
                        ? "bg-green-500/10 text-green-500 border-green-500/20" 
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                  )}>
                    {inv.active ? <Activity size={20} /> : inv.status === 'won' ? <TrendingUp size={20} /> : <ArrowDownLeft size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">
                      {inv.direction.toUpperCase()} Prediction {inv.active ? '(ACTIVE)' : `- ${inv.status === 'won' ? 'WIN' : 'LOSS'}`}
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      {new Date(inv.timestamp).toLocaleString()} • Entry: BDT{inv.entryPrice} • UID: {user.id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-black",
                    inv.active ? "text-violet-400" : inv.status === 'won' ? "text-green-400" : "text-red-400"
                  )}>
                    {inv.active ? `BDT${inv.amount}` : inv.status === 'won' ? `+BDT${inv.payout?.toFixed(2)}` : `-BDT${inv.amount}`}
                  </p>
                  <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">
                    {inv.active ? 'In Progress' : 'Settled'}
                  </p>
                </div>
              </NeonCard>
            ))}
            {(!user.investments || user.investments.length === 0) && (
              <div className="text-center py-10 bg-white/5 rounded-[32px] border border-dashed border-white/10">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No transaction history yet</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Action Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-md bg-[#151619] border border-white/10 rounded-t-[40px] sm:rounded-[40px] p-8 space-y-8 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight">
                  {showModal === 'add' ? 'Add Virtual Funds' : showModal === 'withdraw' ? 'Withdraw Funds' : 'Invest in Market'}
                </h2>
                <button onClick={() => setShowModal(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {showModal === 'add' && (
                  <div className="bg-pink-500/10 border border-pink-500/20 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#D12053] rounded-lg flex items-center justify-center p-1">
                          <img 
                            src="https://logos-download.com/wp-content/uploads/2022/01/BKash_Logo.png" 
                            alt="bKash" 
                            className="w-full h-auto"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <h4 className="font-black text-pink-500 uppercase tracking-widest text-xs">bKash Deposit</h4>
                      </div>
                      <div className="px-3 py-1 bg-pink-500/20 rounded-full border border-pink-500/30">
                        <span className="text-[8px] font-black text-pink-500 uppercase tracking-widest">Official</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Send funds to (Personal):</p>
                      <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5 group">
                        <span className="text-sm font-mono text-white">+880 1700-000000</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('+8801700000000');
                            alert('bKash number copied!');
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-500 hover:text-white"
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Transaction ID</label>
                      <input 
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter bKash TrxID"
                        className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 text-sm font-mono text-pink-400 focus:outline-none focus:border-pink-500 transition-all placeholder:text-gray-700"
                      />
                    </div>
                  </div>
                )}
                
                {showModal === 'withdraw' && (
                  <div className="space-y-4">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                      <button 
                        onClick={() => setWithdrawalMethod('bikash')}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                          withdrawalMethod === 'bikash' ? "bg-pink-500 text-white" : "text-gray-500 hover:text-white"
                        )}
                      >
                        <Smartphone size={16} /> bKash
                      </button>
                      <button 
                        onClick={() => setWithdrawalMethod('bank')}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                          withdrawalMethod === 'bank' ? "bg-violet-600 text-white" : "text-gray-500 hover:text-white"
                        )}
                      >
                        <Building size={16} /> Bank
                      </button>
                    </div>

                    {withdrawalMethod === 'bikash' ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">bKash Number</label>
                        <input 
                          type="text"
                          value={bikashNumber}
                          onChange={(e) => setBikashNumber(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 text-sm font-mono text-pink-400 focus:outline-none focus:border-pink-500 transition-all"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Bank Name</label>
                          <input 
                            type="text"
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                            placeholder="e.g. Dutch Bangla Bank"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-violet-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Account Number</label>
                          <input 
                            type="text"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                            placeholder="Enter account number"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-violet-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Branch Name</label>
                          <input 
                            type="text"
                            value={bankDetails.branchName}
                            onChange={(e) => setBankDetails({...bankDetails, branchName: e.target.value})}
                            placeholder="Enter branch name"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-violet-500 transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">
                    {showModal === 'invest' ? 'Investment Amount (Min 500)' : 'Enter Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-600">BDT</span>
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-3xl pl-14 pr-6 py-6 text-4xl font-black text-white focus:outline-none focus:border-violet-500 transition-all placeholder:text-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 5000, 10000].map(val => (
                    <button 
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className="py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-gray-400 hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/30 transition-all"
                    >
                      +BDT{val}
                    </button>
                  ))}
                </div>

                {showModal === 'invest' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">
                      Predict Direction
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setDirection('up')}
                        className={cn(
                          "py-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all",
                          direction === 'up' 
                            ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                            : "bg-white/5 border-white/10 text-gray-500 hover:border-blue-500/30 hover:text-blue-400"
                        )}
                      >
                        <ArrowUpRight size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Market Up</span>
                      </button>
                      <button 
                        onClick={() => setDirection('down')}
                        className={cn(
                          "py-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all",
                          direction === 'down' 
                            ? "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                            : "bg-white/5 border-white/10 text-gray-500 hover:border-red-500/30 hover:text-red-400"
                        )}
                      >
                        <ArrowDownLeft size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Market Down</span>
                      </button>
                    </div>
                  </div>
                )}

                <Button onClick={() => handleAction()} disabled={loading} className="py-5 text-lg uppercase tracking-widest">
                  {loading ? 'Processing...' : `Confirm ${showModal === 'add' ? 'Deposit' : 'Withdrawal'}`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- App Root ---

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isAuthReady } = useAuth();
  if (!isAuthReady) return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthReady } = useAuth();
  if (!isAuthReady) return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

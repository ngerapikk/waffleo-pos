import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingBag, Clock, AlertTriangle, Info } from 'lucide-react';
import { formatRupiah } from '../utils/format';
import { useShiftStore } from '../store/useShiftStore';

interface DashboardData {
  kpis: {
    todayGrossSales: number;
    completedOrders: number;
    activeOrders: number;
  };
  salesTrend: { date: string; total: number }[];
  salesByChannel: { name: string; total: number }[];
  topProducts: { name: string; qty: number }[];
  lowStockAlerts: {
    id: string;
    name: string;
    stock: number;
    unit: string;
    threshold: number;
  }[];
  currentShift: {
    id: string;
    openedAt: string;
    openedBy: string;
  } | null;
}

export function Dashboard() {
  const { user } = useAuth();
  const { currentShift: activeShift } = useShiftStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      // Don't set loading to true if we already have data (silent refetch)
      if (!data) setLoading(true);
      setError('');
      const res = await api.get('/reports/dashboard');
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeShift?.id]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-200 h-8 w-48 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-4 w-64 rounded"></div>
          </div>
          <div className="animate-pulse bg-gray-200 h-10 w-96 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-3">
                <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
              </div>
              <div className="animate-pulse bg-gray-200 h-12 w-12 rounded-xl"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-75">
            <div className="animate-pulse bg-gray-200 h-6 w-48 rounded mb-6"></div>
            <div className="animate-pulse bg-gray-200 h-48 w-full rounded"></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-75">
            <div className="animate-pulse bg-gray-200 h-6 w-32 rounded mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex justify-between items-center">
                  <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                  <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-danger p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <p>{error}</p>
          <button onClick={fetchDashboard} className="ml-auto underline">Coba Lagi</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Shift Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Dashboard</h1>
          <p className="text-text-muted">Selamat datang kembali, {user?.name}</p>
        </div>
        
        {activeShift ? (
          <div className="bg-green-50 text-green-success px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-green-200">
            <Info className="w-4 h-4" />
            <span>
              Shift dibuka oleh <strong>{data?.currentShift?.openedBy || 'Anda'}</strong> pada{' '}
              {new Date(activeShift.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ) : (
          <div className="bg-amber-50 text-amber-warning px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-amber-200">
            <AlertTriangle className="w-4 h-4" />
            <span>Toko saat ini belum buka. Buka shift di header untuk memulai transaksi.</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border-light flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-primary rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-text-muted text-sm font-medium">Penjualan Hari Ini</p>
            <h3 className="text-2xl font-bold text-text-dark">{formatRupiah(data.kpis.todayGrossSales)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-border-light flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-success rounded-lg">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-text-muted text-sm font-medium">Pesanan Selesai</p>
            <h3 className="text-2xl font-bold text-text-dark">{data.kpis.completedOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-border-light flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-text-muted text-sm font-medium">Pesanan Aktif</p>
            <h3 className="text-2xl font-bold text-text-dark">{data.kpis.activeOrders}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-border-light">
            <h3 className="font-semibold text-text-dark mb-4">Tren Penjualan Hari Ini</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.salesTrend} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <Line type="monotone" dataKey="total" stroke="#E67E22" strokeWidth={3} dot={{ r: 4, fill: '#E67E22' }} activeDot={{ r: 6 }} />
                <CartesianGrid stroke="#ECF0F1" strokeDasharray="5 5" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#95A5A6', fontSize: 12 }} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10} 
                />
                <YAxis 
                  tickFormatter={(val) => `Rp${val / 1000}k`} 
                  tick={{ fill: '#95A5A6', fontSize: 12 }} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-10} 
                  width={65}
                />
                <Tooltip 
                  formatter={(value: any) => [formatRupiah(Number(value)), 'Penjualan']}
                  labelFormatter={(label) => `Jam ${label}`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #ECF0F1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Sales By Channel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border-light">
            <h3 className="font-semibold text-text-dark mb-4">Penjualan per Channel (Hari Ini)</h3>
            {!data.salesByChannel || data.salesByChannel.length === 0 ? (
              <p className="text-sm text-text-muted">Belum ada penjualan hari ini.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.salesByChannel.map((ch, idx) => (
                  <div key={idx} className="flex flex-col bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-sm font-medium text-text-muted mb-1">{ch.name}</span>
                    <span className="font-bold text-text-dark">{formatRupiah(ch.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-6">

          {/* Top Products */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-border-light">
            <h3 className="font-semibold text-text-dark mb-4">Top 5 Produk Hari Ini</h3>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-text-muted">Belum ada produk terjual hari ini.</p>
            ) : (
              <div className="space-y-4">
                {data.topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-orange-100 text-orange-primary flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium text-text-dark">{p.name}</span>
                    </div>
                    <span className="text-sm text-text-muted">{p.qty}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
            <h3 className="font-semibold text-text-dark mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-danger" />
              Peringatan Stok Tipis
            </h3>
            {data.lowStockAlerts.length === 0 ? (
              <p className="text-sm text-text-muted">Semua stok bahan baku aman.</p>
            ) : (
              <div className="space-y-3">
                {data.lowStockAlerts.map(alert => (
                  <div key={alert.id} className="flex flex-col bg-red-50 p-3 rounded-lg border border-red-100">
                    <span className="text-sm font-medium text-text-dark">{alert.name}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-red-danger font-semibold">
                        Sisa: {alert.stock} {alert.unit}
                      </span>
                      <span className="text-xs text-text-muted">
                        Batas: {alert.threshold} {alert.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

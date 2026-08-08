import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Users, Tag, GitBranch, Settings2,
  Plus, Pencil, Eye, EyeOff, KeyRound, Trash2,
  Save, X, ChevronRight, Loader2, CheckCircle2,
  Coffee, Layers, Blend, Package, AlertTriangle,
  Wifi, Clock, Hash, FileText, Mail, Printer,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PromoTab } from '../components/settings/PromoTab';

// ─────────────── Types ───────────────

type Role = 'ADMIN' | 'SUPERVISOR' | 'KASIR';

interface UserItem {
  id: string; username: string; fullName: string;
  role: Role; active: boolean; createdAt: string;
}

interface ToppingItem {
  id: string; name: string; series: 'SPREAD' | 'CRUNCHY' | 'PREMIUM';
  priceDirect: number; priceGrabGo: number; priceShopee: number;
  gramPerPortion: number; active: boolean; sortOrder: number;
}

interface FlavourItem {
  id: string; name: string; extraPriceDirect: number;
  extraPriceOnline: number; ingredientUsage: string | null;
  active: boolean; sortOrder: number;
}

interface AddonItem {
  id: string; name: string; extraPriceDirect: number;
  extraPriceOnline: number; usagePerPortion: string | null;
  active: boolean; sortOrder: number;
}

interface DrinkItem {
  id: string; name: string; drinkType: string;
  priceDirect: number; priceGrabGo: number; priceShopee: number;
  active: boolean; sortOrder: number;
}

interface BranchInfo {
  id: string; name: string; branchCode: string;
  address: string | null; timezone: string;
}

interface SystemConfig {
  outletName: string; receiptFooter: string; orderIdPrefix: string;
  printerIp: string; printerPort: number; autoOpenDrawer: boolean;
  showLogoOnReceipt: boolean; lowStockThreshold: number; backupEmail: string;
  operationalStart: string; operationalEnd: string;
  maxOpenOrders: number; defaultChannel: string;
}

// ─────────────── Helpers ───────────────

const fmtRp = (n: number) =>
  'Rp' + Math.round(n).toLocaleString('id-ID');

const SERIES_COLOR: Record<string, string> = {
  SPREAD: 'bg-green-50 text-green-700 border border-green-200',
  CRUNCHY: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  PREMIUM: 'bg-purple-50 text-purple-700 border border-purple-200',
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-red-50 text-red-700 border border-red-200',
  SUPERVISOR: 'bg-blue-50 text-blue-700 border border-blue-200',
  KASIR: 'bg-slate-500/20 text-gray-700 border border-gray-300',
};

// ─────────────── Shared UI Components ───────────────

const Badge = ({ text, className }: { text: string; className: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{text}</span>
);

const StatusPill = ({ active, onClick }: { active: boolean; onClick?: () => void }) => (
  <button onClick={onClick} disabled={!onClick} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${onClick ? 'cursor-pointer hover:opacity-75 active:scale-95' : ''} ${active
    ? 'bg-green-50 text-green-700 border border-green-200'
    : 'bg-[#f4ebe3] text-[#7a6f68] border border-gray-200'
  }`}>{active ? 'Aktif' : 'Nonaktif'}</button>
);

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium animate-[slideUp_0.3s_ease] ${type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {msg}
    </div>
  );
}

function ConfirmDialog({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white border border-[#ddd3cb] rounded-2xl p-6 w-80 shadow-2xl">
        <p className="text-gray-800 mb-5 text-sm leading-relaxed">{msg}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-[#f4ebe3] text-gray-700 hover:bg-gray-200 text-sm transition-colors">Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 text-sm font-medium transition-colors">Ya, Hapus</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Price Input ───────────────

function PriceInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-[#7a6f68] mb-1 block">{label}</label>
      <div className="flex items-center gap-1 bg-white border border-[#ddd3cb] rounded-xl px-3 py-2">
        <span className="text-[#7a6f68] text-sm">Rp</span>
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 bg-transparent text-gray-800 text-sm outline-none w-full"
        />
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[#7a6f68] mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none focus:border-orange-500/60 transition-colors"
      />
    </div>
  );
}

// ─────────────── Modal Shell ───────────────

function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white border border-[#ddd3cb] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ddd3cb]">
          <h3 className="text-gray-800 font-semibold text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ─────────────── Products Tab ───────────────

type ProductSubTab = 'topping' | 'flavour' | 'addon' | 'drink';

const PRODUCT_SUBTABS: { key: ProductSubTab; label: string; icon: React.ReactNode }[] = [
  { key: 'topping', label: 'Topping Utama', icon: <Layers size={14} /> },
  { key: 'flavour', label: 'Flavour', icon: <Blend size={14} /> },
  { key: 'addon', label: 'Add-on', icon: <Package size={14} /> },
  { key: 'drink', label: 'Drinks', icon: <Coffee size={14} /> },
];

function ToppingsTable({ toast }: { toast: (m: string, t: 'ok' | 'err') => void }) {
  const [items, setItems] = useState<ToppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ToppingItem | null>(null);
  const [form, setForm] = useState({ name: '', series: 'SPREAD', priceDirect: 0, priceGrabGo: 0, priceShopee: 0, gramPerPortion: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await api.get('/menu/toppings'); setItems(r.data); }
    catch { toast('Gagal memuat data topping', 'err'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (item: ToppingItem) => {
    setEditing(item);
    setForm({ name: item.name, series: item.series, priceDirect: Number(item.priceDirect), priceGrabGo: Number(item.priceGrabGo), priceShopee: Number(item.priceShopee), gramPerPortion: Number(item.gramPerPortion) });
    setModal('edit');
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', series: 'SPREAD', priceDirect: 0, priceGrabGo: 0, priceShopee: 0, gramPerPortion: 0 });
    setModal('add');
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/menu/toppings', form);
      else await api.patch(`/menu/toppings/${editing!.id}`, form);
      toast(modal === 'add' ? 'Topping ditambahkan' : 'Topping diperbarui', 'ok');
      setModal(null); load();
    } catch { toast('Gagal menyimpan topping', 'err'); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string) => {
    try {
      setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i));
      await api.patch(`/menu/toppings/${id}/toggle`);
      toast('Status diperbarui', 'ok');
    } catch {
      toast('Gagal mengubah status', 'err');
      load();
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-400" size={22} /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded-xl transition-colors font-medium">
          <Plus size={13} /> Tambah Topping
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#ddd3cb]/60">
        <table className="w-full text-sm">
          <thead className="bg-[#f4ebe3]/40">
            <tr className="text-[#7a6f68] text-xs">
              <th className="text-left px-4 py-3">Nama</th>
              <th className="text-left px-4 py-3">Series</th>
              <th className="text-right px-4 py-3">Direct</th>
              <th className="text-right px-4 py-3">GrabGo</th>
              <th className="text-right px-4 py-3">Shopee</th>
              <th className="text-right px-4 py-3">Gram/Porsi</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-white transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium">{item.name}</td>
                <td className="px-4 py-3"><Badge text={item.series} className={SERIES_COLOR[item.series]} /></td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.priceDirect))}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.priceGrabGo))}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.priceShopee))}</td>
                <td className="px-4 py-3 text-right text-gray-700">{Number(item.gramPerPortion)}g</td>
                <td className="px-4 py-3 text-center"><StatusPill active={item.active} onClick={() => toggle(item.id)} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => toggle(item.id)} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors">
                      {item.active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Tambah Topping' : 'Edit Topping'} onClose={() => setModal(null)} wide>
          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Nama Topping" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Contoh: Coklat" />
            <div>
              <label className="text-xs text-[#7a6f68] mb-1 block">Series</label>
              <select value={form.series} onChange={e => setForm(f => ({ ...f, series: e.target.value }))}
                className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
                <option value="SPREAD">Spread</option>
                <option value="CRUNCHY">Crunchy</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
            <PriceInput label="Harga Direct" value={form.priceDirect} onChange={v => setForm(f => ({ ...f, priceDirect: v }))} />
            <PriceInput label="Harga GrabFood/GoFood" value={form.priceGrabGo} onChange={v => setForm(f => ({ ...f, priceGrabGo: v }))} />
            <PriceInput label="Harga ShopeeFood" value={form.priceShopee} onChange={v => setForm(f => ({ ...f, priceShopee: v }))} />
            <div>
              <label className="text-xs text-[#7a6f68] mb-1 block">Gram per Porsi</label>
              <div className="flex items-center gap-1 bg-white border border-[#ddd3cb] rounded-xl px-3 py-2">
                <input type="number" min={0} value={form.gramPerPortion} onChange={e => setForm(f => ({ ...f, gramPerPortion: Number(e.target.value) }))}
                  className="flex-1 bg-transparent text-gray-800 text-sm outline-none" />
                <span className="text-[#7a6f68] text-sm">g</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-[#f4ebe3] text-gray-700 hover:bg-gray-200 text-sm transition-colors">Batal</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FlavoursTable({ toast }: { toast: (m: string, t: 'ok' | 'err') => void }) {
  const [items, setItems] = useState<FlavourItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<FlavourItem | null>(null);
  const [form, setForm] = useState({ name: '', extraPriceDirect: 0, extraPriceOnline: 0, ingredientUsage: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await api.get('/menu/flavours'); setItems(r.data); }
    catch { toast('Gagal memuat data flavour', 'err'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (item: FlavourItem) => {
    setEditing(item);
    setForm({ name: item.name, extraPriceDirect: Number(item.extraPriceDirect), extraPriceOnline: Number(item.extraPriceOnline), ingredientUsage: item.ingredientUsage ?? '' });
    setModal('edit');
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/menu/flavours', form);
      else await api.patch(`/menu/flavours/${editing!.id}`, form);
      toast(modal === 'add' ? 'Flavour ditambahkan' : 'Flavour diperbarui', 'ok');
      setModal(null); load();
    } catch { toast('Gagal menyimpan flavour', 'err'); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string) => {
    try {
      setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i));
      await api.patch(`/menu/flavours/${id}/toggle`);
      toast('Status diperbarui', 'ok');
    } catch {
      toast('Gagal mengubah status', 'err');
      load();
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-400" size={22} /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => { setEditing(null); setForm({ name: '', extraPriceDirect: 0, extraPriceOnline: 0, ingredientUsage: '' }); setModal('add'); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded-xl transition-colors font-medium">
          <Plus size={13} /> Tambah Flavour
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#ddd3cb]/60">
        <table className="w-full text-sm">
          <thead className="bg-[#f4ebe3]/40">
            <tr className="text-[#7a6f68] text-xs">
              <th className="text-left px-4 py-3">Nama</th>
              <th className="text-right px-4 py-3">Extra Direct</th>
              <th className="text-right px-4 py-3">Extra Online</th>
              <th className="text-left px-4 py-3">Usage Bahan</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-white transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.extraPriceDirect))}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.extraPriceOnline))}</td>
                <td className="px-4 py-3 text-[#7a6f68] text-xs">{item.ingredientUsage ?? '—'}</td>
                <td className="px-4 py-3 text-center"><StatusPill active={item.active} onClick={() => toggle(item.id)} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => toggle(item.id)} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors">
                      {item.active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal === 'add' ? 'Tambah Flavour' : 'Edit Flavour'} onClose={() => setModal(null)}>
          <TextInput label="Nama Flavour" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Contoh: Pandan" />
          <PriceInput label="Extra Harga Direct" value={form.extraPriceDirect} onChange={v => setForm(f => ({ ...f, extraPriceDirect: v }))} />
          <PriceInput label="Extra Harga Online" value={form.extraPriceOnline} onChange={v => setForm(f => ({ ...f, extraPriceOnline: v }))} />
          <TextInput label="Penggunaan Bahan (opsional)" value={form.ingredientUsage} onChange={v => setForm(f => ({ ...f, ingredientUsage: v }))} placeholder="Contoh: 3g Perisa Pandan" />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-[#f4ebe3] text-gray-700 hover:bg-gray-200 text-sm transition-colors">Batal</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddonsTable({ toast }: { toast: (m: string, t: 'ok' | 'err') => void }) {
  const [items, setItems] = useState<AddonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<AddonItem | null>(null);
  const [form, setForm] = useState({ name: '', extraPriceDirect: 0, extraPriceOnline: 0, usagePerPortion: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await api.get('/menu/addons'); setItems(r.data); }
    catch { toast('Gagal memuat data add-on', 'err'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (item: AddonItem) => {
    setEditing(item);
    setForm({ name: item.name, extraPriceDirect: Number(item.extraPriceDirect), extraPriceOnline: Number(item.extraPriceOnline), usagePerPortion: item.usagePerPortion ?? '' });
    setModal('edit');
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/menu/addons', form);
      else await api.patch(`/menu/addons/${editing!.id}`, form);
      toast(modal === 'add' ? 'Add-on ditambahkan' : 'Add-on diperbarui', 'ok');
      setModal(null); load();
    } catch { toast('Gagal menyimpan add-on', 'err'); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string) => {
    try {
      setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i));
      await api.patch(`/menu/addons/${id}/toggle`);
      toast('Status diperbarui', 'ok');
    } catch {
      toast('Gagal mengubah status', 'err');
      load();
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-400" size={22} /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => { setEditing(null); setForm({ name: '', extraPriceDirect: 0, extraPriceOnline: 0, usagePerPortion: '' }); setModal('add'); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded-xl transition-colors font-medium">
          <Plus size={13} /> Tambah Add-on
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#ddd3cb]/60">
        <table className="w-full text-sm">
          <thead className="bg-[#f4ebe3]/40">
            <tr className="text-[#7a6f68] text-xs">
              <th className="text-left px-4 py-3">Nama</th>
              <th className="text-right px-4 py-3">Extra Direct</th>
              <th className="text-right px-4 py-3">Extra Online</th>
              <th className="text-left px-4 py-3">Per Porsi</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-white transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.extraPriceDirect))}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.extraPriceOnline))}</td>
                <td className="px-4 py-3 text-[#7a6f68] text-xs">{item.usagePerPortion ?? '—'}</td>
                <td className="px-4 py-3 text-center"><StatusPill active={item.active} onClick={() => toggle(item.id)} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => toggle(item.id)} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors">
                      {item.active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal === 'add' ? 'Tambah Add-on' : 'Edit Add-on'} onClose={() => setModal(null)}>
          <TextInput label="Nama Add-on" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Contoh: Keju" />
          <PriceInput label="Extra Harga Direct" value={form.extraPriceDirect} onChange={v => setForm(f => ({ ...f, extraPriceDirect: v }))} />
          <PriceInput label="Extra Harga Online" value={form.extraPriceOnline} onChange={v => setForm(f => ({ ...f, extraPriceOnline: v }))} />
          <TextInput label="Takaran per Porsi (opsional)" value={form.usagePerPortion} onChange={v => setForm(f => ({ ...f, usagePerPortion: v }))} placeholder="Contoh: 25g" />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-[#f4ebe3] text-gray-700 hover:bg-gray-200 text-sm transition-colors">Batal</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DrinksTable({ toast }: { toast: (m: string, t: 'ok' | 'err') => void }) {
  const [items, setItems] = useState<DrinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<DrinkItem | null>(null);
  const [form, setForm] = useState({ name: '', drinkType: 'Coffee', priceDirect: 0, priceGrabGo: 0, priceShopee: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await api.get('/menu/drinks'); setItems(r.data); }
    catch { toast('Gagal memuat data minuman', 'err'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (item: DrinkItem) => {
    setEditing(item);
    setForm({ name: item.name, drinkType: item.drinkType, priceDirect: Number(item.priceDirect), priceGrabGo: Number(item.priceGrabGo), priceShopee: Number(item.priceShopee) });
    setModal('edit');
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/menu/drinks', form);
      else await api.patch(`/menu/drinks/${editing!.id}`, form);
      toast(modal === 'add' ? 'Minuman ditambahkan' : 'Minuman diperbarui', 'ok');
      setModal(null); load();
    } catch { toast('Gagal menyimpan minuman', 'err'); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string) => {
    try {
      setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i));
      await api.patch(`/menu/drinks/${id}/toggle`);
      toast('Status diperbarui', 'ok');
    } catch {
      toast('Gagal mengubah status', 'err');
      load();
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-400" size={22} /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => { setEditing(null); setForm({ name: '', drinkType: 'Coffee', priceDirect: 0, priceGrabGo: 0, priceShopee: 0 }); setModal('add'); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded-xl transition-colors font-medium">
          <Plus size={13} /> Tambah Minuman
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#ddd3cb]/60">
        <table className="w-full text-sm">
          <thead className="bg-[#f4ebe3]/40">
            <tr className="text-[#7a6f68] text-xs">
              <th className="text-left px-4 py-3">Nama</th>
              <th className="text-left px-4 py-3">Tipe</th>
              <th className="text-right px-4 py-3">Direct</th>
              <th className="text-right px-4 py-3">GrabGo</th>
              <th className="text-right px-4 py-3">Shopee</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-white transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium">{item.name}</td>
                <td className="px-4 py-3">
                  <Badge text={item.drinkType}
                    className={item.drinkType === 'Coffee' ? 'bg-amber-800/30 text-yellow-700 border border-amber-700/40' : 'bg-cyan-800/30 text-cyan-300 border border-cyan-700/40'} />
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.priceDirect))}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.priceGrabGo))}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtRp(Number(item.priceShopee))}</td>
                <td className="px-4 py-3 text-center"><StatusPill active={item.active} onClick={() => toggle(item.id)} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => toggle(item.id)} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors">
                      {item.active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal === 'add' ? 'Tambah Minuman' : 'Edit Minuman'} onClose={() => setModal(null)} wide>
          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Nama Minuman" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Contoh: Iced Latte" />
            <div>
              <label className="text-xs text-[#7a6f68] mb-1 block">Tipe</label>
              <select value={form.drinkType} onChange={e => setForm(f => ({ ...f, drinkType: e.target.value }))}
                className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
                <option>Coffee</option>
                <option>Non-Coffee</option>
              </select>
            </div>
            <PriceInput label="Harga Direct" value={form.priceDirect} onChange={v => setForm(f => ({ ...f, priceDirect: v }))} />
            <PriceInput label="Harga GrabFood/GoFood" value={form.priceGrabGo} onChange={v => setForm(f => ({ ...f, priceGrabGo: v }))} />
            <PriceInput label="Harga ShopeeFood" value={form.priceShopee} onChange={v => setForm(f => ({ ...f, priceShopee: v }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-[#f4ebe3] text-gray-700 hover:bg-gray-200 text-sm transition-colors">Batal</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductsTab({ toast }: { toast: (m: string, t: 'ok' | 'err') => void }) {
  const [sub, setSub] = useState<ProductSubTab>('topping');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {PRODUCT_SUBTABS.map(t => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${sub === t.key
              ? 'bg-orange-100 text-orange-700 border border-orange-200'
              : 'bg-[#f4ebe3]/40 text-[#7a6f68] border border-[#ddd3cb] hover:border-gray-300/60 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {sub === 'topping' && <ToppingsTable toast={toast} />}
      {sub === 'flavour' && <FlavoursTable toast={toast} />}
      {sub === 'addon' && <AddonsTable toast={toast} />}
      {sub === 'drink' && <DrinksTable toast={toast} />}
    </div>
  );
}

// ─────────────── Users Tab ───────────────

function UsersTab({ toast }: { toast: (m: string, t: 'ok' | 'err') => void }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | 'reset' | null>(null);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'KASIR' as Role });
  const [editForm, setEditForm] = useState({ fullName: '', role: 'KASIR' as Role, active: true });
  const [resetPw, setResetPw] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await api.get('/settings/users'); setUsers(r.data); }
    catch { toast('Gagal memuat data pengguna', 'err'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (u: UserItem) => {
    setEditing(u);
    setEditForm({ fullName: u.fullName, role: u.role, active: u.active });
    setModal('edit');
  };

  const createUser = async () => {
    setSaving(true);
    try {
      await api.post('/settings/users', form);
      toast('Pengguna berhasil dibuat', 'ok');
      setModal(null); load();
    } catch (e: any) {
      toast(e?.response?.data?.message ?? 'Gagal membuat pengguna', 'err');
    }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.patch(`/settings/users/${editing!.id}`, editForm);
      toast('Pengguna diperbarui', 'ok');
      setModal(null); load();
    } catch { toast('Gagal memperbarui pengguna', 'err'); }
    finally { setSaving(false); }
  };

  const doResetPw = async () => {
    setSaving(true);
    try {
      await api.post(`/settings/users/${editing!.id}/reset-password`, { newPassword: resetPw });
      toast('Password berhasil direset', 'ok');
      setModal(null); setResetPw('');
    } catch { toast('Gagal mereset password', 'err'); }
    finally { setSaving(false); }
  };

  const deactivate = async (id: string) => {
    try {
      setUsers(prev => prev.filter(u => u.id !== id));
      await api.delete(`/settings/users/${id}`);
      toast('Pengguna dinonaktifkan', 'ok');
    } catch {
      toast('Gagal menonaktifkan pengguna', 'err');
      load();
    } finally {
      setConfirm(null);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-400" size={22} /></div>;

  return (
    <div>
      {confirm && <ConfirmDialog msg="Nonaktifkan pengguna ini? Aksi ini tidak bisa dibatalkan langsung — hubungi Admin untuk reaktivasi." onConfirm={() => deactivate(confirm)} onCancel={() => setConfirm(null)} />}
      <div className="flex justify-end mb-3">
        <button onClick={() => { setForm({ username: '', password: '', fullName: '', role: 'KASIR' }); setModal('add'); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded-xl transition-colors font-medium">
          <Plus size={13} /> Tambah Pengguna
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#ddd3cb]/60">
        <table className="w-full text-sm">
          <thead className="bg-[#f4ebe3]/40">
            <tr className="text-[#7a6f68] text-xs">
              <th className="text-left px-4 py-3">Nama Lengkap</th>
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Dibuat</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-white transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium">
                  {u.fullName}
                  {u.id === me?.id && <span className="ml-2 text-[10px] text-orange-400 font-medium">(Anda)</span>}
                </td>
                <td className="px-4 py-3 text-[#7a6f68] font-mono text-xs">@{u.username}</td>
                <td className="px-4 py-3"><Badge text={u.role} className={ROLE_COLOR[u.role]} /></td>
                <td className="px-4 py-3 text-center"><StatusPill active={u.active} /></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => { setEditing(u); setResetPw(''); setModal('reset'); }} className="p-1.5 rounded-lg hover:bg-gray-200 text-[#7a6f68] hover:text-gray-800 transition-colors"><KeyRound size={13} /></button>
                    {u.id !== me?.id && (
                      <button onClick={() => setConfirm(u.id)} className="p-1.5 rounded-lg hover:bg-red-900/40 text-[#7a6f68] hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'add' && (
        <Modal title="Tambah Pengguna Baru" onClose={() => setModal(null)}>
          <TextInput label="Nama Lengkap" value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} placeholder="Contoh: Budi Santoso" />
          <TextInput label="Username" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} placeholder="Contoh: budi_kasir" />
          <TextInput label="Password" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="Minimal 6 karakter" />
          <div>
            <label className="text-xs text-[#7a6f68] mb-1 block">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
              className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
              <option value="KASIR">Kasir</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-[#f4ebe3] text-gray-700 hover:bg-gray-200 text-sm transition-colors">Batal</button>
            <button onClick={createUser} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Buat Pengguna
            </button>
          </div>
        </Modal>
      )}

      {modal === 'edit' && editing && (
        <Modal title={`Edit: ${editing.fullName}`} onClose={() => setModal(null)}>
          <TextInput label="Nama Lengkap" value={editForm.fullName} onChange={v => setEditForm(f => ({ ...f, fullName: v }))} />
          <div>
            <label className="text-xs text-[#7a6f68] mb-1 block">Role</label>
            <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
              className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
              <option value="KASIR">Kasir</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#f4ebe3] rounded-xl">
            <span className="text-sm text-gray-700">Status Akun</span>
            <button onClick={() => setEditForm(f => ({ ...f, active: !f.active }))}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${editForm.active ? 'bg-orange-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${editForm.active ? 'translate-x-4.5' : ''}`} />
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-[#f4ebe3] text-gray-700 hover:bg-gray-200 text-sm transition-colors">Batal</button>
            <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
            </button>
          </div>
        </Modal>
      )}

      {modal === 'reset' && editing && (
        <Modal title={`Reset Password: ${editing.fullName}`} onClose={() => setModal(null)}>
          <div className="p-3 bg-amber-500/10 border border-yellow-200 rounded-xl text-yellow-700 text-xs leading-relaxed">
            Password lama akan langsung tidak berlaku setelah reset. Pastikan kasir tahu password barunya.
          </div>
          <TextInput label="Password Baru" type="password" value={resetPw} onChange={setResetPw} placeholder="Minimal 6 karakter" />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-[#f4ebe3] text-gray-700 hover:bg-gray-200 text-sm transition-colors">Batal</button>
            <button onClick={doResetPw} disabled={saving || resetPw.length < 6} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Reset Password
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────── Branch Tab ───────────────

function BranchTab({ toast }: { toast: (m: string, t: 'ok' | 'err') => void }) {
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', branchCode: '', address: '', timezone: 'Asia/Jakarta' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get('/settings/branch');
      setBranch(r.data);
      setForm({ name: r.data.name, branchCode: r.data.branchCode, address: r.data.address ?? '', timezone: r.data.timezone });
    } catch { toast('Gagal memuat data cabang', 'err'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try { await api.patch('/settings/branch', form); toast('Informasi cabang berhasil disimpan', 'ok'); load(); }
    catch { toast('Gagal menyimpan informasi cabang', 'err'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-400" size={22} /></div>;
  if (!branch) return null;

  return (
    <div className="max-w-lg space-y-4">
      <div className="p-4 bg-white rounded-2xl border border-[#ddd3cb] space-y-4">
        <p className="text-xs font-semibold text-[#7a6f68] uppercase tracking-wider">Informasi Outlet</p>
        <TextInput label="Nama Outlet" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Contoh: Waffleo Gabek" />
        <TextInput label="Kode Cabang" value={form.branchCode} onChange={v => setForm(f => ({ ...f, branchCode: v }))} placeholder="Contoh: 001" />
        <TextInput label="Alamat" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Alamat lengkap outlet" />
        <div>
          <label className="text-xs text-[#7a6f68] mb-1 block">Zona Waktu</label>
          <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
            className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
            <option value="Asia/Jakarta">WIB — Asia/Jakarta</option>
            <option value="Asia/Makassar">WITA — Asia/Makassar</option>
            <option value="Asia/Jayapura">WIT — Asia/Jayapura</option>
          </select>
        </div>
      </div>
      <button onClick={save} disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Perubahan
      </button>
    </div>
  );
}

// ─────────────── System Tab ───────────────

function SystemTab({ toast }: { toast: (m: string, t: 'ok' | 'err') => void }) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SystemConfig>({
    outletName: '', receiptFooter: '', orderIdPrefix: '',
    printerIp: '', printerPort: 9100, autoOpenDrawer: false,
    showLogoOnReceipt: true, lowStockThreshold: 500, backupEmail: '',
    operationalStart: '09:00', operationalEnd: '21:00',
    maxOpenOrders: 20, defaultChannel: 'Walk In',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get('/settings/system');
      setConfig(r.data);
      setForm(r.data);
    } catch { toast('Gagal memuat konfigurasi sistem', 'err'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try { await api.patch('/settings/system', form); toast('Konfigurasi berhasil disimpan', 'ok'); }
    catch { toast('Gagal menyimpan konfigurasi', 'err'); }
    finally { setSaving(false); }
  };

  const Toggle = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-3 bg-[#f4ebe3] rounded-xl">
      <div>
        <p className="text-sm text-gray-700 font-medium">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-orange-500' : 'bg-gray-200'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-400" size={22} /></div>;
  if (!config) return null;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Receipt & Branding */}
      <div className="p-4 bg-white rounded-2xl border border-[#ddd3cb] space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={14} className="text-orange-400" />
          <p className="text-xs font-semibold text-[#7a6f68] uppercase tracking-wider">Struk & Tampilan</p>
        </div>
        <TextInput label="Nama Outlet di Struk" value={form.outletName} onChange={v => setForm(f => ({ ...f, outletName: v }))} placeholder="Waffleo Gabek" />
        <TextInput label="Footer Struk" value={form.receiptFooter} onChange={v => setForm(f => ({ ...f, receiptFooter: v }))} placeholder="Terima kasih telah memesan!" />
        <Toggle label="Tampilkan Logo di Struk" desc="Logo outlet ditampilkan di bagian atas struk" value={form.showLogoOnReceipt} onChange={v => setForm(f => ({ ...f, showLogoOnReceipt: v }))} />
      </div>

      {/* Order Config */}
      <div className="p-4 bg-white rounded-2xl border border-[#ddd3cb] space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Hash size={14} className="text-blue-400" />
          <p className="text-xs font-semibold text-[#7a6f68] uppercase tracking-wider">Konfigurasi Pesanan</p>
        </div>
        <TextInput label="Prefix Nomor Order" value={form.orderIdPrefix} onChange={v => setForm(f => ({ ...f, orderIdPrefix: v }))} placeholder="001" />
        <div>
          <label className="text-xs text-[#7a6f68] mb-1 block">Channel Default</label>
          <select value={form.defaultChannel} onChange={e => setForm(f => ({ ...f, defaultChannel: e.target.value }))}
            className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
            {['Walk In', 'WhatsApp', 'Instagram', 'GrabFood', 'GoFood', 'ShopeeFood'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#7a6f68] mb-1 block">Maks. Order Terbuka Serentak</label>
          <input type="number" min={1} max={100} value={form.maxOpenOrders} onChange={e => setForm(f => ({ ...f, maxOpenOrders: Number(e.target.value) }))}
            className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
        </div>
      </div>

      {/* Operational Hours */}
      <div className="p-4 bg-white rounded-2xl border border-[#ddd3cb] space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={14} className="text-green-400" />
          <p className="text-xs font-semibold text-[#7a6f68] uppercase tracking-wider">Jam Operasional</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Buka" type="time" value={form.operationalStart} onChange={v => setForm(f => ({ ...f, operationalStart: v }))} />
          <TextInput label="Tutup" type="time" value={form.operationalEnd} onChange={v => setForm(f => ({ ...f, operationalEnd: v }))} />
        </div>
      </div>

      {/* Printer */}
      <div className="p-4 bg-white rounded-2xl border border-[#ddd3cb] space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Printer size={14} className="text-purple-400" />
          <p className="text-xs font-semibold text-[#7a6f68] uppercase tracking-wider">Printer Struk</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="IP Address Printer" value={form.printerIp} onChange={v => setForm(f => ({ ...f, printerIp: v }))} placeholder="192.168.1.100" />
          <div>
            <label className="text-xs text-[#7a6f68] mb-1 block">Port</label>
            <input type="number" value={form.printerPort} onChange={e => setForm(f => ({ ...f, printerPort: Number(e.target.value) }))}
              className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
          </div>
        </div>
        <Toggle label="Auto Buka Laci Uang" desc="Buka cash drawer otomatis saat transaksi Cash selesai" value={form.autoOpenDrawer} onChange={v => setForm(f => ({ ...f, autoOpenDrawer: v }))} />
      </div>

      {/* Inventory & Backup */}
      <div className="p-4 bg-white rounded-2xl border border-[#ddd3cb] space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Wifi size={14} className="text-cyan-400" />
          <p className="text-xs font-semibold text-[#7a6f68] uppercase tracking-wider">Stok & Backup</p>
        </div>
        <div>
          <label className="text-xs text-[#7a6f68] mb-1 block">Threshold Stok Menipis (gram)</label>
          <input type="number" min={0} value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
            className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
          <p className="text-xs text-gray-400 mt-1">Notifikasi tampil jika stok bahan baku ≤ nilai ini</p>
        </div>
        <div>
          <label className="text-xs text-[#7a6f68] mb-1 block">Email Notifikasi Backup</label>
          <div className="flex items-center gap-1 bg-white border border-[#ddd3cb] rounded-xl px-3 py-2">
            <Mail size={13} className="text-gray-400" />
            <input type="email" value={form.backupEmail} onChange={e => setForm(f => ({ ...f, backupEmail: e.target.value }))}
              placeholder="owner@example.com"
              className="flex-1 bg-transparent text-gray-800 text-sm outline-none ml-1" />
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Konfigurasi
      </button>
    </div>
  );
}

// ─────────────── Main Settings Component ───────────────

type MainTab = 'products' | 'users' | 'promo' | 'branch' | 'system';

const ALL_TABS: { key: MainTab; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { key: 'products', label: 'Produk & Menu', icon: <ShoppingBag size={15} />, roles: ['SUPERVISOR', 'ADMIN'] },
  { key: 'users',    label: 'Pengguna',       icon: <Users size={15} />,       roles: ['ADMIN'] },
  { key: 'promo',    label: 'Promo',           icon: <Tag size={15} />,         roles: ['SUPERVISOR', 'ADMIN'] },
  { key: 'branch',   label: 'Cabang',          icon: <GitBranch size={15} />,   roles: ['ADMIN'] },
  { key: 'system',   label: 'Sistem',          icon: <Settings2 size={15} />,   roles: ['ADMIN'] },
];

export const Settings = () => {
  const { user } = useAuth();
  const role = (user?.role ?? 'KASIR') as Role;
  const visibleTabs = ALL_TABS.filter(t => t.roles.includes(role));
  const [activeTab, setActiveTab] = useState<MainTab>(visibleTabs[0]?.key ?? 'products');
  const [toast, setToastState] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToastState({ msg, type });
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#f4ebe3]">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToastState(null)} />}

      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-[#ddd3cb]">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 size={18} className="text-orange-400" />
          <h1 className="text-lg font-bold text-[#443831]">Pengaturan</h1>
        </div>
        <p className="text-gray-400 text-xs">Kelola produk, pengguna, cabang, dan konfigurasi sistem</p>

        {/* Tab Nav */}
        <div className="flex gap-1 mt-4 flex-wrap">
          {visibleTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === t.key
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-[#7a6f68] hover:text-gray-800 hover:bg-white'
              }`}
            >
              {t.icon}
              {t.label}
              {activeTab === t.key && <ChevronRight size={13} className="opacity-60" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'products' && <ProductsTab toast={showToast} />}
        {activeTab === 'users' && <UsersTab toast={showToast} />}
        {activeTab === 'promo' && <PromoTab toast={showToast} />}
        {activeTab === 'branch' && <BranchTab toast={showToast} />}
        {activeTab === 'system' && <SystemTab toast={showToast} />}
      </div>
    </div>
  );
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Save, X, Tag } from 'lucide-react';
import api from '../../lib/api';

const fmtRp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

interface Promo {
  id: string;
  name: string;
  promoType: string;
  rulePayload: any;
  validFrom: string | null;
  validTo: string | null;
  applicableChannels: string[];
  active: boolean;
}

interface Channel {
  id: string;
  name: string;
}

const MultiSelectDropdown = ({ options, value, onChange }: any) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const selectedCount = value?.length || 0;
  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none flex justify-between items-center text-left"
      >
        <span className="truncate mr-2">{selectedCount > 0 ? `${selectedCount} item terpilih` : 'Pilih item...'}</span>
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>
      
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#ddd3cb] rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto p-2">
            {options.map((g: any) => (
              <div key={g.name} className="mb-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">{g.name}</div>
                {g.options.map((o: any) => {
                  const selected = value || [];
                  const toggle = () => {
                    if (selected.includes(o.value)) {
                      onChange(selected.filter((v: string) => v !== o.value));
                    } else {
                      onChange([...selected, o.value]);
                    }
                  };
                  return (
                    <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-orange-50 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selected.includes(o.value)} 
                        onChange={toggle} 
                        style={{ minHeight: 'auto' }}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 w-4 h-4" 
                      />
                      <span className="text-sm text-gray-700">{o.label}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
      )}
    </div>
  );
};

export function PromoTab({ toast }: { toast: (m: string, t: 'ok' | 'err') => void }) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<Partial<Promo>>({
    name: '',
    promoType: 'PERCENT',
    rulePayload: { percentage: 0 },
    validFrom: '',
    validTo: '',
    applicableChannels: [],
    active: true,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [promoRes, channelRes, menuRes] = await Promise.all([
        api.get('/promo'),
        api.get('/channels'),
        api.get('/menu')
      ]);
      setPromos(promoRes.data);
      setChannels(channelRes.data);
      setMenu(menuRes.data);
    } catch (e) {
      toast('Gagal memuat data promo', 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setForm({
      name: '', promoType: 'PERCENT', rulePayload: { percentage: 0 },
      validFrom: '', validTo: '', applicableChannels: channels.map(c => c.id), active: true
    });
    setModal('add');
  };

  const openEdit = (p: Promo) => {
    setForm({
      id: p.id,
      name: p.name,
      promoType: p.promoType,
      rulePayload: p.rulePayload || {},
      validFrom: p.validFrom ? new Date(p.validFrom).toISOString().slice(0, 16) : '',
      validTo: p.validTo ? new Date(p.validTo).toISOString().slice(0, 16) : '',
      applicableChannels: p.applicableChannels || [],
      active: p.active
    });
    setModal('edit');
  };

  const save = async () => {
    if (!form.name) return toast('Nama promo wajib diisi', 'err');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        promoType: form.promoType,
        rulePayload: form.rulePayload,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
        applicableChannels: form.applicableChannels,
        active: form.active
      };

      if (modal === 'add') {
        await api.post('/promo', payload);
        toast('Promo ditambahkan', 'ok');
      } else {
        await api.put(`/promo/${form.id}`, payload);
        toast('Promo diperbarui', 'ok');
      }
      setModal(null);
      loadData();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Gagal menyimpan promo', 'err');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p: Promo) => {
    try {
      setPromos(prev => prev.map(i => i.id === p.id ? { ...i, active: !i.active } : i));
      await api.put(`/promo/${p.id}`, { ...p, active: !p.active });
      toast('Status promo diperbarui', 'ok');
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Gagal update status', 'err');
      loadData();
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm('Hapus promo ini?')) return;
    try {
      await api.delete(`/promo/${id}`);
      toast('Promo dihapus', 'ok');
      loadData();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Gagal menghapus promo', 'err');
    }
  };

  const handlePayloadChange = (key: string, val: any) => {
    setForm(f => ({ ...f, rulePayload: { ...f.rulePayload, [key]: val } }));
  };

  const handleTypeChange = (type: string) => {
    let payload = {};
    if (type === 'PERCENT') payload = { percentage: 0 };
    if (type === 'FIXED_AMOUNT') payload = { amount: 0 };
    if (type === 'VOUCHER_CODE') payload = { code: '', discountType: 'PERCENT', discountValue: 0 };
    if (type === 'BOGO') payload = { buyProductType: 'TOPPING', getProductType: 'TOPPING', getPrice: 0 };
    if (type === 'TIME_WINDOW') payload = { days: [], startTime: '', endTime: '', discountType: 'PERCENT', discountValue: 0 };
    if (type === 'MIN_PURCHASE') payload = { minAmount: 0, discountType: 'PERCENT', discountValue: 0 };
    if (type === 'BUNDLE') payload = { bundleItems: [], discountType: 'PERCENT', discountValue: 0 };

    setForm(f => ({ ...f, promoType: type, rulePayload: payload }));
  };

  const getPromoDesc = (p: Promo) => {
    const pl = p.rulePayload;
    switch (p.promoType) {
      case 'PERCENT': return `Diskon ${pl.percentage}%`;
      case 'FIXED_AMOUNT': return `Diskon ${fmtRp(pl.amount)}`;
      case 'VOUCHER_CODE': return `Kode: ${pl.code} (${pl.discountType === 'PERCENT' ? pl.discountValue + '%' : fmtRp(pl.discountValue)})`;
      case 'BOGO': return `Beli 1 ${pl.buyProductType === 'TOPPING' ? 'Waffle' : 'Minum'} Gratis 1 ${pl.getProductType === 'TOPPING' ? 'Waffle' : 'Minum'} (Rp${pl.getPrice})`;
      case 'TIME_WINDOW': return `Jam ${pl.startTime}-${pl.endTime} (${pl.discountType === 'PERCENT' ? pl.discountValue + '%' : fmtRp(pl.discountValue)})`;
      case 'MIN_PURCHASE': return `Min. ${fmtRp(pl.minAmount)} (${pl.discountType === 'PERCENT' ? pl.discountValue + '%' : fmtRp(pl.discountValue)})`;
      case 'BUNDLE': return `Paket Bundling (${pl.discountType === 'PERCENT' ? pl.discountValue + '%' : fmtRp(pl.discountValue || 0)})`;
      case 'BUY_X_GET_Y': return `Beli ${pl.buyQty} Gratis ${pl.getQty} (Spesial Rp${pl.getPrice})`;
      default: return '-';
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-400" size={22} /></div>;

  const itemOptions = [
    { name: 'Kategori Utama', options: [
      { value: 'CAT_ALL_WAFFLE', label: 'Semua Waffle' },
      { value: 'CAT_ALL_DRINK', label: 'Semua Minuman' },
      { value: 'CAT_SPREAD', label: 'Waffle Series Spread' },
      { value: 'CAT_CRUNCHY', label: 'Waffle Series Crunchy' },
      { value: 'CAT_PREMIUM', label: 'Waffle Series Premium' },
      { value: 'CAT_COFFEE', label: 'Minuman Coffee' },
      { value: 'CAT_NON_COFFEE', label: 'Minuman Non-Coffee' },
    ]},
    { name: 'Waffle Spesifik', options: menu?.toppings?.map((t: any) => ({ value: t.id, label: t.name })) || [] },
    { name: 'Minuman Spesifik', options: menu?.drinks?.map((d: any) => ({ value: d.id, label: d.name })) || [] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl border border-[#ddd3cb]">
        <div>
          <h2 className="text-lg font-semibold text-[#443831] flex items-center gap-2">
            <Tag size={18} className="text-orange-400" /> Manajemen Promo
          </h2>
          <p className="text-xs text-[#7a6f68] mt-1">Buat diskon, buy 1 get 1, voucher, dan aturan promosi lainnya.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-xl transition-all font-medium shadow-lg shadow-orange-900/20">
          <Plus size={16} /> Tambah Promo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promos.map(p => (
          <div key={p.id} className={`p-4 rounded-2xl border transition-all ${p.active ? 'bg-white/80 border-orange-500/30 shadow-lg shadow-orange-900/10' : 'bg-white/40 border-[#ddd3cb] opacity-70'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-gray-800 font-semibold text-base truncate">{p.name}</h3>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${
                  p.promoType === 'VOUCHER_CODE' ? 'bg-purple-50 text-purple-700' :
                  p.promoType === 'BOGO' ? 'bg-green-50 text-green-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {p.promoType.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleStatus(p)} className="p-1.5 rounded-lg bg-white text-[#7a6f68] hover:text-gray-800 transition-colors">
                  {p.active ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg bg-white text-[#7a6f68] hover:text-gray-800 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deletePromo(p.id)} className="p-1.5 rounded-lg bg-white text-[#7a6f68] hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            <div className="bg-[#f4ebe3]/50 p-3 rounded-xl border border-[#ddd3cb]/30 mb-3">
              <p className="text-sm font-medium text-gray-700">{getPromoDesc(p)}</p>
            </div>

            <div className="flex justify-between text-xs text-gray-400 font-medium">
              <span>{p.applicableChannels.length === channels.length ? 'Semua Channel' : `${p.applicableChannels.length} Channel`}</span>
              <span>{p.validFrom ? new Date(p.validFrom).toLocaleDateString('id-ID') : 'Selamanya'}</span>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#ddd3cb] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#ddd3cb]">
              <h3 className="text-gray-800 font-semibold">{modal === 'add' ? 'Tambah Promo Baru' : 'Edit Promo'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#7a6f68]">Nama Promo</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Misal: Diskon Merdeka 17%"
                  className="w-full bg-white border border-[#ddd3cb] rounded-xl px-4 py-2.5 text-gray-800 text-sm outline-none focus:border-orange-500/60" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#7a6f68]">Tipe Promo</label>
                <select value={form.promoType} onChange={e => handleTypeChange(e.target.value)}
                  className="w-full bg-white border border-[#ddd3cb] rounded-xl px-4 py-2.5 text-gray-800 text-sm outline-none">
                  <option value="PERCENT">Diskon Persentase (%)</option>
                  <option value="FIXED_AMOUNT">Diskon Nominal (Rp)</option>
                  <option value="VOUCHER_CODE">Kode Voucher</option>
                  <option value="BOGO">Buy 1 Get 1 (BOGO)</option>
                  <option value="MIN_PURCHASE">Minimum Pembelian</option>
                  <option value="TIME_WINDOW">Flash Sale (Waktu Tertentu)</option>
                  <option value="BUY_X_GET_Y">Buy X Get Y</option>
                  <option value="BUNDLE">Bundling</option>
                </select>
              </div>

              {/* Dynamic Rule Payload */}
              <div className="p-4 bg-[#f4ebe3]/50 rounded-xl border border-[#ddd3cb] space-y-4">
                {form.promoType === 'PERCENT' && (
                  <div>
                    <label className="text-xs font-medium text-[#7a6f68] block mb-1">Besar Diskon (%)</label>
                    <input type="number" value={form.rulePayload?.percentage || ''} onChange={e => handlePayloadChange('percentage', Number(e.target.value))}
                      className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                  </div>
                )}

                {form.promoType === 'BUNDLE' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[#7a6f68] block mb-1">Syarat Item Bundling</label>
                      <MultiSelectDropdown 
                        options={itemOptions} 
                        value={form.rulePayload?.bundleItems || []} 
                        onChange={(val: any) => handlePayloadChange('bundleItems', val)} 
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Pelanggan harus membeli seluruh item yang dipilih ini untuk mendapat diskon paket bundling.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Tipe Potongan</label>
                        <select value={form.rulePayload?.discountType || 'PERCENT'} onChange={e => handlePayloadChange('discountType', e.target.value)}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
                          <option value="PERCENT">Persentase (%)</option>
                          <option value="FIXED_AMOUNT">Nominal (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Nilai Potongan</label>
                        <input type="number" value={form.rulePayload?.discountValue || ''} onChange={e => handlePayloadChange('discountValue', Number(e.target.value))}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                      </div>
                    </div>
                  </>
                )}

                {form.promoType === 'FIXED_AMOUNT' && (
                  <div>
                    <label className="text-xs font-medium text-[#7a6f68] block mb-1">Nominal Potongan (Rp)</label>
                    <input type="number" value={form.rulePayload?.amount || ''} onChange={e => handlePayloadChange('amount', Number(e.target.value))}
                      className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                  </div>
                )}

                {form.promoType === 'VOUCHER_CODE' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[#7a6f68] block mb-1">Kode Voucher</label>
                      <input type="text" value={form.rulePayload?.code || ''} onChange={e => handlePayloadChange('code', e.target.value.toUpperCase())}
                        placeholder="Contoh: MERDEKA17"
                        className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none uppercase font-mono tracking-widest" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Tipe Potongan</label>
                        <select value={form.rulePayload?.discountType || 'PERCENT'} onChange={e => handlePayloadChange('discountType', e.target.value)}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
                          <option value="PERCENT">Persentase (%)</option>
                          <option value="FIXED_AMOUNT">Nominal (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Nilai Potongan</label>
                        <input type="number" value={form.rulePayload?.discountValue || ''} onChange={e => handlePayloadChange('discountValue', Number(e.target.value))}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                      </div>
                    </div>
                  </>
                )}

                {form.promoType === 'BOGO' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Item yang Dibeli (Buy)</label>
                        <select value={form.rulePayload?.buyProductType || 'TOPPING'} onChange={e => handlePayloadChange('buyProductType', e.target.value)}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
                          <option value="TOPPING">Waffle</option>
                          <option value="DRINK">Minuman</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Item Gratis (Get)</label>
                        <select value={form.rulePayload?.getProductType || 'TOPPING'} onChange={e => handlePayloadChange('getProductType', e.target.value)}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
                          <option value="TOPPING">Waffle</option>
                          <option value="DRINK">Minuman</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#7a6f68] block mb-1">Harga Item Gratis</label>
                      <input type="number" value={form.rulePayload?.getPrice || 0} onChange={e => handlePayloadChange('getPrice', Number(e.target.value))}
                        className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                      <p className="text-[10px] text-gray-400 mt-1">Biarkan 0 untuk gratis sepenuhnya. Jika ingin Get dengan harga Rp5.000, isi 5000.</p>
                    </div>
                  </>
                )}

                {form.promoType === 'BUY_X_GET_Y' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Jumlah Beli (X)</label>
                        <input type="number" min="1" value={form.rulePayload?.buyQty || 1} onChange={e => handlePayloadChange('buyQty', Number(e.target.value))}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Jumlah Dapat (Y)</label>
                        <input type="number" min="1" value={form.rulePayload?.getQty || 1} onChange={e => handlePayloadChange('getQty', Number(e.target.value))}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Syarat Item Dibeli</label>
                        <MultiSelectDropdown 
                          value={form.rulePayload?.buyItems || []}
                          onChange={(val: any) => handlePayloadChange('buyItems', val)}
                          options={itemOptions}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Pilihan Item Gratis</label>
                        <MultiSelectDropdown 
                          value={form.rulePayload?.getItems || []}
                          onChange={(val: any) => handlePayloadChange('getItems', val)}
                          options={itemOptions}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-[#7a6f68] block mb-1">Harga Item Gratis</label>
                      <input type="number" value={form.rulePayload?.getPrice || 0} onChange={e => handlePayloadChange('getPrice', Number(e.target.value))}
                        className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                      <p className="text-[10px] text-gray-400 mt-1">Biarkan 0 untuk gratis sepenuhnya. Jika ingin Get dengan harga Rp5.000, isi 5000.</p>
                    </div>
                  </>
                )}

                {form.promoType === 'MIN_PURCHASE' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[#7a6f68] block mb-1">Minimum Pembelian (Rp)</label>
                      <input type="number" value={form.rulePayload?.minAmount || ''} onChange={e => handlePayloadChange('minAmount', Number(e.target.value))}
                        className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Tipe Potongan</label>
                        <select value={form.rulePayload?.discountType || 'PERCENT'} onChange={e => handlePayloadChange('discountType', e.target.value)}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
                          <option value="PERCENT">Persentase (%)</option>
                          <option value="FIXED_AMOUNT">Nominal (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Nilai Potongan</label>
                        <input type="number" value={form.rulePayload?.discountValue || ''} onChange={e => handlePayloadChange('discountValue', Number(e.target.value))}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                      </div>
                    </div>
                  </>
                )}

                {form.promoType === 'TIME_WINDOW' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Jam Mulai</label>
                        <input type="time" value={form.rulePayload?.startTime || ''} onChange={e => handlePayloadChange('startTime', e.target.value)}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none scheme-light" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Jam Selesai</label>
                        <input type="time" value={form.rulePayload?.endTime || ''} onChange={e => handlePayloadChange('endTime', e.target.value)}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none scheme-light" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Tipe Potongan</label>
                        <select value={form.rulePayload?.discountType || 'PERCENT'} onChange={e => handlePayloadChange('discountType', e.target.value)}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none">
                          <option value="PERCENT">Persentase (%)</option>
                          <option value="FIXED_AMOUNT">Nominal (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#7a6f68] block mb-1">Nilai Potongan</label>
                        <input type="number" value={form.rulePayload?.discountValue || ''} onChange={e => handlePayloadChange('discountValue', Number(e.target.value))}
                          className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2 text-gray-800 text-sm outline-none" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#7a6f68] block mb-1">Masa Aktif Mulai</label>
                  <input type="datetime-local" value={form.validFrom || ''} onChange={e => setForm({ ...form, validFrom: e.target.value })}
                    className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2.5 text-gray-800 text-sm outline-none scheme-light" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#7a6f68] block mb-1">Masa Aktif Selesai</label>
                  <input type="datetime-local" value={form.validTo || ''} onChange={e => setForm({ ...form, validTo: e.target.value })}
                    className="w-full bg-white border border-[#ddd3cb] rounded-xl px-3 py-2.5 text-gray-800 text-sm outline-none scheme-light" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#7a6f68] block mb-2">Berlaku untuk Channel</label>
                <div className="flex flex-wrap gap-2">
                  {channels.map(c => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 bg-[#f4ebe3]/40 rounded-xl border border-gray-300/30 cursor-pointer hover:bg-[#f4ebe3]/60 transition-colors">
                      <input type="checkbox"
                        checked={(form.applicableChannels || []).includes(c.id)}
                        onChange={(e) => {
                          const arr = form.applicableChannels || [];
                          if (e.target.checked) setForm({ ...form, applicableChannels: [...arr, c.id] });
                          else setForm({ ...form, applicableChannels: arr.filter(id => id !== c.id) });
                        }}
                        className="accent-orange-500 w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700 font-medium">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
            
            <div className="flex justify-end gap-3 p-5 border-t border-[#ddd3cb]">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl bg-[#f4ebe3] text-gray-700 hover:bg-gray-200 text-sm font-medium transition-colors">
                Batal
              </button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Promo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

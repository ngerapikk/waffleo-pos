import { formatRupiah } from '../../utils/format';
import { Trash2, Plus, Minus, User as UserIcon, ScrollText, ChevronDown, CheckCircle2, XCircle, Tag } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { OverpaidModal } from '../orders/OverpaidModal';
import { PaymentModal } from '../orders/PaymentModal';

export const Cart = () => {
  const { 
    items, channelId, customerData, notes, channels,
    setChannel, setCustomerData, setNotes, updateQty, removeItem, clearCart, getSubtotal, getDiscount, fetchChannels, getItemUnitPrice, setAppliedPromo,
    editingOrderId, editingOrderNumber, editingPreviousTotal, editingWasPaid, editingPaidAmount, cancelEdit, appliedPromo
  } = useCartStore();

  const navigate = useNavigate();
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success' | 'error' | 'warning' | 'info'}[]>([]);
  const [overpaidData, setOverpaidData] = useState<{amount: number, orderId: string} | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [promoModal, setPromoModal] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const subtotal = getSubtotal();
  const discountAmount = getDiscount();
  const finalTotal = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    fetchChannels();
    api.get('/promo').then(res => setAvailablePromos(res.data.filter((p: any) => p.active))).catch(console.error);
  }, [fetchChannels]);

  // Auto-set prefix based on channel (primarily for initial load)
  useEffect(() => {
    const currentChannel = channels.find(c => c.id === channelId);
    if (currentChannel?.customerPrefix) {
      if (!customerData.startsWith(currentChannel.customerPrefix)) {
        setCustomerData(currentChannel.customerPrefix);
      }
    }
  }, [channelId, channels]);

  const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newChannelId = e.target.value;
    setChannel(newChannelId);
    
    const newChannel = channels.find(c => c.id === newChannelId);
    if (newChannel?.customerPrefix) {
      setCustomerData(newChannel.customerPrefix);
    } else {
      setCustomerData('');
    }
  };

  const handleCustomerDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    const currentChannel = channels.find(c => c.id === channelId);
    
    if (currentChannel?.customerPrefix) {
      if (!newValue.startsWith(currentChannel.customerPrefix)) {
        newValue = currentChannel.customerPrefix;
      }
    }
    setCustomerData(newValue);
  };

  const handleAddToOrders = async (isPayNow: boolean = false) => {
    if (items.length === 0) return;
    
    try {
      const payload = {
        channelId,
        customerData,
        notes,
        discountId: appliedPromo ? appliedPromo.id : null,
        discountAmount,
        items: items.map(i => ({
          ...(editingOrderId && i.id ? { id: i.id } : {}),
          productType: i.productType,
          toppingId: i.toppingId,
          halfPartnerToppingId: i.halfPartnerToppingId,
          flavourId: i.flavourId,
          drinkId: i.drinkId,
          sweetnessLevelId: i.sweetnessLevelId,
          icedLevelId: i.icedLevelId,
          addonIds: i.addonIds,
          qty: i.qty
        }))
      };

      if (editingOrderId) {
        // Save these values before clearCart() resets them
        const wasPaid = editingWasPaid;
        const previousTotal = editingPreviousTotal;

        const { data } = await api.put(`/orders/${editingOrderId}`, payload);
        clearCart();
        
        if (data.overpaidAmount > 0) {
          setOverpaidData({ amount: data.overpaidAmount, orderId: data.order.id });
        } else {
          if (wasPaid && data.newTotal > previousTotal) {
            setPaymentOrder(data.order);
          } else {
            showToast('Pesanan berhasil diupdate!', 'success');
            navigate('/orders');
          }
        }
      } else {
        const { data } = await api.post('/orders', payload);
        clearCart();
        if (isPayNow) {
          setPaymentOrder(data.order);
        } else {
          showToast('Order berhasil dibuat!', 'info');
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menyimpan pesanan', 'error');
    }
  };

  return (
    <div className="h-full bg-white flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] border-l border-wfl-border relative z-10">
      {/* Toast Notification */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-100 flex flex-col items-center gap-2 transition-all duration-300 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 text-white font-medium ${
            t.type === 'success' ? 'bg-green-500 shadow-green-500/30' : 
            t.type === 'info' ? 'bg-blue-600 shadow-blue-500/30' :
            t.type === 'warning' ? 'bg-yellow-500 shadow-yellow-500/30 text-white' :
            'bg-red-600 shadow-red-500/30'
          }`}>
            {t.type === 'success' && <CheckCircle2 size={20} />}
            {t.type === 'error' && <XCircle size={20} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Cart Header */}
      {editingOrderId && (
        <div className="bg-amber-100 text-amber-800 px-4 py-2 flex justify-between items-center border-b border-amber-200">
          <div className="flex items-center gap-2 font-medium text-sm">
            <span>✏️ Editing #{editingOrderNumber}</span>
          </div>
          <button 
            onClick={cancelEdit}
            className="text-xs bg-amber-200 hover:bg-amber-300 px-2 py-1 rounded transition-colors font-semibold"
          >
            ✕ Batal Edit
          </button>
        </div>
      )}
      <div className="p-4 border-b border-wfl-border bg-wfl-cream/30">
        <h2 className="text-xl font-bold text-wfl-brown flex items-center justify-between">
          <span>{editingOrderId ? 'Edit Pesanan' : 'Current Order'}</span>
          <span className="text-sm font-semibold bg-wfl-orange text-white px-3 py-1 rounded-full">
            {items.length} Items
          </span>
        </h2>
      </div>

      {/* Cart Configuration (Channel & Customer) */}
      <div className="p-4 border-b border-wfl-border bg-wfl-offwhite/50 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Channel Selector */}
          <div className="relative">
            <select
              value={channelId || ''}
              onChange={handleChannelChange}
              className="w-full pl-3 pr-8 py-2 font-semibold border border-wfl-border rounded-lg text-sm focus:outline-none focus:border-wfl-orange/50 focus:ring-1 focus:ring-wfl-orange/50 bg-white appearance-none cursor-pointer text-wfl-brown"
            >
              <option value="" disabled>Media...</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-wfl-text-secondary">
              <ChevronDown size={16} />
            </div>
          </div>

          {/* Customer Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-wfl-text-secondary">
              <UserIcon size={16} />
            </div>
            <input
              type="text"
              placeholder="Cust / Order ID"
              value={customerData}
              onChange={handleCustomerDataChange}
              className="w-full pl-9 pr-3 py-2 border border-wfl-border rounded-lg text-sm focus:outline-none focus:border-wfl-orange/50 focus:ring-1 focus:ring-wfl-orange/50 bg-white"
            />
          </div>
        </div>

        {/* Notes Input */}
        <div className="relative">
          <div className="absolute top-2.5 left-3 pointer-events-none text-wfl-text-secondary">
            <ScrollText size={16} />
          </div>
          <input
            type="text"
            placeholder="Catatan / Notes (opsional)"
            value={notes || ''}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-wfl-border rounded-lg text-sm focus:outline-none focus:border-wfl-orange/50 focus:ring-1 focus:ring-wfl-orange/50 bg-white"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto p-4 space-y-3 bg-wfl-offwhite/20">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-wfl-text-secondary opacity-50">
            <ScrollText size={48} className="mb-4" />
            <p>Cart is empty</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex gap-3 items-start p-3 bg-white border border-wfl-border rounded-xl shadow-sm hover:border-wfl-orange/30 transition-colors">
              {/* Item Info */}
              <div className="flex-2 min-w-0">
                <h4 className="font-semibold text-wfl-text text-sm truncate">{item.name}</h4>
                <p className="text-xs text-wfl-text-secondary line-clamp-1 mb-2">{item.details}</p>
                <div className="font-bold text-wfl-orange text-sm">{formatRupiah(getItemUnitPrice(item) * item.qty)}</div>
              </div>

              {/* Qty Controls */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1 bg-wfl-offwhite border border-wfl-border rounded-lg p-0.5">
                  <button 
                    onClick={() => updateQty(item.id, -1)}
                    className="w-7 h-7 flex items-center justify-center text-wfl-text hover:bg-white hover:text-wfl-red rounded-md transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-semibold text-sm">{item.qty}</span>
                  <button 
                    onClick={() => updateQty(item.id, 1)}
                    className="w-7 h-7 flex items-center justify-center text-wfl-text hover:bg-white hover:text-wfl-green rounded-md transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button 
                  onClick={() => removeItem(item.id)}
                  className="text-wfl-text-secondary hover:text-wfl-red transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Actions */}
      <div className="p-4 border-t border-wfl-border bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        {/* Promo Button */}
        <div className="mb-3">
          <button onClick={() => setPromoModal(true)} className="w-full py-2.5 px-3 flex items-center justify-between border border-orange-200 bg-orange-50/50 rounded-xl hover:bg-orange-50 transition-colors">
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-orange-500" />
              <span className="text-sm font-semibold text-orange-900">{appliedPromo ? appliedPromo.name : 'Gunakan Promo / Voucher'}</span>
            </div>
            {appliedPromo ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-orange-600">-{formatRupiah(discountAmount)}</span>
                <span onClick={(e) => { e.stopPropagation(); setAppliedPromo(null); }} className="text-orange-900/50 hover:text-red-500 bg-orange-200/50 hover:bg-red-100 rounded-full p-0.5 transition-colors"><XCircle size={14}/></span>
              </div>
            ) : (
              <ChevronDown size={18} className="text-orange-500" />
            )}
          </button>
        </div>

        {editingWasPaid && (
          <div className="mb-4 bg-wfl-offwhite/50 p-3 rounded-lg border border-wfl-border text-sm">
            <div className="flex justify-between text-wfl-text-secondary mb-1">
              <span>Sudah dibayar:</span>
              <span>{formatRupiah(editingPaidAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-wfl-text">
              <span>Selisih:</span>
              <span className={finalTotal > editingPaidAmount ? 'text-red-600' : finalTotal < editingPaidAmount ? 'text-wfl-green' : 'text-wfl-text-secondary'}>
                {finalTotal > editingPaidAmount ? `+${formatRupiah(finalTotal - editingPaidAmount)} (kurang)` : 
                 finalTotal < editingPaidAmount ? `-${formatRupiah(editingPaidAmount - finalTotal)} (kelebihan)` : 
                 'Pas'}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-1 mb-4 text-sm font-medium">
          <div className="flex justify-between text-wfl-text-secondary">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Diskon</span>
              <span>-{formatRupiah(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-end pt-2 border-t border-slate-100">
            <span className="text-sm font-semibold text-wfl-text-secondary">{editingOrderId ? 'Total Baru' : 'Total (Est)'}</span>
            <span className="text-2xl font-bold text-wfl-brown">{formatRupiah(finalTotal)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {editingOrderId ? (
            <button 
              onClick={() => handleAddToOrders(false)}
              disabled={items.length === 0}
              className="w-full py-3 px-4 rounded-xl font-bold text-amber-900 bg-amber-400 hover:bg-amber-500 shadow-sm transition-colors disabled:opacity-50"
            >
              Update Pesanan
            </button>
          ) : (
            <>
              <button 
                onClick={() => handleAddToOrders(false)}
                disabled={items.length === 0}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-wfl-brown bg-wfl-cream border border-wfl-cream-dark hover:bg-wfl-cream-dark transition-colors disabled:opacity-50"
              >
                Add to Orders
              </button>
              <button 
                onClick={() => handleAddToOrders(true)}
                disabled={items.length === 0}
                className="flex-2 py-3 px-4 rounded-xl font-bold text-white bg-wfl-green hover:bg-wfl-green-hover shadow-sm transition-colors disabled:opacity-50"
              >
                Pay Now
              </button>
            </>
          )}
        </div>
      </div>

      {overpaidData && (
        <OverpaidModal 
          amount={overpaidData.amount} 
          loading={loading}
          onClose={() => {
            setOverpaidData(null);
            navigate('/orders');
          }} 
          onConfirm={async () => {
            try {
              setLoading(true);
              await api.post(`/orders/${overpaidData.orderId}/refund`, { amount: overpaidData.amount });
              setOverpaidData(null);
              showToast('Kembalian berhasil dicatat', 'success');
              navigate('/orders');
            } catch (err: any) {
              showToast(err.response?.data?.message || 'Gagal memproses kembalian', 'error');
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onClose={() => {
            setPaymentOrder(null);
            showToast('Order berhasil dibuat!', 'info');
            showToast('Pesanan belum dibayar!', 'warning');
          }}
          onSuccess={(msg) => {
            setPaymentOrder(null);
            showToast('Order berhasil dibuat!', 'info');
            showToast(msg, 'success');
          }}
          onError={(msg) => {
            showToast(msg, 'error');
          }}
        />
      )}

      {/* Promo Modal */}
      {promoModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Tag size={18} className="text-orange-500" /> Pilih Promo
              </h3>
              <button onClick={() => setPromoModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                <XCircle size={18} />
              </button>
            </div>
            
            <div className="p-4 bg-orange-50 border-b border-orange-100">
              <label className="text-xs font-semibold text-orange-900 mb-1 block">Kode Voucher</label>
              <div className="flex gap-2">
                <input type="text" value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode voucher"
                  className="flex-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm font-mono uppercase tracking-wide focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400" />
                <button onClick={async () => {
                  try {
                    const res = await api.get(`/promo/validate?code=${voucherCode}`);
                    setAppliedPromo(res.data);
                    setPromoModal(false);
                    showToast('Voucher berhasil digunakan', 'success');
                  } catch (e: any) {
                    showToast(e.response?.data?.message || 'Voucher tidak valid', 'error');
                  }
                }}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">Terapkan</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {availablePromos.filter(p => p.promoType !== 'VOUCHER_CODE').length === 0 ? (
                <div className="text-center py-8 text-slate-400">Tidak ada promo tersedia</div>
              ) : (
                availablePromos.filter(p => p.promoType !== 'VOUCHER_CODE').map(p => {
                  return (
                    <div key={p.id} onClick={() => { setAppliedPromo(p); setPromoModal(false); }} className={`border rounded-xl p-3 cursor-pointer transition-all ${appliedPromo?.id === p.id ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/30'}`}>
                      <h4 className="font-bold text-slate-800">{p.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{
                        p.promoType === 'PERCENT' ? `Diskon ${p.rulePayload.percentage}%` :
                        p.promoType === 'FIXED_AMOUNT' ? `Potongan ${formatRupiah(p.rulePayload.amount)}` :
                        p.promoType === 'BOGO' ? `Beli 1 ${p.rulePayload.buyProductType === 'TOPPING' ? 'Waffle' : 'Minum'} Gratis 1 ${p.rulePayload.getProductType === 'TOPPING' ? 'Waffle' : 'Minum'}` :
                        p.promoType === 'MIN_PURCHASE' ? `Minimal ${formatRupiah(p.rulePayload.minAmount)}` :
                        p.promoType === 'BUNDLE' ? `Paket Bundling (${p.rulePayload.discountType === 'PERCENT' ? p.rulePayload.discountValue + '%' : formatRupiah(p.rulePayload.discountValue || 0)})` :
                        p.promoType === 'BUY_X_GET_Y' ? `Beli ${p.rulePayload.buyQty} Gratis ${p.rulePayload.getQty} (Harga Spesial Rp${p.rulePayload.getPrice || 0})` : 
                        p.promoType
                      }</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

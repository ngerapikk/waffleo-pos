import React, { useState } from 'react';
import { X, ReceiptText, AlertCircle, History, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import type { HistoryOrder } from '../../pages/History';
import { useAuth } from '../../context/AuthContext';
import { RefundModal } from './RefundModal';

interface HistoryDetailModalProps {
  order: HistoryOrder;
  onClose: () => void;
  onRefundSuccess?: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({ order, onClose, onRefundSuccess, showToast }) => {
  const { user } = useAuth();
  const [showRefundModal, setShowRefundModal] = useState(false);

  const calculateLineTotal = (qty: number, unitPrice: string) => {
    return (qty * parseFloat(unitPrice)).toLocaleString('id-ID');
  };

  const calculateSubtotal = () => {
    return order.items.reduce((acc, item) => acc + parseFloat(item.lineTotal), 0);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-wfl-border flex items-center justify-between bg-wfl-cream/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-wfl-border">
              <ReceiptText className="w-5 h-5 text-wfl-brown" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-wfl-text leading-tight">{order.orderNumber}</h2>
              <p className="text-sm text-wfl-text-secondary">
                {format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')} • {order.channel.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {order.status === 'DONE' && !order.refunded && (user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') && (
              <button 
                onClick={() => setShowRefundModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold transition-colors border border-red-200 mr-2"
              >
                <AlertCircle className="w-4 h-4" />
                Refund
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-wfl-text-secondary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {/* Status & Customer Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-wfl-cream/30 p-4 rounded-xl border border-wfl-border">
              <p className="text-xs text-wfl-text-secondary uppercase font-bold tracking-wider mb-1">Status Pesanan</p>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  order.status === 'DONE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {order.status === 'DONE' ? 'Selesai' : 'Batal'}
                </span>
                {order.status === 'CANCELLED' && order.cancelledAt && (
                  <span className="text-xs text-wfl-text-secondary">
                    pada {format(new Date(order.cancelledAt), 'HH:mm')}
                  </span>
                )}
              </div>
              {order.status === 'CANCELLED' && order.cancelReason && (
                <div className="mt-2 text-sm text-red-700 bg-red-50 p-2 rounded-lg border border-red-100">
                  <span className="font-semibold">Alasan:</span> {order.cancelReason}
                </div>
              )}
            </div>
            <div className="bg-wfl-cream/30 p-4 rounded-xl border border-wfl-border">
              <p className="text-xs text-wfl-text-secondary uppercase font-bold tracking-wider mb-1">Info Pelanggan & Kasir</p>
              <p className="text-sm font-semibold text-wfl-text">
                {order.customerData || 'Pelanggan Umum'}
              </p>
              <p className="text-xs text-wfl-text-secondary mt-1">
                Kasir: {order.createdBy.fullName}
              </p>
            </div>
          </div>

          {/* Items */}
          <h3 className="text-sm font-bold text-wfl-text uppercase tracking-wider mb-3">Item Pesanan</h3>
          <div className="space-y-3 mb-6">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start py-3 border-b border-wfl-border last:border-0">
                <div>
                  <p className="font-semibold text-wfl-text">
                    <span className="text-wfl-orange mr-2">{item.qty}x</span>
                    {item.productType === 'TOPPING' ? (
                      item.halfPartnerTopping 
                        ? `${item.topping?.name} & ${item.halfPartnerTopping.name}`
                        : item.topping?.name
                    ) : (
                      item.drink?.name
                    )}
                  </p>
                  <div className="text-sm text-wfl-text-secondary mt-1 flex flex-wrap gap-x-2 gap-y-1">
                    {item.flavour && <span>Flavour: {item.flavour.name}</span>}
                    {item.sweetnessLevel && <span>Sugar: {item.sweetnessLevel.name}</span>}
                    {item.icedLevel && <span>Ice: {item.icedLevel.name}</span>}
                    {item.addons?.map((a: any, i: number) => (
                      <span key={i} className="text-wfl-orange">+{a.addon.name}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-wfl-text">Rp {calculateLineTotal(1, item.lineTotal)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-wfl-text uppercase tracking-wider mb-2">Catatan</h3>
              <div className="bg-yellow-50 text-yellow-800 p-3 rounded-xl text-sm border border-yellow-100">
                {order.notes}
              </div>
            </div>
          )}

          {/* Edit Timeline */}
          {order.editLogs && order.editLogs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-wfl-text uppercase tracking-wider mb-3 flex items-center gap-2">
                <History className="w-4 h-4" /> Riwayat Perubahan
              </h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-wfl-border before:to-transparent">
                {order.editLogs.map((log: any, idx: number) => (
                  <div key={log.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-amber-100 text-amber-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Pencil size={12} />
                    </div>
                    {/* Card */}
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl shadow-sm border border-wfl-border">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-wfl-text">{log.editedBy?.fullName || 'Kasir'}</span>
                        <time className="text-xs text-wfl-text-secondary">{format(new Date(log.editedAt || new Date()), 'dd/MM HH:mm:ss')}</time>
                      </div>
                      <div className="text-xs text-wfl-text-secondary mt-2">
                        <div className="flex justify-between w-full">
                          <span className="line-through mr-1">Rp {Number(log.totalBefore).toLocaleString('id-ID')}</span> 
                          <span className="font-semibold text-wfl-brown">➔ Rp {Number(log.totalAfter).toLocaleString('id-ID')}</span>
                        </div>
                        
                        <div className="mt-3 border-t border-wfl-border pt-2 space-y-2">
                          <div>
                            <span className="font-semibold text-[10px] uppercase text-wfl-text-secondary">Pesanan Awal:</span>
                            <ul className="mt-1 space-y-1">
                              {Array.isArray(log.itemsBefore) && log.itemsBefore.map((ib: any, iidx: number) => (
                                <li key={iidx} className="text-[11px] leading-tight">
                                  {ib.qty}x {ib.name || ib.productType} 
                                  {ib.halfPartner ? ` & ${ib.halfPartner}` : ''}
                                  {ib.prepared ? ' (✔)' : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="font-semibold text-[10px] uppercase text-wfl-text-secondary">Menjadi:</span>
                            <ul className="mt-1 space-y-1">
                              {Array.isArray(log.itemsAfter) && log.itemsAfter.map((ia: any, iidx: number) => (
                                <li key={iidx} className="text-[11px] leading-tight">
                                  {ia.qty}x {ia.name || ia.productType}
                                  {ia.halfPartner ? ` & ${ia.halfPartner}` : ''}
                                  {ia.prepared ? ' (✔)' : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-wfl-cream/50 rounded-2xl p-4 border border-wfl-border">
            <div className="mb-3">
              <span className="block mb-3 font-semibold text-gray-700 text-sm">Rincian Pembayaran</span>
              {(() => {
                if (!order.payments || order.payments.length === 0) {
                  return (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-wfl-text-secondary">Status</span>
                      <span className="font-medium text-red-500">Belum Dibayar</span>
                    </div>
                  );
                }

                // 1. Standardize item format for easy display
                const standardizeItem = (item: any) => {
                  if (item.name) return item; // Already a snapshot from editLogs
                  const snapshot: any = { qty: item.qty };
                  if (item.topping) snapshot.name = item.topping.name;
                  if (item.halfPartner) snapshot.halfPartner = item.halfPartner.name;
                  if (item.drink) snapshot.name = item.drink.name;
                  if (item.flavour) snapshot.flavour = item.flavour.name;
                  return snapshot;
                };

                const formatItemText = (item: any) => {
                  let text = `${item.qty}x ${item.name || item.productType}`;
                  if (item.halfPartner) text += ` & ${item.halfPartner}`;
                  if (item.flavour) text += ` (${item.flavour})`;
                  return text;
                };

                // 2. Build item batches from edit logs
                const itemBatches: { timestamp: string, items: any[] }[] = [];
                
                if (order.editLogs && order.editLogs.length > 0) {
                  itemBatches.push({
                    timestamp: order.createdAt,
                    items: order.editLogs[0].itemsBefore.map(standardizeItem)
                  });

                  for (let i = 0; i < order.editLogs.length; i++) {
                    const log = order.editLogs[i];
                    const addedItems: any[] = [];
                    const beforeList = [...(log.itemsBefore || [])].map(standardizeItem);
                    
                    for (const rawAfter of (log.itemsAfter || [])) {
                      const after = standardizeItem(rawAfter);
                      const matchIdx = beforeList.findIndex(b => 
                        b.name === after.name && 
                        b.halfPartner === after.halfPartner &&
                        b.flavour === after.flavour
                      );
                      
                      if (matchIdx !== -1) {
                        const before = beforeList[matchIdx];
                        if (after.qty > before.qty) {
                          addedItems.push({ ...after, qty: after.qty - before.qty });
                        }
                        beforeList.splice(matchIdx, 1);
                      } else {
                        addedItems.push(after);
                      }
                    }

                    if (addedItems.length > 0) {
                      itemBatches.push({
                        timestamp: log.editedAt,
                        items: addedItems
                      });
                    }
                  }
                } else {
                  itemBatches.push({
                    timestamp: order.createdAt,
                    items: order.items.map(standardizeItem)
                  });
                }

                // 3. Assign batches to payments
                const payments = [...order.payments].sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
                const paymentsWithItems = payments.map(p => ({
                  ...p,
                  assignedItems: [] as any[]
                }));

                itemBatches.forEach(batch => {
                  const batchTime = new Date(batch.timestamp).getTime();
                  // Give a 5 second buffer for payment processing time, just in case
                  const payment = paymentsWithItems.find(p => new Date(p.paidAt).getTime() + 5000 >= batchTime);
                  if (payment) {
                    payment.assignedItems.push(...batch.items);
                  }
                });

                // 4. Group by payment method
                const groupedByMethod: Record<string, typeof paymentsWithItems> = {};
                paymentsWithItems.forEach(p => {
                   const methodDisplay = p.method === 'CASH_QRIS' ? 'Split (Cash + QRIS)' : p.method;
                   if (!groupedByMethod[methodDisplay]) groupedByMethod[methodDisplay] = [];
                   groupedByMethod[methodDisplay].push(p);
                });

                return (
                  <div className="space-y-4 mt-4">
                    {Object.entries(groupedByMethod).map(([method, methodPayments]) => (
                      <div key={method} className="pb-4 border-b border-wfl-border/50 last:border-0 last:pb-0">
                        <div className="font-bold text-wfl-text flex items-center gap-2 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-wfl-brown"></span>
                          {method}
                        </div>
                        <div className="space-y-4 pl-3 border-l-2 border-wfl-cream/80 ml-0.5">
                          {methodPayments.map((p, pIdx) => {
                            const amount = p.method === 'CASH_QRIS' 
                              ? Number(p.cashAmount) - Number(p.changeGiven) + Number(p.qrisAmount)
                              : Number(p.totalTendered) - Number(p.changeGiven);
                            
                            return (
                              <div key={p.id || pIdx} className="space-y-1.5">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-semibold text-wfl-text text-sm">
                                      Rp {amount.toLocaleString('id-ID')}
                                    </div>
                                    {p.method === 'CASH_QRIS' && (
                                      <div className="text-[10px] text-gray-500 font-medium">
                                        (Cash: Rp {(Number(p.cashAmount) - Number(p.changeGiven)).toLocaleString('id-ID')} + QRIS: Rp {Number(p.qrisAmount).toLocaleString('id-ID')})
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-wfl-text-secondary font-medium">
                                    {format(new Date(p.paidAt), 'dd/MM HH:mm')}
                                  </div>
                                </div>
                                
                                {p.assignedItems.length > 0 && (
                                  <ul className="text-[12px] text-wfl-text-secondary space-y-0.5 pt-1">
                                    {p.assignedItems.map((item: any, iIdx: number) => (
                                      <li key={iIdx}>• {formatItemText(item)}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="pt-3 border-t border-wfl-border space-y-1">
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between items-center text-sm font-medium text-wfl-text-secondary">
                  <span>Subtotal</span>
                  <span>Rp {calculateSubtotal().toLocaleString('id-ID')}</span>
                </div>
              )}
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between items-center text-sm font-medium text-red-500">
                  <span>Diskon {order.discount?.name ? `(${order.discount.name})` : ''}</span>
                  <span>- Rp {Number(order.discountAmount).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold text-wfl-brown pt-2">
                <span>Total</span>
                <span>Rp {(calculateSubtotal() - (Number(order.discountAmount) || 0)).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRefundModal && (
        <RefundModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          onClose={() => setShowRefundModal(false)}
          onSuccess={(msg) => {
            if (showToast) showToast(msg, 'success');
            else alert(msg);
            setShowRefundModal(false);
            if (onRefundSuccess) onRefundSuccess();
            onClose(); // Close the history detail modal to trigger a refresh
          }}
          onError={(msg) => {
            if (showToast) showToast(msg, 'error');
            else alert(msg);
          }}
        />
      )}
    </div>
  );
};

import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { format } from 'date-fns';
import { PaymentModal } from '../components/orders/PaymentModal';
import { OverpaidModal } from '../components/orders/OverpaidModal';
import { CancelOrderModal } from '../components/orders/CancelOrderModal';
import { ReceiptPrint } from '../components/orders/ReceiptPrint';
import { ChefHat, CheckCircle2, XCircle, Printer, Check, Banknote, Pencil, PackageOpen } from 'lucide-react';
import { Skeleton } from '../components/common/Skeleton';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';

interface OrderItem {
  id: string;
  productType: string;
  topping?: { name: string };
  halfPartner?: { name: string };
  flavour?: { name: string };
  drink?: { name: string };
  addons: { addon: { name: string } }[];
  sweetnessLevel?: { name: string };
  icedLevel?: { name: string };
  qty: number;
  unitPrice: string;
  lineTotal: string;
  prepared: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  customerData: string;
  status: string;
  paymentStatus: string;
  prepared: boolean;
  notes: string;
  channel: { name: string };
  items: OrderItem[];
  payments: { totalTendered: string; changeGiven: string }[];
  discountId?: string;
  discountAmount?: string | number | null;
  discount?: any;
  createdAt: string;
}

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [overpaidData, setOverpaidData] = useState<{ amount: number; orderId: string } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success' | 'error' | 'warning' | 'info'}[]>([]);
  
  const navigate = useNavigate();
  const loadOrderForEdit = useCartStore(state => state.loadOrderForEdit);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };
  
  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data.orders);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Determine WebSocket URL from API URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl = 'ws://localhost:3001/ws';
    if (import.meta.env.VITE_API_URL) {
      try {
        const url = new URL(import.meta.env.VITE_API_URL);
        wsUrl = `${wsProtocol}//${url.host}/ws`;
      } catch (e) {
        console.error('Invalid VITE_API_URL');
      }
    }

    const connectWebSocket = () => {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('🔗 Connected to Waffleo POS WebSocket');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ORDER_UPDATED') {
            fetchOrders();
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket closed, attempting reconnect in 3s...');
        setTimeout(connectWebSocket, 3000); // basic reconnect
      };

      return socket;
    };

    const socket = connectWebSocket();

    return () => {
      socket.onclose = null; // Prevent reconnect on unmount
      socket.close();
    };
  }, [fetchOrders]);

  const handlePrepare = async (id: string) => {
    try {
      await api.post(`/orders/${id}/prepare`);
      fetchOrders();
      showToast('Order is being prepared', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to prepare order', 'error');
    }
  };

  const handleDone = async (id: string) => {
    try {
      await api.post(`/orders/${id}/done`);
      fetchOrders();
      showToast('Order completed!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to complete order', 'error');
    }
  };

  const handleCancel = (id: string) => {
    setCancelOrderId(id);
  };

  const onCancelSuccess = (msg: string) => {
    fetchOrders();
    showToast(msg, 'success');
  };

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setPrintingOrder(null);
    }, 300);
  };

  const handleEdit = (order: Order) => {
    loadOrderForEdit(order);
    navigate('/pos');
  };

  if (loading && orders.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col bg-gray-50">
        <div className="flex justify-between items-end mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-col space-y-4 pb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row overflow-hidden min-h-40">
              <div className="bg-gray-800 p-4 md:w-64 shrink-0 flex flex-col gap-2">
                <Skeleton className="h-6 w-3/4 bg-gray-600" />
                <Skeleton className="h-4 w-1/2 bg-gray-600" />
                <Skeleton className="h-4 w-20 bg-gray-600 mt-auto" />
              </div>
              <div className="p-4 flex-1 flex flex-col gap-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="bg-gray-50 p-4 md:w-48 shrink-0 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-gray-100 gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 relative">
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

      {cancelOrderId && (
        <CancelOrderModal
          orderId={cancelOrderId}
          onClose={() => setCancelOrderId(null)}
          onSuccess={onCancelSuccess}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {overpaidData && (
        <OverpaidModal 
          amount={overpaidData.amount} 
          loading={modalLoading}
          onClose={() => setOverpaidData(null)}
          onConfirm={async () => {
            try {
              setModalLoading(true);
              await api.post(`/orders/${overpaidData.orderId}/refund`, { amount: overpaidData.amount });
              setOverpaidData(null);
              showToast('Kembalian berhasil dicatat', 'success');
              fetchOrders();
            } catch (err: any) {
              showToast(err.response?.data?.message || 'Gagal memproses kembalian', 'error');
            } finally {
              setModalLoading(false);
            }
          }}
        />
      )}

      <div className="flex justify-between items-end mb-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Live Queue</h1>
        <div className="text-sm text-gray-500 font-medium">Auto-refresh every 5s</div>
      </div>
      
      {orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
            <PackageOpen size={48} className="text-gray-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg text-gray-600">Antrean Kosong</p>
            <p className="text-sm">Belum ada pesanan yang masuk ke antrean saat ini.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-4 overflow-y-auto pb-8">
          {orders.map(order => {
            const subtotal = order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
            const total = subtotal - (Number(order.discountAmount) || 0);
            const paid = order.payments?.reduce((sum, p) => sum + Number(p.totalTendered) - Number(p.changeGiven), 0) || 0;
            const isOverpaid = paid > total;
            const overpaidAmount = paid - total;
            
            return (
              <div key={order.id} className="shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="bg-gray-800 text-white p-4 md:w-64 shrink-0 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-lg">{order.customerData || 'Walk-In'}</div>
                    <div className="text-xs font-semibold bg-gray-700 px-2 py-1 rounded-md whitespace-nowrap">{order.channel.name}</div>
                  </div>
                  <div className="text-sm text-gray-300 font-mono mb-auto">{order.orderNumber}</div>
                  <div className="text-xs text-gray-400 mt-4">{format(new Date(order.createdAt), 'HH:mm:ss')}</div>
                </div>

                {/* Items */}
                <div className="p-4 flex-1 md:border-r border-gray-100 min-w-0">
                  <ul className="space-y-2">
                    {order.items.map(item => {
                      const details = [];
                      if (item.flavour) details.push(item.flavour.name);
                      item.addons.forEach(a => details.push(a.addon.name));
                      if (item.sweetnessLevel) details.push(`${item.sweetnessLevel.name} Sugar`);
                      if (item.icedLevel) details.push(`${item.icedLevel.name} Ice`);
                      
                      return (
                        <li key={item.id} className="text-sm">
                          <div className="font-bold text-gray-800 text-[15px] flex items-center gap-2">
                            <span>
                              {item.qty}x {item.productType === 'TOPPING' ? (
                                <>
                                  {item.halfPartner ? `Half ${item.topping?.name} & Half ${item.halfPartner?.name}` : item.topping?.name}
                                </>
                              ) : item.drink?.name}
                            </span>
                            {!order.prepared && item.prepared && (
                              <Check size={18} className="text-green-500 stroke-3" />
                            )}
                          </div>
                          {details.length > 0 && (
                            <div className="text-gray-500 text-[13px] ml-5 mt-0.5 leading-snug">
                              + {details.join(', ')}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {order.notes && (
                    <div className="mt-4 text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100">
                      <strong>Notes:</strong> {order.notes}
                    </div>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="p-4 bg-gray-50 md:w-64 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100">
                  <div className="flex justify-between items-start mb-auto w-full gap-2 flex-wrap">
                    <div className="flex space-x-2 flex-wrap gap-y-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {order.paymentStatus}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${order.prepared ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {order.prepared ? 'PREPARED' : 'WAITING'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-auto gap-0.5">
                      {Number(order.discountAmount) > 0 && (
                        <div className="text-[10px] text-gray-400 line-through">
                          Rp{subtotal.toLocaleString('id-ID')}
                        </div>
                      )}
                      <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold tracking-tight text-sm shadow-sm">
                        Rp{total.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end mt-4">

                    
                    <div className="flex space-x-2 w-full justify-end">
                      {!order.prepared && (
                        <button 
                          onClick={() => handlePrepare(order.id)}
                          title="Prepare Order"
                          className="p-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 active:bg-blue-300 transition-colors"
                        >
                          <ChefHat size={20} />
                        </button>
                      )}
                      
                      {order.prepared && order.paymentStatus === 'PAID' && !isOverpaid && (
                        <button 
                          onClick={() => handleDone(order.id)}
                          title="Done (Give to Customer)"
                          className="p-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 active:bg-green-300 transition-colors"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                      )}
                      
                      {isOverpaid && (
                        <button
                          onClick={() => setOverpaidData({ amount: overpaidAmount, orderId: order.id })}
                          title="Proses Kembalian"
                          className="p-2.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 active:bg-amber-300 transition-colors"
                        >
                          <Banknote size={20} />
                        </button>
                      )}

                      {order.paymentStatus === 'UNPAID' && (
                        <button 
                          onClick={() => setPaymentOrder(order)}
                          title="Pay Order"
                          className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 active:bg-indigo-300 transition-colors"
                        >
                          <Banknote size={20} />
                        </button>
                      )}

                      {order.prepared && order.paymentStatus === 'PAID' && (
                        <button 
                          onClick={() => handlePrint(order)}
                          title="Print Receipt"
                          className="p-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
                        >
                          <Printer size={20} />
                        </button>
                      )}

                      <button 
                        onClick={() => handleEdit(order)}
                        title="Edit Order"
                        className="p-2.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 active:bg-amber-200 transition-colors"
                      >
                        <Pencil size={20} />
                      </button>

                      <button 
                        onClick={() => handleCancel(order.id)}
                        title="Cancel Order"
                        className="p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 active:bg-red-200 transition-colors"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paymentOrder && (
        <PaymentModal 
          order={paymentOrder}
          onClose={() => {
            setPaymentOrder(null);
            showToast('Pesanan belum dibayar!', 'warning');
          }}
          onSuccess={(msg) => {
            setPaymentOrder(null);
            fetchOrders();
            showToast(msg, 'success');
          }}
          onError={(msg) => {
            showToast(msg, 'error');
          }}
        />
      )}

      {/* Print Receipt Container */}
      {printingOrder && createPortal(
        <div className="print-only">
          <style type="text/css">
            {`
              @media print {
                @page { 
                  size: 80mm auto; 
                  margin: 0; 
                }
                body > #root { 
                  display: none !important; 
                }
                body { 
                  background: white; 
                  margin: 0; 
                  padding: 0; 
                }
                .print-only { 
                  display: block !important; 
                  width: 80mm; 
                  margin: 0; 
                  padding: 0; 
                }
              }
              @media screen {
                .print-only {
                  display: none;
                }
              }
            `}
          </style>
          <ReceiptPrint order={printingOrder} />
        </div>,
        document.body
      )}
    </div>
  );
};

import React from 'react';
import { format } from 'date-fns';

interface ReceiptPrintProps {
  order: any;
}

export const ReceiptPrint: React.FC<ReceiptPrintProps> = ({ order }) => {
  if (!order) return null;

  const total = order.items.reduce((sum: number, item: any) => sum + Number(item.lineTotal), 0);

  return (
    <div style={{ width: '80mm', margin: '0 auto' }} className="p-4 text-black font-mono text-sm bg-white">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="font-bold text-xl mb-1">WAFFLEO</h1>
        <p className="text-xs">Fresh & Delicious</p>
      </div>
      
      <div className="border-t border-dashed border-black my-2"></div>
      
      {/* Order Info */}
      <div className="text-xs mb-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Waktu:</span>
          <span>{format(new Date(order.createdAt), 'dd/MM/yy HH:mm')}</span>
        </div>
        <div className="flex justify-between">
          <span>No Order:</span>
          <span>{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer:</span>
          <span>{order.customerData || 'Walk-In'}</span>
        </div>
        <div className="flex justify-between">
          <span>Pesanan:</span>
          <span>{order.channel?.name || '-'}</span>
        </div>
      </div>
      
      <div className="border-t border-dashed border-black my-2"></div>
      
      {/* Items */}
      <div className="mb-2 text-xs">
        {order.items.map((item: any) => {
          const details = [];
          if (item.flavour) details.push(item.flavour.name);
          item.addons.forEach((a: any) => details.push(a.addon.name));
          if (item.sweetnessLevel) details.push(`${item.sweetnessLevel.name} Sugar`);
          if (item.icedLevel) details.push(`${item.icedLevel.name} Ice`);
          
          const itemName = item.productType === 'TOPPING' ? (
            item.halfPartner ? `Half ${item.topping?.name} & Half ${item.halfPartner?.name}` : item.topping?.name
          ) : item.drink?.name;

          return (
            <div key={item.id} className="mb-2">
              <div className="flex justify-between font-bold">
                <span className="flex-1 pr-2">{item.qty}x {itemName}</span>
                <span className="shrink-0">Rp{Number(item.lineTotal).toLocaleString('id-ID')}</span>
              </div>
              {details.length > 0 && (
                <div className="text-[10px] text-gray-800 pl-4 mt-0.5">
                  + {details.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="border-t border-dashed border-black my-2"></div>
      
      {/* Totals */}
      <div className="text-sm font-bold flex justify-between mb-2">
        <span>TOTAL</span>
        <span>Rp{total.toLocaleString('id-ID')}</span>
      </div>

      {order.payments && order.payments.length > 0 && (
        <div className="text-xs space-y-0.5 mt-1 border-t border-dashed border-gray-400 pt-2">
          {order.payments.map((p: any, i: number) => (
            <div key={p.id || i}>
              <div className="flex justify-between">
                <span>Dibayar ({p.method === 'CASH_QRIS' ? 'Cash + QRIS' : p.method}):</span>
                <span>Rp{Number(p.totalTendered).toLocaleString('id-ID')}</span>
              </div>
              {p.method === 'CASH_QRIS' && (
                <div className="text-[10px] text-gray-800 pl-2 mt-0.5 mb-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>- Cash:</span>
                    <span>Rp{Number(p.cashAmount || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- QRIS:</span>
                    <span>Rp{Number(p.qrisAmount || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between mt-0.5">
                <span>Kembalian:</span>
                <span>Rp{Number(p.changeGiven).toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="border-t border-dashed border-black my-2"></div>
      
      {/* Footer */}
      <div className="text-center text-xs mt-4 space-y-1">
        <p className="font-bold">Terima kasih!</p>
        <p>Silakan datang kembali</p>
      </div>
    </div>
  );
};

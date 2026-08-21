import React, { useState } from 'react';
import { X, Ticket, Copy, Check, QrCode, Sparkles, AlertCircle, ShoppingBag } from 'lucide-react';
import { Voucher } from '../types';

interface VoucherWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  onUseVoucher: (id: string) => void;
}

export const VoucherWalletModal: React.FC<VoucherWalletModalProps> = ({
  isOpen,
  onClose,
  vouchers,
  onUseVoucher,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] bg-gradient-to-b from-[#091B3A] via-[#07152E] to-[#040C1A] border-2 border-amber-400/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-amber-100">
        {/* Header */}
        <div className="p-4 pb-3 border-b border-amber-500/20 bg-gradient-to-r from-[#0E2752] to-[#091B3A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-amber-200 tracking-wide">
                My CHAGEE Vouchers
              </h3>
              <p className="text-[11px] text-amber-300/70">
                {vouchers.filter((v) => !v.used).length} Active Discounts Available
              </p>
            </div>
          </div>

          <button
            id="close-vouchers-btn"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-200 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Vouchers List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {vouchers.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0B2144] border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <Ticket className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-amber-200">No Vouchers Yet</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Play the 3D Golden Maze challenge! Every participant is guaranteed a 20% discount voucher upon game completion.
              </p>
            </div>
          ) : (
            vouchers.map((voucher) => (
              <div
                key={voucher.id}
                className={`relative rounded-2xl border transition-all overflow-hidden ${
                  voucher.used
                    ? 'bg-slate-900/60 border-slate-800 opacity-60'
                    : 'bg-gradient-to-br from-[#0D244A] via-[#091A38] to-[#061226] border-amber-400/60 shadow-lg'
                }`}
              >
                {/* Coupon Cut-out aesthetic notch */}
                <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#07152E] border-r border-amber-400/40"></div>
                <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#07152E] border-l border-amber-400/40"></div>

                <div className="p-3.5 pl-5 pr-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-amber-300">
                          {voucher.discount}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                          Fresh Milk Tea
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 mt-0.5">
                        {voucher.title}
                      </h4>
                      <p className="text-[10px] text-slate-300/80 mt-0.5">
                        {voucher.description}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-[9px] text-amber-300/70 font-mono">
                        Valid till: {voucher.expiryDate}
                      </span>
                      {voucher.used ? (
                        <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          REDEEMED
                        </span>
                      ) : (
                        <button
                          id={`show-barcode-${voucher.id}`}
                          onClick={() => setSelectedVoucher(voucher)}
                          className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 text-[11px] font-bold shadow-md active:scale-95 transition-all"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>Use in Store</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Promo Code Copy Bar */}
                  {!voucher.used && (
                    <div className="mt-3 pt-2.5 border-t border-dashed border-amber-400/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-mono text-amber-200">
                        <span className="text-[10px] text-slate-400">PROMO CODE:</span>
                        <strong className="tracking-wider bg-[#06142B] px-1.5 py-0.5 rounded border border-amber-500/30">
                          {voucher.code}
                        </strong>
                      </div>

                      <button
                        id={`copy-code-${voucher.id}`}
                        onClick={() => handleCopyCode(voucher.code, voucher.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200"
                      >
                        {copiedId === voucher.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Voucher Modal Popup (Barcode & QR View) */}
        {selectedVoucher && (
          <div className="absolute inset-0 z-50 bg-[#061226]/95 backdrop-blur-md p-5 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-full max-w-xs bg-white text-slate-900 rounded-3xl p-5 shadow-2xl relative">
              <button
                id="close-qr-view-btn"
                onClick={() => setSelectedVoucher(null)}
                className="absolute top-3 right-3 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg mb-2">
                茶
              </div>

              <h4 className="font-extrabold text-sm text-slate-900">
                CHAGEE 霸王茶姬
              </h4>
              <p className="text-xs font-bold text-amber-600">
                20% OFF Fresh Milk Tea Voucher
              </p>

              {/* Simulated QR Code */}
              <div className="my-4 p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl inline-block">
                <div className="w-36 h-36 bg-slate-900 p-2 rounded-xl grid grid-cols-6 gap-1">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm ${
                        (i % 2 === 0 || i % 5 === 0) && i !== 14
                          ? 'bg-amber-300'
                          : 'bg-slate-950'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Barcode Mock */}
              <div className="w-full bg-slate-100 p-2 rounded-lg mb-3">
                <div className="h-8 flex justify-between items-stretch gap-0.5 px-2">
                  {Array.from({ length: 32 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`bg-slate-900 ${
                        idx % 3 === 0 ? 'w-1' : idx % 5 === 0 ? 'w-1.5' : 'w-0.5'
                      }`}
                    ></div>
                  ))}
                </div>
                <div className="font-mono text-xs font-bold text-slate-700 tracking-widest mt-1">
                  {selectedVoucher.code}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mb-4">
                Scan at cashier or enter promo code during mobile checkout.
              </p>

              <button
                id="apply-voucher-done-btn"
                onClick={() => {
                  onUseVoucher(selectedVoucher.id);
                  setSelectedVoucher(null);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
              >
                Mark as Redeemed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useAppData } from '@/lib/AppDataContext';
import { Loader2, Plus, Send, Trash2 } from 'lucide-react';

export interface WaybillItemForm {
  assetId?: string;
  description: string;
  serialNumber: string;
  qty: number;
  purpose: string;
}

export interface WaybillFormData {
  date: string;
  companyName: string;
  companyAddress: string;
  recipientName: string;
  expectedReturn: string;
  items: WaybillItemForm[];
}

interface WaybillFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WaybillFormData) => Promise<void>;
}

const EMPTY_ITEM: WaybillItemForm = { description: '', serialNumber: '', qty: 1, purpose: '' };

export default function WaybillFormModal({ open, onClose, onSubmit }: WaybillFormModalProps) {
  const { assets } = useAppData();

  const today = new Date().toISOString().split('T')[0];
  const [date,           setDate]           = useState(today);
  const [companyName,    setCompanyName]    = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [recipientName,  setRecipientName]  = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [items,          setItems]          = useState<WaybillItemForm[]>([{ ...EMPTY_ITEM }]);
  const [error,          setError]          = useState('');
  const [saving,         setSaving]         = useState(false);

  useEffect(() => {
    if (open) {
      setDate(today);
      setCompanyName('');
      setCompanyAddress('');
      setRecipientName('');
      setExpectedReturn('');
      setItems([{ ...EMPTY_ITEM }]);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setItem(i: number, patch: Partial<WaybillItemForm>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  // When the user types/picks an asset tag, autofill description + serial.
  function handleAssetPick(i: number, value: string) {
    const tag = value.split(' — ')[0].trim();
    const asset = assets.find((a) => a.assetTag === tag);
    if (asset) {
      setItem(i, {
        assetId:      asset.id,
        description:  `${asset.name} (${asset.assetTag})`,
        serialNumber: asset.serialNumber,
      });
    } else {
      setItem(i, { assetId: undefined });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!companyName.trim())   { setError("Company's name is required."); return; }
    if (!recipientName.trim()) { setError('Recipient name is required.'); return; }
    const cleanItems = items.filter((it) => it.description.trim());
    if (cleanItems.length === 0) { setError('Add at least one item.'); return; }

    setSaving(true);
    try {
      await onSubmit({
        date,
        companyName:    companyName.trim(),
        companyAddress: companyAddress.trim(),
        recipientName:  recipientName.trim(),
        expectedReturn,
        items:          cleanItems,
      });
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create waybill');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Waybill"
      subtitle="Routed to the IT manager, then Security, for approval."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Date <span className="text-red-500">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="form-input" />
          </div>
          <div>
            <label className="form-label">Expected Date of Return</label>
            <input type="date" value={expectedReturn} min={date} onChange={(e) => setExpectedReturn(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Company&apos;s Name <span className="text-red-500">*</span></label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. CompuGhana Service Centre" required className="form-input" />
          </div>
          <div>
            <label className="form-label">Company&apos;s Address</label>
            <input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="e.g. Oxford Street, Osu, Accra" className="form-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Recipient Name <span className="text-red-500">*</span></label>
            <p className="form-helper -mt-0.5 mb-1">Person carrying / receiving the equipment</p>
            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Kwame Mensah" required className="form-input" />
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</h3>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
              className="btn-secondary text-xs gap-1"
            >
              <Plus size={13} />
              Add item
            </button>
          </div>

          <datalist id="waybill-asset-options">
            {assets.map((a) => (
              <option key={`wb-asset-${a.id}`} value={`${a.assetTag} — ${a.name}`} />
            ))}
          </datalist>

          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={`wb-item-${i}`} className="border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="form-label text-xs">Pick from inventory</label>
                    <input
                      list="waybill-asset-options"
                      placeholder="Type an asset tag…"
                      onChange={(e) => handleAssetPick(i, e.target.value)}
                      className="form-input text-xs font-mono"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="form-label text-xs">Description <span className="text-red-500">*</span></label>
                    <input
                      value={it.description}
                      onChange={(e) => setItem(i, { description: e.target.value })}
                      placeholder="e.g. Lenovo Thinkpad E16 (SEC-LT-1042)"
                      className="form-input text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="form-label text-xs">Serial No.</label>
                    <input
                      value={it.serialNumber}
                      onChange={(e) => setItem(i, { serialNumber: e.target.value })}
                      className="form-input text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">Qty</label>
                    <input
                      type="number" min={1} value={it.qty}
                      onChange={(e) => setItem(i, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="form-input text-xs"
                    />
                  </div>
                  <div className="sm:col-span-9">
                    <label className="form-label text-xs">Purpose</label>
                    <input
                      value={it.purpose}
                      onChange={(e) => setItem(i, { purpose: e.target.value })}
                      placeholder="e.g. Warranty repair — screen flicker"
                      className="form-input text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                        className="icon-btn hover:text-red-600 hover:bg-red-50"
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary min-w-[160px] justify-center">
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send size={14} />
                Submit for Approval
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

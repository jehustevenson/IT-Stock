'use client';

import React, { useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { Asset } from '@/lib/mockData';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
}

export default function QRCodeModal({ open, onClose, asset }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const qrValue = JSON.stringify({
    assetTag: asset.assetTag,
    name: asset.name,
    category: asset.category,
    serialNumber: asset.serialNumber,
    status: asset.status,
    location: asset.location,
  });

  function handleCopyTag() {
    navigator.clipboard.writeText(asset.assetTag);
    toast.success(`Asset tag ${asset.assetTag} copied to clipboard`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asset QR Code"
      subtitle={`Scan to retrieve full details for ${asset.assetTag}`}
      size="sm"
    >
      <div className="px-6 py-5 flex flex-col items-center gap-5">
        {/* QR Code */}
        <div
          ref={qrRef}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm"
        >
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="H"
            includeMargin={false}
            fgColor="#1e293b"
          />
        </div>

        {/* Asset Info */}
        <div className="w-full space-y-2 text-center">
          <p className="text-base font-semibold text-slate-900">{asset.name}</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded-lg font-semibold">
              {asset.assetTag}
            </span>
            <button
              onClick={handleCopyTag}
              className="icon-btn"
              title="Copy asset tag"
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
            <span>{asset.category}</span>
            <span>·</span>
            <span className="font-mono">{asset.serialNumber}</span>
          </div>
          <div className="text-xs text-slate-400">{asset.location}</div>
        </div>

        {/* QR Info */}
        <div className="w-full px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            QR code encodes asset tag, name, category, serial number, status, and location.
            Scan with any QR reader to retrieve asset details.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full">
          <button className="btn-secondary flex-1 justify-center text-xs gap-1.5">
            <Download size={13} />
            Download PNG
          </button>
          <button className="btn-secondary flex-1 justify-center text-xs gap-1.5">
            <Printer size={13} />
            Print Label
          </button>
        </div>

        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          Close
        </button>
      </div>
    </Modal>
  );
}
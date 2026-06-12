'use client';

import React, { useRef, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { Asset } from '@/lib/supabase/types';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
}

export default function QRCodeModal({ open, onClose, asset }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadPNG = useCallback(() => {
    // Find the hidden canvas rendered by QRCodeCanvas
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('Could not generate image. Please try again.');
      return;
    }

    // Create a new canvas with padding and label
    const padding = 24;
    const labelHeight = 56;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width + padding * 2;
    outputCanvas.height = canvas.height + padding * 2 + labelHeight;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    // Draw QR code
    ctx.drawImage(canvas, padding, padding);

    // Draw asset tag label
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(asset.assetTag, outputCanvas.width / 2, canvas.height + padding + 28);

    // Draw asset name
    ctx.fillStyle = '#64748b';
    ctx.font = '13px "DM Sans", sans-serif';
    ctx.fillText(asset.name, outputCanvas.width / 2, canvas.height + padding + 48);

    // Trigger download
    const link = document.createElement('a');
    link.download = `${asset.assetTag}-qr.png`;
    link.href = outputCanvas.toDataURL('image/png');
    link.click();

    toast.success(`QR code downloaded as ${asset.assetTag}-qr.png`);
  }, [asset]);

  const handlePrint = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('Could not prepare print. Please try again.');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print labels.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Label — ${asset.assetTag}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'IBM Plex Mono', 'Courier New', monospace;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: white;
            }
            .label {
              border: 2px solid #1e293b;
              border-radius: 8px;
              padding: 16px;
              text-align: center;
              max-width: 280px;
            }
            img { width: 200px; height: 200px; display: block; margin: 0 auto; }
            .tag {
              font-size: 16px;
              font-weight: bold;
              color: #1e293b;
              margin-top: 10px;
              letter-spacing: 0.05em;
            }
            .name {
              font-size: 11px;
              color: #64748b;
              margin-top: 4px;
              font-family: sans-serif;
            }
            .category {
              font-size: 10px;
              color: #94a3b8;
              margin-top: 2px;
              font-family: sans-serif;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${dataUrl}" alt="QR Code" />
            <p class="tag">${asset.assetTag}</p>
            <p class="name">${asset.name}</p>
            <p class="category">${asset.category} · ${asset.serialNumber}</p>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [asset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asset QR Code"
      subtitle={`Scan to retrieve full details for ${asset.assetTag}`}
      size="sm"
    >
      <div className="px-6 py-5 flex flex-col items-center gap-5">
        {/* Visible QR (SVG for display) */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="H"
            includeMargin={false}
            fgColor="#1e293b"
          />
        </div>

        {/* Hidden canvas used for download/print */}
        <div ref={canvasRef} className="hidden">
          <QRCodeCanvas
            value={qrValue}
            size={400}
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
            <button onClick={handleCopyTag} className="icon-btn" title="Copy asset tag">
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
          <button
            onClick={handleDownloadPNG}
            className="btn-secondary flex-1 justify-center text-xs gap-1.5"
          >
            <Download size={13} />
            Download PNG
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary flex-1 justify-center text-xs gap-1.5"
          >
            <Printer size={13} />
            Print Label
          </button>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
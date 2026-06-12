// Lightweight email notifications via Resend (https://resend.com).
// If RESEND_API_KEY is not configured, sending is silently skipped so the
// approval workflow still works in-app.

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`Email skipped (RESEND_API_KEY not set): "${subject}" → ${to}`);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'ITAssetTracker <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error('Email send failed:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    // Never let a notification failure break the workflow.
    console.error('Email send error:', err);
  }
}

export function waybillPendingEmail(
  waybillNo: string,
  stage: 'IT' | 'Security',
  companyName: string,
  recipientName: string,
  itemCount: number,
  appUrl: string,
  waybillId: string,
): { subject: string; html: string } {
  const subject = `Waybill ${waybillNo} awaiting your ${stage} approval`;
  const link = `${appUrl}/waybills/${waybillId}`;
  const html = `
    <div style="font-family:sans-serif;max-width:520px">
      <h2 style="color:#1d4ed8">Waybill ${waybillNo}</h2>
      <p>A waybill is awaiting your <strong>${stage} approval</strong>.</p>
      <table style="font-size:14px;color:#334155">
        <tr><td style="padding:2px 12px 2px 0"><strong>To</strong></td><td>${companyName}</td></tr>
        <tr><td style="padding:2px 12px 2px 0"><strong>Recipient</strong></td><td>${recipientName}</td></tr>
        <tr><td style="padding:2px 12px 2px 0"><strong>Items</strong></td><td>${itemCount}</td></tr>
      </table>
      <p style="margin-top:16px">
        <a href="${link}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
          Review &amp; approve
        </a>
      </p>
    </div>`;
  return { subject, html };
}

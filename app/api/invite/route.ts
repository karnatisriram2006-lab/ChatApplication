import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, senderName } = await request.json();

    if (!email || !senderName) {
      return NextResponse.json({ error: 'Email and sender name are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured. Add RESEND_API_KEY to .env.local' }, { status: 503 });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const appName = 'ChatApp';
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { data, error } = await resend.emails.send({
      from: `${appName} <onboarding@resend.dev>`,
      to: [email],
      subject: `${senderName} invited you to ${appName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:480px;margin:40px auto;padding:0 20px;">
            <div style="background:#ffffff;border-radius:16px;padding:40px 32px;border:1px solid #e2e8f0;">
              <div style="text-align:center;margin-bottom:32px;">
                <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#6366F1,#8B5CF6);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                  <span style="color:#fff;font-weight:900;font-size:24px;">C</span>
                </div>
                <h1 style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">You're invited!</h1>
              </div>
              <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
                <strong>${senderName}</strong> wants to chat with you on ${appName}.
                Sign in to start a conversation.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${loginUrl}/login" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">
                  Open ${appName}
                </a>
              </div>
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:24px 0 0;line-height:1.5;">
                If you don't have an account, you can create one when you sign in.
              </p>
            </div>
            <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;">
              Sent by ${senderName} via ${appName}
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

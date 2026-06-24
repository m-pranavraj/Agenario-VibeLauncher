import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS setup to allow the backend to call this proxy
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret, to, subject, text, html } = req.body;
  
  // Basic security to ensure only our Render backend can use this proxy
  if (secret !== process.env.MAIL_PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized mail proxy access' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true', // port 587 is secure:false (uses STARTTLS), port 465 is secure:true
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Agenario Security" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@agenario.com"}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`[Vercel SMTP Proxy] Email sent to ${to} - MessageID: ${info.messageId}`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('[Vercel SMTP Proxy] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send email via proxy' });
  }
}

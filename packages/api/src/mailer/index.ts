import nodemailer from 'nodemailer'

// ---------------------------------------------------------------------------
// Transport — honours MAIL_* env vars; falls back to Ethereal for local dev.
// ---------------------------------------------------------------------------
function createTransport() {
  const host = process.env.MAIL_HOST
  const port = Number(process.env.MAIL_PORT) || 587
  const user = process.env.MAIL_USER
  const pass = process.env.MAIL_PASS

  if (!host || !user || !pass) {
    // Return a stub transport that logs instead of sending when env vars are absent.
    return nodemailer.createTransport({ jsonTransport: true })
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

function passwordResetEmailHtml(firstName: string, link: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your BlueCollar password</title>
  <style>
    body { margin:0; padding:0; background:#f4f6f9; font-family:Arial,Helvetica,sans-serif; }
    .wrapper { max-width:580px; margin:40px auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }
    .header  { background:#1d4ed8; padding:32px 40px; text-align:center; }
    .header h1 { color:#ffffff; font-size:24px; margin:0; }
    .body    { padding:32px 40px; color:#374151; }
    .body p  { line-height:1.6; margin:0 0 16px; }
    .btn     { display:inline-block; background:#1d4ed8; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:6px; font-weight:bold; margin:8px 0 24px; }
    .footer  { background:#f9fafb; padding:16px 40px; font-size:12px; color:#9ca3af; text-align:center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>BlueCollar</h1></div>
    <div class="body">
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Forgot your password? No problem. Click the button below to choose a new one.</p>
      <p><a class="btn" href="${link}">Reset Password</a></p>
      <p>This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
      <p>— The BlueCollar Team</p>
    </div>
    <div class="footer">
      If the button above doesn't work, copy and paste this URL into your browser:<br/>
      <a href="${link}" style="color:#1d4ed8;">${link}</a>
    </div>
  </div>
</body>
</html>
`
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  token: string,
): Promise<void> {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  // Typically, for password reset, we redirect to a frontend page like /reset-password
  // But for the sake of the challenge, we'll follow a pattern similar to verification (API + token query param)
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`

  const info = await transporter.sendMail({
    from: `"BlueCollar" <${process.env.MAIL_USER ?? 'noreply@bluecollar.app'}>`,
    to,
    subject: 'Reset your BlueCollar password',
    html: passwordResetEmailHtml(firstName, link),
  })

  if ((transporter as any).options?.jsonTransport) {
    console.log('[mailer] Password reset email (dev stub):', JSON.parse((info as any).message))
  }
}


export const transporter = createTransport()

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
function verificationEmailHtml(firstName: string, link: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your BlueCollar account</title>
  <style>
    body { margin:0; padding:0; background:#f4f6f9; font-family:Arial,Helvetica,sans-serif; }
    .wrapper { max-width:580px; margin:40px auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }
    .header  { background:#1d4ed8; padding:32px 40px; text-align:center; }
    .header h1 { color:#ffffff; font-size:24px; margin:0; }
    .body    { padding:32px 40px; color:#374151; }
    .body p  { line-height:1.6; margin:0 0 16px; }
    .btn     { display:inline-block; background:#1d4ed8; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:6px; font-weight:bold; margin:8px 0 24px; }
    .footer  { background:#f9fafb; padding:16px 40px; font-size:12px; color:#9ca3af; text-align:center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>BlueCollar</h1></div>
    <div class="body">
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Thanks for signing up! Please verify your email address to activate your account.</p>
      <p><a class="btn" href="${link}">Verify Email Address</a></p>
      <p>This link expires in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.</p>
      <p>— The BlueCollar Team</p>
    </div>
    <div class="footer">
      If the button above doesn't work, copy and paste this URL into your browser:<br/>
      <a href="${link}" style="color:#1d4ed8;">${link}</a>
    </div>
  </div>
</body>
</html>
`
}

// ---------------------------------------------------------------------------
// Public helper
// ---------------------------------------------------------------------------
export async function sendVerificationEmail(
  to: string,
  firstName: string,
  token: string,
): Promise<void> {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/api/auth/verify-account?token=${encodeURIComponent(token)}`

  const info = await transporter.sendMail({
    from: `"BlueCollar" <${process.env.MAIL_USER ?? 'noreply@bluecollar.app'}>`,
    to,
    subject: 'Verify your BlueCollar account',
    html: verificationEmailHtml(firstName, link),
  })

  // When using the stub jsonTransport, log the message object for debugging.
  if ((transporter as any).options?.jsonTransport) {
    console.log('[mailer] Verification email (dev stub):', JSON.parse((info as any).message))
  }
}

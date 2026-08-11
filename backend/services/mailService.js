'use strict';

const nodemailer = require('nodemailer');

// Singleton transporter instance
let transporter = null;

/**
 * Get or create the Nodemailer transporter.
 * Configured with SMTP credentials from process.env if available.
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return transporter;
  }

  // Fallback: Try generating an Ethereal test account if no SMTP provided, or use stream transporter
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('[MAIL] Created Ethereal test SMTP account for development');
    return transporter;
  } catch (e) {
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return transporter;
  }
};

/**
 * Send Signup OTP Email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit numeric OTP code
 */
const sendSignupOtp = async (toEmail, otp) => {
  const fromName = process.env.SMTP_FROM_NAME || 'SiteMind Verification';
  const fromEmail = process.env.SMTP_FROM || 'noreply@sitemind.ai';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: `${otp} is your SiteMind Email Verification Code`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - SiteMind</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 40px 20px; }
          .card { max-width: 480px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; text-align: center; }
          .logo { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 24px; display: inline-block; }
          .logo span { color: #10b981; }
          h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px; }
          p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px; }
          .otp-box { background-color: #09090b; border: 1px solid #10b981; border-radius: 12px; padding: 16px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #10b981; margin: 0 0 24px; font-family: monospace; }
          .footer { font-size: 12px; color: #71717a; margin-top: 24px; border-top: 1px solid #27272a; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Site<span>Mind</span></div>
          <h1>Verify Your Email</h1>
          <p>Thank you for signing up for SiteMind! Use the 6-digit verification code below to complete your registration for <strong>${toEmail}</strong>:</p>
          <div class="otp-box">${otp}</div>
          <p>This code will expire in <strong>10 minutes</strong>. If you did not request this account creation, please ignore this email.</p>
          <div class="footer">
            SiteMind Platform &copy; ${new Date().getFullYear()}
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail(mailOptions);
    console.log(`\n==================================================`);
    console.log(`[MAIL] Signup OTP sent to ${toEmail}`);
    console.log(`[MAIL] Verification Code: ${otp}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[MAIL] Ethereal Preview URL: ${previewUrl}`);
    }
    console.log(`==================================================\n`);
    return info;
  } catch (err) {
    console.error(`[MAIL ERROR] Failed to send email to ${toEmail}:`, err.message);
    return null;
  }
};

/**
 * Send Password Reset OTP Email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit numeric OTP code
 */
const sendResetPasswordOtp = async (toEmail, otp) => {
  const fromName = process.env.SMTP_FROM_NAME || 'SiteMind Security';
  const fromEmail = process.env.SMTP_FROM || 'noreply@sitemind.ai';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: `${otp} is your SiteMind Password Reset Code`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your SiteMind Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 40px 20px; }
          .card { max-width: 480px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; text-align: center; }
          .logo { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 24px; display: inline-block; }
          .logo span { color: #10b981; }
          h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px; }
          p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px; }
          .otp-box { background-color: #09090b; border: 1px solid #10b981; border-radius: 12px; padding: 16px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #10b981; margin: 0 0 24px; font-family: monospace; }
          .footer { font-size: 12px; color: #71717a; margin-top: 24px; border-top: 1px solid #27272a; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Site<span>Mind</span></div>
          <h1>Password Reset Request</h1>
          <p>We received a request to reset your password for your SiteMind account (<strong>${toEmail}</strong>). Use the verification code below to proceed:</p>
          <div class="otp-box">${otp}</div>
          <p>This code will expire in <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
          <div class="footer">
            SiteMind Platform &copy; ${new Date().getFullYear()}
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail(mailOptions);
    console.log(`\n==================================================`);
    console.log(`[MAIL] Password Reset OTP sent to ${toEmail}`);
    console.log(`[MAIL] Verification Code: ${otp}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[MAIL] Ethereal Preview URL: ${previewUrl}`);
    }
    console.log(`==================================================\n`);
    return info;
  } catch (err) {
    console.error(`[MAIL ERROR] Failed to send email to ${toEmail}:`, err.message);
    return null;
  }
};

module.exports = {
  sendSignupOtp,
  sendResetPasswordOtp
};

/**
 * Unified Notification Service
 * Supports: Gmail (Nodemailer) or SendGrid for emails, Twilio for SMS, In-App notifications
 */

import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { getDatabase } from '@/lib/mongodb';

// Email provider selection (gmail or sendgrid)
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'gmail';

// Initialize SendGrid (if using SendGrid)
if (EMAIL_PROVIDER === 'sendgrid' && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Nodemailer (if using Gmail)
const gmailTransporter = EMAIL_PROVIDER === 'gmail' && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null;

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export interface NotificationOptions {
  to: string | {
    email?: string;
    phone?: string;
    name?: string;
  };
  type?: 'consultation_accepted' | 'consultation_rejected' | 'consultation_reminder' | 'general' | 'email' | 'sms' | 'password-reset';
  subject?: string;
  message?: string;
  template?: string;
  templateData?: {
    title?: string;
    message?: string;
    doctorName?: string;
    patientName?: string;
    appointmentTime?: string;
    reason?: string;
    meetingLink?: string;
    resetUrl?: string;
    actionUrl?: string;
    specialization?: string;
    doctorEmail?: string;
  };
  data?: {
    doctorName?: string;
    patientName?: string;
    appointmentTime?: string;
    reason?: string;
    meetingLink?: string;
  };
  preferences?: {
    email: boolean;
    sms: boolean;
  };
}

export interface NotificationResult {
  email?: {
    success: boolean;
    error?: string;
  };
  sms?: {
    success: boolean;
    error?: string;
  };
}

/**
 * Send email notification via Gmail or SendGrid
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use Gmail (Nodemailer)
    if (EMAIL_PROVIDER === 'gmail') {
      if (!gmailTransporter) {
        return { success: false, error: 'Gmail not configured' };
      }

      await gmailTransporter.sendMail({
        from: `"MediAI Health" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return { success: true };
    }

    // Use SendGrid
    if (EMAIL_PROVIDER === 'sendgrid') {
      if (!process.env.SENDGRID_API_KEY) {
        return { success: false, error: 'SendGrid API key not configured' };
      }

      const msg = {
        to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'mediai.health@gmail.com',
          name: 'MediAI Health',
        },
        subject,
        text: textContent,
        html: htmlContent,
      };

      await sgMail.send(msg);
      return { success: true };
    }

    return { success: false, error: 'No email provider configured' };
  } catch (error: any) {
    console.error(`${EMAIL_PROVIDER.toUpperCase()} error:`, error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Send SMS notification via Twilio
 */
async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!twilioClient) {
      return { success: false, error: 'Twilio not configured' };
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      return { success: false, error: 'Twilio phone number not configured' };
    }

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Twilio error:', error);
    
    // Check if it's a trial account error
    if (error.code === 21608) {
      return {
        success: false,
        error: 'This number is not verified. In Twilio trial mode, you can only send SMS to verified numbers.',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

/**
 * Create in-app notification
 */
async function createInAppNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    const notificationsCollection = db.collection('notifications');

    await notificationsCollection.insertOne({
      user_id: userId,
      type,
      title,
      message,
      link: link || null,
      is_read: false,
      created_at: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('In-app notification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create in-app notification',
    };
  }
}

/**
 * Generate email content based on notification type
 */
function generateEmailContent(type: string, data: NotificationOptions['templateData']): {
  subject: string;
  html: string;
  text: string;
} {
  const safeData = data || {};
  switch (type) {
    case 'consultation_accepted':
      return {
        subject: '✅ Consultation Request Accepted',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Consultation Request Accepted!</h2>
            <p>Hi ${safeData.patientName || 'there'},</p>
            <p><strong>Dr. ${safeData.doctorName}</strong> has accepted your consultation request.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Appointment Details</h3>
              <p><strong>Date & Time:</strong> ${safeData.appointmentTime}</p>
              ${safeData.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${safeData.meetingLink}">${safeData.meetingLink}</a></p>` : ''}
            </div>
            <p>Please join the consultation at the scheduled time.</p>
            <p>Best regards,<br/>MediAI Health Team</p>
          </div>
        `,
        text: `Consultation Request Accepted!\n\nHi ${safeData.patientName || 'there'},\n\nDr. ${safeData.doctorName} has accepted your consultation request.\n\nAppointment Details:\nDate & Time: ${safeData.appointmentTime}\n${safeData.meetingLink ? `Meeting Link: ${safeData.meetingLink}\n` : ''}\nPlease join the consultation at the scheduled time.\n\nBest regards,\nMediAI Health Team`,
      };

    case 'consultation_rejected':
      return {
        subject: '❌ Consultation Request Update',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Consultation Request Update</h2>
            <p>Hi ${safeData.patientName || 'there'},</p>
            <p>Unfortunately, <strong>Dr. ${safeData.doctorName}</strong> is unable to accept your consultation request at this time.</p>
            ${safeData.reason ? `<p><strong>Reason:</strong> ${safeData.reason}</p>` : ''}
            <p>Please try booking with another available doctor on our platform.</p>
            <p>Best regards,<br/>MediAI Health Team</p>
          </div>
        `,
        text: `Consultation Request Update\n\nHi ${safeData.patientName || 'there'},\n\nUnfortunately, Dr. ${safeData.doctorName} is unable to accept your consultation request at this time.\n${safeData.reason ? `\nReason: ${safeData.reason}\n` : ''}\nPlease try booking with another available doctor on our platform.\n\nBest regards,\nMediAI Health Team`,
      };

    case 'consultation_reminder':
      return {
        subject: '⏰ Upcoming Consultation Reminder',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Consultation Reminder</h2>
            <p>Hi ${safeData.patientName || 'there'},</p>
            <p>This is a reminder for your upcoming consultation with <strong>Dr. ${safeData.doctorName}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Time:</strong> ${safeData.appointmentTime}</p>
              ${safeData.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${safeData.meetingLink}">${safeData.meetingLink}</a></p>` : ''}
            </div>
            <p>Please join on time!</p>
            <p>Best regards,<br/>MediAI Health Team</p>
          </div>
        `,
        text: `Consultation Reminder\n\nHi ${safeData.patientName || 'there'},\n\nThis is a reminder for your upcoming consultation with Dr. ${safeData.doctorName}.\n\nTime: ${safeData.appointmentTime}\n${safeData.meetingLink ? `Meeting Link: ${safeData.meetingLink}\n` : ''}\nPlease join on time!\n\nBest regards,\nMediAI Health Team`,
      };

    case 'password-reset':
      if (!safeData.resetUrl) {
        return { subject: 'Password Reset', html: '', text: '' };
      }
      return {
        subject: '🔐 Password Reset Request - MediAI',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Reset Your Password</h2>
            <p>Hi,</p>
            <p>${safeData.message || 'You requested to reset your password. Click the link below to reset your password.'}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${safeData.resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
            </div>
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; color: #856404;">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </div>
            <p style="font-size: 12px; color: #666;">Or copy and paste this link: ${safeData.resetUrl}</p>
            <p>Best regards,<br/>MediAI Health Team</p>
          </div>
        `,
        text: `Reset Your Password\n\nHi,\n\n${safeData.message || 'You requested to reset your password.'}\n\nReset link: ${safeData.resetUrl}\n\nThis link will expire in 1 hour.\n\nBest regards,\nMediAI Health Team`,
      };

    default:
      return {
        subject: 'MediAI Notification',
        html: '<p>You have a new notification from MediAI.</p>',
        text: 'You have a new notification from MediAI.',
      };
  }
}

/**
 * Generate SMS content based on notification type
 */
function generateSMSContent(type: string, data: NotificationOptions['templateData']): string {
  const safeData = data || {};
  switch (type) {
    case 'consultation_accepted':
      return `MediAI: Dr. ${safeData.doctorName} accepted your consultation! Appointment: ${safeData.appointmentTime}. ${safeData.meetingLink ? `Link: ${safeData.meetingLink}` : ''}`;

    case 'consultation_rejected':
      return `MediAI: Dr. ${safeData.doctorName} is unable to accept your consultation request. ${safeData.reason ? `Reason: ${safeData.reason}. ` : ''}Please book with another doctor.`;

    case 'consultation_reminder':
      return `MediAI Reminder: Your consultation with Dr. ${safeData.doctorName} is at ${safeData.appointmentTime}. ${safeData.meetingLink ? `Join: ${safeData.meetingLink}` : ''}`;

    default:
      return 'You have a new notification from MediAI.';
  }
}



/**
 * Send email verification (for new user signups)
 */
export async function sendVerificationEmail(email: string, verificationLink: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to MediAI!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationLink}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
      <p>If you didn't create this account, please ignore this email.</p>
      <p>Best regards,<br/>MediAI Health Team</p>
    </div>
  `;

  const text = `Welcome to MediAI!\n\nPlease verify your email address by clicking this link:\n${verificationLink}\n\nIf you didn't create this account, please ignore this email.\n\nBest regards,\nMediAI Health Team`;

  const result = await sendEmail(email, 'Verify Your MediAI Email', html, text);
  return result.success;
}

/**
 * Simplified notification sender - accepts simple format
 */
export async function sendNotification(options: {
  to: string;
  subject?: string;
  type?: 'email' | 'sms' | 'password-reset';
  message?: string;
  templateData?: any;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (options.type === 'sms' || (!options.type && options.to.startsWith('+'))) {
      // Send SMS
      return await sendSMS(options.to, options.message || '');
    } else {
      // Send Email
      let html = '';
      
      // Password reset template
      if (options.type === 'password-reset' && options.templateData?.resetUrl) {
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>🔐 ${options.templateData.title || 'Password Reset'}</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <p>${options.templateData.message || 'You requested to reset your password.'}</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${options.templateData.resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
              </div>
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; color: #856404;">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.
              </div>
              <p style="font-size: 12px; color: #666;">Or copy and paste this link: ${options.templateData.resetUrl}</p>
              <p style="margin-top: 30px; color: #6b7280;">Best regards,<br/>MediAI Health Team</p>
            </div>
          </div>
        `;
      } else if (options.templateData) {
        // Generic template
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">${options.templateData.title || 'Notification'}</h2>
            <p>${options.templateData.message || ''}</p>
            ${options.templateData.doctorName ? `<p><strong>Doctor:</strong> ${options.templateData.doctorName}</p>` : ''}
            ${options.templateData.specialization ? `<p><strong>Specialization:</strong> ${options.templateData.specialization}</p>` : ''}
            ${options.templateData.doctorEmail ? `<p><strong>Email:</strong> ${options.templateData.doctorEmail}</p>` : ''}
            ${options.templateData.appointmentTime ? `<p><strong>Time:</strong> ${options.templateData.appointmentTime}</p>` : ''}
            ${options.templateData.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${options.templateData.meetingLink}">${options.templateData.meetingLink}</a></p>` : ''}
            ${options.templateData.actionUrl ? `<p style="margin-top: 20px;"><a href="${options.templateData.actionUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Take Action</a></p>` : ''}
            <p style="margin-top: 30px; color: #6b7280;">Best regards,<br/>MediAI Health Team</p>
          </div>
        `;
      } else {
        html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><p>${options.message || ''}</p></div>`;
      }

      const text = options.templateData?.message || options.message || '';
      
      return await sendEmail(options.to, options.subject || 'Notification from MediAI', html, text);
    }
  } catch (error: any) {
    console.error('Notification error:', error);
    return { success: false, error: error.message };
  }
}

// ===================== BLOCK USER NOTIFICATIONS =====================

export async function sendBlockNotification(
  email: string,
  phone: string,
  userName: string,
  blockReason: string
): Promise<void> {
  const emailSubject = 'MediAI Account Suspended';
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1>🚫 Account Suspended</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${userName}</strong>,</p>
        
        <div style="background: #fee; border-left: 4px solid #f44; padding: 15px; margin: 20px 0;">
          <strong>⚠️ Your MediAI account has been temporarily suspended.</strong>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Suspension Date:</strong> ${new Date().toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short',
          })}</p>
          <p><strong>Reason:</strong> ${blockReason}</p>
        </div>
        
        <p>Your account access has been restricted due to the reason mentioned above. This means you will not be able to:</p>
        <ul>
          <li>Log in to your account</li>
          <li>Access medical records</li>
          <li>Book consultations</li>
          <li>Use any platform features</li>
        </ul>
        
        <h3>What can you do?</h3>
        <p>If you believe this suspension was made in error or would like to appeal this decision, please contact our support team:</p>
        
        <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>📧 Email:</strong> ${process.env.ADMIN_EMAIL}</p>
          <p><strong>📞 Phone:</strong> +91-1800-XXX-XXXX</p>
          <p><strong>🕐 Hours:</strong> Monday - Friday, 9 AM - 6 PM IST</p>
        </div>
        
        <p>Please include your registered email address and any relevant details when contacting us.</p>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
          <p>This is an automated message from MediAI. Please do not reply to this email.</p>
          <p>&copy; 2026 MediAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail(email, emailSubject, emailBody, `Your MediAI account has been suspended. Reason: ${blockReason}. Contact support at ${process.env.ADMIN_EMAIL} for assistance.`);

  const smsMessage = `MediAI: Your account has been suspended. Reason: ${blockReason}. Contact support at ${process.env.ADMIN_EMAIL} for assistance.`;
  if (phone) {
    await sendSMS(phone, smsMessage);
  }
}

export async function sendUnblockNotification(
  email: string,
  phone: string,
  userName: string
): Promise<void> {
  const emailSubject = 'MediAI Account Reactivated';
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1>✅ Account Reactivated</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${userName}</strong>,</p>
        
        <div style="background: #efe; border-left: 4px solid #4f4; padding: 15px; margin: 20px 0;">
          <strong>🎉 Good news! Your MediAI account has been reactivated.</strong>
        </div>
        
        <p>You now have full access to all platform features, including:</p>
        <ul>
          <li>✓ Login to your account</li>
          <li>✓ Access medical records</li>
          <li>✓ Book consultations</li>
          <li>✓ All platform features</li>
        </ul>
        
        <p>You can log in immediately using your credentials.</p>
        
        <p><strong>If you experience any issues, please contact our support team.</strong></p>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
          <p>&copy; 2026 MediAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail(email, emailSubject, emailBody, `Your MediAI account has been reactivated. You can now log in and access all features.`);

  const smsMessage = `MediAI: Your account has been reactivated. You can now log in and access all features. Welcome back!`;
  if (phone) {
    await sendSMS(phone, smsMessage);
  }
}

// ===================== DOCTOR EDIT REQUEST NOTIFICATIONS =====================

export async function sendEditRequestNotificationToAdmin(
  doctorName: string,
  doctorEmail: string,
  changes: { field: string; oldValue: any; newValue: any }[]
): Promise<void> {
  const changesHTML = changes
    .map(
      (change) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;"><strong>${change.field}</strong></td>
      <td style="padding: 10px; border: 1px solid #ddd;">${change.oldValue || 'N/A'}</td>
      <td style="padding: 10px; border: 1px solid #ddd; color: #667eea;">${change.newValue}</td>
    </tr>
  `
    )
    .join('');

  const emailBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #667eea;">Doctor Profile Edit Request</h2>
      <p><strong>Doctor:</strong> ${doctorName}</p>
      <p><strong>Email:</strong> ${doctorEmail}</p>
      <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>Changes Requested:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Field</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Current Value</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">New Value</th>
          </tr>
        </thead>
        <tbody>
          ${changesHTML}
        </tbody>
      </table>
      
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXTAUTH_URL}/admin" 
           style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Review Request in Dashboard
        </a>
      </p>
    </div>
  `;

  await sendEmail(
    process.env.ADMIN_EMAIL!,
    `Doctor Profile Edit Request - Dr. ${doctorName}`,
    emailBody,
    `Doctor ${doctorName} (${doctorEmail}) has submitted a profile edit request. Review the requested changes in the admin dashboard.`
  );
}

export async function sendEditRequestApprovalToDoctor(
  doctorEmail: string,
  doctorName: string
): Promise<void> {
  const emailBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4caf50;">✅ Profile Edit Request Approved</h2>
      <p>Dear Dr. <strong>${doctorName}</strong>,</p>
      <p>Your profile edit request has been <strong style="color: #4caf50;">APPROVED</strong> by our admin team.</p>
      <p>The changes have been applied to your profile and are now visible to patients.</p>
      <p>Thank you for keeping your profile up-to-date!</p>
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXTAUTH_URL}/doctor-dashboard" 
           style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Your Dashboard
        </a>
      </p>
    </div>
  `;

  await sendEmail(doctorEmail, 'Profile Edit Request Approved', emailBody, `Your profile edit request has been approved by our admin team. The changes have been applied to your profile.`);
}

export async function sendEditRequestRejectionToDoctor(
  doctorEmail: string,
  doctorName: string,
  rejectionReason: string
): Promise<void> {
  const emailBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #f44;">❌ Profile Edit Request Rejected</h2>
      <p>Dear Dr. <strong>${doctorName}</strong>,</p>
      <p>Unfortunately, your profile edit request has been <strong style="color: #f44;">REJECTED</strong>.</p>
      
      <div style="background: #fee; padding: 15px; border-left: 4px solid #f44; margin: 20px 0;">
        <strong>Reason:</strong><br>${rejectionReason}
      </div>
      
      <p>If you have questions about this decision or would like to discuss, please contact our admin team.</p>
      <p><strong>Email:</strong> ${process.env.ADMIN_EMAIL}</p>
    </div>
  `;

  await sendEmail(doctorEmail, 'Profile Edit Request Rejected', emailBody, `Your profile edit request has been rejected. Reason: ${rejectionReason}. Contact admin at ${process.env.ADMIN_EMAIL} for more information.`);
}

// ===================== COMPLAINT NOTIFICATIONS =====================

export async function sendComplaintConfirmationToUser(
  userEmail: string,
  userName: string,
  userPhone: string,
  complaintId: string,
  doctorName: string,
  issueType: string
): Promise<void> {
  const emailBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #667eea;">Your Complaint Has Been Received</h2>
      <p>Dear <strong>${userName}</strong>,</p>
      <p>Thank you for bringing this matter to our attention. Your complaint against <strong>Dr. ${doctorName}</strong> has been successfully submitted and is under review.</p>
      
      <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Complaint ID:</strong> #${complaintId}</p>
        <p><strong>Submitted On:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Issue Type:</strong> ${issueType}</p>
      </div>
      
      <h3>What happens next:</h3>
      <ol>
        <li>Our admin team will review your complaint within <strong>24-48 hours</strong></li>
        <li>We will contact Dr. ${doctorName} to get their perspective</li>
        <li>After a thorough investigation, we will take appropriate action</li>
        <li>You will receive an update via email and SMS within <strong>3-5 business days</strong></li>
      </ol>
      
      <p>If you have additional information or evidence, please reply to this email with your Complaint ID.</p>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>For urgent matters, contact us at:</strong></p>
        <p>📞 Phone: +91-1800-XXX-XXXX (9 AM - 6 PM)</p>
        <p>📧 Email: complaints@mediai.com</p>
      </div>
      
      <p>Best regards,<br>MediAI Support Team</p>
    </div>
  `;

  await sendEmail(userEmail, `Your Complaint Has Been Received - Complaint ID #${complaintId}`, emailBody, `Your complaint #${complaintId} against Dr. ${doctorName} has been received. We will investigate and respond within 3-5 business days.`);

  const smsMessage = `MediAI: Your complaint #${complaintId} against Dr. ${doctorName} has been received. We will investigate and respond within 3-5 business days. Check your email for details.`;
  if (userPhone) {
    await sendSMS(userPhone, smsMessage);
  }
}

export async function sendComplaintNotificationToAdmin(
  userName: string,
  userEmail: string,
  complaintId: string,
  doctorName: string,
  issueType: string,
  description: string
): Promise<void> {
  const emailBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #f44; text-transform: uppercase;">⚠️ URGENT: User Complaint Against Doctor</h2>
      
      <div style="background: #fee; padding: 15px; border-left: 4px solid #f44; margin: 20px 0;">
        <p><strong>Complaint ID:</strong> #${complaintId}</p>
        <p><strong>Submitted By:</strong> ${userName} (${userEmail})</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
        <p><strong>Issue Type:</strong> ${issueType}</p>
      </div>
      
      <h3>Description:</h3>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
        <p>${description}</p>
      </div>
      
      <p><strong style="color: #f44;">⏰ Action Required:</strong> Please review and contact the doctor within 24 hours.</p>
      
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXTAUTH_URL}/admin" 
           style="background: #f44; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Full Complaint in Dashboard
        </a>
      </p>
    </div>
  `;

  await sendEmail(
    process.env.ADMIN_EMAIL!,
    `URGENT: User Complaint Against Dr. ${doctorName}`,
    emailBody,
    `URGENT: ${userName} has submitted a complaint against Dr. ${doctorName}. Complaint ID: ${complaintId}. Issue: ${issueType}. Action required within 24 hours.`
  );
}

export async function sendComplaintResolutionToUser(
  userEmail: string,
  userName: string,
  userPhone: string,
  complaintId: string,
  resolutionMessage: string
): Promise<void> {
  const emailBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #667eea;">Resolution of Complaint #${complaintId}</h2>
      <p>Dear <strong>${userName}</strong>,</p>
      
      <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p>${resolutionMessage}</p>
      </div>
      
      <p>If you still have concerns or wish to raise this matter again, you are welcome to:</p>
      <ul>
        <li>Reply to this email with your Complaint ID</li>
        <li>Submit a new complaint with additional information</li>
        <li>Call our support team at +91-1800-XXX-XXXX</li>
      </ul>
      
      <p>We value your trust and are committed to ensuring quality healthcare.</p>
      
      <p>Best regards,<br>MediAI Support Team</p>
    </div>
  `;

  await sendEmail(userEmail, `Resolution of Complaint #${complaintId}`, emailBody, `Your complaint #${complaintId} has been resolved. ${resolutionMessage}`);

  const smsMessage = `MediAI: Your complaint #${complaintId} has been resolved. Check your email for details.`;
  if (userPhone) {
    await sendSMS(userPhone, smsMessage);
  }
}

// Export a notificationService object with all functions for compatibility
export const notificationService = {
  // Wrap sendEmail to accept object parameter
  sendEmail: async (options: { to: string; subject: string; html: string; text?: string }) => {
    return sendEmail(options.to, options.subject, options.html, options.text || options.html);
  },
  
  // Wrap sendSMS to accept object parameter
  sendSMS: async (options: { to: string; message: string }) => {
    return sendSMS(options.to, options.message);
  },
  
  // Wrap createInAppNotification to accept object parameter
  createInAppNotification: async (options: { userId: string; type: string; title: string; message: string; link?: string }) => {
    return createInAppNotification(options.userId, options.type, options.title, options.message, options.link);
  },
  
  // Direct exports
  sendVerificationEmail,
  sendNotification,
  sendBlockNotification,
  sendUnblockNotification,
  sendEditRequestNotificationToAdmin,
  sendEditRequestApprovalToDoctor,
  sendEditRequestRejectionToDoctor,
  sendComplaintConfirmationToUser,
  sendComplaintNotificationToAdmin,
  sendComplaintResolutionToUser,
  
  // Template helpers
  templates: {
    consultationRequest: (data: any) => ({
      patientSubject: 'Consultation Request Submitted',
      patientHtml: `<p>Your consultation request has been submitted to Dr. ${data.doctorName}.</p>`,
      doctorSubject: 'New Consultation Request',
      doctorHtml: `<p>You have a new consultation request from ${data.patientName}.</p>`
    }),
    consultationAccepted: (data: any) => ({
      subject: 'Consultation Accepted',
      html: `<p>Dr. ${data.doctorName} has accepted your consultation. Meeting link: ${data.meetingLink}</p>`
    }),
    consultationCancelled: (data: any) => ({
      subject: 'Consultation Cancelled',
      html: `<p>Your consultation with Dr. ${data.doctorName} has been cancelled. Reason: ${data.reason}</p>`
    }),
    consultationPostponed: (data: any) => ({
      subject: 'Consultation Rescheduled',
      html: `<p>Dr. ${data.doctorName} has requested to reschedule. New time: ${data.newScheduledTime}. Reason: ${data.reason}</p>`
    })
  }
};

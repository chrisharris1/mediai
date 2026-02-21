import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reportId,
      medicineName,
      issueType,
      urgencyLevel,
      affectsPatientSafety,
      doctorName,
      doctorEmail,
    } = body;

    // Format issue type for display
    const issueTypeFormatted = issueType
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Build email content
    const urgencyEmoji = urgencyLevel === 'critical' ? '🚨' : urgencyLevel === 'high' ? '⚠️' : urgencyLevel === 'medium' ? '⚡' : '📋';
    const safetyWarning = affectsPatientSafety ? '<p style="color: #ef4444; font-weight: bold;">⚠️ This report indicates potential patient safety concerns!</p>' : '';

    const adminEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin: 5px 0; }
          .badge-critical { background: #ef4444; color: white; }
          .badge-high { background: #f59e0b; color: white; }
          .badge-medium { background: #3b82f6; color: white; }
          .badge-low { background: #10b981; color: white; }
          .info-row { margin: 15px 0; padding: 10px; background: white; border-left: 4px solid #3b82f6; }
          .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🏥 New Medicine Report Submitted</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">MediAI Quality Assurance Alert</p>
          </div>
          <div class="content">
            ${safetyWarning}
            
            <h2 style="color: #1f2937; margin-top: 0;">${urgencyEmoji} ${issueTypeFormatted}</h2>
            
            <div class="info-row">
              <strong>Medicine:</strong> ${medicineName}
            </div>
            
            <div class="info-row">
              <strong>Issue Type:</strong> ${issueTypeFormatted}
            </div>
            
            <div class="info-row">
              <strong>Urgency Level:</strong> 
              <span class="badge badge-${urgencyLevel}">${urgencyLevel.toUpperCase()}</span>
            </div>
            
            <div class="info-row">
              <strong>Affects Patient Safety:</strong> ${affectsPatientSafety ? '⚠️ YES' : 'No'}
            </div>
            
            <div class="info-row">
              <strong>Reported By:</strong> Dr. ${doctorName} (${doctorEmail})
            </div>
            
            <div class="info-row">
              <strong>Report ID:</strong> ${reportId}
            </div>
            
            <a href="${process.env.NEXTAUTH_URL}/admin/reports/${reportId}" class="button">
              Review Report →
            </a>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              Please review this report as soon as possible. The doctor is waiting for your response.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Admin email options
    const adminMailOptions = {
      from: `"MediAI Quality Team" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: `${urgencyEmoji} [${urgencyLevel.toUpperCase()}] New Medicine Report - ${medicineName}`,
      html: adminEmailHTML,
    };

    // Send email
    await transporter.sendMail(adminMailOptions);

    // Send confirmation email to doctor
    const doctorEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .checkmark { font-size: 48px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Thank You, Dr. ${doctorName}!</h1>
          </div>
          <div class="content">
            <div class="checkmark">✅</div>
            
            <h2 style="color: #1f2937; text-align: center;">Report Submitted Successfully</h2>
            
            <p>Your report regarding <strong>${medicineName}</strong> has been successfully submitted to our Quality Assurance team.</p>
            
            <p><strong>Report Details:</strong></p>
            <ul>
              <li>Report ID: ${reportId}</li>
              <li>Issue Type: ${issueTypeFormatted}</li>
              <li>Status: <strong style="color: #f59e0b;">Pending Review</strong></li>
            </ul>
            
            <p>Our admin team will review your report and take appropriate action. You will receive an email notification once the report has been reviewed.</p>
            
            <p style="margin-top: 30px; padding: 15px; background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 5px;">
              <strong>What happens next?</strong><br>
              1. Our team reviews your report (typically within 24-48 hours)<br>
              2. We verify the information with medical databases<br>
              3. We update our AI models if necessary<br>
              4. You receive a confirmation email with the outcome
            </p>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px; text-align: center;">
              Thank you for helping us maintain the highest standards of medical accuracy!
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const doctorMailOptions = {
      from: `"MediAI Quality Team" <${process.env.GMAIL_USER}>`,
      to: doctorEmail,
      subject: '✅ Report Submitted - MediAI Quality Assurance',
      html: doctorEmailHTML,
    };

    await transporter.sendMail(doctorMailOptions);

    return NextResponse.json({
      success: true,
      message: 'Admin notified successfully',
    });
  } catch (error: any) {
    console.error('Error sending admin notification:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send notification',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

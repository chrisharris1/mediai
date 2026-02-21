import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
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
      doctorEmail,
      doctorName,
      medicineName,
      status,
      adminNotes,
      actionTaken,
    } = body;

    // Status-based email content
    let statusColor = '#3b82f6';
    let statusEmoji = '📋';
    let statusText = status;
    let messageHeader = 'Report Status Updated';

    switch (status) {
      case 'under_review':
        statusColor = '#f59e0b';
        statusEmoji = '🔍';
        statusText = 'Under Review';
        messageHeader = 'Your Report is Being Reviewed';
        break;
      case 'resolved':
        statusColor = '#10b981';
        statusEmoji = '✅';
        statusText = 'Resolved';
        messageHeader = 'Your Report Has Been Resolved';
        break;
      case 'rejected':
        statusColor = '#ef4444';
        statusEmoji = '❌';
        statusText = 'Not Actionable';
        messageHeader = 'Report Review Complete';
        break;
    }

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; padding: 8px 20px; border-radius: 25px; font-weight: bold; color: white; background: ${statusColor}; margin: 15px 0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor}; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">${statusEmoji}</div>
            <h1 style="margin: 0;">${messageHeader}</h1>
          </div>
          <div class="content">
            <p>Dear Dr. ${doctorName},</p>
            
            <p>Your medicine report has been reviewed by our Quality Assurance team.</p>
            
            <div class="info-box">
              <p><strong>Report ID:</strong> ${reportId}</p>
              <p><strong>Medicine:</strong> ${medicineName}</p>
              <p><strong>Status:</strong> <span class="status-badge">${statusText.toUpperCase()}</span></p>
            </div>
            
            ${adminNotes ? `
              <div class="info-box">
                <p><strong>Admin Notes:</strong></p>
                <p>${adminNotes}</p>
              </div>
            ` : ''}
            
            ${actionTaken ? `
              <div class="info-box">
                <p><strong>Action Taken:</strong></p>
                <p>${actionTaken}</p>
              </div>
            ` : ''}
            
            ${status === 'resolved' ? `
              <p style="background: #d1fae5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <strong>✅ Thank you for your contribution!</strong><br>
                Your report has helped us improve the accuracy of our medical database. We have updated our records and will retrain our AI models with the corrected information.
              </p>
            ` : ''}
            
            ${status === 'under_review' ? `
              <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <strong>🔍 Under Review</strong><br>
                Our team is currently investigating your report. We may reach out if we need additional information. Thank you for your patience.
              </p>
            ` : ''}
            
            ${status === 'rejected' ? `
              <p style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <strong>Note:</strong><br>
                After careful review, we were unable to action this report at this time. Please see the admin notes above for more details. If you have additional evidence or information, please submit a new report.
              </p>
            ` : ''}
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px; text-align: center;">
              Thank you for helping us maintain the highest standards of medical accuracy!<br>
              <strong>MediAI Quality Assurance Team</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"MediAI Quality Team" <${process.env.GMAIL_USER}>`,
      to: doctorEmail,
      subject: `${statusEmoji} Report Update: ${medicineName} - ${statusText}`,
      html: emailHTML,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Doctor notified successfully',
    });
  } catch (error: any) {
    console.error('Error sending doctor notification:', error);
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

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import BugReport from '@/models/BugReport';
import nodemailer from 'nodemailer';

// GET: Admin - Fetch all bug reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const reports = await BugReport.find({})
      .sort({ created_at: -1 })
      .lean();

    // Get user details for each report
    const { getDatabase } = await import('@/lib/mongodb');
    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');

    const reportsWithUsers = await Promise.all(
      reports.map(async (report) => {
        const user = await db.collection('users').findOne({
          _id: new ObjectId(report.user_id)
        });
        return {
          ...report,
          user_email: user?.email || 'Unknown',
          user_name: user?.full_name || 'Unknown User'
        };
      })
    );

    return NextResponse.json({ reports: reportsWithUsers });

  } catch (error: any) {
    console.error('Fetch bug reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bug reports' },
      { status: 500 }
    );
  }
}

// PUT: Admin - Mark bug report as solved or dismiss
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId, resolution_notes, status } = await request.json();

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }

    await dbConnect();

    // If dismissing (not resolving), just update status
    if (status === 'dismissed') {
      const report = await BugReport.findByIdAndUpdate(
        reportId,
        { status: 'dismissed' },
        { new: true }
      );

      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Bug report dismissed',
        report 
      });
    }

    // Update bug report status as resolved
    const report = await BugReport.findByIdAndUpdate(
      reportId,
      { 
        status: 'resolved',
        resolved_at: new Date(),
        resolution_notes: resolution_notes || 'Issue has been resolved by admin.'
      },
      { new: true }
    );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get user info to send email
    const { getDatabase } = await import('@/lib/mongodb');
    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    const user = await db.collection('users').findOne({
      _id: new ObjectId(report.user_id)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Send email notification to user
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: #f3f4f6;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .header p {
              margin: 10px 0 0 0;
              opacity: 0.9;
              font-size: 16px;
            }
            .content {
              padding: 40px 30px;
            }
            .status-badge {
              display: inline-block;
              background: #d1fae5;
              color: #065f46;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: 600;
              font-size: 14px;
              margin: 20px 0;
            }
            .info-box {
              background: #f9fafb;
              border-left: 4px solid #10b981;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .info-box h3 {
              margin: 0 0 10px 0;
              color: #1f2937;
              font-size: 16px;
            }
            .info-box p {
              margin: 0;
              color: #6b7280;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
            .footer {
              background: #f9fafb;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 5px 0;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Bug Report Resolved</h1>
              <p>Your reported issue has been successfully fixed</p>
            </div>
            
            <div class="content">
              <p>Hi <strong>${user.full_name || report.name}</strong>,</p>
              
              <p>Great news! The issue you reported has been resolved by our team.</p>
              
              <div class="status-badge">
                ✓ RESOLVED
              </div>
              
              <div class="info-box">
                <h3>📋 Report ID</h3>
                <p>${report._id}</p>
              </div>
              
              <div class="info-box">
                <h3>🐛 Your Issue</h3>
                <p>${report.issue}</p>
              </div>
              
              ${resolution_notes ? `
                <div class="info-box">
                  <h3>💬 Resolution Details</h3>
                  <p>${resolution_notes}</p>
                </div>
              ` : ''}
              
              <div class="info-box">
                <h3>✅ What's Next?</h3>
                <p>
                  • The fix has been deployed to the system<br>
                  • You can now use the feature without issues<br>
                  • If you encounter any other problems, feel free to report them
                </p>
              </div>
              
              <center>
                <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">
                  Back to Dashboard
                </a>
              </center>
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Thank you for helping us improve MediAI! Your feedback makes our platform better for everyone.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>MediAI Support Team</strong></p>
              <p>Medical Intelligence Platform</p>
              <p style="margin-top: 15px; font-size: 12px;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"MediAI Support" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: `✅ Bug Report #${report._id.toString().slice(-8)} - Resolved`,
        html: emailHTML
      });

      console.log(`✅ Resolution email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send resolution email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bug report marked as resolved',
      report 
    });

  } catch (error: any) {
    console.error('Update bug report error:', error);
    return NextResponse.json(
      { error: 'Failed to update bug report' },
      { status: 500 }
    );
  }
}

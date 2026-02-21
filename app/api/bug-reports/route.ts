import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import BugReport from '@/models/BugReport';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, issue } = await request.json();

    // Validation
    if (!name || !phone || !issue) {
      return NextResponse.json(
        { error: 'Name, phone, and issue description are required' },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (phone.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number' },
        { status: 400 }
      );
    }

    if (issue.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please describe the issue in at least 10 characters' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get user info from session - need to query DB to get user _id
    const { getDatabase } = await import('@/lib/mongodb');
    const db = await getDatabase();
    const user = await db.collection('users').findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create bug report
    const bugReport = await BugReport.create({
      user_id: user._id,
      name: name.trim(),
      phone: phone.trim(),
      issue: issue.trim(),
      status: 'pending',
      admin_notified: false
    });

    // Send email notification to admin
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@mediai.com';

      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 30px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .badge {
              display: inline-block;
              background: rgba(255,255,255,0.2);
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              margin-top: 10px;
            }
            .content {
              padding: 40px 30px;
            }
            .alert-box {
              background: #fee;
              border-left: 4px solid #f00;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 8px;
            }
            .info-row {
              margin: 15px 0;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .info-label {
              font-weight: 600;
              color: #495057;
              margin-bottom: 5px;
            }
            .info-value {
              color: #212529;
              word-wrap: break-word;
            }
            .issue-box {
              background: #f8f9fa;
              border: 2px solid #dee2e6;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
            }
            .issue-box h3 {
              margin-top: 0;
              color: #495057;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 New Bug Report</h1>
              <div class="badge">MediAI Support System</div>
            </div>
            
            <div class="content">
              <div class="alert-box">
                <strong>⚠️ Action Required:</strong> A user has reported an issue that needs attention.
              </div>

              <div class="info-row">
                <div class="info-label">Report ID:</div>
                <div class="info-value">#${bugReport._id}</div>
              </div>

              <div class="info-row">
                <div class="info-label">Reported By:</div>
                <div class="info-value">${name}</div>
              </div>

              <div class="info-row">
                <div class="info-label">Contact Phone:</div>
                <div class="info-value">${phone}</div>
              </div>

              <div class="info-row">
                <div class="info-label">User Email:</div>
                <div class="info-value">${session.user.email}</div>
              </div>

              <div class="info-row">
                <div class="info-label">Submitted:</div>
                <div class="info-value">${new Date().toLocaleString()}</div>
              </div>

              <div class="issue-box">
                <h3>📝 Issue Description:</h3>
                <p style="line-height: 1.6; color: #212529;">${issue}</p>
              </div>

              <center>
                <a href="${process.env.NEXTAUTH_URL}/admin/bug-reports" class="button">
                  View in Admin Panel
                </a>
              </center>
            </div>

            <div class="footer">
              <p><strong>MediAI</strong> | Healthcare Management Platform</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"MediAI Support" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `🚨 New Bug Report #${bugReport._id}`,
        html: emailHTML
      });

      // Update admin_notified flag
      await BugReport.findByIdAndUpdate(bugReport._id, { admin_notified: true });

    } catch (emailError) {
      console.error('Failed to send admin email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Bug report submitted successfully. Our team will review it shortly.',
      report_id: bugReport._id
    });

  } catch (error: any) {
    console.error('Bug report error:', error);
    return NextResponse.json(
      { error: 'Failed to submit bug report. Please try again.' },
      { status: 500 }
    );
  }
}

// GET: Fetch user's bug reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get user info from session
    const { getDatabase } = await import('@/lib/mongodb');
    const db = await getDatabase();
    const user = await db.collection('users').findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const reports = await BugReport.find({ user_id: user._id })
      .sort({ created_at: -1 })
      .lean();

    return NextResponse.json({ reports });

  } catch (error: any) {
    console.error('Fetch bug reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bug reports' },
      { status: 500 }
    );
  }
}


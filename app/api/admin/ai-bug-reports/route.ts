import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import connectDB from '@/lib/mongodb';
import { notificationService } from '@/lib/notificationService';

// GET: Fetch all AI bug reports (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mediai.health26@gmail.com';
    if (session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const client = await connectDB;
    const db = client.db();
    const bugReportsCollection = db.collection('ai_bug_reports');

    // Fetch all bug reports
    const reports = await bugReportsCollection
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    const formattedReports = reports.map(r => ({
      ...r,
      _id: r._id.toString()
    }));

    // Calculate stats
    const stats = {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      investigating: reports.filter(r => r.status === 'investigating').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      not_an_issue: reports.filter(r => r.status === 'not_an_issue').length
    };

    return NextResponse.json({
      success: true,
      reports: formattedReports,
      stats
    });
  } catch (error: any) {
    console.error('Error fetching bug reports:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch bug reports' }, { status: 500 });
  }
}

// PATCH: Update bug report status and respond (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mediai.health26@gmail.com';
    if (session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { report_id, status, admin_response, admin_notes } = await req.json();

    if (!report_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await connectDB;
    const db = client.db();
    const bugReportsCollection = db.collection('ai_bug_reports');
    const { ObjectId } = require('mongodb');

    // Get the report
    const report = await bugReportsCollection.findOne({ _id: new ObjectId(report_id) });
    
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Update report
    const updateData: any = {
      status,
      updated_at: new Date()
    };

    if (admin_response) updateData.admin_response = admin_response;
    if (admin_notes) updateData.admin_notes = admin_notes;
    if (status === 'resolved' || status === 'not_an_issue') {
      updateData.resolved_at = new Date();
    }

    await bugReportsCollection.updateOne(
      { _id: new ObjectId(report_id) },
      { $set: updateData }
    );

    // Send email notification to doctor
    try {
      let emailSubject = '';
      let emailContent = '';

      if (status === 'resolved') {
        emailSubject = 'AI Bug Report - Issue Resolved';
        emailContent = `
          <h2>Thank You for Identifying the Issue!</h2>
          <p>Dear Dr. ${report.doctor_name},</p>
          <p>Thank you for reporting the AI issue. Our team has reviewed it and confirmed it was a valid issue.</p>
          
          <h3>Report Status: Resolved ✓</h3>
          <p><strong>Issue Type:</strong> ${report.issue_type}</p>
          <p><strong>Tool:</strong> ${report.tool_type}</p>
          
          ${admin_response ? `<h3>Admin Response:</h3><p>${admin_response}</p>` : ''}
          
          <p>The issue has been fixed and the system has been updated. Your feedback helps us improve the AI accuracy for better patient care.</p>
          
          <p>Best regards,<br>MediAI Development Team</p>
        `;
      } else if (status === 'not_an_issue') {
        emailSubject = 'AI Bug Report - Review Complete';
        emailContent = `
          <h2>Bug Report Review Complete</h2>
          <p>Dear Dr. ${report.doctor_name},</p>
          <p>Thank you for taking the time to report this concern. Our team has carefully reviewed the reported issue.</p>
          
          <h3>Report Status: Not an Issue</h3>
          <p><strong>Issue Type:</strong> ${report.issue_type}</p>
          <p><strong>Tool:</strong> ${report.tool_type}</p>
          
          ${admin_response ? `<h3>Admin Response:</h3><p>${admin_response}</p>` : ''}
          
          <p>If you have additional information or would like to discuss this further, please feel free to submit a follow-up report or contact our support team.</p>
          
          <p>Best regards,<br>MediAI Support Team</p>
        `;
      } else if (status === 'investigating') {
        emailSubject = 'AI Bug Report - Under Investigation';
        emailContent = `
          <h2>Bug Report Update</h2>
          <p>Dear Dr. ${report.doctor_name},</p>
          <p>Your bug report is now under investigation. Our technical team is looking into the issue.</p>
          
          <p><strong>Issue Type:</strong> ${report.issue_type}</p>
          <p><strong>Tool:</strong> ${report.tool_type}</p>
          
          ${admin_response ? `<p><strong>Update:</strong> ${admin_response}</p>` : ''}
          
          <p>We'll notify you once we have more information or when the issue is resolved.</p>
          
          <p>Best regards,<br>MediAI Support Team</p>
        `;
      }

      if (emailSubject && emailContent) {
        await notificationService.sendEmail({
          to: report.doctor_email,
          subject: emailSubject,
          html: emailContent
        });
      }
    } catch (error) {
      console.error('Error sending notification to doctor:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Bug report updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating bug report:', error);
    return NextResponse.json({ error: error.message || 'Failed to update bug report' }, { status: 500 });
  }
}

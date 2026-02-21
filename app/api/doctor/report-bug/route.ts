import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import connectDB from '@/lib/mongodb';
import { v2 as cloudinary } from 'cloudinary';
import { notificationService } from '@/lib/notificationService';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a doctor
    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can report AI issues' }, { status: 403 });
    }

    const formData = await req.formData();
    const tool_type = formData.get('tool_type') as string;
    const issue_type = formData.get('issue_type') as string;
    const description = formData.get('description') as string;
    const expected_result = formData.get('expected_result') as string;
    const actual_result = formData.get('actual_result') as string;
    const ai_result = JSON.parse(formData.get('ai_result') as string);
    const patient_context = JSON.parse(formData.get('patient_context') as string);

    if (!tool_type || !issue_type || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upload screenshots to Cloudinary
    const screenshotUrls: string[] = [];
    const screenshotFiles = Array.from(formData.keys()).filter(key => key.startsWith('screenshot_'));
    
    for (const key of screenshotFiles) {
      const file = formData.get(key) as File;
      if (file) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          // Upload to Cloudinary
          const result = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                folder: 'mediai/bug_reports',
                resource_type: 'image',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            ).end(buffer);
          });
          
          screenshotUrls.push(result.secure_url);
        } catch (error) {
          console.error('Error uploading screenshot:', error);
        }
      }
    }

    // Create bug report in database
    const bugReportsCollection = db.collection('ai_bug_reports');
    const bugReport = {
      doctor_email: session.user.email,
      doctor_name: user.full_name || user.name || 'Doctor',
      tool_type, // 'interactions', 'side_effects', 'symptoms'
      issue_type, // 'wrong_data', 'incorrect_analysis', etc.
      description,
      expected_result,
      actual_result,
      ai_result, // The actual AI output
      patient_context, // Patient info used
      screenshots: screenshotUrls,
      status: 'pending', // pending, investigating, resolved, not_an_issue
      admin_response: null,
      admin_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      resolved_at: null
    };

    const result = await bugReportsCollection.insertOne(bugReport);

    // Get admin email
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mediai.health26@gmail.com';

    // Send email notification to admin
    try {
      await notificationService.sendEmail({
        to: adminEmail,
        subject: 'New AI Bug Report - MediAI',
        html: `
          <h2>New AI Issue Reported by Doctor</h2>
          <p>A doctor has reported an issue with the AI system.</p>
          
          <h3>Report Details:</h3>
          <ul>
            <li><strong>Doctor:</strong> ${bugReport.doctor_name} (${bugReport.doctor_email})</li>
            <li><strong>Tool:</strong> ${tool_type}</li>
            <li><strong>Issue Type:</strong> ${issue_type}</li>
            <li><strong>Description:</strong> ${description}</li>
          </ul>
          
          <p><strong>Expected Result:</strong><br>${expected_result || 'Not specified'}</p>
          <p><strong>Actual Result:</strong><br>${actual_result || 'Not specified'}</p>
          
          ${screenshotUrls.length > 0 ? `<p><strong>Screenshots:</strong> ${screenshotUrls.length} attached</p>` : ''}
          
          <p>Please review this report in the admin dashboard.</p>
          
          <p>Best regards,<br>MediAI System</p>
        `
      });
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Bug report submitted successfully',
      report_id: result.insertedId.toString()
    });
  } catch (error: any) {
    console.error('Error submitting bug report:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit bug report' }, { status: 500 });
  }
}

// GET: Fetch doctor's own bug reports
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can view bug reports' }, { status: 403 });
    }

    // Fetch doctor's bug reports
    const bugReportsCollection = db.collection('ai_bug_reports');
    const reports = await bugReportsCollection
      .find({ doctor_email: session.user.email })
      .sort({ created_at: -1 })
      .toArray();

    const formattedReports = reports.map(r => ({
      ...r,
      _id: r._id.toString()
    }));

    return NextResponse.json({
      success: true,
      reports: formattedReports
    });
  } catch (error: any) {
    console.error('Error fetching bug reports:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch bug reports' }, { status: 500 });
  }
}

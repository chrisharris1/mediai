import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import MedicineLog from '@/models/MedicineLog';
import MedicineTracker from '@/models/MedicineTracker';
import { User } from '@/models/User';
import nodemailer from 'nodemailer';
import { autoMarkMissedDoses, getPendingDosesForReminders } from '@/lib/medicineScheduler';

// This endpoint will be called by a cron job to send notifications
export async function POST(req: NextRequest) {
  try {
    // Verify cron authorization
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // STEP 1: Auto-mark missed doses (30 minutes grace period)
    const missedCount = await autoMarkMissedDoses(30);
    console.log(`✅ Auto-marked ${missedCount} doses as missed`);

    // STEP 2: Get pending doses for the next 30 minutes (30-min early reminder)
    const upcomingDoses = await getPendingDosesForReminders(30);

    const notificationsSent = {
      in_app: 0,
      email: 0,
      sms: 0,
      missed_notifications: 0,
    };

    // STEP 3: Send reminders for upcoming doses (30 minutes before scheduled time)
    for (const dose of upcomingDoses) {
      const medicine = dose.medicine_tracker_id as any;
      
      if (!medicine || !medicine.notifications_enabled) continue;

      const user = await getMedicineUser(medicine.user_id);
      if (!user) continue;

      // Send In-App Notification
      if (medicine.notification_channels.in_app) {
        await sendInAppNotification(user, dose, medicine);
        notificationsSent.in_app++;
      }

      // Send Email Notification
      if (medicine.notification_channels.email && user.email) {
        await sendEmailNotification(user, dose, medicine);
        notificationsSent.email++;
      }

      // Send SMS Notification
      if (medicine.notification_channels.sms && medicine.phone_number) {
        await sendSMSNotification(medicine.phone_number, dose, medicine);
        notificationsSent.sms++;
      }
    }

    // STEP 4: Send notifications for recently missed doses
    const recentlyMissed = await MedicineLog.find({
      status: 'missed',
      logged_via: 'auto_system', // Only auto-marked ones
      scheduled_time: {
        $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      },
    }).populate('medicine_tracker_id');

    for (const missedDose of recentlyMissed) {
      const medicine = missedDose.medicine_tracker_id as any;
      if (!medicine) continue;

      const user = await getMedicineUser(medicine.user_id);
      if (!user) continue;

      // Send missed dose notification via email
      if (medicine.notification_channels.email && user.email) {
        await sendMissedDoseEmail(user, missedDose, medicine);
        notificationsSent.missed_notifications++;
      }
    }

    return NextResponse.json({
      message: 'Notifications processed',
      count: notificationsSent,
      processed: upcomingDoses.length,
      missed: missedCount,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getMedicineUser(userId: string) {
  try {
    const { getDatabase } = await import('@/lib/mongodb');
    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

async function sendInAppNotification(user: any, dose: any, medicine: any) {
  // Store in-app notification (you can create a Notification model)
  // For now, we'll just log it
  console.log(`In-App Notification: ${user.full_name}, take ${medicine.medicine_name} at ${dose.scheduled_time}`);
  
  // You can integrate with WebSocket or Server-Sent Events here
  return true;
}

async function sendEmailNotification(user: any, dose: any, medicine: any) {
  try {
    // Create email transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const scheduledTime = new Date(dose.scheduled_time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const mailOptions = {
      from: `"MediAI" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: `💊 Reminder: Time to take ${medicine.medicine_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { background: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
            .content { color: #333; line-height: 1.6; }
            .medicine-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💊 Medicine Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${user.full_name},</p>
              <p>This is your reminder to take your medication:</p>
              
              <div class="medicine-box">
                <h3>${medicine.medicine_name}</h3>
                <p><strong>Dosage:</strong> ${medicine.dosage}</p>
                <p><strong>Time:</strong> ${scheduledTime}</p>
                ${medicine.instructions ? `<p><strong>Instructions:</strong> ${medicine.instructions}</p>` : ''}
              </div>

              <p>Please take your medicine as prescribed and log it in the app to track your adherence.</p>
              
              <center>
                <a href="${process.env.NEXTAUTH_URL}/medicines" class="button">Log Dose Now</a>
              </center>
            </div>
            <div class="footer">
              <p>MediAI - Your AI-Powered Health Companion</p>
              <p>This is an automated reminder. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

async function sendSMSNotification(phoneNumber: string, dose: any, medicine: any) {
  try {
    const message = `[MediAI] Reminder: Take ${medicine.medicine_name} (${medicine.dosage}) at ${new Date(dose.scheduled_time).toLocaleTimeString()}`;
    
    // Twilio SMS integration
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    
    console.log(`SMS sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

async function sendMissedDoseEmail(user: any, dose: any, medicine: any) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const scheduledTime = new Date(dose.scheduled_time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const scheduledDate = new Date(dose.scheduled_time).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const mailOptions = {
      from: `"MediAI" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: `⚠️ Missed Dose Alert: ${medicine.medicine_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { background: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
            .content { color: #333; line-height: 1.6; }
            .medicine-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Missed Dose Alert</h1>
            </div>
            <div class="content">
              <p>Hi ${user.full_name},</p>
              <p>You missed your scheduled medication dose:</p>
              
              <div class="medicine-box">
                <h3 style="color: #dc2626; margin-top: 0;">${medicine.medicine_name}</h3>
                <p><strong>Dosage:</strong> ${medicine.dosage}</p>
                <p><strong>Scheduled Time:</strong> ${scheduledTime} on ${scheduledDate}</p>
                ${medicine.instructions ? `<p><strong>Instructions:</strong> ${medicine.instructions}</p>` : ''}
              </div>

              <p><strong>What to do next:</strong></p>
              <ul>
                <li>If you've already taken it, please log it in the app</li>
                <li>If you haven't, check with your doctor if you should take it now</li>
                <li>Do not double dose without medical advice</li>
              </ul>
              
              <center>
                <a href="${process.env.NEXTAUTH_URL}/medicines" class="button">View Medicine Tracker</a>
              </center>
            </div>
            <div class="footer">
              <p>MediAI - Your AI-Powered Health Companion</p>
              <p>This is an automated reminder. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Missed dose email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending missed dose email:', error);
    return false;
  }
}

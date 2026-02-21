import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import MedicineLog from '@/models/MedicineLog';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get date range from query params or default to last 7 days
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date, endDate: Date;
    
    if (startDateParam && endDateParam) {
      // Use provided date range
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default: last 7 days
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = startDate;

    const logs = await MedicineLog.find({
      user_id: session.user.id,
      scheduled_time: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ scheduled_time: 1 });

    // Group by date with detailed info
    const dailyStats: Record<string, any> = {};
    
    // Initialize all days in the range
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    for (let i = 0; i < dayCount; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const dayKey = day.toISOString().split('T')[0];
      
      dailyStats[dayKey] = {
        date: dayKey,
        displayDate: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        taken: [],
        missed: [],
        pending: [],
        total: 0,
      };
    }

    // Process logs
    logs.forEach((log: any) => {
      const logDate = new Date(log.scheduled_time);
      logDate.setHours(0, 0, 0, 0);
      const dateKey = logDate.toISOString().split('T')[0];
      
      // Skip past pending doses (they should have been marked missed)
      if (log.status === 'pending' && logDate < today) {
        return;
      }

      if (dailyStats[dateKey]) {
        dailyStats[dateKey].total++;
        
        const logDetail = {
          medicine: log.medicine_name,
          time: new Date(log.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          actualTime: log.actual_time ? new Date(log.actual_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
          fullDate: new Date(log.scheduled_time).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
        };

        if (log.status === 'taken') {
          dailyStats[dateKey].taken.push(logDetail);
        } else if (log.status === 'missed') {
          dailyStats[dateKey].missed.push(logDetail);
        } else if (log.status === 'pending') {
          dailyStats[dateKey].pending.push(logDetail);
        }
      }
    });

    // Convert to arrays for charts
    const sortedDates = Object.keys(dailyStats).sort();
    const labels = sortedDates.map(date => dailyStats[date].displayDate);
    const rates = sortedDates.map(date => {
      const stats = dailyStats[date];
      const takenCount = stats.taken.length;
      const totalNonPending = takenCount + stats.missed.length;
      return totalNonPending > 0 ? Math.round((takenCount / totalNonPending) * 100) : 0;
    });

    // Detailed data for tooltips
    const detailedData = sortedDates.map(date => dailyStats[date]);

    // Calculate overall totals
    const totalTaken = detailedData.reduce((sum, day) => sum + day.taken.length, 0);
    const totalMissed = detailedData.reduce((sum, day) => sum + day.missed.length, 0);
    const totalPending = detailedData.reduce((sum, day) => sum + day.pending.length, 0);

    // Collect detailed dose information for pie chart tooltips
    const allTakenDoses: any[] = [];
    const allMissedDoses: any[] = [];
    const allPendingDoses: any[] = [];

    logs.forEach((log: any) => {
      const logDate = new Date(log.scheduled_time);
      logDate.setHours(0, 0, 0, 0);
      
      // Skip past pending doses
      if (log.status === 'pending' && logDate < today) {
        return;
      }

      const doseDetail = {
        medicine_name: log.medicine_name,
        scheduled_time: log.scheduled_time,
        actual_time: log.actual_time,
        status: log.status,
      };

      if (log.status === 'taken') {
        allTakenDoses.push(doseDetail);
      } else if (log.status === 'missed') {
        allMissedDoses.push(doseDetail);
      } else if (log.status === 'pending') {
        allPendingDoses.push(doseDetail);
      }
    });

    // Sort by most recent first
    allTakenDoses.sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
    allMissedDoses.sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
    allPendingDoses.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()); // Future first

    return NextResponse.json({
      weekly: {
        labels,
        rates,
        detailed: detailedData, // Include detailed data for tooltips
      },
      overall: {
        total_taken: totalTaken,
        total_missed: totalMissed,
        total_pending: totalPending,
        detailed_doses: {
          taken: allTakenDoses,
          missed: allMissedDoses,
          pending: allPendingDoses,
        },
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching adherence stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

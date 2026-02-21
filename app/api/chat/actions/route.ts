import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import MedicineTracker from '@/models/MedicineTracker';
import Doctor from '@/models/Doctor';
import { User } from '@/models/User';
import { createScheduledDoses, getTodaysDoses } from '@/lib/medicineScheduler';
import { analyzeSymptoms } from '@/lib/symptomAnalyzer';

/**
 * POST /api/chat/actions
 * Execute platform actions triggered by the chatbot
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, params } = await req.json();

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        await dbConnect();

        switch (action) {
            case 'GET_TODAYS_MEDICINES':
                return await getTodaysMedicines(session.user.id);

            case 'GET_ADHERENCE_STATS':
                return await getAdherenceStats(session.user.id);

            case 'GET_DOCTORS':
                return await getDoctors(params?.specialization);

            case 'ADD_MEDICINE':
                return await addMedicine(session.user.id, params);

            case 'CHECK_INTERACTION':
                return await checkDrugInteraction(params?.drug1, params?.drug2);

            case 'ANALYZE_SYMPTOMS':
                return await handleSymptomAnalysis(params?.symptoms);

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Action error:', error);
        return NextResponse.json(
            { error: 'Failed to execute action', details: error.message },
            { status: 500 }
        );
    }
}

// Get today's medications
async function getTodaysMedicines(userId: string) {
    const doses = await getTodaysDoses(userId);
    const medicines = await MedicineTracker.find({ user_id: userId, status: 'active' });

    const pending = doses.filter((d: any) => d.status === 'pending');
    const taken = doses.filter((d: any) => d.status === 'taken');

    return NextResponse.json({
        success: true,
        data: {
            doses: doses.map((d: any) => ({
                medicine_name: d.medicine_name,
                dosage: medicines.find((m: any) => m._id.toString() === d.medicine_tracker_id?.toString())?.dosage,
                scheduled_time: d.scheduled_time,
                status: d.status,
            })),
            summary: {
                total: doses.length,
                pending: pending.length,
                taken: taken.length,
                missed: doses.filter((d: any) => d.status === 'missed').length,
            },
        },
    });
}

// Get adherence statistics
async function getAdherenceStats(userId: string) {
    const medicines = await MedicineTracker.find({ user_id: userId, status: 'active' });

    const totalDosesExpected = medicines.reduce((sum: number, m: any) => sum + (m.total_doses_expected || 0), 0);
    const totalDosesTaken = medicines.reduce((sum: number, m: any) => sum + (m.total_doses_taken || 0), 0);
    const overallAdherence = totalDosesExpected > 0 ? Math.round((totalDosesTaken / totalDosesExpected) * 100) : 0;

    return NextResponse.json({
        success: true,
        data: {
            overallAdherence,
            totalMedicines: medicines.length,
            medications: medicines.map((m: any) => ({
                name: m.medicine_name,
                dosage: m.dosage,
                adherenceRate: m.adherence_rate || 0,
                dosesTaken: m.total_doses_taken || 0,
                dosesExpected: m.total_doses_expected || 0,
            })),
        },
    });
}

// Get available doctors
async function getDoctors(specialization?: string) {
    let query: any = { status: 'approved' };

    if (specialization) {
        query.specialization = { $regex: specialization, $options: 'i' };
    }

    const doctors = await Doctor.find(query).limit(10);

    return NextResponse.json({
        success: true,
        data: {
            doctors: doctors.map((d: any) => ({
                id: d._id,
                name: d.full_name,
                specialization: d.specialization,
                hospital: d.hospital,
                rating: d.rating,
                experience: d.experience,
            })),
        },
    });
}

// Add medicine via chatbot
async function addMedicine(userId: string, params: any) {
    const {
        medicine_name,
        dosage,
        frequency = 'daily',
        times = ['08:00'],
        start_date,
        purpose,
        enableEmailNotifications = true,
        enableSmsNotifications = true,
        phone_number,
    } = params || {};

    if (!medicine_name) {
        return NextResponse.json({
            success: false,
            error: 'Medicine name is required',
            needsInfo: ['medicine_name'],
        }, { status: 400 });
    }

    if (!dosage) {
        return NextResponse.json({
            success: false,
            error: 'Dosage is required',
            needsInfo: ['dosage'],
        }, { status: 400 });
    }

    // Get user's phone number if SMS enabled and not provided
    let userPhone = phone_number;
    if (enableSmsNotifications && !phone_number) {
        const user = await User.findById(userId);
        userPhone = user?.profile?.phone;
    }

    const startDate = start_date ? new Date(start_date) : new Date();

    // Create the medicine tracker entry
    const newMedicine = new MedicineTracker({
        user_id: userId,
        medicine_name,
        dosage,
        frequency,
        times: Array.isArray(times) ? times : [times],
        start_date: startDate,
        instructions: '',
        purpose: purpose || '',
        notifications_enabled: true,
        notification_channels: {
            in_app: true,
            email: enableEmailNotifications,
            sms: enableSmsNotifications,
        },
        phone_number: userPhone,
        status: 'active',
        total_doses_expected: 30 * times.length, // Default 30 days
        total_doses_taken: 0,
        adherence_rate: 0,
    });

    await newMedicine.save();

    // Create scheduled doses for the next 30 days
    await createScheduledDoses({
        userId,
        medicineId: newMedicine._id.toString(),
        medicineName: medicine_name,
        dosage,
        times: Array.isArray(times) ? times : [times],
        startDate,
        scheduleDuration: 30,
    });

    const notificationChannels = [];
    if (enableEmailNotifications) notificationChannels.push('Email');
    if (enableSmsNotifications) notificationChannels.push('SMS');

    return NextResponse.json({
        success: true,
        message: `Medicine added successfully!`,
        data: {
            id: newMedicine._id,
            medicine_name,
            dosage,
            frequency,
            times,
            notifications: notificationChannels,
        },
    });
}

// Check drug interaction (placeholder - integrates with existing AI endpoint)
async function checkDrugInteraction(drug1?: string, drug2?: string) {
    if (!drug1 || !drug2) {
        return NextResponse.json({
            success: false,
            error: 'Two drug names are required',
            needsInfo: !drug1 ? ['drug1'] : ['drug2'],
        }, { status: 400 });
    }

    // In a real implementation, this would call your Flask AI API
    // For now, return a placeholder response
    return NextResponse.json({
        success: true,
        data: {
            drug1,
            drug2,
            interaction: 'moderate',
            description: `Please consult with a healthcare professional about potential interactions between ${drug1} and ${drug2}.`,
            recommendation: 'Consider checking with your doctor or pharmacist for personalized advice.',
        },
    });
}

// Handle symptom analysis
async function handleSymptomAnalysis(symptoms?: string[]) {
    if (!symptoms || symptoms.length === 0) {
        return NextResponse.json({
            success: false,
            error: 'Please describe your symptoms',
            needsInfo: ['symptoms'],
        }, { status: 400 });
    }

    const analysis = analyzeSymptoms(symptoms);

    return NextResponse.json({
        success: true,
        data: analysis,
    });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import { generateChatResponse, parseActions, cleanResponse } from '@/lib/groq';
import ChatHistory from '@/models/ChatHistory';
import MedicineTracker from '@/models/MedicineTracker';
import { User } from '@/models/User';
import Doctor from '@/models/Doctor';
import { getTodaysDoses } from '@/lib/medicineScheduler';
import { analyzeSymptoms } from '@/lib/symptomAnalyzer';

// POST /api/chat - Send a message and get AI response
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, includeContext = true } = await req.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        await dbConnect();

        // Get user's chat history
        let chatHistory = await ChatHistory.findOne({ user_id: session.user.id });

        if (!chatHistory) {
            chatHistory = new ChatHistory({
                user_id: session.user.id,
                messages: [],
            });
        }

        // Build context about the user
        let userContext = '';
        if (includeContext) {
            const user = await User.findById(session.user.id);
            const medicines = await MedicineTracker.find({
                user_id: session.user.id,
                status: 'active'
            });

            userContext = `
User Profile:
- Name: ${user?.full_name || session.user.name || 'User'}
- Role: ${user?.role || 'patient'}
${user?.profile?.age ? `- Age: ${user.profile.age}` : ''}
${user?.profile?.gender ? `- Gender: ${user.profile.gender}` : ''}
${user?.profile?.chronic_conditions?.length ? `- Chronic Conditions: ${user.profile.chronic_conditions.join(', ')}` : ''}
${user?.profile?.allergies?.length ? `- Allergies: ${user.profile.allergies.join(', ')}` : ''}

Current Medications (${medicines.length} active):
${medicines.map(m => `- ${m.medicine_name} ${m.dosage} (${m.frequency})`).join('\n') || 'None tracked'}
      `.trim();
        }

        // Convert chat history to Gemini format (last 20 messages for context)
        const historyForGemini = chatHistory.messages.slice(-20).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // Generate AI response with streaming
        let aiResponse = await generateChatResponse(message, historyForGemini, userContext);

        // Parse actions from response
        const actions = parseActions(aiResponse);

        // Execute actions and append results to response
        let actionResults: any[] = [];
        for (const action of actions) {
            const result = await executeAction(action.action, session.user.id, message);
            if (result) {
                actionResults.push(result);
            }
        }

        // Clean the response (remove action tags)
        const cleanedResponse = cleanResponse(aiResponse);

        // Build final response with action data
        let finalResponse = cleanedResponse;

        // Append action results to response if any
        if (actionResults.length > 0) {
            const actionData = actionResults.map(r => r.formattedData).filter(Boolean).join('\n\n');
            if (actionData) {
                finalResponse = `${cleanedResponse}\n\n${actionData}`;
            }
        }

        // Save messages to history
        chatHistory.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
        });

        chatHistory.messages.push({
            role: 'assistant',
            content: finalResponse,
            timestamp: new Date(),
            actions: actions.map(a => a.action),
        });

        await chatHistory.save();

        return NextResponse.json({
            success: true,
            message: finalResponse,
            actions: actions.map(a => a.action),
            actionResults: actionResults.map(r => r.data),
        });

    } catch (error: any) {
        console.error('Chat error:', error);

        // Handle rate limit errors specifically
        if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
            return NextResponse.json(
                {
                    error: 'AI service is temporarily busy. Please wait a moment and try again.',
                    isRateLimited: true,
                    retryAfter: 30 // seconds
                },
                { status: 429 }
            );
        }

        // Handle API key issues
        if (error.status === 401 || error.status === 403 || error.message?.includes('API key')) {
            return NextResponse.json(
                { error: 'AI service configuration error. Please contact support.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to process message', details: error.message },
            { status: 500 }
        );
    }
}

// Execute platform actions based on AI response
async function executeAction(action: string, userId: string, userMessage: string) {
    try {
        switch (action) {
            case 'GET_TODAYS_MEDICINES': {
                const doses = await getTodaysDoses(userId);
                const medicines = await MedicineTracker.find({ user_id: userId, status: 'active' });

                if (doses.length === 0) {
                    return {
                        data: { doses: [], medicines: medicines.length },
                        formattedData: medicines.length > 0
                            ? `📋 **Your Medications Today:**\nNo doses scheduled yet for today, but you have ${medicines.length} active medication(s) in your tracker.`
                            : `📋 You don't have any medications tracked yet. Would you like to add one?`,
                    };
                }

                const pending = doses.filter((d: any) => d.status === 'pending');
                const taken = doses.filter((d: any) => d.status === 'taken');

                const doseList = doses.map((d: any) => {
                    const med = medicines.find((m: any) => m._id.toString() === d.medicine_tracker_id?.toString());
                    const status = d.status === 'taken' ? '✅' : d.status === 'missed' ? '❌' : '⏰';
                    const time = new Date(d.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    return `${status} **${d.medicine_name}** ${med?.dosage || ''} - ${time}`;
                }).join('\n');

                return {
                    data: { doses, pending: pending.length, taken: taken.length, total: doses.length },
                    formattedData: `📋 **Your Medications Today:**\n${doseList}\n\n📊 Progress: ${taken.length}/${doses.length} taken | ${pending.length} pending`,
                };
            }

            case 'GET_ADHERENCE_STATS': {
                const medicines = await MedicineTracker.find({ user_id: userId, status: 'active' });

                if (medicines.length === 0) {
                    return {
                        data: { adherence: 0, medicines: 0 },
                        formattedData: `📊 **Adherence Stats:**\nNo medications tracked yet. Add medications to track your adherence!`,
                    };
                }

                const totalDosesExpected = medicines.reduce((sum: number, m: any) => sum + (m.total_doses_expected || 0), 0);
                const totalDosesTaken = medicines.reduce((sum: number, m: any) => sum + (m.total_doses_taken || 0), 0);
                const overallAdherence = totalDosesExpected > 0 ? Math.round((totalDosesTaken / totalDosesExpected) * 100) : 0;

                const medStats = medicines.map((m: any) =>
                    `- **${m.medicine_name}**: ${m.adherence_rate || 0}%`
                ).join('\n');

                return {
                    data: { adherence: overallAdherence, medicines: medicines.length, details: medicines },
                    formattedData: `📊 **Your Medication Adherence:**\n\n🎯 Overall: **${overallAdherence}%**\n\n${medStats}`,
                };
            }

            case 'GET_DOCTORS': {
                const doctors = await Doctor.find({ status: 'approved' }).limit(5);

                if (doctors.length === 0) {
                    return {
                        data: { doctors: [] },
                        formattedData: `👨‍⚕️ **Available Doctors:**\nNo doctors available at the moment. Please check back later.`,
                    };
                }

                const doctorList = doctors.map((d: any) =>
                    `👨‍⚕️ **Dr. ${d.full_name}**\n   🏥 ${d.specialization || 'General'} | ⭐ ${d.rating || 'New'}\n   📍 ${d.hospital || 'Private Practice'}`
                ).join('\n\n');

                return {
                    data: { doctors },
                    formattedData: `👨‍⚕️ **Available Doctors:**\n\n${doctorList}\n\n💡 Visit the Consultations page to book an appointment!`,
                };
            }

            case 'ANALYZE_SYMPTOMS': {
                // Extract symptoms from user message
                const symptoms = extractSymptoms(userMessage);

                if (symptoms.length === 0) {
                    return null;
                }

                const analysis = analyzeSymptoms(symptoms);

                return {
                    data: analysis,
                    formattedData: null, // Let the AI format the symptom response
                };
            }

            default:
                return null;
        }
    } catch (error) {
        console.error(`Action ${action} failed:`, error);
        return null;
    }
}

// Extract symptoms from user message
function extractSymptoms(message: string): string[] {
    const commonSymptoms = [
        'fever', 'headache', 'cough', 'cold', 'fatigue', 'nausea', 'vomiting',
        'diarrhea', 'dizziness', 'chest pain', 'shortness of breath', 'sore throat',
        'runny nose', 'body ache', 'muscle pain', 'joint pain', 'back pain',
        'stomach pain', 'abdominal pain', 'rash', 'itching', 'swelling',
        'anxiety', 'depression', 'insomnia', 'constipation', 'bloating'
    ];

    const lowerMessage = message.toLowerCase();
    return commonSymptoms.filter(symptom => lowerMessage.includes(symptom));
}

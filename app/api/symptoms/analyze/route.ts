import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const PYTHON_AI_API_URL = 'http://localhost:8001';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      symptoms,
      duration,
      medications,
      homeRemedies,
      manualData, // Manual health data from form
    } = body;

    // Validate input
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return NextResponse.json(
        { error: 'At least one symptom is required' },
        { status: 400 }
      );
    }

    let age = 30;
    let weight = 70;
    let gender = 'unknown';
    let chronicConditions: string[] = [];
    let currentMeds: string[] = [];
    let isManualData = false;

    // Check if manual data provided (from AI tools form)
    if (manualData && (manualData.age || manualData.weight || manualData.gender)) {
      console.log('📝 Using manual form data:', manualData);
      isManualData = true;
      age = manualData.age || 30;
      weight = manualData.weight || 70;
      gender = manualData.gender?.toLowerCase() || 'unknown';
      chronicConditions = manualData.chronic_conditions || [];
      currentMeds = medications || [];
    } else {
      // Try to fetch profile from database
      const profilesCollection = db.collection('health_profiles');
      const profile = await profilesCollection.findOne({ email: user.email });

      console.log('📊 Fetched profile for symptom analysis:', {
        email: user.email,
        found: !!profile,
        gender: profile?.gender,
        date_of_birth: profile?.date_of_birth,
        weight: profile?.medical_info?.weight
      });

      if (profile) {
        // Calculate age from date_of_birth
        if (profile.date_of_birth) {
          const birthDate = new Date(profile.date_of_birth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        // Extract weight (convert to number)
        weight = profile.medical_info?.weight ? parseFloat(profile.medical_info.weight) : 70;
        
        // Get gender (lowercase for consistency)
        gender = profile.gender?.toLowerCase() || 'unknown';

        // Get chronic conditions from medical history
        if (profile.medical_info?.past_medical_history) {
          const history = profile.medical_info.past_medical_history.toLowerCase();
          const commonConditions = ['diabetes', 'hypertension', 'asthma', 'heart disease', 'arthritis', 'copd', 'kidney disease', 'liver disease'];
          commonConditions.forEach(condition => {
            if (history.includes(condition)) {
              chronicConditions.push(condition);
            }
          });
        }

        // Get current medications from profile
        currentMeds = (profile.medical_info?.current_medications || []).map((med: any) => 
          typeof med === 'string' ? med : med.name
        );
      }
      // If no profile found, use default values already set above
    }

    // Step 1: Validate symptoms with Python AI
    const validateResponse = await fetch(`${PYTHON_AI_API_URL}/api/validate-symptoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms })
    });

    if (!validateResponse.ok) {
      const validationError = await validateResponse.json();
      return NextResponse.json({
        error: validationError.message || 'Invalid symptoms',
        invalid_symptoms: validationError.invalid_symptoms || [],
        suggestions: validationError.suggestions || {}
      }, { status: 400 });
    }

    const validationData = await validateResponse.json();

    // Step 2: Call Python AI for symptom analysis
    const analysisPayload = {
      symptoms: symptoms,
      age: age,
      weight: weight,
      gender: gender,
      chronic_conditions: chronicConditions,
      current_medications: currentMeds,
      duration: duration || 'unknown'
    };
    
    console.log('🔬 Sending to Python AI:', analysisPayload);

    const analysisResponse = await fetch(`${PYTHON_AI_API_URL}/api/analyze-symptoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysisPayload)
    });

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json();
      return NextResponse.json({
        error: errorData.error || 'Failed to analyze symptoms'
      }, { status: 400 });
    }

    const analysisData = await analysisResponse.json();

    // Step 3: Check for drug interactions with suggested medicines
    const suggestedMedicines = analysisData.recommendations?.suggested_medicines || [];
    let medicineWarnings: string[] = [];

    // Check if suggested medicines conflict with current medications
    if (suggestedMedicines.length > 0 && currentMeds.length > 0) {
      for (const suggestedMed of suggestedMedicines.slice(0, 3)) {
        try {
          const interactionCheck = await fetch(`${PYTHON_AI_API_URL}/api/check-interactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              medicines: [suggestedMed, ...currentMeds],
              age: age,
              weight: weight,
              gender: gender,
              chronic_conditions: chronicConditions
            })
          });

          if (interactionCheck.ok) {
            const interactionData = await interactionCheck.json();
            if (interactionData.overall_risk === 'high_risk' || interactionData.overall_risk === 'moderate_risk') {
              medicineWarnings.push(`⚠️ ${suggestedMed} may interact with your current medications`);
            }
          }
        } catch (err) {
          console.error('Interaction check failed:', err);
        }
      }
    }

    // Step 4: Save symptom report to database (skip if using manual data)
    let reportId = null;
    if (!isManualData) {
      // Save report when using profile data, skip for manual AI tools usage
      const symptomReportsCollection = db.collection('symptom_reports');
      const report = await symptomReportsCollection.insertOne({
        user_id: user._id,
        symptoms: symptoms,
        validated_symptoms: validationData.validated_symptoms || [],
        duration: duration || 'unknown',
        patient_info: {
          age: age,
          weight: weight,
          gender: gender,
          chronic_conditions: chronicConditions,
          current_medications: currentMeds
        },
        analysis: {
          overall_risk: analysisData.overall_risk,
          risk_score: analysisData.risk_score,
          urgency: analysisData.urgency,
          emergency_detected: analysisData.emergency_detected,
          possible_conditions: analysisData.possible_conditions || [],
          recommendations: analysisData.recommendations || {},
          overall_advice: analysisData.overall_advice,
          patient_profile: analysisData.patient_profile || {}
        },
        medicine_warnings: medicineWarnings,
        created_at: new Date(),
        updated_at: new Date(),
      });
      reportId = report.insertedId.toString();
    }

    // Return complete analysis
    return NextResponse.json({
      success: true,
      reportId: reportId,
      analysis: {
        ...analysisData,
        medicine_warnings: medicineWarnings,
        patient_info: {
          age: age,
          weight: weight,
          gender: gender,
          chronic_conditions: chronicConditions,
          current_medications_count: currentMeds.length
        }
      }
    });
  } catch (error: any) {
    console.error('Symptom analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze symptoms', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const symptomReportsCollection = db.collection('symptom_reports');
    const reports = await symptomReportsCollection
      .find({ user_id: user._id })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

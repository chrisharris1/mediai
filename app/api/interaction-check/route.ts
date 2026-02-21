import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

const PYTHON_AI_API_URL = 'http://localhost:8001'; // Enhanced API (OCR on 8000)

// POST - Check drug interactions based on user profile (MODULE 1)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { medicine, profile } = body;

    if (!medicine || !profile) {
      return NextResponse.json({ message: 'Medicine name and profile are required' }, { status: 400 });
    }

    // Step 1: Validate medicine name (prevent gibberish)
    const validateResponse = await fetch(`${PYTHON_AI_API_URL}/api/validate-medicine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicine })
    });

    if (!validateResponse.ok) {
      const validationError = await validateResponse.json();
      return NextResponse.json({
        message: validationError.message || 'Invalid medicine name',
        suggestions: validationError.suggestions || []
      }, { status: 400 });
    }

    // Step 2: Call MODULE 1 - Drug Interaction Analyzer
    // Extract medication names (handle both string and object formats)
    const currentMeds = (profile.current_medications || []).map((med: any) => 
      typeof med === 'string' ? med : med.name
    );
    const medicines = [medicine, ...currentMeds];
    
    console.log('🔍 Backend API Debug - interaction-check');
    console.log('Received medicine:', medicine);
    console.log('Received current_medications:', profile.current_medications);
    console.log('Processed currentMeds:', currentMeds);
    console.log('Final medicines array:', medicines);
    console.log('Medicines count:', medicines.length);
    
    const pythonPayload = {
      medicines: medicines,
      age: profile.age || 30,
      weight: profile.weight || 70,
      gender: profile.gender || 'unknown',
      chronic_conditions: profile.chronic_conditions || []
    };
    
    console.log('📤 Sending to Python API:', JSON.stringify(pythonPayload, null, 2));
    
    const response = await fetch(`${PYTHON_AI_API_URL}/api/check-interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pythonPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({
        message: errorData.error || 'Failed to check interactions',
        tip: errorData.tip
      }, { status: 400 });
    }

    const data = await response.json();
    
    // Step 3: Check for allergies (additional frontend check)
    let hasSevereAllergy = false;
    const allergyWarnings: string[] = [];
    
    if (profile.allergies && profile.allergies.length > 0) {
      const medicineLower = medicine.toLowerCase();
      profile.allergies.forEach((allergy: any) => {
        const allergyName = typeof allergy === 'string' ? allergy : allergy.name;
        if (medicineLower.includes(allergyName.toLowerCase())) {
          allergyWarnings.push(`⚠️ CRITICAL: You have a known allergy to ${allergyName}. Do NOT take this medication.`);
          hasSevereAllergy = true;
        }
      });
    }
    
    // Combine results - Fix risk level mapping from Python API
    // Python returns: 'high_risk', 'moderate_risk', 'low_risk'
    const overallRisk = data.overall_assessment || data.overall_risk || 'low_risk';
    const severity = hasSevereAllergy ? 'severe' : 
                     overallRisk === 'high_risk' ? 'severe' :
                     overallRisk === 'moderate_risk' ? 'moderate' :
                     data.interactions.length > 0 && data.interactions.some((i: any) => i.severity === 'major') ? 'severe' :
                     data.interactions.length > 0 && data.interactions.some((i: any) => i.severity === 'moderate') ? 'moderate' :
                     data.interactions.length > 0 ? 'minor' : 'safe';
    
    // Fix: Show the searched medicine name, not the brand name from database
    const searchedMedicineName = medicine.trim();
    
    const interactions = [
      ...allergyWarnings,
      ...data.interactions.map((i: any) => {
        // Replace brand name with searched medicine name if it matches
        let displayDrug1 = i.drug1;
        let displayDrug2 = i.drug2;
        
        // If drug1 or drug2 is the searched medicine (check generic name match)
        const searchedMedicineLower = searchedMedicineName.toLowerCase();
        if (i.drug1.toLowerCase().includes('acetaminophen') && searchedMedicineLower.includes('acetaminophen')) {
          displayDrug1 = searchedMedicineName;
        } else if (i.drug1.toLowerCase().includes('paracetamol') && (searchedMedicineLower.includes('paracetamol') || searchedMedicineLower.includes('acetaminophen'))) {
          displayDrug1 = searchedMedicineName;
        }
        
        if (i.drug2.toLowerCase().includes('acetaminophen') && searchedMedicineLower.includes('acetaminophen')) {
          displayDrug2 = searchedMedicineName;
        } else if (i.drug2.toLowerCase().includes('paracetamol') && (searchedMedicineLower.includes('paracetamol') || searchedMedicineLower.includes('acetaminophen'))) {
          displayDrug2 = searchedMedicineName;
        }
        
        return `${i.severity.toUpperCase()}: ${displayDrug1} + ${displayDrug2} - ${i.effect}`;
      })
    ];
    
    const recommendations = hasSevereAllergy ? [
      '🚫 DO NOT take this medication due to severe allergy risk',
      'Contact your doctor immediately for an alternative'
    ] : severity === 'severe' ? [
      '🚨 Consult with your doctor before taking this medication',
      '⚠️ High risk interactions detected',
      '⚠️ Regular monitoring required',
      '⚠️ Report any unusual symptoms immediately'
    ] : severity === 'moderate' ? [
      '⚠️ Consult with your doctor before taking',
      'ℹ️ Monitor for side effects',
      'ℹ️ Take as prescribed',
      'ℹ️ Report unusual symptoms'
    ] : [
      '✅ Take as prescribed',
      '✅ Monitor for common side effects',
      'ℹ️ Contact doctor if symptoms worsen'
    ];

    // Get personalized side effects from MODULE 2
    let side_effects: string[] = [];
    try {
      const sideEffectResponse = await fetch(`${PYTHON_AI_API_URL}/api/predict-side-effects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine: medicine,
          age: profile.age || 30,
          weight: profile.weight || 70,
          gender: profile.gender || 'unknown',
          current_medications: currentMeds
        })
      });

      if (sideEffectResponse.ok) {
        const sideEffectData = await sideEffectResponse.json();
        
        // Use predicted side effects with probabilities
        if (sideEffectData.predicted_side_effects && sideEffectData.predicted_side_effects.length > 0) {
          side_effects = sideEffectData.predicted_side_effects
            .slice(0, 6)  // Top 6 side effects
            .map((se: any) => `${se.side_effect} (${se.probability}% risk)`);
        } else {
          // Fallback: Show message if no specific data available
          side_effects = [
            'No specific side effect data available for this medicine.',
            'Consult your doctor or pharmacist for detailed information.'
          ];
        }
      } else {
        // API error fallback
        side_effects = [
          'Unable to retrieve side effect data at this time.',
          'Please consult your healthcare provider.'
        ];
      }
    } catch (err) {
      console.error('Side effect prediction failed:', err);
      side_effects = [
        'Side effect prediction service temporarily unavailable.',
        'Please consult your healthcare provider for side effect information.'
      ];
    }

    return NextResponse.json({
      success: true,
      result: {
        medicine,
        severity,
        interactions,
        side_effects,
        recommendations,
        risk_assessment: data,
        debug: {
          python_risk: overallRisk,
          frontend_severity: severity,
          interaction_count: data.interactions.length,
          has_major_interactions: data.interactions.some((i: any) => i.severity === 'major')
        }
      }
    });

  } catch (error: any) {
    console.error('Interaction check error:', error);
    return NextResponse.json(
      { message: 'Failed to check interactions', error: error.message },
      { status: 500 }
    );
  }
}

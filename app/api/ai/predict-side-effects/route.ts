import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const PYTHON_AI_API_URL = 'http://localhost:8001'; // Enhanced API (OCR on 8000)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { medicine, age, weight, gender, chronic_conditions, current_medications } = body;
    
    if (!medicine) {
      return NextResponse.json(
        { error: 'Medicine name is required' },
        { status: 400 }
      );
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
        error: validationError.message || 'Invalid medicine name',
        message: validationError.message || 'Please enter a valid medicine name. Try common Indian brands like Crocin, Dolo, Paracetamol, etc.',
        suggestions: validationError.suggestions || []
      }, { status: 400 });
    }
    
    // Step 2: Call MODULE 2 - Side Effect Predictor with full patient demographics
    const response = await fetch(`${PYTHON_AI_API_URL}/api/predict-side-effects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicine: medicine,
        age: age || 30,
        weight: weight || 70,
        gender: gender || 'unknown',
        chronic_conditions: chronic_conditions || [],
        current_medications: current_medications || []
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { 
          error: error.error || 'Failed to predict side effects',
          message: error.error || 'Please check if Python API is running on port 8001'
        },
        { status: 400 }
      );
    }
    
    const prediction = await response.json();
    
    // Python API returns new structure:
    // { module, medicine, patient_profile, predicted_side_effects, overall_risk, recommendations, age_specific_warnings }
    return NextResponse.json({
      success: true,
      ...prediction  // Pass through entire Python API response
    });
    
  } catch (error: any) {
    console.error('Side effect prediction error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to predict side effects',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

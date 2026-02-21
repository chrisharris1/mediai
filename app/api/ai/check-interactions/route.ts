import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_AI_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { drug1, drug2 } = body;
    
    if (!drug1 || !drug2) {
      return NextResponse.json(
        { error: 'Both drug1 and drug2 are required' },
        { status: 400 }
      );
    }
    
    // Call Python AI API
    const response = await fetch(`${PYTHON_API_URL}/api/predict/interaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drug1: {
          name: drug1.name,
          category: drug1.category || 'UNKNOWN'
        },
        drug2: {
          name: drug2.name,
          category: drug2.category || 'UNKNOWN'
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get prediction from AI service');
    }
    
    const prediction = await response.json();
    
    return NextResponse.json(prediction);
    
  } catch (error: any) {
    console.error('Drug interaction prediction error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to predict drug interaction',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

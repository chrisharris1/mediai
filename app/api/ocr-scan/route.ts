import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

// POST - Scan medicine image using OCR
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ message: 'Image is required' }, { status: 400 });
    }

    // Convert image to base64 for sending to Flask backend
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Call Flask backend
    const flaskUrl = 'http://localhost:8000/ocr-scan';
    
    const flaskResponse = await fetch(flaskUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        filename: image.name
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (flaskResponse.ok) {
      const data = await flaskResponse.json();
      return NextResponse.json({
        medicine_name: data.medicine_name,
        confidence: data.confidence || 0,
        extracted_text: data.extracted_text || ''
      });
    } else {
      const errorData = await flaskResponse.json();
      return NextResponse.json({ 
        message: errorData.message || errorData.error || 'Could not identify medicine',
        extracted_text: errorData.extracted_text || ''
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

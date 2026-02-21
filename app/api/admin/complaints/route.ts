import { NextRequest, NextResponse } from 'next/server';
import { DoctorComplaint } from '@/models/DoctorComplaint';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'under_review'
      | 'resolved'
      | 'closed'
      | null;

    const complaints = await DoctorComplaint.findAll(status || undefined);

    return NextResponse.json({
      success: true,
      complaints,
      count: complaints.length,
    });
  } catch (error: any) {
    console.error('Get complaints error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complaints', details: error.message },
      { status: 500 }
    );
  }
}

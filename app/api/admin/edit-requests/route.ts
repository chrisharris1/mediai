import { NextRequest, NextResponse } from 'next/server';
import { DoctorEditRequest } from '@/models/DoctorEditRequest';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'pending'
      | 'approved'
      | 'rejected'
      | null;

    const editRequests = await DoctorEditRequest.findAll(status || undefined);

    return NextResponse.json({
      success: true,
      editRequests,
      count: editRequests.length,
    });
  } catch (error: any) {
    console.error('Get edit requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch edit requests', details: error.message },
      { status: 500 }
    );
  }
}

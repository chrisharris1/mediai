import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import MedicineTracker from '@/models/MedicineTracker';
import MedicineLog from '@/models/MedicineLog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch all active medicines
    const medicines = await MedicineTracker.find({
      user_id: session.user.id,
      status: 'active',
    });

    // Fetch logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await MedicineLog.find({
      user_id: session.user.id,
      scheduled_time: { $gte: thirtyDaysAgo },
    }).sort({ scheduled_time: -1 });

    // Calculate overall adherence
    const totalExpected = medicines.reduce((acc, m) => acc + m.total_doses_expected, 0);
    const totalTaken = medicines.reduce((acc, m) => acc + m.total_doses_taken, 0);
    const overallAdherence = totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;

    // Generate PDF
    const pdfBuffer = await generatePDF({
      user: session.user,
      medicines,
      logs,
      overallAdherence,
      totalExpected,
      totalTaken,
    });

    // Return as downloadable PDF file
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="MediAI-Report-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generatePDF(data: any): Promise<Buffer> {
  const { user, medicines, logs, overallAdherence, totalTaken, totalExpected } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header with gradient effect
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('MediAI Medicine Report', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }), pageWidth / 2, 30, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  let yPos = 50;
  
  // Patient Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', 14, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${user.name || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`Email: ${user.email || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`Report Period: Last 30 days`, 14, yPos);
  yPos += 15;
  
  // Overall Adherence Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Adherence Summary', 14, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Doses Expected: ${totalExpected}`, 14, yPos);
  yPos += 6;
  doc.text(`Total Doses Taken: ${totalTaken}`, 14, yPos);
  yPos += 6;
  doc.text(`Adherence Rate: ${overallAdherence}%`, 14, yPos);
  
  // Add adherence bar
  const barWidth = 100;
  const barHeight = 10;
  const barX = 14;
  yPos += 8;
  
  doc.setFillColor(220, 220, 220);
  doc.rect(barX, yPos, barWidth, barHeight, 'F');
  
  const fillWidth = (overallAdherence / 100) * barWidth;
  const color: [number, number, number] = overallAdherence >= 80 ? [34, 197, 94] : 
                overallAdherence >= 50 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(barX, yPos, fillWidth, barHeight, 'F');
  
  yPos += 20;
  
  // Active Medicines Table
  if (medicines.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Active Medications', 14, yPos);
    yPos += 8;
    
    const medicineRows = medicines.map((med: any) => [
      med.medicine_name,
      med.dosage,
      med.frequency,
      `${med.adherence_rate}%`,
      `${med.total_doses_taken}/${med.total_doses_expected}`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Medicine', 'Dosage', 'Frequency', 'Adherence', 'Taken/Expected']],
      body: medicineRows,
      theme: 'grid',
      headStyles: { fillColor: [102, 126, 234], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Recent Activity Log
  if (logs.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Activity (Last 30 Days)', 14, yPos);
    yPos += 8;
    
    const logRows = logs.slice(0, 15).map((log: any) => {
      const scheduledDate = new Date(log.scheduled_time);
      const status = log.status === 'taken' ? '✓ Taken' : 
                     log.status === 'missed' ? '✗ Missed' : '⏳ Pending';
      const time = log.actual_time 
        ? new Date(log.actual_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      return [
        scheduledDate.toLocaleDateString('en-US'),
        time,
        log.medicine_name,
        status,
        log.notes || '-'
      ];
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Time', 'Medicine', 'Status', 'Notes']],
      body: logRows,
      theme: 'striped',
      headStyles: { fillColor: [102, 126, 234], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { 
          cellWidth: 20,
          halign: 'center'
        }
      },
      margin: { left: 14, right: 14 },
    });
  }
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `MediAI - Your AI-Powered Health Companion | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Convert to buffer
  const pdfData = doc.output('arraybuffer');
  return Buffer.from(pdfData);
}


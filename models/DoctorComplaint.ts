import { ObjectId } from 'mongodb';
import { getDatabase } from '../lib/mongodb';

export interface IDoctorComplaint {
  _id?: ObjectId;
  complaintId: string; // e.g., "C12345"
  userId: ObjectId;
  userName: string;
  userEmail: string;
  userPhone: string;
  doctorId: ObjectId;
  doctorName: string;
  consultationId?: ObjectId;
  issueType:
    | 'Unprofessional Behavior'
    | 'Incorrect Diagnosis'
    | 'Payment Issue'
    | 'No Response'
    | 'Privacy Violation'
    | 'Prescription Issue'
    | 'Other';
  description: string;
  evidenceUrls: string[];
  status: 'under_review' | 'resolved' | 'closed';
  adminNotes?: string; // Internal notes (not shown to user)
  resolutionMessage?: string; // Message sent to user
  actionTaken?: string; // "Doctor warned" | "Doctor blocked" | "No action" | "Refund issued"
  resolvedBy?: ObjectId; // Admin who resolved
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DoctorComplaint {
  static async create(
    userId: string,
    userName: string,
    userEmail: string,
    userPhone: string,
    doctorId: string,
    doctorName: string,
    issueType: IDoctorComplaint['issueType'],
    description: string,
    evidenceUrls: string[] = [],
    consultationId?: string
  ): Promise<{ success: boolean; message: string; complaintId?: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<IDoctorComplaint>('doctorcomplaints');

      // Generate unique complaint ID
      const count = await collection.countDocuments();
      const complaintId = `C${(count + 1).toString().padStart(5, '0')}`;

      const complaint: IDoctorComplaint = {
        complaintId,
        userId: new ObjectId(userId),
        userName,
        userEmail,
        userPhone,
        doctorId: new ObjectId(doctorId),
        doctorName,
        consultationId: consultationId ? new ObjectId(consultationId) : undefined,
        issueType,
        description,
        evidenceUrls,
        status: 'under_review',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(complaint);

      return {
        success: true,
        message: 'Complaint submitted successfully',
        complaintId: complaint.complaintId,
      };
    } catch (error) {
      console.error('Error creating complaint:', error);
      return {
        success: false,
        message: 'Failed to submit complaint',
      };
    }
  }

  static async findAll(status?: 'under_review' | 'resolved' | 'closed') {
    const db = await getDatabase();
    const collection = db.collection<IDoctorComplaint>('doctorcomplaints');

    const query = status ? { status } : {};
    const complaints = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return complaints;
  }

  static async findById(complaintId: string) {
    const db = await getDatabase();
    const collection = db.collection<IDoctorComplaint>('doctorcomplaints');

    return await collection.findOne({ complaintId });
  }

  static async findByUserId(userId: string) {
    const db = await getDatabase();
    const collection = db.collection<IDoctorComplaint>('doctorcomplaints');

    return await collection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async findByDoctorId(doctorId: string) {
    const db = await getDatabase();
    const collection = db.collection<IDoctorComplaint>('doctorcomplaints');

    return await collection
      .find({ doctorId: new ObjectId(doctorId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async resolve(
    complaintId: string,
    adminId: string,
    resolutionMessage: string,
    actionTaken: string,
    adminNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<IDoctorComplaint>('doctorcomplaints');

      const result = await collection.updateOne(
        { complaintId },
        {
          $set: {
            status: 'resolved',
            resolvedBy: new ObjectId(adminId),
            resolvedAt: new Date(),
            resolutionMessage,
            actionTaken,
            adminNotes,
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return { success: false, message: 'Complaint not found' };
      }

      return { success: true, message: 'Complaint resolved successfully' };
    } catch (error) {
      console.error('Error resolving complaint:', error);
      return { success: false, message: 'Failed to resolve complaint' };
    }
  }

  static async close(complaintId: string): Promise<{ success: boolean; message: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<IDoctorComplaint>('doctorcomplaints');

      const result = await collection.updateOne(
        { complaintId },
        {
          $set: {
            status: 'closed',
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return { success: false, message: 'Complaint not found' };
      }

      return { success: true, message: 'Complaint closed' };
    } catch (error) {
      console.error('Error closing complaint:', error);
      return { success: false, message: 'Failed to close complaint' };
    }
  }
}

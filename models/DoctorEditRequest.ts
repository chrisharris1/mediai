import { ObjectId } from 'mongodb';
import { getDatabase } from '../lib/mongodb';

export interface IDoctorEditRequest {
  _id?: ObjectId;
  doctorId: ObjectId;
  doctorName: string;
  doctorEmail: string;
  requestedChanges: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  status: 'pending' | 'approved' | 'rejected';
  adminReviewedBy?: ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DoctorEditRequest {
  static async create(
    doctorId: string,
    doctorName: string,
    doctorEmail: string,
    requestedChanges: {
      field: string;
      oldValue: any;
      newValue: any;
    }[]
  ): Promise<{ success: boolean; message: string; requestId?: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<IDoctorEditRequest>('doctoreditrequests');

      const editRequest: IDoctorEditRequest = {
        doctorId: new ObjectId(doctorId),
        doctorName,
        doctorEmail,
        requestedChanges,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(editRequest);

      return {
        success: true,
        message: 'Edit request submitted successfully',
        requestId: result.insertedId.toString(),
      };
    } catch (error) {
      console.error('Error creating doctor edit request:', error);
      return {
        success: false,
        message: 'Failed to submit edit request',
      };
    }
  }

  static async findAll(status?: 'pending' | 'approved' | 'rejected') {
    const db = await getDatabase();
    const collection = db.collection<IDoctorEditRequest>('doctoreditrequests');
    
    const query = status ? { status } : {};
    const requests = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    return requests;
  }

  static async findById(requestId: string) {
    const db = await getDatabase();
    const collection = db.collection<IDoctorEditRequest>('doctoreditrequests');
    
    return await collection.findOne({ _id: new ObjectId(requestId) });
  }

  static async findByDoctorId(doctorId: string) {
    const db = await getDatabase();
    const collection = db.collection<IDoctorEditRequest>('doctoreditrequests');
    
    return await collection
      .find({ doctorId: new ObjectId(doctorId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async approve(
    requestId: string,
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<IDoctorEditRequest>('doctoreditrequests');

      const result = await collection.updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: 'approved',
            adminReviewedBy: new ObjectId(adminId),
            reviewedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return { success: false, message: 'Edit request not found' };
      }

      return { success: true, message: 'Edit request approved' };
    } catch (error) {
      console.error('Error approving edit request:', error);
      return { success: false, message: 'Failed to approve edit request' };
    }
  }

  static async reject(
    requestId: string,
    adminId: string,
    rejectionReason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<IDoctorEditRequest>('doctoreditrequests');

      const result = await collection.updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: 'rejected',
            adminReviewedBy: new ObjectId(adminId),
            reviewedAt: new Date(),
            rejectionReason,
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return { success: false, message: 'Edit request not found' };
      }

      return { success: true, message: 'Edit request rejected' };
    } catch (error) {
      console.error('Error rejecting edit request:', error);
      return { success: false, message: 'Failed to reject edit request' };
    }
  }
}

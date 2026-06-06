import { createCall } from '../api/endpoints/calls.api';
import { Lead, User } from '../types';

export const logCallAutomatically = async (
  user: { uid: string; name?: string; email: string; adminId?: string; role: string },
  leadData: { id?: string; name?: string; phone: string }
) => {
  if (!user || !leadData.phone) return;

  try {
    const adminId = user.role === 'admin' ? user.uid : (user.adminId || user.uid);

    await createCall({
      employeeId: user.uid,
      employeeName: user.name || user.email,
      adminId: adminId,
      leadId: leadData.id || null,
      leadName: leadData.name || null,
      contactPhone: leadData.phone,
      type: 'outgoing',
      status: 'completed',
      durationSec: 0,
      notes: 'Automatic log: Clicked "Call Now"',
    });
  } catch (error) {
    console.error("Error logging call automatically:", error);
  }
};

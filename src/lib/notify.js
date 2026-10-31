import { base44 } from '@/api/base44Client';

export async function notify({ recipient_email, patient_email, type, title, message, link, severity = 'info' }) {
  if (!recipient_email) return null;
  return base44.entities.Notification.create({
    recipient_email,
    patient_email: patient_email || recipient_email,
    type,
    title,
    message,
    link,
    severity,
    read: false,
  });
}

/** Notify every active caregiver linked to a patient. */
export async function notifyCaregivers(patientEmail, payload) {
  const links = await base44.entities.CaregiverLink.filter({ patient_email: patientEmail, status: 'active' });
  await Promise.all(
    links.map((l) =>
      notify({
        recipient_email: l.caregiver_email,
        patient_email: patientEmail,
        ...payload,
      })
    )
  );
  return links;
}

export async function notifyCareAndSelf(patientEmail, payload) {
  await notify({ recipient_email: patientEmail, patient_email: patientEmail, ...payload });
  await notifyCaregivers(patientEmail, payload);
}
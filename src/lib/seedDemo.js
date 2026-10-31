import { base44 } from '@/api/base44Client';
import { hashPassword } from './auth';

const iso = (d) => d.toISOString().slice(0, 10);
const dayOffset = (n, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return iso(d);
};
const stamp = (n, hour) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const PATIENT_EMAIL = 'ramesh@medguard.demo';
const CAREGIVER_EMAIL = 'priya@medguard.demo';
const DOCTOR_EMAIL = 'ananya@medguard.demo';
const SECOND_PATIENT = 'lakshmi@medguard.demo';

async function seedOnce() {
  const existing = await base44.entities.Account.list();
  if (existing && existing.length > 0) return false;

  const hash = await hashPassword('demo1234');

  await base44.entities.Account.bulkCreate([
    {
      full_name: 'Ramesh Kumar', email: PATIENT_EMAIL, password_hash: hash, role: 'patient',
      phone: '+91 98450 11223', is_demo: true, consent_accepted: true,
      avatar_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=240&q=80',
    },
    {
      full_name: 'Priya Kumar', email: CAREGIVER_EMAIL, password_hash: hash, role: 'caregiver',
      phone: '+91 98450 44556', is_demo: true, consent_accepted: true,
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&q=80',
    },
    {
      full_name: 'Dr. Ananya Sharma', email: DOCTOR_EMAIL, password_hash: hash, role: 'professional',
      phone: '+91 80 4123 9900', specialty: 'Geriatric Medicine', hospital: 'Sunrise Geriatric Clinic',
      license_no: 'KMC-44521', is_demo: true, consent_accepted: true,
      avatar_url: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=240&q=80',
    },
    {
      full_name: 'Lakshmi Devi', email: SECOND_PATIENT, password_hash: hash, role: 'patient',
      phone: '+91 98450 77889', is_demo: true, consent_accepted: true,
    },
  ]);

  const profiles = await base44.entities.PatientProfile.bulkCreate([
    {
      account_email: PATIENT_EMAIL, full_name: 'Ramesh Kumar', date_of_birth: '1948-04-12', gender: 'Male',
      blood_group: 'B+', height_cm: 168, weight_kg: 71.4,
      allergies: ['Penicillin', 'Aspirin'], conditions: ['Type 2 Diabetes', 'Hypertension', 'Ischaemic Heart Disease', 'Osteoarthritis'],
      emergency_contact_name: 'Priya Kumar (Daughter)', emergency_contact_phone: '+91 98450 44556',
      primary_doctor: 'Dr. Ananya Sharma', address: '42, Jayanagar 4th Block, Bengaluru 560011',
      notes: 'Lives with daughter. Hard of hearing in the left ear. Prefers instructions in Kannada.',
      video_consent: true, share_consent: true, is_demo: true,
      avatar_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=240&q=80',
    },
    {
      account_email: SECOND_PATIENT, full_name: 'Lakshmi Devi', date_of_birth: '1942-11-02', gender: 'Female',
      blood_group: 'O+', height_cm: 152, weight_kg: 58.2,
      allergies: ['Sulfa drugs'], conditions: ['Osteoporosis', 'Type 2 Diabetes'],
      emergency_contact_name: 'Priya Kumar (Daughter)', emergency_contact_phone: '+91 98450 44556',
      primary_doctor: 'Dr. Ananya Sharma', address: '42, Jayanagar 4th Block, Bengaluru 560011',
      video_consent: true, share_consent: true, is_demo: true,
    },
  ]);

  await base44.entities.CaregiverLink.bulkCreate([
    { patient_email: PATIENT_EMAIL, caregiver_email: CAREGIVER_EMAIL, caregiver_name: 'Priya Kumar', relation: 'Daughter', status: 'active', can_view_records: true, can_view_videos: true, can_manage_meds: true, invited_at: stamp(120, 10) },
    { patient_email: SECOND_PATIENT, caregiver_email: CAREGIVER_EMAIL, caregiver_name: 'Priya Kumar', relation: 'Daughter', status: 'active', can_view_records: true, can_view_videos: true, can_manage_meds: true, invited_at: stamp(120, 10) },
    { patient_email: PATIENT_EMAIL, caregiver_email: DOCTOR_EMAIL, caregiver_name: 'Dr. Ananya Sharma', relation: 'Geriatrician', status: 'active', can_view_records: true, can_view_videos: true, can_manage_meds: true, is_professional: true, invited_at: stamp(200, 10) },
    { patient_email: PATIENT_EMAIL, caregiver_email: 'arun.kumar@example.com', caregiver_name: 'Arun Kumar', relation: 'Son', status: 'pending', can_view_records: true, can_view_videos: false, can_manage_meds: false, invited_at: stamp(3, 18) },
  ]);

  const meds = await base44.entities.Medication.bulkCreate([
    { patient_email: PATIENT_EMAIL, name: 'Warfarin 5 mg', generic_name: 'Warfarin', dosage: '5 mg', form: 'Tablet', frequency: 'Once daily at night', times: ['20:00'], start_date: '2026-02-10', refill_date: dayOffset(-6), prescribed_by: 'Dr. Ananya Sharma', purpose: 'Blood thinner — prevents clots after heart procedure', instructions: 'Take at the same time every evening. Avoid missing doses.', active: true },
    { patient_email: PATIENT_EMAIL, name: 'Ecosprin 75', generic_name: 'Aspirin', dosage: '75 mg', form: 'Tablet', frequency: 'Once daily after breakfast', times: ['08:00'], start_date: '2026-02-10', refill_date: dayOffset(-18), prescribed_by: 'Dr. Mehta (Cardiology)', purpose: 'Heart protection', instructions: 'Take after food with a full glass of water.', active: true },
    { patient_email: PATIENT_EMAIL, name: 'Metformin 500', generic_name: 'Metformin', dosage: '500 mg', form: 'Tablet', frequency: 'Twice daily', times: ['08:00', '20:00'], start_date: '2024-06-01', refill_date: dayOffset(-4), prescribed_by: 'Dr. Rao (Diabetes)', purpose: 'Blood sugar control', instructions: 'Take with meals to reduce stomach upset.', active: true },
    { patient_email: PATIENT_EMAIL, name: 'Amlodipine 5', generic_name: 'Amlodipine', dosage: '5 mg', form: 'Tablet', frequency: 'Once daily morning', times: ['08:00'], start_date: '2024-06-01', refill_date: dayOffset(-25), prescribed_by: 'Dr. Rao (Diabetes)', purpose: 'Blood pressure control', active: true },
    { patient_email: PATIENT_EMAIL, name: 'Brufen 400', generic_name: 'Ibuprofen', dosage: '400 mg', form: 'Tablet', frequency: 'Twice daily after food', times: ['14:00'], start_date: dayOffset(20), refill_date: dayOffset(-11), prescribed_by: 'Dr. Rao (Diabetes)', purpose: 'Knee osteoarthritis pain', instructions: 'Short course for knee pain. Take after food.', active: true },
    { patient_email: PATIENT_EMAIL, name: 'Thyronorm 50 mcg', generic_name: 'Levothyroxine', dosage: '50 mcg', form: 'Tablet', frequency: 'Once daily, empty stomach', times: ['07:00'], start_date: '2021-01-15', refill_date: dayOffset(-9), prescribed_by: 'Dr. Iyer (Endocrinology)', purpose: 'Thyroid hormone replacement', instructions: 'Take 30 minutes before breakfast.', active: true },
    { patient_email: PATIENT_EMAIL, name: 'Shelcal 500', generic_name: 'Calcium carbonate', dosage: '500 mg', form: 'Tablet', frequency: 'Once daily after lunch', times: ['13:00'], start_date: '2025-03-02', refill_date: dayOffset(-30), prescribed_by: 'Dr. Iyer (Endocrinology)', purpose: 'Bone strength', active: true },
    { patient_email: PATIENT_EMAIL, name: 'Atorva 10', generic_name: 'Atorvastatin', dosage: '10 mg', form: 'Tablet', frequency: 'Once daily at night', times: ['21:00'], start_date: '2026-02-12', refill_date: dayOffset(-14), prescribed_by: 'Dr. Mehta (Cardiology)', purpose: 'Cholesterol control', active: true },
    { patient_email: SECOND_PATIENT, name: 'Glycomet 500', generic_name: 'Metformin', dosage: '500 mg', form: 'Tablet', frequency: 'Once daily', times: ['09:00'], start_date: '2024-09-01', refill_date: dayOffset(-12), prescribed_by: 'Dr. Ananya Sharma', purpose: 'Blood sugar control', active: true },
    { patient_email: SECOND_PATIENT, name: 'Calcirol 60K', generic_name: 'Vitamin D3', dosage: '60,000 IU', form: 'Sachet', frequency: 'Once weekly', times: ['09:00'], start_date: '2025-03-02', refill_date: dayOffset(-40), prescribed_by: 'Dr. Ananya Sharma', purpose: 'Vitamin D for bones', active: true },
  ]);

  const rameshMeds = meds.filter((m) => m.patient_email === PATIENT_EMAIL);
  const lakshmiMeds = meds.filter((m) => m.patient_email === SECOND_PATIENT);

  const pattern = ['reviewed', 'reviewed', 'reviewed', 'awaiting_review', 'not_verified', 'reviewed', 'missed', 'reviewed', 'reviewed', 'not_verified'];
  const rows = [];
  let p = 0;
  for (let d = 20; d >= 0; d -= 1) {
    const date = dayOffset(d);
    rameshMeds.forEach((m) => {
      (m.times || ['08:00']).forEach((t) => {
        let status = 'scheduled';
        if (d === 0) {
          status = 'scheduled';
        } else if (d === 1 && t === '20:00') {
          status = 'awaiting_review';
        } else {
          status = pattern[p % pattern.length];
          p += 1;
        }
        rows.push({
          patient_email: PATIENT_EMAIL,
          medication_id: m.id,
          medication_name: m.name,
          scheduled_date: date,
          scheduled_time: t,
          status,
          taken_at: ['reviewed', 'video_submitted', 'awaiting_review'].includes(status) ? `${date}T${t}:05` : undefined,
          reported_reason: status === 'missed' ? 'Felt unwell after breakfast' : undefined,
          is_demo: true,
        });
      });
    });
  }
  lakshmiMeds.forEach((m) => {
    for (let d = 3; d >= 0; d -= 1) {
      rows.push({
        patient_email: SECOND_PATIENT,
        medication_id: m.id,
        medication_name: m.name,
        scheduled_date: dayOffset(d),
        scheduled_time: '09:00',
        status: d === 0 ? 'scheduled' : d === 1 ? 'not_verified' : 'reviewed',
        is_demo: true,
      });
    }
  });

  for (let i = 0; i < rows.length; i += 100) {
    await base44.entities.MedicationLog.bulkCreate(rows.slice(i, i + 100));
  }

  await base44.entities.VerificationVideo.bulkCreate([
    {
      patient_email: PATIENT_EMAIL, patient_name: 'Ramesh Kumar', medication_id: rameshMeds[1].id,
      medication_name: rameshMeds[1].name, scheduled_date: dayOffset(1), scheduled_time: '08:00',
      video_uri: '', duration_sec: 0, submitted_at: stamp(1, 8),
      review_status: 'pending', is_demo: true,
    },
    {
      patient_email: PATIENT_EMAIL, patient_name: 'Ramesh Kumar', medication_id: rameshMeds[0].id,
      medication_name: rameshMeds[0].name, scheduled_date: dayOffset(2), scheduled_time: '20:00',
      video_uri: '', duration_sec: 0, submitted_at: stamp(2, 20),
      review_status: 'reviewed', reviewed_by: 'Priya Kumar', reviewed_at: stamp(2, 21),
      reviewer_note: 'Took the tablet with water. Looked well.', is_demo: true,
    },
  ]);

  await base44.entities.MedicalRecord.bulkCreate([
    { patient_email: PATIENT_EMAIL, title: 'Cardiology follow-up — ECG and advice', type: 'consultation', doctor_name: 'Dr. Mehta', hospital: 'Apollo Hospital, Bengaluru', specialty: 'Cardiology', record_date: dayOffset(42), notes: 'Stable rhythm. Continue Warfarin 5 mg. INR 2.4. Review in 8 weeks.', uploaded_by: CAREGIVER_EMAIL, is_demo: true },
    { patient_email: PATIENT_EMAIL, title: 'HbA1c and lipid profile', type: 'lab_report', doctor_name: 'Metropolis Lab', hospital: 'Metropolis Diagnostics', specialty: 'Pathology', record_date: dayOffset(28), notes: 'HbA1c 7.4% (slightly high). LDL 96 mg/dL. Creatinine 1.1 mg/dL.', uploaded_by: CAREGIVER_EMAIL, is_demo: true },
    { patient_email: PATIENT_EMAIL, title: 'Prescription — Warfarin dose adjustment', type: 'prescription', doctor_name: 'Dr. Ananya Sharma', hospital: 'Sunrise Geriatric Clinic', specialty: 'Geriatric Medicine', record_date: dayOffset(18), notes: 'Continue 5 mg daily. Stop painkillers if possible. INR check next week.', uploaded_by: PATIENT_EMAIL, is_demo: true },
    { patient_email: PATIENT_EMAIL, title: 'Right knee X-ray report', type: 'imaging', doctor_name: 'Dr. Rao', hospital: 'City Orthopaedic Centre', specialty: 'Orthopaedics', record_date: dayOffset(55), notes: 'Moderate medial compartment osteoarthritis. Physiotherapy advised.', uploaded_by: CAREGIVER_EMAIL, is_demo: true },
    { patient_email: SECOND_PATIENT, title: 'Bone density (DEXA) scan', type: 'lab_report', doctor_name: 'Dr. Ananya Sharma', hospital: 'Sunrise Geriatric Clinic', specialty: 'Geriatric Medicine', record_date: dayOffset(35), notes: 'T-score -2.6. Continue calcium and vitamin D.', uploaded_by: CAREGIVER_EMAIL, is_demo: true },
  ]);

  const metrics = [];
  [2400, 1900, 2200, 1600, 2100, 1750, 2000].forEach((v, i) => {
    metrics.push({ patient_email: PATIENT_EMAIL, type: 'steps', value: v, unit: 'steps', recorded_date: dayOffset(6 - i) });
  });
  [71.7, 71.5, 71.4, 71.6, 71.2, 71.0, 70.9].forEach((v, i) => {
    metrics.push({ patient_email: PATIENT_EMAIL, type: 'weight', value: v, unit: 'kg', recorded_date: dayOffset(6 - i) });
  });
  [[138, 86], [142, 88], [134, 82], [136, 84], [130, 80], [128, 78]].forEach((v, i) => {
    metrics.push({ patient_email: PATIENT_EMAIL, type: 'bp', value: v[0], value2: v[1], unit: 'mmHg', recorded_date: dayOffset(5 - i) });
  });
  [142, 138, 151, 129, 146].forEach((v, i) => {
    metrics.push({ patient_email: PATIENT_EMAIL, type: 'glucose', value: v, unit: 'mg/dL', recorded_date: dayOffset(4 - i), note: 'Fasting' });
  });
  [7.2, 6.5, 8.0, 7.4, 6.8].forEach((v, i) => {
    metrics.push({ patient_email: PATIENT_EMAIL, type: 'sleep', value: v, unit: 'hours', recorded_date: dayOffset(4 - i) });
  });
  [250, 250, 300, 250, 200].forEach((v, i) => {
    metrics.push({ patient_email: PATIENT_EMAIL, type: 'water', value: v, unit: 'ml', recorded_date: `${dayOffset(0)}T${String(7 + i).padStart(2, '0')}:30` });
  });
  metrics.push({ patient_email: PATIENT_EMAIL, type: 'activity', value: 25, unit: 'minutes', recorded_date: dayOffset(0), note: 'Morning walk in the park' });

  await base44.entities.HealthMetric.bulkCreate(metrics);

  await base44.entities.Notification.bulkCreate([
    { recipient_email: PATIENT_EMAIL, patient_email: PATIENT_EMAIL, type: 'interaction', title: 'High-risk medicine combination found', message: 'Warfarin and Brufen 400 together raise bleeding risk. Please review with your doctor.', link: '/conflicts', severity: 'critical', read: false },
    { recipient_email: PATIENT_EMAIL, patient_email: PATIENT_EMAIL, type: 'medication', title: 'Evening medicines are due', message: 'Warfarin 5 mg and Metformin 500 are scheduled at 20:00 tonight.', link: '/schedule', severity: 'info', read: false },
    { recipient_email: PATIENT_EMAIL, patient_email: PATIENT_EMAIL, type: 'refill', title: 'Metformin 500 refill due in 4 days', message: 'Your supply runs out soon. Request a refill from your pharmacy.', link: '/ordering', severity: 'warning', read: false },
    { recipient_email: PATIENT_EMAIL, patient_email: PATIENT_EMAIL, type: 'verification', title: 'Caregiver reviewed your medicine video', message: 'Priya reviewed your Warfarin video and marked it as taken.', link: '/verification', severity: 'success', read: true },
    { recipient_email: CAREGIVER_EMAIL, patient_email: PATIENT_EMAIL, type: 'verification', title: 'New medicine video from Ramesh', message: 'A video was submitted for Ecosprin 75 at 08:00. It is awaiting your review.', link: '/video-review', severity: 'warning', read: false },
    { recipient_email: CAREGIVER_EMAIL, patient_email: PATIENT_EMAIL, type: 'interaction', title: 'Interaction alert for Ramesh', message: 'Ibuprofen has been added while he is on Warfarin and Aspirin.', link: '/conflicts', severity: 'critical', read: false },
    { recipient_email: DOCTOR_EMAIL, patient_email: PATIENT_EMAIL, type: 'record', title: 'New lab report shared with you', message: 'HbA1c and lipid profile results were added by Priya Kumar.', link: '/records', severity: 'info', read: false },
  ]);

  await base44.entities.MedicineOrder.create({
    patient_email: PATIENT_EMAIL, medication_id: rameshMeds[2].id, medication_name: 'Metformin 500',
    pharmacy: 'MedPlus Pharmacy, Jayanagar', quantity: '60 tablets', status: 'shipped',
    requested_at: stamp(2, 11), tracking_no: 'MP-8841290', requested_by: CAREGIVER_EMAIL,
    notes: 'Deliver to home address before 6 pm.',
  });

  return profiles.length > 0;
}

let seedPromise = null;

/** Runs once per page load so React re-mounts can never duplicate the demo data. */
export function ensureDemoData() {
  if (!seedPromise) seedPromise = seedOnce();
  return seedPromise;
}
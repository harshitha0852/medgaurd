import {
  LayoutDashboard, FileText, ScanLine, ShieldAlert, CalendarClock, Camera, HeartPulse,
  Pill, FileBarChart, Bell, UserRound, Settings, Stethoscope, Video, Sparkles, Users,
} from 'lucide-react';
import { ROLE_HOME } from '@/lib/auth';

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/patient-dashboard', label: 'Patient dashboard', icon: LayoutDashboard, roles: ['patient'] },
      { to: '/caregiver-dashboard', label: 'Caregiver dashboard', icon: Users, roles: ['caregiver'] },
      { to: '/professional-dashboard', label: 'Clinician dashboard', icon: Stethoscope, roles: ['professional'] },
    ],
  },
  {
    label: 'Medical records',
    items: [
      { to: '/records', label: 'Medical records', icon: FileText, roles: ['patient', 'caregiver', 'professional'] },
      { to: '/scanner', label: 'Prescription scanner', icon: ScanLine, roles: ['patient', 'caregiver', 'professional'] },
      { to: '/reports', label: 'Medical reports', icon: FileBarChart, roles: ['patient', 'caregiver', 'professional'] },
    ],
  },
  {
    label: 'Medication safety',
    items: [
      { to: '/schedule', label: 'Medication schedule', icon: CalendarClock, roles: ['patient', 'caregiver', 'professional'] },
      { to: '/conflicts', label: 'Interaction checker', icon: ShieldAlert, roles: ['patient', 'caregiver', 'professional'] },
      { to: '/verification', label: 'Smart verification', icon: Camera, roles: ['patient', 'caregiver', 'professional'] },
      { to: '/video-review', label: 'Video review', icon: Video, roles: ['caregiver', 'professional'] },
      { to: '/ordering', label: 'Medicine refills', icon: Pill, roles: ['patient', 'caregiver', 'professional'] },
    ],
  },
  {
    label: 'Wellbeing',
    items: [
      { to: '/health', label: 'Health & lifestyle', icon: HeartPulse, roles: ['patient', 'caregiver', 'professional'] },
      { to: '/assistant', label: 'Voice assistant', icon: Sparkles, roles: ['patient', 'caregiver', 'professional'] },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['patient', 'caregiver', 'professional'] },
      { to: '/profile', label: 'Patient profile', icon: UserRound, roles: ['patient', 'caregiver', 'professional'] },
      { to: '/settings', label: 'Settings & privacy', icon: Settings, roles: ['patient', 'caregiver', 'professional'] },
    ],
  },
];

export function navForRole(role) {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
}

export function homeForRole(role) {
  return ROLE_HOME[role] || '/patient-dashboard';
}
export interface Doctor {
    id: string;
    name: string;
    departmentId: string;
    specialty: string;
    bio: string;
    rating: number;
    reviewsCount: number;
    image: string;
    education: string;
    experienceYears: number;
    availability: {
        days: string[]; // e.g., ["Monday", "Wednesday", "Friday"]
        hours: string[]; // e.g., ["09:00 AM", "10:30 AM", ...]
    };
}

export interface Department {
    id: string;
    name: string;
    iconName: string; // The Lucide icon string
    description: string;
    longDescription: string;
    services: string[];
    stats: {
        label: string;
        value: string;
    }[];
    heroImage: string;
}

// Duplicate Appointment removed
export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: 'patient' | 'doctor' | 'admin';
    doctorId?: string | null; // linked doctor ID from data.ts
    createdAt: string;
}

export interface PrescriptionMedicine {
    name: string;
    dosage: string;      // e.g. "1 Tablet", "500mg"
    frequency: string;   // e.g. "Twice a day", "Morning (After Food)"
    timing?: string;     // Specific time e.g. "08:00 AM", "02:00 PM"
    duration: string;    // e.g. "5 Days"
    notes?: string;      // e.g. "Take with warm water"
}

export interface Prescription {
    diagnosis: string;
    doctorNotes?: string;
    medicines: PrescriptionMedicine[];
    updatedAt: string;
}

export interface Appointment {
    id: string;
    doctorId: string;
    doctorName: string;
    departmentId: string;
    departmentName: string;
    date: string; // YYYY-MM-DD
    timeSlot: string; // e.g. "10:30 AM"
    patientName: string;
    patientPhone: string;
    patientEmail: string;
    patientAge?: number;
    patientGender?: string;
    medicalHistory?: string;
    notes?: string;
    status: 'Pending' | 'Confirmed' | 'Cancelled';
    createdAt: string;
    userId?: string | null;
    reports?: { name: string; url: string }[];
    prescription?: Prescription;
    consultationType?: 'In-Person' | 'Online';
    videoCallStatus?: 'inactive' | 'ready' | 'active' | 'ended';
    videoRoomId?: string;
}

export type Page = 'home' | 'about' | 'departments' | 'doctors' | 'booking' | 'my-appointments' | 'auth' | 'admin' | 'doctor-portal' | 'emergency';

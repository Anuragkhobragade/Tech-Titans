import React from 'react';
import { Page, Appointment, UserProfile } from '../types';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';
import {
    ShieldCheck,
    Calendar,
    Clock,
    Check,
    X,
    Search,
    Filter,
    RefreshCw,
    AlertCircle,
    Inbox,
    FileText,
    LogOut,
    CheckCircle2,
    XCircle,
    Plus,
    Trash,
    Video,
    PhoneOff
} from 'lucide-react';


interface DoctorPortalProps {
    setCurrentPage: (page: Page) => void;
    userProfile: UserProfile;
    onSignOut: () => void;
    onJoinVideoCall: (appointment: Appointment) => void;
}

export default function DoctorPortal({ setCurrentPage, userProfile, onSignOut, onJoinVideoCall }: DoctorPortalProps) {
    const [appointments, setAppointments] = React.useState<Appointment[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [dateFilter, setDateFilter] = React.useState('');

    // File preview state
    const [previewFile, setPreviewFile] = React.useState<{ name: string; url: string } | null>(null);

    // Prescription editing state
    const [selectedAptForPrescribe, setSelectedAptForPrescribe] = React.useState<Appointment | null>(null);

    // Sync status messages
    const [syncMessage, setSyncMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Live Sync Appointments for this doctor
    React.useEffect(() => {
        if (!userProfile.doctorId) {
            setError("No associated doctor profile linked. Please ask the administrator to link your doctor ID.");
            setLoading(false);
            return;
        }

        try {
            const q = query(
                collection(db, 'appointments'),
                where('doctorId', '==', userProfile.doctorId)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const list: Appointment[] = [];
                snapshot.forEach((docSnap) => {
                    list.push(docSnap.data() as Appointment);
                });
                // Sort by date/time or created time descending
                list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setAppointments(list);
                setLoading(false);
                setError(null);
            }, (err) => {
                console.error("Doctor Live-Sync Error:", err);
                setError(err instanceof Error ? err.message : String(err));
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firestore setup error:", e);
            setError("Failed to initialize database sync.");
            setLoading(false);
        }
    }, [userProfile.doctorId]);

    // Handle approving an appointment
    const handleApprove = async (appointmentId: string) => {
        try {
            const appointmentRef = doc(db, 'appointments', appointmentId);
            await updateDoc(appointmentRef, { status: 'Confirmed' });
            showSyncMessage('success', `Appointment ${appointmentId} has been successfully approved.`);
        } catch (err: any) {
            console.error("Failed to approve appointment:", err);
            showSyncMessage('error', err instanceof Error ? err.message : String(err));
        }
    };

    // Handle rejecting/cancelling an appointment
    const handleReject = async (appointmentId: string) => {
        try {
            const appointmentRef = doc(db, 'appointments', appointmentId);
            await updateDoc(appointmentRef, { status: 'Cancelled' });
            showSyncMessage('success', `Appointment ${appointmentId} has been rejected.`);
        } catch (err: any) {
            console.error("Failed to reject appointment:", err);
            showSyncMessage('error', err instanceof Error ? err.message : String(err));
        }
    };

    const handleSavePrescription = async (diagnosis: string, doctorNotes: string, medicines: any[]) => {
        if (!selectedAptForPrescribe) return;
        try {
            const appointmentRef = doc(db, 'appointments', selectedAptForPrescribe.id);
            const prescriptionPayload = {
                diagnosis,
                doctorNotes,
                medicines,
                updatedAt: new Date().toISOString()
            };
            await updateDoc(appointmentRef, {
                prescription: prescriptionPayload
            });
            showSyncMessage('success', `Prescription saved for ${selectedAptForPrescribe.patientName}.`);
            setSelectedAptForPrescribe(null);
        } catch (err: any) {
            console.error("Failed to save prescription:", err);
            showSyncMessage('error', err instanceof Error ? err.message : String(err));
        }
    };

    const showSyncMessage = (type: 'success' | 'error', text: string) => {
        setSyncMessage({ type, text });
        setTimeout(() => {
            setSyncMessage(null);
        }, 5000);
    };

    const handleCancelCall = async (appointmentId: string) => {
        if (!window.confirm("Are you sure you want to decline/cancel this video call?")) return;
        try {
            await deleteDoc(doc(db, 'videoRooms', appointmentId));
            const apptRef = doc(db, 'appointments', appointmentId);
            await updateDoc(apptRef, {
                videoCallStatus: 'ended'
            });
            showSyncMessage('success', 'Video call declined successfully.');
        } catch (err: any) {
            console.error("Error declining video call:", err);
            showSyncMessage('error', 'Error: ' + err.message);
        }
    };

    // Filter appointments locally
    const filteredAppointments = appointments.filter((apt) => {
        const matchesSearch =
            apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.patientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
        const matchesDate = !dateFilter || apt.date === dateFilter;

        return matchesSearch && matchesStatus && matchesDate;
    });

    // Roster summary stats
    const totalCount = appointments.length;
    const pendingCount = appointments.filter(a => a.status === 'Pending').length;
    const confirmedCount = appointments.filter(a => a.status === 'Confirmed').length;
    const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length;

    // Today's summary stats
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const todayAppointments = appointments.filter(a => a.date === todayStr && a.status !== 'Cancelled');
    const todayCount = todayAppointments.length;
    const attendedTodayCount = todayAppointments.filter(a => !!a.prescription).length;

    return (
        <div className="bg-slate-50/50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans" id="doctor-portal-root">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Welcome banner */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center shadow-xs gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                            <span className="bg-teal-50 border border-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full flex items-center">
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                Verified Doctor Account
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Welcome, {userProfile.name}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">
                            Manage schedules, view patient histories, and approve clinic appointment slots below.
                        </p>
                    </div>

                    <button
                        onClick={onSignOut}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>

                {/* Sync status messages toast */}
                {syncMessage && (
                    <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-sm animate-pulse ${
                        syncMessage.type === 'success' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                            : 'bg-rose-50 border-rose-100 text-rose-900'
                    }`}>
                        {syncMessage.type === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        )}
                        <span className="font-bold">{syncMessage.text}</span>
                    </div>
                )}

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
                    {/* Stat CARD - Total */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Booked</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-slate-900">{totalCount}</span>
                            <span className="text-[11px] text-slate-400 font-bold">schedules</span>
                        </div>
                    </div>
                    {/* Stat CARD - Pending */}
                    <div className="bg-amber-50/40 border border-amber-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-amber-600/80 uppercase tracking-widest">Awaiting Approval</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-amber-700">{pendingCount}</span>
                            <span className="text-[11px] text-amber-500 font-bold">pending</span>
                        </div>
                    </div>
                    {/* Stat CARD - Confirmed */}
                    <div className="bg-emerald-50/30 border border-emerald-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Confirmed & Active</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-emerald-700">{confirmedCount}</span>
                            <span className="text-[11px] text-emerald-500 font-bold">approved</span>
                        </div>
                    </div>
                    {/* Stat CARD - Cancelled */}
                    <div className="bg-rose-50/30 border border-rose-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-widest">Cancelled / Rejected</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-rose-700">{cancelledCount}</span>
                            <span className="text-[11px] text-rose-500 font-bold">slots</span>
                        </div>
                    </div>
                    {/* Stat CARD - Today's Appointments */}
                    <div className="bg-teal-50/30 border border-teal-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-teal-650 uppercase tracking-widest">Today's Appointments</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-teal-700">{todayCount}</span>
                            <span className="text-[11px] text-teal-500 font-bold">scheduled</span>
                        </div>
                    </div>
                    {/* Stat CARD - Attended Patients Today */}
                    <div className="bg-sky-50/30 border border-sky-100/60 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                        <p className="text-[10px] font-extrabold text-sky-650 uppercase tracking-widest">Attended Today</p>
                        <div className="flex items-baseline space-x-2 mt-2">
                            <span className="text-3xl font-extrabold text-sky-700">
                                {attendedTodayCount}
                                <span className="text-lg text-slate-400 font-normal">/{todayCount}</span>
                            </span>
                            <span className="text-[11px] text-sky-500 font-bold ml-1">completed</span>
                        </div>
                    </div>
                </div>

                {/* Filter Controls Panel */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Filter Rosters</h3>
                        </div>

                        {/* Search and Filters Input Wrapper */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:max-w-4xl">
                            {/* Search Name */}
                            <div className="relative">
                                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search patients name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                                />
                            </div>

                            {/* Status filter selection */}
                            <div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer"
                                >
                                    <option value="all">Any Status</option>
                                    <option value="Pending">Pending Approval</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>

                            {/* Date search selection */}
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer"
                                />
                                {dateFilter && (
                                    <button
                                        onClick={() => setDateFilter('')}
                                        className="absolute right-3 top-3.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold transition-all"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard List Display */}
                {loading ? (
                    <div className="bg-white border border-slate-100 rounded-3xl py-24 text-center space-y-4 shadow-xs">
                        <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto" />
                        <p className="text-slate-500 font-mono text-xs font-bold">Querying clinical database documents...</p>
                    </div>
                ) : error ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-955 p-6 rounded-2xl space-y-3 shadow-xs">
                        <div className="flex items-center space-x-2 font-bold text-rose-900">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <span>Database Sync issue</span>
                        </div>
                        <p className="text-xs text-rose-800 leading-relaxed max-w-2xl">
                            Unable to sync document snapshots. Error: <strong>{error}</strong>.
                        </p>
                    </div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl py-20 text-center space-y-4 shadow-xs">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-2">
                            <Inbox className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-base">No Appointments Found</h3>
                        <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                            No appointment slots match the filter options. Keep patients updated by refreshing the filters.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                        <th className="py-4 px-6">ID & Patient Details</th>
                                        <th className="py-4 px-6">Schedule Slot</th>
                                        <th className="py-4 px-6">Reason / Symptoms</th>
                                        <th className="py-4 px-6">Status Badge</th>
                                        <th className="py-4 px-6 text-right">Approve / Reject Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150 text-xs sm:text-sm">
                                    {filteredAppointments.map((apt) => {
                                        const isPending = apt.status === 'Pending';
                                        const isConfirmed = apt.status === 'Confirmed';
                                        const isCancelled = apt.status === 'Cancelled';

                                        return (
                                            <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                                                
                                                {/* ID & Patient Info */}
                                                <td className="py-4.5 px-6 space-y-1">
                                                    <div className="font-mono text-[10px] font-extrabold text-slate-500 flex items-center space-x-1">
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-160">
                                                            {apt.id}
                                                        </span>
                                                    </div>
                                                    <div className="font-extrabold text-slate-900 flex items-center gap-2">
                                                        <span>{apt.patientName}</span>
                                                        {(apt.patientAge || apt.patientGender) && (
                                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                                                                {[apt.patientAge ? `${apt.patientAge}y` : '', apt.patientGender || ''].filter(Boolean).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium">
                                                        {apt.patientEmail} • <span className="font-mono">{apt.patientPhone}</span>
                                                    </div>
                                                </td>

                                                {/* Schedule Date & Time */}
                                                <td className="py-4.5 px-6 space-y-1">
                                                    <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                                                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                                        <span>{apt.date}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                                                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span>{apt.timeSlot}</span>
                                                    </div>
                                                    {apt.consultationType && (
                                                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                                                            apt.consultationType === 'Online'
                                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                        }`}>
                                                            {apt.consultationType === 'Online' ? (
                                                                <>
                                                                    <Video className="h-3 w-3 mr-1 shrink-0 text-emerald-600 animate-pulse" />
                                                                    <span>Video Call</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>In-Person</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Symptom / Note Description */}
                                                <td className="py-4.5 px-6 max-w-xs">
                                                    {apt.notes ? (
                                                        <div className="flex items-start space-x-1.5 text-slate-655 font-medium leading-relaxed bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[11px] sm:text-xs">
                                                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                            <span className="line-clamp-2" title={apt.notes}>{apt.notes}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No notes logged</span>
                                                    )}

                                                    {apt.medicalHistory && (
                                                        <div className="mt-1.5 flex items-start space-x-1.5 text-rose-800 font-semibold leading-relaxed bg-rose-50/50 border border-rose-100/60 p-2 rounded-xl text-[10px] sm:text-[11px]">
                                                            <span className="font-bold uppercase tracking-wider font-mono text-[9px] text-rose-500 shrink-0 mt-0.5">Hx:</span>
                                                            <span className="line-clamp-2" title={apt.medicalHistory}>{apt.medicalHistory}</span>
                                                        </div>
                                                    )}

                                                    {apt.reports && apt.reports.length > 0 && (
                                                        <div className="mt-2.5 space-y-1">
                                                            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                                                                Attached Reports:
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {apt.reports.map((report, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => setPreviewFile(report)}
                                                                        className="inline-flex items-center space-x-1 bg-teal-50 border border-teal-100 hover:bg-teal-100 hover:border-teal-200 text-[10px] font-bold text-teal-800 px-2 py-1 rounded-lg transition-colors cursor-pointer truncate max-w-[150px] text-left"
                                                                        title={report.name}
                                                                    >
                                                                        <FileText className="h-3 w-3 shrink-0" />
                                                                        <span className="truncate">{report.name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status Display Badge */}
                                                <td className="py-4.5 px-6">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                                                        isConfirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                                        isCancelled ? 'bg-rose-50 border-rose-200 text-rose-800' :
                                                        'bg-amber-50 border-amber-200 text-amber-800'
                                                    }`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                                            isConfirmed ? 'bg-emerald-500' :
                                                            isCancelled ? 'bg-rose-500' :
                                                            'bg-amber-500'
                                                        }`} />
                                                        {apt.status}
                                                    </span>
                                                </td>

                                                {/* Roster Controls */}
                                                <td className="py-4.5 px-6 text-right font-medium">
                                                     {isPending ? (
                                                         <div className="flex justify-end space-x-2">
                                                             <button
                                                                 onClick={() => handleReject(apt.id)}
                                                                 className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                                 title="Reject Schedule Slot"
                                                             >
                                                                 <X className="h-4 w-4" />
                                                                 <span>Reject</span>
                                                             </button>
                                                             <button
                                                                 onClick={() => handleApprove(apt.id)}
                                                                 className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs hover:shadow-sm"
                                                                 title="Approve Schedule Slot"
                                                             >
                                                                 <Check className="h-4 w-4" />
                                                                 <span>Approve</span>
                                                             </button>
                                                         </div>
                                                     ) : isConfirmed ? (
                                                         <div className="flex justify-end space-x-2">
                                                             {apt.consultationType === 'Online' && (
                                                                 apt.videoCallStatus === 'ended' ? (
                                                                     <button
                                                                         disabled
                                                                         className="bg-slate-100 border border-slate-200 text-slate-400 p-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-not-allowed"
                                                                         title="Online Consultation Completed"
                                                                     >
                                                                         <Video className="h-4 w-4 text-slate-400" />
                                                                         <span>Completed</span>
                                                                     </button>
                                                                 ) : (
                                                                    <div className="flex items-center space-x-1.5">
                                                                        <button
                                                                            onClick={() => onJoinVideoCall(apt)}
                                                                            className={`text-white p-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm ${
                                                                                apt.videoCallStatus === 'ready'
                                                                                    ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse'
                                                                                    : 'bg-teal-650 hover:bg-teal-700'
                                                                            }`}
                                                                            title="Start/Join Consultation Video Call"
                                                                        >
                                                                            <Video className="h-4 w-4" />
                                                                            <span>{apt.videoCallStatus === 'ready' ? 'Join Call' : 'Start Call'}</span>
                                                                        </button>
                                                                        {apt.videoCallStatus === 'ready' && (
                                                                            <button
                                                                                onClick={() => handleCancelCall(apt.id)}
                                                                                className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs hover:shadow-sm"
                                                                                title="Decline/Cancel Incoming Call"
                                                                            >
                                                                                <PhoneOff className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                 )
                                                             )}
                                                             <button
                                                                 onClick={() => setSelectedAptForPrescribe(apt)}
                                                                 className="bg-teal-600 hover:bg-teal-700 text-white p-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm"
                                                                 title="Treat Patient and Prescribe"
                                                            >
                                                                 <FileText className="h-4 w-4" />
                                                                 <span>{apt.prescription ? 'Edit Prescription' : 'Treat Patient'}</span>
                                                             </button>
                                                         </div>
                                                     ) : (
                                                         <span className="text-slate-400 font-semibold text-xs italic">
                                                             Cancelled
                                                         </span>
                                                     )}
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* Premium File Preview Overlay Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs" id="file-preview-overlay">
                    <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="bg-slate-50 border-b border-slate-150 py-4 px-6 flex justify-between items-center shrink-0">
                            <div className="truncate pr-4 text-left">
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                                    Previewing: {previewFile.name}
                                </h3>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                                <a
                                    href={previewFile.url}
                                    download={previewFile.name}
                                    className="inline-flex items-center space-x-1.5 bg-teal-650 hover:bg-teal-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                    Download File
                                </a>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-105 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                                >
                                    <X className="h-4.5 w-4.5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-grow overflow-auto p-6 flex items-center justify-center bg-slate-50/50">
                            {previewFile.url.startsWith('data:image/') ? (
                                <img src={previewFile.url} className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xs" alt={previewFile.name} />
                            ) : previewFile.url.startsWith('data:application/pdf') ? (
                                <object data={previewFile.url} type="application/pdf" className="w-full h-[60vh] rounded-xl border border-slate-200">
                                    <div className="text-center p-6 space-y-3">
                                        <p className="text-sm font-semibold text-slate-600">PDF preview is not supported in this browser viewport.</p>
                                        <a href={previewFile.url} download={previewFile.name} className="inline-block bg-teal-650 hover:bg-teal-750 text-white font-bold py-2 px-4 rounded-xl text-xs">
                                            Download to View PDF
                                        </a>
                                    </div>
                                </object>
                            ) : (
                                <div className="text-center p-8 space-y-3">
                                    <FileText className="h-12 w-12 text-slate-400 mx-auto" />
                                    <p className="text-sm font-semibold text-slate-700">Preview not available directly in browser.</p>
                                    <a href={previewFile.url} download={previewFile.name} className="inline-block bg-teal-650 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-xl text-xs">
                                        Download to Open
                                    </a>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* Prescription Form Modal */}
            {selectedAptForPrescribe && (
                <PrescriptionModal
                    appointment={selectedAptForPrescribe}
                    onClose={() => setSelectedAptForPrescribe(null)}
                    onSave={handleSavePrescription}
                />
            )}
        </div>
    );
}

interface PrescriptionModalProps {
    appointment: Appointment;
    onClose: () => void;
    onSave: (diagnosis: string, doctorNotes: string, medicines: any[]) => Promise<void>;
}

const DOSAGE_PRESETS = [
    '1 Tablet',
    '1/2 Tablet',
    '2 Tablets',
    '1 Capsule',
    '1 Spoon (5ml)',
    '2 Spoons (10ml)',
    '1 Injection',
    '1 Puff (Inhaler)'
];

const DURATION_PRESETS = [
    '1 Day',
    '2 Days',
    '3 Days',
    '5 Days',
    '7 Days (1 Week)',
    '10 Days',
    '14 Days (2 Weeks)',
    '30 Days (1 Month)'
];

const TIMING_PRESETS = [
    '08:00 AM',
    '09:00 AM',
    '01:00 PM',
    '02:00 PM',
    '04:00 PM',
    '08:00 PM',
    '09:00 PM',
    '10:00 PM'
];

function PrescriptionModal({ appointment, onClose, onSave }: PrescriptionModalProps) {
    const [diagnosis, setDiagnosis] = React.useState(appointment.prescription?.diagnosis || '');
    const [doctorNotes, setDoctorNotes] = React.useState(appointment.prescription?.doctorNotes || '');
    const [medicines, setMedicines] = React.useState<any[]>(() => {
        if (appointment.prescription?.medicines) {
            return appointment.prescription.medicines.map((m: any) => {
                const timingsList = m.timing ? m.timing.split(', ') : ['08:00 AM'];
                return {
                    ...m,
                    timingsList
                };
            });
        }
        return [
            { name: '', dosage: '1 Tablet', frequency: 'Twice a day (Morning/Night)', timingsList: ['08:00 AM'], duration: '5 Days', notes: '' }
        ];
    });
    const [saving, setSaving] = React.useState(false);

    const handleAddMedicine = () => {
        setMedicines([
            ...medicines,
            { name: '', dosage: '1 Tablet', frequency: 'Twice a day (Morning/Night)', timingsList: ['08:00 AM'], duration: '5 Days', notes: '' }
        ]);
    };

    const handleRemoveMedicine = (index: number) => {
        const list = [...medicines];
        list.splice(index, 1);
        setMedicines(list);
    };

    const handleMedicineChange = (index: number, key: string, val: any) => {
        const list = [...medicines];
        list[index] = { ...list[index], [key]: val };
        setMedicines(list);
    };

    const handleAddTiming = (medIndex: number) => {
        const list = [...medicines];
        const timings = [...(list[medIndex].timingsList || [])];
        timings.push('08:00 PM');
        list[medIndex].timingsList = timings;
        setMedicines(list);
    };

    const handleRemoveTiming = (medIndex: number, timeIndex: number) => {
        const list = [...medicines];
        const timings = [...(list[medIndex].timingsList || [])];
        timings.splice(timeIndex, 1);
        list[medIndex].timingsList = timings;
        setMedicines(list);
    };

    const handleTimingChange = (medIndex: number, timeIndex: number, val: string) => {
        const list = [...medicines];
        const timings = [...(list[medIndex].timingsList || [])];
        timings[timeIndex] = val;
        list[medIndex].timingsList = timings;
        setMedicines(list);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!diagnosis.trim()) {
            alert('Please enter a diagnosis.');
            return;
        }

        const filtered = medicines.filter(m => m.name.trim() !== '').map(m => {
            const timingStr = m.timingsList ? m.timingsList.filter((t: string) => t.trim() !== '').join(', ') : '';
            return {
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                timing: timingStr,
                duration: m.duration,
                notes: m.notes || ''
            };
        });

        if (filtered.length === 0) {
            alert('Please add at least one medicine with a name.');
            return;
        }

        setSaving(true);
        try {
            await onSave(diagnosis, doctorNotes, filtered);
        } catch (err) {
            console.error("Prescription save error:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs" id="prescription-modal-overlay">
            <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col font-sans">
                
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-150 py-4 px-6 flex justify-between items-center shrink-0">
                    <div className="text-left">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                            Prescribe Treatment: {appointment.patientName}
                        </h3>
                        <p className="text-slate-400 text-xs mt-0.5">
                            {[appointment.patientAge ? `${appointment.patientAge} Yrs` : '', appointment.patientGender || '', appointment.medicalHistory ? `Hx: ${appointment.medicalHistory}` : ''].filter(Boolean).join(' • ')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-105 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                    >
                        <X className="h-4.5 w-4.5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-grow overflow-auto p-6 space-y-6 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Diagnosis */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Diagnosis / Findings *</label>
                            <textarea
                                value={diagnosis}
                                onChange={(e) => setDiagnosis(e.target.value)}
                                placeholder="Enter patient diagnosis (e.g. Acute Migraine, Vitamin Deficiency)"
                                className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl p-3 text-xs sm:text-sm bg-slate-50/50 min-h-[90px]"
                                required
                            />
                        </div>

                        {/* General Doctor Notes */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Doctor Notes / Advice</label>
                            <textarea
                                value={doctorNotes}
                                onChange={(e) => setDoctorNotes(e.target.value)}
                                placeholder="Diet advice, precautions, follow-up directions..."
                                className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl p-3 text-xs sm:text-sm bg-slate-50/50 min-h-[90px]"
                            />
                        </div>
                    </div>

                    {/* Medicines List */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Prescribed Medicines</label>
                            <button
                                type="button"
                                onClick={handleAddMedicine}
                                className="bg-teal-50 border border-teal-100 hover:bg-teal-100 text-teal-800 font-bold py-1 px-3 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Medicine
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                            {medicines.map((med, idx) => {
                                const isCustomDosage = med.dosage && !DOSAGE_PRESETS.includes(med.dosage) && med.dosage !== 'Custom';
                                const isCustomDuration = med.duration && !DURATION_PRESETS.includes(med.duration) && med.duration !== 'Custom';

                                return (
                                    <div key={idx} className="bg-slate-50/50 border border-slate-150 rounded-2xl p-4 space-y-3 relative">
                                        {medicines.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMedicine(idx)}
                                                className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer"
                                                title="Remove medicine"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-6">
                                            {/* Medicine Name */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicine Name *</label>
                                                <input
                                                    type="text"
                                                    value={med.name}
                                                    onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                                                    placeholder="e.g. Paracetamol"
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white"
                                                    required
                                                />
                                            </div>

                                            {/* Dosage Dropdown */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dosage *</label>
                                                <select
                                                    value={isCustomDosage ? 'Custom' : med.dosage}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        handleMedicineChange(idx, 'dosage', val === 'Custom' ? '' : val);
                                                    }}
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white cursor-pointer"
                                                >
                                                    {DOSAGE_PRESETS.map((preset) => (
                                                        <option key={preset} value={preset}>{preset}</option>
                                                    ))}
                                                    <option value="Custom">Custom / Other</option>
                                                </select>
                                                {(isCustomDosage || med.dosage === 'Custom' || med.dosage === '') && (
                                                    <input
                                                        type="text"
                                                        value={med.dosage === 'Custom' ? '' : med.dosage}
                                                        onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                                                        placeholder="Type Custom Dosage"
                                                        className="w-full mt-1.5 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white"
                                                        required
                                                    />
                                                )}
                                            </div>

                                            {/* Duration Dropdown */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration *</label>
                                                <select
                                                    value={isCustomDuration ? 'Custom' : med.duration}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        handleMedicineChange(idx, 'duration', val === 'Custom' ? '' : val);
                                                    }}
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white cursor-pointer"
                                                >
                                                    {DURATION_PRESETS.map((preset) => (
                                                        <option key={preset} value={preset}>{preset}</option>
                                                    ))}
                                                    <option value="Custom">Custom / Other</option>
                                                </select>
                                                {(isCustomDuration || med.duration === 'Custom' || med.duration === '') && (
                                                    <input
                                                        type="text"
                                                        value={med.duration === 'Custom' ? '' : med.duration}
                                                        onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                                                        placeholder="Type Custom Duration"
                                                        className="w-full mt-1.5 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white"
                                                        required
                                                    />
                                                )}
                                            </div>

                                            {/* Frequency Dropdown */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frequency *</label>
                                                <select
                                                    value={med.frequency}
                                                    onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white cursor-pointer"
                                                >
                                                    <option value="Twice a day (Morning/Night)">Twice a day (Morning/Night)</option>
                                                    <option value="Morning (After Food)">Morning (After Food)</option>
                                                    <option value="Night (Before Sleep)">Night (Before Sleep)</option>
                                                    <option value="Three times a day">Three times a day</option>
                                                    <option value="Once Daily (Empty Stomach)">Once Daily (Empty Stomach)</option>
                                                    <option value="Custom">Custom / Other</option>
                                                </select>
                                            </div>

                                            {/* Timing List Builder with "Add Another Time" */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specific Timings</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddTiming(idx)}
                                                        className="text-[10px] text-teal-800 font-extrabold hover:text-teal-905 flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Add Time
                                                    </button>
                                                </div>

                                                <div className="space-y-1.5">
                                                    {(med.timingsList || []).map((tVal: string, tIdx: number) => {
                                                        const isCustomTime = tVal && !TIMING_PRESETS.includes(tVal) && tVal !== 'Custom';

                                                        return (
                                                            <div key={tIdx} className="flex items-center space-x-1.5">
                                                                <select
                                                                    value={isCustomTime ? 'Custom' : tVal}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        handleTimingChange(idx, tIdx, val === 'Custom' ? '' : val);
                                                                    }}
                                                                    className="flex-grow border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-1.5 text-xs bg-white cursor-pointer"
                                                                >
                                                                    {TIMING_PRESETS.map((preset) => (
                                                                        <option key={preset} value={preset}>{preset}</option>
                                                                    ))}
                                                                    <option value="Custom">Custom Time</option>
                                                                </select>

                                                                {(isCustomTime || tVal === 'Custom' || tVal === '') && (
                                                                    <input
                                                                        type="text"
                                                                        value={tVal === 'Custom' ? '' : tVal}
                                                                        onChange={(e) => handleTimingChange(idx, tIdx, e.target.value)}
                                                                        placeholder="e.g. 08:30 AM"
                                                                        className="border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-1.5 text-xs bg-white w-24"
                                                                        required
                                                                    />
                                                                )}

                                                                {med.timingsList.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveTiming(idx, tIdx)}
                                                                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer"
                                                                        title="Remove time slot"
                                                                    >
                                                                        <Trash className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Directions / Notes */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Directions / Notes</label>
                                                <input
                                                    type="text"
                                                    value={med.notes || ''}
                                                    onChange={(e) => handleMedicineChange(idx, 'notes', e.target.value)}
                                                    placeholder="e.g. Take with milk"
                                                    className="w-full border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 text-xs bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 border-t border-slate-150 pt-4 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Prescription'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}

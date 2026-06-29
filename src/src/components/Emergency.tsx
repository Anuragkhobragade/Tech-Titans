import React from 'react';
import { Page } from '../types';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
    Phone, 
    Truck, 
    ShieldAlert, 
    Star, 
    User, 
    Activity, 
    MapPin, 
    Clock, 
    AlertTriangle,
    ArrowLeft,
    CheckCircle2
} from 'lucide-react';

interface EmergencyProps {
    setCurrentPage: (page: Page) => void;
}

const AMBULANCE_DRIVERS = [
    {
        id: 'drv-rajesh',
        name: 'Rajesh Kumar',
        role: 'Senior First-Responder Operator',
        phone: '+91 98765 43210',
        vehicleType: 'Advanced Cardiac Life Support (ACLS)',
        vehicleNo: 'MH-12-QE-4567',
        status: 'Available',
        initials: 'RK',
        bgColor: 'from-emerald-500 to-teal-600',
        rating: 4.9,
        tripsCompleted: 340,
        experience: '8 Years'
    },
    {
        id: 'drv-amit',
        name: 'Amit Patel',
        role: 'Paramedic & Emergency Driver',
        phone: '+91 98765 43211',
        vehicleType: 'Basic Life Support (BLS) Ambulance',
        vehicleNo: 'MH-12-QE-7890',
        status: 'Available',
        initials: 'AP',
        bgColor: 'from-teal-500 to-cyan-600',
        rating: 4.8,
        tripsCompleted: 210,
        experience: '5 Years'
    },
    {
        id: 'drv-sunita',
        name: 'Dr. Sunita Sharma',
        role: 'Critical Care Ambulance Medic',
        phone: '+91 98765 43212',
        vehicleType: 'Neonatal & Pediatric Intensive Care Transport',
        vehicleNo: 'MH-12-QE-1234',
        status: 'On Emergency Call',
        initials: 'SS',
        bgColor: 'from-rose-500 to-red-600',
        rating: 4.95,
        tripsCompleted: 185,
        experience: '6 Years'
    }
];

export default function Emergency({ setCurrentPage }: EmergencyProps) {
    const [ambulances, setAmbulances] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const colRef = collection(db, 'ambulances');
        const unsubscribe = onSnapshot(colRef, async (snapshot) => {
            if (snapshot.empty) {
                console.log("Seeding ambulances database...");
                try {
                    for (const driver of AMBULANCE_DRIVERS) {
                        await setDoc(doc(db, 'ambulances', driver.id), driver);
                    }
                } catch (err) {
                    console.error("Failed seeding database:", err);
                }
            } else {
                const list: any[] = [];
                snapshot.forEach((docSnap) => {
                    list.push(docSnap.data());
                });
                // Sort consistently
                list.sort((a, b) => a.id.localeCompare(b.id));
                setAmbulances(list);
                setLoading(false);
            }
        }, (error) => {
            console.error("Firestore onSnapshot error:", error);
            setAmbulances(AMBULANCE_DRIVERS);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="bg-slate-50/50 min-h-screen flex items-center justify-center" id="emergency-dispatch-loading">
                <div className="flex flex-col items-center space-y-4">
                    <Clock className="h-10 w-10 text-rose-600 animate-spin" />
                    <p className="text-slate-500 font-bold text-sm tracking-wide">Connecting to active fleet dispatch...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50/50 min-h-screen py-12 lg:py-16 font-sans relative overflow-hidden" id="emergency-dispatch-root">
            {/* Ambient Background Decorative Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-rose-200/20 blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-200/10 blur-3xl" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">

                {/* Back to Home Navigation */}
                <button
                    onClick={() => {
                        setCurrentPage('home');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-wider mb-8 cursor-pointer group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Return to Homepage</span>
                </button>

                {/* HEADER SECTION */}
                <div className="text-left space-y-2 mb-10">
                    <div className="inline-flex items-center space-x-1.5 bg-rose-50 border border-rose-100 text-rose-800 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        <Activity className="h-3.5 w-3.5 animate-pulse text-rose-600" />
                        <span>Emergency Trauma Dispatch</span>
                    </div>
                    <h1 className="text-3xl font-extrabold font-sans text-slate-900 tracking-tight">
                        Ambulance Response Services
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-2xl">
                        Sanjeevani Clinic hosts a rapid response transport grid connected to active trauma units. Connect directly to our driver crew logs below to request dispatch.
                    </p>
                </div>

                {/* MAIN CRITICAL HOTLINE CARD */}
                <div className="bg-gradient-to-r from-rose-600 to-red-500 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-rose-900/15 mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-rose-500/30">
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold w-fit tracking-wide">
                            <Clock className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                            <span>Active 24 Hours / 7 Days a Week</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                            Main Clinical Emergency Hotline
                        </h2>
                        <p className="text-rose-100 text-xs sm:text-sm max-w-lg leading-relaxed">
                            For critical trauma, cardiac distress, or acute injuries, bypass the queue and dial our priority emergency dashboard operator immediately.
                        </p>
                    </div>

                    <a
                        href="tel:+919999999999"
                        className="inline-flex items-center space-x-2 bg-white hover:bg-rose-50 text-rose-600 font-extrabold py-3.5 px-6 rounded-2xl shadow-sm hover:shadow transition-all group shrink-0 cursor-pointer text-sm font-mono w-full md:w-auto justify-center"
                    >
                        <Phone className="h-4 w-4 animate-bounce text-rose-600" />
                        <span className="text-rose-600">Call +91 9999-999-999</span>
                    </a>
                </div>

                {/* LISTING WORKBENCH TITLE */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-extrabold text-slate-900 text-lg font-sans flex items-center">
                        <Truck className="h-5 w-5 text-rose-600 mr-2" />
                        <span>Available Ambulances & Drivers</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase">
                        Live Fleet Logs
                    </span>
                </div>

                {/* AMBULANCE GRID CARDS */}
                <div className="space-y-6" id="ambulance-cards-list">
                    {ambulances.map((driver) => {
                        const isAvailable = driver.status === 'Available';
                        return (
                            <div 
                                key={driver.id}
                                className="bg-white border border-slate-150/70 hover:border-slate-300 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden"
                            >
                                {/* Left strip color tag matching availability */}
                                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                                {/* Left Side: Driver Profile details */}
                                <div className="flex items-center space-x-4 pl-1 sm:pl-2">
                                    {/* Initials Avatar */}
                                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${driver.bgColor} text-white flex items-center justify-center text-lg font-extrabold tracking-wider shrink-0 shadow-sm`}>
                                        {driver.initials}
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                            <h4 className="font-extrabold text-slate-900 text-base font-sans leading-none">
                                                {driver.name}
                                            </h4>
                                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono tracking-wider ${
                                                isAvailable 
                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                    : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full mr-1 shrink-0 ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span>{driver.status}</span>
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-500 font-mono tracking-wide uppercase leading-none font-semibold">
                                            {driver.role}
                                        </p>

                                        <p className="text-xs text-slate-650 flex items-center font-medium pt-1">
                                            <Phone className="h-3 w-3 text-rose-600 mr-1.5 shrink-0" />
                                            <span className="font-mono text-slate-700 select-all font-bold">{driver.phone}</span>
                                        </p>

                                        {/* Performance metrics row */}
                                        <div className="flex items-center space-x-3 text-xs text-slate-500 pt-1">
                                            <span className="flex items-center font-bold text-amber-500">
                                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-1 shrink-0" />
                                                {driver.rating}
                                            </span>
                                            <span className="text-slate-300">|</span>
                                            <span>Trips: <strong className="text-slate-800 font-mono">{driver.tripsCompleted}+</strong></span>
                                            <span className="text-slate-300">|</span>
                                            <span>Exp: <strong className="text-slate-805 font-mono">{driver.experience}</strong></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Vehicle info column */}
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-center space-y-1.5 w-full md:w-auto md:min-w-[240px] text-xs font-sans text-slate-600">
                                    <div className="flex justify-between items-center gap-4">
                                        <span className="text-slate-400 uppercase font-mono font-bold text-[9px] tracking-wider block">Ambulance Unit</span>
                                        <strong className="text-slate-900 text-right truncate max-w-[150px]">{driver.vehicleType}</strong>
                                    </div>
                                    <div className="flex justify-between items-center gap-4 pt-1.5 border-t border-slate-200/50">
                                        <span className="text-slate-400 uppercase font-mono font-bold text-[9px] tracking-wider block">Registration Code</span>
                                        <strong className="text-slate-900 font-mono">{driver.vehicleNo}</strong>
                                    </div>
                                </div>

                                {/* Right: Primary Dial Button */}
                                <div className="w-full md:w-auto shrink-0 flex items-center">
                                    <a
                                        href={isAvailable ? `tel:${driver.phone.replace(/\s+/g, '')}` : '#'}
                                        onClick={isAvailable ? undefined : (e) => e.preventDefault()}
                                        className={`w-full md:w-auto inline-flex items-center justify-center space-x-1.5 border font-semibold py-3 px-5 rounded-2xl text-xs transition-colors cursor-pointer ${
                                            isAvailable 
                                                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300' 
                                                : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-50'
                                        }`}
                                        title={isAvailable ? "Contact Driver" : "Driver Currently Busy"}
                                    >
                                        <Phone className="h-3.5 w-3.5 shrink-0" />
                                        <span>Dial Dispatch Operator</span>
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* FOOTER INSTRUCTIONS DISCLAIMER CARD */}
                <div className="mt-10 p-5 bg-amber-50/40 border border-amber-100/60 rounded-3xl flex items-start space-x-3 text-[11px] sm:text-xs text-amber-900">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-bold">⚠️ Critical Response Notice:</p>
                        <p className="text-amber-850 leading-relaxed">
                            Ambulance availability logs are compiled dynamically based on live dispatch signals. If you call an operator and get a busy tone, dial the main emergency clinical priority line at <strong className="font-mono text-rose-700">+91 9999-999-999</strong> for administrative dispatch.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}

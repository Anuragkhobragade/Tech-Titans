import { motion } from 'motion/react';
import {
    Heart,
    ShieldCheck,
    Users,
    Flame,
    CalendarClock,
    Award,
    Globe,
    TrendingUp
} from 'lucide-react';

const VALUES = [
    {
        icon: Heart,
        title: 'Patient Empathy',
        desc: 'We put the physical comfort and mental peace of our patients at the center of every clinical decision and daily therapeutic care.'
    },
    {
        icon: ShieldCheck,
        title: 'Absolute Integrity',
        desc: 'Maintaining transparent billing, ethical medical research guidelines, and honest, detailed patient communication.'
    },
    {
        icon: Flame,
        title: 'Innovative Excellence',
        desc: 'Investing continuously in the highest level of research, surgical systems, and doctor specializations for better recoveries.'
    },
    {
        icon: Users,
        title: 'Interdisciplinary Collaboration',
        desc: 'Cardiologists, pediatricians, neurologists, and physiotherapists working as a single team to diagnose complex cases.'
    }
];

const TIMELINE = [
    {
        year: '2008',
        title: 'The Humble Inception',
        desc: 'Sanjeevani began as a small, specialized local cardiology consulting office with only 2 clinics and 1 diagnostic room, founded by Dr. Elena Rostova.',
        icon: CalendarClock
    },
    {
        year: '2014',
        title: 'New Pediatric Wing',
        desc: 'Recognizing regional needs, we created a pediatric care facility with state-of-the-art children allergy clinics and primary wellness programs.',
        icon: Award
    },
    {
        year: '25th Anniversary / 2020',
        title: 'Multi-Department Medical Center',
        desc: 'Moved to our current custom-built, multi-level wellness clinic complex. Added neurology, orthopedics, and integrated full digital lab services.',
        icon: Globe
    },
    {
        year: 'Present / 2026',
        title: 'Next-Gen Interactive Care',
        desc: 'With over 12,000 successful surgical therapies and patient satisfaction rated at 99.4%, we continue leading regional health care and diagnostics.',
        icon: TrendingUp
    }
];

export default function About() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
    };

    return (
        <div className="bg-slate-50/50 min-h-screen py-12 lg:py-16" id="about-page">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* 1. TITLE HEADER */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-xs font-semibold text-teal-650 uppercase tracking-widest font-mono">
                        Our Medical Heritage
                    </span>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-sans text-slate-900 mt-2">
                        Providing Empathetic & Innovative Medical Care
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-3 leading-relaxed">
                        Founded with the belief that healthcare should balance sophisticated scientific research with human empathy, Sanjeevani is committed to excellence in service and clinical research.
                    </p>
                </div>

                {/* 2. MAIN STORY SECTION */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20" id="about-story">
                    <div className="relative">
                        <div className="absolute -top-4 -left-4 w-12 h-12 bg-teal-100 rounded-xl blur-lg opacity-80" />
                        <img
                            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800"
                            alt="Medical Team Collaboration"
                            className="w-full h-[400px] object-cover rounded-2xl shadow-lg border border-white"
                            referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-6 -right-6 bg-teal-650 text-white p-6 rounded-xl hidden sm:flex flex-col text-left max-w-[240px]">
                            <span className="text-3xl font-bold font-sans">15+</span>
                            <span className="text-xs text-teal-100 font-mono mt-1">YEARS OF MEDICAL RECOGNITION AND CLINICAL EXCELLENCE</span>
                        </div>
                    </div>

                    <div className="text-left space-y-5">
                        <h2 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">
                            An Elevated Approach to Modern Family Healthcare
                        </h2>
                        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                            At Sanjeevani Medical Center, we recognize that going to the clinic should be accompanied by absolute therapeutic reassurance. We combine multidisciplinary expert doctors with continuous system checkups to prevent diagnoses mistakes and accelerate your road to health.
                        </p>
                        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                            We continue building diagnostic labs, physical rehabilitation clinics, and pediatric safe zones to make your appointments quick, detailed, and reassuring. Our custom digital scheduling assistant helps keep wait time under 10 minutes from check-in.
                        </p>

                        {/* Sub stats columns */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            <div className="flex items-start space-x-2.5">
                                <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 shrink-0 animate-ping" />
                                <div>
                                    <h4 className="font-bold text-slate-950 text-sm">Empathetic Care</h4>
                                    <p className="text-slate-500 text-xs">Patients treated as physical & emotional family.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-2.5">
                                <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-slate-950 text-sm font-sans">Top Research Labs</h4>
                                    <p className="text-slate-500 text-xs">Integrated diagnostics mapping systems.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. CORE VALUES SECTION */}
                <section className="mb-20" id="about-values">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-xs font-semibold text-teal-650 uppercase tracking-widest font-mono">
                            Our Compass
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans mt-1">
                            The Principles Directing Sanjeevani Healthcare
                        </h2>
                    </div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {VALUES.map((val, idx) => (
                            <motion.div
                                key={idx}
                                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex space-x-4 hover:shadow transition-shadow"
                                variants={itemVariants}
                            >
                                <div className="bg-teal-50 text-teal-700 p-3 rounded-lg shrink-0 h-fit">
                                    <val.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base font-sans">{val.title}</h3>
                                    <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">{val.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>

                {/* 4. CLINIC HISTORY TIMELINE */}
                <section className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm" id="about-history-timeline">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <span className="text-xs font-semibold text-teal-650 uppercase tracking-widest font-mono">
                            Our Journey
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans mt-1">
                            Historical Milestones & Strategic Growth
                        </h2>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Review our growth from a cardiology clinic to a comprehensive multi-department facility.
                        </p>
                    </div>

                    <div className="relative border-l border-slate-205 ml-4 sm:ml-8 md:mx-auto max-w-3xl space-y-12">
                        {TIMELINE.map((item, idx) => (
                            <div key={idx} className="relative pl-8 md:pl-12 text-left">
                                {/* Timeline badge or dot */}
                                <div className="absolute -left-[17px] top-1.5 bg-teal-600 text-white rounded-full p-1.5 border border-white shrink-0 shadow-md">
                                    <item.icon className="h-3.5 w-3.5" />
                                </div>

                                {/* Year tag */}
                                <span className="inline-block bg-teal-50 text-teal-700 font-semibold font-mono text-xs px-2.5 py-0.5 rounded-full">
                                    {item.year}
                                </span>

                                {/* Text description */}
                                <h3 className="font-bold text-slate-900 mt-2 font-sans text-md sm:text-lg">
                                    {item.title}
                                </h3>
                                <p className="text-slate-650 text-xs sm:text-sm mt-1 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
}

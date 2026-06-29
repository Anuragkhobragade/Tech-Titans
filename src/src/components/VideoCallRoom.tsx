import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Appointment, UserProfile } from '../types';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Copy, Check, Users } from 'lucide-react';

interface VideoCallRoomProps {
    appointment: Appointment;
    userProfile: UserProfile;
    onLeave: () => void;
}

const servers = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
        {
            urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443',
                'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10,
};

export default function VideoCallRoom({ appointment, userProfile, onLeave }: VideoCallRoomProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

    const [callStatus, setCallStatus] = useState<string>('Initializing media devices...');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isRemoteVideoActive, setIsRemoteVideoActive] = useState(true);

    const isDoctor = userProfile.role === 'doctor';

    // Copy Appointment ID
    const handleCopyId = () => {
        navigator.clipboard.writeText(appointment.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        let isMounted = true;
        let localMediaStream: MediaStream | null = null;
        let peerConnection: RTCPeerConnection | null = null;
        let unsubscribeRoom: (() => void) | null = null;
        const roomRef = doc(db, 'videoRooms', appointment.id);

        async function setupCall() {
            try {
                // 1. Get Camera and Microphone access (with fallbacks for blocked/missing hardware)
                try {
                    localMediaStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
                    });
                } catch (err) {
                    console.warn("Failed to get both video and audio, trying audio-only fallback:", err);
                    try {
                        localMediaStream = await navigator.mediaDevices.getUserMedia({
                            video: false,
                            audio: true
                        });
                        setIsVideoOff(true);
                    } catch (audioErr) {
                        console.warn("Failed to get audio-only stream, trying video-only:", audioErr);
                        try {
                            localMediaStream = await navigator.mediaDevices.getUserMedia({
                                video: true,
                                audio: false
                            });
                            setIsMuted(true);
                        } catch (videoErr) {
                            console.error("All media device combinations failed:", videoErr);
                            throw new Error("Could not access camera or microphone. Please enable permissions in site settings.");
                        }
                    }
                }

                if (!isMounted) {
                    localMediaStream.getTracks().forEach(t => t.stop());
                    return;
                }

                setLocalStream(localMediaStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localMediaStream;
                }

                // 2. Setup RTCPeerConnection
                peerConnection = new RTCPeerConnection(servers);
                pc.current = peerConnection;

                // Add local tracks to peer connection
                localMediaStream.getTracks().forEach(track => {
                    peerConnection!.addTrack(track, localMediaStream!);
                });

                // Receive remote tracks
                peerConnection.ontrack = (event) => {
                    const incomingStream = event.streams[0];
                    setRemoteStream(incomingStream);
                    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== incomingStream) {
                        remoteVideoRef.current.srcObject = incomingStream;
                        remoteVideoRef.current.play().catch(e => console.warn('Failed to auto-play remote video stream:', e));
                    }

                    incomingStream.getTracks().forEach(track => {
                        // Monitor remote video track state
                        if (track.kind === 'video') {
                            setIsRemoteVideoActive(track.enabled && !track.muted);
                            track.onmute = () => setIsRemoteVideoActive(false);
                            track.onunmute = () => setIsRemoteVideoActive(true);
                        }
                    });
                    setCallStatus('Connected');
                };

                // Track peer connection states
                peerConnection.onconnectionstatechange = () => {
                    if (!isMounted) return;
                    const state = peerConnection!.connectionState;
                    if (state === 'connected') {
                        setCallStatus('Connected');
                    } else if (state === 'disconnected') {
                        setCallStatus('Other participant disconnected. Reconnecting...');
                    } else if (state === 'failed') {
                        setCallStatus('Connection failed. Please exit and retry.');
                    }
                };

                // 3. Signaling: Determine Role
                const roomSnap = await getDoc(roomRef);
                const roomExists = roomSnap.exists();

                if (!roomExists) {
                    // Start as Caller
                    setCallStatus('Waiting for other participant to join...');
                    
                    await setDoc(roomRef, {
                        createdAt: new Date().toISOString(),
                        status: 'active',
                        callerName: userProfile.name || 'User',
                        callerRole: userProfile.role || 'patient',
                        callerCandidates: [],
                        calleeCandidates: []
                    });

                    // Add caller candidates (debounced to avoid Firestore write rate limiting)
                    let callerCandBatch: any[] = [];
                    let callerCandTimeout: any = null;
                    peerConnection.onicecandidate = (event) => {
                        if (event.candidate && isMounted) {
                            callerCandBatch.push(event.candidate.toJSON());
                            if (callerCandTimeout) clearTimeout(callerCandTimeout);
                            callerCandTimeout = setTimeout(() => {
                                if (isMounted && callerCandBatch.length > 0) {
                                    updateDoc(roomRef, {
                                        callerCandidates: arrayUnion(...callerCandBatch)
                                    }).catch(e => console.warn('Error batching caller candidates:', e));
                                    callerCandBatch = [];
                                }
                            }, 300);
                        }
                    };

                    // Create and set local offer
                    const offerDescription = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offerDescription);

                    await updateDoc(roomRef, {
                        offer: {
                            sdp: offerDescription.sdp,
                            type: offerDescription.type
                        }
                    });

                    // Update main appointment document to 'ready'
                    try {
                        const apptRef = doc(db, 'appointments', appointment.id);
                        await updateDoc(apptRef, {
                            videoCallStatus: 'ready',
                            videoRoomId: appointment.id
                        });
                    } catch (e) {
                        console.warn('Could not update appointment status:', e);
                    }

                    const addedCandidates = new Set<string>();

                    // Listen for callee's answer and ICE candidates
                    unsubscribeRoom = onSnapshot(roomRef, async (snapshot) => {
                        if (!isMounted) return;
                        if (!snapshot.exists()) {
                            // Room document deleted, meaning call ended by peer
                            setCallStatus('Call ended by other participant.');
                            setTimeout(() => {
                                if (isMounted) onLeave();
                            }, 2500);
                            return;
                        }

                        const data = snapshot.data();

                        // Set answer SDP
                        if (data.answer && !peerConnection!.currentRemoteDescription) {
                            try {
                                const answerDescription = new RTCSessionDescription(data.answer);
                                await peerConnection!.setRemoteDescription(answerDescription);
                            } catch (err) {
                                console.error('Error setting answer description:', err);
                            }
                        }

                        // Add remote ICE candidates (Only if remote description is set!)
                        if (peerConnection!.currentRemoteDescription && data.calleeCandidates && data.calleeCandidates.length > 0) {
                            data.calleeCandidates.forEach((cand: any) => {
                                const key = JSON.stringify(cand);
                                if (!addedCandidates.has(key)) {
                                    addedCandidates.add(key);
                                    peerConnection!.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                                }
                            });
                        }
                    });

                } else {
                    // Start as Callee
                    setCallStatus('Connecting to peer...');

                    const addedCandidates = new Set<string>();

                    // Add callee candidates (debounced to avoid Firestore write rate limiting)
                    let calleeCandBatch: any[] = [];
                    let calleeCandTimeout: any = null;
                    peerConnection.onicecandidate = (event) => {
                        if (event.candidate && isMounted) {
                            calleeCandBatch.push(event.candidate.toJSON());
                            if (calleeCandTimeout) clearTimeout(calleeCandTimeout);
                            calleeCandTimeout = setTimeout(() => {
                                if (isMounted && calleeCandBatch.length > 0) {
                                    updateDoc(roomRef, {
                                        calleeCandidates: arrayUnion(...calleeCandBatch)
                                    }).catch(e => console.warn('Error batching callee candidates:', e));
                                    calleeCandBatch = [];
                                }
                            }, 300);
                        }
                    };

                    let remoteDescriptionSet = false;

                    // Listen to room document for offer, answer, and ICE candidates
                    unsubscribeRoom = onSnapshot(roomRef, async (snapshot) => {
                        if (!isMounted) return;
                        if (!snapshot.exists()) {
                            setCallStatus('Call ended by other participant.');
                            setTimeout(() => {
                                if (isMounted) onLeave();
                            }, 2500);
                            return;
                        }

                        const data = snapshot.data();

                        // 1. Wait for Offer if not set yet, then create Answer
                        if (data.offer && !remoteDescriptionSet) {
                            remoteDescriptionSet = true;
                            try {
                                const offerDescription = new RTCSessionDescription(data.offer);
                                await peerConnection!.setRemoteDescription(offerDescription);

                                // Create answer SDP
                                const answerDescription = await peerConnection!.createAnswer();
                                await peerConnection!.setLocalDescription(answerDescription);

                                await updateDoc(roomRef, {
                                    answer: {
                                        sdp: answerDescription.sdp,
                                        type: answerDescription.type
                                    },
                                    calleeName: userProfile.name || 'User',
                                    calleeRole: userProfile.role || 'patient'
                                });

                                // Update main appointment document to 'active'
                                const apptRef = doc(db, 'appointments', appointment.id);
                                await updateDoc(apptRef, {
                                    videoCallStatus: 'active'
                                });
                            } catch (err: any) {
                                console.error('Error setting callee session:', err);
                            }
                        }

                        // 2. Add caller candidates (Only if remote description is set!)
                        if (peerConnection!.currentRemoteDescription && data.callerCandidates && data.callerCandidates.length > 0) {
                            data.callerCandidates.forEach((cand: any) => {
                                const key = JSON.stringify(cand);
                                if (!addedCandidates.has(key)) {
                                    addedCandidates.add(key);
                                    peerConnection!.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                                }
                            });
                        }
                    });
                }

            } catch (e: any) {
                console.error('Error starting video call:', e);
                setCallStatus(`Error: ${e.message || 'Could not access media devices. Ensure camera/mic permissions are granted.'}`);
            }
        }

        setupCall();

        // Listen to appointment status changes to detect remote hangup
        const unsubscribeAppt = onSnapshot(doc(db, 'appointments', appointment.id), (snapshot) => {
            if (!isMounted) return;
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.videoCallStatus === 'ended') {
                    setCallStatus('Call ended.');
                    setTimeout(() => {
                        if (isMounted) onLeave();
                    }, 1500);
                }
            }
        });

        return () => {
            isMounted = false;
            if (unsubscribeRoom) unsubscribeRoom();
            if (unsubscribeAppt) unsubscribeAppt();
            
            // Clean up streams
            if (localMediaStream) {
                localMediaStream.getTracks().forEach(track => track.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }

            // Close connection
            if (peerConnection) {
                peerConnection.close();
            }

            // Reset appointment status on database
            const apptRef = doc(db, 'appointments', appointment.id);
            updateDoc(apptRef, {
                videoCallStatus: 'ended'
            }).catch(() => {});
        };
    }, [appointment.id]);

    // Handle end call button click
    const handleEndCall = async () => {
        try {
            // Delete room document to signal peer
            const roomRef = doc(db, 'videoRooms', appointment.id);
            await deleteDoc(roomRef);
        } catch (e) {
            console.warn('Failed to delete video call signaling document:', e);
        }

        try {
            // Explicitly set appointment status to ended
            const apptRef = doc(db, 'appointments', appointment.id);
            await updateDoc(apptRef, {
                videoCallStatus: 'ended'
            });
        } catch (e) {
            console.warn('Failed to update appointment call status:', e);
        }

        onLeave();
    };

    // Toggle Mic
    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    // Toggle Camera
    const toggleCamera = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    // Toggle Screen Share
    const toggleScreenShare = async () => {
        if (!localStream || !pc.current) return;

        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;
                const screenTrack = screenStream.getVideoTracks()[0];

                // Replace the video sender track in WebRTC
                const senders = pc.current.getSenders();
                const videoSender = senders.find(sender => sender.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(screenTrack);
                }

                // Update local preview
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                screenTrack.onended = () => {
                    stopScreenShare();
                };

                setIsScreenSharing(true);
            } catch (err) {
                console.error('Error starting screen share:', err);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (!pc.current || !localStream) return;
        
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }

        const originalVideoTrack = localStream.getVideoTracks()[0];
        const senders = pc.current.getSenders();
        const videoSender = senders.find(sender => sender.track?.kind === 'video');
        if (videoSender && originalVideoTrack) {
            videoSender.replaceTrack(originalVideoTrack);
        }

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }

        setIsScreenSharing(false);
    };

    const isConnected = callStatus === 'Connected';

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
            {/* Dark gradient blur header */}
            <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-slate-950/80 to-transparent z-25 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                            Consultation Room - {isDoctor ? 'Doctor View' : 'Patient View'}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-mono">
                            Room ID: {appointment.id}
                        </p>
                    </div>
                    <button 
                        onClick={handleCopyId}
                        className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy Room ID"
                    >
                        {copied ? (
                            <span className="text-[10px] text-teal-400 font-bold font-mono">Copied!</span>
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </button>
                </div>

                <div className="flex items-center space-x-3 bg-white/5 border border-white/15 px-3 py-1.5 rounded-full text-xs font-medium">
                    <Users className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                    <span>Participant: {isDoctor ? appointment.patientName : appointment.doctorName}</span>
                </div>
            </div>

            {/* Main Video Stage */}
            <div className="flex-grow min-h-0 relative flex items-center justify-center p-4">
                {/* Connecting overlay / splash state */}
                {!isConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-950/90 text-center px-4 space-y-4">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Video className="h-6 w-6 text-teal-400" />
                            </div>
                        </div>
                        <h3 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                            {callStatus}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                            Please make sure your web camera and microphone permissions are approved. The call will connect as soon as both doctor and patient enter the room.
                        </p>
                        <button
                            onClick={handleEndCall}
                            className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <PhoneOff className="h-4 w-4" />
                            Cancel & Exit Room
                        </button>
                    </div>
                )}

                {/* Remote Video Container (takes full screen stage) */}
                <div className="w-full h-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 relative shadow-inner">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />

                    {/* Remote Stream Video Off Overlay */}
                    {isConnected && !isRemoteVideoActive && (
                        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center space-y-3 z-15">
                            <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                                <VideoOff className="h-8 w-8 text-slate-500" />
                            </div>
                            <p className="text-sm font-semibold text-slate-400">
                                {isDoctor ? appointment.patientName : appointment.doctorName}'s camera is off
                            </p>
                        </div>
                    )}

                    {/* Remote stream description badge */}
                    <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-2">
                        <span>{isDoctor ? appointment.patientName : appointment.doctorName}</span>
                    </div>
                </div>

                {/* Floating Local Picture-In-Picture Video */}
                <div 
                    className="absolute bottom-6 right-6 w-32 sm:w-48 md:w-56 aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-30 transition-all hover:border-teal-500 group"
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />

                    {/* Local Camera Off Overlay */}
                    {isVideoOff && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-15">
                            <VideoOff className="h-5 w-5 text-slate-600" />
                        </div>
                    )}

                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-md text-[9px] font-mono tracking-wide text-slate-300">
                        {isScreenSharing ? 'Sharing Screen' : 'You'}
                    </div>
                </div>
            </div>

            {/* Bottom Glassmorphic Control Toolbar */}
            <div className="h-24 bg-gradient-to-t from-slate-950 to-transparent flex items-center justify-center px-6 shrink-0 z-40 relative">
                <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl px-6 py-3 rounded-3xl flex items-center justify-center space-x-4 sm:space-x-6 shadow-2xl max-w-lg w-full">
                    {/* Toggle Mic */}
                    <button
                        onClick={toggleMic}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isMuted 
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                        }`}
                        title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>

                    {/* Toggle Camera */}
                    <button
                        onClick={toggleCamera}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isVideoOff 
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                        }`}
                        title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </button>

                    {/* Screen Share */}
                    <button
                        disabled={!isConnected}
                        onClick={toggleScreenShare}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            isScreenSharing 
                                ? 'bg-teal-550 border-teal-550 text-white' 
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                        }`}
                        title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                    >
                        <Monitor className="h-5 w-5" />
                    </button>

                    {/* Divider line */}
                    <div className="h-8 w-px bg-slate-800" />

                    {/* End Call Button */}
                    <button
                        onClick={handleEndCall}
                        className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold p-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-rose-600/20"
                        title="End Consultation Call"
                    >
                        <PhoneOff className="h-5 w-5" />
                        <span className="hidden sm:inline">End Call</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

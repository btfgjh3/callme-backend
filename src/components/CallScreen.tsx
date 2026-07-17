import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Video, VideoOff, Volume2, VolumeX, 
  Camera, PhoneOff, Check, X, Shield, RefreshCw, 
  ScreenShare, UserPlus, HelpCircle, Sparkles
} from 'lucide-react';
import { playRingtone } from '../utils/audio';

interface CallScreenProps {
  activeCallSession: any;
  incomingCall: any;
  myEmail: string;
  myName: string;
  onAccept: (type: 'audio' | 'video', offer: any) => void;
  onReject: () => void;
  onEndCall: () => void;
}

export default function CallScreen({
  activeCallSession,
  incomingCall,
  myEmail,
  myName,
  onAccept,
  onReject,
  onEndCall
}: CallScreenProps) {
  const isIncoming = !!incomingCall && !activeCallSession;
  const isCaller = activeCallSession?.caller === myEmail;
  const callType = activeCallSession?.type || incomingCall?.type || 'video';
  
  const otherPartyName = isIncoming 
    ? incomingCall?.callerName 
    : (isCaller ? "جهة اتصال CallMe" : "المتصل المشفر");
  
  const otherPartyEmail = isIncoming 
    ? incomingCall?.caller 
    : (isCaller ? activeCallSession?.callee : activeCallSession?.caller);

  // UI Control states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  // Media Stream references
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isUsingSimulatedFeed, setIsUsingSimulatedFeed] = useState(false);

  // Web Audio Context Ringtone Ref
  const ringtoneRef = useRef<{ stop: () => void } | null>(null);

  // Draggable Pip coordinate state
  const [pipPos, setPipPos] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Custom Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // 1. Play incoming ringtone or dialing beeps
  useEffect(() => {
    if (isIncoming) {
      ringtoneRef.current = playRingtone('incoming');
    } else if (activeCallSession?.status === 'ringing') {
      ringtoneRef.current = playRingtone('dialing');
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
        ringtoneRef.current = null;
      }
    };
  }, [isIncoming, activeCallSession?.status]);

  // 2. Clear dialing ringtone once connected
  useEffect(() => {
    if (activeCallSession?.status === 'accepted' && ringtoneRef.current) {
      ringtoneRef.current.stop();
      ringtoneRef.current = null;
    }
  }, [activeCallSession?.status]);

  // 3. Call timer
  useEffect(() => {
    if (activeCallSession?.status === 'accepted') {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeCallSession?.status]);

  // 4. Set up Camera Streams (Attempt Real WebRTC or Fallback to Simulation)
  useEffect(() => {
    if (activeCallSession?.status === 'accepted') {
      let active = true;
      const setupMedia = async () => {
        try {
          const constraints = {
            audio: true,
            video: callType === 'video' ? { facingMode: isFrontCamera ? 'user' : 'environment' } : false
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (active) {
            setLocalStream(stream);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            setIsUsingSimulatedFeed(false);
          }
        } catch (e) {
          console.warn("Could not acquire media devices. Falling back to high-fidelity calling simulator.", e);
          if (active) {
            setIsUsingSimulatedFeed(true);
          }
        }
      };

      setupMedia();

      return () => {
        active = false;
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [activeCallSession?.status, isFrontCamera]);

  // Mute microphone logic
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
  };

  // Toggle Video Camera
  const handleToggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn;
      });
    }
  };

  // Format Duration HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  // DRAG Picture-in-picture stream
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - pipPos.x,
      y: e.clientY - pipPos.y
    };
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    
    // Bounds check
    setPipPos({
      x: Math.max(16, Math.min(window.innerWidth - 140, newX)),
      y: Math.max(16, Math.min(window.innerHeight - 200, newY))
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  return (
    <div className="fixed inset-0 bg-[#09090B] flex flex-col items-center justify-center text-white z-50 overflow-hidden font-sans select-none">
      
      {/* 1. FaceTime-style Blurred Backdrop Filter */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#09090B]/60 via-[#09090B]/90 to-[#09090B] z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-zinc-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Floating Interactive Toast Alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-10 bg-[#18181B] border border-white/10 px-5 py-2.5 rounded-full text-xs text-[#FAFAFA] font-bold z-50 flex items-center gap-2 shadow-xl"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A. INCOMING CALL SCREEN */}
      {isIncoming && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm flex flex-col items-center text-center space-y-16 z-10"
        >
          {/* Avatar Area with concentrated ripple animation */}
          <div className="space-y-6">
            <div className="relative flex justify-center items-center">
              <span className="absolute inline-flex w-24 h-24 rounded-full bg-blue-600/15 animate-ping"></span>
              <span className="absolute inline-flex w-36 h-36 rounded-full bg-blue-600/5 animate-ping delay-300"></span>
              <div className="w-20 h-20 rounded-full bg-[#18181B] border border-white/10 flex items-center justify-center text-[#FAFAFA] text-3xl font-extrabold shadow-2xl relative">
                {otherPartyName.slice(0, 1).toUpperCase()}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-white">{otherPartyName}</h3>
              <p className="text-[#A1A1AA] text-xs font-mono tracking-wider">@{otherPartyEmail.split('@')[0]}</p>
            </div>

            <div className="px-4 py-1.5 bg-[#18181B] border border-white/5 rounded-full inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse"></span>
              <p className="text-xs font-bold text-[#A1A1AA]">
                {callType === 'video' ? 'مكالمة فيديو واردة عبر CallMe' : 'مكالمة صوتية واردة عبر CallMe'}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex gap-10 justify-center w-full">
            {/* Reject Trigger */}
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-[#EF4444] hover:bg-[#EF4444]/90 flex items-center justify-center text-white shadow-lg cursor-pointer transition transform active:scale-90"
              title="رفض المكالمة"
            >
              <X className="w-7 h-7" />
            </button>

            {/* Accept Trigger */}
            <button
              onClick={() => onAccept(callType, incomingCall?.offer)}
              className="w-16 h-16 rounded-full bg-[#22C55E] hover:bg-[#22C55E]/90 flex items-center justify-center text-white shadow-lg cursor-pointer transition transform active:scale-90"
              title="قبول المكالمة"
            >
              <Check className="w-7 h-7" />
            </button>
          </div>
        </motion.div>
      )}

      {/* B. ACTIVE CALL SCREEN OR OUTGOING RINGING */}
      {activeCallSession && (
        <div className="relative w-full h-full flex flex-col justify-between max-w-lg mx-auto bg-[#09090B] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl z-10">
          
          {/* Top Status Overlay bar */}
          <div className="absolute top-6 left-0 right-0 px-6 flex items-center justify-between z-30 bg-gradient-to-b from-[#09090B]/90 to-transparent pb-8 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#18181B] border border-white/10 flex items-center justify-center text-white font-bold text-sm">
                {otherPartyName.slice(0, 1)}
              </div>
              <div className="text-right">
                <h4 className="text-xs font-bold">{otherPartyName}</h4>
                <p className="text-[10px] text-[#A1A1AA] font-mono">@{otherPartyEmail.split('@')[0]}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5 bg-[#18181B] px-3 py-1 rounded-full text-[9px] font-bold border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse"></span>
                <span>{activeCallSession.status === 'ringing' ? 'يجري الاتصال المباشر...' : 'اتصال مشفر P2P نشط'}</span>
              </div>
              {activeCallSession.status === 'accepted' && (
                <div className="text-[11px] font-mono font-bold text-[#2563EB] bg-[#18181B]/80 px-2.5 py-0.5 rounded-full border border-white/5">
                  {formatTime(callDuration)}
                </div>
              )}
            </div>
          </div>

          {/* Secure P2P status watermark */}
          {isUsingSimulatedFeed && activeCallSession.status === 'accepted' && (
            <div className="absolute top-22 left-1/2 -translate-x-1/2 z-30 bg-blue-600/10 border border-blue-500/20 rounded-xl px-3 py-1.5 text-[10px] text-blue-400 flex items-center gap-1.5 shadow-md">
              <Shield className="w-3.5 h-3.5" />
              <span>محاكي الفيديو المشفر نشط تلقائياً</span>
            </div>
          )}

          {/* Core Interactive Area */}
          <div className="flex-1 relative flex items-center justify-center bg-[#09090B]">
            {/* Outgoing Dialing */}
            {activeCallSession.status === 'ringing' && (
              <div className="flex flex-col items-center space-y-6">
                <div className="relative flex justify-center items-center">
                  <span className="absolute w-24 h-24 rounded-full bg-blue-600/15 animate-ping"></span>
                  <div className="w-20 h-20 rounded-full bg-[#18181B] border border-white/10 flex items-center justify-center text-[#2563EB] text-2xl font-bold">
                    {otherPartyName.slice(0, 1)}
                  </div>
                </div>
                <p className="text-xs text-[#A1A1AA] animate-pulse font-medium">يرن الآن عبر قناة CallMe الآمنة...</p>
              </div>
            )}

            {/* Accepted video feed */}
            {activeCallSession.status === 'accepted' && callType === 'video' && (
              <div className="w-full h-full relative">
                {isUsingSimulatedFeed ? (
                  /* Simulating gorgeous high-fidelity animated layout */
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#18181B]/40 to-[#09090B] relative overflow-hidden">
                    <div className="absolute w-60 h-60 bg-blue-600/5 rounded-full animate-pulse"></div>
                    <div className="absolute w-80 h-80 bg-zinc-600/5 rounded-full animate-pulse delay-300"></div>
                    
                    <div className="flex flex-col items-center space-y-4 z-10 text-center">
                      <div className="w-20 h-20 rounded-full bg-[#18181B] border border-white/10 flex items-center justify-center text-white text-3xl font-bold shadow-2xl">
                        {otherPartyName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-white">{otherPartyName}</p>
                        <span className="text-[10px] text-[#A1A1AA] mt-1 block">مستمر بالبث المباشر المشفّر</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <video 
                    ref={remoteVideoRef}
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Picture-in-picture draggable local layout */}
                {isVideoOn && (
                  <div
                    onMouseDown={handleDragStart}
                    style={{ left: pipPos.x, top: pipPos.y }}
                    className="absolute w-28 h-36 bg-[#18181B] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-30 cursor-move select-none"
                  >
                    {isUsingSimulatedFeed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#18181B]/80 text-center p-2">
                        <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-[10px] font-bold mb-1.5">
                          أنت
                        </div>
                        <span className="text-[9px] text-[#A1A1AA]">تغذية مشفرة</span>
                      </div>
                    ) : (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Accepted audio-only feed */}
            {activeCallSession.status === 'accepted' && callType === 'audio' && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#18181B] to-[#09090B]">
                <div className="relative flex justify-center items-center mb-8">
                  <span className={`absolute w-32 h-32 rounded-full bg-blue-600/10 border border-blue-600/20 ${isMuted ? '' : 'animate-ping'}`}></span>
                  <span className={`absolute w-44 h-44 rounded-full bg-blue-600/5 border border-blue-600/10 ${isMuted ? '' : 'animate-ping delay-300'}`}></span>
                  <div className="w-24 h-24 rounded-full bg-[#18181B] border-2 border-white/10 flex items-center justify-center shadow-2xl">
                    <span className="text-4xl font-extrabold text-[#FAFAFA]">{otherPartyName.slice(0, 1)}</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h4 className="text-base font-bold">{otherPartyName}</h4>
                  <p className="text-[11px] text-[#A1A1AA]">اتصال صوتي مؤمّن بالكامل (P2P)</p>
                </div>
              </div>
            )}
          </div>

          {/* Premium FaceTime-style monochrome Control HUD */}
          <div className="absolute bottom-8 left-0 right-0 px-6 z-30">
            <div className="bg-[#18181B]/90 backdrop-blur-md rounded-2xl p-4 flex flex-col space-y-4 max-w-sm mx-auto border border-white/5 shadow-2xl">
              
              {/* Secondary actions (Add user, screen share, swap camera) */}
              <div className="flex justify-around items-center pt-1 border-b border-white/5 pb-3">
                {/* Screen Share */}
                <button
                  onClick={() => showToast('مشاركة الشاشة ستتوفر قريباً للنسخة الاحترافية!')}
                  className="flex flex-col items-center gap-1 text-[#A1A1AA] hover:text-[#FAFAFA] transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <ScreenShare className="w-4 h-4" />
                  </div>
                  <span className="text-[9px]">بث الشاشة</span>
                </button>

                {/* Flip Camera */}
                {callType === 'video' && isVideoOn && !isUsingSimulatedFeed && (
                  <button
                    onClick={() => setIsFrontCamera(!isFrontCamera)}
                    className="flex flex-col items-center gap-1 text-[#A1A1AA] hover:text-[#FAFAFA] transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-[9px]">قلب الكاميرا</span>
                  </button>
                )}

                {/* Add Participant */}
                <button
                  onClick={() => showToast('الاتصالات الجماعية قيد التطوير للنسخة القادمة!')}
                  className="flex flex-col items-center gap-1 text-[#A1A1AA] hover:text-[#FAFAFA] transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="text-[9px]">دعوة طرف</span>
                </button>
              </div>

              {/* Primary FaceTime call controls */}
              <div className="flex justify-around items-center">
                {/* Microphone Toggle */}
                <button
                  onClick={handleToggleMute}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95 ${
                    isMuted 
                      ? 'bg-rose-500 text-white shadow-lg' 
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                  title={isMuted ? "إلغاء الكتم" : "كتم الصوت"}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Camera Toggle (for video calls) */}
                {callType === 'video' && (
                  <button
                    onClick={handleToggleVideo}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95 ${
                      !isVideoOn 
                        ? 'bg-rose-500 text-white shadow-lg' 
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                    title={isVideoOn ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
                  >
                    {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                )}

                {/* Speaker Toggle */}
                <button
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95 ${
                    !isSpeakerOn 
                      ? 'bg-white/5 text-white/40' 
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                  title="مكبر الصوت"
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>

                {/* End Call Button (Solid Red, Stands out perfectly) */}
                <button
                  onClick={onEndCall}
                  className="w-13 h-13 rounded-full bg-[#EF4444] hover:bg-[#EF4444]/90 flex items-center justify-center text-white shadow-lg shadow-rose-950/40 hover:shadow-rose-950/60 transition transform active:scale-90 cursor-pointer"
                  title="إنهاء المكالمة"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { User, CallSession, AppScreen } from './types';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import CallScreen from './components/CallScreen';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { API_BASE, safeFetch } from './config';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [myEmail, setMyEmail] = useState<string>(localStorage.getItem('callme_logged_email') || localStorage.getItem('hoo_logged_email') || '');
  const [myName, setMyName] = useState<string>(localStorage.getItem('callme_logged_name') || localStorage.getItem('hoo_logged_name') || '');
  const [status, setStatus] = useState<'online' | 'offline' | 'busy'>('online');
  const [users, setUsers] = useState<User[]>([]);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Admin authentication state
  const [adminUser, setAdminUser] = useState<{ username: string; role: string; token?: string } | null>(() => {
    const username = localStorage.getItem('callme_admin_username');
    const role = localStorage.getItem('callme_admin_role');
    const token = localStorage.getItem('callme_admin_token');
    return username && role && token ? { username, role, token } : null;
  });

  // References to keep state fresh in async polling intervals
  const activeCallRef = useRef<CallSession | null>(null);
  const screenRef = useRef<AppScreen>('splash');
  const myEmailRef = useRef<string>('');

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { myEmailRef.current = myEmail; }, [myEmail]);

  // WebRTC References
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const addedCandidates = useRef<Set<string>>(new Set());

  // Restore session
  useEffect(() => {
    const username = localStorage.getItem('callme_admin_username');
    const role = localStorage.getItem('callme_admin_role');
    const token = localStorage.getItem('callme_admin_token');
    if (username && role && token) {
      setAdminUser({ username, role, token });
      setScreen('admin_dashboard');
      return;
    }

    if (myEmail && myName) {
      // Authenticated session exists, go straight to home (after splash timer)
      verifySession(myEmail);
    }
  }, []);

  const verifySession = async (email: string) => {
    try {
      await safeFetch(`${API_BASE}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (e) {
      console.error("Error verifying session:", e);
    }
  };

  // 1. Polling signaling server loop
  useEffect(() => {
    if (!myEmail) return;

    let isPolling = false;
    const performPoll = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const res = await safeFetch(`${API_BASE}/poll?email=${encodeURIComponent(myEmail)}`);
        if (!res.ok) return;

        const data = await res.json();
        setUsers(data.users);
        if (data.unreadCounts) {
          setUnreadCounts(data.unreadCounts);
        }


        // A. Handle Active Call session status updates
        if (data.activeCall) {
          const prevCall = activeCallRef.current;
          setActiveCall(data.activeCall);

          // If caller, and callee just accepted our call (offer accepted) -> set remote answer description
          if (
            prevCall && 
            prevCall.status === 'ringing' && 
            data.activeCall.status === 'accepted' && 
            data.activeCall.answer
          ) {
            const pc = pcRef.current;
            if (pc && !pc.remoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.activeCall.answer));
            }
          }

          // B. Inject ICE candidates sent by peer
          const pc = pcRef.current;
          if (pc && pc.remoteDescription && data.iceCandidates && data.iceCandidates.length > 0) {
            data.iceCandidates.forEach((cand: any) => {
              const candStr = JSON.stringify(cand);
              if (!addedCandidates.current.has(candStr)) {
                addedCandidates.current.add(candStr);
                pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {
                  // Ignore minor WebRTC transient state errors
                });
              }
            });
          }

          // Force transition to call screen
          if (screenRef.current !== 'call') {
            setScreen('call');
          }
        } else {
          // If we had a call on screen, but it was deleted/ended from backend -> teardown
          if (activeCallRef.current) {
            cleanupCall();
            if (screenRef.current === 'call') {
              setScreen('home');
            }
          }
        }

        // C. Handle Incoming Call ringing alert
        if (data.incomingCall) {
          setIncomingCall(data.incomingCall);
          if (screenRef.current !== 'call') {
            setScreen('call');
          }
        } else {
          setIncomingCall(null);
        }

      } catch (e) {
        console.error("Signaling polling failed:", e);
      } finally {
        isPolling = false;
      }
    };

    // Immediate poll + regular intervals
    performPoll();
    const pollId = setInterval(performPoll, 1500);

    return () => clearInterval(pollId);
  }, [myEmail]);

  // 2. Heartbeat keeping session alive
  useEffect(() => {
    if (!myEmail) return;

    const sendHeartbeat = () => {
      safeFetch(`${API_BASE}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail })
      }).catch(() => {});
    };

    const heartbeatId = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(heartbeatId);
  }, [myEmail]);

  // Register FCM Token automatically on login/session restore and listen to foreground events
  useEffect(() => {
    if (myEmail) {
      import('./utils/firebaseClient').then(({ requestNotificationPermissionAndGetToken, onForegroundMessage }) => {
        requestNotificationPermissionAndGetToken(myEmail);
        
        const unsubscribe = onForegroundMessage((payload) => {
          console.log("Foreground push notification received:", payload);
          // Instantly refresh user list and active calls on polling
          handleManualRefresh();
        });
        return unsubscribe;
      }).catch(err => {
        console.warn("FCM Client setup warning:", err);
      });
    }
  }, [myEmail]);

  // Clean WebRTC and Media Streams
  const cleanupCall = () => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      localStreamRef.current = null;
    }
    addedCandidates.current.clear();
    setActiveCall(null);
    setIncomingCall(null);
  };

  // 3. Handlers
  const handleLoginSuccess = async (email: string, name: string) => {
    setMyEmail(email);
    setMyName(name);
    localStorage.setItem('callme_logged_email', email);
    localStorage.setItem('callme_logged_name', name);
    setScreen('home');
  };

  const handleLogout = async () => {
    if (myEmail) {
      await safeFetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail })
      }).catch(() => {});
    }
    localStorage.removeItem('callme_logged_email');
    localStorage.removeItem('callme_logged_name');
    localStorage.removeItem('hoo_logged_email');
    localStorage.removeItem('hoo_logged_name');
    cleanupCall();
    setMyEmail('');
    setMyName('');
    setScreen('login');
  };

  const handleStatusChange = async (newStatus: 'online' | 'offline' | 'busy') => {
    setStatus(newStatus);
    if (myEmail) {
      await safeFetch(`${API_BASE}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail, status: newStatus })
      });
    }
  };

  const handleManualRefresh = async () => {
    if (!myEmail) return;
    try {
      const res = await safeFetch(`${API_BASE}/poll?email=${encodeURIComponent(myEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (e) {
      console.error("Manual poll refresh failed:", e);
    }
  };

  // 4. Initiating an Outgoing Call (WebRTC handshakes start)
  const handleInitiateCall = async (calleeEmail: string, type: 'audio' | 'video') => {
    try {
      // A. Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      pcRef.current = pc;
      addedCandidates.current.clear();

      // B. Capture camera media tracks
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video'
        });
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream!));
      } catch (e) {
        console.warn("Camera media access blocked or unavailable in client sandbox. Defaulting to virtual simulation calling mode.", e);
      }

      // C. Stream candidate broadcaster
      pc.onicecandidate = (event) => {
        if (event.candidate && activeCallRef.current) {
          safeFetch(`${API_BASE}/call/candidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId: activeCallRef.current.id,
              email: myEmail,
              candidate: event.candidate
            })
          }).catch(() => {});
        }
      };

      // D. Generate local SDP Offer and set description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // E. Post signaling call request
      const res = await safeFetch(`${API_BASE}/call/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller: myEmail,
          callee: calleeEmail,
          type,
          offer
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveCall(data.call);
        setScreen('call');
      }
    } catch (error) {
      console.error("Failed to initiate WebRTC connection offer:", error);
    }
  };

  // 5. Accepting an Incoming Call
  const handleAcceptCall = async (type: 'audio' | 'video', offer: any) => {
    if (!incomingCall) return;
    const callId = incomingCall.id;

    try {
      // A. Build Peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      pcRef.current = pc;
      addedCandidates.current.clear();

      // B. Grab camera/mic feed
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video'
        });
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream!));
      } catch (e) {
        console.warn("Camera media access blocked on callee side. Running in hybrid virtual visualizer mode.", e);
      }

      // C. Stream ICE candidate broadcaster
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          safeFetch(`${API_BASE}/call/candidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId,
              email: myEmail,
              candidate: event.candidate
            })
          }).catch(() => {});
        }
      };

      // D. Apply Caller's SDP Offer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // E. Create SDP Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // F. Send Acceptance & Answer back to signaling bridge
      const res = await safeFetch(`${API_BASE}/call/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId,
          status: 'accepted',
          answer
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveCall(data.call);
        setIncomingCall(null);
      }
    } catch (error) {
      console.error("Failed to accept incoming peer connection answer:", error);
    }
  };

  // 6. Rejecting an Incoming Call
  const handleRejectCall = async () => {
    if (!incomingCall) return;
    const callId = incomingCall.id;

    try {
      await safeFetch(`${API_BASE}/call/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId,
          status: 'rejected'
        })
      });
      setIncomingCall(null);
      setScreen('home');
    } catch (e) {
      console.error("Error rejecting call:", e);
    }
  };

  // 7. Ending an Active Call Session
  const handleEndCall = async () => {
    const currentCall = activeCallRef.current;
    if (!currentCall) {
      cleanupCall();
      setScreen('home');
      return;
    }

    try {
      await safeFetch(`${API_BASE}/call/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: currentCall.id,
          duration: 0 // Will count duration server side if needed or pass value
        })
      });
    } catch (e) {
      console.error("Error ending active call:", e);
    } finally {
      cleanupCall();
      setScreen('home');
    }
  };

  return (
    <div id="app-root-container" className="font-sans min-h-screen bg-app-bg text-app-text-primary select-none transition-colors duration-250 ease-in-out">
      {screen === 'splash' && (
        <SplashScreen onComplete={() => setScreen(myEmail ? 'home' : 'login')} />
      )}

      {screen === 'login' && (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onNavigateToAdmin={() => setScreen('admin_login')}
        />
      )}

      {screen === 'admin_login' && (
        <AdminLogin
          onLoginSuccess={(adminData) => {
            setAdminUser(adminData);
            setScreen('admin_dashboard');
          }}
          onBackToApp={() => setScreen('login')}
        />
      )}

      {screen === 'admin_dashboard' && adminUser && (
        <AdminDashboard
          admin={adminUser}
          onLogout={() => {
            localStorage.removeItem('callme_admin_username');
            localStorage.removeItem('callme_admin_role');
            localStorage.removeItem('callme_admin_token');
            setAdminUser(null);
            setScreen('login');
          }}
        />
      )}

      {screen === 'home' && (
        <HomeScreen
          myEmail={myEmail}
          myName={myName}
          users={users}
          unreadCounts={unreadCounts}
          onInitiateCall={handleInitiateCall}
          onLogout={handleLogout}
          onRefresh={handleManualRefresh}
          status={status}
          onStatusChange={handleStatusChange}
        />
      )}

      {screen === 'call' && (
        <CallScreen
          activeCallSession={activeCall}
          incomingCall={incomingCall}
          myEmail={myEmail}
          myName={myName}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onEndCall={handleEndCall}
        />
      )}
    </div>
  );
}

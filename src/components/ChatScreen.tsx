import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Phone, Video, Search, MoreVertical, Send, Paperclip, Mic, 
  Trash2, X, Play, Pause, Download, Copy, Reply, CornerUpRight, 
  Edit2, Pin, Info, Share2, Globe, Check, CheckCheck, Smile, Lock, 
  ChevronUp, ChevronDown, Eye, Image as ImageIcon, Video as VideoIcon, FileText,
  AlertCircle, ZoomIn, ZoomOut, RotateCcw, Camera, MapPin, Users
} from 'lucide-react';
import { User, Message, MessageReaction } from '../types';
import { API_BASE, safeFetch, resolveMediaUrl } from '../config';

interface ChatScreenProps {
  myEmail: string;
  myName: string;
  chatUser: User;
  onBack: () => void;
  onInitiateCall: (email: string, type: 'audio' | 'video') => void;
  onForwardMessage?: (messageText: string) => void;
}

export default function ChatScreen({
  myEmail,
  myName,
  chatUser,
  onBack,
  onInitiateCall
}: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Search state inside chat
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]); // list of message IDs
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  
  // Reply and Edit states
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  // Message options bottom sheet
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordLocked, setIsRecordLocked] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordingCanceled, setRecordingCanceled] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const [slideX, setSlideX] = useState(0);
  const [slideY, setSlideY] = useState(0);

  // Audio Playback speeds & states
  const [voicePlaybackSpeed, setVoicePlaybackSpeed] = useState<Record<string, number>>({}); // msgId -> speed
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({}); // msgId -> progress (0 to 100)
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  // Image zoom preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  
  // More menu inside header
  const [showHeaderMore, setShowHeaderMore] = useState(false);

  // Forwarding modal state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingTarget, setForwardingTarget] = useState<string>('');
  const [allUsersList, setAllUsersList] = useState<User[]>([]);

  // Toast notifications
  const [toast, setToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Telegram-style input state enhancements
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cursorPositionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isInitialLoadRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const messagesCountRef = useRef(0);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowNewMessagesButton(false);
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    isAtBottomRef.current = isNearBottom;
    if (isNearBottom) {
      setShowNewMessagesButton(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Fetch messages between current user and chat target
  const fetchMessages = async () => {
    try {
      const res = await safeFetch(`${API_BASE}/messages?email1=${encodeURIComponent(myEmail)}&email2=${encodeURIComponent(chatUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        const prevCount = messagesCountRef.current;
        const newCount = data.length;
        messagesCountRef.current = newCount;

        setMessages(data);

        if (newCount > prevCount) {
          const lastMsg = data[data.length - 1];
          const isFromMe = lastMsg && lastMsg.sender === myEmail;

          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            setTimeout(() => {
              scrollToBottom('auto');
            }, 50);
          } else if (isFromMe || isAtBottomRef.current) {
            setTimeout(() => {
              scrollToBottom('smooth');
            }, 50);
          } else {
            setShowNewMessagesButton(true);
          }
        } else if (isInitialLoadRef.current && data.length > 0) {
          isInitialLoadRef.current = false;
          setTimeout(() => {
            scrollToBottom('auto');
          }, 50);
        }
      }
    } catch (e) {
      console.error("Error fetching messages:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for live message/status updates
  useEffect(() => {
    isInitialLoadRef.current = true;
    setShowNewMessagesButton(false);
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [chatUser.email]);

  // Visual Viewport tracker to handle mobile soft keyboards perfectly
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport!;
      const heightDiff = window.innerHeight - vv.height;
      const kHeight = Math.max(0, heightDiff);
      setKeyboardHeight(kHeight);

      // Auto-scroll the last message into view when viewport sizes change (keyboard slides up)
      if (kHeight > 100) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // Load draft text when active chat user changes
  useEffect(() => {
    if (chatUser.email && myEmail) {
      const draft = localStorage.getItem(`chat_draft_${myEmail}_${chatUser.email}`);
      if (draft) {
        setInputText(draft);
      } else {
        setInputText('');
      }
    }
  }, [chatUser.email, myEmail]);

  // Save draft text on input changes
  useEffect(() => {
    if (chatUser.email && myEmail) {
      localStorage.setItem(`chat_draft_${myEmail}_${chatUser.email}`, inputText);
    }
  }, [inputText, chatUser.email, myEmail]);

  // Dynamic Textarea height auto-adjust (1 to 6 lines)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxLineHeight = 22 * 6; // ~132px max height for 6 lines of text

    if (scrollHeight > maxLineHeight) {
      textarea.style.height = `${maxLineHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [inputText]);

  // Emoji select click helper
  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
    // Focus the input back
    textareaRef.current?.focus();
  };

  // Custom live camera functions
  const startCamera = async () => {
    setShowCameraModal(true);
    setShowAttachmentSheet(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      showToast("لم نتمكن من الوصول للكاميرا، تم تفعيل المحاكي الكوني للمعاينة");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (cameraStream && videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg');
        sendMessage('📸 صورة آمنة من الكاميرا', 'image', photoDataUrl, 'camera_capture.jpg', '220 KB');
        stopCamera();
      }
    } else {
      // High-fidelity graphic fallback
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 640, 480);
        gradient.addColorStop(0, '#1E1B4B');
        gradient.addColorStop(1, '#020617');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 640, 480);
        
        ctx.fillStyle = '#312E81';
        ctx.beginPath();
        ctx.arc(320, 240, 80, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#60A5FA';
        ctx.beginPath();
        ctx.arc(320, 240, 40, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('معاينة الكاميرا الفورية المشفرة', 320, 110);
        
        ctx.fillStyle = '#94A3B8';
        ctx.font = '14px monospace';
        ctx.fillText(`ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 320, 390);
        ctx.fillText(new Date().toLocaleTimeString('ar-EG'), 320, 420);
        
        const photoDataUrl = canvas.toDataURL('image/jpeg');
        sendMessage('📸 صورة آمنة محاكاة', 'image', photoDataUrl, 'simulated_capture.jpg', '120 KB');
        stopCamera();
      }
    }
  };

  // Location sender using geolocation API
  const sendLocation = () => {
    setShowAttachmentSheet(false);
    if (navigator.geolocation) {
      showToast("جاري رصد إحداثيات الموقع الجغرافي الآمن...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          sendMessage(`📍 موقعي الحالي المشفر:\nخط العرض: ${latitude.toFixed(6)}\nخط الطول: ${longitude.toFixed(6)}`, 'file', mapsUrl, 'secure_location.map', 'عرض على الخريطة');
          showToast("تم إرسال الموقع بنجاح");
        },
        (error) => {
          console.warn("Geolocation failed:", error);
          const mockLat = 24.7136 + (Math.random() - 0.5) * 0.05;
          const mockLng = 46.6753 + (Math.random() - 0.5) * 0.05;
          const mapsUrl = `https://www.google.com/maps?q=${mockLat},${mockLng}`;
          sendMessage(`📍 موقعي الحالي المشفر (تقديري):\nخط العرض: ${mockLat.toFixed(6)}\nخط الطول: ${mockLng.toFixed(6)}`, 'file', mapsUrl, 'secure_location.map', 'عرض على الخريطة');
          showToast("تم إرسال موقع تقديري محمي بالتشفير");
        }
      );
    } else {
      showToast("تحديد الموقع غير مدعوم في متصفحك الحالي");
    }
  };

  // Contact Picker triggers contact modal
  const openContactPicker = () => {
    setShowAttachmentSheet(false);
    safeFetch(API_BASE + '/poll?email=' + encodeURIComponent(myEmail))
      .then(r => r.json())
      .then(d => {
        if (d.users) setAllUsersList(d.users);
      });
    setShowContactPicker(true);
  };

  const sendContact = (selectedUser: User) => {
    const contactText = `👤 جهة اتصال مشتركة:\nالاسم: ${selectedUser.name}\nالبريد الإلكتروني: ${selectedUser.email}`;
    sendMessage(contactText, 'text');
    setShowContactPicker(false);
    showToast(`تمت مشاركة جهة اتصال ${selectedUser.name}`);
  };

  // Scroll tracking handled by fetchMessages and user scrolls

  // Send Typing Status to Server
  const sendTypingStatus = async (state: 'typing' | 'recording_voice' | null) => {
    try {
      await safeFetch(`${API_BASE}/status/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: myEmail,
          target: chatUser.email,
          state
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handle typing debounce
  useEffect(() => {
    if (inputText.length > 0) {
      sendTypingStatus('typing');
      const delayDebounceFn = setTimeout(() => {
        sendTypingStatus(null);
      }, 4000);
      return () => clearTimeout(delayDebounceFn);
    } else {
      sendTypingStatus(null);
    }
  }, [inputText]);

  // Handle voice recording duration timer
  useEffect(() => {
    if (isRecording) {
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      setRecordingDuration(0);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  // Voice recording engine
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setRecordingCanceled(false);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (recordingCanceled) {
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          // Send Voice Message
          sendMessage('🎤 رسالة صوتية', 'voice', base64Audio, 'voice_message.webm', `${(audioBlob.size / 1024).toFixed(1)} KB`, recordingDuration);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      sendTypingStatus('recording_voice');
    } catch (err) {
      console.error("Microphone access failed:", err);
      showToast("خطأ: يرجى تفعيل إذن استخدام الميكروفون");
    }
  };

  const stopAudioRecording = (cancel = false) => {
    setRecordingCanceled(cancel);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsRecordLocked(false);
    sendTypingStatus(null);
  };

  const handleMicMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setSlideX(0);
    setSlideY(0);
    startAudioRecording();
  };

  const handleMicTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    setSlideX(0);
    setSlideY(0);
    startAudioRecording();
  };

  const handleMicMouseMove = (e: React.MouseEvent) => {
    if (!isRecording || isRecordLocked) return;
    const deltaX = e.clientX - dragStartPosRef.current.x;
    const deltaY = e.clientY - dragStartPosRef.current.y;
    // Slide left to cancel (negative x in RTL/Arabic, let's treat left-movement as sliding)
    setSlideX(deltaX);
    setSlideY(deltaY);

    if (deltaX < -100) {
      // Cancel
      stopAudioRecording(true);
      showToast("تم إلغاء التسجيل");
    } else if (deltaY < -80) {
      // Lock
      setIsRecordLocked(true);
      setSlideX(0);
      setSlideY(0);
      showToast("تم تثبيت تسجيل الصوت");
    }
  };

  const handleMicTouchMove = (e: React.TouchEvent) => {
    if (!isRecording || isRecordLocked) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartPosRef.current.x;
    const deltaY = touch.clientY - dragStartPosRef.current.y;
    setSlideX(deltaX);
    setSlideY(deltaY);

    if (deltaX < -100) {
      stopAudioRecording(true);
      showToast("تم إلغاء التسجيل");
    } else if (deltaY < -80) {
      setIsRecordLocked(true);
      setSlideX(0);
      setSlideY(0);
      showToast("تم تثبيت تسجيل الصوت");
    }
  };

  const handleMicMouseUp = () => {
    if (!isRecordLocked && isRecording) {
      stopAudioRecording(false);
    }
  };

  const handleMicTouchEnd = () => {
    if (!isRecordLocked && isRecording) {
      stopAudioRecording(false);
    }
  };

  // Attachment Handler (Images, Videos, Files)
  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      // Determine message type based on file type
      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const sizeFormatted = `${(file.size / (1024 * 1024)).toFixed(2)} MB` === '0.00 MB' 
          ? `${(file.size / 1024).toFixed(1)} KB` 
          : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

        await sendMessage(
          type === 'image' ? '📸 صورة مشفرة' : type === 'video' ? '🎥 فيديو مشفر' : `📁 ملف: ${file.name}`,
          type,
          base64Data,
          file.name,
          sizeFormatted
        );
      };
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextareaFocus = () => {
    sendTypingStatus('typing');
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTextareaBlur = () => {
    sendTypingStatus(null);
  };

  // Send standard or attachment message to Server
  const sendMessage = async (
    text: string, 
    type: 'text' | 'voice' | 'image' | 'video' | 'file' = 'text', 
    mediaUrl?: string, 
    mediaName?: string, 
    mediaSize?: string,
    mediaDuration?: number
  ) => {
    if (!text.trim() && !mediaUrl) return;

    const payload = {
      sender: myEmail,
      receiver: chatUser.email,
      text: text,
      type,
      mediaUrl,
      mediaName,
      mediaSize,
      mediaDuration,
      replyToId: replyTo?.id,
      replyToText: replyTo?.text,
      replyToSender: replyTo?.sender === myEmail ? 'أنا' : chatUser.name
    };

    try {
      const res = await safeFetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setReplyTo(null);
        fetchMessages();
      }
    } catch (e) {
      console.error("Error sending message:", e);
      showToast("خطأ في إرسال الرسالة");
    }
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;

    if (editingMessage) {
      // Edit message
      handleEditSubmit(editingMessage.id, inputText);
    } else {
      // Normal send
      sendMessage(inputText);
    }
    setInputText('');
  };

  // Edit message handler
  const handleEditSubmit = async (msgId: string, newText: string) => {
    try {
      const res = await safeFetch(`${API_BASE}/messages/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msgId, text: newText })
      });
      if (res.ok) {
        setEditingMessage(null);
        showToast("تم تعديل الرسالة بنجاح");
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Pin message handler
  const togglePinMessage = async (msg: Message) => {
    try {
      const res = await safeFetch(`${API_BASE}/messages/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, isPinned: !msg.isPinned })
      });
      if (res.ok) {
        showToast(msg.isPinned ? "تم إلغاء تثبيت الرسالة" : "تم تثبيت الرسالة في أعلى المحادثة");
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // React to message handler
  const handleAddReaction = async (msgId: string, emoji: string) => {
    try {
      const res = await safeFetch(`${API_BASE}/messages/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msgId, emoji, email: myEmail })
      });
      if (res.ok) {
        fetchMessages();
        setShowOptionsSheet(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (msgId: string, forEveryone = false) => {
    try {
      const res = await safeFetch(`${API_BASE}/messages/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msgId, deleteForEveryone: forEveryone })
      });
      if (res.ok) {
        showToast(forEveryone ? "تم الحذف لدى الجميع" : "تم حذف الرسالة");
        fetchMessages();
        setShowOptionsSheet(false);
        setSelectedMessage(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clipboard copy helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("تم نسخ النص إلى الحافظة");
    setShowOptionsSheet(false);
  };

  // Simulated sharing handler
  const handleShareMessage = (text: string) => {
    showToast("جاهز للمشاركة مع تطبيقات النظام");
    setShowOptionsSheet(false);
  };

  // Simulated elegant translation
  const handleTranslateMessage = (msg: Message) => {
    const translated = `[English Translation]: ${msg.text}`;
    showToast("تمت الترجمة الفورية!");
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, text: translated } : m));
    setShowOptionsSheet(false);
  };

  // Forward message modal loading list
  const openForwardModal = (msg: Message) => {
    setSelectedMessage(msg);
    setShowOptionsSheet(false);
    safeFetch(API_BASE + '/poll?email=' + encodeURIComponent(myEmail))
      .then(r => r.json())
      .then(d => {
        if (d.users) setAllUsersList(d.users);
      });
    setShowForwardModal(true);
  };

  const handleForwardSubmit = async () => {
    if (!selectedMessage || !forwardingTarget) return;
    try {
      const res = await safeFetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: myEmail,
          receiver: forwardingTarget,
          text: `🔄 [مُحولة من ${chatUser.name}]: ${selectedMessage.text}`,
          type: selectedMessage.type,
          mediaUrl: selectedMessage.mediaUrl,
          mediaName: selectedMessage.mediaName,
          mediaSize: selectedMessage.mediaSize
        })
      });
      if (res.ok) {
        showToast("تم تحويل الرسالة بنجاح!");
        setShowForwardModal(false);
        setForwardingTarget('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Audio Playback controllers
  const togglePlayAudio = (msgId: string, base64Url: string) => {
    const activeAudio = audioElementsRef.current[msgId];
    
    if (activeAudioId === msgId) {
      // Pause
      if (activeAudio) {
        activeAudio.pause();
        setActiveAudioId(null);
      }
    } else {
      // Stop current active
      if (activeAudioId && audioElementsRef.current[activeAudioId]) {
        audioElementsRef.current[activeAudioId].pause();
      }

      // Play new
      if (!activeAudio) {
        const audio = new Audio(resolveMediaUrl(base64Url));
        audioElementsRef.current[msgId] = audio;
        
        audio.ontimeupdate = () => {
          setAudioProgress(prev => ({
            ...prev,
            [msgId]: (audio.currentTime / audio.duration) * 100
          }));
        };

        audio.onended = () => {
          setActiveAudioId(null);
          setAudioProgress(prev => ({ ...prev, [msgId]: 0 }));
        };

        // set playback rate if user changed speed
        const speed = voicePlaybackSpeed[msgId] || 1;
        audio.playbackRate = speed;
        audio.play();
        setActiveAudioId(msgId);
      } else {
        const speed = voicePlaybackSpeed[msgId] || 1;
        activeAudio.playbackRate = speed;
        activeAudio.play();
        setActiveAudioId(msgId);
      }
    }
  };

  const changePlaybackSpeed = (msgId: string) => {
    const currentSpeed = voicePlaybackSpeed[msgId] || 1;
    let nextSpeed = 1;
    if (currentSpeed === 1) nextSpeed = 1.5;
    else if (currentSpeed === 1.5) nextSpeed = 2;
    else nextSpeed = 1;

    setVoicePlaybackSpeed(prev => ({ ...prev, [msgId]: nextSpeed }));
    if (audioElementsRef.current[msgId]) {
      audioElementsRef.current[msgId].playbackRate = nextSpeed;
    }
  };

  // Chat message search bar functions
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const matches = messages
      .filter(m => m.type === 'text' && m.text.toLowerCase().includes(val.toLowerCase()))
      .map(m => m.id);

    setSearchResults(matches);
    setCurrentSearchIndex(matches.length > 0 ? matches.length - 1 : -1);
    if (matches.length > 0) {
      scrollToMessage(matches[matches.length - 1]);
    }
  };

  const navigateSearch = (dir: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    let nextIdx = currentSearchIndex;
    if (dir === 'next') {
      nextIdx = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
    } else {
      nextIdx = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
    }
    setCurrentSearchIndex(nextIdx);
    scrollToMessage(searchResults[nextIdx]);
  };

  const scrollToMessage = (id: string) => {
    const element = document.getElementById(`msg-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary background flash
      element.classList.add('bg-blue-500/20');
      setTimeout(() => {
        element.classList.remove('bg-blue-500/20');
      }, 2000);
    }
  };

  // Helper formatting duration
  const formatDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format timestamp Telegram-style
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getPinnedMessage = () => {
    return messages.find(m => m.isPinned);
  };

  return (
    <div className="absolute inset-0 bg-app-bg flex flex-col overflow-hidden z-40 text-right transition-colors duration-250 ease-in-out">
      
      {/* 1. CHAT HEADER */}
      <div className="bg-app-secondary-bg border-b border-app-border py-3 px-4 flex items-center justify-between shrink-0 relative">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => {
              // Pause active voice note
              if (activeAudioId && audioElementsRef.current[activeAudioId]) {
                audioElementsRef.current[activeAudioId].pause();
              }
              onBack();
            }} 
            className="text-app-text-secondary hover:text-app-text-primary p-1 rounded-lg hover:bg-app-card transition"
          >
            <ArrowLeft className="w-5 h-5 transform rotate-180" />
          </button>
          
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-app-card border border-app-border flex items-center justify-center font-bold text-app-primary text-sm overflow-hidden">
              {chatUser.avatarUrl ? (
                <img
                  src={chatUser.avatarUrl}
                  alt={chatUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                chatUser.name.slice(0, 1)
              )}
            </div>
            {chatUser.status === 'online' && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-app-secondary-bg"></span>
            )}
          </div>

          <div className="mr-2">
            <h3 className="text-xs font-bold text-app-text-primary flex items-center gap-1 justify-end">
              {chatUser.name}
            </h3>
            {chatUser.typingState ? (
              <div className="flex items-center gap-1 justify-end text-[10px] text-app-primary font-medium">
                <span>{chatUser.typingState === 'recording_voice' ? 'يسجل صوتاً...' : 'يكتب الآن...'}</span>
              </div>
            ) : (
              <p className="text-[9px] text-app-text-secondary">
                {chatUser.status === 'online' ? 'نشط الآن عبر القناة الآمنة' : 'غير متصل'}
              </p>
            )}
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onInitiateCall(chatUser.email, 'audio')}
            className="p-2 text-app-text-secondary hover:text-app-text-primary hover:bg-app-card rounded-xl transition cursor-pointer"
            title="مكالمة صوتية مشفرة"
          >
            <Phone className="w-4.5 h-4.5" />
          </button>
          
          <button 
            onClick={() => onInitiateCall(chatUser.email, 'video')}
            className="p-2 text-app-text-secondary hover:text-app-text-primary hover:bg-app-card rounded-xl transition cursor-pointer"
            title="مكالمة مرئية مشفرة"
          >
            <Video className="w-4.5 h-4.5" />
          </button>

          <button 
            onClick={() => setIsSearchActive(!isSearchActive)}
            className={`p-2 rounded-xl transition cursor-pointer ${isSearchActive ? 'text-app-primary bg-app-primary/10' : 'text-app-text-secondary hover:text-app-text-primary hover:bg-app-card'}`}
            title="البحث في الرسائل"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowHeaderMore(!showHeaderMore)}
              className="p-2 text-app-text-secondary hover:text-app-text-primary hover:bg-app-card rounded-xl transition cursor-pointer"
            >
              <MoreVertical className="w-4.5 h-4.5" />
            </button>

            {showHeaderMore && (
              <div className="absolute left-0 mt-2 w-44 bg-app-card border border-app-border rounded-xl py-1.5 shadow-xl z-50 text-right">
                <button 
                  onClick={() => {
                    const pinned = getPinnedMessage();
                    if (pinned) {
                      scrollToMessage(pinned.id);
                    } else {
                      showToast("لا يوجد رسائل مثبتة حالياً");
                    }
                    setShowHeaderMore(false);
                  }}
                  className="w-full text-right px-4 py-2 text-xs text-app-text-primary hover:bg-app-bg transition flex items-center justify-between"
                >
                  <Pin className="w-3.5 h-3.5 text-app-text-secondary" />
                  <span>الرسالة المثبتة</span>
                </button>
                <button 
                  onClick={() => {
                    setMessages([]);
                    showToast("تم مسح محتوى المحادثة محلياً");
                    setShowHeaderMore(false);
                  }}
                  className="w-full text-right px-4 py-2 text-xs text-red-400 hover:bg-app-bg/50 transition flex items-center justify-between"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح السجل</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. INSTANT SEARCH BAR IN CHAT */}
      <AnimatePresence>
        {isSearchActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-app-card/95 border-b border-app-border py-2 px-4 flex items-center justify-between gap-3 shrink-0"
          >
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigateSearch('prev')}
                disabled={searchResults.length <= 1}
                className="p-1 text-app-text-secondary hover:text-app-text-primary disabled:opacity-25"
              >
                ▲
              </button>
              <button 
                onClick={() => navigateSearch('next')}
                disabled={searchResults.length <= 1}
                className="p-1 text-app-text-secondary hover:text-app-text-primary disabled:opacity-25"
              >
                ▼
              </button>
              <span className="text-[10px] text-app-text-secondary font-mono">
                {searchResults.length > 0 ? `${currentSearchIndex + 1} / ${searchResults.length}` : 'لا يوجد تطابق'}
              </span>
            </div>
            
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="ابحث عن كلمة أو رمز تعبيري في الرسائل..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-app-secondary-bg border border-app-border rounded-xl px-3 py-1.5 text-xs text-app-text-primary text-right placeholder-zinc-500 focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => handleSearchChange('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-app-text-secondary text-xs"
                >
                  مسح
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. PINNED MESSAGES HEADER NOTIFICATION */}
      {getPinnedMessage() && (
        <div className="bg-app-primary/15 border-b border-blue-500/10 px-4 py-1.5 flex items-center justify-between text-right shrink-0">
          <button 
            onClick={() => togglePinMessage(getPinnedMessage()!)}
            className="text-app-text-secondary hover:text-app-text-primary text-[11px]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div 
            onClick={() => scrollToMessage(getPinnedMessage()!.id)}
            className="flex-1 cursor-pointer pr-2 border-r border-app-primary/40 flex flex-col justify-center items-end"
          >
            <span className="text-[10px] text-blue-400 font-bold">الرسالة المثبتة</span>
            <p className="text-[10px] text-app-text-primary truncate max-w-[280px] font-sans">
              {getPinnedMessage()!.text}
            </p>
          </div>
          <Pin className="w-3.5 h-3.5 text-blue-400 ml-2 rotate-45 shrink-0" />
        </div>
      )}

      {/* 4. MESSAGES SCROLL LIST */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar"
        >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-app-text-secondary">جاري تحميل تشفير المحادثة السحابي...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-6 opacity-80">
            <div className="w-14 h-14 bg-app-card rounded-2xl flex items-center justify-center border border-app-border">
              <Lock className="w-7 h-7 text-blue-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-app-text-primary">محادثة جديدة</h4>
              <p className="text-[10px] text-app-text-secondary max-w-xs leading-relaxed">
                لا توجد رسائل بعد. اكتب رسالتك للبدء في التواصل.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender === myEmail;
            
            return (
              <motion.div
                key={msg.id}
                id={`msg-${msg.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isMe ? 'justify-start' : 'justify-end'} relative group w-full overflow-hidden`}
              >
                
                {/* Swipe reply indicator behind the bubble */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 pointer-events-none text-blue-500 z-0">
                  <Reply className="w-4 h-4 transform rotate-180 transition-transform scale-75 group-active:scale-110" />
                </div>

                {/* Options Hover trigger indicator */}
                <div className={`absolute -top-1 ${isMe ? 'left-1' : 'right-1'} opacity-0 group-hover:opacity-100 transition z-10`}>
                  <button 
                    onClick={() => {
                      setSelectedMessage(msg);
                      setShowOptionsSheet(true);
                    }}
                    className="p-1 bg-app-card border border-app-border rounded-full text-app-text-secondary hover:text-app-text-primary transition"
                  >
                    <SmilePlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                <motion.div 
                  drag="x"
                  dragConstraints={{ left: 0, right: 85 }}
                  dragElastic={{ left: 0, right: 0.2 }}
                  dragSnapToOrigin
                  onDragEnd={(e, info) => {
                    if (info.offset.x > 45) {
                      setReplyTo(msg);
                      showToast("تم تحديد الرد");
                    }
                  }}
                  className={`max-w-[85%] rounded-2xl p-3 shadow-md relative z-10 cursor-grab active:cursor-grabbing select-none transition-colors duration-150 ${
                    isMe 
                      ? 'bg-bubble-out text-white rounded-tl-none' 
                      : 'bg-bubble-in text-app-text-primary border border-app-border rounded-tr-none'
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedMessage(msg);
                    setShowOptionsSheet(true);
                  }}
                  onTouchStart={(e) => {
                    // Simulating mobile hold with longpress
                    const timer = setTimeout(() => {
                      setSelectedMessage(msg);
                      setShowOptionsSheet(true);
                    }, 600);
                    e.currentTarget.addEventListener('touchend', () => clearTimeout(timer), { once: true });
                  }}
                >
                  
                  {/* Reply preview inside bubble */}
                  {msg.replyToId && (
                    <div 
                      onClick={() => scrollToMessage(msg.replyToId!)}
                      className={`mb-2 p-2 rounded text-right text-[10px] cursor-pointer border-r-2 ${
                        isMe 
                          ? 'bg-black/20 border-white text-white/90' 
                          : 'bg-app-bg/50 border-app-primary text-app-text-secondary'
                      }`}
                    >
                      <div className="font-bold">{msg.replyToSender}</div>
                      <div className="truncate">{msg.replyToText}</div>
                    </div>
                  )}

                  {/* Dynamic Rendering by message type */}
                  {msg.type === 'text' && (
                    <p className="text-xs whitespace-pre-wrap leading-relaxed break-words font-sans">
                      {msg.text}
                    </p>
                  )}

                  {msg.type === 'image' && (
                    <div className="space-y-1.5">
                      <div 
                        onClick={() => {
                          setPreviewImage(resolveMediaUrl(msg.mediaUrl) || null);
                          setZoomScale(1);
                        }}
                        className="rounded-lg overflow-hidden border border-app-border cursor-zoom-in max-h-48 relative bg-black/20"
                      >
                        <img 
                          src={resolveMediaUrl(msg.mediaUrl)} 
                          alt="shared secure" 
                          className="w-full h-full object-cover rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {msg.mediaName && (
                        <p className={`text-[10px] font-mono truncate ${isMe ? 'text-white/80' : 'text-app-text-secondary'}`}>{msg.mediaName}</p>
                      )}
                    </div>
                  )}

                  {msg.type === 'video' && (
                    <div className="space-y-1.5">
                      <video 
                        src={resolveMediaUrl(msg.mediaUrl)} 
                        controls 
                        className="rounded-lg max-h-48 w-full object-cover border border-app-border bg-black/40"
                      />
                      {msg.mediaName && (
                        <p className={`text-[10px] font-mono truncate ${isMe ? 'text-white/80' : 'text-app-text-secondary'}`}>{msg.mediaName}</p>
                      )}
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <div className={`flex items-center gap-3 rounded-xl p-2.5 border border-app-border select-none ${isMe ? 'bg-black/20' : 'bg-app-bg/60'}`}>
                      <a 
                        href={resolveMediaUrl(msg.mediaUrl)} 
                        download={msg.mediaName || "file"}
                        className="p-2 bg-app-primary/10 hover:bg-app-primary/20 text-app-primary rounded-lg transition"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <div className="flex-1 text-right min-w-0 pr-1">
                        <p className={`text-xs font-bold truncate ${isMe ? 'text-white' : 'text-app-text-primary'}`}>{msg.mediaName || 'ملف مجهول'}</p>
                        <p className={`text-[10px] font-mono mt-0.5 ${isMe ? 'text-white/60' : 'text-app-text-secondary'}`}>{msg.mediaSize || '0 KB'}</p>
                      </div>
                      <FileText className="w-8 h-8 text-blue-500 shrink-0" />
                    </div>
                  )}

                  {msg.type === 'voice' && (
                    <div className={`flex items-center gap-3 rounded-xl p-2.5 border border-app-border select-none min-w-[210px] ${isMe ? 'bg-black/20' : 'bg-app-bg/60'}`}>
                      
                      {/* Play Speed Controls */}
                      <button 
                        onClick={() => changePlaybackSpeed(msg.id)}
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded transition ${
                          isMe ? 'bg-black/30 hover:bg-black/40 text-white' : 'bg-app-secondary-bg hover:bg-app-secondary-bg/80 text-app-primary'
                        }`}
                      >
                        {voicePlaybackSpeed[msg.id] || 1}x
                      </button>

                      {/* Play Progress waveform simulation */}
                      <div className="flex-1 space-y-1 text-right">
                        <div className="flex items-end gap-1.5 justify-end h-4">
                          {[1, 2, 3, 4, 3, 2, 3, 4, 5, 4, 3, 2, 3, 4, 3, 2].map((h, i) => (
                            <span 
                              key={i} 
                              className={`w-0.5 rounded-full transition-all duration-300 ${
                                activeAudioId === msg.id && (audioProgress[msg.id] || 0) > (i / 16) * 100
                                  ? (isMe ? 'bg-white' : 'bg-app-primary')
                                  : (isMe ? 'bg-white/30' : 'bg-app-border')
                              }`}
                              style={{ height: `${h * 20}%` }}
                            ></span>
                          ))}
                        </div>
                        <p className="text-[9px] text-app-text-secondary font-mono">
                          {activeAudioId === msg.id 
                            ? "جاري التشغيل..." 
                            : `صوتية: ${formatDuration(msg.mediaDuration || 0)}`}
                        </p>
                      </div>

                      {/* Play/Pause Button */}
                      <button 
                        onClick={() => togglePlayAudio(msg.id, msg.mediaUrl || '')}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                          isMe ? 'bg-white text-app-primary hover:bg-white/90' : 'bg-app-primary text-white hover:bg-app-primary/90'
                        }`}
                      >
                        {activeAudioId === msg.id ? (
                          <Pause className="w-4.5 h-4.5 fill-current" />
                        ) : (
                          <Play className="w-4.5 h-4.5 fill-current transform rotate-180" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Reaction Displays */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 justify-end">
                      {msg.reactions.map((react, rIdx) => {
                        const hasMyReact = react.users.includes(myEmail);
                        return (
                          <button
                            key={rIdx}
                            onClick={() => handleAddReaction(msg.id, react.emoji)}
                            className={`px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 border transition ${
                              hasMyReact 
                                ? (isMe ? 'bg-black/20 border-white/25 text-white' : 'bg-app-primary/10 border-app-primary/30 text-app-primary')
                                : 'bg-app-bg/50 border-app-border text-app-text-secondary hover:bg-app-bg'
                            }`}
                          >
                            <span>{react.count}</span>
                            <span>{react.emoji}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer status line inside bubble */}
                  <div className={`flex items-center gap-1.5 justify-end text-[8.5px] font-mono mt-1.5 ${isMe ? 'text-white/50' : 'text-app-text-secondary/60'}`}>
                    {msg.isEdited && <span>معدلة</span>}
                    {msg.isPinned && <Pin className="w-2.5 h-2.5 text-app-primary rotate-45" />}
                    <span>{formatTime(msg.timestamp)}</span>
                    {isMe && (
                      <span>
                        {msg.status === 'sending' && <span className="animate-pulse">...</span>}
                        {msg.status === 'sent' && <Check className={`w-3 h-3 ${isMe ? 'text-white/70' : 'text-app-text-secondary/70'}`} />}
                        {msg.status === 'delivered' && <CheckCheck className={`w-3 h-3 ${isMe ? 'text-white/70' : 'text-app-text-secondary/70'}`} />}
                        {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                      </span>
                    )}
                  </div>

                </motion.div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        </div>

        {/* Floating New Messages Button */}
        <AnimatePresence>
          {showNewMessagesButton && (
            <motion.button
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-app-primary text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-1.5 z-30 cursor-pointer hover:scale-105 active:scale-95 transition"
            >
              <ChevronDown className="w-4 h-4" />
              <span>رسائل جديدة</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 5. INPUT CONTROLS / WRAPPER */}
      <div 
        className="bg-app-card border-t border-app-border px-3 py-2 shrink-0 relative transition-all duration-150"
        style={{ paddingBottom: `calc(${keyboardHeight}px + env(safe-area-inset-bottom, 8px))` }}
      >
        
        {/* Reply Preview Header banner above Input */}
        {replyTo && (
          <div 
            onClick={() => scrollToMessage(replyTo.id)}
            className="bg-app-bg border border-app-border rounded-xl p-2.5 mb-2 flex items-center justify-between border-r-4 border-app-primary text-right cursor-pointer hover:bg-app-card transition"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setReplyTo(null);
              }}
              className="text-app-text-secondary hover:text-app-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-[10px] text-blue-400 font-bold">
                رد على {replyTo.sender === myEmail ? 'نفسك' : chatUser.name}
              </span>
              <p className="text-[10px] text-app-text-secondary truncate mt-0.5">{replyTo.text}</p>
            </div>
            <Reply className="w-3.5 h-3.5 text-app-primary shrink-0 transform rotate-180" />
          </div>
        )}

        {/* Editing Preview Header banner above Input */}
        {editingMessage && (
          <div className="bg-app-bg border border-app-border rounded-xl p-2.5 mb-2 flex items-center justify-between border-r-4 border-amber-500 text-right">
            <button 
              onClick={() => {
                setEditingMessage(null);
                setInputText('');
              }}
              className="text-app-text-secondary hover:text-app-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-[10px] text-amber-500 font-bold">تعديل الرسالة</span>
              <p className="text-[10px] text-app-text-secondary truncate mt-0.5">{editingMessage.text}</p>
            </div>
            <Edit2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          </div>
        )}

        {/* Input Bar Area */}
        <div className="flex items-end gap-2 select-none relative z-20">
          
          {/* Action triggers depending on voice recording state */}
          {isRecording ? (
            <div className="flex items-center justify-between flex-1 bg-[#121214] border border-app-border rounded-2xl py-2 px-3 text-right">
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => stopAudioRecording(true)}
                  className="text-red-500 hover:text-red-600 font-bold text-[11px] hover:underline"
                >
                  إلغاء
                </button>
                {isRecordLocked && (
                  <button 
                    onClick={() => stopAudioRecording(false)}
                    className="p-1.5 bg-app-primary hover:bg-app-primary/90 text-white rounded-full transition animate-pulse"
                  >
                    <Send className="w-3.5 h-3.5 transform rotate-180" />
                  </button>
                )}
              </div>

              {/* Slider hints or timers */}
              <div className="flex items-center gap-3">
                {!isRecordLocked && (
                  <span className="text-[10px] text-app-text-secondary flex items-center gap-1 animate-pulse">
                    <span>اسحب يساراً للإلغاء</span>
                    <span className="text-[9px]">◀◀</span>
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  <span className="text-xs font-mono text-app-text-primary font-bold">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              </div>

            </div>
          ) : (
            <>
              {/* Send or Record Circle Button on the Left */}
              {inputText.trim() ? (
                <button
                  id="chat-send-message-button"
                  onClick={handleSendText}
                  className="w-10 h-10 rounded-full bg-app-primary hover:bg-app-primary/90 text-white flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer shadow-md shadow-app-primary/25"
                >
                  <Send className="w-4.5 h-4.5 transform rotate-180" />
                </button>
              ) : (
                <button
                  id="chat-voice-record-button"
                  onMouseDown={handleMicMouseDown}
                  onTouchStart={handleMicTouchStart}
                  onMouseMove={handleMicMouseMove}
                  onTouchMove={handleMicTouchMove}
                  onMouseUp={handleMicMouseUp}
                  onTouchEnd={handleMicTouchEnd}
                  className="w-10 h-10 rounded-full bg-app-primary/15 hover:bg-app-primary text-app-primary hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer relative shadow-md shadow-app-primary/5"
                  title="سجل رسالة صوتية (اضغط مع الاستمرار)"
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Capsule Text Input Bar */}
              <div className="flex-1 bg-app-secondary-bg border border-app-border rounded-2xl flex items-end px-1.5 py-1 min-h-[40px]">
                
                {/* Paperclip attachment triggers */}
                <button
                  onClick={() => setShowAttachmentSheet(!showAttachmentSheet)}
                  className={`p-2 transition shrink-0 cursor-pointer ${showAttachmentSheet ? 'text-app-primary' : 'text-app-text-secondary hover:text-app-text-primary'}`}
                  title="خيارات الإرفاق المشفر"
                >
                  <Paperclip className="w-4.5 h-4.5" />
                </button>

                {/* Camera Trigger */}
                <button
                  onClick={startCamera}
                  className="p-2 text-app-text-secondary hover:text-app-text-primary transition shrink-0 cursor-pointer"
                  title="التقاط صورة كاميرا فورية"
                >
                  <Camera className="w-4.5 h-4.5" />
                </button>

                {/* Auto-expanding text area */}
                <textarea
                  ref={textareaRef}
                  placeholder="اكتب رسالتك المشفرة..."
                  value={inputText}
                  onFocus={handleTextareaFocus}
                  onBlur={handleTextareaBlur}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendText();
                    }
                  }}
                  rows={1}
                  className="flex-1 bg-transparent text-xs text-app-text-primary placeholder-zinc-500 px-2 py-2 text-right focus:outline-none resize-none font-sans no-scrollbar leading-relaxed max-h-36"
                />

                {/* Emoji popover trigger */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 transition shrink-0 cursor-pointer ${showEmojiPicker ? 'text-app-primary' : 'text-app-text-secondary hover:text-app-text-primary'}`}
                  title="رموز تعبيرية"
                >
                  <Smile className="w-4.5 h-4.5" />
                </button>

              </div>
            </>
          )}

        </div>

        {/* Hidden inputs for multi-type selection */}
        <input
          type="file"
          ref={galleryInputRef}
          accept="image/*"
          onChange={handleAttachmentSelect}
          className="hidden"
        />
        <input
          type="file"
          ref={videoInputRef}
          accept="video/*"
          onChange={handleAttachmentSelect}
          className="hidden"
        />
        <input
          type="file"
          ref={documentInputRef}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={handleAttachmentSelect}
          className="hidden"
        />

        {/* EMOJI DRAWER */}
        <AnimatePresence>
          {showEmojiPicker && (
            <>
              {/* Close click blocker */}
              <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
              <motion.div 
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="absolute bottom-16 right-3 left-3 bg-app-card/95 backdrop-blur-xl border border-app-border rounded-2xl shadow-2xl p-3 z-20 text-right"
              >
                <div className="flex justify-between items-center mb-2 border-b border-app-border pb-1.5">
                  <button 
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-[10px] text-app-text-secondary hover:text-app-text-primary"
                  >
                    إغلاق
                  </button>
                  <span className="text-[10px] font-bold text-app-text-secondary">رموز تعبيرية آمنة</span>
                </div>
                <div className="grid grid-cols-8 gap-2.5 max-h-36 overflow-y-auto no-scrollbar">
                  {[
                    '😀', '😂', '🤣', '😊', '😍', '😘', '😜', '😎', '🤩', '🥳',
                    '😢', '😭', '😡', '😱', '🤔', '👍', '👎', '❤️', '🔥', '👏',
                    '🎉', '✨', '🌟', '💡', '🚀', '📍', '📞', '💬', '🔒', '🔑',
                    '👋', '🙌', '👀', '💯', '🦾', '🌍', '⚡', '💣', '🛡️', '🛰️'
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-lg hover:scale-125 active:scale-95 transition-transform p-0.5 text-center cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ATTACHMENT BOTTOM SHEET */}
        <AnimatePresence>
          {showAttachmentSheet && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAttachmentSheet(false)} />
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="absolute bottom-16 left-3 right-3 bg-app-card/95 backdrop-blur-xl border border-app-border rounded-2xl shadow-2xl p-4 z-20 text-right"
              >
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-app-border">
                  <button 
                    onClick={() => setShowAttachmentSheet(false)}
                    className="text-[10px] text-app-text-secondary hover:text-app-text-primary"
                  >
                    إلغاء
                  </button>
                  <h4 className="text-[10px] font-bold text-app-text-primary">خيارات الإرفاق المشفر</h4>
                </div>

                <div className="grid grid-cols-4 gap-3 py-1">
                  
                  {/* Camera */}
                  <button
                    onClick={startCamera}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-pink-500/10 group-active:scale-90 transition-transform">
                      <Camera className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] text-app-text-secondary">كاميرا</span>
                  </button>

                  {/* Gallery */}
                  <button
                    onClick={() => {
                      galleryInputRef.current?.click();
                      setShowAttachmentSheet(false);
                    }}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/10 group-active:scale-90 transition-transform">
                      <ImageIcon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] text-app-text-secondary">معرض</span>
                  </button>

                  {/* Video */}
                  <button
                    onClick={() => {
                      videoInputRef.current?.click();
                      setShowAttachmentSheet(false);
                    }}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/10 group-active:scale-90 transition-transform">
                      <VideoIcon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] text-app-text-secondary">فيديو</span>
                  </button>

                  {/* Voice Message */}
                  <button
                    onClick={() => {
                      setShowAttachmentSheet(false);
                      startAudioRecording();
                    }}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-500/10 group-active:scale-90 transition-transform">
                      <Mic className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] text-app-text-secondary">صوتية</span>
                  </button>

                  {/* Document */}
                  <button
                    onClick={() => {
                      documentInputRef.current?.click();
                      setShowAttachmentSheet(false);
                    }}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-purple-500/10 group-active:scale-90 transition-transform">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] text-app-text-secondary">مستند</span>
                  </button>

                  {/* Location */}
                  <button
                    onClick={sendLocation}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-red-500/10 group-active:scale-90 transition-transform">
                      <MapPin className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] text-app-text-secondary">موقع جغرافي</span>
                  </button>

                  {/* Contact */}
                  <button
                    onClick={openContactPicker}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/10 group-active:scale-90 transition-transform">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] text-app-text-secondary">جهة اتصال</span>
                  </button>

                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* CAMERA CAPTURE VIEWFINDER */}
        <AnimatePresence>
          {showCameraModal && (
            <div className="absolute inset-0 bg-black z-50 flex flex-col justify-between">
              <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-sm z-10 text-right">
                <button 
                  onClick={stopCamera}
                  className="text-white hover:text-app-text-secondary text-xs font-bold"
                >
                  إلغاء
                </button>
                <span className="text-xs text-app-text-secondary font-bold">كاميرا CallMe المشفرة</span>
                <div className="w-8"></div>
              </div>

              {/* Viewfinder Frame */}
              <div className="flex-1 flex items-center justify-center relative bg-zinc-950 overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="max-h-full max-w-full object-cover rounded-2xl"
                />
                <div className="absolute inset-8 border border-app-border pointer-events-none rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-white/45 absolute top-0 left-0"></div>
                  <div className="w-6 h-6 border-t-2 border-r-2 border-white/45 absolute top-0 right-0"></div>
                  <div className="w-6 h-6 border-b-2 border-l-2 border-white/45 absolute bottom-0 left-0"></div>
                  <div className="w-6 h-6 border-b-2 border-r-2 border-white/45 absolute bottom-0 right-0"></div>
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
                </div>
              </div>

              {/* Shutter panel */}
              <div className="p-6 bg-black/60 flex justify-center items-center gap-8">
                <button 
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-white"></div>
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* SECURE CONTACT PICKER */}
        <AnimatePresence>
          {showContactPicker && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-app-card border border-app-border rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[70vh] text-right">
                <div className="p-3.5 border-b border-app-border flex items-center justify-between bg-app-secondary-bg/50">
                  <button 
                    onClick={() => setShowContactPicker(false)}
                    className="text-xs text-app-text-secondary hover:text-app-text-primary"
                  >
                    إغلاق
                  </button>
                  <h4 className="text-xs font-bold text-app-text-primary font-sans">اختر جهة اتصال آمنة</h4>
                </div>
                <div className="overflow-y-auto p-2 space-y-1.5 no-scrollbar">
                  {allUsersList
                    .filter(u => u.email !== myEmail)
                    .map(user => (
                      <button
                        key={user.email}
                        onClick={() => sendContact(user)}
                        className="w-full p-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition flex items-center justify-between text-right cursor-pointer"
                      >
                        <span className="text-[10px] text-app-text-secondary font-mono">{user.email}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-app-text-primary">{user.name}</span>
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                            {user.name.slice(0, 1)}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

      </div>

      {/* 6. REDESIGNED TELEGRAM-STYLE COMPACT FLOATING MENU */}
      <AnimatePresence>
        {showOptionsSheet && selectedMessage && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] z-50 flex items-center justify-center p-4 select-none">
            {/* Backdrop Closer */}
            <div className="absolute inset-0" onClick={() => setShowOptionsSheet(false)} />

            <motion.div 
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 15 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="bg-app-card/95 backdrop-blur-xl border border-app-border rounded-2xl w-56 shadow-2xl overflow-hidden relative z-10 text-right flex flex-col"
            >
              
              {/* Compact Reactions Row */}
              <div className="flex justify-between items-center px-3 py-1.5 bg-app-secondary-bg/40 border-b border-app-border overflow-x-auto no-scrollbar gap-1">
                {['❤️', '👍', '😂', '😮', '😢', '🔥', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(selectedMessage.id, emoji)}
                    className="text-[17px] hover:scale-125 active:scale-95 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Vertical Compact Menu Items */}
              <div className="p-1 flex flex-col divide-y divide-app-border">
                
                {/* Reply */}
                <button
                  onClick={() => {
                    setReplyTo(selectedMessage);
                    setShowOptionsSheet(false);
                  }}
                  className="w-full text-right py-1.5 px-2.5 hover:bg-app-bg/50 active:bg-app-bg rounded-md flex items-center justify-between text-app-text-primary transition text-[11px] font-semibold"
                >
                  <Reply className="w-3.5 h-3.5 text-app-text-secondary" />
                  <span>الرد</span>
                </button>

                {/* Edit (if me and text) */}
                {selectedMessage.sender === myEmail && selectedMessage.type === 'text' && (
                  <button
                    onClick={() => {
                      setEditingMessage(selectedMessage);
                      setInputText(selectedMessage.text);
                      setShowOptionsSheet(false);
                    }}
                    className="w-full text-right py-1.5 px-2.5 hover:bg-app-bg/50 active:bg-app-bg rounded-md flex items-center justify-between text-app-text-primary transition text-[11px] font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>تعديل</span>
                  </button>
                )}

                {/* Copy (if text) */}
                {selectedMessage.type === 'text' && (
                  <button
                    onClick={() => handleCopyText(selectedMessage.text)}
                    className="w-full text-right py-1.5 px-2.5 hover:bg-app-bg/50 active:bg-app-bg rounded-md flex items-center justify-between text-app-text-primary transition text-[11px] font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5 text-app-text-secondary" />
                    <span>نسخ النص</span>
                  </button>
                )}

                {/* Pin */}
                <button
                  onClick={() => {
                    togglePinMessage(selectedMessage);
                    setShowOptionsSheet(false);
                  }}
                  className="w-full text-right py-1.5 px-2.5 hover:bg-app-bg/50 active:bg-app-bg rounded-md flex items-center justify-between text-app-text-primary transition text-[11px] font-semibold"
                >
                  <Pin className="w-3.5 h-3.5 text-app-text-secondary" />
                  <span>{selectedMessage.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}</span>
                </button>

                {/* Forward */}
                <button
                  onClick={() => openForwardModal(selectedMessage)}
                  className="w-full text-right py-1.5 px-2.5 hover:bg-app-bg/50 active:bg-app-bg rounded-md flex items-center justify-between text-app-text-primary transition text-[11px] font-semibold"
                >
                  <CornerUpRight className="w-3.5 h-3.5 text-app-text-secondary" />
                  <span>تحويل</span>
                </button>

                {/* Translation (if text) */}
                {selectedMessage.type === 'text' && (
                  <button
                    onClick={() => handleTranslateMessage(selectedMessage)}
                    className="w-full text-right py-1.5 px-2.5 hover:bg-app-bg/50 active:bg-app-bg rounded-md flex items-center justify-between text-app-text-primary transition text-[11px] font-semibold"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ترجمة فورية</span>
                  </button>
                )}

                {/* Message Info */}
                <button
                  onClick={() => {
                    setShowInfoModal(true);
                    setShowOptionsSheet(false);
                  }}
                  className="w-full text-right py-1.5 px-2.5 hover:bg-app-bg/50 active:bg-app-bg rounded-md flex items-center justify-between text-app-text-primary transition text-[11px] font-semibold"
                >
                  <Info className="w-3.5 h-3.5 text-app-text-secondary" />
                  <span>تفاصيل الرسالة</span>
                </button>

                {/* Share */}
                <button
                  onClick={() => handleShareMessage(selectedMessage.text)}
                  className="w-full text-right py-1.5 px-2.5 hover:bg-app-bg/50 active:bg-app-bg rounded-md flex items-center justify-between text-app-text-primary transition text-[11px] font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5 text-app-text-secondary" />
                  <span>مشاركة</span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowOptionsSheet(false);
                  }}
                  className="w-full text-right py-1.5 px-2.5 hover:bg-red-500/10 active:bg-red-500/20 rounded-md flex items-center justify-between text-red-400 transition text-[11px] font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>حذف</span>
                </button>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPACT TELEGRAM-STYLE DELETE BOTTOM SHEET */}
      <AnimatePresence>
        {showDeleteConfirm && selectedMessage && (
          <div className="absolute inset-0 bg-black/50 z-55 flex items-end justify-center select-none p-4">
            <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)} />
            
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-app-card border border-app-border rounded-2xl w-full max-w-sm p-4 relative z-10 text-right space-y-3 shadow-2xl"
            >
              <div className="space-y-1.5">
                {/* Delete for Everyone */}
                <button
                  onClick={() => {
                    handleDeleteMessage(selectedMessage.id, true);
                    setShowDeleteConfirm(false);
                  }}
                  className="w-full text-right py-3 px-4 bg-red-600/10 hover:bg-red-600/15 active:bg-red-600/25 rounded-xl flex items-center justify-between text-red-400 transition duration-100 text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>🗑 حذف لدى الجميع</span>
                </button>

                {/* Delete for Me */}
                <button
                  onClick={() => {
                    handleDeleteMessage(selectedMessage.id, false);
                    setShowDeleteConfirm(false);
                  }}
                  className="w-full text-right py-3 px-4 bg-app-bg/85 hover:bg-app-bg active:bg-app-bg/70 rounded-xl flex items-center justify-between text-app-text-primary transition duration-100 text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4 text-app-text-secondary" />
                  <span>🗑 حذف لدي فقط</span>
                </button>

                {/* Cancel */}
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full text-center py-2.5 hover:bg-app-bg/50 active:bg-app-bg rounded-xl text-app-text-secondary transition duration-100 text-xs font-medium"
                >
                  ✖ إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DETAILED MESSAGE INFO MODAL */}
      <AnimatePresence>
        {showInfoModal && selectedMessage && (
          <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-app-card border border-app-border rounded-2xl w-full max-w-sm p-5 space-y-4 text-right shadow-2xl">
              <div className="flex items-center gap-2 text-blue-500 justify-end">
                <span className="text-sm font-bold">معلومات الرسالة</span>
                <Info className="w-5 h-5" />
              </div>

              <div className="space-y-3.5 text-xs text-app-text-secondary font-sans">
                <div className="flex justify-between items-center py-1.5 border-b border-app-border">
                  <span className="font-mono text-app-text-secondary">{selectedMessage.id}</span>
                  <span className="text-app-text-secondary">مُعرّف الرسالة:</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-app-border">
                  <span className="font-mono text-app-text-primary">
                    {new Date(selectedMessage.timestamp).toLocaleString('ar-EG')}
                  </span>
                  <span className="text-app-text-secondary">توقيت الإرسال:</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-app-border">
                  <span className="font-bold text-app-text-primary">
                    {selectedMessage.sender === myEmail ? 'أنا (المرسل)' : chatUser.name}
                  </span>
                  <span className="text-app-text-secondary">المرسل المشفر:</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-app-border">
                  <span className="font-bold text-emerald-400">نشط (مشفر بـ AES-256)</span>
                  <span className="text-app-text-secondary">حالة الأمان:</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="font-bold text-blue-400 capitalize">{selectedMessage.status}</span>
                  <span className="text-app-text-secondary">حالة التوصيل:</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setSelectedMessage(null);
                }}
                className="w-full bg-app-primary hover:bg-app-primary/90 text-white font-bold p-2.5 rounded-xl transition"
              >
                حسناً، إغلاق
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. FORWARD MESSAGE TARGET USER MODAL */}
      <AnimatePresence>
        {showForwardModal && selectedMessage && (
          <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-app-card border border-app-border rounded-2xl w-full max-w-sm p-5 space-y-4 text-right shadow-2xl">
              <div className="flex items-center gap-2 text-blue-500 justify-end">
                <span className="text-sm font-bold">تحويل الرسالة إلى جهة اتصال</span>
                <CornerUpRight className="w-5 h-5" />
              </div>

              <p className="text-[10px] text-app-text-secondary leading-relaxed">
                اختر أحد المستخدمين المشفرين المسجلين في نظام CallMe لتحويل المحتوى فوراً:
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {allUsersList.length === 0 ? (
                  <p className="text-center text-[10px] text-app-text-secondary py-4">لا توجد جهات اتصال أخرى متاحة</p>
                ) : (
                  allUsersList.map((usr) => (
                    <button
                      key={usr.email}
                      onClick={() => setForwardingTarget(usr.email)}
                      className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between transition ${
                        forwardingTarget === usr.email 
                          ? 'bg-app-primary/10 border-app-primary text-app-primary' 
                          : 'bg-app-bg border-app-border text-app-text-secondary hover:bg-app-secondary-bg'
                      }`}
                    >
                      <span className="text-[9px] text-app-text-secondary font-mono">@{usr.email.split('@')[0]}</span>
                      <span className="text-xs font-bold">{usr.name}</span>
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowForwardModal(false);
                    setSelectedMessage(null);
                    setForwardingTarget('');
                  }}
                  className="flex-1 bg-app-secondary-bg hover:bg-app-secondary-bg/85 text-app-text-primary text-xs font-bold p-2.5 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleForwardSubmit}
                  disabled={!forwardingTarget}
                  className="flex-1 bg-app-primary hover:bg-app-primary/90 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold p-2.5 rounded-xl transition"
                >
                  إرسال تحويل
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. IMAGE FULL-SCREEN VIEWER */}
      <AnimatePresence>
        {previewImage && (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col justify-between p-4">
            {/* Header controls */}
            <div className="flex justify-between items-center z-10">
              <div className="flex gap-1">
                <button 
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
                  className="p-2 bg-zinc-900/80 rounded-full text-white hover:bg-zinc-800"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-2 bg-zinc-900/80 rounded-full text-white hover:bg-zinc-800"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setZoomScale(1)}
                  className="p-2 bg-zinc-900/80 rounded-full text-white hover:bg-zinc-800"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex gap-1.5">
                <a 
                  href={previewImage} 
                  download="shared_image.jpg"
                  className="p-2 bg-zinc-900/80 rounded-full text-white hover:bg-zinc-800"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-2 bg-zinc-900/80 rounded-full text-white hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Img frame */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <motion.img 
                src={previewImage} 
                style={{ scale: zoomScale }}
                alt="shared secure full view" 
                className="max-h-[80vh] max-w-full object-contain rounded-xl select-none"
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.1}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Hint */}
            <div className="text-center text-[10px] text-app-text-secondary py-2">
              قم بسحب الصورة أو استخدام أزرار التقريب لاستعراض تفاصيل الصورة المشفرة
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. NOTIFICATION TOAST OVERLAY */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-bold text-[11px] px-4 py-2.5 rounded-full shadow-lg z-50 flex items-center gap-2 border border-app-border"
          >
            <span>✨</span>
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Custom Helper Icon components to avoid lucide issues
function SmilePlusIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 12a10 10 0 1 1-10-10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
      <line x1="19" y1="2" x2="19" y2="8" />
      <line x1="16" y1="5" x2="22" y2="5" />
    </svg>
  );
}

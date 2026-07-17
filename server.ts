import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendFCMNotification, initializeFirebaseAdmin } from "./src/utils/firebaseAdmin.js";
import {
  connectDB,
  User,
  Message,
  CallSession,
  CallLog,
  Story,
  Admin,
  AdminSession,
  SystemReport,
  AdminLoginLog,
  AuditLog,
  SecurityEvent,
  AdminSettings
} from "./src/models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UserInterface {
  email: string;
  password?: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen: number;
  bio?: string;
  phone?: string;
  username?: string;
  typingState?: 'typing' | 'recording_voice' | null;
  typingTarget?: string;
  role?: 'admin' | 'user';
}

interface CallSessionInterface {
  id: string;
  caller: string;
  callee: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  offer?: any;
  answer?: any;
  callerCandidates: any[];
  calleeCandidates: any[];
  createdAt: number;
}

interface CallLogInterface {
  id: string;
  caller: string;
  callerName: string;
  callee: string;
  calleeName: string;
  type: 'audio' | 'video';
  status: 'missed' | 'completed' | 'rejected';
  timestamp: number;
  duration?: number; // in seconds
}

interface MessageReactionInterface {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageInterface {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'voice' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  mediaDuration?: number;
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
  isEdited?: boolean;
  isPinned?: boolean;
  reactions?: MessageReactionInterface[];
}

interface StoryInterface {
  id: string;
  email: string;
  name: string;
  mediaUrl: string;
  text?: string;
  timestamp: number;
  viewers: string[];
}

interface AdminInterface {
  username: string;
  passwordHash: string;
  role: 'admin' | 'super_admin' | 'moderator';
  status: 'active' | 'suspended';
  createdAt: number;
}

interface SystemReportInterface {
  id: string;
  reporter: string;
  reportedUser: string;
  reason: string;
  status: 'pending' | 'solved';
  createdAt: number;
}

interface AdminLoginLogInterface {
  id: string;
  username: string;
  ip: string;
  device: string;
  timestamp: number;
  success: boolean;
}

interface AuditLogInterface {
  id: string;
  adminUsername: string;
  action: string;
  details: string;
  timestamp: number;
}

interface SecurityEventInterface {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'banned_user' | 'settings_changed';
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
}

async function seedDatabase() {
  // 1. Seed Admin "anas" with password "2000" (hashed using bcrypt)
  const adminExists = await Admin.findOne({ username: "anas" });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash("2000", 12);
    await Admin.create({
      username: "anas",
      passwordHash,
      role: 'admin',
      status: 'active',
      createdAt: Date.now()
    });
    console.log("Seeded admin 'anas'");
  }

  // 2. Seed Users
  const usersToSeed = [
    {
      email: "ahmed@callme.com",
      password: "password123",
      name: "أحمد علي",
      status: "online",
      lastSeen: Date.now(),
      bio: "الخصوصية هي الأولوية دائمًا 🔒",
      username: "ahmed_ali",
      phone: "+966501234567",
      role: "user"
    },
    {
      email: "sara@callme.com",
      password: "password123",
      name: "سارة فوزي",
      status: "online",
      lastSeen: Date.now(),
      bio: "أحب الموسيقى والاتصال الآمن 🎵",
      username: "sara_f",
      phone: "+966507654321",
      role: "user"
    },
    {
      email: "khalid@callme.com",
      password: "password123",
      name: "خالد عبد الله",
      status: "offline",
      lastSeen: Date.now() - 3600000 * 12,
      bio: "الخط العربي فن وحياة ✍️",
      username: "khalid_art",
      phone: "+966555555555",
      role: "user"
    },
    {
      email: "nour@callme.com",
      password: "password123",
      name: "نور الهدى",
      status: "offline",
      lastSeen: Date.now() - 3600000 * 2,
      bio: "مهندسة برمجيات شغوفة بالحماية والخصوصية",
      username: "nour_tech",
      phone: "+966512345678",
      role: "user"
    },
    {
      email: "spammer@callme.com",
      password: "password123",
      name: "مستخدم عشوائي",
      status: "offline",
      lastSeen: Date.now() - 86400000,
      bio: "[موقوف] تم حظر هذا الحساب من قبل الإدارة لانتهاك السياسات.",
      username: "spammer_bot",
      phone: "+966588888888",
      role: "user"
    }
  ];

  for (const u of usersToSeed) {
    const userExists = await User.findOne({ email: u.email });
    if (!userExists) {
      const hashedPassword = await bcrypt.hash(u.password, 12);
      await User.create({
        ...u,
        status: u.status as "online" | "offline" | "busy",
        role: u.role as "admin" | "user",
        password: hashedPassword
      });
      console.log(`Seeded user ${u.email}`);
    }
  }

  // 3. Seed Admin Settings
  const settingsCount = await AdminSettings.countDocuments();
  if (settingsCount === 0) {
    await AdminSettings.create({
      appName: "CallMe",
      appVersion: "1.4.0",
      maintenanceMode: false,
      maxUploadSize: 50,
      storageProvider: "ImageKit",
      privacyLevel: "Strict Peer-to-Peer"
    });
    console.log("Seeded Admin Settings");
  }

  // 4. Seed Messages
  const messagesCount = await Message.countDocuments();
  if (messagesCount === 0) {
    const messagesToSeed = [
      {
        id: "msg_seed1",
        sender: "ahmed@callme.com",
        receiver: "sara@callme.com",
        text: "أهلاً سارة، كيف تسير الأمور؟",
        timestamp: Date.now() - 3600000 * 2,
        status: "read",
        type: "text",
        reactions: []
      },
      {
        id: "msg_seed2",
        sender: "sara@callme.com",
        receiver: "ahmed@callme.com",
        text: "مرحباً أحمد! كل شيء ممتاز هنا والتطبيق يعمل بشكل آمن وسريع جداً.",
        timestamp: Date.now() - 3600000,
        status: "read",
        type: "text",
        reactions: []
      },
      {
        id: "msg_seed3",
        sender: "ahmed@callme.com",
        receiver: "sara@callme.com",
        text: "ممتاز، هل قمتي بتجربة ميزة مكالمات الفيديو نظير إلى نظير؟",
        timestamp: Date.now() - 1800000,
        status: "read",
        type: "text",
        reactions: []
      }
    ];
    await Message.insertMany(messagesToSeed);
    console.log("Seeded initial messages");
  }

  // 5. Seed Call Logs
  const callLogsCount = await CallLog.countDocuments();
  if (callLogsCount === 0) {
    const logsToSeed = [
      {
        id: "call_seed1",
        caller: "ahmed@callme.com",
        callerName: "أحمد علي",
        callee: "sara@callme.com",
        calleeName: "سارة فوزي",
        type: "video",
        status: "completed",
        timestamp: Date.now() - 7200000,
        duration: 125
      },
      {
        id: "call_seed2",
        caller: "sara@callme.com",
        callerName: "سارة فوزي",
        callee: "ahmed@callme.com",
        calleeName: "أحمد علي",
        type: "audio",
        status: "missed",
        timestamp: Date.now() - 18000000,
        duration: 0
      }
    ];
    await CallLog.insertMany(logsToSeed);
    console.log("Seeded initial call logs");
  }

  // 6. Seed System Reports
  const reportsCount = await SystemReport.countDocuments();
  if (reportsCount === 0) {
    const reportsToSeed = [
      {
        id: "rep_1",
        reporter: "sara@callme.com",
        reportedUser: "spammer@callme.com",
        reason: "محتوى غير لائق ومزعج متكرر",
        status: "pending",
        createdAt: Date.now() - 3600000 * 5
      },
      {
        id: "rep_2",
        reporter: "ahmed@callme.com",
        reportedUser: "spammer@callme.com",
        reason: "حساب آلي يقوم بإرسال روابط عشوائية إعلانية",
        status: "solved",
        createdAt: Date.now() - 3600000 * 20
      }
    ];
    await SystemReport.insertMany(reportsToSeed);
    console.log("Seeded initial system reports");
  }

  // 7. Seed Audit and Security Logs
  const auditCount = await AuditLog.countDocuments();
  if (auditCount === 0) {
    await AuditLog.create({
      id: "aud_1",
      adminUsername: "anas",
      action: "تسجيل الدخول",
      details: "تم تسجيل دخول المدير العام بنجاح للمرة الأولى",
      timestamp: Date.now() - 3600000 * 1
    });
  }

  const securityCount = await SecurityEvent.countDocuments();
  if (securityCount === 0) {
    await SecurityEvent.create({
      id: "sec_1",
      type: "failed_login",
      description: "محاولة دخول فاشلة لحساب المشرف من عنوان IP 192.168.1.55",
      severity: "medium",
      timestamp: Date.now() - 3600000 * 2
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for Android / Capacitor WebViews
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Support large Base64 file payloads up to 100MB
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // Create local uploads directory if not exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve static files from the uploads directory
  app.use("/uploads", express.static(uploadsDir));

  // Unified upload helper using ImageKit. Uses IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.
  // Throws clear error message if env variables are missing.
  const saveBase64File = async (base64Str: string | undefined, originalName: string | undefined): Promise<string | undefined> => {
    if (!base64Str || !base64Str.startsWith("data:")) return base64Str;

    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new Error("تكوينات ImageKit غير موجودة في ملف .env. يرجى توفير IMAGEKIT_PUBLIC_KEY و IMAGEKIT_PRIVATE_KEY و IMAGEKIT_URL_ENDPOINT.");
    }

    try {
      // Decode and upload
      const matches = base64Str.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return base64Str;

      const mimeType = matches[1];
      const base64Data = matches[2];

      let extension = "bin";
      const mimeParts = mimeType.split("/");
      if (mimeParts.length === 2) {
        extension = mimeParts[1].split(";")[0];
      }

      const uniqueId = crypto.randomBytes(16).toString("hex");
      const safeOriginalName = originalName ? path.basename(originalName).replace(/[^a-zA-Z0-9.-]/g, "_") : "";
      let fileName = safeOriginalName 
        ? `${uniqueId}_${safeOriginalName}`
        : `${uniqueId}.${extension}`;

      if (!fileName.includes(".")) {
        fileName = `${fileName}.${extension}`;
      }

      console.log(`Uploading file ${fileName} to ImageKit...`);

      // Lazy load ImageKit so it does not crash on module load if keys are missing
      const ImageKit = (await import("imagekit")).default;
      const ik = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint
      });

      const response = await ik.upload({
        file: base64Data, // Pass raw base64 data
        fileName: fileName,
        folder: "/callme_uploads"
      });

      console.log(`Successfully uploaded file to ImageKit: ${response.url}`);
      return response.url;
    } catch (err: any) {
      console.error("Failed to upload file to ImageKit:", err);
      throw new Error(`فشل رفع الملف إلى ImageKit: ${err.message}`);
    }
  };

  // Helper to delete media file from ImageKit when a message, story or other resource is deleted
  const deleteFromImageKit = async (mediaUrl: string | undefined): Promise<void> => {
    if (!mediaUrl) return;
    if (!mediaUrl.includes("imagekit.io")) return;

    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey || !urlEndpoint) {
      console.warn("تنبيه: لم يتم تكوين ImageKit بشكل كامل. تم تخطي عملية حذف الملف.");
      return;
    }

    try {
      const urlParts = mediaUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      if (!fileName) return;

      const ImageKit = (await import("imagekit")).default;
      const ik = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint
      });

      console.log(`Searching for file ${fileName} on ImageKit to delete...`);
      const files = await ik.listFiles({
        searchQuery: `name = "${fileName}"`
      });

      if (files && files.length > 0) {
        const fileId = (files[0] as any).fileId;
        console.log(`Deleting file from ImageKit. fileId: ${fileId}, name: ${fileName}`);
        await ik.deleteFile(fileId);
        console.log(`File deleted successfully from ImageKit.`);
      } else {
        console.log(`File ${fileName} not found on ImageKit.`);
      }
    } catch (err: any) {
      console.error("Failed to delete file from ImageKit:", err.message);
    }
  };

  // Secure Authorization Middleware for API endpoints (protect against cross-user data access)
  const authenticateUser = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "غير مصرح لك بالوصول، يرجى تسجيل الدخول أولاً" });
    }
    const email = authHeader.split(" ")[1].trim().toLowerCase();
    req.userEmail = email;
    next();
  };

  // Connect to MongoDB Atlas
  try {
    await connectDB();
    await seedDatabase();
  } catch (error) {
    console.error("Database connection or seed failed:", error);
  }

  // Initialize Firebase Admin SDK
  try {
    initializeFirebaseAdmin();
  } catch (error: any) {
    console.error("Firebase Admin initialization error on server boot:", error.message);
  }

  // Dynamic Service Worker endpoint to inject server environment variables safely
  app.get("/firebase-messaging-sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(`
// Import and configure the Firebase SDK inside the service worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.VITE_FIREBASE_APP_ID || ''}"
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      
      const notificationTitle = payload.notification ? (payload.notification.title || 'CallMe') : 'CallMe';
      const notificationOptions = {
        body: payload.notification ? (payload.notification.body || '') : '',
        icon: '/favicon.ico',
        data: payload.data
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (err) {
    console.error("Firebase Service Worker initialization failed:", err);
  }
} else {
  console.warn("Firebase SW not configured. Missing environment variables.");
}
    `);
  });


  // API: Register/Signup profile
  app.post("/api/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ error: "البريد الإلكتروني مسجل بالفعل" });
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 12);
      const newUser = await User.create({
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        status: 'online',
        lastSeen: Date.now(),
        role: 'user'
      });

      return res.json({ success: true, user: { email: newUser.email, name: newUser.name, status: newUser.status, role: newUser.role } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "حدث خطأ أثناء التسجيل" });
    }
  });

  // API: Login
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ error: "البريد الإلكتروني غير مسجل، يرجى إنشاء حساب جديد" });
      }

      const isPasswordCorrect = await bcrypt.compare(password.trim(), user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ error: "كلمة المرور غير صحيحة" });
      }

      user.status = 'online';
      user.lastSeen = Date.now();
      await user.save();

      return res.json({ success: true, user: { email: user.email, name: user.name, status: user.status, role: user.role || 'user' } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "حدث خطأ أثناء تسجيل الدخول" });
    }
  });

  // API: Real Reset Password using nodemailer
  app.post("/api/reset-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ error: "البريد الإلكتروني غير مسجل في تطبيق CallMe" });
      }

      // Generate a secure 8-character temporary password
      const tempPassword = crypto.randomBytes(4).toString("hex");
      const hashedPassword = await bcrypt.hash(tempPassword, 12);
      user.password = hashedPassword;
      await user.save();

      // Send the email via SMTP if configured, or fall back to log printing
      const nodemailer = await import("nodemailer");
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "587");
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || "no-reply@callme.com";

      let mailSent = false;
      let note = "";
      if (host && smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          const mailOptions = {
            from,
            to: normalizedEmail,
            subject: "إعادة تعيين كلمة المرور - تطبيق CallMe",
            html: `
              <div style="direction: rtl; text-align: right; font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563EB;">طلب إعادة تعيين كلمة المرور</h2>
                <p>مرحباً،</p>
                <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك في تطبيق CallMe.</p>
                <p>كلمة المرور المؤقتة الجديدة الخاصة بك هي:</p>
                <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; border-radius: 5px; margin: 20px 0; color: #1f2937;">
                  ${tempPassword}
                </div>
                <p>يرجى استخدام هذا الرمز المؤقت ككلمة مرور جديدة لتسجيل الدخول، وتغيير كلمة المرور من إعدادات حسابك فور تسجيل الدخول.</p>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                <p style="font-size: 12px; color: #9ca3af;">إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
              </div>
            `,
          };

          await transporter.sendMail(mailOptions);
          mailSent = true;
          console.log(`SMTP: Password reset email successfully sent to ${normalizedEmail}.`);
        } catch (emailError: any) {
          console.error("Failed to send reset email via SMTP:", emailError.message);
          note = " (فشل إرسال البريد الإلكتروني الفعلي، الرمز مطبوع في سجلات الخادم)";
        }
      } else {
        console.warn("SMTP credentials not fully configured in .env. Falling back to log printing.");
        note = " (بيانات SMTP غير مهيأة، الرمز مطبوع في سجلات الخادم)";
      }

      // Log to server console so developers can see it in real-time if SMTP is not configured
      console.log(`[PASSWORD RESET CODE] Email: ${normalizedEmail} | Temporary Password: ${tempPassword}`);

      return res.json({ 
        success: true, 
        message: `تم إرسال كلمة المرور المؤقتة الجديدة إلى بريدك الإلكتروني بنجاح!${note}` 
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Heartbeat
  app.post("/api/heartbeat", authenticateUser, async (req: any, res: any) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (req.userEmail !== normalizedEmail) {
      return res.status(403).json({ error: "غير مسموح لك بتحديث هذا المستخدم" });
    }

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        user.lastSeen = Date.now();
        if (user.status === 'offline') {
          user.status = 'online';
        }
        await user.save();
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Status Change
  app.post("/api/status", authenticateUser, async (req: any, res: any) => {
    const { email, status } = req.body;
    if (!email || !status) {
      return res.status(400).json({ error: "المعاملات ناقصة" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (req.userEmail !== normalizedEmail) {
      return res.status(403).json({ error: "غير مسموح لك بتحديث حالة هذا المستخدم" });
    }

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        user.status = status;
        user.lastSeen = Date.now();
        await user.save();
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Update profile details (including base64 avatar to ImageKit upload, bio, name)
  app.post("/api/profile/update", authenticateUser, async (req: any, res: any) => {
    const { name, bio, avatarBase64, avatarName, deleteAvatar } = req.body;
    const userEmail = req.userEmail;

    try {
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      if (name !== undefined) {
        user.name = name.trim();
      }

      if (bio !== undefined) {
        user.bio = bio.trim();
      }

      if (deleteAvatar) {
        if (user.avatarUrl) {
          // Delete old image from ImageKit
          await deleteFromImageKit(user.avatarUrl).catch((e: any) => console.warn("Failed to delete old avatar:", e));
        }
        user.avatarUrl = "";
      } else if (avatarBase64) {
        if (user.avatarUrl) {
          // Delete old image first to save storage
          await deleteFromImageKit(user.avatarUrl).catch((e: any) => console.warn("Failed to delete old avatar:", e));
        }
        const uploadedUrl = await saveBase64File(avatarBase64, avatarName || "avatar.png");
        user.avatarUrl = uploadedUrl || "";
      }

      await user.save();
      return res.json({ success: true, user: { name: user.name, bio: user.bio, avatarUrl: user.avatarUrl } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Logout
  app.post("/api/logout", authenticateUser, async (req: any, res: any) => {
    const { email } = req.body;
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (req.userEmail !== normalizedEmail) {
        return res.status(403).json({ error: "غير مسموح لك بتسجيل خروج هذا المستخدم" });
      }

      try {
        const user = await User.findOne({ email: normalizedEmail });
        if (user) {
          user.status = 'offline';
          user.lastSeen = 0;
          await user.save();
        }
      } catch (err) {
        // Log error silently
      }
    }
    return res.json({ success: true });
  });

  // API: Register FCM Token
  app.post("/api/fcm/register", authenticateUser, async (req: any, res: any) => {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ error: "البريد الإلكتروني والرمز مطلوبان" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (req.userEmail !== normalizedEmail) {
      return res.status(403).json({ error: "غير مسموح لك بتسجيل توكن FCM لهذا المستخدم" });
    }

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        user.fcmToken = token;
        await user.save();
        console.log(`FCM token registered successfully for ${normalizedEmail}`);
        return res.json({ success: true, message: "تم تسجيل رمز FCM بنجاح" });
      }
      return res.status(404).json({ error: "المستخدم غير موجود" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Call Logs
  app.get("/api/logs", authenticateUser, async (req: any, res: any) => {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (req.userEmail !== normalizedEmail) {
      return res.status(403).json({ error: "غير مسموح لك بعرض سجل مكالمات هذا المستخدم" });
    }

    try {
      const userLogs = await CallLog.find({
        $or: [
          { caller: normalizedEmail },
          { callee: normalizedEmail }
        ]
      }).sort({ timestamp: -1 });

      return res.json(userLogs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Initiate Call
  app.post("/api/call/initiate", authenticateUser, async (req: any, res: any) => {
    const { caller, callee, type, offer } = req.body;
    if (!caller || !callee || !type || !offer) {
      return res.status(400).json({ error: "معاملات الاتصال ناقصة" });
    }

    const callerEmail = caller.trim().toLowerCase();
    const calleeEmail = callee.trim().toLowerCase();

    if (req.userEmail !== callerEmail) {
      return res.status(403).json({ error: "غير مسموح لك ببدء اتصال نيابة عن هذا المستخدم" });
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const callerUser = await User.findOne({ email: callerEmail });
      const calleeUser = await User.findOne({ email: calleeEmail });

      if (callerUser) {
        callerUser.status = 'busy';
        await callerUser.save();
      }
      if (calleeUser) {
        calleeUser.status = 'busy';
        await calleeUser.save();
      }

      const newCall = await CallSession.create({
        id: callId,
        caller: callerEmail,
        callee: calleeEmail,
        type,
        status: 'ringing',
        offer,
        callerCandidates: [],
        calleeCandidates: [],
        createdAt: Date.now()
      });

      // Send incoming call push notification via FCM
      const callerDisplayName = callerUser?.name || callerEmail;
      const callTypeLabel = type === 'video' ? 'مكالمة فيديو واردة' : 'مكالمة صوتية واردة';
      sendFCMNotification(
        calleeEmail,
        callTypeLabel,
        `يتصل بك ${callerDisplayName}`,
        {
          type: "incoming_call",
          callId: callId,
          caller: callerEmail,
          callType: type
        },
        User
      ).catch(err => console.error("Error sending incoming call FCM:", err));

      return res.json({ success: true, call: newCall });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Respond to Call
  app.post("/api/call/respond", authenticateUser, async (req: any, res: any) => {
    const { callId, status, answer } = req.body;
    try {
      const call = await CallSession.findOne({ id: callId });
      if (!call) {
        return res.status(404).json({ error: "المكالمة غير موجودة" });
      }

      // Verify participant authorization
      if (req.userEmail !== call.caller && req.userEmail !== call.callee) {
        return res.status(403).json({ error: "غير مسموح لك بالتحكم في هذه المكالمة" });
      }

      call.status = status;
      if (status === 'accepted') {
        call.answer = answer;
        await call.save();
      } else if (status === 'rejected') {
        const callerUser = await User.findOne({ email: call.caller });
        const calleeUser = await User.findOne({ email: call.callee });

        await CallLog.create({
          id: call.id,
          caller: call.caller,
          callerName: callerUser?.name || call.caller,
          callee: call.callee,
          calleeName: calleeUser?.name || call.callee,
          type: call.type,
          status: 'rejected',
          timestamp: Date.now(),
          duration: 0
        });

        if (callerUser && callerUser.status === 'busy') {
          callerUser.status = 'online';
          await callerUser.save();
        }
        if (calleeUser && calleeUser.status === 'busy') {
          calleeUser.status = 'online';
          await calleeUser.save();
        }
        await CallSession.deleteOne({ id: callId });
      }

      return res.json({ success: true, call });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Candidate Exchange
  app.post("/api/call/candidate", authenticateUser, async (req: any, res: any) => {
    const { callId, email, candidate } = req.body;
    try {
      const call = await CallSession.findOne({ id: callId });
      if (!call) {
        return res.status(404).json({ error: "المكالمة غير موجودة" });
      }

      const normalizedEmail = email?.trim().toLowerCase();
      if (req.userEmail !== normalizedEmail) {
        return res.status(403).json({ error: "غير مسموح لك بإرسال ICE candidates نيابة عن مستخدم آخر" });
      }

      if (normalizedEmail !== call.caller && normalizedEmail !== call.callee) {
        return res.status(403).json({ error: "غير مسموح لك بالمشاركة في إشارات هذه المكالمة" });
      }

      if (normalizedEmail === call.caller) {
        call.callerCandidates.push(candidate);
      } else if (normalizedEmail === call.callee) {
        call.calleeCandidates.push(candidate);
      }
      await call.save();

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: End Call
  app.post("/api/call/end", authenticateUser, async (req: any, res: any) => {
    const { callId, duration } = req.body;
    try {
      const call = await CallSession.findOne({ id: callId });
      if (!call) {
        return res.json({ success: true }); // already cleaned up
      }

      if (req.userEmail !== call.caller && req.userEmail !== call.callee) {
        return res.status(403).json({ error: "غير مسموح لك بإنهاء هذه المكالمة" });
      }

      const callerUser = await User.findOne({ email: call.caller });
      const calleeUser = await User.findOne({ email: call.callee });

      if (callerUser && callerUser.status === 'busy') {
        callerUser.status = 'online';
        await callerUser.save();
      }
      if (calleeUser && calleeUser.status === 'busy') {
        calleeUser.status = 'online';
        await calleeUser.save();
      }

      const logStatus = call.status === 'accepted' ? 'completed' : 'missed';
      await CallLog.create({
        id: call.id,
        caller: call.caller,
        callerName: callerUser?.name || call.caller,
        callee: call.callee,
        calleeName: calleeUser?.name || call.callee,
        type: call.type,
        status: logStatus,
        timestamp: Date.now(),
        duration: duration || 0
      });

      if (logStatus === 'missed') {
        const callerDisplayName = callerUser?.name || call.caller;
        sendFCMNotification(
          call.callee,
          "مكالمة فائتة",
          `لديك مكالمة فائتة من ${callerDisplayName}`,
          {
            type: "missed_call",
            callId: call.id,
            caller: call.caller,
            callType: call.type
          },
          User
        ).catch(err => console.error("Error sending missed call FCM:", err));
      }

      await CallSession.deleteOne({ id: callId });

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Get messages between two users
  app.get("/api/messages", authenticateUser, async (req: any, res: any) => {
    const { email1, email2 } = req.query;
    if (!email1 || !email2 || typeof email1 !== 'string' || typeof email2 !== 'string') {
      return res.status(400).json({ error: "البريد الإلكتروني للطرفين مطلوب" });
    }

    const e1 = email1.trim().toLowerCase();
    const e2 = email2.trim().toLowerCase();

    // Verify authorized user is one of the chat participants
    if (req.userEmail !== e1 && req.userEmail !== e2) {
      return res.status(403).json({ error: "غير مسموح لك بالوصول إلى هذه المحادثة" });
    }

    try {
      // Auto-mark incoming messages as read first
      await Message.updateMany(
        { sender: e2, receiver: e1, status: { $ne: 'read' } },
        { $set: { status: 'read' } }
      );

      // Fetch messages between e1 and e2
      const chatMessages = await Message.find({
        $or: [
          { sender: e1, receiver: e2 },
          { sender: e2, receiver: e1 }
        ]
      });

      return res.json(chatMessages);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Send Message
  app.post("/api/messages/send", authenticateUser, async (req: any, res: any) => {
    const { id, sender, receiver, text, type, mediaUrl, mediaName, mediaSize, mediaDuration, replyToId, replyToText, replyToSender } = req.body;
    if (!sender || !receiver) {
      return res.status(400).json({ error: "المرسل والمستقبل مطلوبان" });
    }

    if (req.userEmail !== sender.trim().toLowerCase()) {
      return res.status(403).json({ error: "غير مسموح لك بالإرسال نيابة عن هذا المستخدم" });
    }

    try {
      // Decode and save media file on ImageKit to avoid MongoDB document size limit
      const processedMediaUrl = await saveBase64File(mediaUrl, mediaName);

      const newMessage = await Message.create({
        id: id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        sender: sender.trim().toLowerCase(),
        receiver: receiver.trim().toLowerCase(),
        text: text || "",
        timestamp: Date.now(),
        status: 'sent',
        type: type || 'text',
        mediaUrl: processedMediaUrl,
        mediaName,
        mediaSize,
        mediaDuration,
        replyToId,
        replyToText,
        replyToSender,
        reactions: []
      });

      // Find sender name for custom notification title
      const senderUser = await User.findOne({ email: newMessage.sender });
      const senderDisplayName = senderUser?.name || newMessage.sender;
      
      // Determine body content depending on message type
      let notificationBody = newMessage.text;
      if (newMessage.type !== 'text') {
        notificationBody = `[أرسل ${newMessage.type === 'image' ? 'صورة' : newMessage.type === 'video' ? 'فيديو' : newMessage.type === 'voice' ? 'رسالة صوتية' : 'ملفاً'}]`;
      }

      // Send background/foreground messaging push notification via FCM
      sendFCMNotification(
        newMessage.receiver,
        `رسالة جديدة من ${senderDisplayName}`,
        notificationBody,
        {
          type: "message",
          messageId: newMessage.id,
          sender: newMessage.sender,
          messageType: newMessage.type,
          text: newMessage.text || ""
        },
        User
      ).catch(err => console.error("Error sending message FCM:", err));

      return res.json({ success: true, message: newMessage });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Edit Message
  app.post("/api/messages/edit", authenticateUser, async (req: any, res: any) => {
    const { id, text } = req.body;
    if (!id || text === undefined) {
      return res.status(400).json({ error: "معرف الرسالة والنص الجديد مطلوبان" });
    }

    try {
      const msg = await Message.findOne({ id });
      if (!msg) {
        return res.status(404).json({ error: "الرسالة غير موجودة" });
      }

      if (msg.sender !== req.userEmail) {
        return res.status(403).json({ error: "غير مسموح لك بتعديل رسائل غيرك" });
      }

      msg.text = text;
      msg.isEdited = true;
      await msg.save();

      return res.json({ success: true, message: msg });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Delete Message
  app.post("/api/messages/delete", authenticateUser, async (req: any, res: any) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "معرف الرسالة مطلوب" });
    }

    try {
      const msg = await Message.findOne({ id });
      if (!msg) {
        return res.status(404).json({ error: "الرسالة غير موجودة" });
      }

      if (msg.sender !== req.userEmail && msg.receiver !== req.userEmail) {
        return res.status(403).json({ error: "غير مسموح لك بحذف هذه الرسالة" });
      }

      if (msg.mediaUrl) {
        await deleteFromImageKit(msg.mediaUrl);
      }

      await Message.deleteOne({ id });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Pin Message
  app.post("/api/messages/pin", authenticateUser, async (req: any, res: any) => {
    const { id, isPinned } = req.body;
    if (!id) {
      return res.status(400).json({ error: "معرف الرسالة مطلوب" });
    }

    try {
      const msg = await Message.findOne({ id });
      if (!msg) {
        return res.status(404).json({ error: "الرسالة غير موجودة" });
      }

      if (msg.sender !== req.userEmail && msg.receiver !== req.userEmail) {
        return res.status(403).json({ error: "غير مسموح لك بتثبيت هذه الرسالة" });
      }

      msg.isPinned = isPinned;
      await msg.save();

      return res.json({ success: true, message: msg });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: React to Message
  app.post("/api/messages/react", authenticateUser, async (req: any, res: any) => {
    const { id, emoji, email } = req.body;
    if (!id || !emoji || !email) {
      return res.status(400).json({ error: "المعاملات ناقصة للتفاعل" });
    }

    if (req.userEmail !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "غير مسموح لك بالتفاعل نيابة عن مستخدم آخر" });
    }

    try {
      const msg = await Message.findOne({ id });
      if (!msg) {
        return res.status(404).json({ error: "الرسالة غير موجودة" });
      }

      if (msg.sender !== req.userEmail && msg.receiver !== req.userEmail) {
        return res.status(403).json({ error: "غير مسموح لك بالتفاعل في هذه المحادثة" });
      }

      if (!msg.reactions) {
        (msg as any).reactions = [];
      }

      const existingReaction = (msg.reactions as any[]).find((r: any) => r.emoji === emoji);
      if (existingReaction) {
        if (existingReaction.users.includes(email)) {
          existingReaction.users = existingReaction.users.filter((u: string) => u !== email);
          existingReaction.count = existingReaction.users.length;
        } else {
          existingReaction.users.push(email);
          existingReaction.count = existingReaction.users.length;
        }
      } else {
        (msg.reactions as any).push({
          emoji,
          count: 1,
          users: [email]
        });
      }

      const filteredReactions = (msg.reactions as any[]).filter((r: any) => r.count > 0);
      (msg as any).reactions = filteredReactions;
      await msg.save();
      return res.json({ success: true, message: msg });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Typing Status
  app.post("/api/status/typing", authenticateUser, async (req: any, res: any) => {
    const { email, target, state } = req.body;
    if (!email) {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (req.userEmail !== normalizedEmail) {
      return res.status(403).json({ error: "غير مسموح لك بتحديث حالة الكتابة لمستخدم آخر" });
    }

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        user.typingState = state || null;
        user.typingTarget = target ? target.trim().toLowerCase() : undefined;
        await user.save();
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Stories
  app.get("/api/stories", authenticateUser, async (req: any, res: any) => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    try {
      const activeStories = await Story.find({ timestamp: { $gt: twentyFourHoursAgo } });
      return res.json(activeStories);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stories/create", authenticateUser, async (req: any, res: any) => {
    const { email, name, mediaUrl, text } = req.body;
    if (!email || !mediaUrl || !name) {
      return res.status(400).json({ error: "المعلومات المطلوبة ناقصة للقصة" });
    }

    if (req.userEmail !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "غير مسموح لك بنشر قصة لهذا المستخدم" });
    }

    try {
      // Decode and save story media on ImageKit to avoid MongoDB 16MB document limit
      const processedMediaUrl = await saveBase64File(mediaUrl, "story_image");

      const newStory = await Story.create({
        id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        email: email.trim().toLowerCase(),
        name,
        mediaUrl: processedMediaUrl,
        text,
        timestamp: Date.now(),
        viewers: []
      });

      return res.json({ success: true, story: newStory });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stories/view", authenticateUser, async (req: any, res: any) => {
    const { id, email } = req.body;
    if (!id || !email) {
      return res.status(400).json({ error: "المعاملات ناقصة" });
    }

    if (req.userEmail !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "غير مسموح لك بمشاهدة قصة كشخص آخر" });
    }

    try {
      const story = await Story.findOne({ id });
      if (story) {
        if (!story.viewers.includes(email)) {
          story.viewers.push(email);
          await story.save();
        }
        return res.json({ success: true, story });
      }

      return res.status(404).json({ error: "القصة غير موجودة" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Poll (Presence, Signalling, Messages & Typing status)
  app.get("/api/poll", authenticateUser, async (req: any, res: any) => {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب للاستعلام" });
    }

    const userEmail = email.trim().toLowerCase();
    if (req.userEmail !== userEmail) {
      return res.status(403).json({ error: "غير مسموح لك بالاستعلام عن مستخدم آخر" });
    }

    const now = Date.now();

    try {
      // Heartbeat
      const currentUser = await User.findOne({ email: userEmail });
      if (currentUser) {
        currentUser.lastSeen = now;
        if (currentUser.status === 'offline') {
          currentUser.status = 'online';
        }
        await currentUser.save();
      }

      // Auto-offline stale users (> 12 seconds)
      await User.updateMany(
        { email: { $ne: userEmail }, lastSeen: { $lt: now - 12000 } },
        { $set: { status: 'offline', typingState: null, typingTarget: null } }
      );

      // Find incoming/active calls
      const activeCallSessions = await CallSession.find({
        $or: [
          { caller: userEmail },
          { callee: userEmail }
        ]
      });

      let incomingCall: any = null;
      let activeCall: any = null;
      let iceCandidates: any[] = [];

      const ringingCall = activeCallSessions.find(call => call.callee === userEmail && call.status === 'ringing');
      if (ringingCall) {
        const callerUser = await User.findOne({ email: ringingCall.caller });
        incomingCall = {
          id: ringingCall.id,
          caller: ringingCall.caller,
          callerName: callerUser?.name || ringingCall.caller,
          type: ringingCall.type,
          offer: ringingCall.offer
        };
      }

      const currentActiveCall = activeCallSessions.find(call => call.caller === userEmail || call.callee === userEmail);
      if (currentActiveCall) {
        activeCall = {
          id: currentActiveCall.id,
          caller: currentActiveCall.caller,
          callee: currentActiveCall.callee,
          status: currentActiveCall.status,
          type: currentActiveCall.type,
          offer: currentActiveCall.offer,
          answer: currentActiveCall.answer
        };

        if (userEmail === currentActiveCall.caller) {
          iceCandidates = currentActiveCall.calleeCandidates || [];
        } else {
          iceCandidates = currentActiveCall.callerCandidates || [];
        }
      }

      // Compute unread message counts for this user
      const unreadMessages = await Message.find({ receiver: userEmail, status: { $ne: 'read' } });
      const unreadCounts: Record<string, number> = {};
      unreadMessages.forEach(m => {
        unreadCounts[m.sender] = (unreadCounts[m.sender] || 0) + 1;
      });

      // Fetch active users list (except self)
      const dbUsers = await User.find({ email: { $ne: userEmail } });
      const usersList = dbUsers.map(u => ({
        email: u.email,
        name: u.name,
        status: u.status,
        lastSeen: u.lastSeen,
        bio: u.bio || "",
        phone: u.phone || "",
        username: u.username || u.email.split('@')[0],
        typingState: u.typingState || null,
        typingTarget: u.typingTarget || undefined
      }));

      return res.json({
        users: usersList,
        incomingCall,
        activeCall,
        iceCandidates,
        unreadCounts
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ADMIN DASHBOARD API ENDPOINTS
  // ==========================================

  // 1. Admin Login
  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
    }

    try {
      const admin = await Admin.findOne({ username: username.trim().toLowerCase() });
      if (!admin) {
        // Log failed attempt
        await AdminLoginLog.create({
          id: `lh_${Date.now()}`,
          username,
          ip: req.ip || "127.0.0.1",
          device: req.headers["user-agent"] || "Unknown Device",
          timestamp: Date.now(),
          success: false
        });
        await SecurityEvent.create({
          id: `sec_${Date.now()}`,
          type: "failed_login",
          description: `محاولة دخول فاشلة للمشرف باسم مستخدم غير مسجل: ${username}`,
          severity: "medium",
          timestamp: Date.now()
        });
        return res.status(401).json({ error: "اسم المشرف أو كلمة المرور غير صحيحة" });
      }

      const isMatch = await bcrypt.compare(password, admin.passwordHash);
      if (!isMatch) {
        // Log failed attempt
        await AdminLoginLog.create({
          id: `lh_${Date.now()}`,
          username: admin.username,
          ip: req.ip || "127.0.0.1",
          device: req.headers["user-agent"] || "Unknown Device",
          timestamp: Date.now(),
          success: false
        });
        await SecurityEvent.create({
          id: `sec_${Date.now()}`,
          type: "failed_login",
          description: `محاولة دخول فاشلة للمشرف بكلمة مرور خاطئة لحساب: ${username}`,
          severity: "high",
          timestamp: Date.now()
        });
        return res.status(401).json({ error: "اسم المشرف أو كلمة المرور غير صحيحة" });
      }

      // Success
      const token = crypto.randomBytes(24).toString("hex");
      await AdminSession.create({
        token,
        username: admin.username,
        role: admin.role,
        createdAt: Date.now()
      });

      await AdminLoginLog.create({
        id: `lh_${Date.now()}`,
        username: admin.username,
        ip: req.ip || "127.0.0.1",
        device: req.headers["user-agent"] || "Unknown Device",
        timestamp: Date.now(),
        success: true
      });
      await AuditLog.create({
        id: `aud_${Date.now()}`,
        adminUsername: admin.username,
        action: "تسجيل الدخول",
        details: "تم تسجيل دخول المشرف بنجاح إلى لوحة التحكم",
        timestamp: Date.now()
      });

      return res.json({
        success: true,
        admin: {
          username: admin.username,
          role: admin.role,
          createdAt: admin.createdAt,
          token: token
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Middleware to protect admin routes
  const requireAdmin = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(403).json({ error: "403 Forbidden - Admin authorization is required" });
    }
    const token = authHeader.substring(7);
    try {
      const session = await AdminSession.findOne({ token });
      if (!session || session.role !== "admin") {
        return res.status(403).json({ error: "403 Forbidden - Access denied" });
      }
      req.admin = session;
      next();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };

  // Guard all /api/admin/* requests (excluding /api/admin/login)
  app.use("/api/admin/*", (req, res, next) => {
    if (req.originalUrl === "/api/admin/login") {
      return next();
    }
    requireAdmin(req, res, next);
  });

  // 3. User Management - Get Users list
  app.get("/api/admin/users", async (req, res) => {
    try {
      const dbUsers = await User.find();
      const list = dbUsers.map(u => ({
        name: u.name,
        email: u.email,
        status: u.status,
        lastSeen: u.lastSeen,
        username: u.username || u.email.split('@')[0],
        phone: u.phone || "غير محدد",
        bio: u.bio || "",
        isBanned: u.bio?.startsWith("[موقوف]") || false
      }));
      return res.json(list);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 4. User Management - Update User info or Ban/Suspend
  app.post("/api/admin/users/update", async (req, res) => {
    const { email, name, username, phone, bio, status, isBanned, adminUsername } = req.body;
    if (!email) {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب لتحديث الحساب" });
    }

    try {
      const u = await User.findOne({ email: email.trim().toLowerCase() });
      if (!u) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      if (name !== undefined) u.name = name;
      if (username !== undefined) u.username = username;
      if (phone !== undefined) u.phone = phone;
      if (bio !== undefined) u.bio = bio;
      if (status !== undefined) u.status = status;
      
      if (isBanned === true) {
        u.bio = `[موقوف] تم حظر هذا الحساب من قبل الإدارة لانتهاك السياسات.`;
        u.status = 'offline';
        await SecurityEvent.create({
          id: `sec_${Date.now()}`,
          type: "banned_user",
          description: `تم حظر حساب المستخدم: ${email}`,
          severity: "medium",
          timestamp: Date.now()
        });
      } else if (isBanned === false && u.bio?.startsWith("[موقوف]")) {
        u.bio = "";
      }

      await u.save();

      await AuditLog.create({
        id: `aud_${Date.now()}`,
        adminUsername: adminUsername || "anas",
        action: isBanned ? "حظر مستخدم" : "تعديل مستخدم",
        details: `تم تعديل بيانات الحساب: ${email}`,
        timestamp: Date.now()
      });

      return res.json({ success: true, user: { email: u.email, name: u.name, status: u.status, bio: u.bio } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 5. User Management - Delete User
  app.post("/api/admin/users/delete", async (req, res) => {
    const { email, adminUsername } = req.body;
    if (!email) {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب لحذف الحساب" });
    }

    try {
      const result = await User.deleteOne({ email: email.trim().toLowerCase() });
      if (result.deletedCount && result.deletedCount > 0) {
        await AuditLog.create({
          id: `aud_${Date.now()}`,
          adminUsername: adminUsername || "anas",
          action: "حذف مستخدم",
          details: `تم حذف حساب مستخدم نهائياً: ${email}`,
          timestamp: Date.now()
        });
        return res.json({ success: true });
      }

      return res.status(404).json({ error: "المستخدم غير موجود" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 6. Messages Management - View all messages
  app.get("/api/admin/messages", async (req, res) => {
    try {
      const dbMessages = await Message.find();
      return res.json(dbMessages);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 7. Messages Management - Delete message
  app.post("/api/admin/messages/delete", async (req, res) => {
    const { id, adminUsername } = req.body;
    if (!id) {
      return res.status(400).json({ error: "معرف الرسالة مطلوب لحذفها" });
    }

    try {
      const deletedMsg = await Message.findOne({ id });
      if (deletedMsg) {
        if (deletedMsg.mediaUrl) {
          await deleteFromImageKit(deletedMsg.mediaUrl);
        }
        await Message.deleteOne({ id });

        await AuditLog.create({
          id: `aud_${Date.now()}`,
          adminUsername: adminUsername || "anas",
          action: "حذف رسالة",
          details: `تم حذف رسالة مرسلة من ${deletedMsg.sender} إلى ${deletedMsg.receiver}`,
          timestamp: Date.now()
        });

        return res.json({ success: true });
      }

      return res.status(404).json({ error: "الرسالة غير موجودة" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8. Calls Management
  app.get("/api/admin/calls", async (req, res) => {
    try {
      const logs = await CallLog.find();
      return res.json(logs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 9. Reports Management
  app.get("/api/admin/reports", async (req, res) => {
    try {
      const reports = await SystemReport.find();
      return res.json(reports);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 10. Reports Management - Update Report (Solve)
  app.post("/api/admin/reports/update", async (req, res) => {
    const { id, status, adminUsername } = req.body;
    if (!id || !status) {
      return res.status(400).json({ error: "معرف البلاغ والحالة مطلوبان للتحديث" });
    }

    try {
      const rep = await SystemReport.findOne({ id });
      if (rep) {
        rep.status = status;
        await rep.save();

        await AuditLog.create({
          id: `aud_${Date.now()}`,
          adminUsername: adminUsername || "anas",
          action: "تحديث بلاغ",
          details: `تحديث حالة البلاغ ${id} إلى ${status}`,
          timestamp: Date.now()
        });
        return res.json({ success: true, report: rep });
      }

      return res.status(404).json({ error: "البلاغ غير موجود" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 11. Reports Management - Delete Report
  app.post("/api/admin/reports/delete", async (req, res) => {
    const { id, adminUsername } = req.body;
    if (!id) {
      return res.status(400).json({ error: "معرف البلاغ مطلوب للحذف" });
    }

    try {
      const result = await SystemReport.deleteOne({ id });
      if (result.deletedCount && result.deletedCount > 0) {
        await AuditLog.create({
          id: `aud_${Date.now()}`,
          adminUsername: adminUsername || "anas",
          action: "حذف بلاغ من النظام",
          details: `تم حذف البلاغ رقم: ${id}`,
          timestamp: Date.now()
        });
        return res.json({ success: true });
      }

      return res.status(404).json({ error: "البلاغ غير موجود" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 12. Send Admin Broadcast Announcement
  app.post("/api/admin/notifications/broadcast", async (req, res) => {
    const { text, targetEmails, adminUsername } = req.body;
    if (!text) {
      return res.status(400).json({ error: "محتوى البث مطلوب" });
    }

    const sender = "system@callme.com";
    try {
      let targets = targetEmails;
      if (!targets || targets.length === 0) {
        const allUsers = await User.find();
        targets = allUsers.map(u => u.email);
      }

      const timestamp = Date.now();
      const messagesToInsert = targets.map((receiver: string) => ({
        id: `sysmsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender,
        receiver,
        text: `📢 إشعار إداري عام: ${text}`,
        timestamp,
        status: 'sent',
        type: 'text'
      }));

      await Message.insertMany(messagesToInsert);

      await AuditLog.create({
        id: `aud_${Date.now()}`,
        adminUsername: adminUsername || "anas",
        action: "بث إعلان عام",
        details: `بث إشعار إداري لعدد ${targets.length} مستخدم`,
        timestamp: Date.now()
      });

      return res.json({ success: true, count: targets.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 13. Settings Management - Get App settings
  app.get("/api/admin/settings", async (req, res) => {
    try {
      let settings = await AdminSettings.findOne();
      if (!settings) {
        settings = await AdminSettings.create({
          appName: "CallMe",
          appVersion: "3.2.0",
          maintenanceMode: false,
          maxUploadSize: 50,
          storageProvider: "ImageKit",
          privacyLevel: "high"
        });
      }
      return res.json(settings);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 14. Settings Management - Update Settings
  app.post("/api/admin/settings/update", async (req, res) => {
    const { appName, appVersion, maintenanceMode, maxUploadSize, storageProvider, privacyLevel, adminUsername } = req.body;
    
    try {
      let settings = await AdminSettings.findOne();
      if (!settings) {
        settings = new AdminSettings();
      }

      if (appName !== undefined) settings.appName = appName;
      if (appVersion !== undefined) settings.appVersion = appVersion;
      if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
      if (maxUploadSize !== undefined) settings.maxUploadSize = maxUploadSize;
      if (storageProvider !== undefined) settings.storageProvider = storageProvider;
      if (privacyLevel !== undefined) settings.privacyLevel = privacyLevel;

      await settings.save();

      await AuditLog.create({
        id: `aud_${Date.now()}`,
        adminUsername: adminUsername || "anas",
        action: "تحديث تفضيلات النظام",
        details: "تعديل الإعدادات العامة وخيارات الحماية والخصوصية المباشرة",
        timestamp: Date.now()
      });

      await SecurityEvent.create({
        id: `sec_${Date.now()}`,
        type: "settings_changed",
        description: "تم تحديث التكوينات العامة للخادم من قبل لوحة التحكم",
        severity: "low",
        timestamp: Date.now()
      });

      return res.json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 15. Security & Logs - Admin History
  app.get("/api/admin/security/logs", async (req, res) => {
    try {
      const loginHistory = await AdminLoginLog.find().sort({ timestamp: -1 });
      const logs = await AuditLog.find().sort({ timestamp: -1 });
      const events = await SecurityEvent.find().sort({ timestamp: -1 });

      return res.json({
        loginHistory,
        auditLogs: logs,
        securityEvents: events
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================


  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

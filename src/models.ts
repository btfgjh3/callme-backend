import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();

const mongoURI = process.env.MONGODB_URI || process.env.DATABASE_URL;
const MONGO_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];
const FALLBACK_HOST = "ac-vmm8gqj-shard-00-00.s7vvmnm.mongodb.net";
const MONGO_OPTIONS = {
  dbName: "callme",
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  family: 4 as 4,
  w: "majority" as const,
};

function logMongoError(message: string, error?: unknown) {
  const details = error instanceof Error ? error.message : String(error ?? "unknown error");
  console.warn(`[MongoDB] ${message}: ${details}`);
}

function buildMongoUri() {
  if (!mongoURI) {
    return null;
  }

  if (mongoURI.startsWith("mongodb+srv://")) {
    const fallbackUri = mongoURI
      .replace("mongodb+srv://", "mongodb://")
      .replace(/@([^/?#]+)/, `@${FALLBACK_HOST}`);

    const separator = fallbackUri.includes("?") ? "&" : "?";
    return `${fallbackUri}${separator}retryWrites=true&w=majority&tls=true&authSource=admin`;
  }

  return mongoURI;
}

function attachMongoEventHandlers() {
  if (mongoose.connection.listenerCount("connected") > 0 && mongoose.connection.listenerCount("error") > 0) {
    return;
  }

  mongoose.connection.on("connected", () => {
    console.log("[MongoDB] Mongoose connected to Atlas.");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Disconnected from Atlas. Mongoose will retry automatically.");
  });

  mongoose.connection.on("error", (error) => {
    logMongoError("Connection error", error);
  });
}

export async function connectDB() {
  attachMongoEventHandlers();

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!mongoURI) {
    throw new Error("MONGODB_URI is not defined in the environment variables. Please check your .env file.");
  }

  const connectionUri = buildMongoUri();
  if (!connectionUri) {
    throw new Error("Unable to construct a MongoDB connection URI.");
  }

  for (let attempt = 1; attempt <= MONGO_RETRY_DELAYS_MS.length + 1; attempt += 1) {
    try {
      console.log(`[MongoDB] Attempt ${attempt}/${MONGO_RETRY_DELAYS_MS.length + 1} to connect...`);
      await mongoose.connect(connectionUri, MONGO_OPTIONS);
      console.log("[MongoDB] Connected successfully to Atlas cluster.");
      return;
    } catch (error) {
      const isLastAttempt = attempt === MONGO_RETRY_DELAYS_MS.length + 1;
      logMongoError(`Connection attempt ${attempt} failed`, error);
      if (isLastAttempt) {
        throw error;
      }

      const delay = MONGO_RETRY_DELAYS_MS[attempt - 1] || 8000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ["online", "offline", "busy"], default: "offline" },
  lastSeen: { type: Number, default: Date.now },
  bio: { type: String, default: "" },
  phone: { type: String, default: "" },
  username: { type: String },
  typingState: { type: String, default: null },
  typingTarget: { type: String },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  fcmToken: { type: String, default: "" },
  avatarUrl: { type: String, default: "" }
}, { timestamps: true });

// Message Schema
const MessageReactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  count: { type: Number, default: 0 },
  users: [{ type: String }]
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sender: { type: String, required: true, lowercase: true, trim: true },
  receiver: { type: String, required: true, lowercase: true, trim: true },
  text: { type: String, default: "" },
  timestamp: { type: Number, default: Date.now },
  status: { type: String, enum: ["sending", "sent", "delivered", "read"], default: "sent" },
  type: { type: String, enum: ["text", "voice", "image", "video", "file"], default: "text" },
  mediaUrl: { type: String },
  mediaName: { type: String },
  mediaSize: { type: String },
  mediaDuration: { type: Number },
  replyToId: { type: String },
  replyToText: { type: String },
  replyToSender: { type: String },
  isEdited: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  reactions: [MessageReactionSchema]
});

// Call Session Schema (for current active WebRTC calls)
const CallSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  caller: { type: String, required: true, lowercase: true, trim: true },
  callee: { type: String, required: true, lowercase: true, trim: true },
  type: { type: String, required: true },
  status: { type: String, required: true },
  offer: { type: mongoose.Schema.Types.Mixed },
  answer: { type: mongoose.Schema.Types.Mixed },
  callerCandidates: { type: [mongoose.Schema.Types.Mixed], default: [] },
  calleeCandidates: { type: [mongoose.Schema.Types.Mixed], default: [] },
  createdAt: { type: Number, default: Date.now }
});

// Call Log Schema (historical logs)
const CallLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  caller: { type: String, required: true, lowercase: true, trim: true },
  callerName: { type: String, required: true },
  callee: { type: String, required: true, lowercase: true, trim: true },
  calleeName: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, required: true },
  timestamp: { type: Number, default: Date.now },
  duration: { type: Number, default: 0 }
});

// Story Schema
const StorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  mediaUrl: { type: String, required: true },
  text: { type: String },
  timestamp: { type: Number, default: Date.now },
  viewers: { type: [String], default: [] }
});

// Admin Schema
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "super_admin", "moderator"], default: "admin" },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  createdAt: { type: Number, default: Date.now }
});

// Admin Session Schema
const AdminSessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, required: true },
  createdAt: { type: Number, default: Date.now }
});

// System Report Schema
const SystemReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  reporter: { type: String, required: true, lowercase: true, trim: true },
  reportedUser: { type: String, required: true, lowercase: true, trim: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["pending", "solved"], default: "pending" },
  createdAt: { type: Number, default: Date.now }
});

// Admin Login Log Schema
const AdminLoginLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  ip: { type: String },
  device: { type: String },
  timestamp: { type: Number, default: Date.now },
  success: { type: Boolean, required: true }
});

// Audit Log Schema
const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  adminUsername: { type: String, required: true, lowercase: true, trim: true },
  action: { type: String, required: true },
  details: { type: String },
  timestamp: { type: Number, default: Date.now }
});

// Security Event Schema
const SecurityEventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ["low", "medium", "high"], required: true },
  timestamp: { type: Number, default: Date.now }
});

// Admin Settings Schema
const AdminSettingsSchema = new mongoose.Schema({
  appName: { type: String, default: "CallMe" },
  appVersion: { type: String, default: "1.4.0" },
  maintenanceMode: { type: Boolean, default: false },
  maxUploadSize: { type: Number, default: 50 },
  storageProvider: { type: String, default: "ImageKit" },
  privacyLevel: { type: String, default: "Strict Peer-to-Peer" }
});

// Mongoose Models
export const User = mongoose.model("User", UserSchema);
export const Message = mongoose.model("Message", MessageSchema);
export const CallSession = mongoose.model("CallSession", CallSessionSchema);
export const CallLog = mongoose.model("CallLog", CallLogSchema);
export const Story = mongoose.model("Story", StorySchema);
export const Admin = mongoose.model("Admin", AdminSchema);
export const AdminSession = mongoose.model("AdminSession", AdminSessionSchema);
export const SystemReport = mongoose.model("SystemReport", SystemReportSchema);
export const AdminLoginLog = mongoose.model("AdminLoginLog", AdminLoginLogSchema);
export const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
export const SecurityEvent = mongoose.model("SecurityEvent", SecurityEventSchema);
export const AdminSettings = mongoose.model("AdminSettings", AdminSettingsSchema);

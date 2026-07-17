import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { API_BASE, safeFetch } from "../config";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const isConfigured = !!(apiKey && projectId && messagingSenderId && appId);

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId
};

let app: any = null;
if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log("Firebase client SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase client SDK initialization failed:", error);
  }
} else {
  console.warn("تنبيه: لم يتم تكوين Firebase لـ FCM بالكامل في ملف .env للعميل. سيتم تعطيل ميزات إشعارات المتصفح.");
}

export { app };

// Helper to request notification permission and register token
export async function requestNotificationPermissionAndGetToken(userEmail: string) {
  if (!isConfigured || !app) {
    console.log("FCM: Client not configured. Skipping registration.");
    return null;
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("This browser does not support desktop notifications.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied.");
      return null;
    }

    if (!("serviceWorker" in navigator)) {
      console.log("Service workers are not supported by this browser.");
      return null;
    }

    const messaging = getMessaging(app);
    if (!vapidKey) {
      console.warn("FCM: VITE_FIREBASE_VAPID_KEY is missing. Skipping token fetch.");
      return null;
    }

    const token = await getToken(messaging, { vapidKey });

    if (token) {
      console.log("FCM Token obtained:", token);
      // Register token with Express Backend
      await safeFetch(`${API_BASE}/fcm/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, token })
      });
      return token;
    } else {
      console.log("No registration token available.");
      return null;
    }
  } catch (error) {
    console.warn("FCM messaging token fetching skipped (often happens when testing inside nested iframes or insecure contexts):", error);
    return null;
  }
}

// Handler for foreground notifications
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!isConfigured || !app) {
    return () => {};
  }

  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      console.log("Foreground Message received: ", payload);
      
      // Standard notification display
      if (Notification.permission === "granted" && payload.notification) {
        const { title, body } = payload.notification;
        new Notification(title || "CallMe", {
          body: body || "",
          icon: "/favicon.ico"
        });
      }
      callback(payload);
    });
  } catch (error) {
    console.warn("FCM foreground handler registration skipped:", error);
    return () => {};
  }
}

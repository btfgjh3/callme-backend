import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let isFirebaseInitialized = false;

export function initializeFirebaseAdmin() {
  if (isFirebaseInitialized) return true;
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("تنبيه: لم يتم تكوين Firebase بالكامل في ملف .env (تتطلب FIREBASE_PROJECT_ID و FIREBASE_CLIENT_EMAIL و FIREBASE_PRIVATE_KEY). تم تعطيل الإشعارات الفورية.");
    return false;
  }

  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    }
    console.log("Firebase Admin initialized successfully using service account credentials.");
    isFirebaseInitialized = true;
    return true;
  } catch (error: any) {
    if (error.code === "app/duplicate-app") {
      isFirebaseInitialized = true;
      return true;
    }
    console.error("فشل تهيئة Firebase Admin بالرغم من توفر المفاتيح:", error.message);
  }
  return false;
}

export async function sendFCMNotification(
  targetEmail: string,
  title: string,
  body: string,
  dataPayload: Record<string, string> = {},
  userModel: any
) {
  try {
    const initialized = initializeFirebaseAdmin();
    if (!initialized) {
      console.log("FCM: Firebase Admin not initialized. Skipping notification.");
      return;
    }

    const normalizedEmail = targetEmail.trim().toLowerCase();
    const targetUser = await userModel.findOne({ email: normalizedEmail });
    if (!targetUser) {
      console.log(`FCM: User ${targetEmail} not found in database.`);
      return;
    }

    if (!targetUser.fcmToken) {
      console.log(`FCM: No token registered for user ${targetEmail}`);
      return;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...dataPayload,
      },
      token: targetUser.fcmToken,
    };

    const response = await getMessaging().send(message);
    console.log(`FCM: Notification sent successfully to ${targetEmail}. ID: ${response}`);
    return response;
  } catch (error: any) {
    console.error(`FCM: Error sending notification to ${targetEmail}:`, error.message);
  }
}

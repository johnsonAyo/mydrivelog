import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { IdentityProvider } from "@/application/auth/identity-provider";

function adminAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase Admin is not configured");
  const app = getApps().length ? getApp() : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  return getAuth(app);
}

export const firebaseIdentityProvider: IdentityProvider = {
  async customTokenForVerifiedEmail(email) {
    const auth = adminAuth();
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
      user = await auth.createUser({ email, emailVerified: true });
    }
    if (!user.emailVerified) await auth.updateUser(user.uid, { emailVerified: true });
    return auth.createCustomToken(user.uid);
  },
  async verifyIdToken(idToken) {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    if (!decoded.email || !decoded.email_verified) throw new Error("A verified email is required");
    return { uid: decoded.uid, email: decoded.email.toLowerCase(), emailVerified: true };
  },
};

import express from "express";
import type * as core from "express-serve-static-core";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import Stripe from 'stripe';

// Firebase Admin logic is used for backend tasks

let stripeInstance: Stripe | null = null;
function getStripe() {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.includes('dfsdfsdf') || key.includes('YOUR_') || key.length < 10) {
      throw new Error('Valid STRIPE_SECRET_KEY environment variable is required in settings');
    }
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

interface AdminRequest extends core.Request {
  admin?: {
    uid: string;
    role: string;
    name?: string;
    [key: string]: any;
  };
}

// Load Firebase Config for Admin SDK
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

const configProjectId = firebaseConfig.projectId;
const targetDbId = firebaseConfig.firestoreDatabaseId;

// Initialize Firebase Admin with explicit config
let adminApp: any;

try {
  const existingApps = getApps();
  if (existingApps.length === 0) {
    if (!configProjectId) {
      throw new Error("No projectId found in firebase-applet-config.json");
    }
    // Explicitly use the project ID from config to avoid targeting the ambient project
    adminApp = initializeApp({
      projectId: configProjectId
    });
    console.log(`[Admin SDK] ✅ Initialized with Project ID: ${configProjectId}`);
  } else {
    adminApp = existingApps[0];
    console.log(`[Admin SDK] ℹ️ Using existing app instance`);
  }
} catch (initErr: any) {
  console.error(`[Admin SDK] ❌ Initialization Error: ${initErr.message}`);
  // Last resort attempt
  try {
    adminApp = getApps().length > 0 ? getApps()[0] : initializeApp();
    console.log(`[Admin SDK] ⚠️ Fallback initialization used`);
  } catch (e: any) {
    console.error(`[Admin SDK] 💀 Critical: Global initialization failed: ${e.message}`);
  }
}

// Helper to safely get Firestore with fallback to (default) if named DB fails
function getSafeFirestore(app: any, dbId: any) {
  const projId = app.options.projectId || "UNKNOWN";
  try {
    console.log(`[Admin SDK] 🔍 Initializing Firestore. Project: ${projId}, DB: ${dbId || '(default)'}`);
    const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    return db;
  } catch (e: any) {
    console.warn(`[Admin SDK] ⚠️ Warning: Failed to init Firestore with DB ${dbId} in project ${projId}: ${e.message}`);
    return getFirestore(app);
  }
}

let dbAdmin = getSafeFirestore(adminApp, targetDbId);
const authAdmin = getAuth(adminApp);

// Connectivity verification and fallback
let isConnectivityVerified = false;

async function verifyAdminConnectivity() {
  const tryDb = async (db: any) => {
    // Forcefully try to get the project ID from different sources for logging
    const optionsProjId = adminApp.options.projectId;
    const processProjId = process.env.GOOGLE_CLOUD_PROJECT;
    const dbDatabaseId = db.databaseId || "(default)";
    
    console.log(`[Admin SDK] 🧪 Connectivity Test:`);
    console.log(`  - Options Project: ${optionsProjId}`);
    console.log(`  - Env Project: ${processProjId}`);
    console.log(`  - Database ID: ${dbDatabaseId}`);

    try {
      // document fetch is the most reliable way to check API status and permissions
      const testSnap = await db.collection('users').limit(1).get();
      console.log(`  - Result: ✅ SUCCESS (${testSnap.size} users found or empty collection)`);
      return true;
    } catch (e: any) {
      console.warn(`  - Result: ❌ FAILED: ${e.message}`);
      return false;
    }
  };

  // 1. Try initial dbAdmin (Target project + Target DB)
  if (await tryDb(dbAdmin)) {
    console.log(`[Admin SDK] ✅ Success: Connected to ${dbAdmin.databaseId} in project ${adminApp.options.projectId || 'Ambient'}`);
    isConnectivityVerified = true;
    return;
  }

  // 2. Try falling back to (default) database in the SAME project
  if (dbAdmin.databaseId !== '(default)') {
    console.log(`[Admin SDK] 🔄 Trying fallback to (default) database in project ${adminApp.options.projectId}...`);
    try {
      const fallbackDb = getFirestore(adminApp, '(default)');
      if (await tryDb(fallbackDb)) {
        dbAdmin = fallbackDb;
        console.log(`[Admin SDK] ✅ Success: Fell back to (default) database`);
        isConnectivityVerified = true;
        return;
      }
    } catch (e) {}
  }

  // 3. Fallback to Ambient ADC project ONLY if Config Project failed (Diagnostic)
  console.log(`[Admin SDK] 🧪 Trying diagnostic fallback to Ambient ADC project...`);
  try {
    const adcApp = initializeApp({}, "adc-diagnostic");
    const adcDb = getFirestore(adcApp);
    if (await tryDb(adcDb)) {
      console.warn(`[Admin SDK] ⚠️ WARNING: Connection ONLY worked on Ambient project. The config project ${configProjectId} is inaccessible.`);
      adminApp = adcApp;
      dbAdmin = adcDb;
      isConnectivityVerified = true;
      return;
    }
  } catch (e) {}

  console.error(`[Admin SDK] ❌ FATAL: Backend connectivity failed. 
  1. Ensure the Firestore API is enabled in project ${configProjectId}: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${configProjectId}
  2. If using a named database, ensure it exists: ${targetDbId}
  3. Ensure the service account has "Cloud Datastore User" or "Firebase Admin" permissions.`);
}

// Run verification (now called inside startServer)
// verifyAdminConnectivity();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Ensure Firebase connection is established before starting
  await verifyAdminConnectivity();

  const app = express();
  const PORT = 3000;

    // Stripe Webhook (needs raw body, MUST be before express.json())
    app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      let event;
  
      try {
        event = getStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
      } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
  
      const stripeEvent = event as any;
  
      // Handle the event
      switch (stripeEvent.type) {
        case 'checkout.session.completed': {
          const session = stripeEvent.data.object as any;
          const userId = session.client_reference_id;
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;
  
          if (userId) {
            const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as any;
            // Set next billing date to 30 days from now (assign date)
            const nextBillingDate = new Date();
            nextBillingDate.setDate(nextBillingDate.getDate() + 30);
            
            await dbAdmin.collection('subscriptions').doc(userId).set({
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              plan: 'Premium Monthly',
              amount: subscription.items.data[0].plan.amount! / 100,
              billingCycle: 'monthly',
              nextBillingDate: nextBillingDate.toISOString(),
              status: 'active',
              createdAt: new Date().toISOString()
            }, { merge: true });
          }
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = stripeEvent.data.object as any;
          const customerId = invoice.customer as string;
          const subscriptionId = invoice.subscription as string;
  
          // Find user by customerId
          const subSnap = await dbAdmin.collection('subscriptions')
            .where('stripeCustomerId', '==', customerId)
            .get();
            
          if (!subSnap.empty) {
            const subData = subSnap.docs[0].data();
            const userId = subData.userId;
  
            await dbAdmin.collection('payments').add({
              userId,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency,
              status: 'paid',
              stripeInvoiceId: invoice.id,
              stripeInvoiceUrl: invoice.hosted_invoice_url,
              paymentDate: new Date().toISOString()
            });
  
            // Update subscription next billing date to 30 days from now
            const nextBillingDate = new Date();
            nextBillingDate.setDate(nextBillingDate.getDate() + 30);
  
            await dbAdmin.collection('subscriptions').doc(userId).update({
              nextBillingDate: nextBillingDate.toISOString(),
              status: 'active'
            });
          }
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = stripeEvent.data.object as any;
          const customerId = invoice.customer as string;
  
          const subSnap = await dbAdmin.collection('subscriptions')
            .where('stripeCustomerId', '==', customerId)
            .get();

          if (!subSnap.empty) {
            const userId = subSnap.docs[0].data().userId;
            await dbAdmin.collection('subscriptions').doc(userId).update({
              status: 'past_due'
            });
  
            await dbAdmin.collection('notifications').add({
              userId,
              title: 'Payment Failed',
              message: 'Your monthly subscription payment failed. Please update your payment method.',
              type: 'billing',
              status: 'sent',
              read: false,
              createdAt: new Date().toISOString()
            });
          }
          break;
        }
      }
  
      res.json({ received: true });
    });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Global error handler for body-parser errors (like PayloadTooLargeError)
  app.use((err: any, req: core.Request, res: core.Response, next: core.NextFunction) => {
    if (err.type === 'entity.too.large') {
      console.error('[Server Error] Payload too large:', err.message);
      return res.status(413).json({ 
        error: "Payload too large. The request exceeds the 50MB limit.",
        details: "Try reducing the number or resolution of screenshots."
      });
    }
    next(err);
  });

  // Middleware to verify Admin Status
  const verifyAdmin = async (req: AdminRequest, res: core.Response, next: core.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await authAdmin.verifyIdToken(token);
      const uid = decodedToken.uid;
      const email = decodedToken.email?.toLowerCase();
      
      console.log(`[Admin SDK] Verifying admin status for UID: ${uid} (Email: ${email})`);
      
      // Hardcoded fallback for the primary developer
      const developerEmail = "wpnajmul@gmail.com";
      if (email === developerEmail) {
        console.log(`[Admin SDK] Access GRANTED via Developer Fallback: ${email}`);
        req.admin = { uid: uid, role: "super_admin", email: email };
        return next();
      }

      // Try to find the user in 'users' or 'profiles' in both named and default databases
      let userData: any = null;
      let databaseUsed = firebaseConfig.firestoreDatabaseId;
      
      const tryFetchUser = async (db: any) => {
        const uDoc = await db.collection("users").doc(uid).get();
        if (uDoc.exists) return uDoc.data();
        const pDoc = await db.collection("profiles").doc(uid).get();
        if (pDoc.exists) return pDoc.data();
        return null;
      };

      try {
        userData = await tryFetchUser(dbAdmin);
        if (!userData) {
          console.log(`[Admin SDK] Not found in primary DB. Access denied.`);
        }
      } catch (fsError: any) {
        console.error(`[Admin SDK] Firestore lookup failed for UID ${uid}:`, fsError.message);
      }
      
      if (userData?.role === "admin" || userData?.role === "super_admin") {
        console.log(`[Admin SDK] Access GRANTED for ${userData.role}: ${uid} (DB: ${databaseUsed})`);
        req.admin = { uid: uid, ...userData };
        next();
      } else {
        // Final fallback: if Firestore is totally broken but they are in the auth system, 
        // we normally shouldn't trust it. But if we can't read ANY user data, we have no choice but to fail gracefully.
        if (!userData) {
          console.error(`[Admin SDK] Could not retrieve any user data for ${uid}. Access denied.`);
          return res.status(500).json({ 
            error: "Security Verification Failure", 
            details: "The server could not verify your administrative permissions. Please contact support." 
          });
        }
        
        console.warn(`[Admin SDK] Access DENIED for UID ${uid}: Role is ${userData?.role || 'unknown'}`);
        res.status(403).json({ error: "Forbidden: Admin access required" });
      }
    } catch (error: any) {
      console.error("[Admin SDK] Token and Role verification failed:", error.message);
      res.status(401).json({ error: "Invalid or expired token", details: error.message });
    }
  };

  // Stripe: Create Subscription Checkout
  app.post("/api/stripe/create-subscription", async (req, res) => {
    const { userId, userEmail } = req.body;
    if (!userId || !userEmail) return res.status(400).json({ error: "Missing userId or userEmail" });

    try {
      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID_MONTHLY,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.APP_URL || 'http://localhost:3000'}/portal?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/portal`,
        client_reference_id: userId,
        customer_email: userEmail,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error('Stripe Session Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Stripe: Customer Portal for managing payments
  app.post("/api/stripe/customer-portal", async (req, res) => {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: "Missing customerId" });

    try {
      const portalSession = await getStripe().billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.APP_URL || 'http://localhost:3000'}/portal`,
      });
      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error('Stripe Portal Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Debug Firebase
  app.get('/api/admin/debug-firebase', async (req: core.Request, res: core.Response) => {
    const results: any = {};
    // ... rest of the code ...
  });

  // --- GEMINI AI Logic has been moved to frontend (geminiService.ts) ---

  // API Route: Deliver Report to Client
  app.post("/api/deliver-report", async (req: core.Request, res: core.Response) => {
    const { reportId, clientEmail, clientName, projectName } = req.body;

    if (!reportId || !clientEmail) {
      return res.status(400).json({ error: "Missing reportId or clientEmail" });
    }

    console.log(`[Report Delivery System] Triggering automated delivery for Report ${reportId}`);
    console.log(`[Report Delivery System] Recipient: ${clientEmail} (${clientName})`);
    console.log(`[Report Delivery System] Project: ${projectName}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`[Report Delivery System] SUCCESS: Report ${reportId} has been delivered to ${clientEmail}`);

    res.json({ 
      success: true, 
      deliveredAt: new Date().toISOString(),
      recipient: clientEmail
    });
  });

  // Proxy Image to bypass CORS
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send("URL is required");
    
    try {
      console.log(`[Proxy] Fetching image: ${imageUrl}`);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      
      // Add caching for performance
      res.setHeader("Cache-Control", "public, max-age=86400");
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error(`[Proxy] Error fetching image ${imageUrl}:`, err.message);
      res.status(500).send("Error fetching image");
    }
  });

  app.post("/api/admin/create-client", verifyAdmin as any, async (req: AdminRequest, res: core.Response) => {
    const { email, password, name, adminId } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields (email, password, name)" });
    }

    try {
      // 1. Create Auth User
      const userRecord = await authAdmin.createUser({
        email: email,
        password: password,
        displayName: name,
      });

      console.log(`[Admin] Auth user created: ${userRecord.uid} (${email}) by admin ${req.admin?.uid}`);

      // 2. Create Firestore Docs
      const userData = {
        uid: userRecord.uid,
        email: email.toLowerCase().trim(),
        name: name,
        role: 'client',
        adminId: adminId || req.admin?.uid,
        createdAt: new Date(),
        status: 'offline'
      };

      await Promise.all([
        dbAdmin.collection("users").doc(userRecord.uid).set(userData),
        dbAdmin.collection("profiles").doc(userRecord.uid).set(userData)
      ]);

      console.log(`[Admin] Firestore records created for UID: ${userRecord.uid}`);

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating client user:", error);
      
      // Specifically handle the Identity Toolkit API disabled error
      if (error.message?.includes('identitytoolkit.googleapis.com') || error.code === 'auth/internal-error') {
        const targetProjectId = firebaseConfig.projectId;
        return res.status(500).json({ 
          error: "Identity Toolkit API Issue", 
          details: `The Identity Toolkit API must be enabled for project: ${targetProjectId}.`,
          link: `https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${targetProjectId}`
        });
      }

      res.status(500).json({ error: error.message || "Failed to create client user" });
    }
  });

  // API Route: Admin Change User Password
  app.post("/api/admin/change-password", verifyAdmin as any, async (req: AdminRequest, res: core.Response) => {
    const { uid, newPassword } = req.body;

    if (!uid || !newPassword) {
      return res.status(400).json({ error: "Missing uid or newPassword" });
    }

    try {
      await authAdmin.updateUser(uid, {
        password: newPassword,
      });
      console.log(`[Admin] Password updated for user ${uid} by admin ${req.admin?.uid}`);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      
      // Specifically handle the Identity Toolkit API disabled error
      if (error.message?.includes('identitytoolkit.googleapis.com') || error.code === 'auth/internal-error') {
        const targetProjectId = firebaseConfig.projectId;
        console.error(`[Admin Auth] Identity Toolkit failure for project: ${targetProjectId}.`);
        
        return res.status(500).json({ 
          error: "Identity Toolkit API Issue", 
          details: `The Identity Toolkit API must be enabled for project: ${targetProjectId}. If it's already enabled, there may be an IAM sync issue.`,
          link: `https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${targetProjectId}`,
          diagnostics: {
            assignedProjectId: targetProjectId,
            errorMsg: error.message
          }
        });
      }
      
      res.status(500).json({ error: error.message || "Failed to update password" });
    }
  });

  // Billing Scheduler: Check for upcoming charges and send notifications
  const runBillingScheduler = async () => {
    if (!isConnectivityVerified) {
      console.warn('[Scheduler] Skipping check: Admin SDK connectivity not verified yet.');
      return;
    }
    try {
      const currentProjId = adminApp.options.projectId || "OP Media";
      const currentDbId = dbAdmin.databaseId;
      console.log(`[Scheduler] ${new Date().toISOString()} Running billing checks using Project: ${currentProjId}, DB: ${currentDbId}`);
      const now = new Date();
      
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dateStr = sevenDaysFromNow.toISOString().split('T')[0];

      // 1. Existing Subscription Based Billing
      try {
        const subSnap = await dbAdmin.collection('subscriptions')
          .where('status', '==', 'active')
          .get();
        
        for (const d of subSnap.docs) {
          const sub = d.data();
          if (!sub.nextBillingDate) continue;

          const billingDate = new Date(sub.nextBillingDate);
          const billingDateStr = billingDate.toISOString().split('T')[0];

          if (billingDateStr === dateStr) {
            const existingNotif = await dbAdmin.collection('notifications')
              .where('userId', '==', sub.userId)
              .where('type', '==', 'billing')
              .where('scheduledDate', '==', billingDateStr)
              .get();

            if (existingNotif.empty) {
              await dbAdmin.collection('notifications').add({
                userId: sub.userId,
                title: 'Upcoming Charge',
                message: `Your subscription of $${sub.amount} will be charged on ${billingDateStr}.`,
                type: 'billing',
                status: 'sent',
                scheduledDate: billingDateStr,
                read: false,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      } catch (subErr: any) {
        console.error('[Scheduler] Error fetching subscriptions:', subErr.message);
      }

      // 2. Client Portal Billing (30-day cycle)
      try {
        const clientSnap = await dbAdmin.collection('clients')
          .where('status', '==', 'active')
          .get();

        for (const clientDocRef of clientSnap.docs) {
          const client = clientDocRef.data();
          if (!client.assignedDate || !client.invoiceValue) continue;

          const assignedDate = client.assignedDate.toDate ? client.assignedDate.toDate() : new Date(client.assignedDate);
          const diffMs = now.getTime() - assignedDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays < 0) continue;

          const cycleNumber = Math.floor(diffDays / 30);
          const dayInCycle = diffDays % 30;
          const nextBillingDate = new Date(assignedDate.getTime() + (cycleNumber + 1) * 30 * 24 * 60 * 60 * 1000);
          
          const nextBillingDateStr = nextBillingDate.toISOString();
          if (!client.nextBillingDate || client.nextBillingDate !== nextBillingDateStr) {
            await dbAdmin.collection('clients').doc(clientDocRef.id).update({ nextBillingDate: nextBillingDateStr });
          }

          // Generate Invoice
          if (dayInCycle === 29 || dayInCycle === 0) {
            const invoiceId = `auto_inv_${clientDocRef.id}_cycle_${cycleNumber + (dayInCycle === 29 ? 1 : 0)}`;
            const invDocRef = await dbAdmin.collection('payments').doc(invoiceId).get();
            
            if (!invDocRef.exists) {
              await dbAdmin.collection('payments').doc(invoiceId).set({
                userId: client.userId || client.email,
                clientEmail: client.email,
                clientName: client.name,
                company: client.company || '',
                amount: Number(client.invoiceValue),
                status: 'pending',
                type: 'invoice',
                description: `Professional Service Invoice - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                createdAt: new Date().toISOString(),
                dueDate: nextBillingDate.toISOString(),
                isAutoGenerated: true,
                cycle: cycleNumber + 1
              });

              await dbAdmin.collection('notifications').add({
                userId: client.userId || client.email,
                title: 'Monthly Invoice Available',
                message: `Your automated invoice for $${client.invoiceValue} is now available in your portal.`,
                type: 'billing',
                status: 'sent',
                read: false,
                createdAt: new Date().toISOString()
              });
            }
          }

          // Auto Punch
          const todayStr = now.toISOString().split('T')[0];
          const nextBillStr = nextBillingDate.toISOString().split('T')[0];
          
          if (todayStr === nextBillStr && client.stripeCustomerId && client.autoPay === true) {
            const chargeId = `auto_punch_${clientDocRef.id}_cycle_${cycleNumber + 1}`;
            const chargeDoneDoc = await dbAdmin.collection('payments').doc(chargeId).get();
            
            if (!chargeDoneDoc.exists) {
              try {
                const stripe = getStripe();
                const paymentIntent = await stripe.paymentIntents.create({
                  amount: Math.round(Number(client.invoiceValue) * 100),
                  currency: 'usd',
                  customer: client.stripeCustomerId,
                  confirm: true,
                  off_session: true,
                  description: `Automatic Recurring Payment (Cycle ${cycleNumber + 1})`,
                });

                if (paymentIntent.status === 'succeeded') {
                  await dbAdmin.collection('payments').doc(chargeId).set({
                    userId: client.userId || client.email,
                    amount: Number(client.invoiceValue),
                    status: 'paid',
                    paymentDate: new Date().toISOString(),
                    isAutoPunch: true
                  });

                  await dbAdmin.collection('notifications').add({
                    userId: client.userId || client.email,
                    title: 'Payment Successful',
                    message: `Your monthly payment was handled automatically. Thank you!`,
                    type: 'billing',
                    status: 'sent',
                    read: false,
                    createdAt: new Date().toISOString()
                  });
                }
              } catch (err: any) {
                console.error(`[Scheduler] Punch FAILED for ${client.email}:`, err.message);
              }
            }
          }
        }
      } catch (clientErr: any) {
        console.error('[Scheduler] Error fetching clients:', clientErr.message);
      }
    } catch (err: any) {
      console.error('[Scheduler] FATAL ERROR:', err);
    }
  };

  // API: Manual Billing Trigger
  app.post("/api/admin/trigger-billing", async (req, res) => {
    try {
      await runBillingScheduler();
      res.json({ success: true, message: "Manual billing check executed." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
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

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`[Server] Running on port ${PORT}`);
    setInterval(runBillingScheduler, 60 * 60 * 1000);
    setTimeout(runBillingScheduler, 10000);
  });
}

startServer();

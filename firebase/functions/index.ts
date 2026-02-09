import { onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';

admin.initializeApp();
const db = admin.firestore();

/**
 * TRIGGER: onInvoiceValidated
 * Décrémente le stock lors de la validation d'une facture.
 * Fix: Updated to Firebase Functions v2 syntax (onDocumentUpdated)
 */
export const onInvoiceValidated = onDocumentUpdated('invoices/{invoiceId}', async (event) => {
  const newData = event.data?.after.data();
  const oldData = event.data?.before.data();
  const invoiceId = event.params.invoiceId;

  // On ne déclenche que si le statut passe à 'VALIDATED'
  if (oldData?.status !== 'VALIDATED' && newData?.status === 'VALIDATED') {
    const itemsSnapshot = await db.collection(`invoices/${invoiceId}/items`).get();
    
    const batch = db.batch();
    
    for (const itemDoc of itemsSnapshot.docs) {
      const item = itemDoc.data();
      const stockRef = db.collection('stockItems').doc(item.productId);
      
      // Mise à jour décrémentale atomique
      batch.update(stockRef, {
        currentLevel: admin.firestore.FieldValue.increment(-item.qty)
      });

      // Création du mouvement de stock
      const movementRef = stockRef.collection('movements').doc();
      batch.set(movementRef, {
        date: admin.firestore.Timestamp.now(),
        type: 'OUT',
        qty: item.qty,
        reason: `Facture ${invoiceId}`,
        userRef: newData.tenantId
      });
    }

    await batch.commit();
    console.log(`Stock mis à jour pour la facture ${invoiceId}`);
  }
});

/**
 * WEBHOOK: processPaymentWebhook
 * Gère Stripe, Wave, Orange Money, MTN.
 * Fix: Updated to Firebase Functions v2 syntax (onRequest) and cast req/res to any to resolve type errors
 */
export const processPaymentWebhook = onRequest(async (req, res) => {
  const { provider, tenantId, amount, status, signature } = (req as any).body;

  // 1. Vérification de signature (Simplifiée pour la démo)
  if (!signature) {
    (res as any).status(401).send('Unauthorized');
    return;
  }

  const tenantRef = db.collection('tenants').doc(tenantId);

  if (status === 'SUCCESS') {
    await tenantRef.update({
      isActive: true,
      paymentStatus: 'UP_TO_DATE',
      lastPaymentDate: admin.firestore.Timestamp.now()
    });
    
    // Ajout à l'historique
    await tenantRef.collection('subscriptions').doc('current').collection('payments').add({
      amount,
      method: provider,
      status: 'SUCCESS',
      date: admin.firestore.Timestamp.now()
    });
  } else {
    await tenantRef.update({ paymentStatus: 'FAILED' });
  }

  (res as any).status(200).send('Webhook Processed');
});

/**
 * TRIGGER: generateAuditLog
 * Enregistre et signe chaque action critique.
 * Fix: Updated to Firebase Functions v2 syntax (onDocumentWritten)
 */
export const generateAuditLog = onDocumentWritten('{collection}/{id}', async (event) => {
  const { collection, id } = event.params;
  if (['auditLogs', 'tenants'].includes(collection)) return; // Éviter les boucles

  const change = event.data;
  const data = change?.after.exists ? change.after.data() : change?.before.data();
  const action = !change?.before.exists ? 'CREATE' : !change?.after.exists ? 'DELETE' : 'UPDATE';

  const logEntry = {
    tenantId: data?.tenantId || 'SYSTEM',
    timestamp: admin.firestore.Timestamp.now(),
    action: `${action}_${collection.toUpperCase()}`,
    resource: id,
    severity: action === 'DELETE' ? 'HIGH' : 'LOW',
  };

  // Signature SHA-256 pour intégrité
  const signature = crypto
    .createHash('sha256')
    .update(JSON.stringify(logEntry) + (process.env.AUDIT_SECRET || ''))
    .digest('hex');

  await db.collection('auditLogs').add({
    ...logEntry,
    sha256_signature: signature
  });
});

/**
 * AI BRIDGE: getAIProjection
 * Appelle n8n pour générer des prévisions basées sur l'historique.
 * Fix: Updated to Firebase Functions v2 syntax (onSchedule)
 */
export const syncAIProjections = onSchedule('every 24 hours', async (event) => {
  const stockItems = await db.collection('stockItems').get();
  
  for (const doc of stockItems.docs) {
    const movements = await doc.ref.collection('movements').limit(100).get();
    const history = movements.docs.map(m => m.data());

    try {
      const n8nResponse = await axios.post(process.env.N8N_AI_WEBHOOK_URL!, {
        sku: doc.data().sku,
        history
      });

      await doc.ref.update({
        forecastedLevel: n8nResponse.data.predictedLevel
      });
    } catch (e) {
      console.error(`AI Sync failed for ${doc.id}`);
    }
  }
});
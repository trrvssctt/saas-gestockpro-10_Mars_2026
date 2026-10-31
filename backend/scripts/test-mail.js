/**
 * Script de diagnostic du système d'emailing.
 *
 *   node backend/scripts/test-mail.js                 → vérifie les 3 connexions SMTP
 *   node backend/scripts/test-mail.js --send          → envoie un email de test par boîte
 *   node backend/scripts/test-mail.js --pdf           → génère un reçu PDF de démonstration
 *   node backend/scripts/test-mail.js --renewal       → facture d'échéance J-5 (PDF + email)
 *   node backend/scripts/test-mail.js --all           → tout, plus un reçu envoyé par email
 *   node backend/scripts/test-mail.js --to=x@y.com    → force le destinataire
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __dir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dir, '..', '.env') });

const { MailService, getAdminRecipients } = await import('../services/MailService.js');
const { ReceiptPdfService, buildReceiptHtml } = await import('../services/ReceiptPdfService.js');
const T = await import('../services/MailTemplates.js');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag) || args.includes('--all');
const toArg = args.find((a) => a.startsWith('--to='))?.split('=')[1];
const recipient = toArg || getAdminRecipients()[0];

const line = (s = '') => console.log(s);
const ok = (s) => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const ko = (s) => console.log(`  \x1b[31m✗\x1b[0m ${s}`);

line('\n═══ Diagnostic emailing GeStockPro ═══\n');
line(`Serveur      : ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (secure=${process.env.SMTP_SECURE})`);
line(`Notifications: ${getAdminRecipients().join(', ') || '(aucune)'}`);
line(`Destinataire : ${recipient || '(aucun)'}\n`);

// ─── 1. Connexions SMTP ──────────────────────────────────────────────────────
line('1. Connexion aux 3 boîtes');
const health = await MailService.verifyAll();
for (const [box, r] of Object.entries(health)) {
  if (r.ok) ok(`${box.padEnd(8)} ${r.user}${r.note ? ` (${r.note})` : ''}`);
  else ko(`${box.padEnd(8)} ${r.user || '—'} : ${r.error}`);
}

const anyOk = Object.values(health).some((r) => r.ok);

// ─── 2. Reçu PDF ─────────────────────────────────────────────────────────────
let attachment = null;
if (has('--pdf')) {
  line('\n2. Génération du reçu PDF');
  const fakePayment = {
    id: 'a1b2c3d4-0000-0000-0000-000000000000',
    amount: 45000,
    method: 'WAVE',
    reference: 'TEST-REF-001',
    paymentDate: new Date(),
  };
  const fakeTenant = {
    id: 'tenant-demo',
    name: 'Entreprise Démo SARL',
    address: 'Sacré-Cœur 3, Dakar, Sénégal',
    phone: '+221 77 000 00 00',
    email: recipient || 'demo@example.com',
    currency: 'F CFA',
  };
  attachment = await ReceiptPdfService.buildReceiptAttachment({
    payment: fakePayment,
    tenant: fakeTenant,
    plan: { name: 'PRO' },
  });

  if (attachment) {
    // Dossier de sortie ignoré par git
    const outDir = join(__dir, '..', 'uploads', 'mail-test');
    await fs.mkdir(outDir, { recursive: true });
    const out = join(outDir, 'recu-test.pdf');
    await fs.writeFile(out, attachment.content);
    ok(`PDF généré : ${attachment.filename} (${(attachment.content.length / 1024).toFixed(1)} Ko)`);
    ok(`Copie locale : ${out}`);

    // HTML brut, pratique pour comparer visuellement avec la page Abonnement
    const htmlOut = join(outDir, 'recu-test.html');
    await fs.writeFile(htmlOut, buildReceiptHtml({
      reference: 'F-SUB-A1B2C3D4',
      transactionId: fakePayment.id,
      createdAt: new Date(),
      amount: 45000,
      amountPaid: 45000,
      planName: 'PRO',
      recipient: { companyName: fakeTenant.name, address: fakeTenant.address, phone: fakeTenant.phone, email: fakeTenant.email },
      isValidated: true,
    }));
    ok(`Aperçu HTML  : ${htmlOut}`);
  } else {
    ko('Échec de génération du PDF');
  }
}

// ─── 2 bis. Facture d'échéance ───────────────────────────────────────────────
let renewalAttachment = null;
if (has('--renewal')) {
  line('\n2 bis. Facture d\'échéance (J-5)');
  const dueDate = new Date(Date.now() + 5 * 24 * 3600 * 1000);
  const demoTenant = {
    id: 'a1b2c3d4-0000-0000-0000-000000000000',
    name: 'Entreprise Démo SARL',
    address: 'Sacré-Cœur 3, Dakar, Sénégal',
    phone: '+221 77 000 00 00',
    email: recipient || 'demo@example.com',
    currency: 'F CFA',
  };
  renewalAttachment = await ReceiptPdfService.buildRenewalInvoiceAttachment({
    tenant: demoTenant,
    plan: { name: 'PRO' },
    amount: 45000,
    dueDate,
    periodLabel: '1 mois',
  });

  if (renewalAttachment) {
    const outDir = join(__dir, '..', 'uploads', 'mail-test');
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(join(outDir, 'facture-echeance.pdf'), renewalAttachment.content);
    ok(`Facture générée : ${renewalAttachment.filename} (${(renewalAttachment.content.length / 1024).toFixed(1)} Ko)`);
  } else {
    ko('Échec de génération de la facture');
  }

  if (recipient && health.compta?.ok) {
    const tpl = T.renewalInvoiceClient({
      userName: 'Awa Ndiaye',
      companyName: demoTenant.name,
      amount: 45000,
      planName: 'PRO',
      period: '1 mois',
      dueDate,
      daysLeft: 5,
      reference: 'F-REN-A1B2C3D4-202608',
      autoRenew: true,
      hasPdf: !!renewalAttachment,
    });
    try {
      await MailService.send({
        mailbox: 'compta',
        to: recipient,
        subject: `[TEST] ${tpl.subject}`,
        html: tpl.html,
        attachments: renewalAttachment ? [renewalAttachment] : undefined,
      });
      ok(`Email de facture d'échéance envoyé à ${recipient}`);
    } catch (err) {
      ko(`Envoi de la facture : ${err.message}`);
    }
  }
}

// ─── 3. Envois de test ───────────────────────────────────────────────────────
if (has('--send') && recipient && anyOk) {
  line('\n3. Envoi des emails de test');

  const samples = [
    ['contact', T.welcomeClient({
      userName: 'Awa Ndiaye', companyName: 'Entreprise Démo SARL',
      email: recipient, planName: 'PRO', isTrial: false,
    })],
    ['compta', T.paymentReceiptClient({
      userName: 'Awa Ndiaye', companyName: 'Entreprise Démo SARL',
      amount: 45000, planName: 'PRO', period: '1 mois', method: 'WAVE',
      reference: 'TEST-REF-001', paymentDate: new Date(), hasPdf: !!attachment,
    })],
    ['support', T.supportTicketAck({
      userName: 'Awa Ndiaye', subject: 'Question sur la facturation',
      message: 'Bonjour, je souhaite comprendre le calcul de ma dernière facture.',
      ticketId: 'e5f6a7b8-0000-0000-0000-000000000000', priority: 'NORMAL',
    })],
  ];

  for (const [mailbox, tpl] of samples) {
    if (!health[mailbox]?.ok) { ko(`${mailbox.padEnd(8)} ignoré (connexion KO)`); continue; }
    try {
      await MailService.send({
        mailbox,
        to: recipient,
        subject: `[TEST] ${tpl.subject}`,
        html: tpl.html,
        attachments: mailbox === 'compta' && attachment ? [attachment] : undefined,
      });
      ok(`${mailbox.padEnd(8)} « ${tpl.subject} » envoyé`);
    } catch (err) {
      ko(`${mailbox.padEnd(8)} ${err.message}`);
    }
  }
} else if (has('--send')) {
  line('\n3. Envoi ignoré (aucune connexion SMTP valide ou destinataire manquant)');
}

line('\n═══ Fin du diagnostic ═══\n');
process.exit(anyOk ? 0 : 1);

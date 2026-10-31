/**
 * MailTemplates — gabarits HTML de tous les emails transactionnels.
 *
 * HTML compatible clients mail (tables, styles inline, pas de flex/grid).
 * Chaque fonction retourne `{ subject, html }`.
 */

const APP_URL = () => process.env.APP_URL || 'https://gestock.realtechprint.com';

const BRAND = {
  indigo: '#4f46e5',
  slate900: '#0f172a',
  slate500: '#64748b',
  slate100: '#f1f5f9',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
};

/** Échappe le HTML pour toute donnée provenant d'un utilisateur. */
export const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Formate un montant en F CFA. */
export const money = (amount, currency = 'F CFA') =>
  `${Number(amount || 0).toLocaleString('fr-FR')} ${currency}`;

export const formatDate = (date) =>
  new Date(date || Date.now()).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

export const formatDateTime = (date) =>
  new Date(date || Date.now()).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

/** Gabarit commun : en-tête de marque, contenu, pied de page. */
const layout = ({ title, preheader = '', accent = BRAND.indigo, body, footerNote = '' }) => `
<div style="background-color:#f8fafc;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
      <td style="background:${BRAND.slate900};padding:28px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:${accent};width:38px;height:38px;border-radius:12px;text-align:center;vertical-align:middle;color:#ffffff;font-size:18px;font-weight:800;">G</td>
            <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
              GESTOCK<span style="color:#818cf8;">PRO</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px 12px;">
        <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:800;color:${BRAND.slate900};letter-spacing:-0.5px;">${esc(title)}</h1>
        ${body}
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px 32px;border-top:1px solid ${BRAND.slate100};">
        ${footerNote ? `<p style="margin:0 0 12px;font-size:12px;color:${BRAND.slate500};line-height:1.6;">${footerNote}</p>` : ''}
        <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
          GeStockPro — ERP AI-Native pour PME<br/>
          Centre Technologique, Avenue de l'IA, Dakar, Sénégal<br/>
          <a href="${APP_URL()}" style="color:${BRAND.indigo};text-decoration:none;">${APP_URL()}</a>
        </p>
      </td>
    </tr>
  </table>
</div>`;

const paragraph = (text) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">${text}</p>`;

const button = (label, url, color = BRAND.indigo) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background:${color};border-radius:12px;">
      <a href="${url}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${esc(label)}</a>
    </td>
  </tr>
</table>`;

/** Bloc d'informations clé/valeur. */
const infoTable = (rows, accent = BRAND.indigo) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border-radius:14px;border-left:4px solid ${accent};margin:0 0 20px;">
  <tr><td style="padding:18px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${rows
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(
          ([k, v]) => `<tr>
            <td style="padding:5px 0;font-size:12px;color:${BRAND.slate500};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
            <td style="padding:5px 0 5px 16px;font-size:14px;color:${BRAND.slate900};font-weight:600;text-align:right;">${v}</td>
          </tr>`
        )
        .join('')}
    </table>
  </td></tr>
</table>`;

/** Bloc pré-formaté pour un message libre saisi par un utilisateur. */
const quoteBlock = (text) => `
<div style="background:#f8fafc;border-radius:14px;padding:18px 20px;margin:0 0 20px;border:1px solid #e2e8f0;">
  <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;white-space:pre-wrap;">${esc(text)}</p>
</div>`;

// ─── 1. Inscription ──────────────────────────────────────────────────────────

/** Email de bienvenue envoyé au nouveau client (boîte contact). */
export const welcomeClient = ({ userName, companyName, email, planName, isTrial, trialEndsAt }) => ({
  subject: `Bienvenue sur GeStockPro, ${userName} 🎉`,
  html: layout({
    title: `Bienvenue, ${esc(userName)} !`,
    preheader: `Votre espace ${companyName} est prêt sur GeStockPro.`,
    body:
      paragraph(`Merci d'avoir choisi <strong>GeStockPro</strong>. Le compte de <strong>${esc(companyName)}</strong> vient d'être créé et votre espace de travail est déjà opérationnel.`) +
      infoTable([
        ['Entreprise', esc(companyName)],
        ['Identifiant', esc(email)],
        ['Formule', esc(planName)],
        isTrial && trialEndsAt ? ['Essai jusqu\'au', formatDate(trialEndsAt)] : null,
      ].filter(Boolean)) +
      paragraph('Vous pouvez dès maintenant configurer votre stock, vos clients et votre équipe.') +
      button('Accéder à mon espace', APP_URL()) +
      paragraph(`<strong>Pour bien démarrer :</strong><br/>
        1. Renseignez les informations de votre entreprise dans <em>Paramètres</em><br/>
        2. Importez ou créez vos premiers articles dans <em>Inventaire</em><br/>
        3. Invitez vos collaborateurs depuis <em>Gouvernance</em>`),
    footerNote: `Une question ? Répondez simplement à cet email ou écrivez-nous à <a href="mailto:${esc(process.env.MAIL_SUPPORT_USER || 'support.gestock@realtechprint.com')}" style="color:${BRAND.indigo};">${esc(process.env.MAIL_SUPPORT_USER || 'support.gestock@realtechprint.com')}</a>.`,
  }),
});

/**
 * Inscription sur un plan payant : le client a déclaré son paiement, celui-ci
 * doit être validé par nos services. La facture PDF est jointe.
 */
export const registrationPendingClient = ({
  userName, companyName, email, planName, period, amount, currency = 'F CFA',
  method, reference, invoiceRef, hasPdf = true,
}) => ({
  subject: `Inscription enregistrée — paiement en cours de validation • ${esc(companyName)}`,
  html: layout({
    title: `Bienvenue, ${esc(userName)} !`,
    preheader: `Le compte ${companyName} est créé. Votre paiement est en cours de vérification.`,
    accent: BRAND.amber,
    body:
      paragraph(`Merci d'avoir choisi <strong>GeStockPro</strong>. Le compte de <strong>${esc(companyName)}</strong> a bien été créé.`) +
      paragraph(`Votre paiement a été enregistré et est <strong>en cours de vérification par nos services</strong>. Dès qu'il sera validé, votre espace sera activé et vous recevrez votre reçu officiel.`) +
      infoTable([
        ['Entreprise', esc(companyName)],
        ['Identifiant', esc(email)],
        ['Formule', esc(planName)],
        ['Période', period ? esc(period) : null],
        ['Montant', `<strong>${money(amount, currency)}</strong>`],
        ['Moyen de paiement', method ? esc(method) : null],
        ['Référence transaction', reference ? `<code style="font-size:12px;">${esc(reference)}</code>` : null],
        ['Statut', `<span style="color:${BRAND.amber};font-weight:800;">EN ATTENTE DE VALIDATION</span>`],
        ['N° de facture', invoiceRef ? `<code style="font-size:12px;">${esc(invoiceRef)}</code>` : null],
      ].filter(Boolean), BRAND.amber) +
      (hasPdf
        ? paragraph('📎 <strong>Votre facture au format PDF est jointe à cet email.</strong> Le reçu acquitté vous sera envoyé après validation du paiement.')
        : paragraph('Votre facture sera disponible dans votre espace dès la validation du paiement.')) +
      paragraph('La validation intervient généralement sous 24 heures ouvrées. Vous recevrez un email de confirmation dès que votre espace sera actif.') +
      button('Accéder à mon espace', APP_URL(), BRAND.amber),
    footerNote: `Une question ? Écrivez à <a href="mailto:${esc(process.env.MAIL_SUPPORT_USER || 'support.gestock@realtechprint.com')}" style="color:${BRAND.indigo};">${esc(process.env.MAIL_SUPPORT_USER || 'support.gestock@realtechprint.com')}</a>.`,
  }),
});

/** Notification interne : inscription payante à valider. */
export const adminNewRegistrationPending = ({
  userName, companyName, email, phone, siret, planName, period,
  amount, currency = 'F CFA', method, reference, tenantId, source,
}) => ({
  subject: `⏳ Inscription à valider — ${companyName} • ${money(amount, currency)}`,
  html: layout({
    title: 'Nouvelle inscription en attente de validation',
    preheader: `${companyName} s'est inscrit et a déclaré un paiement de ${money(amount, currency)}.`,
    accent: BRAND.amber,
    body:
      paragraph(`Une nouvelle entreprise vient de s'inscrire sur un plan payant. Le paiement déclaré doit être <strong>vérifié puis validé</strong> depuis la console SuperAdmin pour activer le compte.`) +
      infoTable([
        ['Montant déclaré', `<span style="color:${BRAND.slate900};font-size:17px;font-weight:800;">${money(amount, currency)}</span>`],
        ['Entreprise', esc(companyName)],
        ['Contact', esc(userName)],
        ['Email', `<a href="mailto:${esc(email)}" style="color:${BRAND.indigo};">${esc(email)}</a>`],
        ['Téléphone', phone ? esc(phone) : null],
        ['SIRET', siret ? esc(siret) : null],
        ['Formule', esc(planName)],
        ['Période', period ? esc(period) : null],
        ['Moyen de paiement', method ? esc(method) : null],
        ['Référence transaction', reference ? `<code style="font-size:12px;">${esc(reference)}</code>` : null],
        ['Tenant ID', `<code style="font-size:12px;">${esc(tenantId)}</code>`],
        ['Source', esc(source || 'Formulaire web')],
        ['Reçu le', formatDateTime(new Date())],
      ].filter(Boolean), BRAND.amber) +
      paragraph('<strong>Action requise :</strong> vérifiez la réception effective des fonds, puis validez l\'abonnement dans la console. Le client recevra automatiquement son reçu de paiement.') +
      button('Valider dans la console', APP_URL(), BRAND.amber),
  }),
});

/** Notification interne : nouvelle inscription. */
export const adminNewRegistration = ({ userName, companyName, email, phone, planName, siret, tenantId, source }) => ({
  subject: `🆕 Nouvelle inscription — ${companyName} (${planName})`,
  html: layout({
    title: 'Nouvelle inscription',
    preheader: `${companyName} vient de créer un compte.`,
    accent: BRAND.emerald,
    body:
      paragraph(`Un nouveau compte vient d'être créé sur GeStockPro.`) +
      infoTable([
        ['Entreprise', esc(companyName)],
        ['Contact', esc(userName)],
        ['Email', esc(email)],
        ['Téléphone', phone ? esc(phone) : null],
        ['SIRET', siret ? esc(siret) : null],
        ['Formule', esc(planName)],
        ['Source', esc(source || 'Formulaire web')],
        ['Tenant ID', `<code style="font-size:12px;">${esc(tenantId)}</code>`],
        ['Date', formatDateTime(new Date())],
      ], BRAND.emerald) +
      button('Ouvrir la console SuperAdmin', APP_URL(), BRAND.emerald),
  }),
});

// ─── 2. Paiement ─────────────────────────────────────────────────────────────

/** Reçu de paiement envoyé au client (boîte comptabilité), PDF en pièce jointe. */
export const paymentReceiptClient = ({
  userName, companyName, amount, currency = 'F CFA', planName, period,
  method, reference, paymentDate, subscriptionEndsAt, hasPdf = true,
}) => ({
  subject: `Reçu de paiement — ${money(amount, currency)} • ${reference}`,
  html: layout({
    title: 'Paiement confirmé ✓',
    preheader: `Votre paiement de ${money(amount, currency)} a bien été enregistré.`,
    accent: BRAND.emerald,
    body:
      paragraph(`Bonjour ${esc(userName)},`) +
      paragraph(`Nous confirmons la bonne réception de votre paiement pour l'abonnement <strong>${esc(companyName)}</strong>. Merci de votre confiance.`) +
      infoTable([
        ['Montant réglé', `<span style="color:${BRAND.emerald};font-size:17px;font-weight:800;">${money(amount, currency)}</span>`],
        ['Formule', esc(planName)],
        ['Période', period ? esc(period) : null],
        ['Moyen de paiement', esc(method)],
        ['Référence', `<code style="font-size:12px;">${esc(reference)}</code>`],
        ['Date du paiement', formatDate(paymentDate)],
        subscriptionEndsAt ? ['Abonnement valide jusqu\'au', formatDate(subscriptionEndsAt)] : null,
      ].filter(Boolean), BRAND.emerald) +
      (hasPdf
        ? paragraph('📎 Votre <strong>reçu officiel au format PDF</strong> est joint à cet email. Conservez-le pour votre comptabilité.')
        : paragraph(`Votre reçu officiel est téléchargeable à tout moment depuis la page <em>Abonnement</em> de votre espace.`)) +
      button('Voir mon abonnement', `${APP_URL()}`, BRAND.emerald),
    footerNote: `Pour toute question de facturation, écrivez à <a href="mailto:${esc(process.env.MAIL_COMPTA_USER || 'comptat.gestock@realtechprint.com')}" style="color:${BRAND.indigo};">${esc(process.env.MAIL_COMPTA_USER || 'comptat.gestock@realtechprint.com')}</a>.`,
  }),
});

/** Notification interne : paiement encaissé. */
export const adminNewPayment = ({
  companyName, email, amount, currency = 'F CFA', planName, period,
  method, reference, paymentDate, tenantId,
}) => ({
  subject: `💰 Paiement reçu — ${money(amount, currency)} • ${companyName}`,
  html: layout({
    title: 'Paiement encaissé',
    preheader: `${companyName} a réglé ${money(amount, currency)}.`,
    accent: BRAND.emerald,
    body:
      infoTable([
        ['Montant', `<span style="color:${BRAND.emerald};font-size:17px;font-weight:800;">${money(amount, currency)}</span>`],
        ['Entreprise', esc(companyName)],
        ['Email', esc(email)],
        ['Formule', esc(planName)],
        ['Période', period ? esc(period) : null],
        ['Moyen', esc(method)],
        ['Référence', `<code style="font-size:12px;">${esc(reference)}</code>`],
        ['Date', formatDateTime(paymentDate)],
        ['Tenant ID', `<code style="font-size:12px;">${esc(tenantId)}</code>`],
      ].filter(Boolean), BRAND.emerald) +
      paragraph('Le reçu PDF envoyé au client est joint à cet email.'),
  }),
});

/** Notification interne : paiement en attente de validation manuelle. */
export const adminPendingPayment = ({ companyName, email, amount, currency = 'F CFA', method, reference, tenantId }) => ({
  subject: `⏳ Paiement à valider — ${money(amount, currency)} • ${companyName}`,
  html: layout({
    title: 'Paiement en attente de validation',
    preheader: `${companyName} a déclaré un paiement de ${money(amount, currency)}.`,
    accent: BRAND.amber,
    body:
      paragraph('Un client a déclaré un paiement qui nécessite une validation manuelle depuis la console SuperAdmin.') +
      infoTable([
        ['Montant déclaré', `<strong>${money(amount, currency)}</strong>`],
        ['Entreprise', esc(companyName)],
        ['Email', esc(email)],
        ['Moyen', esc(method)],
        ['Référence', `<code style="font-size:12px;">${esc(reference)}</code>`],
        ['Tenant ID', `<code style="font-size:12px;">${esc(tenantId)}</code>`],
        ['Date', formatDateTime(new Date())],
      ], BRAND.amber) +
      button('Valider dans la console', APP_URL(), BRAND.amber),
  }),
});

/** Accusé au client : paiement déclaré, en attente de validation. */
export const paymentPendingClient = ({ userName, amount, currency = 'F CFA', method, reference }) => ({
  subject: `Paiement en cours de vérification — ${reference}`,
  html: layout({
    title: 'Paiement bien reçu',
    preheader: 'Votre paiement est en cours de vérification.',
    accent: BRAND.amber,
    body:
      paragraph(`Bonjour ${esc(userName)},`) +
      paragraph('Nous avons bien enregistré votre déclaration de paiement. Notre équipe le vérifie et votre abonnement sera activé sous peu — vous recevrez alors votre reçu officiel au format PDF.') +
      infoTable([
        ['Montant', `<strong>${money(amount, currency)}</strong>`],
        ['Moyen', esc(method)],
        ['Référence', `<code style="font-size:12px;">${esc(reference)}</code>`],
        ['Statut', `<span style="color:${BRAND.amber};font-weight:800;">EN VÉRIFICATION</span>`],
      ], BRAND.amber),
  }),
});

// ─── 2 bis. Facture d'échéance (avant fin d'abonnement) ──────────────────────

/**
 * Facture envoyée J-5 avant la fin de l'abonnement, PDF joint.
 * Ton informatif et non alarmiste : c'est un avis d'échéance, pas une relance.
 */
export const renewalInvoiceClient = ({
  userName, companyName, amount, currency = 'F CFA', planName, period,
  dueDate, daysLeft, reference, autoRenew, hasPdf = true,
}) => ({
  subject: `Facture de renouvellement — échéance le ${formatDate(dueDate)} • ${money(amount, currency)}`,
  html: layout({
    title: `Votre abonnement arrive à échéance dans ${daysLeft} jours`,
    preheader: `Facture ${reference} — ${money(amount, currency)} à régler avant le ${formatDate(dueDate)}.`,
    accent: BRAND.amber,
    body:
      paragraph(`Bonjour ${esc(userName)},`) +
      paragraph(`L'abonnement <strong>${esc(companyName)}</strong> arrive à échéance le <strong>${formatDate(dueDate)}</strong>. Vous trouverez ci-dessous le détail de la facture correspondant à la prochaine période.`) +
      infoTable([
        ['Montant à régler', `<span style="color:${BRAND.slate900};font-size:17px;font-weight:800;">${money(amount, currency)}</span>`],
        ['Formule', esc(planName)],
        ['Période reconduite', period ? esc(period) : null],
        ['Date d\'échéance', `<strong>${formatDate(dueDate)}</strong>`],
        ['Référence facture', `<code style="font-size:12px;">${esc(reference)}</code>`],
      ].filter(Boolean), BRAND.amber) +
      (hasPdf
        ? paragraph('📎 <strong>Votre facture au format PDF est jointe à cet email.</strong>')
        : '') +
      paragraph(
        autoRenew
          ? 'Le renouvellement automatique est activé : aucune action n\'est requise de votre part si votre moyen de paiement est à jour.'
          : 'Pour éviter toute interruption de service, réglez cette facture avant la date d\'échéance depuis votre espace.'
      ) +
      button('Régler mon abonnement', APP_URL(), BRAND.amber) +
      paragraph(`Si le règlement a déjà été effectué, considérez cet email comme sans objet.`),
    footerNote: `Une question sur cette facture ? Écrivez à <a href="mailto:${esc(process.env.MAIL_COMPTA_USER || 'comptat.gestock@realtechprint.com')}" style="color:${BRAND.indigo};">${esc(process.env.MAIL_COMPTA_USER || 'comptat.gestock@realtechprint.com')}</a> en rappelant la référence ${esc(reference)}.`,
  }),
});

/** Récapitulatif interne de la campagne de facturation quotidienne. */
export const adminRenewalDigest = ({ daysBefore, sent, failed, skipped, rows }) => ({
  subject: `📅 Factures d'échéance J-${daysBefore} — ${sent} envoyée(s)${failed ? `, ${failed} échec(s)` : ''}`,
  html: layout({
    title: `Campagne de facturation J-${daysBefore}`,
    preheader: `${sent} facture(s) envoyée(s), ${failed} échec(s).`,
    accent: failed > 0 ? BRAND.rose : BRAND.indigo,
    body:
      infoTable([
        ['Factures envoyées', `<strong style="color:${BRAND.emerald};">${sent}</strong>`],
        ['Échecs', failed ? `<strong style="color:${BRAND.rose};">${failed}</strong>` : '0'],
        ['Déjà notifiés (ignorés)', String(skipped)],
        ['Exécuté le', formatDateTime(new Date())],
      ], failed > 0 ? BRAND.rose : BRAND.indigo) +
      (rows?.length
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;font-size:13px;">
            <tr style="background:${BRAND.slate900};color:#ffffff;">
              <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Entreprise</th>
              <th style="padding:10px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Montant</th>
              <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Échéance</th>
              <th style="padding:10px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Statut</th>
            </tr>
            ${rows
              .map(
                (r) => `<tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:10px;color:${BRAND.slate900};font-weight:600;">${esc(r.company)}</td>
                  <td style="padding:10px;text-align:right;font-weight:700;">${money(r.amount, r.currency)}</td>
                  <td style="padding:10px;color:${BRAND.slate500};">${formatDate(r.dueDate)}</td>
                  <td style="padding:10px;text-align:center;color:${r.ok ? BRAND.emerald : BRAND.rose};font-weight:800;">${r.ok ? '✓' : '✗'}</td>
                </tr>`
              )
              .join('')}
          </table>`
        : paragraph('Aucun abonnement n\'arrivait à échéance aujourd\'hui.')),
  }),
});

// ─── 3. Formulaire de contact ────────────────────────────────────────────────

/** Accusé de réception au visiteur (boîte contact). */
export const contactAck = ({ fullName, message }) => ({
  subject: 'Nous avons bien reçu votre message — GeStockPro',
  html: layout({
    title: 'Message bien reçu',
    preheader: 'Notre équipe vous répond sous 24 h ouvrées.',
    body:
      paragraph(`Bonjour ${esc(fullName)},`) +
      paragraph('Merci de nous avoir contactés. Votre message est arrivé à notre équipe, qui vous répondra sous <strong>24 heures ouvrées</strong>.') +
      paragraph('<strong>Rappel de votre message :</strong>') +
      quoteBlock(message) +
      paragraph('En attendant, découvrez tout ce que GeStockPro peut faire pour votre entreprise.') +
      button('Découvrir GeStockPro', APP_URL()),
  }),
});

/** Notification interne : nouveau message de contact. */
export const adminNewContactMessage = ({ fullName, email, phone, message, ipAddress, messageId }) => ({
  subject: `📩 Nouveau message de contact — ${fullName}`,
  html: layout({
    title: 'Nouveau message de contact',
    preheader: `${fullName} (${email}) vous a écrit.`,
    body:
      infoTable([
        ['Nom', esc(fullName)],
        ['Email', `<a href="mailto:${esc(email)}" style="color:${BRAND.indigo};">${esc(email)}</a>`],
        ['Téléphone', phone ? esc(phone) : null],
        ['IP', ipAddress ? `<code style="font-size:12px;">${esc(ipAddress)}</code>` : null],
        ['Reçu le', formatDateTime(new Date())],
        ['Message ID', messageId ? `<code style="font-size:12px;">${esc(messageId)}</code>` : null],
      ].filter(Boolean)) +
      paragraph('<strong>Message :</strong>') +
      quoteBlock(message) +
      paragraph(`Répondez directement à cet email pour écrire à <strong>${esc(fullName)}</strong>.`),
  }),
});

// ─── 4. Support ──────────────────────────────────────────────────────────────

const PRIORITY_COLORS = { URGENT: BRAND.rose, HIGH: BRAND.amber, NORMAL: BRAND.indigo, LOW: BRAND.slate500 };

/** Accusé de réception du ticket au client (boîte support). */
export const supportTicketAck = ({ userName, subject, message, ticketId, priority }) => ({
  subject: `[Ticket #${String(ticketId).slice(0, 8).toUpperCase()}] ${subject}`,
  html: layout({
    title: 'Votre demande est enregistrée',
    preheader: `Ticket #${String(ticketId).slice(0, 8).toUpperCase()} ouvert.`,
    body:
      paragraph(`Bonjour ${esc(userName)},`) +
      paragraph('Votre demande d\'assistance a bien été enregistrée. Notre équipe support la traite et reviendra vers vous rapidement.') +
      infoTable([
        ['Numéro de ticket', `<code style="font-size:12px;">#${esc(String(ticketId).slice(0, 8).toUpperCase())}</code>`],
        ['Sujet', esc(subject)],
        ['Priorité', `<span style="color:${PRIORITY_COLORS[priority] || BRAND.indigo};font-weight:800;">${esc(priority || 'NORMAL')}</span>`],
        ['Ouvert le', formatDateTime(new Date())],
      ]) +
      paragraph('<strong>Votre demande :</strong>') +
      quoteBlock(message),
    footerNote: 'Conservez ce numéro de ticket pour tout échange ultérieur.',
  }),
});

/** Notification interne : nouveau ticket support. */
export const adminNewSupportTicket = ({
  userName, userEmail, companyName, subject, message, ticketId, priority, category, tenantId,
}) => ({
  subject: `🎫 [${priority || 'NORMAL'}] Ticket support — ${subject}`,
  html: layout({
    title: 'Nouveau ticket support',
    preheader: `${companyName} — ${subject}`,
    accent: PRIORITY_COLORS[priority] || BRAND.indigo,
    body:
      infoTable([
        ['Ticket', `<code style="font-size:12px;">#${esc(String(ticketId).slice(0, 8).toUpperCase())}</code>`],
        ['Priorité', `<span style="color:${PRIORITY_COLORS[priority] || BRAND.indigo};font-weight:800;">${esc(priority || 'NORMAL')}</span>`],
        ['Catégorie', esc(category || 'OTHER')],
        ['Entreprise', esc(companyName)],
        ['Demandeur', esc(userName)],
        ['Email', `<a href="mailto:${esc(userEmail)}" style="color:${BRAND.indigo};">${esc(userEmail)}</a>`],
        ['Tenant ID', `<code style="font-size:12px;">${esc(tenantId)}</code>`],
        ['Ouvert le', formatDateTime(new Date())],
      ], PRIORITY_COLORS[priority] || BRAND.indigo) +
      paragraph(`<strong>Sujet :</strong> ${esc(subject)}`) +
      quoteBlock(message) +
      button('Traiter dans la console', APP_URL(), PRIORITY_COLORS[priority] || BRAND.indigo),
  }),
});

// ─── 5. Sécurité / mots de passe ─────────────────────────────────────────────

/** Mot de passe réinitialisé par un administrateur (boîte support). */
export const passwordResetByAdmin = ({ userName, email, newPassword, operatorName }) => ({
  subject: '🔐 Votre mot de passe GeStockPro a été réinitialisé',
  html: layout({
    title: 'Mot de passe réinitialisé',
    preheader: 'Voici votre nouveau mot de passe temporaire.',
    accent: BRAND.amber,
    body:
      paragraph(`Bonjour ${esc(userName)},`) +
      paragraph(`Le mot de passe de votre compte GeStockPro vient d'être réinitialisé${operatorName ? ` par <strong>${esc(operatorName)}</strong>` : ''}.`) +
      infoTable([
        ['Identifiant', esc(email)],
        ['Nouveau mot de passe', `<code style="font-size:15px;font-weight:800;background:#fff7ed;padding:5px 10px;border-radius:6px;color:${BRAND.slate900};letter-spacing:0.5px;">${esc(newPassword)}</code>`],
        ['Réinitialisé le', formatDateTime(new Date())],
      ], BRAND.amber) +
      paragraph(`<strong>⚠️ Important :</strong> connectez-vous avec ce mot de passe puis changez-le immédiatement depuis <em>Paramètres → Sécurité</em>.`) +
      button('Me connecter', APP_URL(), BRAND.amber),
    footerNote: 'Si vous n\'êtes pas à l\'origine de cette demande, contactez immédiatement notre support.',
  }),
});

/** Notification de sécurité après un changement de mot de passe volontaire. */
export const passwordChangedNotice = ({ userName, email, ipAddress }) => ({
  subject: '🔐 Votre mot de passe GeStockPro a été modifié',
  html: layout({
    title: 'Mot de passe modifié',
    preheader: 'Confirmation du changement de votre mot de passe.',
    body:
      paragraph(`Bonjour ${esc(userName)},`) +
      paragraph('Le mot de passe de votre compte GeStockPro a bien été modifié.') +
      infoTable([
        ['Compte', esc(email)],
        ['Modifié le', formatDateTime(new Date())],
        ['Adresse IP', ipAddress ? `<code style="font-size:12px;">${esc(ipAddress)}</code>` : null],
      ].filter(Boolean)) +
      paragraph(`Si vous n'êtes pas à l'origine de ce changement, <strong>contactez immédiatement notre support</strong> à <a href="mailto:${esc(process.env.MAIL_SUPPORT_USER || 'support.gestock@realtechprint.com')}" style="color:${BRAND.indigo};">${esc(process.env.MAIL_SUPPORT_USER || 'support.gestock@realtechprint.com')}</a>.`),
  }),
});

// ─── 6. Message libre SuperAdmin (relance, annonce…) ─────────────────────────

/** Email personnalisé envoyé depuis la console SuperAdmin. */
export const superAdminMessage = ({ subject, body, recipientName }) => ({
  subject: subject || 'Message de l\'équipe GeStockPro',
  html: layout({
    title: subject || 'Message de l\'équipe GeStockPro',
    preheader: String(body || '').slice(0, 120),
    body:
      (recipientName ? paragraph(`Bonjour ${esc(recipientName)},`) : '') +
      `<div style="font-size:15px;line-height:1.7;color:#334155;white-space:pre-wrap;">${esc(body || '')}</div>` +
      button('Accéder à mon espace', APP_URL()),
    footerNote: `Ce message vous est adressé par l'équipe GeStockPro. Répondez à cet email pour nous joindre.`,
  }),
});

export default {
  welcomeClient,
  adminNewRegistration,
  registrationPendingClient,
  adminNewRegistrationPending,
  paymentReceiptClient,
  adminNewPayment,
  adminPendingPayment,
  paymentPendingClient,
  renewalInvoiceClient,
  adminRenewalDigest,
  contactAck,
  adminNewContactMessage,
  supportTicketAck,
  adminNewSupportTicket,
  passwordResetByAdmin,
  passwordChangedNotice,
  superAdminMessage,
};

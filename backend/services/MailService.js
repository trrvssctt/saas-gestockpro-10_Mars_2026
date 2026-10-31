import nodemailer from 'nodemailer';

/**
 * MailService — point d'entrée unique pour tous les envois d'emails.
 *
 * Trois boîtes métier distinctes (comptes SMTP séparés sur mail.realtechprint.com) :
 *   • contact  → inscriptions, accusés de réception du formulaire de contact
 *   • compta   → reçus de paiement, factures d'abonnement
 *   • support  → tickets, réinitialisation de mot de passe, relances SuperAdmin
 *
 * Toutes les notifications internes partent vers MAIL_ADMIN_NOTIFY.
 *
 * Les transporteurs sont créés en lazy (après le chargement de dotenv) et mis en
 * cache. `safeSend` ne lève jamais : un échec SMTP ne doit pas casser une
 * inscription ou un webhook de paiement.
 */

const MAILBOXES = {
  contact: { userVar: 'MAIL_CONTACT_USER', passVar: 'MAIL_CONTACT_PASS', label: 'GeStockPro' },
  compta:  { userVar: 'MAIL_COMPTA_USER',  passVar: 'MAIL_COMPTA_PASS',  label: 'GeStockPro Facturation' },
  support: { userVar: 'MAIL_SUPPORT_USER', passVar: 'MAIL_SUPPORT_PASS', label: 'GeStockPro Support' },
};

const transporterCache = new Map();

const isEnabled = () => String(process.env.MAIL_ENABLED ?? 'true').toLowerCase() !== 'false';

/** Résout les identifiants d'une boîte, avec repli sur le SMTP_USER/SMTP_PASS legacy. */
const resolveCredentials = (mailbox) => {
  const def = MAILBOXES[mailbox] || MAILBOXES.contact;
  const user = process.env[def.userVar] || process.env.SMTP_USER || null;
  const pass = process.env[def.passVar] || process.env.SMTP_PASS || null;
  return { user, pass, label: def.label };
};

/**
 * Construit un transporteur. `alternate` bascule sur le port opposé
 * (465 SSL ↔ 587 STARTTLS) pour le repli automatique.
 */
const buildTransport = (user, pass, alternate = false) => {
  const host = process.env.SMTP_HOST || 'mail.realtechprint.com';
  const basePort = Number(process.env.SMTP_PORT) || 465;
  const baseSecure = String(process.env.SMTP_SECURE ?? 'true').toLowerCase() === 'true';

  const port = alternate ? (baseSecure ? 587 : 465) : basePort;
  const secure = alternate ? !baseSecure : baseSecure;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    // Les hébergements mutualisés présentent souvent un certificat au nom du
    // serveur et non du domaine — d'où l'option de désactiver la vérification.
    tls: {
      rejectUnauthorized:
        String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED ?? 'false').toLowerCase() === 'true',
    },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
  });
};

const getTransporter = (mailbox, alternate = false) => {
  const cacheKey = `${mailbox}:${alternate ? 'alt' : 'main'}`;
  if (transporterCache.has(cacheKey)) return transporterCache.get(cacheKey);

  const { user, pass } = resolveCredentials(mailbox);
  const transporter = buildTransport(user, pass, alternate);
  transporterCache.set(cacheKey, transporter);
  return transporter;
};

/** Adresse `From` complète : "GeStockPro Facturation <compta@…>". */
const buildFrom = (mailbox) => {
  const { user, label } = resolveCredentials(mailbox);
  const name = process.env.MAIL_FROM_NAME ? `${process.env.MAIL_FROM_NAME}` : label;
  const address = user || process.env.SMTP_FROM || 'no-reply@realtechprint.com';
  const displayName = mailbox === 'contact' ? name : label;
  return `"${displayName}" <${address}>`;
};

/** Liste des destinataires des notifications internes. */
export const getAdminRecipients = () =>
  (process.env.MAIL_ADMIN_NOTIFY || 'diankaseydou52@gmail.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Erreurs réseau/TLS justifiant un second essai sur le port alternatif. */
const isConnectionError = (err) =>
  ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNREFUSED', 'ECONNRESET', 'EDNS'].includes(err?.code) ||
  /timeout|socket|connect|tls|ssl|wrong version/i.test(String(err?.message || ''));

export class MailService {
  /**
   * Envoie un email. Lève en cas d'échec définitif — préférer `safeSend`
   * depuis un contrôleur.
   *
   * @param {object}   opts
   * @param {'contact'|'compta'|'support'} opts.mailbox  Boîte expéditrice
   * @param {string|string[]} opts.to        Destinataire(s)
   * @param {string}   opts.subject
   * @param {string}   opts.html
   * @param {string}   [opts.text]           Version texte (générée si absente)
   * @param {string}   [opts.replyTo]
   * @param {Array}    [opts.attachments]    Format nodemailer
   */
  static async send({ mailbox = 'contact', to, subject, html, text, replyTo, attachments } = {}) {
    if (!isEnabled()) {
      console.warn(`[MAIL] Envoi désactivé (MAIL_ENABLED=false) — "${subject}" vers ${to}`);
      return { skipped: true };
    }

    const recipients = Array.isArray(to) ? to.filter(Boolean).join(',') : to;
    if (!recipients) throw new Error('Destinataire manquant');

    const mailOptions = {
      from: buildFrom(mailbox),
      to: recipients,
      subject,
      html,
      text: text || String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      ...(replyTo ? { replyTo } : {}),
      ...(attachments?.length ? { attachments } : {}),
    };

    try {
      const info = await getTransporter(mailbox).sendMail(mailOptions);
      console.log(`[MAIL:${mailbox}] ✓ "${subject}" → ${recipients} (${info.messageId})`);
      return info;
    } catch (err) {
      if (!isConnectionError(err)) {
        console.error(`[MAIL:${mailbox}] ✗ "${subject}" → ${recipients} :`, err.message);
        throw err;
      }
      // Repli : le serveur refuse peut-être le port configuré (465 vs 587)
      console.warn(`[MAIL:${mailbox}] Port principal injoignable (${err.code || err.message}), essai sur le port alternatif…`);
      const info = await getTransporter(mailbox, true).sendMail(mailOptions);
      console.log(`[MAIL:${mailbox}] ✓ (port alternatif) "${subject}" → ${recipients} (${info.messageId})`);
      return info;
    }
  }

  /**
   * Variante non bloquante : journalise l'erreur et retourne `null`.
   * À utiliser partout où l'email est un effet de bord (inscription, webhook…).
   */
  static async safeSend(opts) {
    try {
      return await MailService.send(opts);
    } catch (err) {
      console.error(`[MAIL] Échec d'envoi non bloquant "${opts?.subject}" :`, err.message);
      return null;
    }
  }

  /** Envoie une notification interne à MAIL_ADMIN_NOTIFY. */
  static async notifyAdmin({ mailbox = 'contact', subject, html, replyTo, attachments } = {}) {
    const to = getAdminRecipients();
    if (!to.length) return null;
    return MailService.safeSend({ mailbox, to, subject, html, replyTo, attachments });
  }

  /**
   * Teste la connexion des trois boîtes. Utilisé par le script de diagnostic
   * et par la route SuperAdmin /api/admin/mail/health.
   */
  static async verifyAll() {
    const results = {};
    for (const mailbox of Object.keys(MAILBOXES)) {
      const { user } = resolveCredentials(mailbox);
      if (!user) {
        results[mailbox] = { ok: false, user: null, error: 'Identifiants non configurés' };
        continue;
      }
      try {
        await getTransporter(mailbox).verify();
        results[mailbox] = { ok: true, user };
      } catch (err) {
        try {
          await getTransporter(mailbox, true).verify();
          results[mailbox] = { ok: true, user, note: 'Connecté via le port alternatif' };
        } catch (err2) {
          results[mailbox] = { ok: false, user, error: err2.message };
        }
      }
    }
    return results;
  }
}

export default MailService;

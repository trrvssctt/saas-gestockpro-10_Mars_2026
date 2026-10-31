/**
 * ReceiptPdfService — génère le reçu / facture d'abonnement au format PDF.
 *
 * Le rendu reproduit exactement le document affiché côté client par
 * `components/DocumentPreview.tsx` en mode `SUBSCRIPTION_INVOICE` (celui que
 * l'utilisateur télécharge depuis la page Abonnement) : mêmes blocs, mêmes
 * couleurs, même mise en page A4.
 *
 * Les classes Tailwind du composant React sont transposées en CSS inline —
 * Tailwind n'existe pas côté serveur.
 */

// ─── Palette Tailwind utilisée par DocumentPreview ───────────────────────────
const C = {
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate100: '#f1f5f9',
  slate50:  '#f8fafc',
  indigo600: '#4f46e5',
  indigo500: '#6366f1',
  indigo50:  '#eef2ff',
  emerald600: '#059669',
  emerald50:  '#ecfdf5',
  emerald100: '#d1fae5',
  rose600: '#e11d48',
  white: '#ffffff',
};

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const num = (v) => Number(v || 0).toLocaleString('fr-FR');

/** Icônes Lucide (mêmes que le composant React) en SVG inline. */
const icon = (name, size, color) => {
  const paths = {
    globe:
      '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    mapPin:
      '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail:
      '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    checkCircle:
      '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;">${paths[name]}</svg>`;
};

/** Émetteur du document — identique à `issuer` dans DocumentPreview. */
const ISSUER = {
  name: 'GESTOCKPRO SaaS',
  address: "Centre Technologique, Avenue de l'IA, Dakar, Sénégal",
  phone: '+221 78 131 13 71',
  email: 'diankaseydou@gestock.pro',
};

/**
 * Construit le HTML A4 du reçu d'abonnement.
 * @param {object} data
 * @param {string} data.reference       Ex. « F-SUB-1A2B3C4D »
 * @param {string} data.transactionId   ID de paiement (pied de page)
 * @param {Date|string} data.createdAt  Date d'émission
 * @param {number} data.amount          Montant TTC
 * @param {number} data.amountPaid      Montant réglé
 * @param {string} data.currency
 * @param {string} data.planName
 * @param {object} data.recipient       { companyName, address, phone, email }
 * @param {boolean} data.isValidated    Affiche le cachet « GESTORPRO »
 * @param {string} [data.legalNote]     Mention légale (bas du bloc client)
 * @param {string} [data.itemLabel]     Désignation de la ligne de facturation
 */
export const buildReceiptHtml = (data) => {
  const {
    reference, transactionId, createdAt, amount, amountPaid,
    currency = 'F CFA', planName, recipient = {}, isValidated = true,
    legalNote, itemLabel,
  } = data;

  const totalTtc = Number(amount || 0);
  const paid = Number(amountPaid ?? amount ?? 0);
  const remaining = Math.max(0, totalTtc - paid);
  const isPaid = paid >= totalTtc;
  const recipientName = recipient.companyName || 'Mon Entreprise';
  const itemName = itemLabel || `Abonnement GeStockPro Cloud - Plan ${planName || 'Standard'}`;
  const note = legalNote || 'Facture acquittée. Merci de votre confiance en GeStocPro.';

  const contactLine = (iconName, value) => `
    <p style="display:flex;align-items:center;gap:6px;margin:0 0 2px;">
      ${icon(iconName, 9, C.indigo500)}<span>${esc(value || '')}</span>
    </p>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: ${C.slate800};
    background: ${C.white};
  }
  .doc-page {
    background: ${C.white};
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 40px 48px;
    display: flex;
    flex-direction: column;
  }
  table { border-collapse: separate; border-spacing: 0; width: 100%; }
</style></head>
<body>
<div class="doc-page">

  <!-- ══ EN-TÊTE ══ -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${C.slate900};padding-bottom:32px;">
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:40px;height:40px;background:${C.indigo600};border-radius:16px;display:flex;align-items:center;justify-content:center;">
          ${icon('globe', 20, C.white)}
        </div>
        <div style="font-size:24px;font-weight:900;color:${C.slate900};text-transform:uppercase;letter-spacing:-0.05em;line-height:1;">
          GESTOCK<span style="color:${C.indigo600};">PRO</span>
        </div>
      </div>
      <div style="font-size:9px;text-transform:uppercase;font-weight:700;color:${C.slate500};line-height:1.5;">
        ${contactLine('mapPin', ISSUER.address)}
        ${contactLine('phone', ISSUER.phone)}
        ${contactLine('mail', ISSUER.email)}
      </div>
    </div>
    <div style="text-align:right;">
      <h1 style="font-size:30px;font-weight:900;color:${C.slate900};letter-spacing:-0.05em;margin:0 0 6px;line-height:1.1;">FACTURE SERVICES</h1>
      <p style="margin:0;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;color:${C.indigo600};background:${C.indigo50};padding:4px 12px;border-radius:8px;display:inline-block;">
        Ref: #${esc(reference)}
      </p>
      <p style="font-size:9px;font-weight:900;color:${C.slate400};margin:12px 0 0;text-transform:uppercase;letter-spacing:0.1em;">
        Date d'émission : ${new Date(createdAt || Date.now()).toLocaleDateString('fr-FR')}
      </p>
    </div>
  </div>

  <!-- ══ BLOC CLIENT ══ -->
  <div style="display:flex;gap:32px;margin-top:32px;">
    <div style="flex:1;padding:24px;background:${C.slate50};border-radius:24px;border:1px solid ${C.slate100};box-shadow:inset 0 2px 4px 0 rgba(0,0,0,0.05);">
      <p style="font-size:10px;font-weight:900;color:${C.slate400};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">
        Client / Destinataire
      </p>
      <h2 style="font-size:18px;font-weight:900;color:${C.slate900};text-transform:uppercase;margin:0 0 6px;line-height:1.2;">
        ${esc(recipientName)}
      </h2>
      <div style="font-size:12px;color:${C.slate600};font-weight:500;line-height:1.6;">
        <p style="margin:0 0 2px;">${esc(recipient.address || 'Vente Directe')}</p>
        <p style="margin:0 0 2px;">${esc(recipient.phone || '')}</p>
        <p style="margin:0;">${esc(recipient.email || '')}</p>
      </div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right;gap:12px;">
      ${
        isPaid || isValidated
          ? `<div style="display:inline-flex;align-items:center;gap:8px;color:${C.emerald600};background:${C.emerald50};padding:8px 16px;border-radius:16px;border:1px solid ${C.emerald100};">
              ${icon('checkCircle', 18, C.emerald600)}
              <span style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:-0.025em;">SOLDE ENCAISSÉ</span>
             </div>`
          : ''
      }
      <div style="font-size:9px;color:${C.slate400};font-weight:700;text-transform:uppercase;letter-spacing:0.1em;line-height:1.3;">
        Note légale :<br/>
        <span style="color:${C.slate900};font-weight:900;font-style:italic;">
          ${esc(note)}
        </span>
      </div>
    </div>
  </div>

  <!-- ══ TABLEAU DES ARTICLES ══ -->
  <div style="margin-top:24px;flex:1;">
    <table>
      <thead>
        <tr style="background:${C.slate900};color:${C.white};font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;">
          <th style="padding:16px;text-align:left;border-radius:16px 0 0 16px;">RÉFÉRENCE</th>
          <th style="padding:16px;text-align:left;">DÉSIGNATION</th>
          <th style="padding:16px;text-align:center;">QTÉ</th>
          <th style="padding:16px;text-align:right;">P.U TTC</th>
          <th style="padding:16px;text-align:right;border-radius:0 16px 16px 0;">TOTAL TTC</th>
        </tr>
      </thead>
      <tbody>
        <tr style="font-size:14px;font-weight:700;border-bottom:1px solid ${C.slate100};">
          <td style="padding:16px;">
            <span style="font-size:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:${C.slate400};">GSP-SaaS</span>
          </td>
          <td style="padding:16px;">
            <p style="margin:0;color:${C.slate900};text-transform:uppercase;letter-spacing:-0.025em;">${esc(itemName)}</p>
          </td>
          <td style="padding:16px;text-align:center;font-weight:900;">1</td>
          <td style="padding:16px;text-align:right;font-weight:500;">${num(totalTtc)}</td>
          <td style="padding:16px;text-align:right;font-weight:900;">${num(totalTtc)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ══ TOTAUX ══ -->
  <div style="margin-top:32px;display:flex;justify-content:flex-end;">
    <div style="width:288px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:20px;background:${C.slate900};color:${C.white};border-radius:32px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
        <span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">NET À PAYER</span>
        <span style="font-size:20px;font-weight:900;">${num(totalTtc)} <span style="font-size:12px;">${esc(currency)}</span></span>
      </div>
      <div style="padding:0 20px;margin-top:12px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:${C.emerald600};text-transform:uppercase;letter-spacing:0.1em;">
          <span>DÉJÀ RÉGLÉ</span>
          <span>${paid > 0 ? '-' : ''}${num(paid)} ${esc(currency)}</span>
        </div>
        ${
          remaining > 0
            ? `<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;color:${C.rose600};text-transform:uppercase;letter-spacing:0.1em;padding-top:6px;margin-top:6px;border-top:1px solid ${C.slate100};">
                 <span>SOLDE À PAYER</span><span>${num(remaining)} ${esc(currency)}</span>
               </div>`
            : ''
        }
      </div>
    </div>
  </div>

  <!-- ══ PIED DE PAGE ══ -->
  <div style="padding-top:24px;border-top:1px solid ${C.slate100};margin-top:auto;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:8px;color:${C.slate300};font-weight:700;text-transform:uppercase;font-style:italic;line-height:1.6;">
        <p style="margin:0 0 4px;">GeStocPro AI-Native SaaS • Kernel Cloud AlwaysData v3.2</p>
        <p style="margin:0 0 4px;">Généré automatiquement par le moteur de facturation GeStockPro.</p>
        <p style="margin:12px 0 0;">ID TRANSACTION : ${esc(String(transactionId || '').toUpperCase())}</p>
      </div>
      <div style="text-align:center;width:224px;">
        <p style="font-size:10px;font-weight:900;color:${C.slate900};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;text-decoration:underline;text-decoration-color:${C.indigo500};text-underline-offset:8px;text-decoration-thickness:2px;">
          VISA &amp; CACHET
        </p>
        <div style="height:96px;display:flex;align-items:center;justify-content:center;">
          ${
            isValidated
              ? `<div style="border:4px solid rgba(79,70,229,0.3);color:${C.indigo600};border-radius:9999px;padding:6px 20px;transform:rotate(12deg);font-weight:900;text-transform:uppercase;font-size:18px;">GESTORPRO</div>`
              : `<div style="width:100%;height:80px;border:2px dashed ${C.slate100};border-radius:12px;"></div>`
          }
        </div>
      </div>
    </div>
  </div>

</div>
</body></html>`;
};

/** Rend un HTML en PDF A4 via Puppeteer. */
const renderPdf = async (html) => {
  const puppeteer = (await import('puppeteer')).default;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: ['load', 'domcontentloaded'], timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

export class ReceiptPdfService {
  /**
   * Génère le reçu d'abonnement et retourne une pièce jointe nodemailer.
   * Ne lève jamais : retourne `null` si la génération échoue, l'email doit
   * partir même sans PDF.
   *
   * @param {object} params
   * @param {object} params.payment  Instance Payment (id, amount, method, reference, paymentDate)
   * @param {object} params.tenant   Instance Tenant
   * @param {object} [params.plan]   Instance Plan
   * @returns {Promise<{filename:string, content:Buffer, contentType:string}|null>}
   */
  static async buildReceiptAttachment({ payment, tenant, plan }) {
    try {
      const reference = `F-SUB-${String(payment.id).slice(0, 8).toUpperCase()}`;
      const html = buildReceiptHtml({
        reference,
        transactionId: String(payment.id),
        createdAt: payment.paymentDate || payment.createdAt || new Date(),
        amount: payment.amount,
        amountPaid: payment.amount,
        currency: tenant?.currency || 'F CFA',
        planName: plan?.name || 'Standard',
        recipient: {
          companyName: tenant?.name || 'Mon Entreprise',
          address: tenant?.address || '',
          phone: tenant?.phone || '',
          email: tenant?.email || '',
        },
        isValidated: true,
      });

      const buffer = await renderPdf(html);
      if (!buffer || buffer.length === 0) throw new Error('PDF vide');

      return {
        filename: `Recu-GeStockPro-${reference}.pdf`,
        content: Buffer.from(buffer),
        contentType: 'application/pdf',
      };
    } catch (err) {
      console.error('[ReceiptPdfService] Génération du reçu PDF échouée :', err.message);
      return null;
    }
  }

  /**
   * Génère une facture non acquittée (solde entièrement dû, pas de cachet).
   * Base commune aux factures d'échéance et aux factures d'inscription.
   *
   * Ne lève jamais : retourne `null` si la génération échoue.
   *
   * @param {object} params
   * @param {object} params.tenant       Instance Tenant
   * @param {object} [params.plan]       Instance Plan
   * @param {number} params.amount       Montant à régler
   * @param {string} params.reference    Référence affichée sur la facture
   * @param {string} params.itemLabel    Désignation de la ligne
   * @param {string} params.legalNote    Mention légale
   * @param {string} [params.transactionId]
   * @returns {Promise<{filename:string, content:Buffer, contentType:string}|null>}
   */
  static async buildInvoiceAttachment({ tenant, plan, amount, reference, itemLabel, legalNote, transactionId }) {
    try {
      const html = buildReceiptHtml({
        reference,
        transactionId: transactionId || reference,
        createdAt: new Date(),
        amount,
        amountPaid: 0, // facture à régler → solde entièrement dû
        currency: tenant?.currency || 'F CFA',
        planName: plan?.name || 'Standard',
        itemLabel,
        legalNote,
        recipient: {
          companyName: tenant?.name || 'Mon Entreprise',
          address: tenant?.address || '',
          phone: tenant?.phone || '',
          email: tenant?.email || '',
        },
        isValidated: false,
      });

      const buffer = await renderPdf(html);
      if (!buffer || buffer.length === 0) throw new Error('PDF vide');

      return {
        filename: `Facture-GeStockPro-${reference}.pdf`,
        content: Buffer.from(buffer),
        contentType: 'application/pdf',
      };
    } catch (err) {
      console.error('[ReceiptPdfService] Génération de la facture échouée :', err.message);
      return null;
    }
  }

  /** Facture d'échéance envoyée avant le renouvellement de l'abonnement. */
  static async buildRenewalInvoiceAttachment({ tenant, plan, amount, dueDate, reference, periodLabel }) {
    const ref = reference || `F-REN-${String(tenant.id).slice(0, 8).toUpperCase()}`;
    return ReceiptPdfService.buildInvoiceAttachment({
      tenant, plan, amount, reference: ref,
      transactionId: `RENEWAL-${String(tenant.id).slice(0, 8)}`,
      itemLabel: `Renouvellement abonnement GeStockPro Cloud - Plan ${plan?.name || 'Standard'}${periodLabel ? ` (${periodLabel})` : ''}`,
      legalNote: `À régler avant le ${new Date(dueDate).toLocaleDateString('fr-FR')} pour éviter toute interruption de service.`,
    });
  }

  /**
   * Facture d'inscription — paiement déclaré par le client, en attente de
   * validation par l'administrateur.
   */
  static async buildRegistrationInvoiceAttachment({ tenant, plan, amount, payment, periodLabel }) {
    const ref = payment?.id
      ? `F-SUB-${String(payment.id).slice(0, 8).toUpperCase()}`
      : `F-SUB-${String(tenant.id).slice(0, 8).toUpperCase()}`;
    return ReceiptPdfService.buildInvoiceAttachment({
      tenant, plan, amount, reference: ref,
      transactionId: String(payment?.id || tenant.id),
      itemLabel: `Abonnement GeStockPro Cloud - Plan ${plan?.name || 'Standard'}${periodLabel ? ` (${periodLabel})` : ''}`,
      legalNote: payment?.reference
        ? `Paiement déclaré (réf. ${payment.reference}) — en attente de validation par nos services.`
        : 'En attente de validation du paiement par nos services.',
    });
  }
}

export default ReceiptPdfService;

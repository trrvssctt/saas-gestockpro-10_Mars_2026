-- Migration : suivi de l'envoi des factures d'échéance
-- Ajoute subscriptions.renewal_notice_sent_for — mémorise la date d'échéance
-- pour laquelle la facture de renouvellement a déjà été envoyée (anti-doublon
-- du cron quotidien, voir backend/services/RenewalInvoiceService.js).
-- Idempotent : rejouable sans risque.
BEGIN;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS renewal_notice_sent_for timestamptz;

COMMIT;

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movementActivity, marginPercent, deliveryState, saleCustomerLabel, saleOriginLabel, categoryIconKey } from '../utils/displayHelpers.js';

test('B1 : mouvement de stock avec quantité et produit réels', () => {
  assert.deepEqual(
    movementActivity({ type: 'OUT', quantity: 3, productName: 'Climatiseur split 12 000 BTU', userRef: 'Awa Ndiaye' }),
    { title: 'Climatiseur split 12 000 BTU', sub: '−3 unités • Awa Ndiaye' }
  );
  // forme brute de /stock/movements
  const raw = movementActivity({ type: 'IN', qty: 1, stock_item: { name: 'Onduleur 1500 VA' } });
  assert.deepEqual(raw, { title: 'Onduleur 1500 VA', sub: '+1 unité' });
  assert.ok(!JSON.stringify(movementActivity({})).includes('undefined'));
  assert.equal(movementActivity({ type: 'ADJUSTMENT', qty: 1, previousLevel: 19, newLevel: 20 }).sub, '+1 unité');
});

test('B11 : marge « — » si PUMP inconnu', () => {
  assert.equal(marginPercent('95000.00', '0.00'), null);
  assert.equal(marginPercent(95000, null), null);
  assert.equal(marginPercent(0, 1000), null);
  assert.equal(marginPercent('100000', '75000'), 25);
});

test('B6 : vente de services sans taux de livraison', () => {
  assert.equal(deliveryState({ items: [{ serviceId: 'x', quantity: 1 }] }).isDeliverable, false);
  assert.deepEqual(
    deliveryState({ items: [{ stockItemId: 'p', quantity: 4, quantityDelivered: 1 }, { serviceId: 's', quantity: 1 }] }),
    { isDeliverable: true, rate: 25, delivered: 1, total: 4 }
  );
});

test('B3/B9 : nom client et origine de la vente', () => {
  assert.equal(saleCustomerLabel({ customer: { companyName: 'Cabinet Sow & Associés' } }), 'Cabinet Sow & Associés');
  assert.equal(saleCustomerLabel({ walkinName: 'M. Ndoye' }), 'M. Ndoye');
  assert.equal(saleCustomerLabel({}), 'Client de passage');
  assert.equal(saleOriginLabel({ recurringInstallmentId: 'i' }), 'Contrat récurrent');
  assert.equal(saleOriginLabel({}), 'Vente');
});

test('B10 : icône de repli selon la catégorie', () => {
  assert.equal(categoryIconKey('Réfrigération Réfrigérateur double porte'), 'fridge');
  assert.equal(categoryIconKey('Climatiseurs split'), 'aircon');
  assert.equal(categoryIconKey('Ordinateurs Ordinateur de bureau i7'), 'computer');
  assert.equal(categoryIconKey('Sièges Fauteuil ergonomique'), 'chair');
  assert.equal(categoryIconKey('Livraison Dakar et banlieue'), 'delivery');
  assert.equal(categoryIconKey(''), null);
});

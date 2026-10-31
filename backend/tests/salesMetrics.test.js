import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateDebtors, outstandingByCustomerId, rankSellers, saleCustomerName } from '../utils/salesMetrics.js';

const sales = [
  { id: 's1', customerId: 'c1', customer: { id: 'c1', companyName: 'Clinique Les Palmiers' }, status: 'EN_COURS', totalTtc: '1000', amountPaid: '200' },
  { id: 's2', customerId: 'c1', customer: { id: 'c1', companyName: 'Clinique Les Palmiers' }, status: 'TERMINE', totalTtc: '500', amountPaid: '500' },
  { id: 's3', customerId: null, walkinName: 'Habib Fall', status: 'EN_COURS', totalTtc: '300', amountPaid: '0' },
  { id: 's4', customerId: null, walkinName: 'Mouhamed Mbodj', status: 'EN_COURS', totalTtc: '100', amountPaid: '0' },
  { id: 's5', customerId: 'c2', status: 'ANNULE', totalTtc: '900', amountPaid: '0' },
  { id: 's6', customerId: 'c2', status: 'BROUILLON', totalTtc: '900', amountPaid: '0' }
];

test('B2 : les débiteurs portent le vrai nom du client (pas « Client »)', () => {
  const d = aggregateDebtors(sales);
  assert.deepEqual(d.map(x => [x.name, x.total]), [
    ['Clinique Les Palmiers', 800], ['Habib Fall', 300], ['Mouhamed Mbodj', 100]
  ]);
  assert.equal(d[1].isWalkin, true);
});

test('B2 : modèle Sequelize — association exposée en minuscule (sale.customer)', () => {
  assert.equal(saleCustomerName({ customer: { companyName: 'Hôtel Océan Bleu' } }), 'Hôtel Océan Bleu');
  assert.equal(saleCustomerName({ walkinName: 'Mme Ba' }), 'Mme Ba');
  assert.equal(saleCustomerName({}), null);
});

test('B7 : encours par fiche client identique au Recouvrement', () => {
  assert.deepEqual(outstandingByCustomerId(sales), { c1: 800 });
});

test('aggregateDebtors accepte un calcul de réglé personnalisé', () => {
  const d = aggregateDebtors(sales, () => 0);
  assert.equal(d[0].total, 1500);
});

test('Classement équipe : factures auto (sans vendeur) et annulées exclues', () => {
  const r = rankSellers([
    { operatorName: 'Awa Ndiaye', status: 'TERMINE', totalTtc: 100 },
    { operatorName: 'Awa Ndiaye', status: 'EN_COURS', totalTtc: 50 },
    { operatorName: 'Cheikh Mbaye', status: 'TERMINE', totalTtc: 500 },
    { operatorName: 'Cheikh Mbaye', status: 'ANNULE', totalTtc: 500 },
    { operatorName: null, status: 'EN_COURS', totalTtc: 9999 }
  ]);
  assert.deepEqual(r.map(x => [x.name, x.salesCount]), [['Awa Ndiaye', 2], ['Cheikh Mbaye', 1]]);
});

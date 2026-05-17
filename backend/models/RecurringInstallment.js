
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class RecurringInstallment extends Model {}

RecurringInstallment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  contractId: { type: DataTypes.UUID, allowNull: false, field: 'contract_id' },
  installmentNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'installment_number' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
  amount: { type: DataTypes.NUMERIC(15, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('EN_ATTENTE', 'PAYE', 'EN_RETARD', 'ANNULE'),
    defaultValue: 'EN_ATTENTE'
  },
  paidAt: { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
  paymentMethod: {
    type: DataTypes.ENUM('CASH', 'ORANGE_MONEY', 'WAVE', 'MTN_MOMO', 'STRIPE', 'TRANSFER', 'CHEQUE'),
    allowNull: true,
    field: 'payment_method'
  },
  paymentReference: { type: DataTypes.STRING(100), allowNull: true, field: 'payment_reference' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  // Référence vers la vente auto-générée 5 jours avant l'échéance
  generatedSaleId: { type: DataTypes.UUID, allowNull: true, field: 'generated_sale_id' }
}, {
  sequelize,
  modelName: 'recurring_installment',
  tableName: 'recurring_installments',
  underscored: true,
  timestamps: true
});

export default RecurringInstallment;

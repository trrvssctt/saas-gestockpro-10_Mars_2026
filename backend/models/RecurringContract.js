
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class RecurringContract extends Model {}

RecurringContract.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  customerId: { type: DataTypes.UUID, allowNull: true, field: 'customer_id' },
  walkinName: { type: DataTypes.STRING(150), allowNull: true, field: 'walkin_name' },
  walkinPhone: { type: DataTypes.STRING(50), allowNull: true, field: 'walkin_phone' },
  serviceId: { type: DataTypes.UUID, allowNull: true, field: 'service_id' },
  serviceItems: { type: DataTypes.JSON, allowNull: true, field: 'service_items' },
  paymentDay: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5, field: 'payment_day' },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  // Fréquence des échéances
  frequency: {
    type: DataTypes.ENUM('HEBDOMADAIRE', 'MENSUEL', 'TRIMESTRIEL'),
    allowNull: false,
    defaultValue: 'MENSUEL'
  },
  startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'end_date' },
  numberOfInstallments: { type: DataTypes.INTEGER, allowNull: false, field: 'number_of_installments' },
  installmentAmount: { type: DataTypes.NUMERIC(15, 2), allowNull: false, field: 'installment_amount' },
  totalAmount: { type: DataTypes.NUMERIC(15, 2), allowNull: false, field: 'total_amount' },
  amountPaid: { type: DataTypes.NUMERIC(15, 2), defaultValue: 0, field: 'amount_paid' },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'ACTIF'
  },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  sequelize,
  modelName: 'recurring_contract',
  tableName: 'recurring_contracts',
  underscored: true,
  timestamps: true
});

export default RecurringContract;

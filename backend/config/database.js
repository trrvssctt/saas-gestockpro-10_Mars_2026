
import { Sequelize, QueryTypes } from 'sequelize';

// Instance ERP Principale (PostgreSQL AlwaysData)
export const sequelize = new Sequelize('gestionapp_stockgestion_13_janv_2026', 'gestionapp', 'Dianka16', {
  host: 'postgresql-gestionapp.alwaysdata.net',
  port: 5432,
  dialect: 'postgres',
  logging: false,  // Désactiver les logs SQL
  define: {
    underscored: true,
    timestamps: true
  },
  retry: {
    match: [
      /ConnectionError/,
      /ConnectionRefusedError/,
      /ConnectionTimedOutError/,
      /TimeoutError/,
      /SequelizeConnectionError/,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /ENOTFOUND/,
      /ENETUNREACH/,
      /ECONNREFUSED/
    ],
    max: 3
  },
  pool: {
    max: 8, // Augmenté pour gérer plus de connexions simultanées
    min: 2, // Maintenir quelques connexions ouvertes
    acquire: 60000, // Augmenté à 60 secondes
    idle: 20000 // Augmenté à 20 secondes avant fermeture
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Instance Registry IA (MySQL AlwaysData)
export const sequelize_db_template = new Sequelize('gestionapp_saas_gestockpro_bot', '385922', 'Dianka16', {
  host: 'mysql-gestionapp.alwaysdata.net',
  port: 3306,
  dialect: 'mysql',
  logging: false,
  retry: {
    match: [
      /ConnectionError/,
      /ConnectionRefusedError/,
      /ConnectionTimedOutError/,
      /TimeoutError/,
      /SequelizeConnectionError/,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /ENOTFOUND/,
      /ENETUNREACH/,
      /ECONNREFUSED/
    ],
    max: 3
  },
  pool: {
    max: 8, // Augmenté pour gérer plus de connexions simultanées
    min: 2, // Maintenir quelques connexions ouvertes
    acquire: 60000, // Augmenté à 60 secondes
    idle: 20000 // Augmenté à 20 secondes avant fermeture
  }
});

export const connectDB = async () => {
  try {
    // 1. Connexion & Sync ERP (PostgreSQL)
    await sequelize.authenticate();
    console.log('✅ Kernel ERP Connecté (PostgreSQL)');
    
    try {
      // alter: false pour éviter de modifier des colonnes existantes
      await sequelize.sync({ alter: false });
      console.log('✅ Schéma ERP Synchronisé');
    } catch (syncErr) {
      console.warn('⚠️ Note sync ERP:', syncErr.message);
    }

    // Garantir les colonnes de pointage dans attendances et payroll_settings (idempotent)
    try {
      await sequelize.query(`
        ALTER TABLE IF EXISTS attendances
          ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS meta JSONB;
        ALTER TABLE IF EXISTS payroll_settings
          ADD COLUMN IF NOT EXISTS deduction_enabled BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS work_start_time VARCHAR(5) DEFAULT '08:00',
          ADD COLUMN IF NOT EXISTS work_end_time VARCHAR(5) DEFAULT '17:00',
          ADD COLUMN IF NOT EXISTS working_days_per_month INTEGER DEFAULT 26;
      `, { type: QueryTypes.RAW });
      console.log('✅ Colonnes pointage vérifiées');
    } catch (colErr) {
      console.warn('⚠️ Note colonnes pointage:', colErr.message);
    }

    // Garantir la création des tables de notifications (idempotent)
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          body TEXT NOT NULL,
          type VARCHAR(20) NOT NULL DEFAULT 'INFO',
          action_link VARCHAR(255),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS notification_reads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(notification_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_tenant  ON notifications(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(tenant_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notif_reads_user      ON notification_reads(user_id);
      `, { type: QueryTypes.RAW });
      console.log('✅ Tables notifications vérifiées');
    } catch (notifErr) {
      console.warn('⚠️ Note tables notifications:', notifErr.message);
    }
    
    // 2. Connexion & Sync Registry IA (MySQL)
    await sequelize_db_template.authenticate();
    console.log('✅ Registry IA Connecté (MySQL)');
    
    try {
      // alter: false est CRITIQUE ici pour éviter l'erreur sur conversation_id
      await sequelize_db_template.sync({ alter: false }); 
      console.log('✅ Schéma IA Synchronisé');
    } catch (syncErr) {
      console.error('❌ Erreur sync IA:', syncErr.message);
    }

  } catch (error) {
    console.error('❌ Erreur critique Kernel Database:', error.message);
  }
};


// 9F/uJ/mreE7=jHcE

// FJrL$C.!y9^17G&S SECK
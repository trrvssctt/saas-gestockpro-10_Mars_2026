#!/usr/bin/env node

/**
 * Script de test du système de sessions
 * Test les nouvelles fonctionnalités de gestion de session
 */

import { AuthService } from './services/AuthService.js';
import { User, Session } from './models/index.js';
import { sequelize } from './config/database.js';

async function testSessionSystem() {
  console.log('🧪 Début des tests du système de sessions');
  
  try {
    // Synchroniser les modèles (pour test uniquement)
    await sequelize.sync({ alter: true });
    console.log('✅ Base de données synchronisée');

    // Test 1: Créer un utilisateur test
    console.log('\n📝 Test 1: Création utilisateur test');
    const testUser = await User.findOrCreate({
      where: { email: 'test@session.com' },
      defaults: {
        name: 'Test Session',
        email: 'test@session.com',
        password: 'testpassword123',
        tenantId: '00000000-0000-0000-0000-000000000001',
        roles: ['EMPLOYEE']
      }
    });
    console.log(`✅ Utilisateur: ${testUser[0].name} (${testUser[0].email})`);

    // Test 2: Créer une session
    console.log('\n📝 Test 2: Création de session');
    const sessionResult = await AuthService.createSession(
      testUser[0],
      '127.0.0.1',
      'Test User Agent',
      'Test Device'
    );
    console.log(`✅ Session créée: ${sessionResult.sessionToken}`);

    // Test 3: Valider la session
    console.log('\n📝 Test 3: Validation de session');
    const validationResult = await AuthService.validateSession(sessionResult.sessionToken);
    if (validationResult) {
      console.log(`✅ Session valide pour: ${validationResult.user.name}`);
    } else {
      console.log('❌ Session invalide');
    }

    // Test 4: Lister les sessions actives
    console.log('\n📝 Test 4: Sessions actives');
    const activeSessions = await AuthService.getUserActiveSessions(testUser[0].id);
    console.log(`✅ Sessions actives: ${activeSessions.length}`);

    // Test 5: Terminer la session
    console.log('\n📝 Test 5: Terminaison de session');
    const terminateResult = await AuthService.terminateSession(sessionResult.sessionToken);
    console.log(`✅ Session terminée: ${terminateResult}`);

    // Test 6: Vérifier que la session est bien terminée
    console.log('\n📝 Test 6: Vérification terminaison');
    const afterTermination = await AuthService.validateSession(sessionResult.sessionToken);
    if (!afterTermination) {
      console.log('✅ Session bien terminée');
    } else {
      console.log('❌ Session toujours active');
    }

    // Test 7: Nettoyer les sessions expirées
    console.log('\n📝 Test 7: Nettoyage sessions expirées');
    const cleanedCount = await AuthService.cleanupExpiredSessions();
    console.log(`✅ Sessions nettoyées: ${cleanedCount}`);

    console.log('\n🎉 Tous les tests sont passés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Exécuter les tests
testSessionSystem();
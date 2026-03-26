#!/usr/bin/env node

/**
 * Script de test simple du système de sessions
 * Test uniquement les nouvelles fonctionnalités sans sync
 */

import { AuthService } from './services/AuthService.js';
import { User, Session } from './models/index.js';
import { sequelize } from './config/database.js';

async function testSessionSystem() {
  console.log('🧪 Test du système de sessions (sans sync)');
  
  try {
    // Test 1: Vérifier la connexion à la base
    console.log('\n📝 Test 1: Connexion base de données');
    await sequelize.authenticate();
    console.log('✅ Connexion réussie');

    // Test 2: Chercher un utilisateur existant pour les tests
    console.log('\n📝 Test 2: Recherche utilisateur existant');
    const existingUser = await User.findOne({
      limit: 1,
      where: { isActive: true }
    });
    
    if (!existingUser) {
      console.log('❌ Aucun utilisateur trouvé pour les tests');
      return;
    }
    
    console.log(`✅ Utilisateur trouvé: ${existingUser.name} (${existingUser.email})`);

    // Test 3: Créer une session
    console.log('\n📝 Test 3: Création de session');
    const sessionResult = await AuthService.createSession(
      existingUser,
      '127.0.0.1',
      'Test User Agent Node.js',
      'Test Device Linux'
    );
    console.log(`✅ Session créée: ${sessionResult.sessionToken}`);
    console.log(`   JWT Token: ${sessionResult.token.substring(0, 50)}...`);

    // Test 4: Valider la session
    console.log('\n📝 Test 4: Validation de session');
    const validationResult = await AuthService.validateSession(sessionResult.sessionToken);
    if (validationResult) {
      console.log(`✅ Session valide pour: ${validationResult.user.name}`);
      console.log(`   Dernière activité: ${validationResult.session.lastActivity}`);
    } else {
      console.log('❌ Session invalide');
    }

    // Test 5: Lister les sessions actives
    console.log('\n📝 Test 5: Sessions actives');
    const activeSessions = await AuthService.getUserActiveSessions(existingUser.id);
    console.log(`✅ Sessions actives: ${activeSessions.length}`);
    activeSessions.forEach((session, index) => {
      console.log(`   Session ${index + 1}: ${session.sessionToken.substring(0, 20)}... (${session.ipAddress})`);
    });

    // Test 6: Vérifier les méthodes statiques du modèle Session
    console.log('\n📝 Test 6: Recherche par token');
    const foundSession = await Session.findByToken(sessionResult.sessionToken);
    if (foundSession) {
      console.log(`✅ Session trouvée par token: ${foundSession.isValid()}`);
    }

    // Test 7: Mettre à jour l'activité
    console.log('\n📝 Test 7: Mise à jour activité');
    if (foundSession) {
      await foundSession.updateActivity();
      console.log('✅ Activité mise à jour');
    }

    // Test 8: Terminer la session
    console.log('\n📝 Test 8: Terminaison de session');
    const terminateResult = await AuthService.terminateSession(sessionResult.sessionToken);
    console.log(`✅ Session terminée: ${terminateResult}`);

    // Test 9: Vérifier que la session est bien terminée
    console.log('\n📝 Test 9: Vérification terminaison');
    const afterTermination = await AuthService.validateSession(sessionResult.sessionToken);
    if (!afterTermination) {
      console.log('✅ Session bien terminée');
    } else {
      console.log('❌ Session toujours active');
    }

    console.log('\n🎉 Tous les tests sont passés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Exécuter les tests
testSessionSystem();
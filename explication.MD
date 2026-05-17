# 🎯 Projet : Modularisation du Système RH (Human Resources)

## 💡 Vision du Projet
En tant que développeur Full-Stack et IA Automation Maker, j'ai constaté un besoin récurrent : presque chaque application métier nécessite une gestion des Ressources Humaines (RH). Plutôt que de redévelopper cette brique à chaque fois, l'objectif est d'extraire le module RH actuel de **GeStockPro** pour en faire une solution **indépendante, modulaire et universelle**.

Ce module RH est extrêmement complet et a été éprouvé par des clients exigeants. L'idée est de créer un "moteur RH" qui puisse être branché sur n'importe quelle autre application via une API ou un transfert de fichiers structuré.

## 🚀 Objectifs principaux
1. **Indépendance totale** : Détacher la logique RH du noyau de GeStockPro (gestion de stock, ventes, etc.).
2. **Adaptabilité** : Permettre au module de s'adapter à différents contextes d'entreprise et pays (bien que configuré initialement pour le Sénégal).
3. **Réutilisabilité** : Offrir une base solide (Modèles, Contrôleurs, UI) prête à être déployée pour tout nouveau projet.
4. **Simplification du déploiement** : Fournir un guide clair (voir `Transfert.MD`) pour migrer les tables, la logique métier et l'interface utilisateur.

## 🛠️ Contenu du Module à Extraire
- **Gestion Administrative** : Employés, départements, contrats, organigrammes.
- **Gestion du Temps** : Pointage (Clock-in/out), heures supplémentaires, gestion des absences et congés.
- **Moteur de Paie** : Calcul automatique du brut au net, gestion des primes, des avances sur salaire et génération de fiches de paie (PDF/PNG).
- **Recrutement & Formation** : Suivi des offres d'emploi, des candidats et des plans de formation.
- **Évaluations** : Système de revue de performance périodique.
- **Conformité** : Gestion des déclarations sociales et fiscales (IPRES, CSS, etc.).

## 📈 Valeur Ajoutée
En transformant ce module en application standalone, nous créons un actif technologique puissant capable de répondre instantanément à la question : *"Est-ce que ton application gère le RH ?"* avec un grand **OUI** professionnel et complet.

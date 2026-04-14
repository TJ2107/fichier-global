#!/bin/bash
# 🚀 Script de démarrage rapide Firebase

set -e

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   Firebase Firestore Integration Ready! ✅  ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Étape 1: Vérifier Node.js
echo "📦 Vérification de Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js $(node -v) trouvé"
else
    echo "❌ Node.js non trouvé. Installer via nodejs.org"
    exit 1
fi

# Étape 2: Installer les dépendances
echo ""
echo "📥 Installation des dépendances..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Dépendances installées"
else
    echo "✅ Dépendances déjà installées"
fi

# Étape 3: Vérifier Firebase
echo ""
echo "🔥 Vérification Firebase..."
bash verify-firebase.sh

# Étape 4: Afficher les instructions
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║      Prêt à Démarrer!                      ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "🚀 Démarrer l'application:"
echo ""
echo "   npm run dev"
echo ""
echo "   ⚡ Ouvrir: http://localhost:3000"
echo ""
echo ""
echo "📚 Documentation:"
echo ""
echo "   • [FIREBASE_START.md](./FIREBASE_START.md) ........... Démarrage rapide"
echo "   • [FIREBASE_CONFIG.md](./FIREBASE_CONFIG.md) ........ Configuration"
echo "   • [FIREBASE_API.md](./FIREBASE_API.md) .............. Référence API"
echo ""
echo ""
echo "💾 Vos données seront sauvegardées dans Firebase Firestore:"
echo ""
echo "   Project: device-streaming-9dc16a46"
echo "   Collection: fichierGlobal"
echo "   Console: https://console.firebase.google.com"
echo ""
echo ""
echo "✅ Tout est configuré! Démarrez avec: npm run dev"
echo ""

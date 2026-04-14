#!/bin/bash
# Script de vérification Firebase Firestore

echo "🔍 Vérification de la configuration Firebase..."
echo ""

# Vérifier .env.local
if [ -f ".env.local" ]; then
    echo "✅ .env.local existe"
    echo ""
    echo "Variables Firebase configurées:"
    grep "VITE_FIREBASE" .env.local | sed 's/=.*/=***/' 
    echo ""
else
    echo "❌ .env.local n'existe pas"
    exit 1
fi

# Vérifier les fichiers Firebase
echo ""
echo "Vérification des fichiers Firebase:"
[ -f "firebase/config.ts" ] && echo "✅ firebase/config.ts" || echo "❌ firebase/config.ts"
[ -f "firebase/firestoreService.ts" ] && echo "✅ firebase/firestoreService.ts" || echo "❌ firebase/firestoreService.ts"

# Vérifier que Firebase est installé
echo ""
echo "Vérification des dépendances:"
npm ls firebase 2>/dev/null | grep firebase && echo "✅ Firebase installé" || echo "❌ Firebase non trouvé"

# Vérifier que App.tsx importe Firestore
echo ""
echo "Vérification de l'intégration App.tsx:"
grep -q "getAllRowsFromFirestore\|saveRowsToFirestore" App.tsx && echo "✅ Firestore utilisé dans App.tsx" || echo "❌ Firestore non trouvé dans App.tsx"

echo ""
echo "🎉 Vérification complète!"
echo ""
echo "Prêt à démarrer?"
echo "  npm install    # (si pas déjà fait)"
echo "  npm run dev    # Lancer l'application"

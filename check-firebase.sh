#!/bin/bash

# Script de vérification Firebase
# Exécutez ce script pour vérifier votre configuration Firebase

echo "=== Vérification Firebase Configuration ==="
echo ""

# Vérifier si le fichier .env existe
if [ -f ".env" ]; then
    echo "✓ Fichier .env trouvé"
    
    # Vérifier les variables
    if grep -q "VITE_FIREBASE_API_KEY" .env; then
        echo "  ✓ VITE_FIREBASE_API_KEY configurée"
    else
        echo "  ✗ VITE_FIREBASE_API_KEY manquante"
    fi
    
    if grep -q "VITE_FIREBASE_PROJECT_ID" .env; then
        echo "  ✓ VITE_FIREBASE_PROJECT_ID configurée"
    else
        echo "  ✗ VITE_FIREBASE_PROJECT_ID manquante"
    fi
else
    echo "✗ Fichier .env non trouvé"
    echo "  Créez un fichier .env à la racine du projet avec vos identifiants Firebase"
    echo "  Voir FIREBASE_SETUP.md pour les instructions"
    exit 1
fi

echo ""
echo "✓ Configuration détectée !"
echo ""
echo "Prochaines étapes:"
echo "1. Lancez l'app: npm run dev"
echo "2. Testez en importan des données"
echo "3. Vérifiez les données dans Firestore Console"

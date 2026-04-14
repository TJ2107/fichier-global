#!/bin/bash
# Script de démarrage rapide Firebase
# Exécutez ce script pour configurer et tester Firebase

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🚀 GLOBAL FILES - Intégration Firebase                      ║"
echo "║  Guide de Démarrage Rapide                                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}ÉTAPE 1: Créer un projet Firebase${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Allez sur: https://console.firebase.google.com"
echo "2. Cliquez 'Ajouter un projet'"
echo "3. Entrez un nom (ex: global-files)"
echo "4. Cliquez 'Créer un projet'"
echo ""

read -p "► Avez-vous créé le projet? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Veuillez créer le projet d'abord.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}ÉTAPE 2: Récupérer les identifiants${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Firebase Console > Paramètres (⚙️)"
echo "2. Onglet 'Vos applications' > Web"
echo "3. Copiez la configuration firebaseConfig"
echo ""

read -p "► Avez-vous copié les identifiants? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Veuillez copier les identifiants d'abord.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}ÉTAPE 3: Créer le fichier .env${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Création du fichier .env..."

if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env existe déjà${NC}"
    read -p "Voulez-vous le remplacer? (y/n) " -n 1 -r
    echo ""
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

cat > .env << 'EOF'
# Remplacez les valeurs par vos identifiants Firebase
VITE_FIREBASE_API_KEY=votre_api_key_ici
VITE_FIREBASE_AUTH_DOMAIN=votre_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_project_id_ici
VITE_FIREBASE_STORAGE_BUCKET=votre_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id_ici
VITE_FIREBASE_APP_ID=votre_app_id_ici
EOF

echo -e "${GREEN}✓ Fichier .env créé${NC}"
echo ""
echo "Éditez le fichier .env et remplacez les valeurs par vos identifiants"
echo ""

echo -e "${BLUE}ÉTAPE 4: Activer Firestore Database${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Firebase Console > Firestore Database"
echo "2. Cliquez 'Créer une base de données'"
echo "3. Mode: 'Démarrer en mode test'"
echo "4. Région: europe-west1"
echo "5. Cliquez 'Créer'"
echo ""

read -p "► Avez-vous créé la base Firestore? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Veuillez créer Firestore d'abord.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}ÉTAPE 5: Tester l'application${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Lancement de l'application..."
echo ""

npm run dev

echo ""
echo -e "${GREEN}✓ Application lancée!${NC}"
echo ""
echo "Prochaines étapes:"
echo "1. Ouvrez http://localhost:5173"
echo "2. Importez des données (bouton Importer)"
echo "3. Vérifiez Firestore Console > Collection 'fichierGlobal'"
echo "4. Vos données doivent y apparaître ✓"
echo ""

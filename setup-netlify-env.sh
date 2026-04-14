#!/bin/bash
# 🚀 Script Automatique de Configuration Netlify Firebase

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Configuration Automatique Netlify Firebase Environment   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier Netlify CLI
echo "🔧 Vérification Netlify CLI..."
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI non trouvé. Installation..."
    npm install -g netlify-cli
fi
echo "✅ Netlify CLI prêt"

# Authentification Netlify
echo ""
echo "🔐 Authentification Netlify..."
echo "Si vous n'êtes pas connecté, une fenêtre de navigateur s'ouvrira."
echo "Connectez-vous avec votre compte Netlify."
echo ""
netlify login

# Sélection du site
echo ""
echo "🏠 Sélection du site Netlify..."
echo "Choisissez votre site 'fichier-global' dans la liste:"
netlify sites:list

echo ""
read -p "Entrez l'ID de votre site Netlify (ou appuyez Entrée pour auto-détection): " SITE_ID

if [ -z "$SITE_ID" ]; then
    # Auto-détection basée sur le répertoire git
    SITE_ID=$(netlify sites:list --json | jq -r '.[] | select(.name | contains("fichier-global")) | .id' | head -1)
    if [ -z "$SITE_ID" ]; then
        echo "❌ Impossible de détecter automatiquement le site."
        echo "Veuillez entrer manuellement l'ID du site depuis https://app.netlify.com"
        read -p "ID du site: " SITE_ID
    fi
fi

echo "✅ Site sélectionné: $SITE_ID"

# Configuration des variables d'environnement
echo ""
echo "🔑 Configuration des variables Firebase..."

VARIABLES=(
    "VITE_FIREBASE_API_KEY:AIzaSyBl33Ta3P7lkLmpKd7erjZhh5TqqBn4vHA"
    "VITE_FIREBASE_AUTH_DOMAIN:device-streaming-9dc16a46.firebaseapp.com"
    "VITE_FIREBASE_PROJECT_ID:device-streaming-9dc16a46"
    "VITE_FIREBASE_STORAGE_BUCKET:device-streaming-9dc16a46.firebasestorage.app"
    "VITE_FIREBASE_MESSAGING_SENDER_ID:227467608009"
    "VITE_FIREBASE_APP_ID:1:227467608009:web:60cb14daf673046be23218"
)

for var in "${VARIABLES[@]}"; do
    KEY=$(echo $var | cut -d: -f1)
    VALUE=$(echo $var | cut -d: -f2-)

    echo "  📝 Configuration $KEY..."
    netlify env:set "$KEY" "$VALUE" --site "$SITE_ID"
done

echo ""
echo "✅ Toutes les variables Firebase configurées!"

# Déclencher un nouveau build
echo ""
echo "🚀 Déclenchement d'un nouveau build..."
netlify build --site "$SITE_ID" --context production

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   Configuration Terminée!                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "⏱️  Le déploiement prendra 2-5 minutes."
echo ""
echo "🔍 Vérifiez le statut sur: https://app.netlify.com"
echo ""
echo "🌐 Une fois déployé, testez: https://fichier-global.netlify.app"
echo ""
echo "Console attendue:"
echo "✅ Firebase initialized successfully"
echo "✅ Configuration Firebase valide"
echo ""
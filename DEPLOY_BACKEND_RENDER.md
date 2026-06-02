# Heberger LWASIVA_NET sur Render

La base MySQL est deja sur Aiven. Le fichier `render.yaml` publie l'API Node.js/Express et le site web React.

## 1. Mettre le projet sur GitHub

Render deploye facilement depuis GitHub.

Depuis `C:\LwasivaNet`:

```powershell
git add .
git commit -m "Prepare backend deployment"
git remote add origin https://github.com/VOTRE_COMPTE/lwasiva-net.git
git push -u origin main
```

Si la branche s'appelle `master`:

```powershell
git push -u origin master
```

## 2. Creer les services Render

1. Aller sur `https://render.com`.
2. Creer un compte ou se connecter.
3. Cliquer **New** puis **Blueprint**.
4. Connecter le depot GitHub `lwasiva-net`.
5. Render detectera `render.yaml`.
6. Creer les services `lwasiva-net-api` et `lwasiva-net-web`.

## 3. Variables a mettre dans Render

Dans Render, ouvrir le service puis **Environment**.

Mettre les valeurs Aiven:

```text
DB_HOST=mysql-a72aeaf-sagelusenge-7c93.a.aivencloud.com
DB_PORT=18531
DB_USER=avnadmin
DB_PASSWORD=VOTRE_MOT_DE_PASSE_AIVEN
DB_NAME=defaultdb
DB_SSL=true
JWT_EXPIRES_IN=1d
WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=meta
WHATSAPP_FROM_NUMBER=243980208012
```

Pour `JWT_SECRET`, mettre une longue valeur secrete, par exemple une phrase aleatoire.

Ne pas publier le mot de passe Aiven.

## 4. Tester l'API

Apres le deploiement, Render donnera une URL comme:

```text
https://lwasiva-net-api.onrender.com
```

Tester:

```text
https://lwasiva-net-api.onrender.com/api/health
```

La reponse attendue:

```json
{"success":true,"message":"API LWASIVA_NET operationnelle"}
```

## 5. Connecter le site web

Le service `lwasiva-net-web` utilise cette variable:

```text
VITE_API_BASE_URL=https://lwasiva-net-api.onrender.com/api
```

Le build du site web est:

```powershell
npm.cmd run frontend:build
```

Render publie ensuite le dossier:

```text
dist/frontend
```

## 6. Connecter l'application mobile

Dans `mobile/.env`, mettre:

```text
EXPO_PUBLIC_API_BASE_URL=https://lwasiva-net-api.onrender.com/api
```

Puis relancer Expo:

```powershell
cd C:\LwasivaNet\mobile
npm.cmd start
```

Apres modification, relancer Expo avec cette URL publique.

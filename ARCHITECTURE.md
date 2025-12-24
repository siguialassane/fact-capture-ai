# Fact Capture AI - Architecture Backend/Frontend

## 📁 Structure du Projet

```
fact-capture-ai/
├── Frontend/                    # Application React (Vite)
│   ├── src/
│   │   ├── components/          # Composants React
│   │   │   ├── desktop/         # Dashboard desktop
│   │   │   ├── mobile/          # Vue mobile/PWA
│   │   │   └── ui/              # Composants shadcn/ui
│   │   ├── hooks/               # Hooks React personnalisés
│   │   │   ├── useInvoiceAnalysis.ts
│   │   │   ├── useInvoiceChat.ts
│   │   │   └── useSupabaseSync.ts
│   │   ├── lib/                 # Utilitaires et services
│   │   │   ├── api/             # Client API backend
│   │   │   ├── ai/              # Types et utilitaires IA
│   │   │   ├── pdf/             # Conversion PDF
│   │   │   └── openrouter.ts    # Interface unifiée IA
│   │   └── pages/               # Pages de l'application
│   └── .env.example             # Variables d'environnement
│
├── Backend/                     # API Hono (Node.js)
│   ├── src/
│   │   ├── config/              # Configuration
│   │   ├── middleware/          # Middlewares (erreurs, etc.)
│   │   ├── routes/              # Routes API
│   │   │   ├── analysis.ts      # /api/analysis (IA)
│   │   │   ├── invoices.ts      # /api/invoices (CRUD)
│   │   │   ├── sessions.ts      # /api/sessions (PWA sync)
│   │   │   ├── exports.ts       # /api/exports (CSV, Sage)
│   │   │   └── health.ts        # /api/health
│   │   ├── services/            # Services métier
│   │   │   └── ai/              # Service d'analyse IA
│   │   ├── app.ts               # Configuration Hono
│   │   └── index.ts             # Point d'entrée
│   └── .env.example             # Variables d'environnement
│
└── supabase/                    # Scripts SQL Supabase
```

## 🚀 Démarrage

### Frontend

```bash
cd Frontend
npm install
cp .env.example .env  # Configurer les variables
npm run dev           # http://localhost:5173
```

### Backend

```bash
cd Backend
npm install
cp .env.example .env  # Configurer les variables
npm run dev           # http://localhost:3001
```

## 🔧 Configuration

### Mode Direct (sans backend)

Par défaut, le frontend appelle directement l'API OpenRouter :

```env
# Frontend/.env
VITE_USE_BACKEND=false
VITE_OPENROUTER_API_KEY=sk-or-xxx
```

### Mode Backend (recommandé pour production)

Pour utiliser le backend comme proxy :

```env
# Frontend/.env
VITE_USE_BACKEND=true
VITE_BACKEND_URL=http://localhost:3001

# Backend/.env
OPENROUTER_API_KEY=sk-or-xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
```

## 📡 API Routes

### Health
- `GET /api/health` - Health check
- `GET /api/health/ready` - Readiness check
- `GET /api/health/live` - Liveness check

### Analysis (IA)
- `POST /api/analysis/image` - Analyser une image
- `POST /api/analysis/pdf` - Analyser un PDF
- `POST /api/analysis/chat` - Chat avec l'IA

### Invoices
- `GET /api/invoices` - Liste des factures
- `GET /api/invoices/latest` - Dernière facture
- `GET /api/invoices/:id` - Détails d'une facture
- `POST /api/invoices` - Créer une facture
- `PATCH /api/invoices/:id` - Mettre à jour
- `DELETE /api/invoices/:id` - Supprimer

### Sessions (PWA Sync)
- `GET /api/sessions` - Liste des sessions
- `POST /api/sessions` - Créer une session
- `PATCH /api/sessions/:id` - Mettre à jour
- `POST /api/sessions/cleanup` - Nettoyer les sessions expirées

### Exports
- `POST /api/exports` - Exporter (CSV, JSON, Sage)
- `POST /api/exports/download` - Télécharger directement

## 🔒 Sécurité

- Les clés API sont stockées côté backend uniquement en mode production
- CORS configuré pour les origines autorisées
- Validation des entrées avec Zod
- Gestion centralisée des erreurs

## 🧪 Tests

```bash
# Backend
cd Backend
npm run typecheck

# Frontend  
cd Frontend
npm run typecheck
```

## 📦 Production

```bash
# Build Frontend
cd Frontend
npm run build  # → dist/

# Build Backend
cd Backend
npm run build  # → dist/
npm start      # Démarre le serveur
```

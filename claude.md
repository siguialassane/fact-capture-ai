# FACT CAPTURE AI - Documentation Claude

> Documentation technique complète pour faciliter les modifications et l'évolution du projet.
> **Dernière mise à jour**: 2026-01-22

---

## 📌 VUE D'ENSEMBLE

**Fact Capture AI** est une application de capture et d'analyse automatique de factures avec génération d'écritures comptables selon le référentiel **SYSCOHADA** (Système Comptable Ouest-Africain).

### Fonctionnalités principales

1. **Capture de factures** (photo mobile ou upload desktop)
2. **Extraction de données** via IA vision (QWEN 2-VL)
3. **Génération d'écritures comptables** via IA raisonnement (Gemini/DeepSeek)
4. **Gestion des journaux comptables** (CA, BQ, AC, VE, OD)
5. **Grand Livre** (consultation par compte)
6. **Lettrage** (rapprochement de pièces)
7. **États financiers** (Bilan, Compte de résultat, Balance)
8. **Audit comptable** avec recommandations IA

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Stack Frontend
- **Framework**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (composants Radix UI + Tailwind CSS)
- **State Management**: React Query (TanStack Query) pour le cache et les requêtes
- **Routing**: React Router v6
- **API Client**: Fetch avec clients séparés par domaine (pattern COMPOSITION)

### Stack Backend
- **Runtime**: Bun / Node.js 18+
- **Framework**: Hono.js (API web framework rapide)
- **Database**: Supabase (PostgreSQL)
- **IA**: OpenRouter API
  - Vision: QWEN 2-VL 7B (extraction OCR)
  - Comptabilité: Gemini Flash 2.0 ou DeepSeek v3.2 (raisonnement)

### Base de données (Supabase)
- **invoices**: factures capturées
- **journal_entries**: écritures comptables
- **journal_entry_lines**: lignes d'écritures
- **plan_comptable**: plan de comptes SYSCOHADA
- **tiers**: clients et fournisseurs
- **journaux**: journaux comptables (CA, BQ, AC, VE, OD)
- **company_settings**: paramètres de l'entreprise

---

## 🔄 FLUX DE TRAITEMENT DES FACTURES

```
┌──────────────┐
│ Utilisateur  │
│  (Photo/PDF) │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Frontend - Upload                       │
│  - MobileScanView.tsx (mobile)           │
│  - DesktopDashboard.tsx (desktop)        │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Backend - /api/analysis/image           │
│  - routes/analysis.ts                    │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  ÉTAPE 1: QWEN 2-VL (Vision OCR)         │
│  - services/ai/analyzer.ts               │
│  - Extrait: date, fournisseur, montants, │
│    articles, mode_paiement, TVA          │
└──────┬───────────────────────────────────┘
       │
       │ Données JSON extraites
       ▼
┌──────────────────────────────────────────┐
│  Frontend - Affichage + Validation       │
│  - InvoiceDataPanel.tsx                  │
│  - ArticlesTable.tsx                     │
│  - PaymentStatusSelector.tsx             │
└──────┬───────────────────────────────────┘
       │
       │ User confirm → Generate accounting entry
       ▼
┌──────────────────────────────────────────┐
│  Backend - /api/accounting/generate      │
│  - routes/accounting/handlers/generate.ts│
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  ÉTAPE 2: GEMINI/DEEPSEEK (Reasoning)    │
│  - services/accounting/gemini-accounting │
│  - Input: JSON QWEN + contexte SYSCOHADA │
│  - Output: écriture comptable complète   │
│    (journal, comptes, débit/crédit)      │
└──────┬───────────────────────────────────┘
       │
       │ Écriture comptable JSON
       ▼
┌──────────────────────────────────────────┐
│  Frontend - Affichage écriture           │
│  - AccountingEntryView.tsx               │
│  - Possibilité de corriger (drag & drop) │
└──────┬───────────────────────────────────┘
       │
       │ User confirm → Save
       ▼
┌──────────────────────────────────────────┐
│  Backend - /api/accounting/save          │
│  - Sauvegarde dans journal_entries       │
│  - Mise à jour de l'invoice              │
└──────────────────────────────────────────┘
```

---

## 📂 STRUCTURE DU PROJET

```
fact-capture-ai/
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── desktop/            # Composants desktop
│   │   │   │   ├── DesktopDashboard.tsx
│   │   │   │   ├── DashboardLeftPane.tsx
│   │   │   │   ├── DashboardRightPane.tsx
│   │   │   │   ├── InvoiceDataPanel.tsx
│   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   └── invoice/        # Sous-composants invoice
│   │   │   ├── mobile/             # Composants mobile (PWA)
│   │   │   │   ├── MobileScanView.tsx
│   │   │   │   └── PhotoPreview.tsx
│   │   │   ├── accounting/         # Composants comptables
│   │   │   │   └── AccountingEntryView.tsx
│   │   │   ├── journals/           # Gestion des journaux
│   │   │   │   ├── JournauxView.tsx
│   │   │   │   ├── JournalEntriesTable.tsx
│   │   │   │   └── RegenerateEntryModal.tsx
│   │   │   ├── grand-livre/        # Grand Livre
│   │   │   │   └── GrandLivreView.tsx
│   │   │   ├── lettrage/           # Lettrage
│   │   │   │   └── LettrageView.tsx
│   │   │   ├── etats-financiers/   # États financiers
│   │   │   │   └── EtatsFinanciersView.tsx
│   │   │   ├── invoices/           # Liste factures
│   │   │   │   ├── InvoicesListView.tsx
│   │   │   │   └── InvoiceDetailsDialog.tsx
│   │   │   ├── settings/           # Paramètres
│   │   │   │   └── CompanySettingsView.tsx
│   │   │   └── ui/                 # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── backend-client.ts       # Client API principal
│   │   │   │   └── clients/                # Clients par domaine
│   │   │   │       ├── accounting-client.ts
│   │   │   │       ├── invoices-client.ts
│   │   │   │       ├── journals-client.ts
│   │   │   │       └── ... (autres clients)
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── vite.config.ts
│
├── Backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── health.ts              # Health checks
│   │   │   ├── analysis.ts            # Analyse IA (QWEN)
│   │   │   ├── invoices.ts            # CRUD factures
│   │   │   ├── accounting.ts          # Écritures comptables
│   │   │   │   └── handlers/          # Handlers séparés
│   │   │   │       ├── generate.ts    # Générer écriture
│   │   │   │       ├── save.ts        # Sauvegarder écriture
│   │   │   │       ├── refine.ts      # Affiner écriture (chat)
│   │   │   │       ├── validate-entry.ts
│   │   │   │       └── ...
│   │   │   ├── journals.ts            # Journaux comptables
│   │   │   ├── grand-livre.ts         # Grand Livre
│   │   │   ├── lettrage.ts            # Lettrage
│   │   │   ├── etats-financiers.ts    # États financiers
│   │   │   ├── audit.ts               # Audit comptable
│   │   │   └── company.ts             # Paramètres société
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── analyzer.ts        # Service QWEN (vision)
│   │   │   │   ├── prompts.ts         # Prompts QWEN
│   │   │   │   └── types.ts           # Types IA
│   │   │   ├── accounting/
│   │   │   │   ├── gemini-accounting.ts  # Service Gemini (comptabilité)
│   │   │   │   └── index.ts
│   │   │   ├── journals/
│   │   │   │   ├── journal-service.ts
│   │   │   │   └── regenerate-entry.ts
│   │   │   ├── grand-livre/
│   │   │   │   └── grand-livre-service.ts
│   │   │   ├── lettrage/
│   │   │   │   └── lettrage-service.ts
│   │   │   └── etats-financiers/
│   │   │       └── etats-financiers-service.ts
│   │   ├── repositories/
│   │   │   ├── base.repository.ts
│   │   │   ├── invoice.repository.ts
│   │   │   └── session.repository.ts
│   │   ├── middleware/
│   │   │   └── error-handler.ts
│   │   ├── config/
│   │   │   ├── env.ts                 # Variables d'environnement
│   │   │   └── business.ts            # Règles métier
│   │   ├── lib/
│   │   │   ├── supabase.ts            # Client Supabase
│   │   │   └── result.ts              # Pattern Result (Either)
│   │   ├── app.ts                     # Configuration Hono
│   │   └── index.ts                   # Point d'entrée
│   └── package.json
│
├── supabase/
│   ├── journals_lettrage.sql          # Schéma DB
│   └── ... (autres scripts SQL)
│
├── ARCHITECTURE.md                    # Documentation architecture
├── ANALYSE_IA_COMPTABLE.md            # Analyse fiabilité IA
└── claude.md                          # Cette documentation
```

---

## 🔌 API ENDPOINTS PRINCIPAUX

### Health
- `GET /api/health` - Health check

### Analysis (IA Vision - QWEN)
- `POST /api/analysis/image` - Analyser une image de facture
- `POST /api/analysis/pdf` - Analyser un PDF

### Invoices (Factures)
- `GET /api/invoices` - Liste des factures
- `GET /api/invoices/:id` - Détails d'une facture
- `POST /api/invoices` - Créer une facture
- `PATCH /api/invoices/:id` - Mettre à jour
- `DELETE /api/invoices/:id` - Supprimer

### Accounting (Comptabilité - Gemini/DeepSeek)
- `POST /api/accounting/generate` - Générer écriture comptable
- `POST /api/accounting/save` - Sauvegarder écriture
- `POST /api/accounting/refine` - Affiner écriture (chat)
- `POST /api/accounting/validate-entry` - Valider écriture
- `GET /api/accounting/context` - Contexte comptable (plan, tiers, journaux)
- `GET /api/accounting/tiers` - Liste des tiers
- `GET /api/accounting/plan-comptable` - Plan comptable

### Journals (Journaux)
- `GET /api/journals/entries` - Liste des écritures
- `GET /api/journals/stats` - Statistiques
- `POST /api/journals/regenerate` - Régénérer écriture

### Grand Livre
- `GET /api/grand-livre` - Consultation par compte et période

### Lettrage
- `GET /api/lettrage` - Consultation des écritures à lettrer
- `POST /api/lettrage/lettrer` - Lettrer des écritures

### États Financiers
- `GET /api/etats-financiers/balance` - Balance générale
- `GET /api/etats-financiers/bilan` - Bilan
- `GET /api/etats-financiers/resultat` - Compte de résultat

### Audit
- `POST /api/audit` - Lancer un audit comptable IA

---

## 💡 CONCEPTS CLÉS SYSCOHADA

### Journaux Comptables

| Code | Nom | Usage | Contrepartie |
|------|-----|-------|--------------|
| **CA** | Caisse | Paiements espèces | 571 (Caisse) |
| **BQ** | Banque | CB, virements, chèques | 521x (Banques) |
| **AC** | Achats | Factures fournisseurs à crédit | 4011 (Fournisseurs) |
| **VE** | Ventes | Factures clients à crédit | 4111 (Clients) |
| **OD** | Opérations Diverses | Régularisations, écritures spéciales | Variable |

### Plan Comptable (Classes principales)

| Classe | Catégorie | Exemples |
|--------|-----------|----------|
| **4xxx** | Tiers | 4011 (Fournisseurs), 4111 (Clients), 4431 (TVA collectée), 4452 (TVA déductible) |
| **5xxx** | Trésorerie | 5211 (Banque Atlantique), 571 (Caisse) |
| **6xxx** | Charges (Achats) | 6011 (Achats matériel info), 6052 (Électricité), 6261 (Téléphone) |
| **7xxx** | Produits (Ventes) | 7011 (Ventes matériel info), 7052 (Services maintenance) |

### Règles Fondamentales

1. **Équilibre**: Total Débit = Total Crédit (TOUJOURS)
2. **Ventilation**: Une ligne par catégorie de produit (OBLIGATOIRE)
3. **Sens**:
   - Charges (6xxx) et Actifs au DÉBIT
   - Produits (7xxx) et Passifs au CRÉDIT
4. **TVA**: Taux normal 18% en Côte d'Ivoire

### Schémas d'écritures types

#### ACHAT payé en espèces → Journal CA
```
Débit:  6xxx (Charge) HT
Débit:  4452 (TVA déductible)
Crédit: 571 (Caisse) TTC
```

#### ACHAT payé par banque → Journal BQ
```
Débit:  6xxx (Charge) HT
Débit:  4452 (TVA déductible)
Crédit: 521x (Banque) TTC
```

#### ACHAT à crédit → Journal AC
```
Débit:  6xxx (Charge) HT
Débit:  4452 (TVA déductible)
Crédit: 4011 (Fournisseurs) TTC
```

#### VENTE à crédit → Journal VE
```
Débit:  4111 (Clients) TTC
Crédit: 7xxx (Produit) HT
Crédit: 4431 (TVA collectée)
```

#### VENTE encaissée → Journal BQ ou CA
```
Débit:  521x (Banque) ou 571 (Caisse) TTC
Crédit: 7xxx (Produit) HT
Crédit: 4431 (TVA collectée)
```

---

## 🧠 LOGIQUE IA - QUI FAIT QUOI ?

### QWEN 2-VL 7B (Vision OCR)

**Rôle**: Extraction de données structurées depuis l'image de la facture

**Input**: Image (base64) ou PDF

**Output**: JSON structuré
```json
{
  "numero_facture": "FAC-2025-001",
  "date_facture": "2025-01-15",
  "fournisseur": "MICROTECH ABIDJAN",
  "client": "EXIAS",
  "type_document": "ticket_caisse | facture | recu",
  "mode_paiement": "especes | carte_bancaire | virement | credit",
  "montant_ht": 159000,
  "montant_tva": 28620,
  "montant_ttc": 187620,
  "lignes": [
    { "designation": "SSD Samsung T7", "quantite": 1, "prix_unitaire": 115000, "total": 115000 },
    { "designation": "Câbles USB", "quantite": 2, "prix_unitaire": 22000, "total": 44000 }
  ]
}
```

**Ce que QWEN NE FAIT PAS**:
- ❌ Choisir le journal comptable
- ❌ Générer l'écriture comptable
- ❌ Raisonner sur les règles SYSCOHADA

**Fichiers clés**:
- `Backend/src/services/ai/analyzer.ts`
- `Backend/src/services/ai/prompts.ts`

---

### GEMINI Flash 2.0 / DeepSeek v3.2 (Raisonnement Comptable)

**Rôle**: Expert-comptable virtuel avec raisonnement SYSCOHADA

**Input**:
- JSON de QWEN (données extraites)
- Contexte comptable (plan de comptes, tiers, journaux, entreprise)
- Statut de paiement (confirmé par l'utilisateur)

**Output**: Écriture comptable complète
```json
{
  "journal_code": "BQ",
  "journal_libelle": "Journal de Banque",
  "date_piece": "2025-01-15",
  "numero_piece": "FAC-2025-001",
  "libelle_general": "Achat matériel MICROTECH",
  "tiers_code": "FMICRO",
  "tiers_nom": "MICROTECH ABIDJAN",
  "lignes": [
    { "numero_compte": "6011", "libelle_compte": "Achats matériel informatique", "debit": 115000, "credit": 0 },
    { "numero_compte": "6012", "libelle_compte": "Achats accessoires", "debit": 44000, "credit": 0 },
    { "numero_compte": "4452", "libelle_compte": "TVA déductible", "debit": 28620, "credit": 0 },
    { "numero_compte": "5211", "libelle_compte": "Banque Atlantique CI", "debit": 0, "credit": 187620 }
  ],
  "total_debit": 187620,
  "total_credit": 187620,
  "equilibre": true,
  "reasoning": "Détecté paiement CB → Journal BQ..."
}
```

**Ce que Gemini/DeepSeek FAIT**:
- ✅ Analyse le type de document (ticket vs facture)
- ✅ Lit le mode de paiement fourni par QWEN
- ✅ Applique les règles SYSCOHADA
- ✅ Choisit le journal et les comptes appropriés
- ✅ Génère l'écriture équilibrée avec raisonnement explicite

**Fichiers clés**:
- `Backend/src/services/accounting/gemini-accounting.ts`

**Prompt clé**: Variable `ACCOUNTING_CONTEXT` (lignes 63-240)

---

## 🎯 POINTS D'ENTRÉE POUR MODIFICATIONS

### Modifier le comportement de l'extraction (QWEN)
➡️ `Backend/src/services/ai/prompts.ts` - Modifier le prompt QWEN

### Modifier les règles comptables (Gemini)
➡️ `Backend/src/services/accounting/gemini-accounting.ts` - Variable `ACCOUNTING_CONTEXT` (ligne 63)

### Ajouter un nouveau type de document
1. Modifier le prompt QWEN (`Backend/src/services/ai/prompts.ts`)
2. Modifier le prompt Gemini (`ACCOUNTING_CONTEXT`)
3. Ajouter le type dans les types TS (`Backend/src/services/ai/types.ts`)

### Ajouter un nouveau journal
1. Insérer dans Supabase: `INSERT INTO journaux (code, libelle, type_journal) VALUES (...)`
2. Modifier le prompt Gemini pour inclure les règles du nouveau journal
3. Mettre à jour le frontend (`Frontend/src/components/journals/JournauxView.tsx`)

### Ajouter un nouveau compte au plan comptable
1. Insérer dans Supabase: `INSERT INTO plan_comptable (...) VALUES (...)`
2. Le compte sera automatiquement disponible pour Gemini (contexte dynamique)

### Modifier le design d'un composant
➡️ `Frontend/src/components/...` (architecture par domaine)

### Ajouter une nouvelle route API
1. Créer le fichier dans `Backend/src/routes/`
2. Enregistrer la route dans `Backend/src/app.ts` (ligne ~55)

---

## 🔧 VARIABLES D'ENVIRONNEMENT

### Frontend (.env)
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_USE_BACKEND=true
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Backend (.env)
```env
PORT=3001
OPENROUTER_API_KEY=sk-or-xxx
GEMINI_MODEL=google/gemini-flash-2.0
QWEN_MODEL=qwen/qwen-2-vl-7b-instruct
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
CORS_ORIGINS=http://localhost:5173,https://app.example.com
```

---

## 🚀 COMMANDES UTILES

### Frontend
```bash
cd Frontend
npm install
npm run dev           # Développement (http://localhost:5173)
npm run build         # Production
npm run preview       # Preview du build
```

### Backend
```bash
cd Backend
npm install
npm run dev           # Développement avec hot-reload (http://localhost:3001)
npm run build         # Compile TypeScript
npm start             # Production
npm run typecheck     # Vérification TypeScript sans build
```

---

## 📝 RÈGLES MÉTIER IMPORTANTES

### Identification VENTE vs ACHAT
- **VENTE**: Le champ `fournisseur` du JSON contient le nom de notre entreprise (EXIAS)
- **ACHAT**: Le champ `fournisseur` du JSON ne contient PAS le nom de notre entreprise

### Sélection du Journal selon le mode de paiement

| Mode Paiement | Type Document | Journal | Contrepartie |
|---------------|---------------|---------|--------------|
| Espèces | Ticket caisse | CA | 571 (Caisse) |
| Carte bancaire | Ticket/Facture | BQ | 521x (Banque) |
| Virement | Facture | BQ | 521x (Banque) |
| Chèque | Facture | BQ | 521x (Banque) |
| À crédit (achat) | Facture | AC | 4011 (Fournisseurs) |
| À crédit (vente) | Facture | VE | 4111 (Clients) |

### Règle de Ventilation OBLIGATOIRE
Pour chaque catégorie de produit dans la facture, créer UNE LIGNE COMPTABLE SÉPARÉE.

**INTERDIT**:
```
7011 Ventes matériel   2,005,000 (CRÉDIT)  ❌
```

**CORRECT**:
```
7011 Ventes matériel informatique  1,100,000 (CRÉDIT) - PC
7012 Ventes accessoires             180,000 (CRÉDIT) - Scanner
7016 Ventes logiciels               450,000 (CRÉDIT) - Licence
7014 Ventes mobilier                275,000 (CRÉDIT) - Chaise
```

---

## 🐛 DEBUGGING

### Logs Backend
Le backend utilise le middleware `logger()` de Hono qui affiche toutes les requêtes dans la console.

Pour ajouter des logs personnalisés:
```typescript
console.log("[Mon Service]", "message", { data });
```

### React Query DevTools
Ajouter dans `Frontend/src/App.tsx`:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Dans le composant App
<ReactQueryDevtools initialIsOpen={false} />
```

### Inspecter les réponses IA
- Les réponses QWEN sont dans `Backend/src/services/ai/analyzer.ts`
- Les réponses Gemini sont dans `Backend/src/services/accounting/gemini-accounting.ts`
- Ajouter `console.log` après `await response.json()` pour voir la réponse brute

---

## 📚 RESSOURCES

### Documentation Externe
- [Hono.js](https://hono.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Supabase](https://supabase.com/docs)
- [OpenRouter](https://openrouter.ai/docs)
- [SYSCOHADA](https://www.ohada.org/)

### Fichiers de Référence Interne
- `ARCHITECTURE.md` - Vue d'ensemble architecture
- `ANALYSE_IA_COMPTABLE.md` - Analyse fiabilité IA (QWEN + Gemini)

---

## ✅ CHECKLIST POUR MODIFICATIONS

Avant de modifier le code:

1. ✅ Lire cette documentation (`claude.md`)
2. ✅ Identifier les fichiers concernés
3. ✅ Comprendre le flux de données
4. ✅ Vérifier les types TypeScript
5. ✅ Tester en local
6. ✅ Vérifier la cohérence Frontend ↔ Backend
7. ✅ Vérifier que les écritures sont équilibrées (débit = crédit)

---

## 🎓 ONBOARDING RAPIDE

### Pour comprendre le flux complet:

1. **Capture facture**: `Frontend/src/components/desktop/DesktopDashboard.tsx` ligne ~150
2. **Upload backend**: `Backend/src/routes/analysis.ts` ligne ~30
3. **Analyse QWEN**: `Backend/src/services/ai/analyzer.ts` ligne ~50
4. **Génération écriture**: `Backend/src/routes/accounting/handlers/generate.ts` ligne ~20
5. **Raisonnement Gemini**: `Backend/src/services/accounting/gemini-accounting.ts` ligne ~506
6. **Affichage résultat**: `Frontend/src/components/accounting/AccountingEntryView.tsx`
7. **Sauvegarde**: `Backend/src/routes/accounting/handlers/save.ts`

---

**Dernière mise à jour**: 2026-01-22
**Maintenu par**: Claude Sonnet 4.5


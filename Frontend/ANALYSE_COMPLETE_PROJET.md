# 📊 Analyse Complète du Projet Fact Capture AI

*Analyse réalisée le 21/12/2024*

---

## 📝 1. Résumé du Projet

### Description Générale

**Fact Capture AI** est une application web progressive (PWA) de numérisation et d'analyse intelligente de factures, conçue spécifiquement pour le **contexte ivoirien**. L'application exploite l'intelligence artificielle via OpenRouter pour extraire automatiquement les données des factures (images ou PDF) et les exporter vers Excel ou PDF.

### Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI Framework** | Shadcn/ui + Tailwind CSS + Radix UI |
| **État global** | React Query + useState |
| **Backend** | Supabase (PostgreSQL + Realtime) |
| **Base locale** | Dexie.js (IndexedDB) |
| **IA/ML** | OpenRouter API (Qwen3-VL-32B par défaut) |
| **PDF Processing** | pdfjs-dist |

### Flux Principal de l'Application

```
┌─────────────────────────────────────────────────────────────────┐
│                      WORKFLOW UTILISATEUR                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📱 MOBILE (PWA)                    💻 DESKTOP (Web)            │
│  ─────────────────                  ──────────────────          │
│                                                                 │
│  1. Ouvrir l'app mobile            1. Cliquer "Nouveau → Photo" │
│          ↓                                   ↓                  │
│  2. En attente du PC               2. Session "waiting" créée   │
│          ↓                                   ↓                  │
│  3. Boutons activés ← ─ ─ ─ ─ ─ ─ ─ Realtime Supabase           │
│          ↓                                                      │
│  4. Capturer/Importer photo                                     │
│          ↓                                                      │
│  5. Prévisualisation + Crop                                     │
│          ↓                                                      │
│  6. Envoi vers Supabase ─ ─ ─ ─ ─ → 7. Réception image          │
│                                            ↓                    │
│                                     8. Analyse IA (OpenRouter)  │
│                                            ↓                    │
│                                     9. Affichage données        │
│                                            ↓                    │
│                                     10. Chat IA / Edition       │
│                                            ↓                    │
│                                     11. Export PDF / Excel      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Fonctionnalités Actuelles

| Module | Fonctionnalités |
|--------|-----------------|
| **Capture** | Appareil photo mobile, galerie, import PDF, import PC |
| **Analyse IA** | Extraction fournisseur/date/montants/TVA, tableau articles, détection type document, conversion FCFA, détection anomalies |
| **Chat IA** | Questions sur facture, modification données via chat, ré-analyse avec image |
| **Export** | PDF (impression navigateur), Excel (CSV), téléchargement image source |
| **Sync** | Sessions de capture temps réel via Supabase Realtime |

---

## 🔧 2. Fichiers à Refactoriser

### 2.1 `src/lib/openrouter.ts` (540 lignes) ⚠️ PRIORITÉ HAUTE

**Problèmes identifiés :**
- Fichier monolithique mélant plusieurs responsabilités
- Prompts IA hardcodés dans le code
- Logique PDF mélangée avec l'API client
- Difficile à tester unitairement

**Recommandations :**
```
src/lib/
├── ai/
│   ├── prompts.ts          # Tous les prompts IA
│   ├── openrouter-client.ts # Client API abstrait
│   ├── invoice-analyzer.ts  # Analyse de factures
│   ├── chat-service.ts      # Service de chat
│   └── types.ts             # Interfaces IA
└── pdf/
    └── pdf-converter.ts     # Conversion PDF → Image
```

---

### 2.2 `src/components/desktop/DesktopDashboard.tsx` (413 lignes) ⚠️ PRIORITÉ HAUTE

**Problèmes identifiés :**
- Composant "God Component" avec trop de state
- Logique métier dans le composant UI
- 50+ lignes de handlers
- Difficile à maintenir

**Recommandations :**
```typescript
// Extraire dans des hooks personnalisés
src/hooks/
├── useInvoiceSync.ts      # Gestion sync Supabase
├── useInvoiceAnalysis.ts  # Logique d'analyse
├── useInvoiceChat.ts      # État et logique chat
└── useFileUpload.ts       # Gestion upload fichiers

// Ou créer un contexte
src/contexts/
└── InvoiceContext.tsx     # État global facture
```

---

### 2.3 `src/components/desktop/InvoiceDataPanel.tsx` (523 lignes) ⚠️ PRIORITÉ MOYENNE

**Problèmes identifiés :**
- Composant UI monolithique
- Rendu conditionnel complexe (5 états différents)
- Styles inline répétés

**Recommandations :**
```
src/components/desktop/invoice-panel/
├── InvoiceDataPanel.tsx    # Composant parent simplifié
├── InvoiceHeader.tsx       # Header avec actions
├── InvoiceMetaCards.tsx    # Cartes montant/fournisseur/date
├── ExtraFieldsSection.tsx  # Champs supplémentaires
├── EmptyStates/
│   ├── WaitingState.tsx
│   ├── AnalyzingState.tsx
│   ├── ErrorState.tsx
│   └── NotInvoiceState.tsx
└── index.ts
```

---

### 2.4 `src/lib/export-utils.ts` (333 lignes) ⚠️ PRIORITÉ MOYENNE

**Problèmes identifiés :**
- HTML template de 200+ lignes inline
- Génération PDF via window.print() (limité)
- Pas de gestion d'erreur robuste

**Recommandations :**
- Utiliser une vraie librairie PDF (jsPDF, @react-pdf/renderer)
- Externaliser les templates HTML
- Implémenter une classe `ExportService`

---

### 2.5 `src/lib/supabase.ts` (280 lignes) ⚠️ PRIORITÉ BASSE

**Problèmes identifiés :**
- Pas de types générés depuis Supabase
- Gestion d'erreur dispersée
- Fonctions similaires non factorisées

**Recommandations :**
- Générer les types avec `supabase gen types typescript`
- Créer un wrapper avec retry automatique
- Centraliser les erreurs

---

### 2.6 `src/components/mobile/MobileScanView.tsx` (260 lignes) ⚠️ PRIORITÉ BASSE

**Problèmes identifiés :**
- État et logique métier dans le composant
- Handlers longs

**Recommandations :**
- Extraire dans `useMobileScan.ts`
- Séparer les vues (home, preview, analyzing, success)

---

## 🐛 3. Anomalies et Bugs Identifiés

### 🔴 Bugs Critiques

#### Bug #1 : Typo CSS dans MobileScanView.tsx (ligne ~180)
```tsx
// ❌ ACTUEL (bug)
<Loader2 className="h-3 w-3 animate-spin map-1" />

// ✅ CORRECTION
<Loader2 className="h-3 w-3 animate-spin mr-1" />
```

#### Bug #2 : Signature de fonction incohérente `saveInvoiceToSupabase`
```typescript
// Dans supabase.ts - 2 paramètres
export async function saveInvoiceToSupabase(
  imageBase64: string,
  aiResult?: FlexibleInvoiceAIResult
): Promise<InvoiceRecord | null>

// Dans MobileScanView.tsx - 3 paramètres appelés !
await saveInvoiceToSupabase(base64, aiResult, activeSession?.id);
// Le sessionId n'est jamais utilisé dans la fonction !
```

#### Bug #3 : Sessions de capture qui n'expirent jamais
- Les sessions "waiting" restent indéfiniment dans la DB
- La fonction SQL `cleanup_old_capture_sessions()` existe mais n'est jamais appelée

---

### 🟡 Anomalies de Code

#### Anomalie #4 : Variable calculée non utilisée
```typescript
// ArticlesTable.tsx
const calculatedTotalHT = articles.reduce((sum, item) => {
  return sum + parseAmount(item.total);
}, 0);  // ← Cette variable n'est jamais utilisée !
```

#### Anomalie #5 : Dépendance React manquante
```typescript
// DesktopDashboard.tsx
const processSupabaseInvoice = useCallback(async (record: InvoiceRecord) => {
  // ...
  toast({ ... }); // toast est utilisé mais pas dans les deps
}, [toast]); // ← OK ici mais attention aux autres useCallback
```

#### Anomalie #6 : Type `any` dans PhotoPreview.tsx
```typescript
// ❌ ACTUEL
const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

// ✅ CORRECTION
interface CroppedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedArea | null>(null);
```

#### Anomalie #7 : Pas de validation des entrées utilisateur
- Les champs éditables acceptent n'importe quelle valeur
- Risque d'injection XSS/CSV dans les exports

#### Anomalie #8 : Base locale effacée à chaque nouvelle photo
```typescript
// db.ts
export async function saveInvoice(imageBase64: string): Promise<number> {
  await db.invoices.clear(); // ← Supprime TOUT avant d'ajouter !
  return await db.invoices.add({...});
}
```

#### Anomalie #9 : Gestion d'erreur silencieuse
```typescript
// openrouter.ts
} catch (e) {
  console.error("Failed to parse AI response JSON:", e);
  return null;  // ← Erreur cachée à l'utilisateur
}
```

---

### 🔒 Problèmes de Sécurité

#### Sécurité #10 : Clés API exposées côté client
```typescript
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
// Cette clé est visible dans le bundle JavaScript !
```
**Recommandation :** Utiliser une Edge Function Supabase comme proxy

#### Sécurité #11 : RLS Supabase trop permissive
```sql
CREATE POLICY "Allow all operations on capture_sessions" ON capture_sessions
  FOR ALL USING (true) WITH CHECK (true);
-- N'importe qui peut lire/modifier toutes les factures !
```

#### Sécurité #12 : Pas d'authentification
- Aucune gestion utilisateur
- Toutes les données sont publiques

---

## 🚀 4. Évolution vers une Solution Comptable (Type Sage)

### L'affirmation du comptable est-elle réalisable ?

**✅ OUI, c'est techniquement possible et représente une vraie opportunité marché.**

L'application actuelle pose déjà ~70% des fondations nécessaires (capture, OCR, extraction). Il reste à ajouter le "cerveau comptable".

---

### Fonctionnalités Sage à Implémenter

| Fonctionnalité | Complexité | Valeur PME | IA Applicable |
|----------------|------------|------------|---------------|
| **Plan comptable SYSCOHADA** | 🟢 Facile | ⭐⭐⭐⭐⭐ | Référentiel statique |
| **Écritures comptables** | 🟡 Moyenne | ⭐⭐⭐⭐⭐ | Imputation auto |
| **Journal achats/ventes** | 🟡 Moyenne | ⭐⭐⭐⭐⭐ | Génération auto |
| **Grand livre** | 🟡 Moyenne | ⭐⭐⭐⭐ | Filtres intelligents |
| **Balance générale** | 🟢 Facile | ⭐⭐⭐⭐ | Calculs |
| **Facturation clients** | 🟡 Moyenne | ⭐⭐⭐⭐ | Génération |
| **Compte de résultat** | 🟠 Élevée | ⭐⭐⭐⭐⭐ | Analyse tendances |
| **Bilan** | 🟠 Élevée | ⭐⭐⭐⭐⭐ | Projection |
| **Clôture période** | 🟠 Élevée | ⭐⭐⭐⭐ | Validation auto |
| **Rapprochement bancaire** | 🟠 Élevée | ⭐⭐⭐⭐ | Matching IA |
| **Déclarations TVA** | 🟡 Moyenne | ⭐⭐⭐⭐⭐ | Calcul + formulaire |
| **Multi-exercices** | 🟡 Moyenne | ⭐⭐⭐ | Report à nouveau |

---

### Architecture Recommandée v2.0

```
┌──────────────────────────────────────────────────────────────────┐
│                    FACT CAPTURE AI v2.0                          │
│               "Comptabilité IA pour PME Africaines"              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ 📄 Module   │  │ 📊 Module   │  │ 📈 Module   │              │
│  │  Capture    │  │  Compta     │  │  Reporting  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────▼────────────────▼────────────────▼──────┐              │
│  │              🤖 MOTEUR IA CENTRAL              │              │
│  │  ────────────────────────────────────────────  │              │
│  │  • OCR + Extraction données (actuel)          │              │
│  │  • Imputation comptable automatique           │              │
│  │  • Détection anomalies comptables             │              │
│  │  • Assistant conversationnel expert           │              │
│  │  • Prédiction trésorerie                      │              │
│  │  • Génération rapports                        │              │
│  └──────────────────────┬───────────────────────┘              │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────┐              │
│  │       📁 BASE DE DONNÉES COMPTABLE            │              │
│  │           PostgreSQL (Supabase)               │              │
│  ├───────────────────────────────────────────────┤              │
│  │  Tables principales :                         │              │
│  │  • entreprises (multi-tenant)                │              │
│  │  • plan_comptable (SYSCOHADA)                │              │
│  │  • exercices_comptables                      │              │
│  │  • journaux (ACH, VTE, BQ, OD)              │              │
│  │  • ecritures                                 │              │
│  │  • factures_fournisseurs (actuel)           │              │
│  │  • factures_clients                         │              │
│  │  • tiers (clients, fournisseurs)            │              │
│  │  • comptes_bancaires                        │              │
│  │  • rapprochements_bancaires                 │              │
│  └───────────────────────────────────────────────┘              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Modèles IA Recommandés (via OpenRouter)

Voici les modèles les plus adaptés pour chaque tâche comptable :

| Modèle | Cas d'usage | Coût/1M tokens | Points forts |
|--------|-------------|----------------|--------------|
| **Qwen3-VL-32B** (actuel) | OCR + extraction visuelle | ~$0.50 | Excellent vision, économique |
| **GPT-4o** | Assistant comptable conversationnel | ~$5.00 | Meilleure compréhension métier |
| **Claude 3.5 Sonnet** | Analyse documents complexes | ~$3.00 | Excellent sur documents longs |
| **Mistral Large 2** | Calculs et logique comptable | ~$2.00 | Rapide, bon en mathématiques |
| **DeepSeek V3** | Traitement batch économique | ~$0.27 | Très économique, performant |
| **Llama 3.3 70B** | Auto-hébergement possible | ~$0.40 | Open source, contrôle total |

#### Stratégie Multi-Modèle Recommandée

```typescript
// src/lib/ai/model-router.ts
export const AI_MODELS = {
  // Vision + OCR
  vision: "qwen/qwen-vl-plus",
  
  // Assistant conversationnel (qualité max)
  chat_premium: "openai/gpt-4o",
  
  // Assistant rapide (économique)
  chat_fast: "openai/gpt-4o-mini",
  
  // Analyse comptable complexe
  analysis: "anthropic/claude-3.5-sonnet",
  
  // Traitement batch (économique)
  batch: "deepseek/deepseek-chat",
  
  // Calculs et tableaux
  calculation: "mistral/mistral-large-latest"
};

// Usage dynamique selon la tâche
export function selectModel(task: AITask): string {
  switch(task) {
    case 'ocr': return AI_MODELS.vision;
    case 'imputation': return AI_MODELS.analysis;
    case 'quick_chat': return AI_MODELS.chat_fast;
    case 'detailed_analysis': return AI_MODELS.chat_premium;
    case 'batch_processing': return AI_MODELS.batch;
  }
}
```

---

### Fonctionnalités IA Innovantes à Développer

#### 1. Imputation Comptable Automatique
```
Facture EDF → IA détecte "électricité" → Propose compte 6061 (Énergie)
Facture Amazon → IA détecte "fournitures bureau" → Propose compte 6064

Prompt exemple :
"Tu es un expert comptable SYSCOHADA. Voici une facture de [fournisseur] 
pour [description]. Propose le compte de charge approprié avec justification."
```

#### 2. Détection Anomalies Avancée
- Factures en double (même n°, même montant)
- Montants inhabituels vs historique
- TVA incorrecte (18% attendu en CI)
- Dépenses hors budget
- Factures sans justificatif

#### 3. Assistant Comptable Naturel
```
User: "Quel est mon résultat ce trimestre ?"
IA: "Votre résultat net au T4 2024 est de 2.4M FCFA (+12% vs T3).
     📈 Produits : 15.2M FCFA
     📉 Charges : 12.8M FCFA
     ⚠️ Les charges ont augmenté de 8%, principalement en achats (compte 60)."

User: "Combien je dois à mes fournisseurs ?"
IA: "Votre solde fournisseurs (compte 401) au 21/12 :
     Total dû : 3.8M FCFA
     - ORANGE CI : 1.2M (échéance 28/12) ⚠️
     - CIE : 890K (échéance 15/01)
     - Autres : 1.7M
     💡 Conseil : Priorisez ORANGE CI, échéance dans 7 jours."
```

#### 4. Prévision Trésorerie
- Analyse patterns de paiement clients/fournisseurs
- Projection encaissements/décaissements
- Alerte si risque de découvert

---

### Estimation des Coûts IA

Pour une PME typique (~500 factures/mois, 50 requêtes chat/jour) :

| Usage | Volume/mois | Modèle | Coût estimé |
|-------|-------------|--------|-------------|
| OCR factures | 500 × 2K tokens | Qwen-VL | ~$0.50 |
| Imputation auto | 500 × 1K tokens | Claude | ~$1.50 |
| Chat assistant | 1500 × 500 tokens | GPT-4o-mini | ~$0.75 |
| Analyses complexes | 50 × 2K tokens | GPT-4o | ~$0.50 |
| Rapports batch | 10 × 5K tokens | DeepSeek | ~$0.01 |
| **TOTAL** | | | **~$3-5/mois** |

C'est **10 à 50 fois moins cher** qu'un abonnement Sage !

---

### Roadmap de Développement Suggérée

#### Phase 1 : Fondations (2-3 mois)
- [ ] Refactorisation code existant
- [ ] Authentification utilisateur (Supabase Auth)
- [ ] Modèle de données comptable (PostgreSQL)
- [ ] Plan comptable SYSCOHADA intégré
- [ ] Multi-tenant (plusieurs entreprises)

#### Phase 2 : Comptabilité de Base (2-3 mois)
- [ ] Interface saisie manuelle écritures
- [ ] Imputation automatique IA
- [ ] Journal des achats (lié aux factures scannées)
- [ ] Journal des ventes
- [ ] Grand livre consultable
- [ ] Balance générale

#### Phase 3 : Fonctions Avancées (3-4 mois)
- [ ] Module facturation clients
- [ ] Import relevés bancaires (CSV)
- [ ] Rapprochement bancaire assisté IA
- [ ] Déclarations TVA (DGI Côte d'Ivoire)
- [ ] Clôture période avec contrôles

#### Phase 4 : Intelligence & Reporting (2-3 mois)
- [ ] Dashboard analytique temps réel
- [ ] Compte de résultat automatique
- [ ] Bilan simplifié
- [ ] Prévision trésorerie IA
- [ ] Alertes intelligentes
- [ ] Export formats réglementaires

---

### Avantages Concurrentiels vs Sage

| Critère | Sage | Fact Capture AI v2 |
|---------|------|-------------------|
| **Prix** | 50-500€/mois | 5-15€/mois |
| **Installation** | Logiciel lourd | Web (PWA) |
| **Mobile** | Limité | Native |
| **IA** | Aucune | Cœur du produit |
| **OCR** | Module payant | Intégré |
| **Contexte local** | Générique | SYSCOHADA + FCFA |
| **Courbe apprentissage** | Complexe | Assistée par IA |
| **Support** | Coûteux | Chat IA 24/7 |

---

## 🎯 Conclusion

L'application **Fact Capture AI** dispose d'une excellente base technique pour évoluer vers une solution comptable complète destinée aux PME africaines. 

**Points forts actuels :**
- Architecture moderne (React, TypeScript, Supabase)
- Intégration IA fonctionnelle
- Synchronisation mobile/desktop
- Extraction de factures opérationnelle

**Travail restant :**
1. Refactoriser le code pour supporter l'échelle
2. Sécuriser l'application (auth, RLS)
3. Ajouter le module comptabilité (écritures, journaux, grand livre)
4. Enrichir les capacités IA (imputation, anomalies, rapports)
5. Conformité réglementaire (SYSCOHADA, DGI CI)

L'opportunité est réelle : les PME africaines ont besoin d'outils **simples, économiques et adaptés** à leur contexte. L'IA permet de **démocratiser l'accès** à des fonctionnalités autrefois réservées aux grandes entreprises.

---

*Document d'analyse généré le 21/12/2024*

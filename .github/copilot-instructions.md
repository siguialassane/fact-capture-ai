# Fact Capture AI — Project Guidelines

## Overview
Application comptable SYSCOHADA (Côte d'Ivoire) pour EXIAS SARL. Capture de factures par IA, génération d'écritures comptables, grand livre, lettrage, états financiers et audit.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite (port 8080), shadcn/ui, TanStack Query, React Router, PWA (Workbox)
- **Backend**: Hono.js sur Bun (port 3001), validation Zod, middleware stack: logger → timing → prettyJSON → secureHeaders → CORS → errorHandler
- **Database**: Supabase PostgreSQL (project ref: `pkzohbkityvivrwaypte`, MCP server: `supabase-exias-compta`)
- **IA Pipeline (3 modèles via OpenRouter)**:
  1. **QWEN 3 VL 235B** — extraction OCR vision des factures (`temperature: 0.1`)
  2. **DeepSeek v3.2** — génération écritures comptables SYSCOHADA avec reasoning (`temperature: 0`)
  3. **Claude 3.5 Sonnet** — audit des états financiers et écritures (`temperature: 0.1`)

## Build and Test
```bash
# Backend
cd Backend && bun install && bun run dev     # → http://localhost:3001
bun run typecheck                            # vérification types

# Frontend
cd Frontend && bun install && bun run dev    # → http://localhost:8080
bun run typecheck
bun run build                                # → dist/
```

## Code Style & Patterns

### Result Pattern (Backend)
Toutes les opérations faillibles retournent `Result<T, E>` — voir [Backend/src/lib/result.ts](Backend/src/lib/result.ts):
```typescript
const result = await tryCatch(() => someOp());
if (isFailure(result)) return c.json({ success: false, error: result.error });
return c.json({ success: true, data: result.data });
```

### Response Shape (uniforme)
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "details": {} } }
```

### Repository Pattern
- `BaseRepository` abstrait avec `protected get db(): SupabaseClient` — singleton Supabase via `getSupabase()`
- Exemple: [Backend/src/repositories/invoice.repository.ts](Backend/src/repositories/invoice.repository.ts)

### Error Handling
- `ApiError` class avec factory `Errors.badRequest()`, `Errors.notFound()`, `Errors.aiAnalysisError()`, etc.
- Voir [Backend/src/middleware/error-handler.ts](Backend/src/middleware/error-handler.ts)

### Frontend API Client
- Pattern composition: `BackendApiClient` façade → 12 clients domaine dans `Frontend/src/lib/api/clients/`
- Chaque client étend `BaseClient` (HTTP methods partagées)
- Types séparés dans `Frontend/src/lib/api/types/`

## Conventions Projet

### Naming (français)
Colonnes DB, variables métier, prompts IA en français: `date_piece`, `numero_piece`, `ecriture`, `lettre`, `libelle_compte`, `tiers_code`

### Numérotation des pièces
Format: `{JOURNAL}-{ANNEE}-{MOIS}-{SEQUENCE}` → ex: `AC-2025-01-00001`

### Journaux comptables
| Code | Type | Contrepartie |
|------|------|-------------|
| AC | Achats (fournisseurs) | 401 |
| VE | Ventes (clients) | 411 |
| BQ | Banque (CB, virement) | 512 |
| CA | Caisse (espèces) | 571 |
| OD | Opérations diverses | — |

### Tables Supabase principales
`invoices`, `journal_entries`, `journal_entry_lines`, `journaux`, `journal_sequences`, `plan_comptable`, `tiers`, `company_info`, `capture_sessions`, `lettrage_history`, `lettrage_sequences`

### Vues SQL
`vue_grand_livre`, `vue_balance`, `vue_journal_summary`, `vue_lignes_a_lettrer`

### Fonctions SQL
`get_next_piece_number()`, `get_next_lettre()`, `effectuer_lettrage()`, `effectuer_delettrage()`

## Configuration IA
Le fichier `gemini-accounting.ts` utilise en réalité DeepSeek (naming historique). Tous les appels IA passent par OpenRouter. Variables clés:
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (vision), `GEMINI_MODEL` (comptabilité)
- Monnaie: XOF (Franc CFA), TVA: 18% normal / 9% réduit / 0% exonéré

## Sécurité
- Clés API côté backend uniquement en production
- Frontend peut appeler OpenRouter directement (mode dev `VITE_USE_BACKEND=false`)
- RLS activé sur `capture_sessions` (politique permissive pour l'instant)
- Validation Zod sur toutes les entrées API

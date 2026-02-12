# 🔍 RAPPORT AUDIT - Mapping Colonnes Base de Données

**Date**: 10 février 2026  
**Objectif**: Vérifier cohérence entre schéma DB et code

---

## ✅ SCHÉMA RÉEL DES TABLES (Supabase)

### Table `journal_entry_lines`
```
- id (uuid)
- entry_id (uuid)
- numero_ligne (integer)
- compte_numero ⚠️ (character varying)  <- PAS "numero_compte"
- libelle (text)
- debit (numeric)
- credit (numeric)
- tiers_id (uuid)
- tiers_code (character varying)
- libelle_compte (character varying)
- ligne_ordre (integer)
- lettre (character varying)
- date_lettrage (timestamp)
- solde_non_lettre (numeric)
- date_echeance (date)
- lettrage (character varying)
- created_at (timestamp)
```

### Table `journal_entries`
```
- id (uuid)
- numero_piece (character varying)
- date_piece (date)
- journal_code (character varying)
- tiers_code (character varying)
- tiers_nom (character varying)
- total_debit (numeric)
- total_credit (numeric)
- statut (character varying)
- invoice_id (bigint)
- ... autres colonnes
```

### Table `plan_comptable`
```
- id (uuid)
- numero_compte ✅ (character varying)
- libelle (character varying)
- classe (integer)
- type_compte (character varying)
- sens_normal (character varying)
- est_utilisable (boolean)
- compte_parent (character varying)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### Table `tiers`
```
- id (uuid)
- code ✅ (character varying)
- type_tiers ✅ (character varying)
- raison_sociale ⚠️ (character varying)  <- PAS "nom"
- nom_commercial (character varying)
- compte_comptable ⚠️ (character varying) <- PAS "numero_compte_defaut"
- est_actif ⚠️ (boolean) <- PAS "actif"
- adresse (text)
- ville (character varying)
- pays (character varying)
- telephone (character varying)
- email (character varying)
- ... autres colonnes
```

---

## ❌ ERREURS DÉTECTÉES

### 1. `journal_entry_lines.compte_numero` vs `numero_compte`

**Problème**: Le code utilise `numero_compte` mais la colonne s'appelle `compte_numero`

**Fichiers affectés**:
- ✅ `Backend/src/routes/accounting/handlers/plan-comptable.ts` ligne 179 - **CORRIGÉ**
- ⚠️ Autres fichiers à vérifier (utilisant des vues SQL qui peuvent masquer le problème)

**Impact**: DELETE échoue avec erreur "column does not exist"

---

### 2. `tiers.raison_sociale` vs `nom`

**Problème**: Le code utilise `nom` mais la colonne s'appelle `raison_sociale`

**Fichiers affectés**:
- ❌ `Backend/src/routes/accounting/handlers/tiers.ts` ligne 15

**Code actuel (INCORRECT)**:
```typescript
.select("id, code, nom, type_tiers, numero_compte_defaut, adresse, ville, pays")
```

**Code correct**:
```typescript
.select("id, code, raison_sociale, type_tiers, compte_comptable, adresse, ville, pays")
```

---

### 3. `tiers.compte_comptable` vs `numero_compte_defaut`

**Problème**: Le code utilise `numero_compte_defaut` mais la colonne s'appelle `compte_comptable`

**Fichiers affectés**:
- ❌ `Backend/src/routes/accounting/handlers/tiers.ts` ligne 15

---

### 4. `tiers.est_actif` vs `actif`

**Problème**: Le code utilise `actif` mais la colonne s'appelle `est_actif`

**Fichiers affectés**:
- ❌ `Backend/src/routes/accounting/handlers/tiers.ts` ligne 16

**Code actuel (INCORRECT)**:
```typescript
.eq("actif", true)
```

**Code correct**:
```typescript
.eq("est_actif", true)
```

---

## ✅ FICHIERS DÉJÀ CORRECTS

### `accounting-context.ts` ✅
Ce fichier fait correctement le mapping :
```typescript
// Lecture DB (noms réels)
.select("code, raison_sociale, type_tiers, compte_comptable, est_actif")
.eq("est_actif", true)

// Mapping vers interface applicative
.map((t) => ({
  code: t.code,
  nom: t.raison_sociale,           // ✅ mapping
  type_tiers: t.type_tiers,
  numero_compte_defaut: t.compte_comptable,  // ✅ mapping
}))
```

### `save.ts` - Partiellement correct
Ligne 71-74 : ✅ Utilise bien les noms corrects
```typescript
.from("tiers")
.select("code, raison_sociale, type_tiers, compte_comptable")
```

Ligne 118 : ✅ Utilise bien `compte_numero` pour journal_entry_lines
```typescript
compte_numero: ligne.numero_compte,
```

---

## 🔧 CORRECTIONS À EFFECTUER

### Fichier 1: `Backend/src/routes/accounting/handlers/tiers.ts`

**Ligne 15 (SELECT)**:
```typescript
// AVANT
.select("id, code, nom, type_tiers, numero_compte_defaut, adresse, ville, pays")

// APRÈS
.select("id, code, raison_sociale as nom, type_tiers, compte_comptable as numero_compte_defaut, adresse, ville, pays")
```

**Ligne 16 (WHERE)**:
```typescript
// AVANT
.eq("actif", true)

// APRÈS
.eq("est_actif", true)
```

---

## 📊 STRATÉGIES DE MAPPING

### Option A: Alias SQL (Recommandé)
Utiliser `as` pour renommer à la volée :
```typescript
.select("raison_sociale as nom, compte_comptable as numero_compte_defaut")
```
✅ Avantage : Le code applicatif reste inchangé
❌ Inconvénient : Plus verbeux

### Option B: Mapping TypeScript
Transformer après récupération :
```typescript
.select("raison_sociale, compte_comptable")
// puis
.map(t => ({ nom: t.raison_sociale, numero_compte_defaut: t.compte_comptable }))
```
✅ Avantage : Plus propre, type-safe
❌ Inconvénient : Plus de code

### Option C (adoptée): Mix des deux
- Alias SQL pour les cas simples
- Mapping TS pour les cas complexes (comme `accounting-context.ts`)

---

## 🎯 RECOMMANDATIONS

### Court terme
1. ✅ Corriger `tiers.ts` immédiatement
2. ⚠️ Ajouter des tests d'intégration pour chaque endpoint CRUD
3. ⚠️ Logger les erreurs Supabase avec plus de détails

### Moyen terme
1. 🔄 Créer des types TypeScript correspondant EXACTEMENT aux tables
2. 🔄 Utiliser un ORM type-safe (Prisma, Drizzle) ou génération de types Supabase
3. 🔄 Ajouter validation schéma en CI/CD

### Long terme
1. 🚀 Migration DB pour unifier noms de colonnes (snake_case cohérent)
2. 🚀 Documentation auto-générée depuis schéma DB
3. 🚀 Tests E2E couvrant tous les endpoints

---

## 📋 CHECKLIST DE VÉRIFICATION

- [x] ✅ `journal_entry_lines.compte_numero` - Corrigé dans plan-comptable.ts
- [ ] ❌ `tiers.raison_sociale` (au lieu de `nom`)
- [ ] ❌ `tiers.compte_comptable` (au lieu de `numero_compte_defaut`)
- [ ] ❌ `tiers.est_actif` (au lieu de `actif`)
- [x] ✅ `plan_comptable.numero_compte` - Déjà correct partout
- [x] ✅ `journal_entries.*` - Déjà correct partout

---

## 🔍 VÉRIFICATION COMPLÈTE

Pour s'assurer qu'il n'y a pas d'autres problèmes cachés, voici les commandes SQL pour vérifier :

```sql
-- Vérifier toutes les colonnes de journal_entry_lines
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'journal_entry_lines' 
ORDER BY ordinal_position;

-- Vérifier toutes les colonnes de tiers
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tiers' 
ORDER BY ordinal_position;

-- Vérifier les vues (vue_grand_livre, vue_balance, etc.)
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public';
```

---

**Conclusion**: Le problème principal vient du manque de cohérence entre les noms de colonnes DB et les noms utilisés dans le code. La correction de `tiers.ts` est prioritaire.

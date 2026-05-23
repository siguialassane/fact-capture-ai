# Suivi anomalies QA - 2026-05-23

## Contexte

- Projet teste: `fact-capture-ai`
- Date du test: `2026-05-23`
- Front teste sur: `http://localhost:5174`
- Back teste sur: `http://localhost:3002`
- Piece de test:
  - `Artifacts/facture_achat_exias_test.png`
  - facture d'achat de materiel pour `EXIAS`
  - fournisseur: `Tech Distribution CI SARL`
  - numero: `FA-2026-0519`
  - date: `23/05/2026`
  - echeance: `30/05/2026`
  - total TTC: `2 454 400 FCFA`

## Parcours teste

1. `Capture IA`
2. `Ecriture IA`
3. `Journaux`
4. `Grand Livre`
5. `Balance`
6. `Lettrage`
7. `Rapprochement`
8. `Tableau de bord`

## Ce qui fonctionne bien

- [x] L'image de facture est bien chargee et visible dans le viewer.
- [x] `Capture IA` reconnait bien la piece comme une `facture` de type `achat`.
- [x] Les donnees principales sont extraites:
  - fournisseur
  - client `EXIAS`
  - numero de piece
  - date facture
  - date echeance
  - mode de paiement
  - articles
  - total HT / TVA / TTC
- [x] `Ecriture IA` comprend bien qu'il s'agit d'un achat fournisseur et genere une dette fournisseur.
- [x] L'ecriture generee est equilibree.
- [x] L'ecriture peut etre sauvegardee depuis le front.
- [x] `Grand Livre` integre bien la nouvelle ecriture.
- [x] `Balance` integre bien la nouvelle ecriture et reste equilibree.
- [x] `Rapprochement bancaire` vide est coherent dans ce cas, car la facture a ete comptabilisee en `non payee`.

## Anomalies ouvertes

### A1 - `Capture IA` n'affiche pas la TVA globale alors qu'elle est extraite

- Ecran: `Capture IA`
- Observation:
  - le champ `TVA globale` reste sur `Cliquez pour editer`
  - pourtant la TVA est bien extraite et detaillee (`374 400 FCFA`)
- Impact:
  - l'utilisateur peut croire que la TVA n'a pas ete comprise
  - perte de confiance dans la capture
- Priorite suggeree: Haute

### A2 - Probleme d'encodage texte dans plusieurs vues

- Ecrans touches:
  - `Capture IA`
  - document viewer
  - diverses zones de texte
- Exemples observes:
  - `C?te d'Ivoire`
  - `?cran`
  - `g?n?r?e`
  - `letrage`
- Impact:
  - rendu peu professionnel
  - risque de mauvaise lecture utilisateur
- Priorite suggeree: Haute

### A3 - Redondance d'information dans la restitution OCR

- Ecran: `Capture IA`
- Observation:
  - `Informations complementaires` et `Informations supplementaires` affichent la meme note
- Impact:
  - surcharge visuelle
  - donne l'impression que la structure de sortie n'est pas propre
- Priorite suggeree: Moyenne

### A4 - La proposition comptable IA est plausible, mais pas toujours la meilleure doctrine

- Ecran: `Ecriture IA`
- Observation:
  - le materiel informatique est passe en charges (`6011`, `6012`, `6055`)
  - selon la politique comptable, une partie pourrait relever d'immobilisations
- Impact:
  - l'ecriture est coherent techniquement, mais pas toujours optimale comptablement
  - necessite une validation humaine
- Priorite suggeree: Haute
- Note:
  - ce n'est pas forcement un bug technique
  - c'est surtout une limite de la logique comptable actuelle

### A5 - `Journaux` affiche les KPIs, mais le detail du journal ne s'ouvre pas correctement

- Ecran: `Journaux`
- Observation:
  - les cartes de journaux affichent bien les montants
  - le backend recoit bien l'appel du journal `AC`
  - mais la vue reste sur `Selectionnez un journal`
- Impact:
  - impossible de controler les ecritures depuis cette vue
  - faux sentiment de fonctionnalite complete
- Priorite suggeree: Haute

### A6 - Incoherence d'exercice / periode dans l'interface

- Ecrans touches:
  - header general
  - tableau de bord
  - etats derives
- Observation:
  - l'interface affiche `Ex. 2025`
  - les appels et certaines vues travaillent sur `2026`
  - le dashboard montre `Performance 2026`
- Impact:
  - forte confusion utilisateur
  - ambiguite sur les chiffres consultes
- Priorite suggeree: Haute

### A7 - `Lettrage` s'ouvre sur `411 - Clients` alors que le flux teste est un achat fournisseur

- Ecran: `Lettrage`
- Observation:
  - par defaut, l'ecran pointe vers `411 - Clients`
  - il faut basculer manuellement vers `401 - Fournisseurs` pour voir la dette issue de la facture testee
- Impact:
  - mauvais point d'entree UX pour ce type de facture
  - risque d'impression que la facture n'a pas ete prise en compte
- Priorite suggeree: Moyenne

### A8 - `Lettrage` affiche des KPIs incoherents avec la table

- Ecran: `Lettrage`
- Observation:
  - KPI: `1 lignes totales`
  - table visible: plusieurs lignes apparaissent
  - KPI: `1 a lettrer`
  - le tableau montre plusieurs mouvements non lettres sur le compte fournisseur
- Impact:
  - chiffres de suivi peu fiables
  - lecture metier trompeuse
- Priorite suggeree: Haute

### A9 - `Lettrage` ne propose rien en IA alors qu'un cas simple semble rapprocheable

- Ecran: `Lettrage`
- Observation:
  - le cas historique `TEST002` montre une ligne debit `100 000` et une ligne credit `100 000`
  - aucune proposition IA n'est affichee
- Impact:
  - le moteur de suggestion semble sous-exploite ou incomplet
- Priorite suggeree: Moyenne

### A10 - `Tableau de bord` ne se rafraichit pas avec la nouvelle dette fournisseur

- Ecran: `Tableau de bord`
- Observation:
  - apres sauvegarde de l'ecriture `FA-2026-0519`, le grand livre et la balance montrent bien une dette fournisseur totale de `3 209 900`
  - la carte `Dettes Fournisseurs` reste a `855 500 FCFA`
- Impact:
  - incoherence majeure entre modules
  - dashboard non fiable pour pilotage
- Priorite suggeree: Critique

### A11 - `Capture IA` et `Ecriture IA` restent tres dependantes d'une validation humaine

- Ecrans touches:
  - `Capture IA`
  - `Ecriture IA`
- Observation:
  - le sens metier principal est bon
  - mais la confiance ne peut pas encore etre totale sans verification humaine
- Impact:
  - acceptable pour un assistant
  - trop fragile pour un usage 100% automatique
- Priorite suggeree: Haute

## Points a confirmer plus tard

### C1 - Verifier si le clic sur les cartes de `Journaux` echoue pour tous les utilisateurs

- Pendant le test, le detail ne s'est pas affiche alors que le backend etait sollicite.
- A reconfirmer sur une session manuelle pure utilisateur.

### C2 - Revoir la logique de qualification comptable du materiel

- Determiner une regle metier claire:
  - charge directe
  - immobilisation
  - ou suggestion conditionnelle selon seuil / nature

### C3 - Verifier si le dashboard utilise un cache non invalide apres sauvegarde

- Probable symptome:
  - vues comptables a jour
  - widgets de synthese en retard

## Corriges pendant cette session

- [x] OCR backend:
  - le parsing ne cassait plus quand Qwen sortait un JSON imparfait
  - approche retenue: prompt JSON strict + parser tolerant
- [x] Alignement front/back:
  - front sur `5174`
  - back sur `3002`
  - origine CORS corrigee
- [x] Le front charge bien et n'est plus bloque sur page blanche
- [x] Le selecteur de statut de paiement reapparait apres analyse
- [x] Le timer d'analyse n'affiche plus un faux etat final aussi trompeur qu'avant

## Priorites recommandees

1. Corriger le dashboard (`A10`)
2. Corriger `Journaux` (`A5`)
3. Corriger les stats de `Lettrage` (`A8`)
4. Corriger la TVA globale visible dans `Capture IA` (`A1`)
5. Corriger l'encodage texte (`A2`)
6. Ameliorer la logique comptable IA sur les achats de materiel (`A4`)


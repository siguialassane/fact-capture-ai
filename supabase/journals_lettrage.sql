-- ============================================================
-- TABLES COMPTABLES : Journaux, Séquences, Lettrage
-- SYSCOHADA - Côte d'Ivoire
-- ============================================================

-- ============================================================
-- 1. TABLE DES JOURNAUX
-- ============================================================
CREATE TABLE IF NOT EXISTS journaux (
    code VARCHAR(5) PRIMARY KEY,
    libelle VARCHAR(100) NOT NULL,
    description TEXT,
    type_operation VARCHAR(20) NOT NULL CHECK (type_operation IN ('achat', 'vente', 'banque', 'caisse', 'od')),
    compte_contrepartie VARCHAR(20),
    prefixe_piece VARCHAR(5) NOT NULL,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les journaux standards SYSCOHADA
INSERT INTO journaux (code, libelle, description, type_operation, compte_contrepartie, prefixe_piece) VALUES
    ('AC', 'Journal des Achats', 'Enregistrement des factures fournisseurs', 'achat', '401', 'AC'),
    ('VE', 'Journal des Ventes', 'Enregistrement des factures clients', 'vente', '411', 'VE'),
    ('BQ', 'Journal de Banque', 'Opérations bancaires (virements, prélèvements)', 'banque', '512', 'BQ'),
    ('CA', 'Journal de Caisse', 'Opérations en espèces', 'caisse', '571', 'CA'),
    ('OD', 'Journal des Opérations Diverses', 'Écritures de régularisation, amortissements', 'od', NULL, 'OD')
ON CONFLICT (code) DO UPDATE SET
    libelle = EXCLUDED.libelle,
    description = EXCLUDED.description,
    type_operation = EXCLUDED.type_operation,
    compte_contrepartie = EXCLUDED.compte_contrepartie,
    updated_at = NOW();

-- ============================================================
-- 2. SÉQUENCES DE NUMÉROTATION PAR JOURNAL
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_sequences (
    id SERIAL PRIMARY KEY,
    journal_code VARCHAR(5) NOT NULL REFERENCES journaux(code),
    exercice VARCHAR(4) NOT NULL, -- "2025"
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
    dernier_numero INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(journal_code, exercice, mois)
);

-- Fonction pour obtenir le prochain numéro de pièce
CREATE OR REPLACE FUNCTION get_next_piece_number(
    p_journal_code VARCHAR(5),
    p_date_piece DATE
) RETURNS VARCHAR(20) AS $$
DECLARE
    v_exercice VARCHAR(4);
    v_mois INTEGER;
    v_numero INTEGER;
    v_prefixe VARCHAR(5);
BEGIN
    -- Extraire exercice et mois
    v_exercice := EXTRACT(YEAR FROM p_date_piece)::VARCHAR;
    v_mois := EXTRACT(MONTH FROM p_date_piece)::INTEGER;
    
    -- Récupérer le préfixe du journal
    SELECT prefixe_piece INTO v_prefixe FROM journaux WHERE code = p_journal_code;
    IF v_prefixe IS NULL THEN
        v_prefixe := p_journal_code;
    END IF;
    
    -- Incrémenter ou créer la séquence
    INSERT INTO journal_sequences (journal_code, exercice, mois, dernier_numero)
    VALUES (p_journal_code, v_exercice, v_mois, 1)
    ON CONFLICT (journal_code, exercice, mois)
    DO UPDATE SET 
        dernier_numero = journal_sequences.dernier_numero + 1,
        updated_at = NOW()
    RETURNING dernier_numero INTO v_numero;
    
    -- Format: AC-2025-12-00001
    RETURN v_prefixe || '-' || v_exercice || '-' || LPAD(v_mois::TEXT, 2, '0') || '-' || LPAD(v_numero::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. MODIFICATION DES ÉCRITURES POUR LE LETTRAGE
-- ============================================================

-- Ajouter colonne lettre aux lignes d'écriture si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entry_lines' AND column_name = 'lettre'
    ) THEN
        ALTER TABLE journal_entry_lines ADD COLUMN lettre VARCHAR(10);
        ALTER TABLE journal_entry_lines ADD COLUMN date_lettrage TIMESTAMP WITH TIME ZONE;
        ALTER TABLE journal_entry_lines ADD COLUMN solde_non_lettre DECIMAL(18,2);
    END IF;
END $$;

-- Ajouter statut aux écritures si il n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'statut'
    ) THEN
        ALTER TABLE journal_entries ADD COLUMN statut VARCHAR(20) DEFAULT 'brouillon' 
            CHECK (statut IN ('brouillon', 'validee', 'cloturee'));
    END IF;
END $$;

-- Index pour le lettrage
CREATE INDEX IF NOT EXISTS idx_lines_lettre ON journal_entry_lines(lettre) WHERE lettre IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lines_compte_tiers ON journal_entry_lines(numero_compte, tiers_code);

-- ============================================================
-- 4. TABLE D'HISTORIQUE DE LETTRAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS lettrage_history (
    id SERIAL PRIMARY KEY,
    lettre VARCHAR(10) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('lettrage', 'delettrage')),
    lignes_ids INTEGER[] NOT NULL,
    compte VARCHAR(20) NOT NULL,
    montant DECIMAL(18,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    commentaire TEXT
);

-- Table pour stocker la dernière lettre utilisée par compte
CREATE TABLE IF NOT EXISTS lettrage_sequences (
    id SERIAL PRIMARY KEY,
    numero_compte VARCHAR(20) NOT NULL,
    tiers_code VARCHAR(20),
    derniere_lettre VARCHAR(10) DEFAULT 'A',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(numero_compte, tiers_code)
);

-- Fonction pour obtenir la prochaine lettre
CREATE OR REPLACE FUNCTION get_next_lettre(
    p_compte VARCHAR(20),
    p_tiers_code VARCHAR(20) DEFAULT NULL
) RETURNS VARCHAR(10) AS $$
DECLARE
    v_current VARCHAR(10);
    v_next VARCHAR(10);
    v_chars TEXT[];
    v_i INTEGER;
BEGIN
    -- Récupérer ou créer la séquence
    INSERT INTO lettrage_sequences (numero_compte, tiers_code, derniere_lettre)
    VALUES (p_compte, p_tiers_code, 'A')
    ON CONFLICT (numero_compte, tiers_code)
    DO UPDATE SET updated_at = NOW()
    RETURNING derniere_lettre INTO v_current;
    
    -- Calculer la prochaine lettre (A -> B -> ... -> Z -> AA -> AB ...)
    v_chars := string_to_array(v_current, NULL);
    v_i := array_length(v_chars, 1);
    
    WHILE v_i >= 1 LOOP
        IF v_chars[v_i] = 'Z' THEN
            v_chars[v_i] := 'A';
            v_i := v_i - 1;
        ELSE
            v_chars[v_i] := chr(ascii(v_chars[v_i]) + 1);
            EXIT;
        END IF;
    END LOOP;
    
    IF v_i = 0 THEN
        v_next := 'A' || array_to_string(v_chars, '');
    ELSE
        v_next := array_to_string(v_chars, '');
    END IF;
    
    -- Mettre à jour la séquence
    UPDATE lettrage_sequences 
    SET derniere_lettre = v_next, updated_at = NOW()
    WHERE numero_compte = p_compte AND (tiers_code = p_tiers_code OR (tiers_code IS NULL AND p_tiers_code IS NULL));
    
    RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. VUE GRAND LIVRE
-- ============================================================
CREATE OR REPLACE VIEW vue_grand_livre AS
SELECT 
    jel.id,
    jel.numero_compte,
    pc.libelle AS libelle_compte,
    LEFT(jel.numero_compte, 1) AS classe,
    je.date_piece,
    je.numero_piece,
    je.journal_code,
    jel.libelle_ligne,
    jel.tiers_code,
    t.nom AS tiers_nom,
    jel.debit,
    jel.credit,
    jel.lettre,
    jel.date_lettrage,
    je.id AS ecriture_id,
    je.statut,
    -- Calcul du solde cumulé (sera calculé par la requête)
    SUM(jel.debit - jel.credit) OVER (
        PARTITION BY jel.numero_compte 
        ORDER BY je.date_piece, je.id, jel.id
    ) AS solde_cumule
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.ecriture_id = je.id
LEFT JOIN plan_comptable pc ON jel.numero_compte = pc.numero_compte
LEFT JOIN tiers t ON jel.tiers_code = t.code
ORDER BY jel.numero_compte, je.date_piece, je.id, jel.id;

-- ============================================================
-- 6. VUE BALANCE DES COMPTES
-- ============================================================
CREATE OR REPLACE VIEW vue_balance AS
SELECT 
    jel.numero_compte,
    COALESCE(pc.libelle, jel.libelle_compte) AS libelle_compte,
    LEFT(jel.numero_compte, 1) AS classe,
    SUM(jel.debit) AS mouvement_debit,
    SUM(jel.credit) AS mouvement_credit,
    CASE 
        WHEN SUM(jel.debit) > SUM(jel.credit) 
        THEN SUM(jel.debit) - SUM(jel.credit) 
        ELSE 0 
    END AS solde_debit,
    CASE 
        WHEN SUM(jel.credit) > SUM(jel.debit) 
        THEN SUM(jel.credit) - SUM(jel.debit) 
        ELSE 0 
    END AS solde_credit
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.ecriture_id = je.id
LEFT JOIN plan_comptable pc ON jel.numero_compte = pc.numero_compte
WHERE je.statut IN ('validee', 'cloturee')
GROUP BY jel.numero_compte, COALESCE(pc.libelle, jel.libelle_compte)
ORDER BY jel.numero_compte;

-- ============================================================
-- 7. VUE RÉSUMÉ PAR JOURNAL
-- ============================================================
CREATE OR REPLACE VIEW vue_journal_summary AS
SELECT 
    je.journal_code,
    j.libelle AS journal_libelle,
    TO_CHAR(je.date_piece, 'YYYY-MM') AS periode,
    COUNT(DISTINCT je.id) AS nb_ecritures,
    SUM(jel.debit) AS total_debit,
    SUM(jel.credit) AS total_credit,
    MIN(je.numero_piece) AS premiere_piece,
    MAX(je.numero_piece) AS derniere_piece
FROM journal_entries je
JOIN journaux j ON je.journal_code = j.code
JOIN journal_entry_lines jel ON jel.ecriture_id = je.id
GROUP BY je.journal_code, j.libelle, TO_CHAR(je.date_piece, 'YYYY-MM')
ORDER BY periode DESC, je.journal_code;

-- ============================================================
-- 8. FONCTION DE LETTRAGE
-- ============================================================
CREATE OR REPLACE FUNCTION effectuer_lettrage(
    p_ligne_ids INTEGER[],
    p_compte VARCHAR(20),
    p_tiers_code VARCHAR(20) DEFAULT NULL,
    p_user VARCHAR(100) DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, lettre VARCHAR(10), ecart DECIMAL(18,2)) AS $$
DECLARE
    v_lettre VARCHAR(10);
    v_total DECIMAL(18,2);
    v_debit DECIMAL(18,2);
    v_credit DECIMAL(18,2);
BEGIN
    -- Vérifier que toutes les lignes sont du même compte
    IF EXISTS (
        SELECT 1 FROM journal_entry_lines 
        WHERE id = ANY(p_ligne_ids) AND numero_compte != p_compte
    ) THEN
        RETURN QUERY SELECT false, NULL::VARCHAR(10), NULL::DECIMAL(18,2);
        RETURN;
    END IF;
    
    -- Calculer le total
    SELECT SUM(debit), SUM(credit), SUM(debit) - SUM(credit)
    INTO v_debit, v_credit, v_total
    FROM journal_entry_lines 
    WHERE id = ANY(p_ligne_ids);
    
    -- Vérifier l'équilibre (tolérance 0.01)
    IF ABS(v_total) > 0.01 THEN
        RETURN QUERY SELECT false, NULL::VARCHAR(10), v_total;
        RETURN;
    END IF;
    
    -- Obtenir la prochaine lettre
    v_lettre := get_next_lettre(p_compte, p_tiers_code);
    
    -- Appliquer le lettrage
    UPDATE journal_entry_lines 
    SET lettre = v_lettre, date_lettrage = NOW(), solde_non_lettre = 0
    WHERE id = ANY(p_ligne_ids);
    
    -- Historique
    INSERT INTO lettrage_history (lettre, action, lignes_ids, compte, montant, created_by)
    VALUES (v_lettre, 'lettrage', p_ligne_ids, p_compte, v_debit, p_user);
    
    RETURN QUERY SELECT true, v_lettre, 0::DECIMAL(18,2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. FONCTION DE DÉLETTRAGE
-- ============================================================
CREATE OR REPLACE FUNCTION effectuer_delettrage(
    p_lettre VARCHAR(10),
    p_compte VARCHAR(20),
    p_user VARCHAR(100) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_ligne_ids INTEGER[];
    v_montant DECIMAL(18,2);
BEGIN
    -- Récupérer les lignes à délettrer
    SELECT ARRAY_AGG(id), SUM(debit) INTO v_ligne_ids, v_montant
    FROM journal_entry_lines 
    WHERE lettre = p_lettre AND numero_compte = p_compte;
    
    IF v_ligne_ids IS NULL THEN
        RETURN false;
    END IF;
    
    -- Supprimer le lettrage
    UPDATE journal_entry_lines 
    SET lettre = NULL, date_lettrage = NULL
    WHERE id = ANY(v_ligne_ids);
    
    -- Historique
    INSERT INTO lettrage_history (lettre, action, lignes_ids, compte, montant, created_by)
    VALUES (p_lettre, 'delettrage', v_ligne_ids, p_compte, v_montant, p_user);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. VUE DES LIGNES À LETTRER
-- ============================================================
CREATE OR REPLACE VIEW vue_lignes_a_lettrer AS
SELECT 
    jel.id,
    je.id AS ecriture_id,
    je.numero_piece,
    je.date_piece,
    je.journal_code,
    jel.numero_compte,
    COALESCE(pc.libelle, jel.libelle_compte) AS libelle_compte,
    jel.libelle_ligne,
    jel.tiers_code,
    t.nom AS tiers_nom,
    jel.debit,
    jel.credit,
    jel.debit - jel.credit AS montant,
    jel.lettre,
    jel.date_lettrage,
    COALESCE(jel.solde_non_lettre, jel.debit - jel.credit) AS solde_non_lettre,
    CASE 
        WHEN jel.lettre IS NOT NULL THEN 'lettre'
        WHEN jel.solde_non_lettre IS NOT NULL AND jel.solde_non_lettre != (jel.debit - jel.credit) 
            THEN 'partiellement_lettre'
        ELSE 'non_lettre'
    END AS statut_lettrage
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.ecriture_id = je.id
LEFT JOIN plan_comptable pc ON jel.numero_compte = pc.numero_compte
LEFT JOIN tiers t ON jel.tiers_code = t.code
WHERE jel.numero_compte LIKE '4%'  -- Comptes de tiers uniquement
ORDER BY jel.numero_compte, je.date_piece, je.id;

-- ============================================================
-- COMMENTAIRES
-- ============================================================
COMMENT ON TABLE journaux IS 'Liste des journaux comptables (AC, VE, BQ, CA, OD)';
COMMENT ON TABLE journal_sequences IS 'Séquences de numérotation par journal/exercice/mois';
COMMENT ON TABLE lettrage_history IS 'Historique des opérations de lettrage/délettrage';
COMMENT ON TABLE lettrage_sequences IS 'Séquences des codes lettres par compte';
COMMENT ON VIEW vue_grand_livre IS 'Grand livre avec solde cumulé par compte';
COMMENT ON VIEW vue_balance IS 'Balance des comptes avec mouvements et soldes';
COMMENT ON VIEW vue_journal_summary IS 'Résumé par journal et période';
COMMENT ON VIEW vue_lignes_a_lettrer IS 'Lignes de tiers disponibles pour le lettrage';
COMMENT ON FUNCTION get_next_piece_number IS 'Génère le prochain numéro de pièce pour un journal';
COMMENT ON FUNCTION get_next_lettre IS 'Génère le prochain code lettre pour un compte';
COMMENT ON FUNCTION effectuer_lettrage IS 'Effectue le lettrage d''un groupe de lignes';
COMMENT ON FUNCTION effectuer_delettrage IS 'Annule le lettrage d''un groupe';

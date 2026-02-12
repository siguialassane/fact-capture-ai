# Configuration du serveur MCP Supabase dans VS Code

## Étape 1 : Obtenir votre Personal Access Token (PAT)

1. Allez sur [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Créez un nouveau token avec les permissions nécessaires
3. Copiez le token (il commence généralement par `sbp_...`)

## Étape 2 : Trouver votre Project Reference

1. Allez dans votre projet Supabase
2. Cliquez sur **Settings** → **General**
3. Copiez le **Project ID** (ou **Reference ID**)

## Étape 3 : Configurer VS Code

### Option A : Via NPX (Recommandé)

Éditez `.mcp.json` à la racine de votre projet :

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref",
        "VOTRE_PROJECT_REF"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "VOTRE_PAT_TOKEN"
      }
    }
  }
}
```

### Option B : Via serveur HTTP (Supabase Cloud)

Pour une configuration avec authentification OAuth 2.1 :

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=VOTRE_PROJECT_REF&read_only=true"
    }
  }
}
```

**Note :** Avec l'Option B, VS Code vous demandera de vous authentifier via OAuth.

## Étape 4 : Mode sécurisé (Recommandé)

Pour une sécurité accrue, utilisez le mode lecture seule :

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref",
        "VOTRE_PROJECT_REF",
        "--read-only"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "VOTRE_PAT_TOKEN"
      }
    }
  }
}
```

## Étape 5 : Tester la configuration

1. Ouvrez la Command Palette dans VS Code (`Ctrl + Shift + P`)
2. Tapez `MCP: Reload Configuration`
3. Vérifiez que le serveur MCP Supabase apparaît dans la liste

## Sécurité

### ⚠️ Bonnes pratiques

- **Ne connectez pas en production** : Utilisez un projet de développement
- **Mode lecture seule** : Activez `--read-only` pour éviter les modifications accidentelles
- **Scope du projet** : Limitez l'accès à un projet spécifique avec `--project-ref`
- **Token sécurisé** : Ne committez JAMAIS votre token dans Git

### Ajouter .mcp.json au .gitignore

```bash
echo ".mcp.json" >> .gitignore
```

## Configuration locale (Supabase CLI)

Si vous utilisez Supabase en local :

```json
{
  "mcpServers": {
    "supabase-local": {
      "type": "http",
      "url": "http://localhost:54321/mcp"
    }
  }
}
```

## Dépannage

### Le serveur ne démarre pas

1. Vérifiez que vous avez Node.js installé : `node --version`
2. Essayez d'installer manuellement : `npm install -g @supabase/mcp-server-supabase`
3. Vérifiez les logs VS Code : **View** → **Output** → Sélectionnez "MCP"

### Erreur d'authentification

1. Vérifiez que votre PAT est valide
2. Assurez-vous que le token a les bonnes permissions
3. Régénérez un nouveau token si nécessaire

### Le serveur se connecte mais ne fonctionne pas

1. Vérifiez que votre `project-ref` est correct
2. Essayez sans `--read-only` pour tester
3. Vérifiez que votre projet Supabase est actif

## Outils disponibles

Une fois configuré, vous aurez accès à :

- **Account** : Gestion des projets et organisations
- **Database** : Exécution de requêtes SQL, migrations
- **Functions** : Déploiement et gestion des Edge Functions
- **Debugging** : Accès aux logs et métriques
- **Development** : Gestion de la configuration
- **Storage** : Gestion des buckets de stockage
- **Branching** : Création et gestion des branches (plan payant)
- **Docs** : Accès à la documentation Supabase

## Ressources

- [Documentation officielle Supabase MCP](https://github.com/supabase-community/supabase-mcp)
- [Documentation VS Code MCP](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Model Context Protocol](https://modelcontextprotocol.io/introduction)

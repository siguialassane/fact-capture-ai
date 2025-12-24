/**
 * Composant de rendu Markdown simplifié
 * Convertit le Markdown en HTML formaté
 */

import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Convertit le texte Markdown en HTML formaté
 */
function parseMarkdown(text: string): string {
  let html = text;

  // Échapper les caractères HTML
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers ### ## #
  html = html.replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-slate-700 mt-3 mb-1">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-slate-800 mt-4 mb-2">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-slate-900 mt-4 mb-2">$1</h2>');

  // Bold **text** ou __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong class="font-semibold text-slate-800">$1</strong>');

  // Italic *text* ou _text_ (mais pas à l'intérieur d'un mot)
  html = html.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em class="italic">$1</em>');
  html = html.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em class="italic">$1</em>');

  // Code inline `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-violet-700 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // Listes non ordonnées (avec * ou -)
  html = html.replace(/^\s*[*-]\s+(.+)$/gm, '<li class="ml-4 list-disc text-slate-600">$1</li>');
  
  // Regrouper les <li> consécutifs dans des <ul>
  html = html.replace(
    /(<li class="ml-4 list-disc text-slate-600">.+<\/li>\n?)+/g,
    (match) => `<ul class="space-y-1 my-2">${match}</ul>`
  );

  // Listes ordonnées (1. 2. etc.)
  html = html.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-slate-600" value="$1">$2</li>');
  
  // Regrouper les <li> ordonnées dans des <ol>
  html = html.replace(
    /(<li class="ml-4 list-decimal text-slate-600"[^>]*>.+<\/li>\n?)+/g,
    (match) => `<ol class="space-y-1 my-2">${match}</ol>`
  );

  // Blockquotes > text
  html = html.replace(/^&gt;\s*(.+)$/gm, '<blockquote class="border-l-4 border-violet-300 pl-3 my-2 text-slate-600 italic">$1</blockquote>');

  // Horizontal rules ---
  html = html.replace(/^---+$/gm, '<hr class="my-4 border-slate-200" />');

  // Liens [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-violet-600 hover:underline">$1</a>'
  );

  // Sauts de ligne
  html = html.replace(/\n\n/g, '</p><p class="mb-2">');
  html = html.replace(/\n/g, '<br />');

  // Wrapper
  html = `<div class="markdown-content"><p class="mb-2">${html}</p></div>`;

  // Nettoyer les paragraphes vides
  html = html.replace(/<p class="mb-2"><\/p>/g, '');
  html = html.replace(/<p class="mb-2"><br \/><\/p>/g, '');

  return html;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = parseMarkdown(content);

  return (
    <div 
      className={cn("text-sm leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Version simplifiée pour les messages de chat (inline)
 */
export function ChatMarkdown({ content, className }: MarkdownRendererProps) {
  // Version plus légère pour le chat
  let html = content;

  // Échapper les caractères HTML
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  
  // Italic
  html = html.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>');

  // Code inline
  html = html.replace(/`([^`]+)`/g, '<code class="bg-white/50 px-1 rounded text-xs font-mono">$1</code>');

  // Listes simples
  html = html.replace(/^\s*[*-]\s+(.+)$/gm, '• $1');
  html = html.replace(/^\s*(\d+)\.\s+(.+)$/gm, '$1. $2');

  // Sauts de ligne  
  html = html.replace(/\n/g, '<br />');

  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

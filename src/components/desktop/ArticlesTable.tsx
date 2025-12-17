import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditableField } from "@/components/ui/editable-field";

interface Article {
  designation: string;
  quantite: string;
  prix_unitaire: string;
  total: string;
}

interface ArticlesTableProps {
  articles: Article[];
  onArticleChange: (index: number, field: string, value: string) => void;
}

export function ArticlesTable({ articles, onArticleChange }: ArticlesTableProps) {
  // Calculate totals
  const subtotal = articles.reduce((sum, article) => {
    const val = parseFloat(article.total.replace(/[^\d,.-]/g, "").replace(",", "."));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Désignation</TableHead>
            <TableHead className="font-semibold text-center w-20">Qté</TableHead>
            <TableHead className="font-semibold text-right w-28">P.U.</TableHead>
            <TableHead className="font-semibold text-right w-28">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map((article, index) => (
            <TableRow key={index} className="hover:bg-muted/30 transition-colors">
              <TableCell>
                <EditableField
                  value={article.designation}
                  onSave={(val) => onArticleChange(index, "designation", val)}
                />
              </TableCell>
              <TableCell className="text-center">
                <EditableField
                  value={article.quantite}
                  onSave={(val) => onArticleChange(index, "quantite", val)}
                  type="number"
                />
              </TableCell>
              <TableCell className="text-right">
                <EditableField
                  value={article.prix_unitaire}
                  onSave={(val) => onArticleChange(index, "prix_unitaire", val)}
                />
              </TableCell>
              <TableCell className="text-right font-medium">
                <EditableField
                  value={article.total}
                  onSave={(val) => onArticleChange(index, "total", val)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Summary footer */}
      <div className="border-t border-border bg-muted/30 p-4">
        <div className="flex justify-end">
          <div className="space-y-1 text-right">
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-muted-foreground">Sous-total HT:</span>
              <span className="font-medium">
                {subtotal.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

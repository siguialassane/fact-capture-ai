import { useState } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  History, 
  HelpCircle,
  ChevronRight,
  BookOpen,
  BookOpenCheck,
  Link2,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "accounting", label: "Écriture Comptable", icon: BookOpen },
  { id: "journaux", label: "Journaux", icon: ScrollText },
  { id: "grand-livre", label: "Grand Livre", icon: BookOpenCheck },
  { id: "lettrage", label: "Lettrage", icon: Link2 },
  { id: "invoices", label: "Factures", icon: FileText },
  { id: "history", label: "Historique", icon: History },
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "help", label: "Aide", icon: HelpCircle },
];

export function DashboardSidebar({ activeItem = "dashboard", onItemClick }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out",
        isExpanded ? "w-56" : "w-16"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-border">
        <div className={cn(
          "flex items-center gap-2 transition-all duration-300",
          isExpanded ? "px-4" : "px-0"
        )}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className={cn(
            "font-semibold text-foreground whitespace-nowrap transition-all duration-300",
            isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
          )}>
            ScanFacture
          </span>
        </div>
      </div>

      {/* Menu items */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick?.(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className={cn(
                    "whitespace-nowrap transition-all duration-300",
                    isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}>
                    {item.label}
                  </span>
                  {isActive && isExpanded && (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          isExpanded ? "justify-start" : "justify-center"
        )}>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">U</span>
          </div>
          <div className={cn(
            "transition-all duration-300",
            isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
          )}>
            <p className="text-sm font-medium text-foreground whitespace-nowrap">Utilisateur</p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">Pro Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}

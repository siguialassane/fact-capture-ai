import { useState, useEffect } from "react";
import {
  FileText,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  BookOpenCheck,
  Link2,
  ScrollText,
  FileBarChart2,
  FileSearch,
  LayoutGrid,
  PenLine,
  Scale,
  Users,
  Landmark,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

interface MenuGroup {
  label?: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuGroups: MenuGroup[] = [
  {
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: LayoutGrid },
    ],
  },
  {
    label: "Saisie",
    items: [
      { id: "analysis", label: "Capture IA", icon: FileSearch },
      { id: "accounting", label: "Écriture IA", icon: BookOpen },
      { id: "saisie", label: "Saisie manuelle", icon: PenLine },
    ],
  },
  {
    label: "Comptabilité",
    items: [
      { id: "journaux", label: "Journaux", icon: ScrollText },
      { id: "grand-livre", label: "Grand Livre", icon: BookOpenCheck },
      { id: "balance", label: "Balance", icon: Scale },
      { id: "lettrage", label: "Lettrage", icon: Link2 },
      { id: "rapprochement", label: "Rapprochement", icon: Landmark },
    ],
  },
  {
    label: "Tiers & Documents",
    items: [
      { id: "tiers", label: "Tiers", icon: Users },
      { id: "invoices", label: "Factures", icon: FileText },
    ],
  },
  {
    label: "Finances",
    items: [
      { id: "etats-financiers", label: "États Financiers", icon: FileBarChart2 },
      { id: "cloture", label: "Clôture", icon: Lock },
    ],
  },
];

const bottomItems: MenuItem[] = [
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "help", label: "Aide", icon: HelpCircle },
];

const SIDEBAR_COLLAPSED_KEY = "exias-sidebar-collapsed";

export function DashboardSidebar({ activeItem = "dashboard", onItemClick }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = activeItem === item.id;

    const button = (
      <button
        onClick={() => onItemClick?.(item.id)}
        className={cn(
          "w-full flex items-center gap-3 rounded-md transition-colors duration-150",
          isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2",
          isActive
            ? "bg-white/10 text-white font-medium"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        )}
      >
        <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-blue-400")} />
        {!isCollapsed && (
          <span className="text-sm truncate">{item.label}</span>
        )}
        {isActive && !isCollapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
        )}
      </button>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <li key={item.id}>{button}</li>;
  };

  return (
    <div
      className={cn(
        "h-screen flex flex-col bg-[#0f1629] border-r border-slate-800 transition-all duration-200 ease-in-out flex-shrink-0",
        isCollapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo + Toggle */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white tracking-tight">
              EXIAS COMPTA
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors",
            isCollapsed && "mx-auto"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Menu Groups */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-1">
            {group.label && !isCollapsed && (
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
            )}
            {group.label && isCollapsed && groupIdx > 0 && (
              <Separator className="mx-3 my-1.5 bg-slate-800" />
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map(renderItem)}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-slate-800 py-2 px-2">
        <ul className="space-y-0.5">
          {bottomItems.map(renderItem)}
        </ul>
      </div>

      {/* User */}
      <div className="p-3 border-t border-slate-800">
        <div className={cn(
          "flex items-center gap-2.5",
          isCollapsed && "justify-center"
        )}>
          <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-blue-400">U</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">Utilisateur</p>
              <p className="text-[10px] text-slate-500">Pro Plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

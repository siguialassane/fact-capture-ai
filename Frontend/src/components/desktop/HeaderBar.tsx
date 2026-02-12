import { useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  Calendar,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  /** Breadcrumb segments, e.g. ["Comptabilité", "Balance"] */
  breadcrumb?: string[];
  exercice?: string;
  onExerciceChange?: (ex: string) => void;
  children?: React.ReactNode;
}

const exercices = [
  "2025",
  "2024",
  "2023",
];

export function HeaderBar({
  title,
  subtitle,
  breadcrumb,
  exercice = "2025",
  onExerciceChange,
  children,
}: HeaderBarProps) {
  const [notifCount] = useState(2);

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: breadcrumb + title */}
      <div className="flex items-center gap-3 min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            {breadcrumb.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <span>{seg}</span>
              </span>
            ))}
            <span>/</span>
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-900 truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Center: search bar (optional) */}
      <div className="hidden lg:flex items-center max-w-sm flex-1 mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher... (Ctrl+K)"
            className="w-full h-8 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Right: exercice, notifications, actions */}
      <div className="flex items-center gap-2">
        {/* Extra actions slot */}
        {children}

        {/* Company */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium">Mon Entreprise</span>
        </div>

        {/* Exercice selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Calendar className="h-3.5 w-3.5" />
              Ex. {exercice}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {exercices.map((ex) => (
              <DropdownMenuItem
                key={ex}
                className={cn(ex === exercice && "font-semibold")}
                onClick={() => onExerciceChange?.(ex)}
              >
                Exercice {ex}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4 text-slate-500" />
          {notifCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-red-500 hover:bg-red-500 border-white border">
              {notifCount}
            </Badge>
          )}
        </Button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center cursor-pointer hover:bg-blue-600/20 transition-colors">
          <span className="text-xs font-bold text-blue-600">U</span>
        </div>
      </div>
    </header>
  );
}

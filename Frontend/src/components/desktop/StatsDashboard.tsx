import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Briefcase,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Calendar,
    CreditCard,
    Building2,
    PieChart as PieChartIcon,
    BarChart3,
    Loader2,
    Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from "recharts";
import { getBilan, getCompteResultat, getIndicateursFinanciers, type Bilan, type CompteResultat, type Indicateurs } from "@/lib/api/backend-client";

// --- Components ---

function MetricCard({
    title,
    value,
    formatter = (v: number) => v.toLocaleString() + " FCFA",
    trend,
    trendLabel,
    icon: Icon,
    color = "blue",
    onDetailClick
}: {
    title: string;
    value: number;
    formatter?: (v: number) => string;
    trend?: "up" | "down" | "neutral";
    trendLabel?: string;
    icon: any;
    color?: "blue" | "emerald" | "violet" | "orange";
    onDetailClick?: () => void;
}) {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-700",
        emerald: "bg-emerald-50 text-emerald-700",
        violet: "bg-violet-50 text-violet-700",
        orange: "bg-orange-50 text-orange-700",
    };

    const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-slate-500";
    const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Activity;

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow relative group">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${colorStyles[color]}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-2">
                        {trend && (
                            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full bg-slate-100 ${trendColor}`}>
                                <TrendIcon className="h-3 w-3 mr-1" />
                                {trendLabel}
                            </div>
                        )}
                        {onDetailClick && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={onDetailClick}
                            >
                                <Info className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatter(value)}</h3>
                </div>
            </CardContent>
        </Card>
    );
}

export function StatsDashboard() {
    const [exercice, setExercice] = useState<string>("2026");
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [detailContent, setDetailContent] = useState<{title: string; content: JSX.Element} | null>(null);

    // Utiliser React Query avec cache pour éviter les rechargements inutiles
    const { data: bilan, isLoading: loadingBilan } = useQuery({
        queryKey: ['bilan', exercice],
        queryFn: () => getBilan(exercice),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    const { data: resultat, isLoading: loadingResultat } = useQuery({
        queryKey: ['compte-resultat', exercice],
        queryFn: () => getCompteResultat(exercice),
        staleTime: 10 * 60 * 1000,
    });

    const { data: indicateurs, isLoading: loadingIndicateurs } = useQuery({
        queryKey: ['indicateurs', exercice],
        queryFn: () => getIndicateursFinanciers(exercice),
        staleTime: 10 * 60 * 1000,
    });

    const loading = loadingBilan || loadingResultat || loadingIndicateurs;

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
            </div>
        );
    }

    const formatMontant = (montant: number) => {
        return montant.toLocaleString("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }) + " FCFA";
    };

    // Fonctions pour ouvrir les détails
    const showProduitsDetail = () => {
        if (!resultat) return;
        setDetailContent({
            title: "Détails du Chiffre d'Affaires",
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Voici le détail des produits (classe 7) pour l'exercice {exercice}
                    </p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Compte</TableHead>
                                <TableHead>Libellé</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {resultat.produits.map((ligne, idx) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-mono text-sm">{ligne.compte}</TableCell>
                                    <TableCell>{ligne.libelle}</TableCell>
                                    <TableCell className="text-right font-mono font-medium">
                                        {formatMontant(ligne.montant)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="font-bold bg-slate-50">
                                <TableCell colSpan={2}>TOTAL PRODUITS</TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatMontant(resultat.total_produits)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            )
        });
        setShowDetailDialog(true);
    };

    const showResultatDetail = () => {
        if (!resultat) return;
        setDetailContent({
            title: "Détails du Résultat Net",
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Calcul du résultat net pour l'exercice {exercice}
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-green-700 mb-2">Produits (Classe 7)</h4>
                            <Table>
                                <TableBody>
                                    {resultat.produits.map((ligne, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="text-sm">{ligne.libelle}</TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatMontant(ligne.montant)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold bg-green-50">
                                        <TableCell>TOTAL</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatMontant(resultat.total_produits)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div>
                            <h4 className="font-semibold text-red-700 mb-2">Charges (Classe 6)</h4>
                            <Table>
                                <TableBody>
                                    {resultat.charges.length > 0 ? (
                                        resultat.charges.map((ligne, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-sm">{ligne.libelle}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {formatMontant(ligne.montant)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-slate-400">
                                                Aucune charge enregistrée
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow className="font-bold bg-red-50">
                                        <TableCell>TOTAL</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatMontant(resultat.total_charges)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <div className="border-t-2 pt-4">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span>RÉSULTAT NET</span>
                            <span className={`font-mono ${resultat.resultat_net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatMontant(resultat.resultat_net)}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                            Formule: Produits ({formatMontant(resultat.total_produits)}) - Charges ({formatMontant(resultat.total_charges)}) = {formatMontant(resultat.resultat_net)}
                        </p>
                    </div>
                </div>
            )
        });
        setShowDetailDialog(true);
    };

    const showTresorerieDetail = () => {
        if (!bilan || !indicateurs) return;
        setDetailContent({
            title: "Détails de la Trésorerie Nette",
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Calcul de la trésorerie nette pour l'exercice {exercice}
                    </p>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell>Trésorerie Actif (Classe 5 débit)</TableCell>
                                <TableCell className="text-right font-mono font-medium text-green-600">
                                    {formatMontant(bilan.tresorerie_actif)}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Trésorerie Passif (Découverts)</TableCell>
                                <TableCell className="text-right font-mono font-medium text-red-600">
                                    {formatMontant(bilan.tresorerie_passif)}
                                </TableCell>
                            </TableRow>
                            <TableRow className="font-bold bg-blue-50">
                                <TableCell>TRÉSORERIE NETTE</TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatMontant(indicateurs.tresorerie_nette)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <p className="text-sm text-slate-500">
                        Formule: Trésorerie Actif - Trésorerie Passif
                    </p>
                </div>
            )
        });
        setShowDetailDialog(true);
    };

    const showDettesDetail = () => {
        if (!bilan) return;
        setDetailContent({
            title: "Détails des Dettes Fournisseurs",
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Détail des dettes pour l'exercice {exercice}
                    </p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Compte</TableHead>
                                <TableHead>Libellé</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bilan.dettes.lignes.map((ligne, idx) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-mono text-sm">{ligne.compte}</TableCell>
                                    <TableCell>{ligne.libelle}</TableCell>
                                    <TableCell className="text-right font-mono font-medium">
                                        {formatMontant(ligne.montant)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="font-bold bg-orange-50">
                                <TableCell colSpan={2}>TOTAL DETTES</TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatMontant(bilan.dettes.total)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            )
        });
        setShowDetailDialog(true);
    };

    // Prepare Chart Data
    const revenueData = [
        { name: 'Produits', value: resultat?.total_produits || 0 },
        { name: 'Charges', value: resultat?.total_charges || 0 },
    ];

    const pieData = [
        { name: 'Immobilisé', value: bilan?.actif_immobilise?.total || 0, color: '#6366f1' }, // Indigo
        { name: 'Circulant', value: bilan?.actif_circulant?.total || 0, color: '#10b981' }, // Emerald
        { name: 'Trésorerie', value: bilan?.tresorerie_actif || 0, color: '#3b82f6' }, // Blue
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden">
            {/* Top Bar */}
            <div className="bg-white border-b border-sidebar-border/50 px-8 py-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 text-white p-2.5 rounded-lg shadow-sm">
                        <LayoutDashboardIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de Bord</h1>
                        <p className="text-sm text-slate-500 font-medium">Vue globale de la santé financière</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <Select value={exercice} onValueChange={setExercice}>
                        <SelectTrigger className="w-[120px] bg-white border-slate-200">
                            <SelectValue placholder="Année" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2023">2023</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-8 space-y-8">

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Chiffre d'Affaires"
                        value={resultat?.total_produits || 0}
                        icon={TrendingUp}
                        color="emerald"
                        trend="up"
                        trendLabel="Produits"
                        onDetailClick={showProduitsDetail}
                    />
                    <MetricCard
                        title="Résultat Net"
                        value={resultat?.resultat_net || 0}
                        icon={Wallet}
                        color="violet"
                        trend={resultat?.resultat_net && resultat.resultat_net >= 0 ? "up" : "down"}
                        trendLabel={resultat?.resultat_net && resultat.resultat_net >= 0 ? "Bénéfice" : "Déficit"}
                        onDetailClick={showResultatDetail}
                    />
                    <MetricCard
                        title="Trésorerie Nette"
                        value={indicateurs?.tresorerie_nette || 0}
                        icon={DollarSign}
                        color="blue"
                        trendLabel="Disponibilités"
                        onDetailClick={showTresorerieDetail}
                    />
                    <MetricCard
                        title="Dettes Fournisseurs"
                        value={bilan?.dettes?.lignes.find(l => l.compte.startsWith("40"))?.montant || 0}
                        icon={Building2}
                        color="orange"
                        trend="neutral"
                        trendLabel="À payer"
                        onDetailClick={showDettesDetail}
                    />
                </div>

                {/* Charts & Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Chart: Revenue vs Expenses */}
                    <Card className="lg:col-span-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-indigo-500" />
                                Performance {exercice}
                            </CardTitle>
                            <CardDescription>Comparaison Charges vs Produits</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={revenueData} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 14, fontWeight: 500 }} width={80} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value: number) => [value.toLocaleString() + ' FCFA', 'Montant']}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {revenueData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Allocation Asset Pie Chart */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PieChartIcon className="h-5 w-5 text-blue-500" />
                                Structure de l'Actif
                            </CardTitle>
                            <CardDescription>Répartition du patrimoine</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => value.toLocaleString() + ' FCFA'} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-bold text-slate-800">
                                        {(bilan?.total_actif || 0) > 0 ? "100%" : "0%"}
                                    </span>
                                    <span className="text-xs text-slate-400">Total Actif</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex justify-center gap-4 mt-4">
                                {pieData.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-slate-600">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Ratios Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-md">
                        <CardContent className="p-6">
                            <p className="text-indigo-100 font-medium mb-1">Marge Nette</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-3xl font-bold">{(indicateurs?.marge_nette || 0).toFixed(1)}%</h3>
                                <TrendingUp className="h-5 w-5 mb-1 text-indigo-200" />
                            </div>
                            <p className="text-sm text-indigo-100 mt-2 opacity-80">Rentabilité globale de l'activité</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-none shadow-md">
                        <CardContent className="p-6">
                            <p className="text-blue-100 font-medium mb-1">Ratio Liquidité</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-3xl font-bold">{(indicateurs?.ratio_liquidite || 0).toFixed(2)}</h3>
                                <CheckCircleIcon className="h-5 w-5 mb-1 text-blue-200" />
                            </div>
                            <p className="text-sm text-blue-100 mt-2 opacity-80">Capacité à payer les dettes court terme</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-md">
                        <CardContent className="p-6">
                            <p className="text-emerald-100 font-medium mb-1">Délai Clients</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-3xl font-bold">{(indicateurs?.delai_client || 0).toFixed(0)} j</h3>
                                <Calendar className="h-5 w-5 mb-1 text-emerald-200" />
                            </div>
                            <p className="text-sm text-emerald-100 mt-2 opacity-80">Temps moyen de recouvrement</p>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Dialog pour les détails */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                    {detailContent && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5 text-blue-600" />
                                    {detailContent.title}
                                </DialogTitle>
                                <DialogDescription>
                                    Justificatif détaillé du calcul
                                </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                                {detailContent.content}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function LayoutDashboardIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
    );
}

function CheckCircleIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
}

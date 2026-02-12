import { useState } from "react";
import { Building2, BookOpen, Brain } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettingsView } from "./CompanySettingsView";
import { PlanComptableView } from "./PlanComptableView";
import { AIModelSelector } from "./AIModelSelector";

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("company");

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="plan-comptable" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Plan Comptable
          </TabsTrigger>
          <TabsTrigger value="ai-model" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Modèle IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <CompanySettingsView />
        </TabsContent>

        <TabsContent value="plan-comptable" className="mt-4">
          <PlanComptableView />
        </TabsContent>

        <TabsContent value="ai-model" className="mt-4">
          <AIModelSelector />
        </TabsContent>
      </Tabs>
    </div>
  );
}

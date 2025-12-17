import { useState, useEffect } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DocumentViewer } from "./DocumentViewer";
import { InvoiceDataPanel } from "./InvoiceDataPanel";
import { getLatestInvoice, type InvoiceData } from "@/lib/db";
import { mockInvoiceData, mockInvoiceImage } from "@/lib/mock-data";

type AnalysisStatus = "waiting" | "analyzing" | "complete" | "error";

export function DesktopDashboard() {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("waiting");
  const [invoiceData, setInvoiceData] = useState(mockInvoiceData);
  const [activeMenuItem, setActiveMenuItem] = useState("dashboard");

  // Use mock data for demo
  useEffect(() => {
    // Simulate loading
    const loadInvoice = async () => {
      try {
        const latestInvoice = await getLatestInvoice();
        if (latestInvoice) {
          setInvoice(latestInvoice);
          simulateAnalysis();
        } else {
          // Use mock data for demo
          setInvoice({
            id: 1,
            image: mockInvoiceImage,
            createdAt: new Date(),
            analyzed: false,
          });
          simulateAnalysis();
        }
      } catch (error) {
        console.error("Error loading invoice:", error);
        // Fallback to mock data
        setInvoice({
          id: 1,
          image: mockInvoiceImage,
          createdAt: new Date(),
          analyzed: false,
        });
        simulateAnalysis();
      }
    };

    loadInvoice();
  }, []);

  const simulateAnalysis = () => {
    setStatus("analyzing");
    // Simulate AI analysis delay
    setTimeout(() => {
      setStatus("complete");
    }, 2500);
  };

  const handleDataChange = (field: string, value: string) => {
    setInvoiceData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArticleChange = (
    index: number,
    field: string,
    value: string
  ) => {
    setInvoiceData((prev) => ({
      ...prev,
      articles: prev.articles.map((article, i) =>
        i === index ? { ...article, [field]: value } : article
      ),
    }));
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <DashboardSidebar 
        activeItem={activeMenuItem} 
        onItemClick={setActiveMenuItem} 
      />

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Left Panel - Invoice Data (swapped) */}
        <div className="flex-1 border-r border-border">
          <InvoiceDataPanel
            status={status}
            data={invoiceData}
            onDataChange={handleDataChange}
            onArticleChange={handleArticleChange}
          />
        </div>

        {/* Right Panel - Document Viewer (swapped) */}
        <div className="w-[45%]">
          <DocumentViewer
            imageUrl={invoice?.image || null}
            status={status}
          />
        </div>
      </div>
    </div>
  );
}

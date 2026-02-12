/**
 * AnalysisTimer - Chronomètre visuel pour l'analyse IA
 * 
 * Affiche le temps d'exécution de Qwen (OCR), Gemini (Comptabilité) et Claude (Audit)
 * en temps réel avec une interface élégante et non intrusive.
 */

import { useEffect, useState } from "react";
import { Clock, Brain, Eye, ShieldCheck, X } from "lucide-react";

interface AnalysisTimerProps {
  isAnalyzing: boolean;
  startTime?: number;
  phase?: "ocr" | "accounting" | "audit" | "complete";
  finalTimes?: {
    qwen?: number;
    gemini?: number;
    claude?: number;
  };
  showClaude?: boolean;
}

export function AnalysisTimer({ 
  isAnalyzing, 
  startTime, 
  phase = "ocr",
  finalTimes,
  showClaude = false
}: AnalysisTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showFinalTimes, setShowFinalTimes] = useState(false);

  // Gérer la visibilité
  useEffect(() => {
    if (isAnalyzing) {
      setIsVisible(true);
      setShowFinalTimes(false);
    } else if (finalTimes && (finalTimes.qwen || finalTimes.gemini)) {
      // Afficher les temps finaux pendant 10 secondes après l'analyse
      setShowFinalTimes(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setShowFinalTimes(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing, finalTimes]);

  useEffect(() => {
    if (!isAnalyzing || !startTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isAnalyzing, startTime]);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const handleClose = () => {
    setIsVisible(false);
    setShowFinalTimes(false);
  };

  if (!isVisible && !showFinalTimes) return null;

  return (
    <div className="fixed top-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[280px] backdrop-blur-sm bg-opacity-95 transition-all duration-300">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {isAnalyzing ? "Analyse IA en cours" : "Analyse terminée"}
          </span>
        </div>
        {showFinalTimes && !isAnalyzing && (
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Qwen (OCR) Timer */}
      <div className="space-y-3">
        {(finalTimes?.qwen !== undefined || phase === "ocr") && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Qwen (Vision OCR)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {finalTimes?.qwen !== undefined ? (
                <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">
                  ✓ {formatTime(finalTimes.qwen)}
                </span>
              ) : phase === "ocr" && isAnalyzing ? (
                <>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono font-semibold text-purple-600 dark:text-purple-400">
                    {formatTime(elapsed)}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400">En attente...</span>
              )}
            </div>
          </div>
        )}

        {/* Gemini (Accounting) Timer */}
        {(finalTimes?.gemini !== undefined || phase === "accounting") && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Gemini (Comptabilité)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {finalTimes?.gemini !== undefined ? (
                <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">
                  ✓ {formatTime(finalTimes.gemini)}
                </span>
              ) : phase === "accounting" && isAnalyzing ? (
                <>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono font-semibold text-orange-600 dark:text-orange-400">
                    {formatTime(elapsed)}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400">En attente...</span>
              )}
            </div>
          </div>
        )}

        {/* Claude (Audit) Timer - Optionnel */}
        {(showClaude || phase === "audit") && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Claude (Audit)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {finalTimes?.claude !== undefined ? (
                <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">
                  ✓ {formatTime(finalTimes.claude)}
                </span>
              ) : phase === "audit" && isAnalyzing ? (
                <>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatTime(elapsed)}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400">En attente...</span>
              )}
            </div>
          </div>
        )}

        {/* Total Time - N'afficher que s'il y a plusieurs timings */}
        {finalTimes && Object.keys(finalTimes).filter(k => finalTimes[k as keyof typeof finalTimes]).length > 1 && (
          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Temps total
              </span>
              <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                {formatTime((finalTimes.qwen || 0) + (finalTimes.gemini || 0) + (finalTimes.claude || 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isAnalyzing && (
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-orange-500 via-indigo-500 to-blue-500 animate-pulse"
              style={{
                width: phase === "ocr" ? "33%" : phase === "accounting" ? "66%" : phase === "audit" ? "90%" : "100%",
                transition: "width 0.5s ease-in-out"
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

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
  showClaude = false,
}: AnalysisTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showFinalTimes, setShowFinalTimes] = useState(false);

  useEffect(() => {
    const hasFinalTimes = Boolean(finalTimes?.qwen || finalTimes?.gemini || finalTimes?.claude);

    if (isAnalyzing) {
      setIsVisible(true);
      setShowFinalTimes(false);
      return;
    }

    if (hasFinalTimes) {
      setIsVisible(true);
      setShowFinalTimes(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setShowFinalTimes(false);
      }, 10000);
      return () => clearTimeout(timer);
    }

    setIsVisible(false);
    setShowFinalTimes(false);
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
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleClose = () => {
    setIsVisible(false);
    setShowFinalTimes(false);
  };

  if (!isVisible && !showFinalTimes) return null;

  return (
    <div className="fixed top-20 right-4 z-50 min-w-[280px] rounded-lg border border-gray-200 bg-white bg-opacity-95 p-4 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {isAnalyzing ? "Analyse IA en cours" : "Analyse terminee"}
          </span>
        </div>
        {showFinalTimes && !isAnalyzing && (
          <button
            onClick={handleClose}
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {(finalTimes?.qwen !== undefined || phase === "ocr") && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Qwen (Vision OCR)</span>
            </div>
            <div className="flex items-center gap-2">
              {finalTimes?.qwen !== undefined ? (
                <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">
                  {`OK ${formatTime(finalTimes.qwen)}`}
                </span>
              ) : phase === "ocr" && isAnalyzing ? (
                <>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
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

        {(finalTimes?.gemini !== undefined || phase === "accounting") && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Gemini (Comptabilite)</span>
            </div>
            <div className="flex items-center gap-2">
              {finalTimes?.gemini !== undefined ? (
                <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">
                  {`OK ${formatTime(finalTimes.gemini)}`}
                </span>
              ) : phase === "accounting" && isAnalyzing ? (
                <>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
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

        {(showClaude || phase === "audit") && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Claude (Audit)</span>
            </div>
            <div className="flex items-center gap-2">
              {finalTimes?.claude !== undefined ? (
                <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">
                  {`OK ${formatTime(finalTimes.claude)}`}
                </span>
              ) : phase === "audit" && isAnalyzing ? (
                <>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
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

        {finalTimes &&
          Object.values(finalTimes).filter((value) => value !== undefined).length > 1 && (
            <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Temps total</span>
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                  {formatTime((finalTimes.qwen || 0) + (finalTimes.gemini || 0) + (finalTimes.claude || 0))}
                </span>
              </div>
            </div>
          )}
      </div>

      {isAnalyzing && (
        <div className="mt-3 border-t border-gray-200 pt-2 dark:border-gray-700">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full animate-pulse bg-gradient-to-r from-purple-500 via-orange-500 via-indigo-500 to-blue-500"
              style={{
                width:
                  phase === "ocr" ? "33%" : phase === "accounting" ? "66%" : phase === "audit" ? "90%" : "100%",
                transition: "width 0.5s ease-in-out",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

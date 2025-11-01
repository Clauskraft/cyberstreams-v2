import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type FormValues = {
  cviUrl: string;
};

type AnalysisPoint = {
  status: "success" | "warning" | "error";
  text: string;
};

type AnalysisResult = {
  url: string;
  summary: string;
  points: AnalysisPoint[];
};

const formSchema = z.object({
  cviUrl: z.string().url({ message: "Indtast venligst en gyldig URL." }),
});

const Button = ({ children, className = "", ...props }) => (
  <button
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#0000BF] text-white hover:bg-[#000078]/90 h-10 px-4 py-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Dialog = ({ children, open }) => {
  if (!open) return null;
  return <div>{children}</div>;
};

const DialogContent = ({ children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40" />
    <div className="relative z-10 w-full max-w-lg rounded-lg border bg-white p-6 shadow-xl">
      {children}
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex flex-col items-center gap-3 text-center">
    <svg className="h-8 w-8 animate-spin text-[#0000BF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    <p className="text-lg font-medium">Analyserer CVI-dokument...</p>
    <p className="text-sm text-gray-500">Dette kan tage et øjeblik.</p>
  </div>
);

const AnalysisResultCard = ({ result, onReset }: { result: AnalysisResult; onReset: () => void }) => {
  const icons = {
    success: (
      <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6m0-6 6 6" />
      </svg>
    ),
  };

  return (
    <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
      <h2 className="text-2xl font-bold">Analyse Fuldført</h2>
      <p className="mt-2 text-sm text-gray-500">
        Resultater for: <span className="font-medium text-gray-700">{result.url}</span>
      </p>
      <div className="mt-4 rounded-lg bg-gray-50 p-4">
        <p className="text-gray-700">{result.summary}</p>
      </div>
      <h3 className="mt-6 text-lg font-semibold">Detaljerede Punkter:</h3>
      <ul className="mt-3 space-y-3">
        {result.points.map((point, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="mt-1">{icons[point.status]}</span>
            <span className="text-gray-700">{point.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 text-center">
        <Button onClick={onReset}>Start Ny Analyse</Button>
      </div>
    </div>
  );
};

export default function CVIAnalyzer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: { cviUrl: "" },
  });

  const onSubmit = (values: FormValues) => {
    setIsOpen(false);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    setTimeout(() => {
      const mockResult: AnalysisResult = {
        url: values.cviUrl,
        summary:
          "Analysen er fuldført. Dokumentet ser ud til at overholde de fleste retningslinjer, men der er et par punkter, der kræver opmærksomhed.",
        points: [
          { status: "success", text: "Logo-brug er korrekt på alle sider." },
          { status: "warning", text: "Farvepaletten afviger på side 5. Tertiære farver er brugt som baggrund." },
          { status: "success", text: "Typografi og skriftstørrelser er konsistente." },
          { status: "error", text: "Safe space omkring logoet er ikke respekteret i sidehovedet." },
        ],
      };
      setAnalysisResult(mockResult);
      setIsAnalyzing(false);
      form.reset();
    }, 3000);
  };

  const handleOpenDialog = () => setIsOpen(true);
  const handleCloseDialog = () => {
    setIsOpen(false);
    form.reset();
  };
  const handleReset = () => setAnalysisResult(null);

  return (
    <div className="w-full">
      {!isAnalyzing && !analysisResult && (
        <Button onClick={handleOpenDialog}>Start CVI Analyse</Button>
      )}
      {isAnalyzing && <LoadingSpinner />}
      {analysisResult && <AnalysisResultCard result={analysisResult} onReset={handleReset} />}

      <Dialog open={isOpen}>
        <DialogContent>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">TDC Erhverv CVI Guardian Agent</h2>
              <p className="mt-1 text-sm text-gray-500">
                Indtast en URL til CVI-materialet. Agenten vil analysere indholdet og give feedback for at sikre 100% overensstemmelse.
              </p>
            </div>
            <button onClick={handleCloseDialog} className="rounded-sm p-1 text-gray-500 hover:text-gray-800">
              <span className="sr-only">Luk</span>×
            </button>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Link til CVI-dokument</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="https://eksempel.dk/brand-guide.pdf"
                {...form.register("cviUrl")}
              />
              {form.formState.errors.cviUrl ? (
                <p className="mt-1 text-sm text-red-500">{form.formState.errors.cviUrl.message}</p>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!form.formState.isValid}>
                Start Analyse
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


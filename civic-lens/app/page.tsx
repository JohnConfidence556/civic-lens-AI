"use client";
import { useState } from "react";
import Tesseract from "tesseract.js";

// --- COMPONENTS (Same as before) ---
const Stepper = ({ step }) => (
  <div className="flex items-center justify-center space-x-4 mb-10">
    <div className={`flex items-center space-x-2 transition-colors duration-300 ${step >= 1 ? "text-emerald-900 font-bold" : "text-gray-400"}`}>
      <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all ${step >= 1 ? "border-emerald-900 bg-emerald-900 text-white shadow-lg" : "border-gray-300"}`}>1</span>
      <span className="hidden sm:inline">Upload</span>
    </div>
    <div className={`h-1 w-12 rounded-full transition-all duration-500 ${step >= 2 ? "bg-emerald-900" : "bg-gray-200"}`}></div>
    <div className={`flex items-center space-x-2 transition-colors duration-300 ${step >= 2 ? "text-emerald-900 font-bold" : "text-gray-400"}`}>
      <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all ${step >= 2 ? "border-emerald-900 bg-emerald-900 text-white shadow-lg" : "border-gray-300"}`}>2</span>
      <span className="hidden sm:inline">Analysis</span>
    </div>
    <div className={`h-1 w-12 rounded-full transition-all duration-500 ${step >= 3 ? "bg-emerald-900" : "bg-gray-200"}`}></div>
    <div className={`flex items-center space-x-2 transition-colors duration-300 ${step >= 3 ? "text-emerald-900 font-bold" : "text-gray-400"}`}>
      <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all ${step >= 3 ? "border-emerald-900 bg-emerald-900 text-white shadow-lg" : "border-gray-300"}`}>3</span>
      <span className="hidden sm:inline">Action</span>
    </div>
  </div>
);

const CollapsibleCard = ({ title, content, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  if (!content) return null;

  return (
    <div className="border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow mb-4 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 bg-white hover:bg-gray-50 text-left transition-colors"
      >
        <span className="font-serif font-bold text-gray-900 text-lg flex items-center gap-2">
          {title.includes("Summary") && "📘"}
          {title.includes("Constitutional") && "⚖️"}
          {title.includes("Pidgin") && "🗣️"}
          {title.includes("Action") && "🪜"}
          {title.includes("Red Flags") && "🚩"}
          {title.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, "")} 
        </span>
        <span className={`text-emerald-600 text-2xl transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>↓</span>
      </button>
      
      {isOpen && (
        <div className="p-6 prose prose-emerald max-w-none text-gray-700 whitespace-pre-wrap border-t border-gray-100 bg-gray-50/50">
          {content}
        </div>
      )}
    </div>
  );
};

// --- MAIN PAGE ---

export default function CivicLensWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  
  // Data States
  const [extractedText, setExtractedText] = useState("");
  const [analysisRaw, setAnalysisRaw] = useState(""); 
  
  // Feature States
  const [replyLetter, setReplyLetter] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  const parseAnalysis = (text) => {
    if (!text) return {};
    const sections = {};
    const parts = text.split("###");
    parts.forEach(part => {
      const lines = part.trim().split("\n");
      const title = lines[0].trim().replace(/\*\*/g, "").replace(/^[^\w]+/, ""); 
      const content = lines.slice(1).join("\n").trim();
      if (title && content) sections[title] = content;
    });
    return sections;
  };
  
  const parsedSections = parseAnalysis(analysisRaw);

  // --- UPDATED HANDLER: MULTI-FILE SUPPORT ---
  const handleFileUpload = async (e) => {
    // 1. Get ALL selected files, not just the first one
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);
    let combinedText = "";

    try {
      // 2. Loop through each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update UI to show progress (e.g., "Scanning page 1 of 3...")
        setProgress(`Scanning page ${i + 1} of ${files.length}...`);

        const { data: { text } } = await Tesseract.recognize(
          file, 
          'eng',
          // Optional: Improve speed slightly by using the layout mode
          { logger: m => { /* console.log(m) */ } } 
        );

        // 3. Add this page's text to the big pile
        combinedText += `\n\n--- PAGE ${i + 1} ---\n\n` + text;
      }

      setExtractedText(combinedText);
      
      setProgress("Consulting AI Lawyer...");
      
      // 4. Send the HUGE combined text to AI
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combinedText, task: "analyze" }),
      });

      const data = await response.json();
      setAnalysisRaw(data.analysis);
      setStep(2); 

    } catch (err) {
      console.error(err);
      alert("Error processing files. Try fewer images.");
    } finally {
      setLoading(false);
    }
  };

  const handleDraftReply = async () => {
    setLoadingReply(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText, task: "draft_reply" }),
      });
      const data = await response.json();
      setReplyLetter(data.analysis);
      setStep(3); 
    } catch (err) { alert("Error"); }
    finally { setLoadingReply(false); }
  };

  const handleAskQuestion = async () => {
    if (!question) return;
    setLoadingAnswer(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText, task: "question", question }),
      });
      const data = await response.json();
      setAnswer(data.analysis);
    } catch (err) { alert("Error"); }
    finally { setLoadingAnswer(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 font-sans text-gray-900 pb-20">
      
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-emerald-900 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl">C</div>
             <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">CivicLens<span className="text-emerald-600">.ai</span></h1>
          </div>
          <button onClick={() => window.location.reload()} className="text-sm font-medium text-gray-500 hover:text-emerald-700 transition">New Scan ↺</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        <Stepper step={step} />

        {step === 1 && (
          <div className="max-w-xl mx-auto mt-12 bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-green-300"></div>
            
            <h2 className="text-3xl font-serif font-bold mb-4 text-gray-900">Analyze Your Legal Case</h2>
            <p className="text-gray-500 mb-8 text-lg">Upload photos of your documents. <br/>You can select <strong>multiple screenshots</strong> at once.</p>
            
            <label className="block w-full border-3 border-dashed border-emerald-100 bg-emerald-50/50 rounded-2xl p-12 cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all group duration-300">
              {/* ✅ ADDED 'multiple' ATTRIBUTE HERE */}
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} disabled={loading} />
              
              <div className="space-y-4">
                <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                   <span className="text-3xl">📸</span>
                </div>
                <p className="font-bold text-emerald-800 text-lg group-hover:text-emerald-900">
                  {loading ? progress : "Tap to Select Photos (Multiple)"}
                </p>
                <p className="text-xs text-emerald-600">Supports: Police Forms, Court Papers, Quit Notices</p>
              </div>
            </label>
            {loading && (
               <div className="mt-6">
                 <div className="h-1.5 bg-gray-100 rounded-full w-full overflow-hidden">
                   <div className="h-full bg-emerald-600 animate-progress w-2/3 rounded-full"></div>
                 </div>
                 <p className="text-xs text-gray-400 mt-2 animate-pulse">{progress}</p>
               </div>
            )}
          </div>
        )}

        {/* WORKSPACE VIEW (UNCHANGED) */}
        {step >= 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
            
            <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                 <div className="flex items-center space-x-3 mb-4">
                   <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-lg">📄</div>
                   <div>
                     <h3 className="font-bold text-gray-900">Source Document</h3>
                     <p className="text-xs text-green-600 font-medium">● Analysis Active</p>
                   </div>
                 </div>
                 <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100 font-mono leading-relaxed h-32 overflow-y-auto">
                   {extractedText}
                 </div>
              </div>

              <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl border border-gray-700 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-600 blur-3xl opacity-20 rounded-full"></div>
                <h3 className="font-serif font-bold text-xl mb-2 flex items-center gap-2">💬 Ask a Lawyer</h3>
                <p className="text-gray-400 text-sm mb-4">Confused? Ask specific questions about this document.</p>
                <div className="space-y-3 relative z-10">
                    <input 
                      type="text" 
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g. Is this bail legal?"
                      className="w-full p-3.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                    <button 
                      onClick={handleAskQuestion}
                      disabled={loadingAnswer}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white py-3 rounded-xl font-bold transition shadow-lg"
                    >
                      {loadingAnswer ? "Consulting AI..." : "Get Answer"}
                    </button>
                </div>
                {answer && (
                  <div className="mt-4 bg-gray-800 p-4 rounded-xl text-sm border border-gray-700 animate-fade-in">
                    <span className="text-emerald-400 font-bold block mb-1">CivicLens:</span> 
                    <span className="text-gray-200 leading-relaxed">{answer}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={handleDraftReply}
                  disabled={loadingReply}
                  className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 py-4 px-6 rounded-xl font-bold hover:from-amber-300 hover:to-amber-400 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="text-xl">✍️</span> {loadingReply ? "Drafting..." : "Draft Formal Reply"}
                </button>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent("Analysis: " + analysisRaw)}`}
                  target="_blank"
                  className="flex-1 bg-emerald-50 text-emerald-800 py-4 px-6 rounded-xl font-bold hover:bg-emerald-100 transition border border-emerald-100 flex items-center justify-center gap-2"
                >
                  <span className="text-xl">📲</span> Share Analysis
                </a>
              </div>

              {replyLetter && (
                <div className="bg-white border-2 border-amber-400 rounded-2xl p-8 shadow-2xl relative">
                  <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-bl-xl">ACTION STEP</div>
                  <h3 className="font-serif font-bold text-2xl mb-4 text-gray-900">Drafted Reply</h3>
                  <textarea 
                    readOnly 
                    value={replyLetter} 
                    className="w-full h-80 p-6 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm text-gray-800 focus:outline-none shadow-inner leading-relaxed"
                  />
                  <div className="flex justify-end mt-4">
                     <button 
                        onClick={() => navigator.clipboard.writeText(replyLetter)}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition"
                      >
                        Copy to Clipboard
                      </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-4 ml-1">Case Analysis</h3>
                <div className="space-y-4">
                  {Object.keys(parsedSections).length > 0 ? (
                     Object.entries(parsedSections).map(([title, content], idx) => (
                        <CollapsibleCard 
                          key={idx} 
                          title={title} 
                          content={content} 
                          defaultOpen={idx === 0} 
                        />
                     ))
                  ) : (
                    <CollapsibleCard title="Full Analysis" content={analysisRaw} defaultOpen={true} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                  <a href="https://grassrootsjusticenetwork.org/connect/organization/legal-aid-council-of-nigeria/" target="_blank" className="text-center p-4 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition text-sm">⚖️ Contact Legal Aid</a>
                  <a href="https://report.nhrc.gov.ng/home/" target="_blank" className="text-center p-4 bg-red-50 text-red-700 rounded-xl font-bold hover:bg-red-100 transition text-sm">🚨 Report Violation</a>
              </div>

            </div>
          </div>
        )}
      </main>
      
      <style jsx global>{`
        @keyframes progress { 0% { width: 0% } 50% { width: 70% } 100% { width: 90% } }
        .animate-progress { animation: progress 2s ease-in-out infinite; }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
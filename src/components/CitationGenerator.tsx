import React, { useState, useEffect } from "react";
import { Copy, Plus, Trash2, Sparkles, Languages, Printer, Book, Globe, FileText, Check } from "lucide-react";

interface Contributor {
  role: "Author" | "Editor";
  firstName: string;
  middleInitial: string;
  lastName: string;
  suffix: string;
}

export default function CitationGenerator() {
  const [lang, setLang] = useState<"en" | "fil">("en");
  
  // Hook into profile database metadata
  const [schoolName, setSchoolName] = useState(() => {
    try {
      const stored = localStorage.getItem("reelsystem_autosave_form");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.schoolName) return parsed.schoolName;
      }
    } catch (e) {}
    return "ReelSystem Exemplar School";
  });
  const [teacherName, setTeacherName] = useState(() => {
    try {
      const stored = localStorage.getItem("reelsystem_autosave_form");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.teacherName || parsed.preparedBy || "";
      }
    } catch (e) {}
    return "";
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("reelsystem_autosave_form");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.schoolName) setSchoolName(parsed.schoolName);
        if (parsed.teacherName) {
          setTeacherName(parsed.teacherName);
        } else if (parsed.preparedBy) {
          setTeacherName(parsed.preparedBy);
        }
      }
    } catch (e) {}
  }, []);

  // Tab control: "full" | "intext"
  const [activeTab, setActiveTab] = useState<"full" | "intext">("full");
  
  // Input settings
  const [style, setStyle] = useState<"APA" | "MLA" | "Chicago">("APA");
  const [sourceType, setSourceType] = useState<"Book" | "Website" | "Journal Article">("Book");
  
  // Contributors list
  const [contributors, setContributors] = useState<Contributor[]>([
    { role: "Author", firstName: "Jose", middleInitial: "P.", lastName: "Rizal", suffix: "" }
  ]);

  // Metadata Fields
  const [year, setYear] = useState("1887");
  const [title, setTitle] = useState("Noli Me Tangere");
  const [publisher, setPublisher] = useState("Berliner Buchdruckerei-Aktien-Gesellschaft");
  const [edition, setEdition] = useState("1st");
  const [pages, setPages] = useState("354");
  const [doi, setDOI] = useState("");
  const [url, setURL] = useState("");

  // AI enrichment states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
  const [aiErrorMessage, setAiErrorMessage] = useState("");

  // Copy success feedback state
  const [copied, setCopied] = useState(false);

  // Sync / Auto re-render triggers
  const [offlineCitation, setOfflineCitation] = useState("");
  const [offlineIntext, setOfflineIntext] = useState("");

  // Translations object
  const t = {
    en: {
      title: "ReelSystem Academic Citation & Reference Generator",
      desc: "Instantly compile bibliographical reference guides and in-text citation indicators based on official styles. Features native offline procedural matching, AI-assisted record refinement, and clean printable outputs.",
      styleLbl: "Citation Style Rules",
      sourceTypeLbl: "Source Type",
      contributorLbl: "Contributors & Tagging",
      role: "Role",
      firstName: "First Name",
      middleInitial: "M.I.",
      lastName: "Last Name",
      suffix: "Suffix",
      addContributor: "+ Add Contributor",
      metadataLbl: "Source Metadata Specifications",
      yearLbl: "Year / Date *",
      titleLbl: "Document / Book Title *",
      publisherLbl: "Publisher / Agency *",
      editionLbl: "Edition",
      pagesLbl: "Page(s)",
      doiLbl: "DOI (Digital Object Identifier)",
      urlLbl: "URL (Web Link)",
      fullTab: "Full Bibliographical Citation",
      intextTab: "In-text Citation Indicator",
      copyBtn: "Copy Citation",
      copiedFeedback: "Copied successfully to clipboard!",
      aiEnrichBtn: "✨ AI-Power: Auto Enrich & Clean Citation",
      aiLoadingText: "Querying bibliographic registers...",
      aiSuggestionsLbl: "AI Bibliographical Insights",
      printBtn: "Print Bibliographical Entry",
      authorRole: "Author",
      editorRole: "Editor",
      noContributors: "No contributors declared. Add one using the button below.",
      branding: "REELSYSTEM REFERENCE SERVICE"
    },
    fil: {
      title: "ReelSystem Academic Citation & Reference Generator",
      desc: "Mabilisang bumuo ng mga bibliograpiya at in-text citation gamit ang opisyal na estilo. May kasamang offline na pagkalkula, AI-assisted na paglilinis ng detalye, at malinis na pag-print.",
      styleLbl: "Pamantayan sa Estilo ng Sipi",
      sourceTypeLbl: "Uri ng Sanggunian",
      contributorLbl: "Mga Tagapag-ambag (May-akda/Editor)",
      role: "Tungkulin",
      firstName: "Pangalan",
      middleInitial: "G.P.",
      lastName: "Apelyido",
      suffix: "Hulapi",
      addContributor: "+ Magdagdag ng Tagapag-ambag",
      metadataLbl: "Mga Detalye ng Sanggunian",
      yearLbl: "Taon / Petsa *",
      titleLbl: "Pamagat ng Dokumento/Aklat *",
      publisherLbl: "Tagapaglathala / Ahensya *",
      editionLbl: "Edisyon",
      pagesLbl: "Pahina",
      doiLbl: "DOI (Digital Object Identifier)",
      urlLbl: "URL (Web Link)",
      fullTab: "Buong Bibliograpiya",
      intextTab: "In-text Citation",
      copyBtn: "Kopyahin ang Sipi",
      copiedFeedback: "Matagumpay na nakopya!",
      aiEnrichBtn: "✨ AI-Power: Awtomatikong Pagandahin ang Sipi",
      aiLoadingText: "Sinusuri ang mga rekord ng bibliograpiya...",
      aiSuggestionsLbl: "Mga Suhestiyon ng AI",
      printBtn: "I-print ang Bibliograpiya",
      authorRole: "May-akda",
      editorRole: "Editor",
      noContributors: "Walang inilagay na tagapag-ambag. Magdagdag gamit ang button.",
      branding: "SERBISYONG SANGGUNIAN NG REELSYSTEM"
    }
  }[lang];

  // Procedural JavaScript Offline Engine
  const compileCitations = () => {
    // 1. Process Contributors to standard author string
    if (contributors.length === 0) {
      return { full: "[Anonymous]. (" + (year || "n.d.") + "). " + (title || "[Untitled]") + ".", intext: "([Anonymous], " + (year || "n.d.") + ")" };
    }

    const firstAuth = contributors[0];
    const lastName = firstAuth.lastName ? firstAuth.lastName.trim() : "Anonymous";
    const firstName = firstAuth.firstName ? firstAuth.firstName.trim() : "";
    const fInitial = firstName ? firstName.charAt(0) + "." : "";
    const mInitial = firstAuth.middleInitial ? firstAuth.middleInitial.trim().charAt(0) + "." : "";

    let authorStrAPA = "";
    let authorStrMLA = "";
    let authorStrChicago = "";

    if (style === "APA") {
      // "Lastname, F. M."
      authorStrAPA = lastName + (fInitial ? ", " + fInitial : "") + (mInitial ? " " + mInitial : "");
      if (contributors.length > 1) {
        authorStrAPA += " & others";
      }
    } else {
      // MLA and Chicago: "Lastname, Firstname"
      const authorFull = lastName + (firstName ? ", " + firstName : "");
      authorStrMLA = authorFull;
      authorStrChicago = authorFull;
      if (contributors.length > 1) {
        authorStrMLA += ", et al.";
        authorStrChicago += ", et al.";
      }
    }

    const safeYear = year ? year.trim() : "n.d.";
    const safeTitle = title ? title.trim() : "Untitled Document";
    const safePublisher = publisher ? publisher.trim() : "Unknown Publisher";
    const safeEdition = edition ? edition.trim() : "";
    const safePages = pages ? pages.trim() : "";
    const safeDOI = doi ? doi.trim() : "";
    const safeURL = url ? url.trim() : "";

    let full = "";
    let intext = "";

    if (style === "APA") {
      // APA: Lastname, F. M. (Year). Title (Edition ed.). Publisher. DOI/URL
      const edPart = safeEdition ? " (" + safeEdition + " ed.)" : "";
      const pgPart = safePages ? ", " + safePages : "";
      const linkPart = safeDOI ? " https://doi.org/" + safeDOI : (safeURL ? " " + safeURL : "");
      
      full = `${authorStrAPA} (${safeYear}). _${safeTitle}_${edPart}. ${safePublisher}.${linkPart}`;
      intext = `(${lastName}, ${safeYear}${pgPart ? ", p. " + safePages : ""})`;
    } else if (style === "MLA") {
      // MLA: Lastname, First Name. Title. Publisher, Year, URL.
      const pgPart = safePages ? ", pp. " + safePages : "";
      const linkPart = safeURL ? ", " + safeURL : "";
      
      full = `${authorStrMLA}. _${safeTitle}_. ${safePublisher}, ${safeYear}${pgPart}${linkPart}.`;
      intext = `(${lastName} ${safePages || ""})`.trim().replace(/\s+/g, " ");
    } else {
      // Chicago: Lastname, First Name. Title. Publisher, Year.
      const pgPart = safePages ? ", " + safePages : "";
      full = `${authorStrChicago}. _${safeTitle}_. ${safePublisher}, ${safeYear}.`;
      intext = `(${lastName} ${safeYear}${pgPart ? ", " + safePages : ""})`;
    }

    return { full, intext };
  };

  // Re-run the procedural compiler when any inputs change
  useEffect(() => {
    const outputs = compileCitations();
    setOfflineCitation(outputs.full);
    setOfflineIntext(outputs.intext);
  }, [style, sourceType, contributors, year, title, publisher, edition, pages, doi, url]);

  // Contributor block mechanics
  const handleAddContributor = () => {
    setContributors([
      ...contributors,
      { role: "Author", firstName: "", middleInitial: "", lastName: "", suffix: "" }
    ]);
  };

  const handleUpdateContributor = (index: number, field: keyof Contributor, value: string) => {
    const updated = [...contributors];
    updated[index] = { ...updated[index], [field]: value };
    setContributors(updated);
  };

  const handleDeleteContributor = (index: number) => {
    setContributors(contributors.filter((_, idx) => idx !== index));
  };

  // Copy citation mechanism
  const handleCopyCitation = () => {
    const citationText = activeTab === "full" ? offlineCitation : offlineIntext;
    // Clean markdown italics underscores if copying raw text for standard clipboards
    const cleanText = citationText.replace(/_/g, "");
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // AI-Assisted Citation Enrichment Integration
  const handleAiEnrich = async () => {
    if (!title.trim() && !url.trim()) {
      setAiErrorMessage("Please supply a Document/Book Title or URL/Link first to let AI retrieve matches.");
      return;
    }
    setAiLoading(true);
    setAiErrorMessage("");
    setAiSuccessMessage("");
    setAiSuggestions([]);

    try {
      const response = await fetch("/api/lesson/enrich-citation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style,
          sourceType,
          contributors,
          year,
          title,
          publisher,
          edition,
          pages,
          doi,
          url
        })
      });

      if (!response.ok) {
        throw new Error("Bibliographic register lookup failed.");
      }

      const data = await response.json();
      
      // Update form values based on AI's parsed feedback
      if (data.enrichedFields) {
        if (data.enrichedFields.year) setYear(data.enrichedFields.year);
        if (data.enrichedFields.title) setTitle(data.enrichedFields.title);
        if (data.enrichedFields.publisher) setPublisher(data.enrichedFields.publisher);
        if (data.enrichedFields.pages) setPages(data.enrichedFields.pages);
        if (data.enrichedFields.url) setURL(data.enrichedFields.url);
      }

      if (data.suggestions && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
      }

      setAiSuccessMessage("AI successfully validated and optimized the citation metadata fields below!");
    } catch (err: any) {
      console.warn("AI citation enrichment failed. Proceeding with high-accuracy offline math:", err);
      setAiErrorMessage(err.message || "Failed to contact AI service. Standard offline citation formatting remains active.");
    } finally {
      setAiLoading(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById("reelsystem-printable-citation-sheet");
    if (!element) {
      window.print();
      return;
    }
    const printWin = window.open("", "_blank");
    if (!printWin) {
      // Fallback if popups blocked
      window.print();
      return;
    }
    printWin.document.write(`
      <html>
        <head>
          <title>ReelSystem Bibliography & Citation Report</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: #ffffff; color: #000000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: 'Arial', sans-serif; padding: 20px; background: #ffffff; color: #000000; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="p-4">
            ${element.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto text-slate-800">
      
      {/* 1. LEFT SIDEBAR WORKSPACE: METADATA INPUT FORM */}
      <div className="lg:col-span-7 bg-white border-4 border-slate-900 rounded-3xl p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] no-print">
        <div className="flex justify-between items-center mb-4 border-b-2 border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-200 rounded-xl border-2 border-slate-900">
              <Book className="w-5 h-5 text-rose-700" />
            </div>
            <h2 className="font-black text-lg text-slate-900 tracking-tight">Citation Workspace</h2>
          </div>
          <button
            onClick={() => setLang(l => l === "en" ? "fil" : "en")}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 rounded-lg border-2 border-slate-900 hover:bg-rose-200 transition-all duration-200 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "en" ? "Filipino" : "English"}
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          {t.desc}
        </p>

        {/* Dynamic Controls Grid */}
        <div className="space-y-4">
          
          {/* Style rules selector using custom radio cards */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
              {t.styleLbl}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["APA", "MLA", "Chicago"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s as any)}
                  className={`py-2 px-3 rounded-xl border-2 text-xs font-black transition-all ${
                    style === s
                      ? "bg-pink-100 border-slate-900 text-pink-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {s} Style
                </button>
              ))}
            </div>
          </div>

          {/* Source Type selection */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
              {t.sourceTypeLbl}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "Book", icon: Book },
                { type: "Website", icon: Globe },
                { type: "Journal Article", icon: FileText }
              ].map((s) => (
                <button
                  key={s.type}
                  onClick={() => setSourceType(s.type as any)}
                  className={`py-2 px-2.5 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    sourceType === s.type
                      ? "bg-pink-100 border-slate-900 text-pink-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{s.type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contributors blocks list section */}
          <div className="border-2 border-slate-900 rounded-2xl p-4 bg-rose-50/30">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-2 flex justify-between items-center">
              <span>{t.contributorLbl}</span>
              <span className="text-[10px] text-slate-400 capitalize">Multiple authors supported</span>
            </h3>

            {contributors.length === 0 ? (
              <p className="text-xs text-slate-400 italic mb-3">{t.noContributors}</p>
            ) : (
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {contributors.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center border-b border-rose-100 pb-2 last:border-0 last:pb-0">
                    <select
                      value={c.role}
                      onChange={(e) => handleUpdateContributor(idx, "role", e.target.value as any)}
                      className="col-span-2 px-1 py-1 bg-white border border-slate-300 rounded-lg text-[10px] font-bold"
                    >
                      <option value="Author">{t.authorRole}</option>
                      <option value="Editor">{t.editorRole}</option>
                    </select>

                    <input
                      type="text"
                      placeholder={t.firstName}
                      value={c.firstName}
                      onChange={(e) => handleUpdateContributor(idx, "firstName", e.target.value)}
                      className="col-span-3 px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-[10px]"
                    />

                    <input
                      type="text"
                      placeholder={t.middleInitial}
                      value={c.middleInitial}
                      maxLength={1}
                      onChange={(e) => handleUpdateContributor(idx, "middleInitial", e.target.value)}
                      className="col-span-1 px-1 py-1 bg-white border border-slate-300 rounded-lg text-[10px] text-center"
                    />

                    <input
                      type="text"
                      placeholder={t.lastName}
                      value={c.lastName}
                      onChange={(e) => handleUpdateContributor(idx, "lastName", e.target.value)}
                      className="col-span-4 px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-[10px] font-semibold"
                    />

                    <input
                      type="text"
                      placeholder={t.suffix}
                      value={c.suffix}
                      onChange={(e) => handleUpdateContributor(idx, "suffix", e.target.value)}
                      className="col-span-1 px-1 py-1 bg-white border border-slate-300 rounded-lg text-[10px]"
                    />

                    <button
                      onClick={() => handleDeleteContributor(idx)}
                      className="col-span-1 p-1 text-slate-400 hover:text-red-600 transition"
                      title="Remove Contributor"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleAddContributor}
              className="mt-3 py-1 px-3 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-900 rounded-lg text-[10px] font-black tracking-wide uppercase transition duration-150 shadow-[1px_1px_0px_rgba(0,0,0,1)]"
            >
              {t.addContributor}
            </button>
          </div>

          {/* Standard Metadata fields */}
          <div className="border-2 border-slate-900 rounded-2xl p-4 bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-3">
              {t.metadataLbl}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-12 gap-3 text-xs">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">{t.yearLbl}</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="md:col-span-9">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">{t.titleLbl}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">{t.publisherLbl}</label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">{t.editionLbl}</label>
                <input
                  type="text"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">{t.pagesLbl}</label>
                <input
                  type="text"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">{t.doiLbl}</label>
                <input
                  type="text"
                  placeholder="e.g. 10.1037/rmh0000008"
                  value={doi}
                  onChange={(e) => setDOI(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="md:col-span-8">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">{t.urlLbl}</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setURL(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* AI Helper Actions Button */}
          <div className="space-y-2">
            <button
              onClick={handleAiEnrich}
              disabled={aiLoading}
              className="w-full py-2 px-4 bg-pink-700 hover:bg-pink-800 disabled:bg-pink-400 text-white font-black text-xs uppercase tracking-wider rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className={`w-4 h-4 text-pink-200 ${aiLoading ? "animate-spin" : ""}`} />
              <span>{aiLoading ? t.aiLoadingText : t.aiEnrichBtn}</span>
            </button>

            {aiSuccessMessage && (
              <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-[11px] font-bold text-emerald-800">
                ✅ {aiSuccessMessage}
              </div>
            )}

            {aiErrorMessage && (
              <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-[11px] font-bold text-amber-800">
                ⚠️ {aiErrorMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. RIGHT SIDEBAR WORKSPACE: LIVE REAL-TIME PREVIEW CONTAINER */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        
        {/* Real-time Preview Box */}
        <div className="bg-white border-4 border-slate-900 rounded-3xl p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 border-b-2 border-slate-200 pb-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                <span>📋</span>
                <span>Live Citation Card</span>
              </span>
              <span className="text-[10px] bg-pink-100 border border-pink-300 text-pink-800 font-extrabold px-1.5 py-0.5 rounded uppercase">
                {style} STYLE
              </span>
            </div>
            
            {teacherName && (
              <div className="mb-3 p-2 bg-pink-50/50 border border-pink-200 rounded-xl text-[10px] font-bold text-slate-700">
                🏫 <span className="text-pink-900">{schoolName}</span> • Compiled by <span className="text-pink-900">{teacherName}</span>
              </div>
            )}

            {/* Tab view controllers */}
            <div className="flex bg-slate-100 border border-slate-300 rounded-xl p-1 mb-4">
              <button
                onClick={() => setActiveTab("full")}
                className={`flex-1 text-center py-1.5 px-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${
                  activeTab === "full"
                    ? "bg-pink-100 text-pink-900 shadow-sm border border-pink-300"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.fullTab}
              </button>
              <button
                onClick={() => setActiveTab("intext")}
                className={`flex-1 text-center py-1.5 px-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${
                  activeTab === "intext"
                    ? "bg-pink-100 text-pink-900 shadow-sm border border-pink-300"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.intextTab}
              </button>
            </div>

            {/* Rendered output field container */}
            <div className="bg-rose-50/20 border-2 border-slate-900 p-4 rounded-xl min-h-[110px] flex items-center justify-center text-xs text-slate-900 leading-relaxed font-serif relative">
              {activeTab === "full" ? (
                <div dangerouslySetInnerHTML={{ __html: offlineCitation.replace(/_([^_]+)_/g, "<em>$1</em>") }} />
              ) : (
                <div>{offlineIntext}</div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 mt-2 text-center italic">
              Changes reflect in real-time as you fill the workspace.
            </p>
          </div>

          <div className="mt-5 space-y-2 pt-4 border-t border-slate-100">
            {/* Action buttons inside card */}
            <button
              onClick={handleCopyCitation}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t.copiedFeedback}</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>{t.copyBtn}</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="w-full py-1.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 rounded-lg text-[10px] font-black uppercase transition flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printBtn}</span>
            </button>
          </div>
        </div>

        {/* AI Bibliographical Suggestions List (if present) */}
        {aiSuggestions.length > 0 && (
          <div className="bg-white border-4 border-slate-900 rounded-3xl p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] no-print">
            <h3 className="text-xs font-black text-rose-800 uppercase tracking-widest mb-2 flex items-center gap-1">
              <span>💡</span>
              <span>{t.aiSuggestionsLbl}</span>
            </h3>
            <ul className="space-y-1 text-[11px] leading-normal text-slate-600 list-disc list-inside">
              {aiSuggestions.map((s, idx) => (
                <li key={idx} className="marker:text-rose-500">{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Mini Ledger Stamp */}
        <div className="p-3 bg-pink-100 border-2 border-dashed border-pink-400 rounded-2xl text-center no-print">
          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">{t.branding}</span>
          <span className="text-[8px] text-slate-400 block mt-0.5">ESTABLISHED IN THE EDUCATION SUITE</span>
        </div>
      </div>

      {/* 3. PRINT ONLY CANVAS - SECRET LEDGER FORMATTED */}
      <div className="print-only-section hidden print:block w-full text-slate-950 p-12" id="reelsystem-printable-citation-sheet">
        <div className="border-b-4 border-double border-slate-950 pb-4 text-center mb-8">
          <h1 className="text-xl font-black uppercase tracking-widest">{schoolName || t.branding}</h1>
          <p className="text-xs font-bold mt-1">OFFICIAL BIBLIOGRAPHICAL REFERENCE LEDGER ENTRY</p>
          {teacherName && <p className="text-xs mt-1 italic font-medium">Compiler: {teacherName}</p>}
        </div>

        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wide">Selected Formatting Style:</span>
            <span className="text-sm font-black text-slate-900">{style} STYLE</span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wide">Full Bibliographical Record:</span>
            <div className="text-base font-serif border-l-4 border-slate-950 pl-4 py-2 my-2 bg-slate-50 rounded-r-lg" dangerouslySetInnerHTML={{ __html: offlineCitation.replace(/_([^_]+)_/g, "<em>$1</em>") }} />
          </div>

          <div>
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wide">In-text Citation Indicator:</span>
            <div className="text-sm font-mono border-l-4 border-slate-950 pl-4 py-1.5 my-2 bg-slate-50 rounded-r-lg">
              {offlineIntext}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mt-12 pt-6 border-t border-slate-300">
            <div>
              <span className="font-bold">Generated via ReelSystem Workspace Suite</span>
              <p className="text-[10px] text-slate-500 mt-1">Accredited educational document processor.</p>
            </div>
            <div className="text-right">
              <span className="font-bold">Verified Date & Stamp</span>
              <p className="text-[10px] text-slate-500 mt-1">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

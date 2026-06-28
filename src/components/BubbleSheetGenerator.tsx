import React, { useState, useEffect } from "react";
import { Printer, RefreshCw, Languages, Award, CheckSquare } from "lucide-react";
import { ILAWFormData } from "../types";

interface BubbleSheetGeneratorProps {
  formData?: ILAWFormData;
  onFieldChange?: (key: keyof ILAWFormData, value: string) => void;
}

export default function BubbleSheetGenerator({ formData, onFieldChange }: BubbleSheetGeneratorProps) {
  const [lang, setLang] = useState<"en" | "fil">("en");
  
  // Helper to load stored profile details
  const getStoredProfileValue = (key: string, defaultValue: string) => {
    try {
      const stored = localStorage.getItem("reelsystem_autosave_form");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (key === "teacherName") {
          return parsed.teacherName || parsed.preparedBy || defaultValue;
        }
        if (key === "subjectGrade") {
          if (parsed.subject || parsed.gradeLevel) {
            return parsed.subject && parsed.gradeLevel
              ? `${parsed.subject} / ${parsed.gradeLevel}`
              : (parsed.subject || parsed.gradeLevel || "");
          }
          return defaultValue;
        }
        return parsed[key] || defaultValue;
      }
    } catch (e) {
      console.warn("Error reading from localStorage in BubbleSheetGenerator", e);
    }
    return defaultValue;
  };

  // Sheet Header State
  const [examTitle, setExamTitle] = useState("Midterm Examination");
  const [schoolName, setSchoolName] = useState(() => getStoredProfileValue("schoolName", "ReelSystem Exemplar School"));
  const [subjectGrade, setSubjectGrade] = useState(() => getStoredProfileValue("subjectGrade", "Science & Technology / Grade 10"));
  const [teacherName, setTeacherName] = useState(() => getStoredProfileValue("teacherName", "Teacher Maria Santos"));
  
  // Grid config state
  const [totalItems, setTotalItems] = useState<number>(30);
  const [optionsCount, setOptionsCount] = useState<"A-D" | "A-E" | "1-4">("A-D");
  const [sectionsCount, setSectionsCount] = useState<number>(3);
  const [layoutType, setLayoutType] = useState<"Standard Columns" | "Anti-Cheat Circular Ring">("Standard Columns");
  
  // Render trigger key
  const [renderKey, setRenderKey] = useState<number>(0);

  // Sync from profile/form details
  useEffect(() => {
    if (formData) {
      if (formData.schoolName && formData.schoolName !== schoolName) {
        setSchoolName(formData.schoolName);
      }
      if (formData.subject || formData.gradeLevel) {
        const combined = formData.subject && formData.gradeLevel 
          ? `${formData.subject} / ${formData.gradeLevel}`
          : (formData.subject || formData.gradeLevel || "");
        if (combined !== subjectGrade) {
          setSubjectGrade(combined);
        }
      }
      if (formData.teacherName && formData.teacherName !== teacherName) {
        setTeacherName(formData.teacherName);
      } else if (formData.preparedBy && formData.preparedBy !== teacherName && !formData.teacherName) {
        setTeacherName(formData.preparedBy);
      }
    } else {
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
          if (parsed.subject || parsed.gradeLevel) {
            const combined = parsed.subject && parsed.gradeLevel
              ? `${parsed.subject} / ${parsed.gradeLevel}`
              : (parsed.subject || parsed.gradeLevel || "");
            setSubjectGrade(combined);
          }
        }
      } catch (e) {}
    }
  }, [formData]);

  const handleSchoolNameChange = (val: string) => {
    setSchoolName(val);
    onFieldChange?.("schoolName", val);
  };

  const handleTeacherNameChange = (val: string) => {
    setTeacherName(val);
    onFieldChange?.("teacherName", val);
    onFieldChange?.("preparedBy", val);
  };

  const handleSubjectGradeChange = (val: string) => {
    setSubjectGrade(val);
    const parts = val.split(" / ");
    if (parts.length > 1) {
      onFieldChange?.("subject", parts[0].trim());
      onFieldChange?.("gradeLevel", parts[1].trim());
    } else {
      onFieldChange?.("subject", val);
    }
  };

  const handleInstantRender = () => {
    setRenderKey(prev => prev + 1);
  };

  const handlePrint = () => {
    const element = document.getElementById("reelsystem-printable-bubble-sheet");
    if (!element) {
      window.print();
      return;
    }
    const printWin = window.open("", "_blank");
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <html>
        <head>
          <title>${examTitle || 'ReelSystem Answer Sheet'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap');
            
            body {
              font-family: "Inter", sans-serif;
              background-color: #ffffff;
              color: #000000;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 5mm;
              }
              body {
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              #reelsystem-printable-bubble-sheet {
                width: 100% !important;
                height: 100% !important;
                max-height: 287mm !important;
                padding: 4mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
              }
              .no-print {
                display: none !important;
              }
            }
            .bubble-opt-print {
              border-color: #000000 !important;
              color: #000000 !important;
              background-color: #ffffff !important;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="p-2">
            ${element.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Translation helpers
  const t = {
    en: {
      title: "ReelSystem Dynamic Bubble Answer Sheet Generator",
      desc: "Generate professional bubble sheet templates in standard linear columns or anti-cheat radial rings. Fully customizable, offline-ready, and formatted for A4 print optimization.",
      examTitleLbl: "Exam Title",
      schoolNameLbl: "School Name",
      subjectGradeLbl: "Subject & Grade Level",
      teacherNameLbl: "Teacher / Proctor",
      totalItemsLbl: "Total Items (10 - 60)",
      optionsLbl: "Options per Item",
      sectionsLbl: "Number of Sections (Groupings)",
      layoutTypeLbl: "Sheet Layout Type",
      stdCol: "Standard Columns",
      antiCheat: "Anti-Cheat Circular Ring",
      renderBtn: "🔄 Instant Render Answer Sheet",
      printBtn: "Print Answer Sheet",
      studentName: "Student Name",
      date: "Date",
      score: "Score / Grade",
      signApproval: "Proctor / Teacher Signature Verification",
      signature: "Signature over Printed Name",
      verified: "Verified & Audited",
      noRendered: "Answer sheet is ready. Click Render below to update details.",
      antiCheatCenterNote: "DO NOT FOLD",
      page: "Page",
      of: "of",
      branding: "REELSYSTEM BUBBLE ANSWER SHEET PRO"
    },
    fil: {
      title: "ReelSystem Dynamic Bubble Answer Sheet Generator",
      desc: "Gumawa ng mga propesyonal na bubble sheet sa anyong tuwid na kolum o anti-cheat radial ring. Madaling i-customize, magagamit offline, at handa para sa pag-print sa A4.",
      examTitleLbl: "Pamagat ng Pagsusulit",
      schoolNameLbl: "Pangalan ng Paaralan",
      subjectGradeLbl: "Asignatura at Baitang",
      teacherNameLbl: "Guro / Tagapangasiwa",
      totalItemsLbl: "Kabuuang Tanong (10 - 60)",
      optionsLbl: "Mga Pagpipilian bawat Tanong",
      sectionsLbl: "Bilang ng Seksyon (Pangkat)",
      layoutTypeLbl: "Uri ng Layout ng Papel",
      stdCol: "Standard na Kolum",
      antiCheat: "Anti-Cheat na Circular Ring",
      renderBtn: "🔄 Mabilisang Render ng Answer Sheet",
      printBtn: "I-print ang Answer Sheet",
      studentName: "Pangalan ng Mag-aaral",
      date: "Petsa",
      score: "Marka / Iskor",
      signApproval: "Pagpapatunay at Lagda ng Tagapangasiwa/Guro",
      signature: "Lagda sa ibabaw ng Nakalimbag na Pangalan",
      verified: "Napatunayan at Na-audit",
      noRendered: "Handa na ang answer sheet. I-click ang Render sa ibaba upang i-update.",
      antiCheatCenterNote: "HUWAG TUPIIN",
      page: "Pahina",
      of: "ng",
      branding: "REELSYSTEM BUBBLE ANSWER SHEET PRO"
    }
  }[lang];

  // Options arrays
  const getOptions = () => {
    if (optionsCount === "A-D") return ["A", "B", "C", "D"];
    if (optionsCount === "A-E") return ["A", "B", "C", "D", "E"];
    return ["1", "2", "3", "4"];
  };

  const optionsList = getOptions();

  // Procedural Column Layout Slicing
  const itemsArray = Array.from({ length: Math.max(10, Math.min(60, totalItems)) }, (_, i) => i + 1);
  
  // Calculate section indices
  const getSectionsData = () => {
    const total = itemsArray.length;
    const itemsPerSection = Math.ceil(total / sectionsCount);
    const result = [];
    for (let s = 0; s < sectionsCount; s++) {
      const startIdx = s * itemsPerSection;
      const endIdx = Math.min(total, startIdx + itemsPerSection);
      if (startIdx < total) {
        result.push(itemsArray.slice(startIdx, endIdx));
      }
    }
    return result;
  };

  const sectionColumns = getSectionsData();

  // Split items array for concentric circle dual-ring logic
  const isDualRing = totalItems > 25;
  const outerItems = isDualRing ? itemsArray.slice(0, 25) : itemsArray;
  const innerItems = isDualRing ? itemsArray.slice(25) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto text-slate-800">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 10mm !important;
          }
          header, nav, #theme-toggler-btn, .no-print, button, .sidebar-print-hide {
            display: none !important;
            visibility: hidden !important;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          #reelsystem-printable-bubble-sheet {
            width: 190mm !important;
            height: 277mm !important;
            padding: 10mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            background: white !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .bubble-opt-print {
            width: 5.5mm !important;
            height: 5.5mm !important;
            font-size: 8pt !important;
            border-width: 1.5pt !important;
          }
          .text-title-print {
            font-size: 14pt !important;
          }
          .text-school-print {
            font-size: 10pt !important;
          }
          .text-meta-print {
            font-size: 9pt !important;
          }
        }
      `}} />
      
      {/* 1. LEFT SIDEBAR: PARAMETERS CONTROLS */}
      <div className="lg:col-span-5 bg-white border-4 border-slate-900 rounded-3xl p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] no-print">
        <div className="flex justify-between items-center mb-4 border-b-2 border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-200 rounded-xl border-2 border-slate-900">
              <CheckSquare className="w-5 h-5 text-rose-700" />
            </div>
            <h2 className="font-black text-lg text-slate-900 tracking-tight">Answer Sheet Settings</h2>
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

        <div className="space-y-4">
          {/* Exam Title Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
              {t.examTitleLbl}
            </label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full px-3 py-2 bg-pink-50/50 border-2 border-slate-900 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* School Name Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
              {t.schoolNameLbl}
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => handleSchoolNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-pink-50/50 border-2 border-slate-900 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* Subject / Grade Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
              {t.subjectGradeLbl}
            </label>
            <input
              type="text"
              value={subjectGrade}
              onChange={(e) => handleSubjectGradeChange(e.target.value)}
              className="w-full px-3 py-2 bg-pink-50/50 border-2 border-slate-900 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* Teacher Name Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
              {t.teacherNameLbl}
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => handleTeacherNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-pink-50/50 border-2 border-slate-900 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Items Selector */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
                {t.totalItemsLbl}
              </label>
              <input
                type="number"
                min={10}
                max={60}
                value={totalItems}
                onChange={(e) => setTotalItems(Math.max(10, Math.min(60, parseInt(e.target.value) || 10)))}
                className="w-full px-3 py-2 bg-pink-50/50 border-2 border-slate-900 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Options Selector */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
                {t.optionsLbl}
              </label>
              <select
                value={optionsCount}
                onChange={(e) => setOptionsCount(e.target.value as any)}
                className="w-full px-3 py-2 bg-pink-50/50 border-2 border-slate-900 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="A-D">A, B, C, D</option>
                <option value="A-E">A, B, C, D, E</option>
                <option value="1-4">1, 2, 3, 4</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Sections Selector */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
                {t.sectionsLbl}
              </label>
              <input
                type="number"
                min={1}
                max={layoutType === "Anti-Cheat Circular Ring" ? 4 : 5}
                value={sectionsCount}
                onChange={(e) => {
                  const maxVal = layoutType === "Anti-Cheat Circular Ring" ? 4 : 5;
                  setSectionsCount(Math.max(1, Math.min(maxVal, parseInt(e.target.value) || 1)));
                }}
                className="w-full px-3 py-2 bg-pink-50/50 border-2 border-slate-900 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Layout Type Selector */}
            <div>
              <label className="block text-[10px] md:text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
                {t.layoutTypeLbl}
              </label>
              <select
                value={layoutType}
                onChange={(e) => {
                  const type = e.target.value as any;
                  setLayoutType(type);
                  if (type === "Anti-Cheat Circular Ring" && sectionsCount > 4) {
                    setSectionsCount(4);
                  }
                }}
                className="w-full px-2 py-2 bg-pink-50/50 border-2 border-slate-900 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="Standard Columns">{t.stdCol}</option>
                <option value="Anti-Cheat Circular Ring">{t.antiCheat}</option>
              </select>
            </div>
          </div>

          {/* Interactive render button */}
          <button
            onClick={handleInstantRender}
            className="w-full mt-2 py-3 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm rounded-2xl border-4 border-slate-900 shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-[2px] active:shadow-[1px_1px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t.renderBtn}</span>
          </button>

          {/* Interactive Print button */}
          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4 text-pink-300" />
            <span>{t.printBtn}</span>
          </button>
        </div>
      </div>

      {/* 2. RIGHT PREVIEW AREA: LIVE A4 PORTRAIT SHEET CANVAS */}
      <div className="lg:col-span-7 flex flex-col items-center">
        {/* Print Instruction Badge */}
        <div className="w-full max-w-[210mm] mb-3 p-3 bg-pink-100 border-2 border-pink-300 rounded-2xl text-center text-xs font-bold text-pink-900 no-print">
          💡 <strong>A4 Portrait Formatted:</strong> When printing, toggle off "headers and footers" in your browser settings to avoid page clutter.
        </div>

        {/* Paper Canvas */}
        <div 
          key={renderKey}
          id="reelsystem-printable-bubble-sheet"
          className="print-only-section w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-950 p-8 md:p-12 shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-2 border-slate-200 rounded-sm relative flex flex-col justify-between overflow-hidden"
          style={{ boxSizing: "border-box" }}
        >
          {/* Header Metadata block mimicking official examination style */}
          <div>
            <div className="text-center pb-4 border-b-4 border-double border-slate-900 mb-6">
              <h1 className="text-sm font-extrabold tracking-widest text-slate-500 uppercase">
                {schoolName || "REELSYSTEM EXEMPLAR SCHOOL"}
              </h1>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight my-1 uppercase">
                {examTitle || "MIDTERM EXAMINATION ANSWER SHEET"}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-bold text-slate-600 mt-2">
                <span>{t.subjectGradeLbl}: <strong className="text-slate-900">{subjectGrade}</strong></span>
                <span className="hidden sm:inline">•</span>
                <span>{t.teacherNameLbl}: <strong className="text-slate-900">{teacherName}</strong></span>
              </div>
            </div>

            {/* Official Student Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 text-xs">
              <div className="md:col-span-6 flex items-center gap-2">
                <span className="font-bold text-slate-700 whitespace-nowrap">{t.studentName}:</span>
                <div className="flex-1 border-b-2 border-slate-400 h-6"></div>
              </div>
              <div className="md:col-span-3 flex items-center gap-2">
                <span className="font-bold text-slate-700 whitespace-nowrap">{t.date}:</span>
                <div className="flex-1 border-b-2 border-slate-400 h-6"></div>
              </div>
              <div className="md:col-span-3 flex items-center gap-2">
                <div className="w-full bg-slate-100 border-2 border-slate-900 rounded-lg p-2 flex justify-between items-center text-[10px] md:text-xs">
                  <span className="font-bold text-slate-700">{t.score}:</span>
                  <span className="font-black text-slate-400">/ {totalItems}</span>
                </div>
              </div>
            </div>

            {/* Grid Rendering Core */}
            {layoutType === "Standard Columns" ? (
              /* Linear Multi-Column Grid */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-4">
                {sectionColumns.map((colItems, sIdx) => (
                  <div key={sIdx} className="border-2 border-slate-900 rounded-xl p-3 bg-slate-50">
                    <div className="text-[10px] font-black tracking-wider text-center text-rose-800 uppercase border-b border-slate-300 pb-1.5 mb-2">
                      {lang === "en" ? `Section ${sIdx + 1}` : `Seksyon ${sIdx + 1}`} ({colItems[0]}-{colItems[colItems.length - 1]})
                    </div>
                    <div className="space-y-1.5">
                      {colItems.map((itemNum) => (
                        <div key={itemNum} className="flex items-center justify-between text-xs py-0.5">
                          <span className="font-black text-slate-800 w-6 text-right mr-2">{itemNum}.</span>
                          <div className="flex gap-1.5 flex-1 justify-around">
                            {optionsList.map((opt) => (
                              <div key={opt} className="flex flex-col items-center">
                                <div className="w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-800 hover:bg-rose-100 cursor-pointer transition-all">
                                  {opt}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Anti-Cheat Circular Ring Layout Mode with Radial Polar Spoke Layout to Prevent Overlapping */
              sectionsCount === 1 ? (
                <div className="flex flex-col items-center justify-center my-6 relative min-h-[580px] overflow-visible scale-[0.85] sm:scale-[0.9] md:scale-100 origin-center">
                  {/* Central Core Circle with Anti-cheat instructions and labels */}
                  <div className="absolute w-36 h-36 rounded-full bg-rose-100 border-4 border-slate-900 flex flex-col items-center justify-center text-center p-3 z-10 shadow-md">
                    <Award className="w-6 h-6 text-rose-700 animate-pulse mb-1" />
                    <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider">{t.branding}</span>
                    <p className="text-[8px] text-rose-900 font-bold mt-1 leading-none">
                      {t.antiCheatCenterNote}
                    </p>
                    <span className="text-[8px] text-slate-500 mt-2 font-mono">ID: #{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>

                  {/* Concentric Dual Rings Parent Box using Radial Spokes (zero overlapping) */}
                  <div className="w-[580px] h-[580px] relative rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center overflow-visible">
                    {/* Outer Ring items (Items 1 to 25, or all items if total <= 25) */}
                    {outerItems.map((itemNum, idx) => {
                      const angle = (360 / outerItems.length) * idx;
                      const rotationAngle = angle - 90;
                      // Outer Ring Radius: 205px if dual ring, 140px if single
                      const radius = isDualRing ? 205 : 140;

                      return (
                        <div
                          key={itemNum}
                          className="absolute flex items-center justify-start text-xs font-semibold"
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: "115px",
                            height: "20px",
                            transform: `rotate(${rotationAngle}deg) translate(${radius}px, -50%)`,
                            transformOrigin: "left center",
                          }}
                        >
                          {/* Item Number */}
                          <span className="font-black text-slate-900 w-5 mr-1 text-right text-[10px]">{itemNum}.</span>
                          {/* Compact Bubble Dots */}
                          <div className="flex gap-1">
                            {optionsList.map((opt) => (
                              <div 
                                key={opt} 
                                className="w-4 h-4 rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-black text-slate-900 bg-white hover:bg-rose-100 cursor-pointer select-none transition-all bubble-opt-print"
                                title={`Item ${itemNum} - Option ${opt}`}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Inner Ring items (Items 26 to totalItems, if totalItems > 25) */}
                    {innerItems.map((itemNum, idx) => {
                      const angle = (360 / innerItems.length) * idx;
                      const rotationAngle = angle - 90;
                      // Inner Ring smaller radius: 95px
                      const radius = 95;

                      return (
                        <div
                          key={itemNum}
                          className="absolute flex items-center justify-start text-xs font-semibold"
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: "115px",
                            height: "20px",
                            transform: `rotate(${rotationAngle}deg) translate(${radius}px, -50%)`,
                            transformOrigin: "left center",
                          }}
                        >
                          {/* Item Number */}
                          <span className="font-black text-slate-900 w-5 mr-1 text-right text-[10px]">{itemNum}.</span>
                          {/* Compact Bubble Dots */}
                          <div className="flex gap-1">
                            {optionsList.map((opt) => (
                              <div 
                                key={opt} 
                                className="w-4 h-4 rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-black text-slate-900 bg-white hover:bg-rose-100 cursor-pointer select-none transition-all bubble-opt-print"
                                title={`Item ${itemNum} - Option ${opt}`}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Multi-Section Circular Rings Grid (zero overlapping) */
                <div className="grid grid-cols-2 gap-x-12 gap-y-12 my-6 justify-center justify-items-center relative min-h-[500px] w-full overflow-visible scale-[0.9] origin-center">
                  {sectionColumns.map((colItems, sIdx) => {
                    const sectionLetter = String.fromCharCode(65 + sIdx);
                    return (
                      <div 
                        key={sIdx} 
                        className="relative w-[260px] h-[260px] rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center overflow-visible bg-slate-50/50"
                      >
                        {/* Section Core Center */}
                        <div className="absolute w-16 h-16 rounded-full bg-rose-100 border-2 border-slate-900 flex flex-col items-center justify-center text-center p-1 z-10 shadow-sm">
                          <span className="text-[10px] font-black text-rose-800 uppercase tracking-wide">
                            {lang === "en" ? `Sec ${sectionLetter}` : `Seks ${sectionLetter}`}
                          </span>
                          <span className="text-[8px] font-bold text-slate-500 font-mono">
                            {colItems[0]}-{colItems[colItems.length - 1]}
                          </span>
                        </div>

                        {/* Circular ring of bubbles inside this section using radial spokes */}
                        {colItems.map((itemNum, idx) => {
                          const angle = (360 / colItems.length) * idx;
                          const rotationAngle = angle - 90;
                          const radius = 55;

                          return (
                            <div
                              key={itemNum}
                              className="absolute flex items-center justify-start text-[10px] font-semibold"
                              style={{
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                width: "90px",
                                height: "18px",
                                transform: `rotate(${rotationAngle}deg) translate(${radius}px, -50%)`,
                                transformOrigin: "left center",
                              }}
                            >
                              <span className="font-black text-slate-900 w-4 mr-1 text-right text-[8px]">{itemNum}.</span>
                              <div className="flex gap-0.5">
                                {optionsList.map((opt) => (
                                  <div 
                                    key={opt} 
                                    className="w-3.5 h-3.5 rounded-full border border-slate-900 flex items-center justify-center text-[7px] font-black text-slate-900 bg-white hover:bg-rose-100 cursor-pointer select-none transition-all bubble-opt-print"
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* Lower Official Signature & Verification Stamp Slot */}
          <div className="mt-8 border-t-2 border-slate-300 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              <div>
                <span className="font-extrabold text-slate-900 block mb-1 uppercase tracking-wide">
                  {t.signApproval}
                </span>
                <p className="text-[10px] text-slate-500 mb-6 leading-relaxed">
                  I hereby certify that the examination rules were enforced during this testing period, and that no cheating or duplication of sheets occurred.
                </p>
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-[280px] border-b-2 border-slate-900 h-8 flex items-end justify-center">
                  </div>
                  <span className="text-[10px] text-slate-700 font-bold mt-1 uppercase tracking-wider">{t.signature}</span>
                </div>
              </div>

              <div className="flex flex-col justify-end items-center md:items-end">
                {/* Official Branding Signature */}
                <div className="p-3 bg-pink-50 border-2 border-dashed border-pink-400 rounded-xl max-w-[240px] text-center">
                  <span className="text-[10px] font-black text-slate-500 tracking-wider block uppercase">ReelSystem Premium System</span>
                  <div className="text-xs font-black text-rose-800 my-0.5">★ ACCREDITED EXAM SHEET ★</div>
                  <span className="text-[9px] text-slate-400">{t.verified}</span>
                </div>
              </div>
            </div>

            {/* Micro branding footer */}
            <div className="flex justify-between items-center text-[8px] font-black text-slate-400 tracking-wider mt-8 border-t border-slate-100 pt-2 uppercase">
              <span>POWERED BY REELSYSTEM INTELLECTUAL SUITE</span>
              <span>{t.page} 1 {t.of} 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

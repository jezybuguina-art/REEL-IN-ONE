import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Sparkles, BookOpen, RefreshCw, FileText, User, Check, Trash2, 
  Copy, Printer, Download, Search, Send, Clock, Home, Plus, 
  ArrowRight, Landmark, FileCode, CheckCircle, Info, HelpCircle,
  Table, Heart, Coffee, ExternalLink, MessageSquare, Save, Database, Brain,
  Undo2, Redo2, Settings, ChevronUp, ChevronDown
} from "lucide-react";
import { ILAWFormData, SavedLessonPlan, ChatMessage } from "./types";
import FeedbackSection from "./components/FeedbackSection";
import { AiGenerators } from "./components/AiGenerators";
import BubbleSheetGenerator from "./components/BubbleSheetGenerator";
import CitationGenerator from "./components/CitationGenerator";

const LOCAL_STORAGE_KEY = "ilawSavedFiles_v1";
const CHAT_HISTORY_KEY = "reelinone_chat_history";

// Spelling & Grammar Correction Engine Definitions
interface CheckerIssue {
  id: string;
  word: string;
  type: "spelling" | "grammar";
  message: string;
  suggestion: string;
  index: number;
}

const COMMON_TYPOS: Record<string, string> = {
  identifiying: "identifying",
  competecies: "competencies",
  seperate: "separate",
  teh: "the",
  receving: "receiving",
  reiceve: "receive",
  recieve: "receive",
  goverment: "government",
  enviornment: "environment",
  beleive: "believe",
  occured: "occurred",
  untill: "until",
  truely: "truly",
  definately: "definitely",
  agressive: "aggressive",
  alot: "a lot",
  begining: "beginning",
  commitee: "committee",
  embarass: "embarrass",
  fourty: "forty",
  guarantee: "guarantee",
  immediatly: "immediately",
  necessary: "necessary",
  neccessary: "necessary",
  necassary: "necessary",
  privelege: "privilege",
  refering: "referring",
  tommorow: "tomorrow",
  tommow: "tomorrow",
  writen: "written",
  writting: "writing",
  studets: "students",
  teachres: "teachers",
  activites: "activities",
  assesment: "assessment",
  assement: "assessment",
  evalution: "evaluation",
  experiance: "experience",
  knowlege: "knowledge",
  milstone: "milestone",
  competencys: "competencies",
  learers: "learners",
  leatners: "learners",
  lessonplan: "lesson plan",
  coorperation: "cooperation",
  coorperative: "cooperative",
  collaboritive: "collaborative",
  colaborative: "collaborative"
};

function runSpellAndGrammarChecker(text: string): CheckerIssue[] {
  if (!text) return [];
  const issues: CheckerIssue[] = [];
  
  // 1. Check spelling word-by-word
  const words = text.split(/[\s,.:;?!"'()]+/);
  let wordIdCounter = 0;
  
  words.forEach((word) => {
    const cleanWord = word.toLowerCase().trim();
    if (COMMON_TYPOS[cleanWord]) {
      wordIdCounter++;
      issues.push({
        id: `spelling-${wordIdCounter}-${cleanWord}`,
        word: word,
        type: "spelling",
        message: `Potential typo found: "${word}"`,
        suggestion: COMMON_TYPOS[cleanWord],
        index: text.indexOf(word)
      });
    }
  });

  // 2. Check basic grammar patterns using regexes
  // A. Duplicate words
  const duplicateRegex = /\b(the|and|a|an|to|in|of|is|it|for|with|that|on|or|be)\s+\1\b/gi;
  let match;
  let grammarIdCounter = 0;
  while ((match = duplicateRegex.exec(text)) !== null) {
    grammarIdCounter++;
    const duplicateText = match[0];
    const singleWord = match[1];
    issues.push({
      id: `grammar-dup-${grammarIdCounter}`,
      word: duplicateText,
      type: "grammar",
      message: `Duplicate word detected: "${duplicateText}"`,
      suggestion: singleWord,
      index: match.index
    });
  }

  // B. Article "a" before vowel
  const aBeforeVowels = /\b(a)\s+([aeiou][a-z]+)\b/gi;
  while ((match = aBeforeVowels.exec(text)) !== null) {
    const matchedText = match[0];
    const wordAfter = match[2];
    if (!wordAfter.startsWith("uni")) {
      grammarIdCounter++;
      issues.push({
        id: `grammar-art-vowel-${grammarIdCounter}`,
        word: matchedText,
        type: "grammar",
        message: `Use "an" before vowel sounds: "${matchedText}"`,
        suggestion: `an ${wordAfter}`,
        index: match.index
      });
    }
  }

  // C. Article "an" before consonant
  const anBeforeConsonants = /\b(an)\s+([bcdfghjklmnpqrstvwxyz][a-z]+)\b/gi;
  while ((match = anBeforeConsonants.exec(text)) !== null) {
    const matchedText = match[0];
    const wordAfter = match[2];
    if (!wordAfter.startsWith("hour") && !wordAfter.startsWith("honest") && !wordAfter.startsWith("honor")) {
      grammarIdCounter++;
      issues.push({
        id: `grammar-art-consonant-${grammarIdCounter}`,
        word: matchedText,
        type: "grammar",
        message: `Use "a" before consonant sounds: "${matchedText}"`,
        suggestion: `a ${wordAfter}`,
        index: match.index
      });
    }
  }

  return issues;
}

interface GrammarSpellIndicatorProps {
  text: string;
  onFix: (original: string, correction: string) => void;
}

function GrammarSpellIndicator({ text, onFix }: GrammarSpellIndicatorProps) {
  const issues = useMemo(() => runSpellAndGrammarChecker(text), [text]);
  const [expanded, setExpanded] = useState(false);

  if (issues.length === 0) return null;

  return (
    <div className="mt-1.5 border-2 border-amber-400 bg-amber-50 rounded-lg p-2 text-xs font-semibold text-amber-950 transition-all shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-amber-900">
          <Info className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
          <span>Found {issues.length} spelling/grammar {issues.length === 1 ? 'issue' : 'issues'} in this section</span>
        </span>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] uppercase font-black tracking-widest text-amber-800 hover:text-amber-950 px-2 py-0.5 border border-amber-300 bg-white rounded cursor-pointer transition-colors"
        >
          {expanded ? "Hide Details" : "View & Auto-Fix"}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-amber-200 pt-2 animate-fade-in max-h-[150px] overflow-y-auto pr-1">
          {issues.map((issue) => (
            <div key={issue.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 p-2 rounded border border-amber-150">
              <div className="space-y-0.5">
                <span className={`text-[9px] font-black uppercase px-1 rounded-sm tracking-wider ${issue.type === 'spelling' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                  {issue.type}
                </span>
                <p className="text-[11px] text-slate-800 font-semibold">{issue.message}</p>
              </div>
              <button
                type="button"
                onClick={() => onFix(issue.word, issue.suggestion)}
                className="bg-emerald-650 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1 rounded shadow-sm self-end sm:self-center cursor-pointer transition-all flex items-center gap-1 shrink-0"
              >
                <Check className="w-3 h-3" />
                <span>Fix to "{issue.suggestion}"</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const BACKGROUND_OPTIONS = [
  "Learners have strong basic sentence comprehension but struggle with extracting main ideas/overarching concepts.",
  "Learners are visually-oriented and highly responsive to illustrated material and graphic organizers.",
  "Learners are auditory processors who excel in group retelling, dialogues, and speaking exercises.",
  "Learners are highly collaborative with active participation in gamified challenges but need self-regulation boundaries.",
  "Learners show varied language proficiency and require scaffolded vocabulary terms and explicit modeling.",
  "Learners are kinesthetic and require active board participation and manipulative worksheets."
];

const MATERIALS_OPTIONS = [
  "Multimedia: PowerPoint slides, projector, digital interactive whiteboards",
  "Reading materials: Short stories printouts, informational paragraphs worksheets, reading clips",
  "Manipulatives: Graphic organizer worksheets, sentence matching stripes, story detail cards",
  "Collaborative supplies: Chart papers, colored markers, post-it notes, drawing tools",
  "Digital tools: Tablet links, educational games, digital quiz cards",
  "Physical objects: Props, contextual realia, flashcards, visual tokens"
];

const SETUP_OPTIONS = [
  "Circular collaborative clusters of 4 to 5 learners with wide aisles for coaching access.",
  "Traditional row-and-column layout optimized for direct instruction, individual focus, and clear board visibility.",
  "U-Shape/Horseshoe desks arrangement for wide group dialogue, peer presentation, and active teacher-student exchanges.",
  "Bento/Station physical pods designed for rotational learning stations, individual worksheets, and practical hands-on models.",
  "Flexible theater spacing with central clear interactive circle carpet for speech/role-play."
];

const ASSESSMENT_OPTIONS = [
  "Acquisition Step: Individual graphic organizer worksheets and concept-matching exit ticket check-ins.",
  "Integration Phase: Group-based theme matching game scores and oral explanations.",
  "Collaborative Performance: Peer-reviewed team concept maps and constructive rubric rubdowns.",
  "Independent Mastery: End-of-session individual paragraph writing and question-based quizzes.",
  "Daily Scaffolding Focus: Real-time observation, quick hand signals feedback, and verbal answers.",
  "Extended Remediation: Structured short readings with colored highlight guides for struggling readers."
];

const PRE_LESSON_OPTIONS = [
  "1. Interactive Hook: Relate current topic to real-world experience & elicit immediate responses",
  "2. Silent Reading & Quick Jot: Read a 3-sentence prompt and record individual reflections",
  "3. Interactive Quiz Game: A 3-question peer team contest to review prior lesson vocabulary",
  "4. Concept Association Round: Call out a target word and pass the token to map related ideas",
  "5. Multimedia Prompt: Watch a 1-minute scenario clip and answer a guiding focus prompt",
  "6. Diagnostic KWL: Write what is known (K) and wanted (W) on the lesson outline board"
];

const LESSON_FLOW_OPTIONS = [
  "1. Scaffolded Direct Instruction: Explicit modeling of the concept with 3 complete examples",
  "2. Interactive Teacher-led Modeling: Guided performance checks with real-time feedback loops",
  "3. Peer Collaboration: Team analysis tasks using graphic organizer templates",
  "4. Group Problem Solving: Decentering roles to explore diverse answers to a focal inquiry",
  "5. Team Synthesis Challenge: Draft summary statements and present to the whole classroom",
  "6. Structured Independent Application: Learners work alone through worksheets of increasing complexity",
  "7. Real-world Reflection: Relate the concept to community circumstances or personal routines"
];

const REFERENCES_OPTIONS = [
  "1. DepEd Grade 4 English Teacher's Guide (Quarter 1, Curriculum Mapping Reference s. 2026)",
  "2. National Reading Program (NRP) Activity Workbook Packets & Focus Paragraphs",
  "3. Standard DepEd MATATAG Exemplar Guides and Lesson Log Materials (Quarter 1)",
  "4. K to 12 Basic Education Curriculum Reference Manuals & Learning Resource Portals",
  "5. Supplemental English Reading Texts: Aesop's Fables & Philippine Folklore Compilations",
  "6. Selected Online Literacy Exercises, Interactive Grammatical Quizzes, and Paragraph Samples"
];

const INTEGRATION_OPTIONS = [
  "1. Edukasyon sa Pagpapakatao (EsP) - Reflecting on Filipino cultural values like hospitality, humility, and family cooperation",
  "2. Literacy Across Curriculums - Strengthening technical vocabulary through reading logs and analytical sentence framing",
  "3. Science Connector - Encouraging systematic observation, evidence mapping, and hypothesis formulation",
  "4. Social Studies Mapping - Relating topics to Philippine local heritage, geographic features, and community contexts",
  "5. Collaborative Leadership - Cultivating peer turn-taking, active listening, and constructive group feedback"
];

const EXTENDED_OPTIONS = [
  "1. Home Reading Challenge: Find a short article in a news clipping, read with parents, and highlight key sentences",
  "2. Local Community Journal Tracker: Record 3 instances of the concept observed in daily neighborhood routines",
  "3. Creative Integration: Draw a simple comic strip illustrating the target lesson moral",
  "4. Study Synthesis Card: Draft a 2-sentence summary postcard explaining the core skill to a classmate",
  "5. Vocabulary Index: Copy 3 unfamiliar words from the lesson and write dictionary definitions in notebooks"
];

// Parser Helpers for Live Matrix Streaming Preview
function parseInlineMarkdown(text: any): string {
  if (text === null || text === undefined) return "";
  
  let str = "";
  if (Array.isArray(text)) {
    str = text.map(item => {
      const parsedItem = parseInlineMarkdown(item);
      return parsedItem.trim().startsWith("•") || parsedItem.trim().startsWith("-") || parsedItem.trim().startsWith("*")
        ? parsedItem 
        : `• ${parsedItem}`;
    }).join("\n");
  } else if (typeof text === "object") {
    try {
      str = JSON.stringify(text);
    } catch {
      str = String(text);
    }
  } else {
    str = String(text);
  }

  if (!str) return "";
  let parsed = str;
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  parsed = parsed.replace(/\*(.*?)\*/g, "<em>$1</em>");
  parsed = parsed.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' style='color:#b91c1c; text-decoration:underline;'>$1</a>");
  parsed = parsed.replace(/\n/g, "<br/>");
  return parsed;
}

function renderHtmlTableFromPayload(rows: string[][]): string {
  if (rows.length === 0) return "";
  let headerHtml = "<tr style='background-color: #2c3e50; color: white;'>";
  rows[0].forEach(h => {
    headerHtml += `<th style='border: 1px solid #bdc3c7; padding: 10px; font-weight: 800; text-align: left; font-size: 12px; color: white;'>${parseInlineMarkdown(h)}</th>`;
  });
  headerHtml += "</tr>";

  let bodyHtml = "";
  for (let i = 1; i < rows.length; i++) {
    const isEven = i % 2 === 0;
    const bg = isEven ? "#f2f2f2" : "#ffffff";
    bodyHtml += `<tr style='background-color: ${bg};'>`;
    rows[i].forEach(cell => {
      bodyHtml += `<td style='border: 1px solid #bdc3c7; padding: 8px; vertical-align: top; font-size: 11.5px; color: #1e293b; line-height: 1.4;'>${parseInlineMarkdown(cell)}</td>`;
    });
    bodyHtml += "</tr>";
  }

  return `
    <div style="overflow-x: auto; margin: 15px 0;">
      <style>
        table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 12px; }
        th { background-color: #2c3e50; color: white !important; padding: 10px; font-weight: 800; }
        td { border: 1px solid #bdc3c7; padding: 8px; vertical-align: top; }
        tr:nth-child(even) { background-color: #f2f2f2; }
      </style>
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-family: system-ui, sans-serif;">
        <thead>${headerHtml}</thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  let html = "";
  let inTable = false;
  let inList = false;
  const tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|")) {
      if (inList) { html += "</ul>"; inList = false; }
      if (line.includes("---")) continue;
      const cols = line.split("|").map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (!inTable) inTable = true;
      tableRows.push(cols);
      continue;
    } else {
      if (inTable) {
        html += renderHtmlTableFromPayload(tableRows);
        tableRows.length = 0;
        inTable = false;
      }
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html += "<ul style='padding-left: 20px; list-style-type: disc; margin: 8px 0;'>";
        inList = true;
      }
      html += `<li style='margin-bottom:4px;'>${parseInlineMarkdown(line.substring(2))}</li>`;
      continue;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
    }

    if (line === "") {
      html += "<br />";
      continue;
    }

    if (line.startsWith("### ")) {
      html += `<h3 style="font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 15px; margin-bottom: 6px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px;">${parseInlineMarkdown(line.substring(4))}</h3>`;
    } else if (line.startsWith("## ")) {
      html += `<h2 style="font-size: 16.5px; font-weight: 900; color: #991b1b; margin-top: 20px; margin-bottom: 8px; border-bottom: 2px solid #991b1b; padding-bottom: 4px;">${parseInlineMarkdown(line.substring(3))}</h2>`;
    } else if (line.startsWith("# ")) {
      html += `<h1 style="font-size: 19px; font-weight: 950; color: #991b1b; margin-top: 24px; margin-bottom: 10px;">${parseInlineMarkdown(line.substring(2))}</h1>`;
    } else {
      html += `<p style="margin: 6px 0; font-size: 12px; line-height: 1.5; color: #334155;">${parseInlineMarkdown(line)}</p>`;
    }
  }

  if (inTable) html += renderHtmlTableFromPayload(tableRows);
  if (inList) html += "</ul>";
  return html;
}

interface MultiSelectFieldProps {
  label: string;
  value: string;
  onChange: (newVal: string) => void;
  options: string[];
  placeholder: string;
}

function MultiSelectField({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder 
}: MultiSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse the current value string separated by \n\n or \n
  const selectedItems = useMemo(() => {
    if (!value) return [];
    return value.split(/\r?\n\r?\n|\r?\n/).map(v => v.trim()).filter(Boolean);
  }, [value]);

  const toggleOption = (option: string) => {
    let nextItems: string[];
    if (selectedItems.includes(option)) {
      nextItems = selectedItems.filter(item => item !== option);
    } else {
      nextItems = [...selectedItems, option];
    }
    onChange(nextItems.join("\n\n"));
  };

  const removeOption = (optionToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering the dropdown toggle
    const nextItems = selectedItems.filter(option => option !== optionToRemove);
    onChange(nextItems.join("\n\n"));
  };

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const canAddCustom = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return false;
    const matchesPredefined = options.some(opt => opt.toLowerCase() === trimmed.toLowerCase());
    const matchesSelected = selectedItems.some(item => item.toLowerCase() === trimmed.toLowerCase());
    return !matchesPredefined && !matchesSelected;
  }, [searchTerm, options, selectedItems]);

  const handleAddCustom = () => {
    const trimmed = searchTerm.trim();
    if (trimmed) {
      const nextItems = [...selectedItems, trimmed];
      onChange(nextItems.join("\n\n"));
      setSearchTerm("");
    }
  };

  return (
    <div 
      className="space-y-1.5 relative w-full" 
      ref={dropdownRef}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-label={label}
    >
      <div className="flex justify-between items-center">
        <label className="text-xs font-black text-slate-800 uppercase tracking-wide">{label}</label>
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[11px] bg-white hover:bg-slate-50 border-2 border-slate-900 font-extrabold text-slate-900 px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none cursor-pointer"
        >
          <span>✨ View Options</span>
          <span className="text-[9px] font-black bg-pink-100 text-pink-700 px-1.5 py-0.2 rounded-full border border-pink-200">Dropdown</span>
        </button>
      </div>

      {/* Selected Items Container Box (replaces standard textareas) */}
      <div 
        onClick={() => setIsOpen(true)}
        className="w-full min-h-[96px] text-xs p-3 border-4 border-slate-900 rounded-2xl bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:border-pink-500 transition-all flex flex-wrap gap-2 items-start content-start cursor-pointer focus-within:border-pink-500"
      >
        {selectedItems.length > 0 ? (
          selectedItems.map((item, idx) => (
            <div 
              key={idx}
              className="bg-pink-100/90 hover:bg-pink-100 text-pink-950 border-2 border-slate-900 px-2.5 py-1 rounded-xl text-xs font-extrabold font-sans flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] transition-all animate-fade-in"
              onClick={(e) => e.stopPropagation()} // stop click inside chip from opening/closing dropdown
            >
              <span className="leading-relaxed select-none break-all">{item}</span>
              <button
                type="button"
                onClick={(e) => removeOption(item, e)}
                className="text-pink-700 hover:text-white hover:bg-pink-800 font-bold ml-1 text-[10px] w-4.5 h-4.5 bg-white rounded-full flex items-center justify-center border border-pink-300 transition-all shrink-0 cursor-pointer"
                title={`Remove ${item}`}
              >
                ✕
              </button>
            </div>
          ))
        ) : (
          <span className="text-slate-400 text-xs italic self-center p-1 font-semibold">{placeholder}</span>
        )}
      </div>

      {/* Searchable Options Dropdown Menu */}
      {isOpen && (
        <div 
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 bg-white border-4 border-slate-900 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] max-h-[320px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search bar header */}
          <div className="p-3 border-b-4 border-slate-900 bg-pink-50/50 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black text-pink-950 uppercase tracking-widest">
              <span>🔍 Search / Filter List</span>
              <span className="text-[9px] bg-pink-200 text-pink-800 px-2.5 py-0.5 rounded-full border border-pink-300 font-black">
                {selectedItems.length} SELECTED
              </span>
            </div>
            <div className="relative">
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canAddCustom) {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
                className="w-full text-xs p-2.5 pl-3 border-2 border-slate-900 rounded-xl focus:outline-none focus:border-pink-500 font-black bg-white placeholder-slate-400"
                placeholder="Search preset or type custom..."
                onClick={(e) => e.stopPropagation()} // keep open when typing
              />
              {searchTerm && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm("");
                  }}
                  className="absolute right-3 px-1.5 top-1/2 -translate-y-1/2 text-slate-550 hover:text-slate-900 text-xs font-black cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scollable list of items */}
          <div className="overflow-y-auto p-2.5 space-y-1.5 max-h-[190px] bg-white">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => {
                const isSel = selectedItems.includes(opt);
                return (
                  <button
                    key={i}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={(e) => {
                      e.stopPropagation(); // keep menu open for bulk selection
                      toggleOption(opt);
                    }}
                    className={`w-full text-left font-bold text-xs p-2.5 rounded-xl flex items-start gap-2.5 border-2 transition-all cursor-pointer ${
                      isSel 
                        ? "bg-pink-100/90 border-slate-900 text-pink-950 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]" 
                        : "bg-slate-50/50 hover:bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border-2 text-[9px] mt-0.5 transition-all ${
                      isSel 
                        ? "bg-pink-700 border-slate-900 text-white font-black" 
                        : "bg-white border-slate-400 text-transparent"
                    }`}>
                      ✓
                    </span>
                    <span className="leading-relaxed select-none">{opt}</span>
                  </button>
                );
              })
            ) : (
              <div className="text-[10px] text-slate-500 text-center py-4 font-bold italic uppercase tracking-wider">
                No matching predefined options.
              </div>
            )}

            {canAddCustom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddCustom();
                }}
                className="w-full text-left text-xs p-3 rounded-xl border-2 border-dashed border-pink-400 bg-pink-50/30 text-pink-950 font-extrabold hover:bg-pink-50 transition-all cursor-pointer flex items-center gap-2"
              >
                <span className="text-sm">➕</span>
                <span>Add custom: <strong className="text-pink-800">"{searchTerm}"</strong></span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "ilaw" | "unpacker" | "converter" | "generator" | "bubblesheet" | "citation" | "saved" | "profile" | "support" | "about" | "feedback">("home");
  
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem("reelinone_header_expanded");
    return saved === null ? true : saved === "true";
  });

  const toggleHeaderExpanded = () => {
    setIsHeaderExpanded(prev => {
      const next = !prev;
      localStorage.setItem("reelinone_header_expanded", String(next));
      return next;
    });
  };
  
  // Custom uploaded official school logo state
  const [schoolLogo, setSchoolLogo] = useState<string>(() => {
    return localStorage.getItem("reelinone_school_logo") || "";
  });
  
  // Autosave status states
  const [autosaveRestoredMessage, setAutosaveRestoredMessage] = useState("");
  const [lastAutosaveTime, setLastAutosaveTime] = useState<string>("");

  // Objectives Unpacker & AI Generator states
  const [unpackerInput, setUnpackerInput] = useState("");
  const [unpackerSubject, setUnpackerSubject] = useState("English");
  const [unpackerGrade, setUnpackerGrade] = useState("Grade 4");
  const [isUnpacking, setIsUnpacking] = useState(false);
  const [isGeneratingObjectives, setIsGeneratingObjectives] = useState(false);
  const [unpackedResults, setUnpackedResults] = useState<Array<{
    original: string;
    knowledge: string[];
    skills: string[];
    simplifiedText: string;
    milestones: string[];
    suggestedActivity: string;
    assessmentIdea: string;
  }>>([]);
  const [unpackerError, setUnpackerError] = useState("");

  // Lesson Plan Form State
  const [formData, setFormData] = useState<ILAWFormData>({
    teacherName: "Teacher Maria Santos",
    schoolName: "Rizal Elementary School",
    gradeLevel: "Grade 4",
    subject: "English",
    quarter: "Term 1",
    week: "Week 3",
    lessonDate: new Date().toISOString().split('T')[0],
    duration: "50 minutes",
    sessions: "4",
    topic: "Identifying the Main Idea and Supporting Details",
    competency: "Identify the main idea, key sentences, and supporting details in a given paragraph or text (EN4RC-Ia-2.2).",
    contentStandards: "The learner demonstrates understanding of text elements, literary genres, and reading comprehension strategies to construct meaning of informational texts.",
    performanceStandards: "The learner independently reads and critiques various text types to extract main ideas, interpret key arguments, and organize supporting details.",
    objectives: "1. Define what a main idea and supporting details are.\n2. Locate key sentences inside short informational paragraphs.\n3. Write supporting details for a chosen main sentence.\n4. Design group concept maps demonstrating visual logic hierarchies.",
    materials: "PowerPoint slide deck, short story printouts, main idea graphic organizer worksheets, chart papers, and color markers.",
    references: "DepEd Grade 4 English Teacher Guide pages 12-18; Most Essential Learning Competencies (MELCs) page 144.",
    background: "The learners are generally active and have a basic understanding of sentence structure, but require visual prompts and guided practice to successfully separate the overarching theme from secondary supporting facts.",
    setup: "Arrange student seats in small circular collaborative clusters of 4 to 5 learners. Maintain a clear central pathway to facilitate teacher coaching access to all tables.",
    integration: "Values Education (Cooperation during group tasks), Science (Texts relate to eco-conservation themes), and ICT (Optional slide presentation display).",
    assessmentPlan: "Session 1 Check: Graphic organizer worksheets\nSession 2 Check: Group theme matching game scores\nSession 3 Check: Peer assessment of concept maps\nSession 4 Check: Individual exit ticket evaluation.",
    extendedLearning: "Homework activity: Select an editorial column from a local newspaper, paste it into the notebook, and highlight the main sentence in pink and supporting items in yellow.",
    reflectionQuestions: "How many learners mastered the objective on day one? What scaffolding models helped struggling readers? How did the collaborative grouping impact student engagement?",
    preLesson: "1. Reactivate previous readiness concepts using picture cues or brief review discussions related to main ideas.\n2. Connect to prior knowledge and recall yesterday's core takeaways about paragraph structures.\n3. Run a quick classroom brainstorm mapping words into central versus peripheral themes.\n4. Conduct a silent self-led reading warm-up focusing on topic sentence detection.",
    lessonFlow: "1. Guide the class to define what a main idea and supporting details are using a slide presentation model.\n2. Distribute worksheets and guide students to locate key sentences inside short paragraphs.\n3. Divide students into groups to write supporting details for a chosen central sentence on chart papers.\n4. Facilitate group presentations of concept maps and summarize individual exit ticket evaluations.",
    preparedBy: "Maria Santos",
    preparedPosition: "Teacher I",
    checkedBy: "Clara Santos",
    checkedPosition: "Master Teacher II",
    approvedBy: "Alejandro G. Cruz",
    approvedPosition: "School Principal I"
  });

  // Saved Lesson Plans & Assistant State
  const [savedLessons, setSavedLessons] = useState<SavedLessonPlan[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [savedPreviewContent, setSavedPreviewContent] = useState<string>("");
  
  // AI assistant state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Core generator output
  const [generatedHtml, setGeneratedHtml] = useState<string>("");
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [isAIFieldLoading, setIsAIFieldLoading] = useState(false);
  const [generatorStatus, setGeneratorStatus] = useState("");

  // Converter Tab State
  const [converterSubTab, setConverterSubTab] = useState<"matatag" | "architect">("matatag");
  const [sourceFormat, setSourceFormat] = useState("Lesson Exemplar");
  const [targetFormat, setTargetFormat] = useState("ILAW Format");
  const [converterSourceText, setConverterSourceText] = useState("");
  const [converterInstructions, setConverterInstructions] = useState("");
  const [convertedResult, setConvertedResult] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [converterStatus, setConverterStatus] = useState("");

  // Objective Matrix Table Map States
  const [matrixTableHtml, setMatrixTableHtml] = useState("");
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  const [matrixOption, setMatrixOption] = useState<"objective" | "4-session">("4-session");

  // Reusable custom overlay modals for alert and confirm blocks
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    errCode?: "403" | "503" | "other";
  } | null>(null);

  const triggerAlert = (title: string, message: string, errCode?: "403" | "503" | "other") => {
    let finalCode = errCode;
    if (!finalCode) {
      const lowerText = (title + " " + message).toLowerCase();
      if (lowerText.includes("503") || lowerText.includes("unavailable") || lowerText.includes("demand") || lowerText.includes("overloaded") || lowerText.includes("busy")) {
        finalCode = "503";
      } else if (lowerText.includes("403") || lowerText.includes("permission") || lowerText.includes("restricted") || lowerText.includes("forbidden")) {
        finalCode = "403";
      }
    }
    setAlertModal({ title, message, errCode: finalCode });
  };

  const getAIEngineErrorFeedback = (err: any): string => {
    const msg = String(err.message || err);
    const lowercaseMsg = msg.toLowerCase();
    
    if (lowercaseMsg.includes("503") || lowercaseMsg.includes("unavailable") || lowercaseMsg.includes("limit") || lowercaseMsg.includes("demand") || lowercaseMsg.includes("overloaded")) {
      return "⚠️ [503 Service Unavailable] The Gemini API is currently experiencing an exceptionally high volume of traffic.\n\nOur backend engine executed exponential backoff retries, but the Google AI servers are temporarily heavily loaded.";
    }
    
    if (lowercaseMsg.includes("403") || lowercaseMsg.includes("permission") || lowercaseMsg.includes("caller does not have permission") || lowercaseMsg.includes("forbidden") || lowercaseMsg.includes("restricted")) {
      return "🔒 [403 Permission Denied] Gemini Call Permission or API Access restrictions have been encountered.\n\nThis typically occurs when your API Key is restricted, lacks multi-modal compatibility, or prohibits operations.";
    }
    
    return msg;
  };

  // Undo / Redo History for ILAW Planner Form
  const [formDataHistory, setFormDataHistory] = useState<ILAWFormData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isHistoryTransitioning = useRef<boolean>(false);
  const prevFormDataRef = useRef<ILAWFormData | null>(null);

  // Initialize history on mount / first load
  useEffect(() => {
    if (formData && formDataHistory.length === 0) {
      setFormDataHistory([formData]);
      setHistoryIndex(0);
      prevFormDataRef.current = formData;
    }
  }, [formData]);

  // Track state changes with debounce for typing
  useEffect(() => {
    if (formDataHistory.length === 0) return;

    if (isHistoryTransitioning.current) {
      isHistoryTransitioning.current = false;
      prevFormDataRef.current = formData;
      return;
    }

    // Check if the current formData state is structurally different from what's at the current historyIndex
    const currentRecorded = formDataHistory[historyIndex];
    if (currentRecorded && JSON.stringify(currentRecorded) === JSON.stringify(formData)) {
      return;
    }

    const handler = setTimeout(() => {
      setFormDataHistory(prev => {
        // truncate any "redo" states if we edited while checked out in history
        const nextHistory = prev.slice(0, historyIndex + 1);
        if (nextHistory.length >= 100) {
          nextHistory.shift();
        }
        const updatedHistory = [...nextHistory, formData];
        setHistoryIndex(updatedHistory.length - 1);
        return updatedHistory;
      });
      prevFormDataRef.current = formData;
    }, 600); // 600ms debounce to bundle typing strokes

    return () => clearTimeout(handler);
  }, [formData, historyIndex, formDataHistory]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      isHistoryTransitioning.current = true;
      setHistoryIndex(targetIndex);
      setFormData(formDataHistory[targetIndex]);
      prevFormDataRef.current = formDataHistory[targetIndex];
    }
  };

  const handleRedo = () => {
    if (historyIndex < formDataHistory.length - 1) {
      const targetIndex = historyIndex + 1;
      isHistoryTransitioning.current = true;
      setHistoryIndex(targetIndex);
      setFormData(formDataHistory[targetIndex]);
      prevFormDataRef.current = formDataHistory[targetIndex];
    }
  };

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "ilaw") return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
      const isRedo = ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'y') || 
                     ((isMac ? e.metaKey : e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z');
      
      if (isUndo) {
        e.preventDefault();
        handleUndo();
      } else if (isRedo) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, historyIndex, formDataHistory]);

  // Real-time grammar correction auto-fix state updater
  const handleFixIssue = (key: keyof ILAWFormData, original: string, correction: string) => {
    setFormData(prev => {
      const currentVal = prev[key];
      const regex = new RegExp(`\\b${original}\\b`, 'g');
      let nextVal = currentVal.replace(regex, correction);
      if (nextVal === currentVal) {
        nextVal = currentVal.replace(original, correction);
      }
      return { ...prev, [key]: nextVal };
    });
  };

  const handleManualSave = () => {
    localStorage.setItem("reelsystem_autosave_form", JSON.stringify(formData));
    const nowStr = new Date().toLocaleTimeString();
    localStorage.setItem("reelsystem_autosave_time", nowStr);
    setLastAutosaveTime(nowStr);
    triggerAlert("Draft Saved!", `Your physical ILAW Planner draft has been backed up directly into your browser's local memory at ${nowStr}.`);
  };

  const handlePurgeCache = () => {
    setConfirmAction({
      message: "Are you sure you want to completely purge your current layout draft, default school headers, and cached lesson files from local storage? This action cannot be undone.",
      onConfirm: () => {
        localStorage.removeItem("reelsystem_autosave_form");
        localStorage.removeItem("reelsystem_autosave_time");
        localStorage.removeItem("reelsystem_saved_school_headers");
        setLastAutosaveTime("");
        setAutosaveRestoredMessage("");
        setFormData(prev => ({
          ...prev,
          topic: "",
          competency: "",
          contentStandards: "",
          performanceStandards: "",
          objectives: "",
          materials: "",
          references: "",
          background: "",
          setup: "",
          integration: "",
          assessmentPlan: "",
          extendedLearning: "",
          reflectionQuestions: "",
          preLesson: "",
          lessonFlow: "",
        }));
        triggerAlert("Cache Purged", "All structural autosave templates and local file cache have been successfully cleared.");
      }
    });
  };


  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // School Headers Control & Upload UI State
  const [headersLocked, setHeadersLocked] = useState<boolean>(() => {
    const savedLocked = localStorage.getItem("reelsystem_headers_locked");
    return savedLocked === "true";
  });
  const [dragActive, setDragActive] = useState(false);
  const [aiStylingPreset, setAiStylingPreset] = useState("Standard / None");

  // Initialize
  useEffect(() => {
    // Check for autosaved form state first
    const autosaved = localStorage.getItem("reelsystem_autosave_form");
    if (autosaved) {
      try {
        const parsed = JSON.parse(autosaved);
        setFormData(prev => ({ ...prev, ...parsed }));
        const storedTime = localStorage.getItem("reelsystem_autosave_time") || "";
        setAutosaveRestoredMessage(`🔄 Restored autosaved draft of your lesson plan${storedTime ? ` from ${storedTime}` : ""}!`);
        if (storedTime) {
          setLastAutosaveTime(storedTime);
        }
        setTimeout(() => setAutosaveRestoredMessage(""), 10000);
      } catch (e) {
        console.error("Failed loading autosaved form:", e);
      }
    }

    // Load saved school headers if present
    const storedHeaders = localStorage.getItem("reelsystem_saved_school_headers");
    if (storedHeaders) {
      try {
        const parsed = JSON.parse(storedHeaders);
        setFormData(prev => ({
          ...prev,
          teacherName: parsed.teacherName ?? prev.teacherName,
          schoolName: parsed.schoolName ?? prev.schoolName,
          gradeLevel: parsed.gradeLevel ?? prev.gradeLevel,
          subject: parsed.subject ?? prev.subject,
          preparedBy: parsed.preparedBy ?? prev.preparedBy,
          preparedPosition: parsed.preparedPosition ?? prev.preparedPosition,
          checkedBy: parsed.checkedBy ?? prev.checkedBy,
          checkedPosition: parsed.checkedPosition ?? prev.checkedPosition,
          approvedBy: parsed.approvedBy ?? prev.approvedBy,
          approvedPosition: parsed.approvedPosition ?? prev.approvedPosition,
        }));
      } catch (e) {
        console.error("Failed loading saved school headers:", e);
      }
    }

    // Load saved lesson plans
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setSavedLessons(JSON.parse(saved));
      } catch (e) {
        setSavedLessons([]);
      }
    }

    // Load Chat history
    const preseedChat: ChatMessage[] = [
      {
        id: "welcome",
        role: "model",
        content: "Mabuhay! Welcome to **REEL IN ONE AI Assistant** powered by **REELSYSTEM**.\n\nI am equipped with live **Google Search Grounding** to search the web for actual MATATAG curriculum resources, Department of Education memos, lesson formats, activities, worksheets, and syllabus guides. Tell me what you need, and I will gather online sources to support you!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    const savedChat = localStorage.getItem(CHAT_HISTORY_KEY);
    if (savedChat) {
      try {
        setChatMessages(JSON.parse(savedChat));
      } catch (e) {
        setChatMessages(preseedChat);
      }
    } else {
      setChatMessages(preseedChat);
    }
  }, []);

  // Autosave interval that fires every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem("reelsystem_autosave_form", JSON.stringify(formData));
      const nowStr = new Date().toLocaleTimeString();
      localStorage.setItem("reelsystem_autosave_time", nowStr);
      setLastAutosaveTime(nowStr);
      console.log("[Autosave] Form state backed up to localStorage.");
    }, 30000);
    return () => clearInterval(interval);
  }, [formData]);

  // Save Chat History
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Trigger default initial generation
  useEffect(() => {
    doGenerateLocalHtml();
  }, [formData]);

  const handleLogoUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerAlert("Invalid File", "Please select a valid image file (.png, .jpg, .jpeg, etc.) as your school logo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 150;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/png");
          setSchoolLogo(compressedBase64);
          localStorage.setItem("reelinone_school_logo", compressedBase64);
          triggerAlert("Logo Synced", "✨ Custom school logo uploaded and synchronized! It is now loaded globally in both your ILAW Planner and LP Converter print templates.");
          setTimeout(() => {
            doGenerateLocalHtml();
          }, 100);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      triggerAlert("Upload Failure", "Could not read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSchoolLogo("");
    localStorage.removeItem("reelinone_school_logo");
    triggerAlert("Logo Removed", "Custom school logo has been deleted. Standard layout restored.");
    setTimeout(() => {
      doGenerateLocalHtml();
    }, 100);
  };

  const updateFormData = (key: keyof ILAWFormData, val: string) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  // School & Class Headers Actions
  const handleSaveHeaders = () => {
    const headers = {
      teacherName: formData.teacherName,
      schoolName: formData.schoolName,
      gradeLevel: formData.gradeLevel,
      subject: formData.subject,
      preparedBy: formData.preparedBy,
      preparedPosition: formData.preparedPosition,
      checkedBy: formData.checkedBy,
      checkedPosition: formData.checkedPosition,
      approvedBy: formData.approvedBy,
      approvedPosition: formData.approvedPosition,
    };
    localStorage.setItem("reelsystem_saved_school_headers", JSON.stringify(headers));
    triggerAlert("Profile Saved", "✨ Profile & School Metadata saved permanently to browser memory! This configuration will now automatically apply to your ILAW plans and all LP Converter exports.");
    doGenerateLocalHtml();
  };

  const handleClearHeaders = () => {
    setConfirmAction({
      message: "Are you sure you want to clear and reset your Teacher Profile and metadata?",
      onConfirm: () => {
        setHeadersLocked(false);
        localStorage.setItem("reelsystem_headers_locked", "false");
        setFormData(prev => ({
          ...prev,
          teacherName: "",
          schoolName: "",
          gradeLevel: "",
          subject: "",
          preparedBy: "",
          preparedPosition: "",
          checkedBy: "",
          checkedPosition: "",
          approvedBy: "",
          approvedPosition: "",
        }));
        localStorage.removeItem("reelsystem_saved_school_headers");
        triggerAlert("Profile Reset", "Profile configurations and school headers removed from browser memory.");
        doGenerateLocalHtml();
      }
    });
  };

  const handleLockHeaders = () => {
    setHeadersLocked(true);
    localStorage.setItem("reelsystem_headers_locked", "true");
    triggerAlert("Headers Locked", "School & Class headers are now locked to prevent edits.");
  };

  const handleUnlockHeaders = () => {
    setHeadersLocked(false);
    localStorage.setItem("reelsystem_headers_locked", "false");
    triggerAlert("Headers Unlocked", "School & Class headers unlocked for editing.");
  };

  // LP Converter File Upload and Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readFileContent(file);
    }
  };

  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFileContent(file);
    }
  };

  const readFileContent = (file: File) => {
    const nameLower = file.name.toLowerCase();
    
    // Check if it's a simple client-side plain-text document
    const isPlainText = 
      nameLower.endsWith(".txt") || 
      nameLower.endsWith(".md") || 
      nameLower.endsWith(".json") || 
      nameLower.endsWith(".html") || 
      file.type.startsWith("text/");

    if (isPlainText) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === "string") {
          setConverterSourceText(result);
          triggerAlert("Import Succeeded", `Successfully imported text document "${file.name}"!`);
        }
      };
      reader.onerror = () => {
        triggerAlert("Import Failed", "Failed to read file.");
      };
      reader.readAsText(file);
    } else {
      // Must be DOCX, PDF, or Images JPEG/PNG. Send to server for extraction!
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) {
          triggerAlert("Loading Error", "Could not load file data.");
          return;
        }

        const base64Data = dataUrl.split(",")[1];
        if (!base64Data) {
          triggerAlert("Loading Error", "Could not retrieve file content as Base64.");
          return;
        }

        // Determine mime-type
        let mimeType = file.type;
        if (!mimeType) {
          const ext = nameLower.split(".").pop();
          if (ext === "pdf") mimeType = "application/pdf";
          else if (ext === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          else if (ext === "png") mimeType = "image/png";
          else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
          else if (ext === "webp") mimeType = "image/webp";
        }

        try {
          setIsConverting(true);
          showStatusMsg(`AI is parsing and extracting lesson content from "${file.name}"...`, "converter");
          
          const res = await fetch("/api/lesson/parse-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileBase64: base64Data,
              fileName: file.name,
              mimeType: mimeType
            })
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({ error: "Unknown server parse error." }));
            throw new Error(errBody.error || "Failed to parse file content.");
          }

          const responseData = await res.json();
          if (responseData.text) {
            setConverterSourceText(responseData.text);
            showStatusMsg(`Successfully parsed and extracted lesson content from "${file.name}"!`, "converter");
            triggerAlert("Extraction Success", `🎉 AI has successfully extracted the text content from "${file.name}"!\n\nYou can now see it in the original text block below. Feel free to inspect, edit, or customize it before clicking convert!`);
          } else {
            throw new Error("No usable text content was extracted from the document.");
          }

        } catch (err: any) {
          console.error("Document parser trigger error:", err);
          showStatusMsg(`Failed to extract text from "${file.name}": ${err.message}`, "converter");
          triggerAlert("Extraction Error", `Could not extract lesson info from "${file.name}":\n${err.message}\n\nPlease try another file or paste the text content directly.`);
        } finally {
          setIsConverting(false);
        }
      };

      reader.onerror = () => {
        triggerAlert("File Load Error", "Failed to read file.");
      };

      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearForm = () => {
    setConfirmAction({
      message: "Are you sure you want to clear the entire form data? All current draft entries and selections will be wiped clean.",
      onConfirm: () => {
        setHeadersLocked(false);
        localStorage.setItem("reelsystem_headers_locked", "false");
        setFormData({
          teacherName: "",
          schoolName: "",
          gradeLevel: "",
          subject: "",
          quarter: "Term 1",
          week: "Week 1",
          lessonDate: "",
          duration: "50 minutes",
          sessions: "4",
          topic: "",
          competency: "",
          contentStandards: "",
          performanceStandards: "",
          objectives: "",
          materials: "",
          references: "",
          background: "",
          setup: "",
          integration: "",
          assessmentPlan: "",
          extendedLearning: "",
          reflectionQuestions: "",
          preLesson: "",
          lessonFlow: "",
          preparedBy: "",
          preparedPosition: "",
          checkedBy: "",
          checkedPosition: "",
          approvedBy: "",
          approvedPosition: ""
        });
        setGeneratedHtml("");
        setPreviewKey(prev => prev + 1);
        localStorage.removeItem("reelsystem_saved_school_headers");
        localStorage.removeItem("reelsystem_autosave_form");
        localStorage.removeItem("reelsystem_autosave_time");
        setLastAutosaveTime("");
        showStatusMsg("Form fields cleared successfully.", "generator");
      }
    });
  };

  const showStatusMsg = (msg: string, scope: "generator" | "converter") => {
    if (scope === "generator") {
      setGeneratorStatus(msg);
      setTimeout(() => setGeneratorStatus(""), 4000);
    } else {
      setConverterStatus(msg);
      setTimeout(() => setConverterStatus(""), 4000);
    }
  };

  // Helper lists & parsing matching original JS
  const getListFromText = (txt: string) => {
    const raw = String(txt || "").trim();
    if (!raw) return [];
    // Split by newlines, semicolons, or sentence-ending periods followed by space and a capital letter
    return raw
      .split(/\n+|;+|\. (?=[A-Z])/)
      .map(item => item.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter(item => item.length > 2)
      .map(item => item.endsWith(".") ? item : item + ".");
  };

  const getSessionItems = (
    lines: string[], 
    count: number, 
    fallbackFactory: (n: number, obj?: string) => string,
    objectives?: string[][]
  ) => {
    const result: string[][] = [];
    for (let i = 0; i < count; i++) {
      const currentObj = (objectives && objectives[i] && objectives[i][0]) || "";
      if (lines[i]) {
        result.push([lines[i]]);
      } else if (lines.length > count) {
        // Distribute remaining modulo
        result.push(lines.filter((_, index) => index % count === i));
      } else {
        result.push([fallbackFactory(i + 1, currentObj)]);
      }
    }
    return result;
  };

  // Local helper to create structural ILAW HTML (conforming perfectly to printable legacy layout, with rose styles!)
  const doGenerateLocalHtml = (overrideData?: typeof formData) => {
    const d = overrideData || formData;
    const sessionCount = Math.max(1, Math.min(6, Number(d.sessions || 4)));
    
    const objLines = getListFromText(d.objectives);
    const contextLines = getListFromText(d.background);
    const materialLines = getListFromText(d.materials);
    const integrationLines = getListFromText(d.integration);
    const assessmentLines = getListFromText(d.assessmentPlan);
    const extendedLines = getListFromText(d.extendedLearning);
    const reflectionLines = getListFromText(d.reflectionQuestions);
    const preLessonLines = getListFromText(d.preLesson);
    const flowLines = getListFromText(d.lessonFlow);

    const objectivesBySession = getSessionItems(objLines, sessionCount, (n) => `Demonstrate master understanding of ${d.topic || "the topic"} during Session ${n} learning exercises.`);
    
    const contextBySession = getSessionItems(
      contextLines, 
      sessionCount, 
      (n, obj) => obj 
        ? `Learners' readiness is centered on their ability to ${obj.replace(/^\d+[.)\s]*/, "").replace(/\.$/, "").toLowerCase()}. This session benefits from targeted instructional modeling.` 
        : d.background || "Learners are receptive and will benefit from explicit instructional modeling.",
      objectivesBySession
    );

    const preLessonBySession = getSessionItems(
      preLessonLines, 
      sessionCount, 
      (n, obj) => obj 
        ? `Prior knowledge drill: Conduct a 5-minute interactive mockup exercise focusing on sub-concepts needed to successfully ${obj.replace(/^\d+[.)\s]*/, "").replace(/\.$/, "").toLowerCase()}.` 
        : n === 1 ? `Reactivate previous readiness concepts using picture cues related to ${d.topic || "the topic"}.` : `Connect to prior knowledge and recall yesterday's core takeaways.`,
      objectivesBySession
    );

    const flowBySession = getSessionItems(
      flowLines, 
      sessionCount, 
      (n, obj) => obj 
        ? `Step-by-step logic: 1. Teacher maps core terms. 2. Guided group practice to ${obj.replace(/^\d+[.)\s]*/, "").replace(/\.$/, "").toLowerCase()}. 3. Individual coaching & checks.` 
        : `Employ explicit teaching scripts, independent scaffolding checklists, peer exercises, and check-ins to secure the objective for Session ${n}.`,
      objectivesBySession
    );

    const resourcesBySession = getSessionItems(
      materialLines, 
      sessionCount, 
      (n, obj) => obj 
        ? `Curated workbooks, teaching slides, and sample paragraphs custom-designed to help students ${obj.replace(/^\d+[.)\s]*/, "").replace(/\.$/, "").toLowerCase()}.` 
        : d.materials || "Standard textbooks, print materials, writing sheets, board presentation slides.",
      objectivesBySession
    );

    const integrationBySession = getSessionItems(
      integrationLines, 
      sessionCount, 
      (n, obj) => obj 
        ? `Integrate reading comprehension, social-emotional check-ins, and subject-focused connections where students ${obj.replace(/^\d+[.)\s]*/, "").replace(/\.$/, "").toLowerCase()}.` 
        : d.integration || "Integrate reading comprehension, social-emotional checkpoints, and creative thinking.",
      objectivesBySession
    );

    const assessmentBySession = getSessionItems(
      assessmentLines, 
      sessionCount, 
      (n, obj) => obj 
        ? `Diagnostic check: Require each learner to independently complete an assessment task to ${obj.replace(/^\d+[.)\s]*/, "").replace(/\.$/, "").toLowerCase()} with scored rubric items.` 
        : d.assessmentPlan || "Gather descriptive output evidence, oral reviews, or individual worksheets to gauge session success.",
      objectivesBySession
    );

    const extendedBySession = getSessionItems(
      extendedLines, 
      sessionCount, 
      (n, obj) => obj 
        ? `Extension task: Instruct students to practice how to ${obj.replace(/^\d+[.)\s]*/, "").replace(/\.$/, "").toLowerCase()} using everyday home reading materials under parent guidance.` 
        : d.extendedLearning || "Offer enrichment worksheets, parent-guided surveys, or simple reading exercises to cement standard goals.",
      objectivesBySession
    );

    const reflectionBySession = getSessionItems(
      reflectionLines, 
      sessionCount, 
      (n, obj) => obj 
        ? `Reflective focus: Did learners confidently master the target to ${obj.replace(/^\d+[.)\s]*/, "").replace(/\.$/, "").toLowerCase()}? What instructional modifications are recommended?` 
        : "Which learner cohorts required heavy support? What adaptations or materials proved most successful?",
      objectivesBySession
    );

    const renderListHtml = (items: string[]) => {
      const clean = items.filter(Boolean);
      if (!clean.length) return "Not specified";
      return `<ul style="margin: 0; padding-left: 14px; list-style-type: disc;">${clean.map(item => `<li style="margin-bottom: 2px;">${item}</li>`).join("")}</ul>`;
    };

    const makeSessionHeaders = (count: number) => {
      return Array.from({ length: count }, (_, i) => `<th style="background-color: #fee2e2; color: #7f1d1d; font-weight: 800; border: 2px solid #991b1b; padding: 8px; text-align: left;">Session ${i + 1}</th>`).join("");
    };

    const makeSessionRow = (label: string, sessionLists: string[][]) => {
      return `
        <tr>
          <td style="font-weight: 800; background-color: #fef2f2; color: #7f1d1d; border: 2px solid #991b1b; padding: 8px; width: 16%; vertical-align: top;">${label}</td>
          ${sessionLists.map(items => `<td style="border: 2px solid #991b1b; padding: 8px; vertical-align: top;">${renderListHtml(items)}</td>`).join("")}
        </tr>
      `;
    };

    const formatSignature = (label: string, name: string, pos: string) => {
      let finalName = name.trim();
      let finalPos = pos.trim();
      if (!finalPos && finalName.includes(",")) {
        const p = finalName.split(",");
        finalName = p.shift()?.trim() || "";
        finalPos = p.join(",").trim();
      }
      return `
        <div style="border: 2px solid #991b1b; padding: 10px; background-color: #fff; border-radius: 4px;">
          <strong style="color: #7f1d1d; display: block; margin-bottom: 4px;">${label}:</strong>
          <div style="text-align: center; font-weight: 800; margin-top: 15px; color: #1e293b;">${finalName || "Not specified"}</div>
          <div style="border-top: 1.5px solid #991b1b; margin: 4px 10px 2px; height: 1px;"></div>
          <div style="text-align: center; font-size: 11px; color: #475569; font-weight: 600;">${finalPos || "Designated position"}</div>
        </div>
      `;
    };

    const aiDeclaration = "This lesson plan structure was generated and detailed using REEL IN ONE AI ENGINES to assist the educator with DepEd learning alignment and explicit step logic mappings under the REELSYSTEM school companion standard.";

    const sessionText = sessionCount === 1 ? "1 Session" : `${sessionCount} Sessions${sessionCount === 4 ? " (1 Week)" : ""}`;

    const htmlContent = `
      <div class="ilaw-printable-container" style="width: 100%; max-width: 1050px; margin: 0 auto; padding: 15px; background-color: #ffffff; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box;">
        <!-- DepEd Republic Header with Custom Logo Support (Centered with Logos on Top) -->
        <div style="text-align: center; margin-bottom: 15px; font-family: 'Inter', system-ui, sans-serif;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 8px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fb/Seal_of_the_Department_of_Education_of_the_Philippines.svg" alt="DepEd Logo" style="width: 55px; height: 55px; object-fit: contain;" referrerPolicy="no-referrer">
            ${schoolLogo ? `<img src="${schoolLogo}" alt="School Logo" style="width: 55px; height: 55px; object-fit: contain; border-radius: 4px;" id="localSchoolLogoImage">` : ""}
          </div>
          <div style="font-family: Georgia, serif; font-size: 13px; font-weight: 700; color: #000; letter-spacing: 0.2px;">Republic of the Philippines</div>
          <div style="font-family: Georgia, serif; font-size: 22px; font-weight: 900; line-height: 1.1; color: #991b1b; margin-top: 2px;">Department of Education</div>
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; margin-top: 2px;">REELSYSTEM Educational Partner Network</div>
        </div>

        <div style="text-align: center; font-weight: 900; font-size: 13px; color: #991b1b; margin: 12px 0 8px; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 2px double #991b1b; padding-bottom: 6px;">
          REEL IN ONE — ILAW COMPREHENSIVE WEEKLY PLAN
        </div>

        <!-- Info Mapping Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px;">
          <tr>
            <th style="background-color: #fef2f2; color: #7f1d1d; font-weight: 800; border: 2px solid #991b1b; padding: 8px; text-align: left; width: 22%;">Lesson Topic/Title</th>
            <td style="border: 2px solid #991b1b; padding: 8px; font-weight: 700;">${d.topic || "Untitled Lesson"}</td>
          </tr>
          <tr>
            <th style="background-color: #fef2f2; color: #7f1d1d; font-weight: 800; border: 2px solid #991b1b; padding: 8px; text-align: left;">Learning Area / Subject</th>
            <td style="border: 2px solid #991b1b; padding: 8px;">${d.subject || "Not specified"}</td>
          </tr>
          <tr>
            <th style="background-color: #fef2f2; color: #7f1d1d; font-weight: 800; border: 2px solid #991b1b; padding: 8px; text-align: left;">Teacher in Charge</th>
            <td style="border: 2px solid #991b1b; padding: 8px; font-weight: 600;">${d.teacherName || "Not specified"}</td>
          </tr>
          <tr>
            <th style="background-color: #fef2f2; color: #7f1d1d; font-weight: 800; border: 2px solid #991b1b; padding: 8px; text-align: left;">Grade Level & School</th>
            <td style="border: 2px solid #991b1b; padding: 8px;">${d.gradeLevel || "Not specified"} — ${d.schoolName || "Not specified"}</td>
          </tr>
          <tr>
            <th style="background-color: #fef2f2; color: #7f1d1d; font-weight: 800; border: 2px solid #991b1b; padding: 8px; text-align: left;">Syllabus Window</th>
            <td style="border: 2px solid #991b1b; padding: 8px;">${d.quarter || "Term 1"} | ${d.week || "Week 1"} | ${sessionText} (${d.duration || "N/A"})</td>
          </tr>
          <tr>
            <th style="background-color: #fef2f2; color: #7f1d1d; font-weight: 800; border: 2px solid #991b1b; padding: 8px; text-align: left;">Curriculum Materials</th>
            <td style="border: 2px solid #991b1b; padding: 8px;">${d.references || "Not specified"}</td>
          </tr>
          <tr>
            <th style="background-color: #fef2f2; color: #7f1d1d; font-weight: 800; border: 2px solid #991b1b; padding: 8px; text-align: left;">AI Grounding Statement</th>
            <td style="border: 2px solid #991b1b; padding: 8px; font-style: italic; color: #475569;">${aiDeclaration}</td>
          </tr>
        </table>

        <!-- Main ILAW Columns Grid -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px; page-break-inside: auto;">
          <!-- SECTION: INTENTIONS -->
          <tr style="background-color: #991b1b;">
            <td colspan="${sessionCount + 1}" style="color: #ffffff; padding: 10px; font-weight: 800; border: 2px solid #991b1b;">
              <span style="font-size: 13px;">💡 I. INTENTIONS.</span> Meaningful learnings are anchored in how we structure them. We decide what learners must master by the end of the lesson block.
            </td>
          </tr>
          <tr>
            <td style="font-weight: 800; background-color: #fef2f2; color: #7f1d1d; border: 2px solid #991b1b; padding: 8px; width: 16%; vertical-align: top;">DepEd Core Standards</td>
            <td colspan="${sessionCount}" style="border: 2px solid #991b1b; padding: 8px; line-height: 1.45;">
              <strong>Learning Competency:</strong><br>${d.competency || "Not specified"}<br><br>
              <strong>Content Standards:</strong><br>${d.contentStandards || "Not specified"}<br><br>
              <strong>Performance Standards:</strong><br>${d.performanceStandards || "Not specified"}
            </td>
          </tr>
          <tr>
            <th style="background-color: #fef2f2; color: #7f1d1d; border: 2px solid #991b1b; padding: 8px; width: 16%;">Section Logic Mappings</th>
            ${makeSessionHeaders(sessionCount)}
          </tr>
          ${makeSessionRow("Objectives:", objectivesBySession)}
          ${makeSessionRow("Learning Context:", contextBySession)}

          <!-- SECTION: LEARNING EXPERIENCES -->
          <tr style="background-color: #991b1b;">
            <td colspan="${sessionCount + 1}" style="color: #ffffff; padding: 10px; font-weight: 800; border: 2px solid #991b1b;">
              <span style="font-size: 13px;">🌿 II. LEARNING EXPERIENCES.</span> Designing a thoughtful student-centered learning pathway where each step builds master understanding.
            </td>
          </tr>
          ${makeSessionRow("Pre-Lesson (Warmup):", preLessonBySession)}
          ${makeSessionRow("Lesson Flow (Logic):", flowBySession)}
          ${makeSessionRow("Materials Selected:", resourcesBySession)}
          ${makeSessionRow("Syllabus Integrations:", integrationBySession)}

          <!-- SECTION: ASSESSMENT -->
          <tr style="background-color: #991b1b;">
            <td colspan="${sessionCount + 1}" style="color: #ffffff; padding: 10px; font-weight: 800; border: 2px solid #991b1b;">
              <span style="font-size: 13px;">🎯 III. ASSESSMENT.</span> Gathering tangible deliverables which display factual mastery and guide immediate teaching coaching response.
            </td>
          </tr>
          ${makeSessionRow("Formative Evaluations:", assessmentBySession)}

          <!-- SECTION: WAYS FORWARD -->
          <tr style="background-color: #991b1b;">
            <td colspan="${sessionCount + 1}" style="color: #ffffff; padding: 10px; font-weight: 800; border: 2px solid #991b1b;">
              <span style="font-size: 13px;">🚀 IV. WAYS FORWARD.</span> Reflections for continuous alignment. Pause, reflect, and detail opportunities beyond the bell.
            </td>
          </tr>
          ${makeSessionRow("Extended Assignments:", extendedBySession)}
          ${makeSessionRow("Reflection Prompts:", reflectionBySession)}
        </table>

        <!-- Signatures Mappings -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px; font-size: 11.5px;">
          ${formatSignature("Prepared and Written By", d.preparedBy, d.preparedPosition)}
          ${formatSignature("Checked and Reviewed By", d.checkedBy, d.checkedPosition)}
          ${formatSignature("Approved for Execution", d.approvedBy, d.approvedPosition)}
        </div>
      </div>
    `;

    setGeneratedHtml(htmlContent);
    setPreviewKey(prev => prev + 1);
  };

  // AI-powered Objectives Generator based on Topic
  const handleGenerateObjectivesOnly = async () => {
    if (!formData.topic.trim()) {
      triggerAlert("Information Needed", "Please specify a lesson topic/focus first before generating objectives.");
      return;
    }
    setIsGeneratingObjectives(true);
    showStatusMsg("Formulating progressive lesson objectives based on topic...", "generator");
    try {
      const response = await fetch("/api/lesson/generate-only-objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.topic,
          gradeLevel: formData.gradeLevel,
          subject: formData.subject,
          competency: formData.competency,
          contentStandards: formData.contentStandards,
          performanceStandards: formData.performanceStandards,
          sessionCount: formData.sessions,
        }),
      });

      if (!response.ok) {
        throw new Error("Backend objectives generator returned negative response code.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.objectives) {
        setFormData(prev => ({ ...prev, objectives: data.objectives }));
        triggerAlert("Success", `AI successfully formulated ${formData.sessions} progressive session objectives matched to your curriculum topic.`);
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert("Goals Generator Busy", getAIEngineErrorFeedback(err));
    } finally {
      setIsGeneratingObjectives(false);
      showStatusMsg("", "generator");
    }
  };

  // AI-powered Objectives Unpacker to simplify complexity
  const handleUnpackObjectives = async (textToUnpack?: string, localGrade?: string, localSubj?: string) => {
    const rawToUse = textToUnpack !== undefined ? textToUnpack : unpackerInput;
    const gradeLevelToUse = localGrade !== undefined ? localGrade : (unpackerGrade !== "" ? unpackerGrade : formData.gradeLevel);
    const subjectToUse = localSubj !== undefined ? localSubj : (unpackerSubject !== "" ? unpackerSubject : formData.subject);

    if (!rawToUse.trim()) {
      setUnpackerError("Please provide learning objectives to unpack first.");
      return;
    }
    setIsUnpacking(true);
    setUnpackerError("");
    setUnpackedResults([]);
    try {
      const response = await fetch("/api/lesson/unpack-objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectives: rawToUse,
          gradeLevel: gradeLevelToUse,
          subject: subjectToUse,
        }),
      });

      if (!response.ok) {
        throw new Error("Backend unpacker service returned negative response code.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setUnpackedResults(data);
    } catch (err: any) {
      console.error(err);
      setUnpackerError(getAIEngineErrorFeedback(err));
    } finally {
      setIsUnpacking(false);
    }
  };

  const handleUseUnpackedInPlanner = () => {
    if (unpackedResults.length === 0) return;
    const combinedObjectives = unpackedResults.map((item, idx) => `${idx + 1}. ${item.original}`).join("\n");
    setFormData(prev => ({
      ...prev,
      objectives: combinedObjectives,
    }));
    triggerAlert("Objectives Linked", "Your unpacked objectives have been imported back into your primary ILAW Planner objectives panel!");
    setActiveTab("ilaw");
  };

  // Uses server-side REST endpoint to fill all empty form fields based on topic
  const handleAIBoostFields = async () => {
    if (!formData.topic) {
      triggerAlert("Information Needed", "Please enter a lesson topic/title first before seeking AI field enhancement.");
      return;
    }

    setIsAIFieldLoading(true);
    showStatusMsg("Enhancers mapping objectives, strategies, resources...", "generator");

    try {
      const response = await fetch("/api/lesson/generate-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.topic,
          gradeLevel: formData.gradeLevel,
          subject: formData.subject,
          competency: formData.competency,
          contentStandards: formData.contentStandards,
          performanceStandards: formData.performanceStandards
        })
      });

      if (!response.ok) {
        throw new Error("Backend fields generator returned negative response code.");
      }

      const raw = await response.json();
      if (raw.error) {
        throw new Error(raw.error);
      }

      const updated = {
        ...formData,
        objectives: raw.objectives || formData.objectives,
        preLesson: raw.preLesson || formData.preLesson,
        lessonFlow: raw.lessonFlow || formData.lessonFlow,
        materials: raw.materials || formData.materials,
        references: raw.references || formData.references,
        background: raw.background || formData.background,
        setup: raw.setup || formData.setup,
        integration: raw.integration || formData.integration,
        assessmentPlan: raw.assessmentPlan || formData.assessmentPlan,
        extendedLearning: raw.extendedLearning || formData.extendedLearning,
        reflectionQuestions: raw.reflectionQuestions || formData.reflectionQuestions
      };

      setFormData(updated);
      doGenerateLocalHtml(updated);

      showStatusMsg("AI Booster successfully populated missing ILAW planner fields!", "generator");
    } catch (err: any) {
      console.error(err);
      triggerAlert("AI Fields Booster Busy", getAIEngineErrorFeedback(err));
    } finally {
      setIsAIFieldLoading(false);
    }
  };

  const handleGenerateMatrixTable = async () => {
    if (!formData.objectives || !formData.objectives.trim()) {
      triggerAlert("Objectives Required", "⚠️ Please provide learning objectives in the 'Objectives' field (under Intentions) first!");
      return;
    }

    setIsMatrixLoading(true);
    setMatrixTableHtml("");
    showStatusMsg(`AI is generating your high-fidelity, session-specific plan using real-time streaming...`, "generator");

    try {
      const response = await fetch("/api/lesson/generate-matrix-table-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectives: formData.objectives,
          topic: formData.topic,
          subject: formData.subject,
          gradeLevel: formData.gradeLevel,
          option: matrixOption
        })
      });

      if (!response.ok) {
        throw new Error("Matrix generator stream endpoint returned non-OK response.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error("Could not acquire SSE stream reader.");
      }

      let finished = false;
      let rawText = "";
      let sseBuffer = "";

      while (!finished) {
        const { value, done } = await reader.read();
        finished = done;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          sseBuffer += chunkStr;

          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith("data: ")) {
              const dataValue = cleanLine.slice(6);
              if (dataValue === "[DONE]") {
                finished = true;
              } else {
                try {
                  const parsed = JSON.parse(dataValue);
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                  if (parsed.text) {
                    rawText += parsed.text;
                    const htmlOutput = convertMarkdownToHtml(rawText);
                    setMatrixTableHtml(htmlOutput);
                  }
                } catch (e: any) {
                  // ignore JSON parse of partial blocks/text
                }
              }
            }
          }
        }
      }

      showStatusMsg("Lesson Plan Matrix/Table generated successfully via stream! Look below.", "generator");
    } catch (err: any) {
      console.error(err);
      triggerAlert("Matrix Streaming Engine Busy", getAIEngineErrorFeedback(err));
    } finally {
      setIsMatrixLoading(false);
    }
  };

  // Handles Format Conversions
  const handleFormatConvert = async () => {
    if (!converterSourceText.trim()) {
      triggerAlert("Missing Text content", "Please paste the original lesson plan content you wish to convert first.");
      return;
    }

    setIsConverting(true);
    showStatusMsg("REELSYSTEM engines formatting guidelines...", "converter");

    try {
      const response = await fetch("/api/lesson/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceFormat,
          targetFormat,
          content: converterSourceText,
          additionalInstructions: converterInstructions,
          schoolLogo,
          profile: {
            teacherName: formData.teacherName,
            schoolName: formData.schoolName,
            gradeLevel: formData.gradeLevel,
            subject: formData.subject,
            preparedBy: formData.preparedBy,
            preparedPosition: formData.preparedPosition,
            checkedBy: formData.checkedBy,
            checkedPosition: formData.checkedPosition,
            approvedBy: formData.approvedBy,
            approvedPosition: formData.approvedPosition,
          }
        })
      });

      if (!response.ok) {
        throw new Error("Converter backend returned a negative code response.");
      }

      const resText = await response.json();
      if (resText.error) {
        throw new Error(resText.error);
      }

      const cleanHtml = (resText.convertedContent || "No translation output was returned.")
        .replace(/<thead>/gi, "<tbody>")
        .replace(/<\/thead>/gi, "</tbody>");
      setConvertedResult(cleanHtml);
      showStatusMsg("Lesson format converted successfully! See result below.", "converter");
    } catch (e: any) {
       console.error(e);
       triggerAlert("Conversion Engine Busy", getAIEngineErrorFeedback(e));
    } finally {
      setIsConverting(false);
    }
  };

  // Chat engine utilizing search grounding
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");

    const newMsg: ChatMessage = {
      id: "user_" + Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: chatMessages
        })
      });

      if (!response.ok) {
        throw new Error("Server assistant endpoint failed or was offline.");
      }

      const replyData = await response.json();
      if (replyData.error) {
        throw new Error(replyData.error);
      }

      const aiMsg: ChatMessage = {
        id: "ai_" + Date.now(),
        role: "model",
        content: replyData.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: replyData.sources || []
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: "err_" + Date.now(),
        role: "model",
        content: "⚠️ **System Communication Issue:** " + (err.message || "Could not generate answer. Please verify your GEMINI_API_KEY inside AI Studio Settings > Secrets."),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChatHistory = () => {
    setConfirmAction({
      message: "Are you sure you want to delete all chat history with the REEL IN ONE AI Assistant? This action cannot be undone.",
      onConfirm: () => {
        localStorage.removeItem(CHAT_HISTORY_KEY);
        setChatMessages([
          {
            id: "welcome",
            role: "model",
            content: "Mabuhay! Welcome to **REEL IN ONE AI Assistant** powered by **REELSYSTEM**.\n\nI am equipped with live **Google Search Grounding** to search the web for actual MATATAG curriculum resources, Department of Education memos, lesson formats, activities, worksheets, and syllabus guides. Tell me what you need, and I will gather online sources to support you!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        triggerAlert("Chat Truncated", "All conversations have been erased.");
      }
    });
  };

  // Storage local persistence
  const handleSaveLessonPlanToStore = () => {
    const freshHtml = generatedHtml;
    if (!freshHtml || freshHtml.includes("appears here")) {
      triggerAlert("Form Validation", "Please ensure the output lesson plan is generated before saving.");
      return;
    }

    const title = formData.topic.trim() || "Untitled Lesson Plan";
    const files = [...savedLessons];
    const newId = "ilaw_" + Date.now();

    const newSave: SavedLessonPlan = {
      id: newId,
      title,
      type: "lesson",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: freshHtml,
      formData: formData
    };

    files.unshift(newSave);
    setSavedLessons(files);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(files));
    triggerAlert("Lesson Saved Successfully", `Success: Standard A4 Lesson Plan "${title}" saved cleanly inside REELSYSTEM browser storage.`);
  };

  const handleSaveConvertedToStore = () => {
    if (!convertedResult) {
      triggerAlert("Empty Content", "No converted content to save.");
      return;
    }

    const title = `${sourceFormat} to ${targetFormat} [Conversion]`;
    const files = [...savedLessons];
    const newId = "conv_" + Date.now();

    const htmlStyled = `
      <div style="font-family: system-ui, sans-serif; padding: 20px; line-height: 1.6; max-width: 900px; margin: auto; background-color: #fff; border: 2.5px solid #991b1b; border-radius: 8px;">
        <h2 style="color: #991b1b; border-bottom: 2px solid #991b1b; padding-bottom: 8px; margin-top: 0;">REELSYSTEM — Converted Lesson</h2>
        <div style="margin: 10px 0; padding: 10px; background-color: #fee2e2; border-radius: 4px; font-weight: 700; color: #7f1d1d;">
          Converted from ${sourceFormat} to ${targetFormat}
        </div>
        <div style="white-space: pre-wrap; font-size: 13.5px;">${convertedResult}</div>
      </div>
    `;

    const newSave: SavedLessonPlan = {
      id: newId,
      title,
      type: "converted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: htmlStyled
    };

    files.unshift(newSave);
    setSavedLessons(files);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(files));
    triggerAlert("Conversion Saved", "Converted output saved in your library!");
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction({
      message: "Are you sure you want to permanently delete this saved plan from your library?",
      onConfirm: () => {
        const filter = savedLessons.filter(f => f.id !== id);
        setSavedLessons(filter);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filter));
        if (selectedSavedId === id) {
          setSelectedSavedId(null);
          setSavedPreviewContent("");
        }
        triggerAlert("Deleted Successfully", "The selected plan has been deleted.");
      }
    });
  };

  const handleLoadSavedToForm = (item: SavedLessonPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.formData) {
      setFormData(item.formData);
      setActiveTab("ilaw");
      triggerAlert("Form Loaded", `Loaded fields for "${item.title}" into the planner form successfully.`);
    } else {
      triggerAlert("Non-Reloadable Format", "This is an AI converted custom document and cannot be reloaded back to complex ILAW fields. You can click 'Preview' to view and copy it.");
    }
  };

  const handlePreviewSaved = (item: SavedLessonPlan) => {
    setSelectedSavedId(item.id);
    const cleanContent = (item.content || "")
      .replace(/<thead>/gi, "<tbody>")
      .replace(/<\/thead>/gi, "</tbody>");
    setSavedPreviewContent(cleanContent);
  };

  // Copying helper
  const handleCopyText = async (elementId: "lessonOutput" | "savedPreview" | "convertedArea") => {
    let text = "";
    if (elementId === "lessonOutput") {
      const el = document.getElementById("lessonOutputEditable");
      text = el ? el.innerText || el.textContent || "" : "";
    } else if (elementId === "savedPreview") {
      const el = document.getElementById("savedPreviewEditable");
      text = el ? el.innerText || el.textContent || "" : "";
    } else {
      text = convertedResult;
    }

    if (!text || text.trim().length === 0 || text.includes("Your generated ILAW")) {
      triggerAlert("No Content", "No actual generated text exists to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      triggerAlert("Copied to Clipboard", "Successfully copied raw lesson text to clipboard!");
    } catch (e) {
      triggerAlert("Fallback Copy", "Fallback: Please highlight the printed text manually to copy.");
    }
  };

  // Word-Style document generator stream (.doc content types)
  const handleDownloadWordFile = (htmlToDownload: string, defaultName: string) => {
    if (!htmlToDownload || htmlToDownload.includes("Generated HTML")) {
      triggerAlert("Export Error", "No content available to export.");
      return;
    }

    const docStyle = `
      @page Section1 {
        size: 11.69in 8.27in;
        mso-page-orientation: landscape;
        margin: 0.35in;
      }
      div.Section1 { page: Section1; }
      body { font-family: 'Arial', sans-serif; font-size: 11.5px; line-height: 1.35; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      td, th { border: 1px solid #991b1b; padding: 6px; font-size: 11px; vertical-align: top; }
      th { background-color: #fee2e2; color: #7f1d1d; font-weight: 800; }
      ul { padding-left: 14px; margin: 0; }
    `;

    const blobString = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
         <meta charset="utf-8">
        <title>REEL IN ONE EXPORT</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>${docStyle}</style>
      </head>
      <body>
        <div class="Section1">${htmlToDownload}</div>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + blobString], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${defaultName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintDocument = (elementId: "lessonOutputEditable" | "savedPreviewEditable" | "convertedAreaPrint" | "matrixOutputPrintable") => {
    const element = document.getElementById(elementId);
    if (!element) {
      triggerAlert("System Error", "Printable section not found.");
      return;
    }

    const printWin = window.open("", "_blank");
    if (!printWin) {
      triggerAlert("Blocked Popup", "Pop-up blocker active. Please allow popups to launch the printing utility.");
      return;
    }

    printWin.document.write(`
      <html>
        <head>
          <title>REEL IN ONE Plan Document</title>
          <style>
            @media print {
              @page { size: A4 landscape; margin: 6mm 10mm; }
              body { font-family: system-ui, sans-serif; margin: 0; padding: 0; background: #ffffff; color: #000; }
            }
            body { font-family: system-ui, sans-serif; padding: 15px; }
            ul { margin: 0; padding-left: 15px; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);

    printWin.document.close();
    printWin.focus();
    // delay to promise image load
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 450);
  };

  // Generate local HTML on-the-fly when typing in form
  const handleFieldChange = (key: keyof ILAWFormData, value: string) => {
    updateFormData(key, value);
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col font-sans text-slate-800 selection:bg-rose-200">
      
      {/* BRAND HEADER BAR */}
      <header className={`bg-white border-b-2 border-rose-600 sticky top-0 z-50 shadow-sm transition-all duration-200 no-print ${isHeaderExpanded ? "py-2" : "py-1"}`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {isHeaderExpanded ? (
            <div className="flex items-center gap-2">
              <div className="bg-rose-600 text-white p-1.5 rounded-xl shadow-sm border border-rose-950 flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">REEL IN ONE</h1>
                  <span className="text-[9px] bg-rose-100 text-rose-800 border border-rose-300 font-extrabold px-1 py-0.2 rounded uppercase">Pro</span>
                </div>
                <p className="text-[9px] text-pink-800 font-black tracking-wider">COMPREHENSIVE CORE ENGINES • BY REELSYSTEM</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-rose-600 text-white p-1 rounded-lg border border-rose-950 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black tracking-tight text-slate-900 leading-none">REEL IN ONE</h1>
                <span className="text-[8px] bg-rose-100 text-rose-800 font-extrabold px-1 rounded uppercase">PRO</span>
              </div>
            </div>
          )}

          {/* REGROUPED COMPACT NAVIGATION */}
          <div className="flex flex-col gap-2 items-center w-full md:w-auto no-print">
            {/* MAIN NAVIGATION BAR */}
            <div className="flex flex-wrap gap-1.5 justify-center bg-white border-4 border-slate-900 p-1.5 rounded-2xl shadow-[3px_3px_0px_rgba(0,0,0,1)] max-w-lg w-auto">
              {isHeaderExpanded && (
                <>
                  {/* A. DASHBOARD */}
                  <button 
                    onClick={() => setActiveTab("home")}
                    className={`flex items-center justify-center p-2 rounded-xl text-xs font-black transition-all duration-200 border-2 ${
                      activeTab === "home" 
                        ? "bg-pink-700 text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                        : "bg-white text-slate-700 border-transparent hover:bg-slate-100 hover:text-pink-700"
                    }`}
                    title="A. Dashboard - All features, generators, and converters can be seen here"
                    aria-label="Dashboard"
                  >
                    <Home className="w-4 h-4" />
                  </button>

                  {/* B. FEATURES */}
                  <button 
                    onClick={() => {
                      if (!["ilaw", "unpacker", "converter", "generator", "bubblesheet", "citation"].includes(activeTab)) {
                        setActiveTab("ilaw");
                      }
                    }}
                    className={`flex items-center justify-center p-2 rounded-xl text-xs font-black transition-all duration-200 border-2 ${
                      ["ilaw", "unpacker", "converter", "generator", "bubblesheet", "citation"].includes(activeTab)
                        ? "bg-emerald-700 text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                        : "bg-white text-slate-700 border-transparent hover:bg-slate-100 hover:text-emerald-700"
                    }`}
                    title="B. Features - Planner, Unpacker, Converter, Generator, Bubble Sheet, Citation"
                    aria-label="Features"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {/* C. SETTINGS */}
                  <button 
                    onClick={() => {
                      if (!["saved", "about"].includes(activeTab)) {
                        setActiveTab("saved");
                      }
                    }}
                    className={`flex items-center justify-center p-2 rounded-xl text-xs font-black transition-all duration-200 border-2 ${
                      ["saved", "about"].includes(activeTab)
                        ? "bg-blue-700 text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                        : "bg-white text-slate-700 border-transparent hover:bg-slate-100 hover:text-blue-700"
                    }`}
                    title="C. Settings - Saved Lessons and About & Guide"
                    aria-label="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {/* D. PROFILE SETUP */}
                  <button 
                    onClick={() => setActiveTab("profile")}
                    className={`flex items-center justify-center p-2 rounded-xl text-xs font-black transition-all duration-200 border-2 ${
                      activeTab === "profile" 
                        ? "bg-purple-700 text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                        : "bg-white text-slate-700 border-transparent hover:bg-slate-100 hover:text-purple-700"
                    }`}
                    title="D. Profile Setup"
                    aria-label="Profile Setup"
                  >
                    <User className="w-4 h-4" />
                  </button>

                  {/* E. SUPPORT AND DONATE */}
                  <button 
                    onClick={() => setActiveTab("support")}
                    className={`flex items-center justify-center p-2 rounded-xl text-xs font-black transition-all duration-200 border-2 ${
                      activeTab === "support" 
                        ? "bg-rose-700 text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                        : "bg-white text-slate-700 border-transparent hover:bg-slate-100 hover:text-rose-700"
                    }`}
                    title="E. Support and Donate"
                    aria-label="Support and Donate"
                  >
                    <Heart className="w-4 h-4 text-rose-550 fill-rose-500" />
                  </button>

                  {/* F. FEEDBACK */}
                  <button 
                    onClick={() => setActiveTab("feedback")}
                    className={`flex items-center justify-center p-2 rounded-xl text-xs font-black transition-all duration-200 border-2 ${
                      activeTab === "feedback" 
                        ? "bg-indigo-700 text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                        : "bg-white text-slate-700 border-transparent hover:bg-slate-100 hover:text-indigo-700"
                    }`}
                    title="F. Feedback"
                    aria-label="Feedback"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* G. MINIMIZE / EXPAND HEADER BUTTON */}
              <button 
                onClick={toggleHeaderExpanded}
                className="flex items-center gap-1.5 justify-center p-2 rounded-xl text-xs font-black transition-all duration-200 border-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300 hover:text-rose-600 shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                title={isHeaderExpanded ? "Minimize Navigation Bar (Hide navigation buttons)" : "Expand Navigation Bar (Show navigation buttons)"}
                aria-label="Toggle Navigation Size"
              >
                {isHeaderExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Minimize</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Expand Menu</span>
                  </>
                )}
              </button>
            </div>

            {/* SUB-NAVIGATION BAR (Revealed when active tab is a features tab and navigation is expanded) */}
            {isHeaderExpanded && ["ilaw", "unpacker", "converter", "generator", "bubblesheet", "citation"].includes(activeTab) && (
              <div className="flex flex-wrap gap-1.5 justify-center bg-emerald-50/50 border-2 border-emerald-300 p-1.5 rounded-xl shadow-sm w-auto">
                <button 
                  onClick={() => setActiveTab("ilaw")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition-all duration-150 ${
                    activeTab === "ilaw" 
                      ? "bg-emerald-700 text-white" 
                      : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-emerald-200"
                  }`}
                  title="ILAW Planner Form"
                >
                  <BookOpen className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Planner</span>
                </button>
                <button 
                  onClick={() => setActiveTab("unpacker")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition-all duration-150 ${
                    activeTab === "unpacker" 
                      ? "bg-emerald-700 text-white" 
                      : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-emerald-200"
                  }`}
                  title="Objectives Unpacker"
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Unpacker</span>
                </button>
                <button 
                  onClick={() => setActiveTab("converter")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition-all duration-150 ${
                    activeTab === "converter" 
                      ? "bg-emerald-700 text-white" 
                      : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-emerald-200"
                  }`}
                  title="Lesson Plan Converter"
                >
                  <RefreshCw className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Converter</span>
                </button>
                <button 
                  onClick={() => setActiveTab("generator")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition-all duration-150 ${
                    activeTab === "generator" 
                      ? "bg-emerald-700 text-white" 
                      : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-emerald-200"
                  }`}
                  title="AI Prompt Generators"
                >
                  <Brain className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Generator</span>
                </button>
                <button 
                  onClick={() => setActiveTab("bubblesheet")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition-all duration-150 ${
                    activeTab === "bubblesheet" 
                      ? "bg-emerald-700 text-white" 
                      : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-emerald-200"
                  }`}
                  title="Dynamic Bubble Sheet"
                >
                  <CheckCircle className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Bubble Sheet</span>
                </button>
                <button 
                  onClick={() => setActiveTab("citation")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition-all duration-150 ${
                    activeTab === "citation" 
                      ? "bg-emerald-700 text-white" 
                      : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-emerald-200"
                  }`}
                  title="Academic Citation Generator"
                >
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Citation</span>
                </button>
              </div>
            )}

            {/* SUB-NAVIGATION BAR (Revealed when active tab is a settings tab) */}
            {["saved", "about"].includes(activeTab) && (
              <div className="flex flex-wrap gap-1.5 justify-center bg-blue-50/50 border-2 border-blue-300 p-1.5 rounded-xl shadow-sm w-auto">
                <button 
                  onClick={() => setActiveTab("saved")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all duration-150 ${
                    activeTab === "saved" 
                      ? "bg-blue-700 text-white" 
                      : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-800 border border-blue-200"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Saved Lessons</span>
                  {savedLessons.length > 0 && (
                    <span className="bg-blue-100 text-blue-900 font-black rounded-full px-1 text-[9px] border border-blue-300 ml-1">
                      {savedLessons.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab("about")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all duration-150 ${
                    activeTab === "about" 
                      ? "bg-blue-700 text-white" 
                      : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-800 border border-blue-200"
                  }`}
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>About & Guide</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:py-8">

        {/* ==================== TAB 1: HOME/DASHBOARD ==================== */}
        {activeTab === "home" && (
          <div className="space-y-8 animate-fade-in">
            {/* HERO PANEL */}
            <div className="bg-gradient-to-r from-pink-700 via-rose-950 to-pink-950 border-4 border-slate-900 p-6 md:p-10 rounded-3xl relative overflow-hidden shadow-xl text-white">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
                <Sparkles className="w-96 h-96" />
              </div>
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="bg-pink-900 border border-pink-500 text-pink-100 px-3.5 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">
                  ⭐ THE ULTIMATE LESSON WORKSPACE
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-white!">
                  Smarter Planning. <br />Better Teaching.
                </h2>
                <p className="text-pink-100 font-medium text-base leading-relaxed text-pink-50!">
                  Welcome to <strong className="text-white font-extrabold text-lg">REEL IN ONE</strong>, the authorized all-in-one educational workflow designed by <strong className="text-white">REELSYSTEM</strong>. Instantly structure classroom lesson logs aligned with standard DepEd DO 016, s. 2026 guidelines, convert format templates in seconds, and execute grounded web curriculum searches with live references.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button 
                    onClick={() => setActiveTab("ilaw")}
                    className="bg-white text-pink-950 border-2 border-slate-900 px-4 py-2.5 rounded-2xl text-xs font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-slate-100 transition-all transform hover:translate-y-[1px]"
                  >
                    📝 ILAW Planner Form
                  </button>
                  <button 
                    onClick={() => setActiveTab("unpacker")}
                    className="bg-white text-pink-950 border-2 border-slate-900 px-4 py-2.5 rounded-2xl text-xs font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-slate-100 transition-all transform hover:translate-y-[1px]"
                  >
                    ✨ Objectives Unpacker
                  </button>
                  <button 
                    onClick={() => {
                      setConverterSubTab("matatag");
                      setActiveTab("converter");
                    }}
                    className="bg-white text-pink-950 border-2 border-slate-900 px-4 py-2.5 rounded-2xl text-xs font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-slate-100 transition-all transform hover:translate-y-[1px]"
                  >
                    🔄 LP Converter
                  </button>
                  <button 
                    onClick={() => {
                      setConverterSubTab("architect");
                      setActiveTab("converter");
                    }}
                    className="bg-pink-600 text-white border-2 border-slate-900 px-4 py-2.5 rounded-2xl text-xs font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-pink-700 transition-all transform hover:translate-y-[1px] text-white!"
                  >
                    ⚡ AI Test Architect Pro
                  </button>
                  <button 
                    onClick={() => setActiveTab("generator")}
                    className="bg-pink-950 text-white border-2 border-slate-900 px-4 py-2.5 rounded-2xl text-xs font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-pink-900 transition-all transform hover:translate-y-[1px] text-white!"
                  >
                    📊 AI TOS & Rubrics Workspace
                  </button>
                  <button 
                    onClick={() => setActiveTab("bubblesheet")}
                    className="bg-white text-pink-950 border-2 border-slate-900 px-4 py-2.5 rounded-2xl text-xs font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-slate-100 transition-all transform hover:translate-y-[1px]"
                  >
                    ⭕ Bubble Answer Sheet
                  </button>
                  <button 
                    onClick={() => setActiveTab("citation")}
                    className="bg-white text-pink-950 border-2 border-slate-900 px-4 py-2.5 rounded-2xl text-xs font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-slate-100 transition-all transform hover:translate-y-[1px]"
                  >
                    📚 Academic Citation
                  </button>
                </div>
              </div>
            </div>

            {/* THREE CORE pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="bg-pink-100 w-12 h-12 rounded-xl flex items-center justify-center text-pink-800 border-2 border-slate-900 font-black text-xl mb-4 text-pink-800!">
                  I
                </div>
                <h3 className="font-extrabold text-lg mb-2 text-slate-900">Intentions & Core Mappings</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Map learning competencies, standards, specific performance parameters, and visual student objectives directly inside a synchronized weeks format.
                </p>
              </div>

              <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="bg-pink-100 w-12 h-12 rounded-xl flex items-center justify-center text-pink-800 border-2 border-slate-900 font-black text-xl mb-4 text-pink-800!">
                  L
                </div>
                <h3 className="font-extrabold text-lg mb-2 text-slate-900">Learning Experiences</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Design sequential pathways covering pre-lesson reviews, motivating games, interactive flows, concrete materials, and logical integrations.
                </p>
              </div>

              <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="bg-pink-100 w-12 h-12 rounded-xl flex items-center justify-center text-pink-800 border-2 border-slate-900 font-black text-xl mb-4 text-pink-800!">
                  AW
                </div>
                <h3 className="font-extrabold text-lg mb-2 text-slate-900">Assessment & Ways Forward</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Outline continuous checking queries, qualitative rubrics, student assignment files, and professional teacher reflection variables easily.
                </p>
              </div>

            </div>

            {/* INTEGRATED AI CAPABILITIES GRID */}
            <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
              <h3 className="text-xl font-black mb-6 text-rose-950 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-500 fill-rose-500" />
                REELSYSTEM AI Core Integrations Included
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-pink-100 border border-slate-900 flex items-center justify-center text-rose-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Automatic Form Enhancer</h4>
                    <p className="text-sm text-slate-600 leading-relaxed mt-1">
                      Type a single lesson topic line and hit "AI Boost Fields". The Gemini model will auto-populate realistic goals, materials, references, and scaffolded checking procedures instantly inside the input form.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-pink-100 border border-slate-900 flex items-center justify-center text-rose-600">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Full-Syllabus LP Converter</h4>
                    <p className="text-sm text-slate-600 leading-relaxed mt-1">
                      Translate outdated format plans, Lesson Exemplars, MATATAG Daily Lesson Logs (DLL), or comprehensive Detailed Lesson Plans (DLP) directly into the printable ILAW template, or vice versa.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-pink-100 border border-slate-900 flex items-center justify-center text-rose-600">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">AI Assessment Generators (TOS & Rubrics)</h4>
                    <p className="text-sm text-slate-600 leading-relaxed mt-1">
                      Synthesize curriculum blueprint matrices like standard Table of Specifications (TOS) mapped with cognitive domains, and create high-fidelity analytic assessment rubrics instantly.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-pink-100 border border-slate-900 flex items-center justify-center text-rose-600">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Offline & Print Ready</h4>
                    <p className="text-sm text-slate-600 leading-relaxed mt-1">
                      Every plan created formatted as standard A4 Landscape. Click to print directly or download as a `.doc` file format for Microsoft Word editing or school division submissions.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 md:col-span-2 border-t pt-4 border-slate-100">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-pink-100 border border-slate-900 flex items-center justify-center text-rose-600">
                    <Sparkles className="w-5 h-5 text-pink-600 fill-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                      <span>ReelSystem AI Test Architect Pro</span>
                      <span className="bg-pink-100 text-pink-800 border border-pink-300 font-extrabold text-[9px] uppercase px-1.5 py-0.5 rounded">NEW</span>
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed mt-1">
                      Generate beautifully styled, printed A4 examinations from teaching materials instantly. Supports Multiple Choice, True/False, Identification, Matching Type, and Fill-in-the-Blanks modalities conforming to Table of Specifications (TOS) blueprints with automated answers.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setConverterSubTab("architect");
                        setActiveTab("converter");
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-pink-700 hover:text-pink-950 font-extrabold uppercase tracking-wider cursor-pointer"
                    >
                      Open Test Architect Pro →
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* LIVE COMMENT BOARD & RATINGS */}
            <FeedbackSection mode="full" />
          </div>
        )}

        {/* ==================== TAB 2: ILAW PLANNER FORM ==================== */}
        {activeTab === "ilaw" && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            
            <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">📝 Create Comprehensive ILAW Lesson Plan</h2>
                  <p className="text-xs text-slate-500 font-medium">Draft detailed weekly columns conforming to REELSYSTEM standards. Fill manual details or leverage the AI booster.</p>
                  <span className="text-[10px] text-slate-400 font-bold block mt-1 flex items-center gap-1 select-none">
                    <Clock className="w-3 h-3 text-rose-500 animate-pulse" />
                    {lastAutosaveTime ? `Autosaved draft at ${lastAutosaveTime}` : "Auto-save active (every 30s via local storage)"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Undo / Redo Navigation Controls */}
                  <div className="flex items-center bg-slate-50 border-2 border-slate-900 p-0.5 rounded-xl shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)] gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 disabled:opacity-30 hover:bg-slate-50 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
                      title="Undo last change (Ctrl+Z)"
                    >
                      <Undo2 className="w-4 h-4 text-slate-850" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={historyIndex >= formDataHistory.length - 1}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 disabled:opacity-30 hover:bg-slate-50 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
                      title="Redo last change (Ctrl+Y)"
                    >
                      <Redo2 className="w-4 h-4 text-slate-850" />
                    </button>
                  </div>
                  <button 
                    onClick={handleManualSave}
                    className="bg-emerald-500 hover:bg-emerald-600 border-2 border-slate-900 px-4 py-2 rounded-xl text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_rgba(0,0,0,1)] cursor-pointer"
                    title="Manually save draft back up to local storage instantly"
                  >
                    <Save className="w-4 h-4 text-white" />
                    <span>Save Draft</span>
                  </button>
                  <button 
                    onClick={handleAIBoostFields}
                    disabled={isAIFieldLoading}
                    className="bg-rose-100 hover:bg-rose-200 border-2 border-rose-950 px-4 py-2 rounded-xl text-rose-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.85)] active:translate-y-[1px] active:shadow-none disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-4 h-4 ${isAIFieldLoading ? 'animate-spin' : ''}`} />
                    {isAIFieldLoading ? "AI Enhancing..." : "💡 AI Boost Form Fields"}
                  </button>
                  <button 
                    onClick={handleClearForm}
                    className="bg-white hover:bg-slate-50 border-2 border-slate-900 px-4 py-2 rounded-xl text-slate-800 font-black text-xs flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.85)] active:translate-y-[1px] active:shadow-none cursor-pointer"
                    title="Wipe form inputs cleanly"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Clear Form</span>
                  </button>
                  <button 
                    onClick={handlePurgeCache}
                    className="bg-amber-100 hover:bg-amber-200 border-2 border-amber-950 px-4 py-2 rounded-xl text-amber-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.85)] active:translate-y-[1px] active:shadow-none cursor-pointer"
                    title="Wipe all draft drafts, cached default school logs, and auto-backups from your browser memory"
                  >
                    <Database className="w-4 h-4 text-amber-800" />
                    <span>Purge Cache</span>
                  </button>
                </div>
              </div>

              {autosaveRestoredMessage && (
                <div className="bg-emerald-50 border-2 border-emerald-500 p-3 rounded-xl text-emerald-900 text-xs font-bold mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {autosaveRestoredMessage}
                  </span>
                  <button 
                    onClick={() => setAutosaveRestoredMessage("")} 
                    className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 text-[10.5px] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {generatorStatus && (
                <div className="bg-pink-100 border-2 border-pink-500 p-3 rounded-xl text-pink-900 text-xs font-bold mb-4 animate-pulse">
                  {generatorStatus}
                </div>
              )}

              {/* FORM FIELDS ACCORDION GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* School meta metrics */}
                <div className="bg-pink-50/50 border-2 border-pink-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-pink-200 pb-1 mb-2">
                    <h3 className="text-xs font-black uppercase text-pink-900 tracking-wider">📋 School & Class Headers</h3>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${headersLocked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {headersLocked ? "🔒 Locked" : "🔓 Editable"}
                    </span>
                  </div>

                  {/* Header Management Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 bg-white p-2 rounded-lg border border-pink-150 shadow-sm">
                    <button 
                      type="button"
                      onClick={handleSaveHeaders}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black py-1 px-1.5 rounded transition-colors text-center"
                      title="Save values in this browser permanently"
                    >
                      Save
                    </button>
                    {headersLocked ? (
                      <button 
                        type="button"
                        onClick={handleUnlockHeaders}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-1 px-1.5 rounded transition-colors text-center"
                        title="Unlock headers to edit"
                      >
                        Unlock
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={handleLockHeaders}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black py-1 px-1.5 rounded transition-colors text-center"
                        title="Lock headers to prevent modification"
                      >
                        Lock
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={handleClearHeaders}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-black py-1 px-1.5 rounded transition-colors text-center col-span-2"
                      title="Clear from both local memory and model state"
                    >
                      Clear
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Teacher's Name</label>
                    <input 
                      type="text" 
                      value={formData.teacherName} 
                      onChange={(e) => handleFieldChange("teacherName", e.target.value)}
                      disabled={headersLocked}
                      placeholder="e.g. Maria Santos"
                      className={`w-full text-xs font-semibold p-2 border-2 border-slate-900 rounded-lg focus:ring-rose-500 ${
                        headersLocked ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300" : "bg-white"
                      }`}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">School Name</label>
                    <input 
                      type="text" 
                      value={formData.schoolName} 
                      onChange={(e) => handleFieldChange("schoolName", e.target.value)}
                      disabled={headersLocked}
                      placeholder="e.g. Rizal Elementary"
                      className={`w-full text-xs font-semibold p-2 border-2 border-slate-900 rounded-lg focus:ring-rose-500 ${
                        headersLocked ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300" : "bg-white"
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Grade Level</label>
                      <input 
                        type="text" 
                        value={formData.gradeLevel} 
                        onChange={(e) => handleFieldChange("gradeLevel", e.target.value)}
                        disabled={headersLocked}
                        placeholder="Grade 4"
                        className={`w-full text-xs font-semibold p-2 border-2 border-slate-900 rounded-lg focus:ring-rose-500 ${
                          headersLocked ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300" : "bg-white"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Subject</label>
                      <input 
                        type="text" 
                        value={formData.subject} 
                        onChange={(e) => handleFieldChange("subject", e.target.value)}
                        disabled={headersLocked}
                        placeholder="English"
                        className={`w-full text-xs font-semibold p-2 border-2 border-slate-900 rounded-lg focus:ring-rose-500 ${
                          headersLocked ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300" : "bg-white"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Term</label>
                      <select 
                        value={formData.quarter} 
                        onChange={(e) => handleFieldChange("quarter", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border-2 border-slate-900 rounded-lg bg-white focus:ring-rose-500"
                      >
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Week No.</label>
                      <select 
                        value={formData.week} 
                        onChange={(e) => handleFieldChange("week", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border-2 border-slate-900 rounded-lg bg-white focus:ring-rose-500"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={`Week ${i + 1}`}>
                            Week {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Sessions</label>
                      <select 
                        value={formData.sessions} 
                        onChange={(e) => handleFieldChange("sessions", e.target.value)}
                        className="w-full text-xs p-2 border-2 border-slate-900 rounded-lg bg-white focus:ring-rose-500 font-semibold"
                      >
                        <option value="1">1 Col</option>
                        <option value="2">2 Cols</option>
                        <option value="3">3 Cols</option>
                        <option value="4">4 Cols</option>
                        <option value="5">5 Cols</option>
                        <option value="6">6 Cols</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Plan Date</label>
                      <input 
                        type="date" 
                        value={formData.lessonDate} 
                        onChange={(e) => handleFieldChange("lessonDate", e.target.value)}
                        className="w-full text-xs font-semibold p-1.5 border-2 border-slate-900 rounded-lg bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Duration</label>
                      <select 
                        value={formData.duration} 
                        onChange={(e) => handleFieldChange("duration", e.target.value)}
                        className="w-full text-xs font-semibold p-2 border-2 border-slate-900 rounded-lg bg-white"
                      >
                        <option value="40 minutes">40 minutes</option>
                        <option value="45 minutes">45 minutes</option>
                        <option value="50 minutes">50 minutes</option>
                        <option value="60 minutes">60 minutes</option>
                        <option value="70 minutes">70 minutes</option>
                        <option value="80 minutes">80 minutes</option>
                        <option value="90 minutes">90 minutes</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Lesson Topic / Focus</label>
                    <input 
                      type="text" 
                      value={formData.topic} 
                      onChange={(e) => handleFieldChange("topic", e.target.value)}
                      placeholder="Identifiying main topic/ideas"
                      className={`w-full text-xs font-bold p-2 border-2 rounded-lg transition-colors ${
                        runSpellAndGrammarChecker(formData.topic).length > 0
                          ? "border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-amber-500"
                          : "border-slate-900 bg-white focus:ring-rose-500"
                      }`}
                    />
                    <GrammarSpellIndicator 
                      text={formData.topic} 
                      onFix={(original, correction) => handleFixIssue("topic", original, correction)} 
                    />
                  </div>

                </div>

                {/* Standards inputs */}
                <div className="bg-pink-50/50 border-2 border-pink-200 p-4 rounded-xl space-y-3 md:col-span-2">
                  <h3 className="text-xs font-black uppercase text-pink-900 tracking-wider border-b border-pink-200 pb-1 mb-2">📋 Core Curriculum Standards</h3>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">DepEd Learning Competency</label>
                    <textarea 
                      rows={2}
                      value={formData.competency} 
                      onChange={(e) => handleFieldChange("competency", e.target.value)}
                      className={`w-full text-xs font-semibold p-2 border-2 rounded-lg focus:ring-rose-500 transition-colors ${
                        runSpellAndGrammarChecker(formData.competency).length > 0
                          ? "border-amber-400 bg-amber-50/10 focus:border-amber-500"
                          : "border-slate-900 bg-white"
                      }`}
                      placeholder="e.g. EN4RC-Ia-2.2"
                    />
                    <GrammarSpellIndicator 
                      text={formData.competency} 
                      onFix={(original, correction) => handleFixIssue("competency", original, correction)} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Content Standards</label>
                      <textarea 
                        rows={2}
                        value={formData.contentStandards} 
                        onChange={(e) => handleFieldChange("contentStandards", e.target.value)}
                        className={`w-full text-xs font-semibold p-2 border-2 rounded-lg focus:ring-rose-500 transition-colors ${
                          runSpellAndGrammarChecker(formData.contentStandards).length > 0
                            ? "border-amber-400 bg-amber-50/10 focus:border-amber-500"
                            : "border-slate-900 bg-white"
                        }`}
                        placeholder="Learner demonstrates understanding of..."
                      />
                      <GrammarSpellIndicator 
                        text={formData.contentStandards} 
                        onFix={(original, correction) => handleFixIssue("contentStandards", original, correction)} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Performance Standards</label>
                      <textarea 
                        rows={2}
                        value={formData.performanceStandards} 
                        onChange={(e) => handleFieldChange("performanceStandards", e.target.value)}
                        className={`w-full text-xs font-semibold p-2 border-2 rounded-lg focus:ring-rose-500 transition-colors ${
                          runSpellAndGrammarChecker(formData.performanceStandards).length > 0
                            ? "border-amber-400 bg-amber-50/10 focus:border-amber-500"
                            : "border-slate-900 bg-white"
                        }`}
                        placeholder="Learner independently applies..."
                      />
                      <GrammarSpellIndicator 
                        text={formData.performanceStandards} 
                        onFix={(original, correction) => handleFixIssue("performanceStandards", original, correction)} 
                      />
                    </div>
                  </div>
                </div>

                {/* COLUMN ILAW INPUTS */}
                <div className="bg-white border-2 border-slate-900 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-black text-rose-800 border-b border-rose-100 pb-1">💡 INTENTIONS</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">Session Objectives</label>
                      <span className="text-[9px] text-slate-500 font-black">One objective per line</span>
                    </div>

                    <div className="flex gap-1.5 items-center bg-slate-50 p-1 rounded-lg border border-slate-200 mb-1.5">
                      <button
                        type="button"
                        onClick={handleGenerateObjectivesOnly}
                        disabled={isGeneratingObjectives}
                        className="bg-pink-100 hover:bg-pink-200 text-pink-900 border border-pink-400 rounded-md px-2 py-1 text-[10px] font-black flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Sparkles className={`w-3 h-3 ${isGeneratingObjectives ? 'animate-spin' : ''}`} />
                        <span>{isGeneratingObjectives ? "Generating..." : "⚡ AI Generate Goals"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.objectives.trim()) {
                            triggerAlert("Input Missing", "Please type or generate some objectives first before unpacking!");
                            return;
                          }
                          setUnpackerInput(formData.objectives);
                          setUnpackerSubject(formData.subject);
                          setUnpackerGrade(formData.gradeLevel);
                          handleUnpackObjectives(formData.objectives, formData.gradeLevel, formData.subject);
                          setActiveTab("unpacker");
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-400 rounded-md px-2 py-1 text-[10px] font-black flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Search className="w-3 h-3" />
                        <span>🔍 Unpack Goals</span>
                      </button>
                    </div>

                     <textarea 
                      rows={4}
                      value={formData.objectives} 
                      onChange={(e) => handleFieldChange("objectives", e.target.value)}
                      className={`w-full text-xs p-2 border-2 rounded-lg focus:ring-rose-500 transition-colors ${
                        runSpellAndGrammarChecker(formData.objectives).length > 0
                          ? "border-amber-400 bg-amber-50/10 focus:border-amber-500"
                          : "border-slate-900 bg-white"
                      }`}
                      placeholder="1. Define objective 1\n2. Define objective 2"
                    />
                    <GrammarSpellIndicator 
                      text={formData.objectives} 
                      onFix={(original, correction) => handleFixIssue("objectives", original, correction)} 
                    />
                  </div>
                  <MultiSelectField 
                    label="Learner's Prior Background"
                    value={formData.background}
                    onChange={(newVal) => handleFieldChange("background", newVal)}
                    options={BACKGROUND_OPTIONS}
                    placeholder="Learners can recite but struggle with details..."
                  />
                </div>

              <div className="bg-white border-2 border-slate-900 p-4 rounded-xl space-y-3">
                <h3 className="text-xs font-black text-rose-800 border-b border-rose-100 pb-1">🌿 LEARNING EXPERIENCES</h3>
                <div className="space-y-1">
                  <MultiSelectField 
                    label="Selected Materials List"
                    value={formData.materials}
                    onChange={(newVal) => handleFieldChange("materials", newVal)}
                    options={MATERIALS_OPTIONS}
                    placeholder="Charts, visual cards, projector sheets..."
                  />
                </div>
                <div className="space-y-1">
                  <MultiSelectField 
                    label="Pre-Lesson Warmups (per Session)"
                    value={formData.preLesson}
                    onChange={(newVal) => handleFieldChange("preLesson", newVal)}
                    options={PRE_LESSON_OPTIONS}
                    placeholder="Select or type session warmups..."
                  />
                </div>
                <div className="space-y-1">
                  <MultiSelectField 
                    label="Lesson Flow Logic (per Session)"
                    value={formData.lessonFlow}
                    onChange={(newVal) => handleFieldChange("lessonFlow", newVal)}
                    options={LESSON_FLOW_OPTIONS}
                    placeholder="Select or type lesson flow logic..."
                  />
                </div>
                <div className="space-y-1">
                  <MultiSelectField 
                    label="Text References & Sourcing"
                    value={formData.references}
                    onChange={(newVal) => handleFieldChange("references", newVal)}
                    options={REFERENCES_OPTIONS}
                    placeholder="Select or type text references..."
                  />
                </div>
                <div className="space-y-1">
                  <MultiSelectField 
                    label="Classroom Physical Setup"
                    value={formData.setup}
                    onChange={(newVal) => handleFieldChange("setup", newVal)}
                    options={SETUP_OPTIONS}
                    placeholder="Circular team arrangements with visible pathways..."
                  />
                </div>
              </div>

              <div className="bg-white border-2 border-slate-900 p-4 rounded-xl space-y-3">
                <h3 className="text-xs font-black text-rose-800 border-b border-rose-100 pb-1">🎯 ASSESSMENT & WAYS FORWARD</h3>
                <div className="space-y-1">
                  <MultiSelectField 
                    label="Formative Assessment Plan"
                    value={formData.assessmentPlan}
                    onChange={(newVal) => handleFieldChange("assessmentPlan", newVal)}
                    options={ASSESSMENT_OPTIONS}
                    placeholder="Short matching game and peer concept review..."
                  />
                </div>
                  <div className="space-y-1">
                    <MultiSelectField 
                      label="Opportunities for Integration"
                      value={formData.integration}
                      onChange={(newVal) => handleFieldChange("integration", newVal)}
                      options={INTEGRATION_OPTIONS}
                      placeholder="Select or type integration opportunities..."
                    />
                  </div>
                  <div className="space-y-1">
                    <MultiSelectField 
                      label="Extended Assignments"
                      value={formData.extendedLearning}
                      onChange={(newVal) => handleFieldChange("extendedLearning", newVal)}
                      options={EXTENDED_OPTIONS}
                      placeholder="Select or type homework / extended assignments..."
                    />
                  </div>
                </div>

                {/* SIGNATURE CONFIG TABLE */}
                <div className="bg-pink-50/50 border-2 border-pink-200 p-4 rounded-xl space-y-3 md:col-span-3">
                  <h3 className="text-xs font-black uppercase text-pink-900 tracking-wider border-b border-pink-200 pb-1 mb-2">✍️ Authorized Mappings Sign-offs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="grid grid-cols-2 gap-2 text-slate-800">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Prepared By: Name</label>
                        <input type="text" value={formData.preparedBy} onChange={(e) => handleFieldChange("preparedBy", e.target.value)} className="w-full text-xs p-2 border-2 border-slate-900 rounded" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Position</label>
                        <input type="text" value={formData.preparedPosition} onChange={(e) => handleFieldChange("preparedPosition", e.target.value)} className="w-full text-xs p-2 border-2 border-slate-900 rounded" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Checked By: Name</label>
                        <input type="text" value={formData.checkedBy} onChange={(e) => handleFieldChange("checkedBy", e.target.value)} className="w-full text-xs p-2 border-2 border-slate-900 rounded" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Position</label>
                        <input type="text" value={formData.checkedPosition} onChange={(e) => handleFieldChange("checkedPosition", e.target.value)} className="w-full text-xs p-2 border-2 border-slate-900 rounded" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Approved By: Name</label>
                        <input type="text" value={formData.approvedBy} onChange={(e) => handleFieldChange("approvedBy", e.target.value)} className="w-full text-xs p-2 border-2 border-slate-900 rounded" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Position</label>
                        <input type="text" value={formData.approvedPosition} onChange={(e) => handleFieldChange("approvedPosition", e.target.value)} className="w-full text-xs p-2 border-2 border-slate-900 rounded" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* MATRIX & ARC MULTI-SESSION GENERATOR SETTING */}
              <div className="bg-purple-50/50 border-2 border-purple-200 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-6">
                <div>
                  <h4 className="text-xs font-black uppercase text-purple-900 tracking-wider flex items-center gap-1.5 matches-rule">
                    <Table className="w-3.5 h-3.5 text-purple-750" />
                    Table Generation Schema Mode
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">Choose between standard mapping or decomposing session learning arcs for multiple days.</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-xl border border-purple-150">
                  <button 
                    type="button"
                    onClick={() => setMatrixOption("4-session")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${matrixOption === "4-session" ? "bg-purple-700 text-white shadow" : "bg-transparent text-slate-600 hover:text-slate-900"}`}
                  >
                    🌱 4-Session Decomposed Arc
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMatrixOption("objective")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${matrixOption === "objective" ? "bg-purple-700 text-white shadow" : "bg-transparent text-slate-600 hover:text-slate-900"}`}
                  >
                    📌 Standard Objective Mapping
                  </button>
                </div>
              </div>

              {/* ACTION ROW UTILITIES */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 justify-end mt-4">
                <button 
                  onClick={() => {
                    if (!formData.topic) {
                      triggerAlert("Topic Required", "Please enter a lesson topic/title first before seeking AI generation.");
                      return;
                    }
                    handleAIBoostFields();
                  }}
                  disabled={isAIFieldLoading}
                  className="bg-red-700 text-white font-black px-6 py-2.5 rounded-xl border-2 border-slate-950 text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-red-850 disabled:opacity-50 flex items-center gap-1.5 transition-all text-white!"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-white ${isAIFieldLoading ? 'animate-spin' : ''}`} />
                  <span>{isAIFieldLoading ? "AI Generating..." : "✨ Generate Lesson Plan"}</span>
                </button>
                <button 
                  onClick={doGenerateLocalHtml}
                  className="bg-slate-900 text-white font-extrabold px-4 py-2.5 rounded-xl border-2 border-slate-950 text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-slate-800 text-white!"
                >
                  ⚙️ Update Local Format Preview
                </button>
                <button 
                  onClick={handleGenerateMatrixTable}
                  disabled={isMatrixLoading || !formData.objectives || !formData.objectives.trim()}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-black px-4 py-2.5 rounded-xl border-2 border-slate-950 text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 flex items-center gap-1.5 transition-all text-white!"
                >
                  <Table className={`w-3.5 h-3.5 text-white ${isMatrixLoading ? 'animate-spin' : ''}`} />
                  <span>{isMatrixLoading ? "Generating Matrix..." : "🗺️ Create Objective Matrix"}</span>
                </button>
                <button 
                  onClick={handleSaveLessonPlanToStore}
                  className="bg-red-900 text-white font-extrabold px-4 py-2.5 rounded-xl border-2 border-red-950 text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-red-950 text-white!"
                >
                  💾 Save Plan To Library
                </button>
                <button 
                  onClick={() => handleCopyText("lessonOutput")}
                  className="bg-white text-slate-800 font-extrabold px-4 py-2.5 rounded-xl border-2 border-slate-400 text-xs shadow-[2px_2px_0px_rgba(0,0,0,0.15)] hover:bg-slate-50"
                >
                  📋 Copy Text
                </button>
                <button 
                  onClick={() => handlePrintDocument("lessonOutputEditable")}
                  className="bg-yellow-500 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl border-2 border-slate-900 text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-yellow-600"
                >
                  🖨️ Print Landscape A4
                </button>
                <button 
                  onClick={() => handleDownloadWordFile(generatedHtml, `${formData.topic || "ILAW_Lesson_Plan"}`)}
                  className="bg-teal-600 text-white font-extrabold px-4 py-2.5 rounded-xl border-2 border-teal-950 text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-teal-700"
                >
                  ⬇️ Download MS Word .doc
                </button>
              </div>

            </div>

            {/* PRINT AREA CONTAINER WITH DIRECT EDITING CONTROLS */}
            <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-x-auto relative">
              <div className="absolute top-4 right-4 bg-rose-50 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded border border-rose-200 uppercase tracking-widest pointer-events-none no-print">
                Interactive A4 live Preview (Editable)
              </div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 border-b pb-1 no-print">
                📄 Direct HTML Output — Click Anywhere Inside the Grid to Type
              </h3>
              
              {/* PRINT CONTROLLER EXCELLENCE */}
              <div 
                key={previewKey}
                id="lessonOutputEditable" 
                contentEditable 
                className="outline-none focus:ring-4 focus:ring-rose-200 p-2 rounded max-w-full overflow-x-auto print:p-0"
                dangerouslySetInnerHTML={{ __html: generatedHtml }}
                onBlur={(e) => {
                  setGeneratedHtml(e.currentTarget.innerHTML);
                }}
              />
            </div>

            {/* OBJECTIVE-BASED MATRIX TABLE MAP */}
            {matrixTableHtml && (
              <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-4 md:col-span-1 lg:col-span-1 xl:col-span-1 mt-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-3 border-slate-100">
                  <div>
                    <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">Comprehensive curriculum layer</span>
                    <h3 className="font-black text-slate-900 mt-1 flex items-center gap-1.5 text-base">
                      🗺️ Objective-Based Matrix Map
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Mapped unique columns per specified learning objective without any repetition.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(matrixTableHtml);
                          triggerAlert("Copied Successfully", "Matrix table copied to clipboard!");
                        } catch (e) {
                          triggerAlert("Fallback Copy", "Fallback: Please highlight the table content to copy it.");
                        }
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-800 font-black px-3.5 py-1.5 border-2 border-slate-900 rounded-xl text-xs flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Matrix HTML</span>
                    </button>
                    <button 
                      onClick={() => handlePrintDocument("matrixOutputPrintable")}
                      className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black px-3.5 py-1.5 border-2 border-slate-900 rounded-xl text-xs flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Matrix</span>
                    </button>
                    <button 
                      onClick={() => handleDownloadWordFile(matrixTableHtml, `Objective_Matrix_${formData.topic || "Lesson"}`)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black px-3.5 py-1.5 border-2 border-slate-900 rounded-xl text-xs flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] text-white!"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .doc</span>
                    </button>
                  </div>
                </div>

                <div 
                  id="matrixOutputPrintable"
                  className="bg-white border-2 border-dashed border-purple-300 p-4 rounded-xl prose prose-sm max-w-none text-slate-800 overflow-x-auto min-h-[150px]"
                  contentEditable
                  onBlur={(e) => setMatrixTableHtml(e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ __html: matrixTableHtml }}
                />

                <div className="bg-purple-50 border border-purple-150 p-4 rounded-xl flex items-start gap-2.5 text-xs text-purple-950">
                  <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold mb-0.5">Determined Objective Mapping</h5>
                    <p className="leading-relaxed">
                      This matrix operates as a sub-grid mapping specific materials, pre-lesson, flow, integrations, and reflections tailored perfectly to each distinct objective list element. You can type anywhere in the table to modify cells manually.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== TAB: OBJECTIVES UNPACKER ==================== */}
        {activeTab === "unpacker" && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b-4 border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
                    🚨 DepEd Objectives Unpacker (MATATAG)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Deconstruct complex lesson standards into operational Knowledge, concrete Skills, progressive milestones, and master activity plans.
                  </p>
                </div>
                {unpackedResults.length > 0 && (
                  <button
                    onClick={handleUseUnpackedInPlanner}
                    className="bg-emerald-650 hover:bg-emerald-700 text-white border-2 border-slate-950 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>🚀 Export to ILAW Planner</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Inputs panel */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-teal-50/50 border-2 border-teal-200 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs font-black uppercase text-teal-900 tracking-wider flex items-center gap-1">
                      <span>📝 Target Subject & Grade Level</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                        <input
                          type="text"
                          value={unpackerSubject}
                          onChange={(e) => setUnpackerSubject(e.target.value)}
                          placeholder="e.g. English, Science"
                          className="w-full text-xs font-semibold p-2 border-2 border-slate-900 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Grade Level</label>
                        <input
                          type="text"
                          value={unpackerGrade}
                          onChange={(e) => setUnpackerGrade(e.target.value)}
                          placeholder="e.g. Grade 4"
                          className="w-full text-xs font-semibold p-2 border-2 border-slate-900 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-700">Paste complex standards or objectives to deconstruct:</label>
                    </div>
                    <textarea
                      rows={6}
                      value={unpackerInput}
                      onChange={(e) => setUnpackerInput(e.target.value)}
                      placeholder="e.g. EN4RC-Ia-2.2: Identify the main idea, key sentences, and supporting details in a given paragraph."
                      className="w-full text-xs font-medium p-3 border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleUnpackObjectives()}
                      disabled={isUnpacking}
                      className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-350 text-white border-2 border-slate-900 py-2.5 rounded-xl text-center text-xs font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isUnpacking ? (
                        <>
                          <Sparkles className="w-4 h-4 animate-spin" />
                          <span>AI Unpacking Standby...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-emerald-300" />
                          <span>⚡ Start AI Unpacking Analysis</span>
                        </>
                      )}
                    </button>
                  </div>

                  {unpackerError && (
                    <div className="bg-rose-50 border border-rose-300 p-2.5 rounded-xl text-rose-950 font-bold text-xs">
                      ⚠️ {unpackerError}
                    </div>
                  )}

                  {/* Preloaded Example Objectives (High educational quality) */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">💡 Try with MATATAG Examples:</h4>
                    <div className="space-y-1.5">
                      <button
                        onClick={() => {
                          const ex = "Identify the theme, setting, and characters in Filipino modern local folktales to outline basic story mountain points.";
                          setUnpackerInput(ex);
                          handleUnpackObjectives(ex);
                        }}
                        className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-teal-50/20 text-[10.5px] font-medium text-slate-700 transition-colors flex items-start gap-1.5"
                      >
                        <span className="text-teal-600 font-extrabold shrink-0">🇵🇭</span>
                        <span className="line-clamp-2">Theme & Setting in Filipino Modern Folktales</span>
                      </button>
                      <button
                        onClick={() => {
                          const ex = "Describe and demonstrate the properties of solid materials when bent, pressed, hammered, or cut safely with hand tools.";
                          setUnpackerInput(ex);
                          handleUnpackObjectives(ex);
                        }}
                        className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-teal-50/20 text-[10.5px] font-medium text-slate-700 transition-colors flex items-start gap-1.5"
                      >
                        <span className="text-teal-600 font-extrabold shrink-0">🔬</span>
                        <span className="line-clamp-2">Properties of Solid Materials under Force</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Results panel */}
                <div className="lg:col-span-8">
                  {isUnpacking ? (
                    <div className="h-[350px] flex flex-col items-center justify-center border-2 border-dashed border-teal-200 rounded-2xl bg-teal-50/10 space-y-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin"></div>
                        <Sparkles className="w-5 h-5 text-teal-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="text-center space-y-1 px-4">
                        <p className="text-xs font-black text-slate-800 animate-pulse">Running Cognitive Unpacker Engine...</p>
                        <p className="text-[10px] text-slate-500 font-medium">Deconstructing vocabulary, cognitive complexity levels, and formulating actionable milestone steps.</p>
                      </div>
                    </div>
                  ) : unpackedResults.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-teal-800 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                          🎯 Found {unpackedResults.length} deconstructed classroom objectives
                        </span>
                        <button
                          onClick={() => {
                            const combined = unpackedResults.map(r => {
                              return `Objective: ${r.original}\n- Simplified: ${r.simplifiedText}\n- Know: ${r.knowledge.join(", ")}\n- Do: ${r.skills.join(", ")}\n- Steps: ${r.milestones.join(" -> ")}\n- Activity: ${r.suggestedActivity}\n- Verification: ${r.assessmentIdea}`;
                            }).join("\n\n=========================\n\n");
                            navigator.clipboard.writeText(combined);
                            triggerAlert("Copied to Clipboard", "An operational breakdown of all objectives is copied to your clipboard!");
                          }}
                          className="text-[11px] font-black text-slate-650 hover:text-slate-950 flex items-center gap-1 border border-slate-300 rounded px-2 py-1 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy All Analyses</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {unpackedResults.map((result, idx) => (
                          <div key={idx} className="border-4 border-slate-900 rounded-xl p-5 space-y-4 bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                            {/* Accent line */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
                            
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <span className="bg-teal-100 text-teal-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Objective #{idx + 1}</span>
                                <h3 className="text-xs font-extrabold italic text-slate-800 mt-1 leading-relaxed">
                                  "{result.original}"
                                </h3>
                              </div>
                              <button
                                onClick={() => {
                                  let details = `Objective: ${result.original}\n\n[Plain Terms] ${result.simplifiedText}\n\n[Cognitive Knowledge Targets]\n${result.knowledge.map(k => `• ${k}`).join("\n")}\n\n[Instrumental Skills]\n${result.skills.map(s => `• ${s}`).join("\n")}\n\n[Step Milestones]\n${result.milestones.map((m, i) => `${i+1}. ${m}`).join("\n")}\n\n[Activity idea] ${result.suggestedActivity}\n\n[Assessment verify] ${result.assessmentIdea}`;
                                  navigator.clipboard.writeText(details);
                                  triggerAlert("Deconstructed Objective Copied", `Mastery steps for Objective #${idx+1} successfully stored in your system clipboard.`);
                                }}
                                className="bg-slate-50 hover:bg-slate-100 p-1.5 border border-slate-300 rounded hover:text-teal-700 transition-colors cursor-pointer"
                                title="Copy single objective breakdown"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Plain language summary */}
                            <div className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-lg">
                              <h4 className="text-[9.5px] font-black uppercase text-emerald-800 tracking-wider">🗣️ student-friendly terms (What this means in plain english)</h4>
                              <p className="text-xs text-emerald-950 font-semibold mt-1 leading-relaxed">
                                {result.simplifiedText}
                              </p>
                            </div>

                            {/* Know & Do grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Knowledge */}
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                                <h4 className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider">🧠 Cognitive Knowledge (Things to Know)</h4>
                                <ul className="space-y-1 pt-1.5">
                                  {result.knowledge.map((k, kIdx) => (
                                    <li key={kIdx} className="font-semibold text-slate-800 flex items-start gap-1.5 leading-relaxed text-[11px]">
                                      <span className="text-teal-500 mt-0.5 font-bold shrink-0">•</span>
                                      <span>{k}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {/* Skills */}
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                                <h4 className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider">🛠️ Technical Skills (Things to Do)</h4>
                                <ul className="space-y-1 pt-1.5">
                                  {result.skills.map((s, sIdx) => (
                                    <li key={sIdx} className="font-semibold text-slate-800 flex items-start gap-1.5 leading-relaxed text-[11px]">
                                      <span className="text-emerald-500 mt-0.5 font-bold shrink-0">•</span>
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Milestones timeline */}
                            <div className="bg-teal-50/20 border border-teal-150 p-3 rounded-lg space-y-2">
                              <h4 className="text-[9.5px] font-black uppercase text-teal-800 tracking-wider">⏱️ Suggested Scaffolding Milestones (Chronological Progression)</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                                {result.milestones.map((m, mIdx) => (
                                  <div key={mIdx} className="bg-white p-2 rounded border border-slate-200 flex items-start gap-1.5 text-[10.5px]">
                                    <span className="bg-teal-600 text-white font-extrabold w-4 h-4 rounded-full text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-sans">
                                      {mIdx + 1}
                                    </span>
                                    <span className="font-semibold text-slate-700 leading-relaxed">{m}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Activities and Assessment idea */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                              <div className="space-y-1">
                                <h4 className="text-[9.5px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                                  <span>✨ Recommended Active Learning Activity</span>
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-650 leading-relaxed bg-indigo-50/15 p-2.5 rounded border border-indigo-100">
                                  {result.suggestedActivity}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-[9.5px] font-black uppercase text-pink-700 tracking-wider flex items-center gap-1">
                                  <span>🎯 Mastery Formative check</span>
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-650 leading-relaxed bg-pink-50/15 p-2.5 rounded border border-pink-100">
                                  {result.assessmentIdea}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-slate-350 rounded-2xl bg-slate-50/50 text-center px-6">
                      <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
                      <h4 className="text-xs font-black text-slate-700 font-sans">Analyzer Workspace Empty</h4>
                      <p className="text-[10px] text-slate-400 font-medium max-w-[325px] mt-1 leading-relaxed">
                        Input or generate DepEd educational standard objectives in the left side panel to unpack their layers.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: LP CONVERTER ==================== */}
        {activeTab === "converter" && (
          <div className="space-y-6 animate-fade-in text-slate-800">
            
            {/* Segmented Mode Selector */}
            <div className="flex bg-slate-100 border-2 border-slate-900 rounded-xl p-1 max-w-lg shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <button
                type="button"
                onClick={() => setConverterSubTab("matatag")}
                className={`flex-1 text-center py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  converterSubTab === "matatag"
                    ? "bg-rose-600 text-white shadow-sm border border-slate-900"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                🔄 MATATAG & Core LP Converter
              </button>
              <button
                type="button"
                onClick={() => setConverterSubTab("architect")}
                className={`flex-1 text-center py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  converterSubTab === "architect"
                    ? "bg-pink-600 text-white shadow-sm border border-slate-900"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                ⚡ AI Test Architect Pro
              </button>
            </div>

            {converterSubTab === "matatag" ? (
              <>
                <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">🔄 MATATAG & Core LP Converter</h2>
                    <p className="text-xs text-slate-500 font-medium">Re-write any educational syllabus document or log instantly into DepEd aligned parameters (and back!). Powered by REELSYSTEM.</p>
                  </div>

                  {/* Standalone AI Test Architect Banner */}
                  <div className="mt-4 p-4 bg-pink-50 border-2 border-dashed border-pink-400 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl shrink-0">⚡</span>
                      <div>
                        <h4 className="font-extrabold text-xs text-pink-900 uppercase tracking-wider flex items-center gap-1">
                          <span>ReelSystem AI Test Architect Pro</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-1 font-medium">Instantly generate structured print-ready multiple-choice, true/false, and identification exams with automated answer sheets from lesson materials!</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConverterSubTab("architect")}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)] text-center whitespace-nowrap transition-all shrink-0 cursor-pointer"
                    >
                      Switch to Test Architect
                    </button>
                  </div>

                  {converterStatus && (
                    <div className="bg-pink-100 border-2 border-pink-500 p-3 rounded-xl text-pink-900 text-xs font-bold my-4 animate-pulse">
                      {converterStatus}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    
                    {/* Source Selection Parameter */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700">Source Format</label>
                      <select 
                        value={sourceFormat} 
                        onChange={(e) => setSourceFormat(e.target.value)}
                        className="w-full text-xs font-bold"
                      >
                        <option value="Lesson Exemplar">MATATAG Lesson Exemplar</option>
                        <option value="MATATAG DLL">MATATAG DLL (Daily Lesson Log)</option>
                        <option value="Traditional DLP">Traditional Detailed Lesson Plan (DLP)</option>
                        <option value="Daily Lesson Log (DLL)">Traditional Daily Lesson Log (DLL)</option>
                        <option value="ILAW Format">ILAW Format Block</option>
                      </select>
                    </div>

                    {/* Target Selection Parameter */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700">Target Output Format</label>
                      <select 
                        value={targetFormat} 
                        onChange={(e) => setTargetFormat(e.target.value)}
                        className="w-full text-xs font-bold"
                      >
                        <option value="ILAW Format">ILAW Format Template (Intentions, Experiences, Assessment, Forward)</option>
                        <option value="MATATAG DLL">MATATAG DLL (Daily Lesson Log Standard)</option>
                        <option value="Lesson Exemplar">MATATAG Lesson Exemplar Structure</option>
                        <option value="Traditional DLP">Traditional Detailed Lesson Plan (DLP)</option>
                      </select>
                    </div>

                    {/* FILE UPLOAD AND PASTE SOURCE CONTAINER */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-black text-slate-700 block">Upload Original Lesson Plan Document</label>
                      
                      {/* Neobrutalist File Upload drag drop Zone */}
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={handleButtonClick}
                        className={`border-4 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                          dragActive 
                            ? "border-rose-600 bg-rose-50" 
                            : "border-slate-350 bg-slate-50 hover:bg-rose-50 hover:border-rose-450"
                        }`}
                      >
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept=".txt,.json,.md,.html,.docx,.pdf,.png,.jpg,.jpeg,.webp"
                          onChange={handleUploadFileChange}
                          className="hidden" 
                        />
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Download className="w-8 h-8 text-rose-500 animate-pulse" />
                          <p className="text-xs font-extrabold text-slate-850">Drag & Drop Lesson File Here or Click to Browse Local Disk</p>
                          <p className="text-[10px] text-slate-450 font-black uppercase">Supports: DOCX, PDF, JPEG, PNG, WEBP, TXT, MD, HTML documents</p>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-bold text-slate-600 block">Or Paste Original Text Directly Below</label>
                        <textarea 
                          rows={10}
                          value={converterSourceText}
                          onChange={(e) => setConverterSourceText(e.target.value)}
                          placeholder="Paste original text here to edit or map into targeted educational structure..."
                          className="w-full text-xs p-3 font-semibold border-2 border-slate-900 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* OPTIONAL AI STYLING INSTRUCTIONS DROPDOWN + OTHERS SPECIFICATION */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-slate-700">Optional AI Styling Instructions</label>
                        <span className="text-[10px] text-slate-400 font-bold">Preset suggestions for formatting constraints</span>
                      </div>
                      
                      <select
                        value={aiStylingPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAiStylingPreset(val);
                          if (val !== "Others (Specify)..." && val !== "Standard / None") {
                            setConverterInstructions(val);
                          } else if (val === "Standard / None") {
                            setConverterInstructions("");
                          }
                        }}
                        className="w-full text-xs font-extrabold p-2.5 border-2 border-slate-950 rounded-xl bg-white"
                      >
                        <option value="Standard / None">Standard / None (Generate direct structural alignment)</option>
                        <option value="Focus heavily on integrated interactive group team gameplay and task check-ins.">Focus heavily on integrated interactive group team gameplay and task check-ins.</option>
                        <option value="Incorporate highly active science and technical priority vocabulary listings.">Incorporate highly active science and technical priority vocabulary listings.</option>
                        <option value="Reinforce MATATAG civic nationalism and empathy values integration throughout.">Reinforce MATATAG civic nationalism and empathy values integration throughout.</option>
                        <option value="Deepen critical thinking and reflective question scaffolds in checking.">Deepen critical thinking and reflective question scaffolds in checking.</option>
                        <option value="Others (Specify)...">Others (Specify)... (+ Custom specification box)</option>
                      </select>

                      {(aiStylingPreset === "Others (Specify)..." || aiStylingPreset === "Standard / None") && (
                        <input 
                          type="text"
                          value={converterInstructions}
                          onChange={(e) => setConverterInstructions(e.target.value)}
                          placeholder="Type custom instructions (e.g. Focus heavy on science vocabulary integration)..."
                          className="w-full text-xs p-3 border-2 border-slate-900 rounded-xl bg-white mt-1.5"
                        />
                      )}
                    </div>

                  </div>

                  {/* CONVERT TRIGGER CONTROLLER */}
                  <div className="flex justify-end gap-2 mt-6">
                    <button 
                      onClick={handleFormatConvert}
                      disabled={isConverting}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-6 py-3 rounded-2xl border-2 border-rose-950 text-sm shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isConverting ? "animate-spin" : ""}`} />
                      {isConverting ? "AI Engines Converting..." : "🔄 Convert Format Using AI"}
                    </button>
                  </div>

                </div>

                {/* CONVERTED OUTPUT DOCK */}
                {convertedResult && (
                  <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-3 border-slate-100">
                      <div>
                        <h3 className="font-black text-slate-900">📋 AI Translation Output</h3>
                        <p className="text-xs text-slate-500 font-medium">Review, copy, print or save your converted lesson plan format below.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => handleCopyText("convertedArea")}
                          className="bg-white hover:bg-slate-50 text-slate-800 font-black px-3.5 py-1.5 border-2 border-slate-900 rounded-xl text-xs flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Text</span>
                        </button>
                        <button 
                          onClick={() => handlePrintDocument("convertedAreaPrint")}
                          className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black px-3.5 py-1.5 border-2 border-slate-900 rounded-xl text-xs flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Output</span>
                        </button>
                        <button 
                          onClick={handleSaveConvertedToStore}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black px-3.5 py-1.5 border-2 border-rose-950 rounded-xl text-xs flex items-center gap-1 shadow-[2px_2px_0px_rgba(159,18,57,1)]"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Save in Library</span>
                        </button>
                        <button 
                          onClick={() => handleDownloadWordFile(convertedResult, `Converted_${sourceFormat}_To_${targetFormat}`)}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-black px-3.5 py-1.5 border-2 border-teal-950 rounded-xl text-xs flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,0.85)]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Word .doc</span>
                        </button>
                      </div>
                    </div>

                    <div 
                      id="convertedAreaPrint" 
                      className="bg-white border-2 border-dashed border-rose-300 p-5 rounded-xl min-h-[300px] overflow-x-auto text-slate-800 outline-none"
                      contentEditable
                      onBlur={(e) => setConvertedResult(e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: convertedResult }}
                    />

                    <div className="bg-pink-50 border border-pink-200 p-4 rounded-xl flex items-start gap-2.5 text-xs text-rose-950">
                      <Info className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                      <p className="font-semibold leading-relaxed">
                        <strong>Note:</strong> You can edit the converted text directly by typing anywhere inside the boxed window above. Once edited, click "Save in Library" to persist updates.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ==================== AI TEST ARCHITECT PRO TAB VIEW ==================== */
              <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-1.5">
                      <span className="text-pink-600">⚡</span>
                      <span>ReelSystem AI Test Architect Pro</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Create printable, beautifully styled A4 multi-modality exams from any curriculum document instantly.</p>
                  </div>
                  <a
                    href="/reelsystem-ai-test-architect-pro.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] text-center transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Launch Standalone A4 Workspace</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Guide column */}
                  <div className="lg:col-span-5 space-y-5">
                    
                    {/* Where to get key guide */}
                    <div className="bg-pink-50/55 border-2 border-pink-300 p-4 rounded-xl space-y-3">
                      <h4 className="font-black text-xs text-pink-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔑 Where to get Google Gemini API Key</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                        ReelSystem AI Test Architect Pro requires a free Google Gemini developer key to perform direct, high-speed, zero-latency content compiling.
                      </p>
                      <ol className="text-[11px] text-slate-700 space-y-2 pl-4 list-decimal font-medium">
                        <li>Go to <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-pink-600 underline font-black">Google AI Studio (aistudio.google.com)</a></li>
                        <li>Log in with any standard Google Workspace or Gmail account.</li>
                        <li>Click the blue <strong>"Get API Key"</strong> button at the top left of the dashboard.</li>
                        <li>Select <strong>"Create API Key"</strong> (you can choose a new or existing Google Cloud project).</li>
                        <li>Copy the generated code string and paste it into the credentials input of the compiler.</li>
                      </ol>
                    </div>

                    {/* Integrated features profile */}
                    <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                      <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider">🌟 Dynamic Features Matrix</h4>
                      <ul className="space-y-2 font-medium text-slate-700">
                        <li className="flex items-start gap-1.5">
                          <span className="text-pink-600 shrink-0">✔</span>
                          <p><strong>Table of Specifications (TOS) Ingestion:</strong> Bind a lesson TOS file to direct item difficulty splits automatically.</p>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-pink-600 shrink-0">✔</span>
                          <p><strong>Dropdown Modality Selectors:</strong> Build matching type, fill-in-the-blanks, identification, multiple-choice, or true/false formats.</p>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-pink-600 shrink-0">✔</span>
                          <p><strong>Offline Local Sync:</strong> Teacher Profile, School Name, and Lesson Subject parameters are automatically synced from local state.</p>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-pink-600 shrink-0">✔</span>
                          <p><strong>Standardized A4 Printing:</strong> Beautifully formatted print-ready sheets featuring a professional questionnaire and answer keys.</p>
                        </li>
                      </ul>
                    </div>

                  </div>

                  {/* Frame or quick access column */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-slate-900 flex-1 min-h-[350px] relative">
                      <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between text-slate-300 text-[10px] font-mono">
                        <span>Workspace Preview: /reelsystem-ai-test-architect-pro.html</span>
                        <div className="flex gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 block"></span>
                        </div>
                      </div>
                      <iframe
                        src="/reelsystem-ai-test-architect-pro.html"
                        className="w-full h-[380px] border-none bg-white"
                        title="AI Test Architect Live Panel"
                      />
                    </div>
                    <div className="bg-yellow-50 border-2 border-yellow-300 p-3 rounded-xl flex items-start gap-2.5 text-xs text-yellow-900 font-bold">
                      <span className="text-sm">💡</span>
                      <p className="leading-relaxed">
                        For the best editing and printing experience, click the <strong>"Launch Standalone A4 Workspace"</strong> button to open the application in a separate browser tab. This activates browser-native print presets tailored for crisp A4 paper!
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== TAB 4: REELSYSTEM AI GENERATORS WORKSPACE ==================== */}
        {activeTab === "generator" && (
          <div className="animate-fade-in text-slate-800">
            <AiGenerators formData={formData} />
          </div>
        )}

        {/* ==================== TAB 4B: REELSYSTEM BUBBLE ANSWER SHEET GENERATOR ==================== */}
        {activeTab === "bubblesheet" && (
          <div className="animate-fade-in text-slate-800">
            <BubbleSheetGenerator formData={formData} onFieldChange={handleFieldChange} />
          </div>
        )}

        {/* ==================== TAB 4C: REELSYSTEM ACADEMIC CITATION GENERATOR ==================== */}
        {activeTab === "citation" && (
          <div className="animate-fade-in text-slate-800">
            <CitationGenerator />
          </div>
        )}

        {/* ==================== TAB 5: SAVED PLANS LIBRARY ==================== */}
        {activeTab === "saved" && (
          <div className="md:grid md:grid-cols-3 gap-6 animate-fade-in text-slate-800">
            
            {/* SAVED FILES LISTING PANEL */}
            <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col h-[650px]">
              <div className="border-b pb-3 mb-4">
                <h2 className="text-lg font-black text-slate-900">💾 Library Collections</h2>
                <p className="text-xs text-slate-500 font-medium">Draft files stored in local browser state. Refresh to review or delete.</p>
              </div>

              {savedLessons.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="bg-rose-50 p-3 rounded-full border border-rose-100">
                    <FileText className="w-8 h-8 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">No plans saved yet</h4>
                    <p className="text-xs text-slate-500 max-w-[200px] mt-1">Design in 'ILAW Planner' or convert templates to fill your library catalog!</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("ilaw")}
                    className="bg-rose-600 text-white font-extrabold px-4 py-2 border-2 border-rose-950 rounded-xl text-xs hover:bg-rose-700 shadow-sm"
                  >
                    Create Lesson Plan Now
                  </button>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                  {savedLessons.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => handlePreviewSaved(item)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedSavedId === item.id 
                          ? "bg-rose-50 border-rose-600 shadow-md" 
                          : "bg-white border-slate-300 hover:border-rose-400"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate leading-tight">{item.title}</h4>
                          <span className="text-[10px] mt-1 inline-block bg-pink-100 text-pink-800 font-black rounded px-1 text-slate-500 capitalize">{item.type} plan</span>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteSaved(item.id, e)}
                          className="text-slate-400 hover:text-rose-600 shrink-0 p-1 rounded hover:bg-rose-50"
                          title="Delete plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-bold">
                        <span>Updated: {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                        {item.formData && (
                          <button 
                            onClick={(e) => handleLoadSavedToForm(item, e)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border px-2 py-1 rounded font-extrabold"
                            title="Load into active fields"
                          >
                            Load Fields
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LIVE DOCUMENT VIEWING SUITE */}
            <div className="lg:col-span-2 mt-6 md:mt-0">
              <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col h-[650px]">
                
                {selectedSavedId && savedPreviewContent ? (
                  <div className="flex flex-col h-full">
                    {/* Toolbar header */}
                    <div className="border-b pb-3 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shrink-0">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-none">📋 Viewer Preview Pane</h3>
                        <span className="text-[10px] text-slate-400 font-bold">Directly edit print styles visually inside the draft</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button 
                          onClick={() => handleCopyText("savedPreview")}
                          className="bg-white hover:bg-slate-50 text-slate-800 border px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Raw Text</span>
                        </button>
                        <button 
                          onClick={() => handlePrintDocument("savedPreviewEditable")}
                          className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 border px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Direct Print</span>
                        </button>
                        <button 
                          onClick={() => handleDownloadWordFile(savedPreviewContent, "Library_Export")}
                          className="bg-teal-600 hover:bg-teal-700 text-white border px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export Word</span>
                        </button>
                      </div>
                    </div>

                    {/* Preview Scrollable Screen */}
                    <div className="flex-grow overflow-y-auto border-2 border-dashed border-rose-300 p-3 bg-white rounded-xl">
                      <div 
                        key={selectedSavedId || ""}
                        id="savedPreviewEditable"
                        contentEditable
                        className="outline-none focus:ring-2 focus:ring-rose-200"
                        dangerouslySetInnerHTML={{ __html: savedPreviewContent }}
                        onBlur={(e) => {
                          // Update HTML state live
                          const index = savedLessons.findIndex(f => f.id === selectedSavedId);
                          if (index !== -1) {
                            const updated = [...savedLessons];
                            updated[index].content = e.currentTarget.innerHTML;
                            updated[index].updatedAt = new Date().toISOString();
                            setSavedLessons(updated);
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
                            setSavedPreviewContent(e.currentTarget.innerHTML);
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <Info className="w-12 h-12 text-rose-300" />
                    <div>
                      <h4 className="font-extrabold text-slate-900">Select a lesson plan</h4>
                      <p className="text-xs text-slate-400 max-w-[240px] mt-1">Select a saved document from the list on the left to display its full layout, printable formats, and direct text editors here.</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 6: PROFILE SETUP ==================== */}
        {activeTab === "profile" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-800">
            {/* HERO PANEL */}
            <div className="bg-gradient-to-r from-pink-700 to-pink-950 border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(15,23,42,1)] text-white space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
                  <User className="w-6 h-6 text-rose-200" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">👤 Teacher & School Profile Controller</h2>
                  <p className="text-xs text-rose-100 font-medium">Configure institution parameters and signing configurations. Saved parameters are applied to both the ILAW Planner and LP Converter.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-6">
              {/* SECTION 1: PERSONAL & INSTITUTION INFORMATION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-pink-100 pb-2">
                  <Landmark className="w-5 h-5 text-pink-800" />
                  <h3 className="text-sm font-black uppercase text-pink-950 tracking-wider">🏫 School & Class Metadata</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">Teacher Name</label>
                    <input 
                      type="text" 
                      value={formData.teacherName} 
                      onChange={(e) => handleFieldChange("teacherName", e.target.value)} 
                      className="w-full text-xs p-3 border-2 border-slate-900 rounded-lg bg-pink-50/20 font-bold focus:outline-none focus:bg-white focus:border-red-600 transition-all shadow-sm" 
                      placeholder="e.g. Teacher Maria Santos"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">School Name</label>
                    <input 
                      type="text" 
                      value={formData.schoolName} 
                      onChange={(e) => handleFieldChange("schoolName", e.target.value)} 
                      className="w-full text-xs p-3 border-2 border-slate-900 rounded-lg bg-pink-50/20 font-bold focus:outline-none focus:bg-white focus:border-red-600 transition-all shadow-sm" 
                      placeholder="e.g. Rizal Elementary School"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">Grade Level</label>
                    <input 
                      type="text" 
                      value={formData.gradeLevel} 
                      onChange={(e) => handleFieldChange("gradeLevel", e.target.value)} 
                      className="w-full text-xs p-3 border-2 border-slate-900 rounded-lg bg-pink-50/20 font-bold focus:outline-none focus:bg-white focus:border-red-600 transition-all shadow-sm" 
                      placeholder="e.g. Grade 4"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">Subject / Learning Area</label>
                    <input 
                      type="text" 
                      value={formData.subject} 
                      onChange={(e) => handleFieldChange("subject", e.target.value)} 
                      className="w-full text-xs p-3 border-2 border-slate-900 rounded-lg bg-pink-50/20 font-bold focus:outline-none focus:bg-white focus:border-red-600 transition-all shadow-sm" 
                      placeholder="e.g. English"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 1.5: OFFICIAL SCHOOL LOGO SETUP */}
              <div className="space-y-4 border-t-2 border-pink-100 pt-6">
                <div className="flex items-center gap-2 border-b-2 border-pink-100 pb-2">
                  <span className="text-sm">🖼️</span>
                  <h3 className="text-sm font-black uppercase text-pink-950 tracking-wider">Official School Logo Setup</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 min-h-[140px]">
                    {schoolLogo ? (
                      <div className="text-center space-y-3">
                        <img 
                          src={schoolLogo} 
                          alt="School Logo Preview" 
                          className="w-24 h-24 object-contain rounded-lg border-2 border-slate-900 bg-white p-1.5 shadow-md mx-auto"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-extrabold px-3 py-1 rounded-lg text-[10px] border border-red-300 transition-all cursor-pointer"
                        >
                          ❌ Remove Logo
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 space-y-2">
                        <div className="text-3xl">🏫</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider">No Logo Uploaded</div>
                        <p className="text-[9px] text-slate-500 leading-normal max-w-[150px]">Upload a custom institution seal to sync on plans.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-black text-slate-700 block">Upload Official Logo File</label>
                    <div className="flex items-center gap-3">
                      <label className="bg-pink-700 hover:bg-pink-800 text-white font-black px-4 py-2.5 rounded-xl text-xs border-2 border-pink-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-y-[-1px] transition-all flex items-center gap-1.5 active:translate-y-[1px]">
                        <span>📂 Select Image</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUploadClick} 
                          className="hidden" 
                        />
                      </label>
                      <div className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                        Select JPG, PNG, GIF, or WebP. Re-scales dynamically using secure client-side canvas downsampling for ideal, lightweight print synchronization.
                      </div>
                    </div>
                    {schoolLogo && (
                      <div className="bg-teal-50 border border-teal-200 p-2.5 rounded-lg text-[10px] text-teal-950 flex items-center gap-2">
                        <span className="text-xs">✨</span>
                        <span><strong>Logo Synced!</strong> Double-logo headers will automatically appear on standard ILAW matrices and LP Converter printed sheets.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: AUTHORIZATION SIGN-OFFS CARD */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-pink-100 pb-2">
                  <FileCode className="w-5 h-5 text-pink-800" />
                  <h3 className="text-sm font-black uppercase text-pink-950 tracking-wider">✍️ Authorized Mappings Sign-offs</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {/* PREPARED BY */}
                  <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl">
                    <h4 className="text-xs font-black text-slate-800 uppercase mb-2">1. Prepared & Written By (Teacher)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">FullName Name</label>
                        <input 
                          type="text" 
                          value={formData.preparedBy} 
                          onChange={(e) => handleFieldChange("preparedBy", e.target.value)} 
                          className="w-full text-xs p-2.5 border-2 border-slate-900 rounded-lg font-bold bg-white" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Official Position</label>
                        <input 
                          type="text" 
                          value={formData.preparedPosition} 
                          onChange={(e) => handleFieldChange("preparedPosition", e.target.value)} 
                          className="w-full text-xs p-2.5 border-2 border-slate-900 rounded-lg font-bold bg-white" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* CHECKED BY */}
                  <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl">
                    <h4 className="text-xs font-black text-slate-800 uppercase mb-2">2. Checked & Reviewed By (Coordinator / Master Teacher)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">FullName Name</label>
                        <input 
                          type="text" 
                          value={formData.checkedBy} 
                          onChange={(e) => handleFieldChange("checkedBy", e.target.value)} 
                          className="w-full text-xs p-2.5 border-2 border-slate-900 rounded-lg font-bold bg-white" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Official Position</label>
                        <input 
                          type="text" 
                          value={formData.checkedPosition} 
                          onChange={(e) => handleFieldChange("checkedPosition", e.target.value)} 
                          className="w-full text-xs p-2.5 border-2 border-slate-900 rounded-lg font-bold bg-white" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* APPROVED BY */}
                  <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl">
                    <h4 className="text-xs font-black text-slate-800 uppercase mb-2">3. Approved & Endorsed By (Principal / OIC)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">FullName Name</label>
                        <input 
                          type="text" 
                          value={formData.approvedBy} 
                          onChange={(e) => handleFieldChange("approvedBy", e.target.value)} 
                          className="w-full text-xs p-2.5 border-2 border-slate-900 rounded-lg font-bold bg-white" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Official Position</label>
                        <input 
                          type="text" 
                          value={formData.approvedPosition} 
                          onChange={(e) => handleFieldChange("approvedPosition", e.target.value)} 
                          className="w-full text-xs p-2.5 border-2 border-slate-900 rounded-lg font-bold bg-white" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION SAVE BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t-2 border-red-50 pt-4">
                <div className="text-xs font-bold text-slate-500">
                  🚀 Local data will auto-generate in formatting blocks.
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleClearHeaders}
                    className="flex-1 sm:flex-initial bg-white text-slate-800 border-2 border-slate-900 px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-50 active:translate-y-0.5 transition-all"
                  >
                    🧹 Reset Default Profile
                  </button>
                  <button 
                    onClick={handleSaveHeaders}
                    className="flex-1 sm:flex-initial bg-red-800 text-white border-2 border-red-950 shadow-[3px_3px_0px_rgba(0,0,0,1)] px-8 py-2.5 rounded-xl font-black text-xs hover:bg-red-900 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Teacher Profile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* DOCUMENTATION EXPLANATION CARD */}
            <div className="bg-rose-50 border-2 border-rose-200 p-5 rounded-2xl flex gap-3">
              <Info className="w-5 h-5 text-pink-800 shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-800">
                <h4 className="font-extrabold text-xs text-pink-950 uppercase">Auto-Generation Rules & Direct Sync</h4>
                <p className="text-[11px] leading-relaxed">
                  Saving details here automatically persists them in the browser's disk space. Next time you open the 
                  <strong>ILAW Planner</strong> or trigger a translation in the <strong>LP Converter</strong>, these credentials 
                  will automatically be included in headers and formatted sign-off tables at the bottom of the weekly plans.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 7: SUPPORT & DONATE ==================== */}
        {activeTab === "support" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-800">
            {/* HERO PANEL */}
            <div className="bg-gradient-to-r from-pink-700 to-pink-950 border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(15,23,42,1)] text-white space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
                  <Heart className="w-6 h-6 text-rose-200 fill-rose-200 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">💖 Support & Server Donation</h2>
                  <p className="text-xs text-rose-100 font-medium">REEL IN ONE is a free educational suite. Help keep these high-performance AI engines running for Filipino teachers!</p>
                </div>
              </div>
            </div>

            {/* DESCRIPTION EXPLANATION */}
            <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-6">
              <p className="text-xs font-medium leading-relaxed">
                Hello, fellow educators! REEL IN ONE is a entirely free educational resource developed with tailored format compilers, 
                high-performance lesson translators, and Google Search grounded AI pipelines — customized specifically for standard DepEd architectures. 
                Running these models and servers continuously requires real resources. 
                If this suite has saved you hours of writing lesson exemplars, DLLs, and planners, please consider support to keep services 100% active and free!
              </p>

              {/* QR CONTROLLERS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* GCASH CARD */}
                <div className="border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_rgba(15,23,42,1)] bg-sky-550 flex flex-col justify-between" style={{ backgroundColor: "#0156f4" }}>
                  <div className="p-4 text-white text-center space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-wide">📱 GCash / InstaPay</h3>
                    <p className="text-[10px] opacity-90 font-bold">SCAN TO TRANSFER OR PAY INSTANTLY</p>
                  </div>
                  
                  <div className="p-4 bg-white mx-4 rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-sm">
                    <img 
                      src="/src/assets/images/gcash_qr_new_1781924707682.jpg" 
                      alt="GCash QR Code" 
                      className="w-full max-w-[240px] aspect-square object-contain rounded-lg shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="p-4 space-y-3 bg-white border-t-4 border-slate-900 mt-4 text-center">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">GCash Account Name</span>
                      <p className="text-sm font-black text-slate-900">JMBEE (JE****L B.)</p>
                    </div>

                    <div className="bg-sky-50 border-2 border-sky-300 p-2 rounded-lg flex items-center justify-between gap-2 max-w-[280px] mx-auto">
                      <code className="text-xs font-black text-sky-950 font-mono">0966 702 7218</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText("09667027218");
                          triggerAlert("Copied", "📋 GCash number copied to clipboard: 09667027218");
                        }}
                        className="bg-sky-600 hover:bg-sky-700 active:scale-95 text-white border border-sky-800 text-[10px] py-1 px-2.5 rounded font-bold transition-all flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* PAYPAL CARD */}
                <div className="border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_rgba(15,23,42,1)] bg-slate-50 flex flex-col justify-between">
                  <div className="p-4 bg-white border-b-4 border-slate-900 text-center space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-wide text-red-950">💳 PayPal / Card</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">International & Digital Card Transfers</p>
                  </div>
                  
                  <div className="p-4 bg-white mx-4 mt-4 rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-sm">
                    <img 
                      src="/src/assets/images/paypal_qr_new_1781924693963.jpg" 
                      alt="PayPal QR Code" 
                      className="w-full max-w-[240px] aspect-square object-contain rounded-lg shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="p-4 space-y-3 mt-4 text-center">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">PayPal Handle</span>
                      <p className="text-sm font-black text-rose-950">Jezreel Buguina</p>
                    </div>

                    <a 
                      href="https://paypal.me/jezreelbuguina" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-pink-700 hover:bg-pink-800 active:scale-95 text-white border-2 border-pink-950 text-xs py-2 px-4 rounded-xl font-black shadow-sm transition-all inline-flex items-center gap-1.5"
                    >
                      <span>Pay / Donate via PayPal Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

              </div>

              {/* COFFEE APPRECIATION FOOTER */}
              <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl flex items-center gap-3">
                <Coffee className="w-5 h-5 text-amber-800 shrink-0" />
                <p className="text-[11px] leading-relaxed text-amber-950 font-medium">
                  Your tiny cup of coffee has a massive impact! 100% of these contributions are allocated strictly toward cloud hosting limits, API key usage credits, and developer tools licensing. Thank you for your kindness!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 9: LIVE FEEDBACK ==================== */}
        {activeTab === "feedback" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-800">
            {/* HERO PANEL */}
            <div className="bg-gradient-to-r from-pink-700 to-pink-950 border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(15,23,42,1)] text-white space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
                  <MessageSquare className="w-6 h-6 text-pink-200 fill-pink-100/10" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">💬 Live Community Feedback</h2>
                  <p className="text-xs text-rose-100 font-medium">We appreciate your feedback! Share your user rating and review on our live public feed.</p>
                </div>
              </div>
            </div>

            {/* INTEGRATED FEEDBACK PANEL */}
            <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-8">
              <FeedbackSection mode="form" />
              <div className="border-t-2 border-slate-100 pt-6">
                <FeedbackSection mode="full" />
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 8: ABOUT & GUIDE ==================== */}
        {activeTab === "about" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-800">
            {/* HERO PANEL */}
            <div className="bg-gradient-to-r from-pink-700 to-pink-950 border-4 border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0px_rgba(15,23,42,1)] text-white space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
                  <HelpCircle className="w-6 h-6 text-rose-200" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">📘 About & Complete User Guide</h2>
                  <p className="text-xs text-rose-100 font-medium">Learn how to maximize your teaching efficiency with REEL IN ONE's smart educational suite.</p>
                </div>
              </div>
            </div>

            {/* MANUAL GUIDE BODY */}
            <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-base font-black text-pink-950 uppercase border-b-2 border-pink-50 pb-2">🎯 How to Use REEL IN ONE</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* MODULE 1 */}
                  <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">Primary Setup</span>
                    <h4 className="font-extrabold text-sm text-slate-900">1. Dashboard & Profile Setup</h4>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      Begin by saving your teacher credentials and school metadata in the <strong>Profile Setup</strong> tab. 
                      Once saved, these variables automatically synchronize and apply themselves in all future plans and converted tables.
                    </p>
                  </div>

                  {/* MODULE 2 */}
                  <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">ILAW Planner</span>
                    <h4 className="font-extrabold text-sm text-slate-900">2. Generate the ILAW framework</h4>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      Use the <strong>ILAW Planner</strong> to construct professional, highly cohesive, multi-session plans. 
                      Type your topic or select the scaffolding options, and watch the compiler generate customized pre-lessons, daily teacher review logs, and assessment metrics.
                    </p>
                  </div>

                  {/* MODULE 3 */}
                  <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">LP Converter</span>
                    <h4 className="font-extrabold text-sm text-slate-900">3. Format Conversion Engine</h4>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      Have an old Lesson Exemplar, MATATAG DLL, or traditional DLP plan? Paste its text into the **LP Converter**, 
                      select your source and target formats (to/from ILAW, MATATAG Daily Lesson Logs, etc.), and receive a perfectly reformatted output with instant sign-off blocks.
                    </p>
                  </div>

                  {/* MODULE 4 */}
                  <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">Grounding Search</span>
                    <h4 className="font-extrabold text-sm text-slate-900">4. Live Search Grounding</h4>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      Use the **Search Assistant** to dynamically query public portals, check active DepEd directives, research educational games, and find syllabus references live from the web.
                    </p>
                  </div>

                </div>
              </div>

              {/* OUTSTANDING PROJECT BY THE DEVELOPER */}
              <div className="border-4 border-slate-900 p-6 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-100 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚀</span>
                  <h4 className="text-sm font-black text-pink-950 uppercase tracking-wide">Featured Project by the Developer</h4>
                </div>
                
                <div className="space-y-2">
                  <h5 className="font-black text-rose-900 text-lg">🎮 REEL Workshop Play Hub</h5>
                  <p className="text-xs leading-relaxed text-slate-700">
                    Take your classroom activities to the next level! <strong>REEL Workshop Play Hub</strong> is another incredible educational toolkit designed by the same developer. It features interactive gamification templates, physics simulation generators, vocabulary matching cards, and lesson visual sandboxes custom-built to keep students highly engaged.
                  </p>
                </div>

                <div className="pt-2">
                  <a 
                    href="https://reel-workshop-play.base44.app" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 active:translate-y-0.5 text-white border-2 border-slate-950 shadow-[3px_3px_0px_rgba(153,27,27,1)] px-6 py-2.5 rounded-xl font-extrabold text-xs transition-all inline-flex items-center justify-center gap-2"
                  >
                    <span>Launch REEL Workshop Play Hub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* DATA PRIVACY POLICY AND COMPLIANCE NOTICE */}
              <div className="border-4 border-slate-900 p-6 rounded-2xl bg-white space-y-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] text-slate-800">
                <div className="flex items-center gap-2 border-b-2 border-pink-100 pb-2">
                  <span className="text-xl">🔒</span>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-pink-950 uppercase tracking-wider">Data Privacy Policy: REEL IN ONE</h4>
                    <p className="text-[10px] text-slate-400 font-bold bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full inline-block">Effective Date: June 20, 2026</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs font-medium leading-relaxed text-slate-700">
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase">1. Introduction and Compliance</h5>
                    <p className="text-slate-650">REEL IN ONE, a suite by REELSYSTEM, is committed to protecting the fundamental human right to privacy and communication. We process personal data in full compliance with the Data Privacy Act (DPA) of 2012 and the guidelines issued by the National Privacy Commission.</p>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase">2. Data Collection and Purpose</h5>
                    <p className="text-slate-650">We collect information only for specified, legitimate purposes.</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-[11px] text-slate-600">
                      <li><strong>Personal Data:</strong> We collect teacher credentials, school metadata, and account information provided via "Profile Setup".</li>
                      <li><strong>Educational Content:</strong> Data entered into the "ILAW Planner" (topics, scaffolding options) is processed to generate lesson plans and assessment metrics.</li>
                      <li><strong>Technical Data:</strong> We collect metadata, including IP addresses and cookie session data, to maintain system security and performance.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase">3. Data Privacy Principles</h5>
                    <p className="text-slate-650">Our operations are governed by three core principles:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-[11px] text-slate-600">
                      <li><strong>Transparency:</strong> You are informed of the nature, purpose, and extent of data processing.</li>
                      <li><strong>Legitimate Purpose:</strong> Processing is compatible with our educational goals and is not contrary to law.</li>
                      <li><strong>Proportionality:</strong> We collect only what is adequate, relevant, and necessary for the function of the application.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase">4. Security Measures</h5>
                    <p className="text-slate-650">To protect your data against natural and human threats (e.g., unauthorized access or fraud), we implement:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-[11px] text-slate-600">
                      <li><strong>Organizational:</strong> Role-based access control and regular privacy awareness.</li>
                      <li><strong>Technical:</strong> Encryption for data in transit (SSL/TLS) and at rest, alongside firewall protection.</li>
                      <li><strong>Physical:</strong> Secure server environments for hosted data.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase">5. Your Rights as a Data Subject</h5>
                    <p className="text-slate-650">Under the DPA, you have the right to:</p>
                    <ul className="list-disc pl-5 mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <li>• Be informed of the processing of your data.</li>
                      <li>• Access the personal data we hold about you.</li>
                      <li>• Correct inaccurate or incomplete data.</li>
                      <li>• Erase or block your data when no longer necessary.</li>
                      <li>• Data Portability to obtain and move your data.</li>
                      <li>• Lodge complaints with the National Privacy Commission.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase">6. Student Data Privacy Notice</h5>
                    <p className="text-slate-650 bg-rose-50 border border-rose-150 p-3 rounded-xl text-slate-700 italic">
                      <strong>⚠️ Attention Educators:</strong> As an educator, you are the controller of your classroom information. You must not input sensitive personal information of students (e.g., full names, health records, or government IDs) into the "ILAW Planner" or any dashboard fields. It is your responsibility to sanitize all inputs to ensure learner privacy.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase">7. Data Retention and Disclosure</h5>
                    <p className="text-slate-650"><strong>Retention:</strong> Data is kept only for as long as necessary to fulfill its purpose or comply with legal requirements.</p>
                    <p className="text-slate-650 mt-1"><strong>Third-Party Sharing:</strong> We do not sell your personal information. Third-party service providers (e.g., cloud hosting) are bound by strict Data Sharing Agreements (DSAs) to ensure DPA compliance.</p>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase">8. Contact Us</h5>
                    <p className="text-slate-650">For inquiries regarding your data or to exercise your rights, please use the "Support & Donate" link within the app. You may also contact our designated Data Protection Officer via the support interface.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* SYSTEMFOOT METRICS */}
      <footer className="bg-slate-900 border-t-4 border-rose-600 text-white py-6 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-sm font-extrabold tracking-wide uppercase">REEL IN ONE • POWERED BY REELSYSTEM</p>
          <p className="text-xs text-slate-400 font-medium">
            Standard DepEd ILAW Mapped Planner & Lesson Format Translators • Approved for General School Networks
          </p>
          <div className="text-[10px] text-slate-500 font-extrabold pt-2 flex justify-center gap-4">
            <span>NETWORK: ONLINE</span>
            <span>DATA SOURCE: GROUNDED WEB SEARCH ACTIVE</span>
            <span>SECURE SYSTEM</span>
          </div>
        </div>
      </footer>

      {/* CUSTOM OVERLAY CONFIRMATION DIALOG */}
      {confirmAction && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white border-4 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-md w-full mx-4 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b-4 border-slate-900 pb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-md font-black text-rose-950 uppercase tracking-widest">Confirm Action</h3>
            </div>
            <p className="text-xs font-bold text-slate-700 leading-relaxed">
              {confirmAction.message}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 rounded-xl transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 border-2 border-slate-900 rounded-xl transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none cursor-pointer"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM OVERLAY ALERT DIALOG */}
      {alertModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print">
          <div className={`bg-white border-4 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_rgba(0,0,0,1)] ${alertModal.errCode ? 'max-w-md' : 'max-w-sm'} w-full mx-4 space-y-4 animate-in zoom-in-95 duration-150`}>
            <div className="flex items-center gap-2.5 border-b-4 border-slate-900 pb-2.5">
              <span className="text-xl">
                {alertModal.errCode === "503" ? "⚡" : alertModal.errCode === "403" ? "🔒" : "✨"}
              </span>
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest">{alertModal.title}</h3>
            </div>
            <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
              {alertModal.message}
            </p>

            {/* How-To-Fix Block for 503 Service Unavailable */}
            {alertModal.errCode === "503" && (
              <div className="bg-amber-50 border-2 border-amber-500 rounded-2xl p-4 space-y-2 text-[11px] text-amber-950">
                <div className="font-extrabold uppercase tracking-wide flex items-center gap-1.5 text-amber-900">
                  <Info className="w-3.5 h-3.5" />
                  <span>Tools & Outage Recovery Instructions:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 ml-0.5 font-semibold text-slate-800">
                  <li><strong className="text-amber-950 font-black">Retry immediately:</strong> Click the generator button again (often works directly on retry).</li>
                  <li><strong className="text-amber-950 font-black">Polite cooldown:</strong> Pause 5 to 10 seconds to let the busy queue clear.</li>
                  <li><strong className="text-amber-950 font-black">Avoid mass uploads:</strong> Minimize simultaneous heavy image or large file uploads.</li>
                  <li><strong className="text-amber-950 font-black">Model outage check:</strong> Upstream Gemini servers may be encountering a temporary public outage.</li>
                </ol>
              </div>
            )}

            {/* How-To-Fix Block for 403 Permission Denied */}
            {alertModal.errCode === "403" && (
              <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 space-y-2 text-[11px] text-rose-950">
                <div className="font-extrabold uppercase tracking-wide flex items-center gap-1.5 text-rose-900">
                  <Info className="w-3.5 h-3.5" />
                  <span>Credential Permission Fix Instructions:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 ml-0.5 font-semibold text-slate-800">
                  <li><strong className="text-rose-950 font-black">API Key Scope Check:</strong> Confirm your key has allowed scopes to execute model queries.</li>
                  <li><strong className="text-rose-950 font-black">Disable Network Restrictions:</strong> Disable VPN/firewalls that might block secure API handshakes.</li>
                  <li><strong className="text-rose-950 font-black">Bypass Multimodal Uploads:</strong> If file parsing failed, copy and paste raw text content into the text block directly instead!</li>
                  <li><strong className="text-rose-950 font-black">Regenerate Key:</strong> Visit Google AI Studio to create and set a brand-new API key.</li>
                </ol>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setAlertModal(null)}
                className="px-5 py-2.5 text-xs font-extrabold text-pink-950 bg-pink-100 hover:bg-pink-200 border-2 border-slate-900 rounded-xl transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

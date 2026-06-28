import React, { useState, useEffect } from "react";
import { 
  Brain, 
  FileText, 
  Printer, 
  Sparkles, 
  Trash2, 
  Plus, 
  HelpCircle, 
  Languages, 
  Settings, 
  AlertCircle,
  FileCode,
  Download,
  CheckCircle,
  Loader2,
  Table,
  BookOpen,
  Shuffle,
  Grid,
  Search,
  Award
} from "lucide-react";
import { TOSEntry, RubricData, RubricRow, RubricScaleLevel } from "../types";

const TOS_TRANSLATIONS = {
  en: {
    schoolName: "School Name",
    subjectArea: "Subject Area",
    gradeLevel: "Grade Level",
    quarter: "Quarter",
    examItems: "Exam Items",
    framework: "Taxonomy Framework",
    competency: "Learning Competency Focus",
    daysTaught: "Days Taught",
    weight: "Weight %",
    allocatedItems: "Allocated Items",
    lots: "Lower Order (LOTS)",
    hots: "Higher Order (HOTS)",
    placement: "Item Placement",
    actions: "Actions",
    preparedBy: "Prepared by:",
    checkedBy: "Checked by:",
    approvedBy: "Approved by:",
    blueprintTitle: "Table of Specifications (TOS) Blueprint",
    depedHeader: "DEPARTMENT OF EDUCATION",
    totalBlueprint: "TOTAL BLUEPRINT",
    addComp: "Add Competency Focus",
    noComp: "No competencies listed yet. Click 'Generate AI TOS' or add custom ones!",
    customAdjust: "MANUAL ENTRY ADJUSTMENTS",
    customLabel: "Custom Competency Line",
    addManual: "ADD MANUAL ROW",
    aiEngine: "AI TOS Engine",
    aiDesc: "Specify assessment criteria and let Gemini design mathematically balanced Bloom's cognitive item domains.",
    curriculumPlaceholder: "Enter syllabus bullet points, textbook topics, or custom chapters...",
    generateBtn: "GENERATE AI TOS BLUEPRINT MATRIX",
    synthesizing: "SYNTHESIZING MATRIX BLUEPRINT...",
    printBtn: "PRINT PREVIEW / LANDSCAPE",
    exportBtn: "EXPORT TO WORD DOCX",
    totalDays: "Total Instruction Days",
    lotsTitle: "Cognitive Process Dimensions",
    lotsGroup: "Knowledge / Skills Structure",
    clearance: "CLEARANCE & SIGN-OFFS",
    addBtn: "ADD NEW COMPETENCY",
    compCount: "Comp. Count",
    manComp: "Learning Competencies (Edit / Manage Rows)"
  },
  tl: {
    schoolName: "Pangalan ng Paaralan",
    subjectArea: "Asignatura",
    gradeLevel: "Antas ng Baitang",
    quarter: "Markahan",
    examItems: "Kabuuang Aytem",
    framework: "Balangkas ng Taxonomy",
    competency: "Kasanayan sa Pagkatuto",
    daysTaught: "Araw ng Pagtuturo",
    weight: "Timbang %",
    allocatedItems: "Inilaang Aytem",
    lots: "Mas Mababang Pag-iisip (LOTS)",
    hots: "Mas Mataas na Pag-iisip (HOTS)",
    placement: "Paglalagay ng Aytem",
    actions: "Mga Aksyon",
    preparedBy: "Inihanda ni:",
    checkedBy: "Sinuri ni:",
    approvedBy: "Inaprubahan ni:",
    blueprintTitle: "Talahanayan ng Espisipikasyon (TOS)",
    depedHeader: "KAGAWARAN NG EDUKASYON",
    totalBlueprint: "KABUUANG PLANO NG TOS",
    addComp: "Magdagdag ng Kasanayan",
    noComp: "Wala pang nakatalang kasanayan. Pindutin ang 'Gumawa ng AI TOS' o magdagdag ng bago!",
    customAdjust: "MANWAL NA MGA PAGBABAGO",
    customLabel: "Pahayag ng Kasanayan",
    addManual: "IDAGDAG ANG HANAY",
    aiEngine: "AI TOS Engine ng DepEd",
    aiDesc: "Tukuyin ang pamantayan at hayaang idisenyo ng Gemini ang balanseng kognitibong antas ng Bloom.",
    curriculumPlaceholder: "Ilagay ang paksa, syllabus, o mga aralin...",
    generateBtn: "GUMAWA NG AI TOS BLUEPRINT",
    synthesizing: "SINUSURI ANG BLUEPRINT NG AI...",
    printBtn: "IPRINT / LANDSCAPE PREVIEW",
    exportBtn: "I-EXPORT SA WORD DOCX",
    totalDays: "Kabuuang Araw ng Pagtuturo",
    lotsTitle: "Sukat ng Prosesong Kognitibo",
    lotsGroup: "Kaalaman / Estruktura ng Kakayahan",
    clearance: "PAG-APRUBA AT LAGDA",
    addBtn: "MAGDAGDAG NG KASANAYAN",
    compCount: "Bilang ng Hanay",
    manComp: "Pamamahala ng mga Kasanayan (I-edit ang mga Hanay)"
  }
};

const FRAMEWORK_COLUMNS = {
  standard: [
    { key: "remembering", label: "Remembering", shortLabel: "Rem." },
    { key: "understanding", label: "Understanding", shortLabel: "Und." },
    { key: "applying", label: "Applying", shortLabel: "App." },
    { key: "analyzing", label: "Analyzing", shortLabel: "Ana." },
    { key: "evaluating", label: "Evaluating", shortLabel: "Eva." },
    { key: "creating", label: "Creating", shortLabel: "Cre." }
  ],
  knowledge: [
    { key: "factual", label: "Factual", shortLabel: "Fac." },
    { key: "conceptual", label: "Conceptual", shortLabel: "Con." },
    { key: "procedural", label: "Procedural", shortLabel: "Pro." },
    { key: "metacognitive", label: "Metacognitive", shortLabel: "Met." }
  ],
  simplified: [
    { key: "cognitive", label: "Cognitive", shortLabel: "Cog." },
    { key: "psychomotor", label: "Psychomotor", shortLabel: "Psy." },
    { key: "affective", label: "Affective", shortLabel: "Aff." }
  ]
};

const getRowFrameworkValues = (totalRowItems: number, framework: "standard" | "knowledge" | "simplified"): number[] => {
  if (framework === "standard") {
    const remembering = Math.floor(totalRowItems * 0.25);
    const understanding = Math.floor(totalRowItems * 0.20);
    const applying = Math.floor(totalRowItems * 0.15);
    const analyzing = Math.floor(totalRowItems * 0.15);
    const evaluating = Math.floor(totalRowItems * 0.15);
    const creating = Math.max(0, totalRowItems - (remembering + understanding + applying + analyzing + evaluating));
    return [remembering, understanding, applying, analyzing, evaluating, creating];
  } else if (framework === "knowledge") {
    const factual = Math.floor(totalRowItems * 0.35);
    const conceptual = Math.floor(totalRowItems * 0.35);
    const procedural = Math.floor(totalRowItems * 0.20);
    const metacognitive = Math.max(0, totalRowItems - (factual + conceptual + procedural));
    return [factual, conceptual, procedural, metacognitive];
  } else {
    const cognitive = Math.floor(totalRowItems * 0.50);
    const psychomotor = Math.floor(totalRowItems * 0.35);
    const affective = Math.max(0, totalRowItems - (cognitive + psychomotor));
    return [cognitive, psychomotor, affective];
  }
};

interface AiGeneratorsProps {
  formData?: {
    teacherName: string;
    schoolName: string;
    gradeLevel: string;
    subject: string;
    quarter: string;
    preparedBy: string;
    checkedBy: string;
    approvedBy: string;
  };
}

export function AiGenerators({ formData }: AiGeneratorsProps = {}) {
  const [activeSubTab, setActiveSubTab] = useState<"tos" | "rubrics" | "scorecard" | "worksheets">("tos");

  // ==========================================
  // STATE FOR TABLE OF SPECIFICATIONS (TOS)
  // ==========================================
  const [tosSchoolName, setTosSchoolName] = useState("ReelSystem Exemplar School");
  const [tosSubject, setTosSubject] = useState("English Syntax and Composition");
  const [tosGradeLevel, setTosGradeLevel] = useState("Senior High (Grades 11-12)");
  const [tosQuarter, setTosQuarter] = useState("First Quarter");
  const [tosTotalItems, setTosTotalItems] = useState(30);
  const [tosRowCount, setTosRowCount] = useState(4);
  const [tosNotes, setTosNotes] = useState("");
  const [tosData, setTosData] = useState<TOSEntry[]>([]);
  const [tosLoading, setTosLoading] = useState(false);
  const [tosError, setTosError] = useState("");
  const [tosTaxonomyFramework, setTosTaxonomyFramework] = useState<"standard" | "knowledge" | "simplified">("standard");
  const [tosLanguage, setTosLanguage] = useState<"en" | "tl">("en");
  const [tosPreparedBy, setTosPreparedBy] = useState("Teacher Jane Doe");
  const [tosCheckedBy, setTosCheckedBy] = useState("Department Head");
  const [tosApprovedBy, setTosApprovedBy] = useState("School Principal");
  const [tosManualBloomAdjustment, setTosManualBloomAdjustment] = useState(false);

  // Manual Override Inputs for TOS
  const [manualCompName, setManualCompName] = useState("");
  const [manualCompDays, setManualCompDays] = useState(5);

  // ==========================================
  // STATE FOR RUBRIC MATRIX SYNTHESIZER
  // ==========================================
  const [rubricLanguage, setRubricLanguage] = useState<"en" | "tl">("en");
  const [rubricTitle, setRubricTitle] = useState("Persuasive Essay Assignment");
  const [rubricSubject, setRubricSubject] = useState("English Lit / Communication");
  const [rubricGradeLevel, setRubricGradeLevel] = useState("Senior High");
  const [rubricScaleWidth, setRubricScaleWidth] = useState(4); // 3, 4, 5
  const [rubricPillars, setRubricPillars] = useState("Content & Arguments, Organization & Structure, Language Mechanics");
  const [rubricCustomNotes, setRubricCustomNotes] = useState("");
  const [rubricData, setRubricData] = useState<RubricData | null>(null);
  const [rubricLoading, setRubricLoading] = useState(false);
  const [rubricError, setRubricError] = useState("");

  // ==========================================
  // STATE FOR SCORECARD GENERATOR
  // ==========================================
  const [scorecardLanguage, setScorecardLanguage] = useState<"en" | "fil">("en");
  const [scorecardSchool, setScorecardSchool] = useState("ReelSystem Exemplar School");
  const [scorecardTitle, setScorecardTitle] = useState("High School Science Fair");
  const [scorecardContextMode, setScorecardContextMode] = useState("School Competition");
  const [scorecardKeywords, setScorecardKeywords] = useState("Focus on hypothesis testing, poster presentation, and oral clarity.");
  const [scorecardJudge, setScorecardJudge] = useState("Judge Jane Doe");
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [scorecardError, setScorecardError] = useState("");
  const [scorecardData, setScorecardData] = useState<{
    title: string;
    criteria: Array<{
      criterion: string;
      definition: string;
      weight: number;
    }>;
  } | null>(null);

  // Sync profile details in all features
  useEffect(() => {
    if (formData) {
      if (formData.schoolName) {
        setTosSchoolName(formData.schoolName);
        setScorecardSchool(formData.schoolName);
      }
      if (formData.subject) {
        setTosSubject(formData.subject);
        setRubricSubject(formData.subject);
      }
      if (formData.gradeLevel) {
        setTosGradeLevel(formData.gradeLevel);
        setRubricGradeLevel(formData.gradeLevel);
      }
      if (formData.quarter) setTosQuarter(formData.quarter);
      const prep = formData.preparedBy || formData.teacherName || "";
      if (prep) {
        setTosPreparedBy(prep);
        setScorecardJudge(prep);
      }
      if (formData.checkedBy) setTosCheckedBy(formData.checkedBy);
      if (formData.approvedBy) setTosApprovedBy(formData.approvedBy);
    }
  }, [formData]);

  // ==========================================
  // STATE FOR WORKSHEET GENERATOR
  // ==========================================
  const [worksheetTab, setWorksheetTab] = useState<"wordsearch" | "scramble" | "crossword">("wordsearch");
  const [worksheetSchool, setWorksheetSchool] = useState("ReelSystem Exemplar School");
  const [worksheetTitle, setWorksheetTitle] = useState("Science Terms Challenge");
  const [worksheetSubtitle, setWorksheetSubtitle] = useState("Find and solve the science vocabulary");
  const [worksheetInstructions, setWorksheetInstructions] = useState("Search and circle the hidden words.");
  const [worksheetWordsText, setWorksheetWordsText] = useState("CELL\nGENE\nORGANISM\nPHOTOSYNTHESIS\nNUCLEUS\nEVOLUTION\nECOLOGY\nMITOSIS\nPROTEIN");
  const [wordsearchSize, setWordsearchSize] = useState<number>(12);
  const [scrambleCols, setScrambleCols] = useState<number>(2);
  const [crosswordCluesText, setCrosswordCluesText] = useState(
    "CELL: The basic structural unit of life\n" +
    "GENE: Unit of heredity transferred from parent to offspring\n" +
    "ORGANISM: An individual animal, plant, or single-celled life form\n" +
    "PHOTOSYNTHESIS: Process by which plants make food using sunlight\n" +
    "NUCLEUS: Membrane-bound organelle containing genetic material\n" +
    "EVOLUTION: Process by which different kinds of living organisms developed\n" +
    "ECOLOGY: Branch of biology dealing with relations of organisms to one another\n" +
    "MITOSIS: Type of cell division resulting in two daughter cells\n" +
    "PROTEIN: Nitrogenous organic compounds essential for cell structure"
  );
  const [worksheetLoading, setWorksheetLoading] = useState(false);
  const [worksheetError, setWorksheetError] = useState("");
  const [worksheetLanguage, setWorksheetLanguage] = useState<"en" | "fil">("en");
  const [showWorksheetAnswers, setShowWorksheetAnswers] = useState(false);

  // Generated results for worksheets
  const [generatedWordsearch, setGeneratedWordsearch] = useState<{
    grid: string[][];
    placedWords: string[];
    wordList: string[];
    answerGrid?: boolean[][];
  } | null>(null);

  const [generatedScramble, setGeneratedScramble] = useState<Array<{
    scrambled: string;
    original: string;
  }>>([]);

  const [generatedCrossword, setGeneratedCrossword] = useState<{
    grid: string[][];
    numberGrid: number[][];
    placedWords: Array<{
      word: string;
      clue: string;
      x: number;
      y: number;
      dir: "H" | "V";
      num: number;
    }>;
    acrossClues: Array<{ num: number; clue: string; word: string }>;
    downClues: Array<{ num: number; clue: string; word: string }>;
    dim: number;
  } | null>(null);

  // Sync profile details in all features
  useEffect(() => {
    if (formData) {
      if (formData.schoolName) {
        setWorksheetSchool(formData.schoolName);
      }
    }
  }, [formData]);

  // Standard Mock Baseline Data for Fallback or Initial state
  const defaultTOSEntries: TOSEntry[] = [
    {
      competency: "Analyze and classify syntactic structural variables across compound sentences",
      daysTaught: 7,
      weightPercent: 30,
      totalRowItems: 9,
      bloomLevels: { remembering: 3, understanding: 2, applying: 2, analyzing: 2, evaluating: 0, creating: 0 },
      itemPlacement: "1-9"
    },
    {
      competency: "Apply accurate grammatical modifiers inside fluid active voice clauses",
      daysTaught: 6,
      weightPercent: 25,
      totalRowItems: 8,
      bloomLevels: { remembering: 2, understanding: 2, applying: 2, analyzing: 1, evaluating: 1, creating: 0 },
      itemPlacement: "10-17"
    },
    {
      competency: "Appraise textual intent by tracking contextual thesis assertions",
      daysTaught: 5,
      weightPercent: 21,
      totalRowItems: 6,
      bloomLevels: { remembering: 1, understanding: 1, applying: 1, analyzing: 2, evaluating: 1, creating: 0 },
      itemPlacement: "18-23"
    },
    {
      competency: "Formulate comprehensive summary arguments responding to contemporary texts",
      daysTaught: 6,
      weightPercent: 24,
      totalRowItems: 7,
      bloomLevels: { remembering: 1, understanding: 1, applying: 1, analyzing: 1, evaluating: 2, creating: 1 },
      itemPlacement: "24-30"
    }
  ];

  const defaultRubricData: RubricData = {
    assignmentTitle: "Persuasive Essay Assignment",
    scaleLevels: [
      { levelName: "Beginning", score: 1 },
      { levelName: "Developing", score: 2 },
      { levelName: "Proficient", score: 3 },
      { levelName: "Advanced", score: 4 }
    ],
    rubricRows: [
      {
        criterionTitle: "Content & Arguments",
        criterionDefinition: "Assesses richness of central ideas, clarity of arguments, and accuracy of research references.",
        descriptors: {
          level_1: "Fails to meet basic argumentative expectations. Thesis is absent or extremely unclear.",
          level_2: "Demonstrates simple or inconsistent development of arguments. Support is mostly anecdotal.",
          level_3: "Proficiently structures an objective thesis with logical backing, relevant citations, and clear examples.",
          level_4: "Creates sophisticated, nuance-rich paradigms. Fully addresses counter-arguments with rigorous logic."
        }
      },
      {
        criterionTitle: "Organization & Structure",
        criterionDefinition: "Examines paragraph flow, introduction hook strength, transitions, and conclusion integration.",
        descriptors: {
          level_1: "Lacks structural guidelines or paragraph organization. Transition phrases are missing entirely.",
          level_2: "Shows basic trouble with transitional flow. Paragraphs are grouped but ideas sometimes hop randomly.",
          level_3: "Exhibits clear fundamental organization: structured introduction, sequential transition steps, and conclusion.",
          level_4: "Exhibits exceptional critical flow. Fluid transitions create flawless structural harmony across sections."
        }
      },
      {
        criterionTitle: "Language Mechanics",
        criterionDefinition: "Checks spelling accuracy, precise punctuation standards, correct active voice usage, and word counts.",
        descriptors: {
          level_1: "Extremely distracting errors in spelling and grammar render readability very low.",
          level_2: "Contains 6 or more grammatical errors that occasionally distract or confuse the reader.",
          level_3: "Proficiently executes mechanics. Contains 3-5 minor grammatical errors that do not affect overall comprehension.",
          level_4: "Masterfully showcases flawless mechanics with 0-2 minor typos. Language use is elegant and precise."
        }
      }
    ]
  };

  // Trigger default loads on mount
  useEffect(() => {
    setTosData(defaultTOSEntries);
    setRubricData(defaultRubricData);
  }, []);

  // ==========================================
  // API CALLS FOR TOS GENERATION
  // ==========================================
  const handleGenerateTOS = async () => {
    setTosLoading(true);
    setTosError("");
    try {
      const response = await fetch("/api/lesson/generate-tos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: tosSubject,
          gradeLevel: tosGradeLevel,
          totalItems: tosTotalItems,
          rowCount: tosRowCount,
          curriculumNotes: tosNotes
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to generate TOS.");
      }

      const generatedData = await response.json();
      if (Array.isArray(generatedData)) {
        setTosData(generatedData);
      } else {
        throw new Error("Invalid output format received from the AI TOS Engine.");
      }
    } catch (err: any) {
      console.error(err);
      setTosError(err.message || "Something went wrong during AI blueprint synthesis.");
    } finally {
      setTosLoading(false);
    }
  };

  const handleAddManualRow = () => {
    if (!manualCompName.trim()) return;
    
    // Quick recalculation to add a manual entry safely
    const newEntry: TOSEntry = {
      competency: manualCompName.trim(),
      daysTaught: manualCompDays,
      weightPercent: 0, // Recalculated dynamically below
      totalRowItems: 0,
      bloomLevels: { remembering: 0, understanding: 0, applying: 0, analyzing: 0, evaluating: 0, creating: 0 },
      itemPlacement: "-"
    };

    const updatedData = [...tosData, newEntry];
    setTosData(recalculateTOSMath(updatedData, tosTotalItems));
    setManualCompName("");
  };

  const handleRemoveTOSRow = (index: number) => {
    const updated = tosData.filter((_, i) => i !== index);
    setTosData(recalculateTOSMath(updated, tosTotalItems));
  };

  // Helper to mathematically balance days, weight, items, and Bloom taxonomy distribution
  const recalculateTOSMath = (entries: TOSEntry[], budget: number, keepBloomLevels?: boolean): TOSEntry[] => {
    const totalDays = entries.reduce((sum, e) => sum + e.daysTaught, 0);
    if (totalDays === 0) return entries;

    let runningItemCount = 0;
    return entries.map((entry, idx) => {
      const weight = (entry.daysTaught / totalDays);
      const weightPercent = parseFloat((weight * 100).toFixed(1));
      
      let totalRowItems = entry.totalRowItems;
      if (!keepBloomLevels) {
        totalRowItems = Math.round(weight * budget);
        if (idx === entries.length - 1) {
          totalRowItems = budget - runningItemCount;
        }
      } else {
        // If keeping manually defined bloom levels, totalRowItems is the sum of those levels
        const rem = entry.bloomLevels?.remembering || 0;
        const und = entry.bloomLevels?.understanding || 0;
        const app = entry.bloomLevels?.applying || 0;
        const ana = entry.bloomLevels?.analyzing || 0;
        const eva = entry.bloomLevels?.evaluating || 0;
        const cre = entry.bloomLevels?.creating || 0;
        totalRowItems = rem + und + app + ana + eva + cre;
      }

      let itemPlacement = "-";
      if (totalRowItems > 0) {
        const start = runningItemCount + 1;
        const end = runningItemCount + totalRowItems;
        itemPlacement = start === end ? `${start}` : `${start}-${end}`;
        runningItemCount += totalRowItems;
      }

      // If we don't keep Bloom levels, calculate them standardly
      let bloom = entry.bloomLevels;
      if (!keepBloomLevels || !bloom) {
        const remembering = Math.floor(totalRowItems * 0.25);
        const understanding = Math.floor(totalRowItems * 0.20);
        const applying = Math.floor(totalRowItems * 0.15);
        const analyzing = Math.floor(totalRowItems * 0.15);
        const evaluating = Math.floor(totalRowItems * 0.15);
        const creating = Math.max(0, totalRowItems - (remembering + understanding + applying + analyzing + evaluating));
        bloom = { remembering, understanding, applying, analyzing, evaluating, creating };
      }

      return {
        ...entry,
        weightPercent,
        totalRowItems,
        bloomLevels: bloom,
        itemPlacement
      };
    });
  };

  // ==========================================
  // API CALLS FOR RUBRIC GENERATION
  // ==========================================
  const handleGenerateRubrics = async () => {
    setRubricLoading(true);
    setRubricError("");
    try {
      // Setup the dynamic scale levels based on scale width
      let levelNames: string[] = [];
      if (rubricLanguage === "en") {
        if (rubricScaleWidth === 3) levelNames = ["Developing", "Proficient", "Exemplary"];
        else if (rubricScaleWidth === 4) levelNames = ["Beginning", "Developing", "Proficient", "Advanced"];
        else levelNames = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
      } else {
        if (rubricScaleWidth === 3) levelNames = ["Nagsisimula", "Mahusay", "Katangi-tangi"];
        else if (rubricScaleWidth === 4) levelNames = ["Baguhan", "Papaunlad", "Mahusay", "Napakahusay"];
        else levelNames = ["Kulang", "Pasiwala", "Katamtaman", "Mabuti", "Napakatangi"];
      }

      const formattedLevels: RubricScaleLevel[] = levelNames.map((name, i) => ({
        levelName: name,
        score: i + 1
      }));

      const parsedPillars = rubricPillars.split(",").map(p => p.trim()).filter(p => p.length > 0);

      const response = await fetch("/api/lesson/generate-rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentTitle: rubricTitle,
          gradeLevel: rubricGradeLevel,
          criteriaCount: parsedPillars.length,
          scaleLevels: formattedLevels,
          customInstructions: `${rubricLanguage === "tl" ? "WRITE THE ENTIRE OUTPUT MATRIX AND CELL DESCRIPTORS IN FILIPINO/TAGALOG LANGUAGE." : ""} Core pillars: ${rubricPillars}. ${rubricCustomNotes}`
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to generate rubric.");
      }

      const generatedData: RubricData = await response.json();
      setRubricData(generatedData);
    } catch (err: any) {
      console.error(err);
      setRubricError(err.message || "Failed to synthesize rubric matrix.");
    } finally {
      setRubricLoading(false);
    }
  };

  // ==========================================
  // API CALLS FOR SCORECARD GENERATION
  // ==========================================
  const handleGenerateScorecard = async () => {
    if (!scorecardTitle.trim()) {
      setScorecardError("Please enter an event title or topic first.");
      return;
    }
    setScorecardLoading(true);
    setScorecardError("");
    setScorecardData(null);

    try {
      try {
        const response = await fetch("/api/lesson/generate-scorecard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: scorecardTitle,
            contextMode: scorecardContextMode,
            keywords: scorecardKeywords,
            lang: scorecardLanguage
          })
        });

        if (!response.ok) {
          throw new Error("Server returned an error");
        }

        const data = await response.json();
        setScorecardData(data);
      } catch (err: any) {
        console.warn("AI Scorecard Generator failed, falling back to deterministic offline synthesizer:", err);
        // Deterministic offline fallback
        let rawCriteria: Array<{ criterion: string; definition: string; weight: number }> = [];
        const isFil = scorecardLanguage === "fil";

        if (scorecardContextMode === "School Competition") {
          rawCriteria = [
            {
              criterion: isFil ? "Nilalaman at Pagpapatupad (Content & Execution)" : "Content & Execution",
              definition: isFil 
                ? "Lalim ng pag-unawa sa paksa at kalidad ng gawa ayon sa ibinigay na pamantayan."
                : "Depth of understanding of the topic and quality of work relative to guidelines.",
              weight: 35
            },
            {
              criterion: isFil ? "Pagkamalikhain at Pagkaorihinal (Creativity)" : "Creativity & Originality",
              definition: isFil
                ? "Natatanging diskarte at paggamit ng mga bagong ideya o materyales sa malikhaing paraan."
                : "Unique approach and application of novel ideas or materials in a creative way.",
              weight: 30
            },
            {
              criterion: isFil ? "Teknikal na Kasanayan (Technical Skill)" : "Technical Skill & Precision",
              definition: isFil
                ? "Husay sa paggamit ng mga angkop na kagamitan o pamamaraan nang may kawastuhan."
                : "Competence in utilizing appropriate tools or methods with accuracy and precision.",
              weight: 20
            },
            {
              criterion: isFil ? "Pangkalahatang Impresyon (Overall Impression)" : "Overall Presentation",
              definition: isFil
                ? "Kabuuan ng presentasyon at kakayahang umakit sa madla o hurado."
                : "Completeness of presentation and ability to captivate the audience or judges.",
              weight: 15
            }
          ];
        } else if (scorecardContextMode === "Cultural/Talent Showcase") {
          rawCriteria = [
            {
              criterion: isFil ? "Presensya sa Entablado (Stage Presence)" : "Stage Presence & Artistry",
              definition: isFil
                ? "Tiwala sa sarili, ekspresyon, at lakas ng dating habang nagtatanghal."
                : "Self-confidence, expression, and overall impact during the active performance.",
              weight: 40
            },
            {
              criterion: isFil ? "Sining at Pagpapahayag (Expressiveness)" : "Technical Mastery & Flow",
              definition: isFil
                ? "Katatasan, tiyempo, at emosyonal na koneksyon sa sining na ipinapakita."
                : "Fluency, timing, and emotional connection to the art being displayed.",
              weight: 30
            },
            {
              criterion: isFil ? "Kahusayan sa Teknik (Technical Skill)" : "Performance Precision",
              definition: isFil
                ? "Kasanayan sa pisikal o bokal na aspeto ng pagtatanghal nang walang pagkakamali."
                : "Proficiency in the physical or vocal aspects of the presentation without errors.",
              weight: 20
            },
            {
              criterion: isFil ? "Pakikipag-ugnayan (Engagement)" : "Audience Appeal",
              definition: isFil
                ? "Kakayahang makuha ang atensyon at positibong tugon ng mga manonood."
                : "Ability to capture the attention and positive feedback of the viewers.",
              weight: 10
            }
          ];
        } else if (scorecardContextMode === "Classroom Project Performance") {
          rawCriteria = [
            {
              criterion: isFil ? "Kaugnayan sa Paksa (Relevance)" : "Relevance to Topic",
              definition: isFil
                ? "Pagkakahanay ng proyekto sa mga layunin ng aralin at paksa ng kurikulum."
                : "Alignment of the project with the lesson objectives and curriculum subject.",
              weight: 30
            },
            {
              criterion: isFil ? "Teknikal na Pagpapatupad (Execution)" : "Technical Execution",
              definition: isFil
                ? "Katatagan ng estruktura, maayos na pagkakabuo, at pagsunod sa panuto."
                : "Structural stability, tidy composition, and adherence to instructional guidelines.",
              weight: 30
            },
            {
              criterion: isFil ? "Mapanuring Pag-iisip (Critical Thinking)" : "Depth of Critical Thinking",
              definition: isFil
                ? "Katibayan ng malalim na pagsasaliksik, pagsusuri, at paglutas ng problema."
                : "Evidence of deep research, analysis, and problem-solving elements.",
              weight: 20
            },
            {
              criterion: isFil ? "Disenyo at Presentasyon (Presentation)" : "Design & Presentation",
              definition: isFil
                ? "Visual na apela, kalinisan, at malinaw na pagpapaliwanag ng ideya."
                : "Visual appeal, cleanliness, and clear explanation of the core idea.",
              weight: 20
            }
          ];
        } else {
          rawCriteria = [
            {
              criterion: isFil ? "Tikas at Tindig (Poise & Grace)" : "Poise & Grace",
              definition: isFil
                ? "Postura, magandang kilos, at tindig ng kumpiyansa sa entablado."
                : "Posture, elegant body movement, and confident stature on the stage floor.",
              weight: 35
            },
            {
              criterion: isFil ? "Atraktibong Apela (Stage Appeal)" : "Projection & Stage Appeal",
              definition: isFil
                ? "Kakayahang kumuha ng pansin sa pamamagitan ng paningin at galaw."
                : "Capability to project charm and command attention visually and physically.",
              weight: 30
            },
            {
              criterion: isFil ? "Personalidad at Wit (Personality & Wit)" : "Personality & Wit",
              definition: isFil
                ? "Katalinuhan sa pagsagot, karisma, at tiwala sa komunikasyon."
                : "Intelligence in answering questions, charisma, and communication trust.",
              weight: 20
            },
            {
              criterion: isFil ? "Kasuotan at Estilo (Costume Fit)" : "Costume & Style Fit",
              definition: isFil
                ? "Kagandahan at angkop na pagpili ng kasuotan para sa tema."
                : "Beauty and appropriate choice of attire supporting the active theme.",
              weight: 15
            }
          ];
        }

        setScorecardData({
          title: scorecardTitle,
          criteria: rawCriteria
        });
      }
    } catch (err: any) {
      setScorecardError(err.message || "Failed to generate scorecard criteria.");
    } finally {
      setScorecardLoading(false);
    }
  };

  const handlePrintScorecard = () => {
    const element = document.getElementById("scorecardPrintableSection");
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
          <title>${scorecardTitle || 'Judging Scorecard'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: #ffffff; color: #000000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: 'Arial', sans-serif; padding: 20px; background: #ffffff; color: #000000; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 3px solid #000000 !important; }
            th, td { border: 2px solid #000000 !important; padding: 8px 10px; font-size: 12px; color: #000000 !important; }
            th { background-color: #f1f5f9 !important; font-weight: bold; text-transform: uppercase; }
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

  // Print function
  const triggerPrint = () => {
    window.print();
  };

  // ==========================================
  // WORKSHEET GENERATOR LOCAL ALGORITHMS
  // ==========================================
  const generateWordSearchLocal = () => {
    const words = worksheetWordsText
      .split("\n")
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 1 && /^[A-Z]+$/.test(w));

    if (words.length === 0) {
      setWorksheetError("Please enter some valid words (letters only, one per line) first.");
      return;
    }

    const size = wordsearchSize;
    const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(""));
    const answerGrid: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

    const dirs = [
      [0, 1],   // E
      [1, 0],   // S
      [1, 1],   // SE
      [-1, 1],  // NE
      [0, -1],  // W
      [-1, 0],  // N
      [-1, -1], // NW
      [1, -1]   // SW
    ];

    const placedWords: string[] = [];
    const sortedWords = [...words].sort((a, b) => b.length - a.length);

    for (const word of sortedWords) {
      let placed = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const startR = Math.floor(Math.random() * size);
        const startC = Math.floor(Math.random() * size);

        const endR = startR + dir[0] * (word.length - 1);
        const endC = startC + dir[1] * (word.length - 1);

        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const r = startR + dir[0] * i;
          const c = startC + dir[1] * i;
          if (grid[r][c] !== "" && grid[r][c] !== word[i]) {
            ok = false;
            break;
          }
        }

        if (ok) {
          for (let i = 0; i < word.length; i++) {
            const r = startR + dir[0] * i;
            const c = startC + dir[1] * i;
            grid[r][c] = word[i];
            answerGrid[r][c] = true;
          }
          placedWords.push(word);
          placed = true;
          break;
        }
      }
    }

    // Fill remaining empty cells with random letters
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === "") {
          grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    setGeneratedWordsearch({
      grid,
      placedWords,
      wordList: words,
      answerGrid
    });
    setWorksheetError("");
  };

  const generateWordScrambleLocal = () => {
    const words = worksheetWordsText
      .split("\n")
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 1 && /^[A-Z\s]+$/.test(w));

    if (words.length === 0) {
      setWorksheetError("Please enter some valid words first.");
      return;
    }

    const scrambleList = words.map(word => {
      let scrambled = word;
      for (let attempt = 0; attempt < 20; attempt++) {
        const arr = word.split("");
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = arr[i];
          arr[i] = arr[j];
          arr[j] = temp;
        }
        scrambled = arr.join("");
        if (scrambled !== word) break;
      }
      return { scrambled, original: word };
    });

    setGeneratedScramble(scrambleList);
    setWorksheetError("");
  };

  const generateCrosswordLocal = () => {
    const items = crosswordCluesText
      .split("\n")
      .map(line => {
        const parts = line.split(":");
        if (parts.length < 2) return null;
        const word = parts[0].trim().toUpperCase();
        const clue = parts.slice(1).join(":").trim();
        if (word.length > 1 && clue.length > 0 && /^[A-Z]+$/.test(word)) {
          return { word, clue };
        }
        return null;
      })
      .filter(Boolean) as Array<{ word: string; clue: string }>;

    if (items.length === 0) {
      setWorksheetError("Please enter some valid WORD: CLUE lines first.");
      return;
    }

    const dim = 13;
    const grid: string[][] = Array(dim).fill(null).map(() => Array(dim).fill(""));
    const numberGrid: number[][] = Array(dim).fill(null).map(() => Array(dim).fill(0));
    
    const placed: any[] = [];
    const sorted = [...items].sort((a, b) => b.word.length - a.word.length);

    // Place first word horizontally in the middle
    const first = sorted[0];
    const firstX = Math.max(0, Math.floor((dim - first.word.length) / 2));
    const firstY = Math.floor(dim / 2);

    for (let i = 0; i < first.word.length; i++) {
      grid[firstY][firstX + i] = first.word[i];
    }
    placed.push({
      word: first.word,
      clue: first.clue,
      x: firstX,
      y: firstY,
      dir: "H",
      num: 1
    });

    let nextNum = 2;

    for (let w = 1; w < sorted.length; w++) {
      const current = sorted[w];
      let placedOk = false;

      for (const p of placed) {
        if (placedOk) break;

        for (let i = 0; i < p.word.length; i++) {
          if (placedOk) break;

          for (let j = 0; j < current.word.length; j++) {
            if (p.word[i] === current.word[j]) {
              const currentDir = p.dir === "H" ? "V" : "H";
              const targetX = p.dir === "H" ? p.x + i : p.x - j;
              const targetY = p.dir === "H" ? p.y - j : p.y + i;

              if (currentDir === "H") {
                if (targetX < 0 || targetX + current.word.length > dim || targetY < 0 || targetY >= dim) continue;
              } else {
                if (targetX < 0 || targetX >= dim || targetY < 0 || targetY + current.word.length > dim) continue;
              }

              let isCollision = false;
              for (let charIdx = 0; charIdx < current.word.length; charIdx++) {
                const checkX = currentDir === "H" ? targetX + charIdx : targetX;
                const checkY = currentDir === "H" ? targetY : targetY + charIdx;

                if (grid[checkY][checkX] !== "" && grid[checkY][checkX] !== current.word[charIdx]) {
                  isCollision = true;
                  break;
                }

                if (grid[checkY][checkX] === "") {
                  if (currentDir === "H") {
                    if ((checkY > 0 && grid[checkY - 1][checkX] !== "") || (checkY < dim - 1 && grid[checkY + 1][checkX] !== "")) {
                      isCollision = true;
                      break;
                    }
                  } else {
                    if ((checkX > 0 && grid[checkY][checkX - 1] !== "") || (checkX < dim - 1 && grid[checkY][checkX + 1] !== "")) {
                      isCollision = true;
                      break;
                    }
                  }
                }
              }

              if (!isCollision) {
                for (let charIdx = 0; charIdx < current.word.length; charIdx++) {
                  const checkX = currentDir === "H" ? targetX + charIdx : targetX;
                  const checkY = currentDir === "H" ? targetY : targetY + charIdx;
                  grid[checkY][checkX] = current.word[charIdx];
                }

                let itemNum = nextNum;
                const existing = placed.find(pItem => pItem.x === targetX && pItem.y === targetY);
                if (existing) {
                  itemNum = existing.num;
                } else {
                  nextNum++;
                }

                placed.push({
                  word: current.word,
                  clue: current.clue,
                  x: targetX,
                  y: targetY,
                  dir: currentDir,
                  num: itemNum
                });

                placedOk = true;
                break;
              }
            }
          }
        }
      }
    }

    for (const p of placed) {
      numberGrid[p.y][p.x] = p.num;
    }

    const acrossClues = placed
      .filter(p => p.dir === "H")
      .map(p => ({ num: p.num, clue: p.clue, word: p.word }))
      .sort((a, b) => a.num - b.num);

    const downClues = placed
      .filter(p => p.dir === "V")
      .map(p => ({ num: p.num, clue: p.clue, word: p.word }))
      .sort((a, b) => a.num - b.num);

    setGeneratedCrossword({
      grid,
      numberGrid,
      placedWords: placed,
      acrossClues,
      downClues,
      dim
    });
    setWorksheetError("");
  };

  const handleAiEnrichWorksheet = async () => {
    if (!worksheetTitle.trim()) {
      setWorksheetError("Please enter a worksheet title or general topic keywords first.");
      return;
    }
    setWorksheetLoading(true);
    setWorksheetError("");

    try {
      const response = await fetch("/api/lesson/generate-worksheet-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: worksheetTitle,
          type: worksheetTab,
          lang: worksheetLanguage
        })
      });

      if (!response.ok) {
        throw new Error("Server returned an error");
      }

      const data = await response.json();
      if (data.words && data.words.length > 0) {
        setWorksheetTitle(data.title || worksheetTitle);
        setWorksheetSubtitle(data.subtitle || worksheetSubtitle);
        setWorksheetInstructions(data.instructions || worksheetInstructions);

        const wordListStr = data.words.map((w: any) => w.word).join("\n");
        setWorksheetWordsText(wordListStr);

        const cluesStr = data.words.map((w: any) => `${w.word}: ${w.clue}`).join("\n");
        setCrosswordCluesText(cluesStr);

        setTimeout(() => {
          if (worksheetTab === "wordsearch") {
            const size = wordsearchSize;
            const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(""));
            const answerGrid: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
            const dirs = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
            const placedWords: string[] = [];
            const sortedWords = data.words.map((w: any) => w.word.toUpperCase()).sort((a: string, b: string) => b.length - a.length);

            for (const word of sortedWords) {
              let placed = false;
              for (let attempt = 0; attempt < 100; attempt++) {
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                const startR = Math.floor(Math.random() * size);
                const startC = Math.floor(Math.random() * size);
                const endR = startR + dir[0] * (word.length - 1);
                const endC = startC + dir[1] * (word.length - 1);
                if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
                let ok = true;
                for (let i = 0; i < word.length; i++) {
                  const r = startR + dir[0] * i;
                  const c = startC + dir[1] * i;
                  if (grid[r][c] !== "" && grid[r][c] !== word[i]) { ok = false; break; }
                }
                if (ok) {
                  for (let i = 0; i < word.length; i++) {
                    const r = startR + dir[0] * i;
                    const c = startC + dir[1] * i;
                    grid[r][c] = word[i];
                    answerGrid[r][c] = true;
                  }
                  placedWords.push(word);
                  placed = true;
                  break;
                }
              }
            }

            for (let r = 0; r < size; r++) {
              for (let c = 0; c < size; c++) {
                if (grid[r][c] === "") grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
              }
            }
            setGeneratedWordsearch({ grid, placedWords, wordList: sortedWords, answerGrid });
          } else if (worksheetTab === "scramble") {
            const scrambled = data.words.map((w: any) => {
              const word = w.word.toUpperCase();
              let sc = word;
              for (let att = 0; att < 20; att++) {
                const arr = word.split("");
                for (let i = arr.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
                }
                sc = arr.join("");
                if (sc !== word) break;
              }
              return { scrambled: sc, original: word };
            });
            setGeneratedScramble(scrambled);
          } else if (worksheetTab === "crossword") {
            const items = data.words.map((w: any) => ({ word: w.word.toUpperCase(), clue: w.clue }));
            const dim = 13;
            const grid: string[][] = Array(dim).fill(null).map(() => Array(dim).fill(""));
            const numberGrid: number[][] = Array(dim).fill(null).map(() => Array(dim).fill(0));
            const placed: any[] = [];
            const sorted = [...items].sort((a, b) => b.word.length - a.word.length);

            const first = sorted[0];
            const firstX = Math.max(0, Math.floor((dim - first.word.length) / 2));
            const firstY = Math.floor(dim / 2);
            for (let i = 0; i < first.word.length; i++) grid[firstY][firstX + i] = first.word[i];
            placed.push({ word: first.word, clue: first.clue, x: firstX, y: firstY, dir: "H", num: 1 });

            let nextNum = 2;
            for (let w = 1; w < sorted.length; w++) {
              const current = sorted[w];
              let placedOk = false;
              for (const p of placed) {
                if (placedOk) break;
                for (let i = 0; i < p.word.length; i++) {
                  if (placedOk) break;
                  for (let j = 0; j < current.word.length; j++) {
                    if (p.word[i] === current.word[j]) {
                      const currentDir = p.dir === "H" ? "V" : "H";
                      const targetX = p.dir === "H" ? p.x + i : p.x - j;
                      const targetY = p.dir === "H" ? p.y - j : p.y + i;
                      if (currentDir === "H") {
                        if (targetX < 0 || targetX + current.word.length > dim || targetY < 0 || targetY >= dim) continue;
                      } else {
                        if (targetX < 0 || targetX >= dim || targetY < 0 || targetY + current.word.length > dim) continue;
                      }
                      let isCollision = false;
                      for (let charIdx = 0; charIdx < current.word.length; charIdx++) {
                        const checkX = currentDir === "H" ? targetX + charIdx : targetX;
                        const checkY = currentDir === "H" ? targetY : targetY + charIdx;
                        if (grid[checkY][checkX] !== "" && grid[checkY][checkX] !== current.word[charIdx]) { isCollision = true; break; }
                        if (grid[checkY][checkX] === "") {
                          if (currentDir === "H") {
                            if ((checkY > 0 && grid[checkY - 1][checkX] !== "") || (checkY < dim - 1 && grid[checkY + 1][checkX] !== "")) { isCollision = true; break; }
                          } else {
                            if ((checkX > 0 && grid[checkY][checkX - 1] !== "") || (checkX < dim - 1 && grid[checkY][checkX + 1] !== "")) { isCollision = true; break; }
                          }
                        }
                      }
                      if (!isCollision) {
                        for (let charIdx = 0; charIdx < current.word.length; charIdx++) {
                          grid[currentDir === "H" ? targetY : targetY + charIdx][currentDir === "H" ? targetX + charIdx : targetX] = current.word[charIdx];
                        }
                        let itemNum = nextNum;
                        const existing = placed.find(pItem => pItem.x === targetX && pItem.y === targetY);
                        if (existing) itemNum = existing.num; else nextNum++;
                        placed.push({ word: current.word, clue: current.clue, x: targetX, y: targetY, dir: currentDir, num: itemNum });
                        placedOk = true;
                        break;
                      }
                    }
                  }
                }
              }
            }
            for (const p of placed) numberGrid[p.y][p.x] = p.num;
            const acrossClues = placed.filter(p => p.dir === "H").map(p => ({ num: p.num, clue: p.clue, word: p.word })).sort((a,b)=>a.num-b.num);
            const downClues = placed.filter(p => p.dir === "V").map(p => ({ num: p.num, clue: p.clue, word: p.word })).sort((a,b)=>a.num-b.num);
            setGeneratedCrossword({ grid, numberGrid, placedWords: placed, acrossClues, downClues, dim });
          }
        }, 300);
      }
    } catch (err: any) {
      console.warn("AI Worksheet enrichment failed, generating locally:", err);
      handleTriggerLocalWorksheet();
    } finally {
      setWorksheetLoading(false);
    }
  };

  const handleTriggerLocalWorksheet = () => {
    if (worksheetTab === "wordsearch") {
      generateWordSearchLocal();
    } else if (worksheetTab === "scramble") {
      generateWordScrambleLocal();
    } else if (worksheetTab === "crossword") {
      generateCrosswordLocal();
    }
  };

  const handlePrintWorksheet = () => {
    const element = document.getElementById("worksheetPrintableCanvas");
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
          <title>${worksheetTitle || 'Worksheet'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: #ffffff; color: #000000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: 'Arial', sans-serif; padding: 20px; background: #ffffff; color: #000000; }
            .grid { display: grid !important; }
            .grid-cols-custom {
              display: grid !important;
              grid-template-columns: repeat(${wordsearchSize || 12}, minmax(0, 1fr)) !important;
              gap: 2px !important;
              max-width: 450px !important;
              margin: 0 auto !important;
            }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
            .border-4 { border: 4px solid #000000 !important; }
            .border-2 { border: 2px solid #000000 !important; }
            .border { border: 1px solid #000000 !important; }
            .aspect-square { aspect-ratio: 1/1 !important; }
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

  const handlePrintTOS = () => {
    const element = document.getElementById("tosMatrixPrintable");
    if (!element) {
      window.print();
      return;
    }
    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Pop-up blocker active. Please allow popups to print.");
      return;
    }
    
    printWin.document.write(`
      <html>
        <head>
          <title>DepEd Table of Specifications (TOS) - ${tosSubject}</title>
          <style>
            @media print {
              @page { size: A4 landscape; margin: 8mm; }
              body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: #ffffff; color: #000000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: 'Arial', sans-serif; padding: 20px; background: #ffffff; color: #000000; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 3px solid #000000 !important; }
            th, td { border: 2px solid #000000 !important; padding: 6px 8px; font-size: 11px; text-align: center; color: #000000 !important; }
            th { background-color: #f1f5f9 !important; font-weight: bold; text-transform: uppercase; }
            .text-left { text-align: left !important; }
            .font-black { font-weight: 900; }
            .font-bold { font-weight: 700; }
            .bg-sky-50 { background-color: #f0f9ff !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
            .text-xs { font-size: 11px; }
            .uppercase { text-transform: uppercase; }
            .text-center { text-align: center; }
            .mb-4 { margin-bottom: 16px; }
            .mt-8 { margin-top: 32px; }
            .grid-cols-3 { display: table; width: 100%; margin-top: 40px; }
            .signatory-col { display: table-cell; width: 33.33%; padding: 10px; vertical-align: top; text-align: left; }
            .border-b { border-bottom: 1.5px solid #000000; padding-bottom: 3px; font-weight: bold; }
            .w-full { width: 100%; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div>
            ${element.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleExportWordTOS = () => {
    const element = document.getElementById("tosMatrixPrintable");
    if (!element) {
      alert("No content available to export.");
      return;
    }

    const docStyle = `
      @page Section1 {
        size: 11.69in 8.27in;
        mso-page-orientation: landscape;
        margin: 0.5in;
      }
      div.Section1 { page: Section1; }
      body { font-family: 'Arial', sans-serif; font-size: 11px; color: #000000; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 2.5pt solid #000000; }
      th, td { border: 1.0pt solid #000000; padding: 6px; font-size: 10.5px; text-align: center; color: #000000; }
      th { background-color: #e2e8f0; font-weight: bold; }
      .text-left { text-align: left !important; }
      .font-black { font-weight: bold; }
      .bg-sky-50 { background-color: #f0f9ff; }
      .bg-slate-100 { background-color: #f1f5f9; }
      .grid-cols-3 { display: table; width: 100%; margin-top: 40px; }
      .signatory-col { display: table-cell; width: 33%; padding: 10px; text-align: left; }
      .border-b { border-bottom: 1px solid #000000; font-weight: bold; }
      .no-print { display: none !important; }
    `;

    const blobString = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>DepEd Table of Specifications (TOS) Blueprint</title>
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
        <div class="Section1">${element.innerHTML}</div>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + blobString], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ReelSystem_TOS_${tosSubject.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate sum values for TOS footer
  const totalDays = tosData.reduce((sum, item) => sum + item.daysTaught, 0);
  const totalWeight = tosData.reduce((sum, item) => sum + item.weightPercent, 0);
  const totalAllocatedItems = tosData.reduce((sum, item) => sum + item.totalRowItems, 0);
  const totalRem = tosData.reduce((sum, item) => sum + item.bloomLevels.remembering, 0);
  const totalUnd = tosData.reduce((sum, item) => sum + item.bloomLevels.understanding, 0);
  const totalApp = tosData.reduce((sum, item) => sum + item.bloomLevels.applying, 0);
  const totalAna = tosData.reduce((sum, item) => sum + item.bloomLevels.analyzing, 0);
  const totalEva = tosData.reduce((sum, item) => sum + item.bloomLevels.evaluating, 0);
  const totalCre = tosData.reduce((sum, item) => sum + item.bloomLevels.creating, 0);

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLLER FOR SUB-TABS */}
      <div className="flex flex-wrap md:flex-nowrap bg-slate-100 border-2 border-slate-900 rounded-2xl p-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] w-full max-w-2xl mx-auto gap-1">
        <button
          onClick={() => setActiveSubTab("tos")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] md:text-xs font-black tracking-wide uppercase transition-all duration-200 border-2 ${
            activeSubTab === "tos"
              ? "bg-pink-700 text-white border-slate-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] translate-y-[-1px]"
              : "bg-white text-slate-700 border-transparent hover:bg-slate-200"
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>TOS Blueprint</span>
        </button>
        <button
          onClick={() => setActiveSubTab("rubrics")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] md:text-xs font-black tracking-wide uppercase transition-all duration-200 border-2 ${
            activeSubTab === "rubrics"
              ? "bg-pink-700 text-white border-slate-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] translate-y-[-1px]"
              : "bg-white text-slate-700 border-transparent hover:bg-slate-200"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Rubric Designer</span>
        </button>
        <button
          onClick={() => setActiveSubTab("scorecard")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] md:text-xs font-black tracking-wide uppercase transition-all duration-200 border-2 ${
            activeSubTab === "scorecard"
              ? "bg-pink-700 text-white border-slate-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] translate-y-[-1px]"
              : "bg-white text-slate-700 border-transparent hover:bg-slate-200"
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Scorecard Criteria</span>
        </button>
        <button
          onClick={() => setActiveSubTab("worksheets")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] md:text-xs font-black tracking-wide uppercase transition-all duration-200 border-2 ${
            activeSubTab === "worksheets"
              ? "bg-pink-700 text-white border-slate-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] translate-y-[-1px]"
              : "bg-white text-slate-700 border-transparent hover:bg-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Worksheet Maker</span>
        </button>
      </div>

      {/* ======================================================================== */}
      {/* 1. TABLE OF SPECIFICATIONS (TOS) BLUEPRINT GENERATOR PANEL */}
      {/* ======================================================================== */}
      {activeSubTab === "tos" && (() => {
        const t = TOS_TRANSLATIONS[tosLanguage];
        const activeCols = FRAMEWORK_COLUMNS[tosTaxonomyFramework];
        
        // Dynamic column sums for table footer
        const colSums = activeCols.map((col, colIdx) => {
          return tosData.reduce((sum, item) => {
            if (tosManualBloomAdjustment) {
              return sum + ((item.bloomLevels as any)?.[col.key] || 0);
            } else {
              const vals = getRowFrameworkValues(item.totalRowItems, tosTaxonomyFramework);
              return sum + (vals[colIdx] || 0);
            }
          }, 0);
        });

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* TOS SIDEBAR CONTROLS */}
            <div className="lg:col-span-4 space-y-6 no-print">
              
              {/* BRAND NEW: OFFLINE STANDALONE TOS MATRIX CALCULATOR CALLOUT */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-100 border-4 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-200 border-2 border-slate-900 flex items-center justify-center font-black text-rose-700 shadow-[1px_1px_0px_rgba(0,0,0,1)] text-xs">
                    R
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight">
                      Standalone TOS Matrix Tool
                    </h4>
                    <p className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">
                      100% Offline • Pastel Pink Theme
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                  Need a standalone assessment tool? Try our professional, offline-capable <strong>TOS Matrix Calculator</strong> featuring manual taxonomy selection and perfect Hamilton apportionment.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a 
                    href="/tos-matrix-calculator.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-sky-100 hover:bg-sky-200 text-sky-900 font-black py-2 px-3 rounded-xl border-2 border-slate-900 text-[10px] text-center uppercase tracking-wide shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all duration-150 flex items-center justify-center gap-1"
                  >
                    <span>🌐 Open Tool</span>
                  </a>
                  <a 
                    href="/tos-matrix-calculator.html" 
                    download="ReelSystem_TOS_Matrix_Calculator.html"
                    className="bg-pink-200 hover:bg-pink-300 text-pink-950 font-black py-2 px-3 rounded-xl border-2 border-slate-900 text-[10px] text-center uppercase tracking-wide shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all duration-150 flex items-center justify-center gap-1"
                  >
                    <span>💾 Save Offline</span>
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-2xl border-4 border-slate-900 p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
                
                {/* LANGUAGE & TAXONOMY CONFIG SWITCH */}
                <div className="flex justify-between items-center bg-sky-50 border-2 border-slate-900 p-1.5 rounded-xl">
                  <span className="text-[10px] font-black tracking-wide text-sky-800 uppercase pl-1">
                    Language / Wika:
                  </span>
                  <div className="flex gap-1">
                    <button 
                      type="button"
                      onClick={() => setTosLanguage("en")}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all border ${
                        tosLanguage === "en" 
                          ? "bg-slate-900 text-white border-slate-900" 
                          : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      English
                    </button>
                    <button 
                      type="button"
                      onClick={() => setTosLanguage("tl")}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all border ${
                        tosLanguage === "tl" 
                          ? "bg-slate-900 text-white border-slate-900" 
                          : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      Filipino
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-5 h-5 text-sky-700" />
                    <h3 className="text-lg font-black text-slate-900 uppercase">{t.aiEngine}</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-bold leading-normal">
                    {t.aiDesc}
                  </p>
                </div>

                <hr className="border-t-2 border-slate-100" />

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">{t.schoolName}</label>
                    <input 
                      type="text" 
                      value={tosSchoolName} 
                      onChange={(e) => setTosSchoolName(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">{t.subjectArea}</label>
                    <input 
                      type="text" 
                      value={tosSubject} 
                      onChange={(e) => setTosSubject(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">{t.gradeLevel}</label>
                      <input 
                        type="text" 
                        value={tosGradeLevel} 
                        onChange={(e) => setTosGradeLevel(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">{t.quarter}</label>
                      <input 
                        type="text" 
                        value={tosQuarter} 
                        onChange={(e) => setTosQuarter(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">{t.examItems}</label>
                      <input 
                        type="number" 
                        value={tosTotalItems} 
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          setTosTotalItems(v);
                          setTosData(recalculateTOSMath(tosData, v));
                        }} 
                        min="5" 
                        max="100" 
                        className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">{t.framework}</label>
                      <select 
                        value={tosTaxonomyFramework} 
                        onChange={(e) => setTosTaxonomyFramework(e.target.value as any)}
                        className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black bg-white text-slate-900"
                      >
                        <option value="standard">Standard Revised</option>
                        <option value="knowledge">Knowledge Split</option>
                        <option value="simplified">Simplified Levels</option>
                      </select>
                    </div>
                  </div>

                  {/* CHOOSE MANUALLY REVISED BLOOM'S TAXONOMY TOGGLE */}
                  <div className="flex items-center justify-between bg-sky-50 border-2 border-slate-900 p-2.5 rounded-xl no-print">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black tracking-wide text-sky-950 uppercase">
                        Manual Taxonomy Entry
                      </span>
                      <span className="text-[9px] font-bold text-sky-800">
                        Manually edit each item count in table cells
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !tosManualBloomAdjustment;
                        setTosManualBloomAdjustment(nextVal);
                        setTosData(recalculateTOSMath(tosData, tosTotalItems, nextVal));
                      }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors border-2 border-slate-900 shrink-0 ${
                        tosManualBloomAdjustment ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                      title="Toggle Manual Bloom Taxonomy Adjustment"
                    >
                      <div
                        className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform border border-slate-400 ${
                          tosManualBloomAdjustment ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* SIGNATORY LINE CONFIGURATIONS */}
                  <details className="text-[11px] text-slate-500 cursor-pointer pt-1">
                    <summary className="font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1">
                      <Settings className="w-3 h-3" />
                      <span>CONFIG CLEARANCE SIGN-OFFS</span>
                    </summary>
                    <div className="space-y-2 mt-2 p-3 bg-sky-50/50 rounded-lg border border-sky-100">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-500">Prepared By (Teacher)</label>
                        <input type="text" value={tosPreparedBy} onChange={(e) => setTosPreparedBy(e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 bg-white" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-500">Checked By (Department Head)</label>
                        <input type="text" value={tosCheckedBy} onChange={(e) => setTosCheckedBy(e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 bg-white" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-500">Approved By (Principal)</label>
                        <input type="text" value={tosApprovedBy} onChange={(e) => setTosApprovedBy(e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900 bg-white" />
                      </div>
                    </div>
                  </details>

                  <div>
                    <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">Curriculum Focus / Chapters (Optional)</label>
                    <textarea 
                      value={tosNotes} 
                      onChange={(e) => setTosNotes(e.target.value)}
                      placeholder={t.curriculumPlaceholder}
                      rows={2}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-medium focus:outline-none bg-white text-slate-900"
                    />
                  </div>
                </div>

                <hr className="border-t-2 border-slate-100" />

                {/* DYNAMIC COMPETENCY MANAGEMENT SUITE */}
                <div className="space-y-2 border-t-2 border-slate-100 pt-3">
                  <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600">
                    {t.manComp}
                  </label>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 glass-scroll">
                    {tosData.length === 0 ? (
                      <div className="text-[10px] text-slate-400 italic text-center p-2">
                        {t.noComp}
                      </div>
                    ) : (
                      tosData.map((item, idx) => (
                        <div key={idx} className="bg-sky-50 p-2 rounded-xl border border-sky-200 space-y-1.5 text-xs text-slate-900">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] text-sky-800">Competency #{idx + 1}</span>
                            <button 
                              type="button" 
                              onClick={() => {
                                const updated = tosData.filter((_, i) => i !== idx);
                                setTosData(recalculateTOSMath(updated, tosTotalItems));
                              }}
                              className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                          <textarea
                            value={item.competency}
                            onChange={(e) => {
                              const updated = [...tosData];
                              updated[idx].competency = e.target.value;
                              setTosData(recalculateTOSMath(updated, tosTotalItems));
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-900 font-bold"
                            rows={2}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-bold shrink-0">Days Taught:</span>
                            <input
                              type="number"
                              value={item.daysTaught}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                const updated = [...tosData];
                                updated[idx].daysTaught = val;
                                setTosData(recalculateTOSMath(updated, tosTotalItems));
                              }}
                              className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-center text-xs font-black bg-white text-slate-900"
                              min="1"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newEntry: TOSEntry = {
                        competency: "New Learning Competency Focus Statement",
                        daysTaught: 5,
                        weightPercent: 0,
                        totalRowItems: 0,
                        bloomLevels: { remembering: 0, understanding: 0, applying: 0, analyzing: 0, evaluating: 0, creating: 0 },
                        itemPlacement: "-"
                      };
                      const updated = [...tosData, newEntry];
                      setTosData(recalculateTOSMath(updated, tosTotalItems));
                    }}
                    className="w-full bg-sky-100 hover:bg-sky-200 text-sky-800 border-2 border-sky-300 font-black py-2 rounded-xl text-xs transition-all flex justify-center items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addBtn}</span>
                  </button>
                </div>

                <hr className="border-t-2 border-slate-100" />

                <div className="space-y-2">
                  <button 
                    onClick={handleGenerateTOS}
                    disabled={tosLoading}
                    className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white border-2 border-slate-900 font-black py-3 rounded-xl text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-2 cursor-pointer uppercase"
                  >
                    {tosLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t.synthesizing}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{t.generateBtn}</span>
                      </>
                    )}
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handlePrintTOS}
                      className="bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900 font-black py-2 rounded-xl text-[10px] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-1 cursor-pointer uppercase"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-800" />
                      <span>{t.printBtn}</span>
                    </button>
                    <button 
                      onClick={handleExportWordTOS}
                      className="bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900 font-black py-2 rounded-xl text-[10px] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-1 cursor-pointer uppercase"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-800" />
                      <span>{t.exportBtn}</span>
                    </button>
                  </div>
                </div>

                {tosError && (
                  <div className="bg-red-50 border-2 border-red-500 p-3 rounded-xl text-xs font-bold text-red-700 flex gap-1.5 items-start">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{tosError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* TOS TABLE PRESENTATION VIEW (A4 SHEET PRINT VIEW CANVAS) */}
            <div className="lg:col-span-8 space-y-6">
              <div 
                id="tosMatrixPrintable" 
                className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_rgba(0,0,0,1)] p-6 md:p-8 relative text-slate-900"
              >
                {/* OFFICIAL DEPED LANDSCAPE TEMPLATE HEADER */}
                <div className="text-center space-y-1 mb-6 border-b-4 border-double border-slate-900 pb-4">
                  <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">REPUBLIC OF THE PHILIPPINES</div>
                  <div className="text-xs font-black tracking-wider text-slate-800 uppercase">{t.depedHeader}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">REGION IV-A CALABARZON • DIVISION OF BATANGAS</div>
                  <div className="font-extrabold text-sm uppercase text-sky-700 mt-1">{tosSchoolName}</div>
                  
                  <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase mt-3">
                    {t.blueprintTitle}
                  </h2>
                </div>

                {/* STUDENT-GRADE METADATA HEADERS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-black text-slate-700 mb-6 bg-sky-50/50 p-3.5 rounded-xl border-2 border-slate-900">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wide">{t.subjectArea}</span>
                    <span className="text-slate-900 text-xs font-black">{tosSubject}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wide">{t.gradeLevel}</span>
                    <span className="text-slate-900 text-xs font-black">{tosGradeLevel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wide">{t.quarter}</span>
                    <span className="text-slate-900 text-xs font-black">{tosQuarter}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wide">{t.examItems}</span>
                    <span className="text-slate-900 text-xs font-black">{tosTotalItems} {tosLanguage === "en" ? "Items" : "Aytem"}</span>
                  </div>
                </div>

                {/* DATA TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border-2 border-slate-900 text-left text-[11px] text-slate-900">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-900 font-black text-center">
                        <th rowSpan={2} className="border-r border-slate-900 p-2 text-left w-2/5 font-black uppercase text-slate-900">{t.competency}</th>
                        <th rowSpan={2} className="border-r border-slate-900 p-2 w-14 font-black uppercase text-slate-900">{t.daysTaught}</th>
                        <th rowSpan={2} className="border-r border-slate-900 p-2 w-14 font-black uppercase text-slate-900">{t.weight}</th>
                        <th rowSpan={2} className="border-r border-slate-900 p-2 bg-sky-50 text-sky-950 w-16 font-black uppercase">{t.allocatedItems}</th>
                        <th colSpan={activeCols.length} className="border-r border-slate-900 p-1 bg-slate-50 font-black border-b uppercase text-slate-900">{t.lotsTitle}</th>
                        <th rowSpan={2} className="p-2 w-16 font-black uppercase text-slate-900">{t.placement}</th>
                        <th rowSpan={2} className="p-2 w-8 no-print font-black uppercase text-slate-900">{t.actions}</th>
                      </tr>
                      <tr className="bg-slate-50 border-b-2 border-slate-900 text-slate-800 text-[9px] text-center">
                        {activeCols.map((col) => (
                          <th key={col.key} className="border-r border-slate-300 p-1 font-black text-slate-900" title={col.label}>
                            {col.shortLabel}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tosData.length === 0 ? (
                        <tr>
                          <td colSpan={6 + activeCols.length} className="p-10 text-center text-slate-400 font-bold italic bg-slate-50/50">
                            {t.noComp}
                          </td>
                        </tr>
                      ) : (
                        tosData.map((item, idx) => {
                          const colVals = getRowFrameworkValues(item.totalRowItems, tosTaxonomyFramework);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 border-b border-slate-300 transition-colors">
                              <td className="border-r border-slate-900 p-2.5 font-bold text-slate-900 align-top text-xs text-left">
                                {item.competency}
                              </td>
                              <td className="border-r border-slate-900 p-2 font-mono text-center font-bold text-xs text-slate-900">
                                {item.daysTaught}
                              </td>
                              <td className="border-r border-slate-900 p-2 font-mono text-center text-slate-600 font-bold">
                                {item.weightPercent}%
                              </td>
                              <td className="border-r border-slate-900 p-2 bg-sky-50/30 font-extrabold font-mono text-center text-sky-950 text-xs">
                                {item.totalRowItems}
                              </td>
                              {activeCols.map((col, colIdx) => {
                                const val = tosManualBloomAdjustment 
                                  ? ((item.bloomLevels as any)?.[col.key] || 0)
                                  : colVals[colIdx];
                                return (
                                  <td key={col.key} className="border-r border-slate-300 p-1 font-mono text-center text-slate-800 font-semibold align-middle">
                                    {tosManualBloomAdjustment ? (
                                      <input
                                        type="number"
                                        min="0"
                                        value={val}
                                        onChange={(e) => {
                                          const numVal = parseInt(e.target.value) || 0;
                                          const updated = [...tosData];
                                          if (!updated[idx].bloomLevels) {
                                            updated[idx].bloomLevels = { remembering: 0, understanding: 0, applying: 0, analyzing: 0, evaluating: 0, creating: 0 };
                                          }
                                          (updated[idx].bloomLevels as any)[col.key] = numVal;
                                          
                                          // Recalculate row's total items based on the sum of its Bloom levels
                                          const rowSum = activeCols.reduce((s, c) => s + ((updated[idx].bloomLevels as any)[c.key] || 0), 0);
                                          updated[idx].totalRowItems = rowSum;
                                          
                                          setTosData(recalculateTOSMath(updated, tosTotalItems, true));
                                        }}
                                        className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-sky-500 no-print"
                                      />
                                    ) : (
                                      <span>{val || "-"}</span>
                                    )}
                                    <span className="print-only">{val || "-"}</span>
                                  </td>
                                );
                              })}
                              <td className="border-r border-slate-900 p-2 font-black text-slate-700 bg-slate-50/30 text-center font-mono text-xs">
                                {item.itemPlacement}
                              </td>
                              <td className="p-2 text-center align-middle no-print">
                                <button 
                                  onClick={() => {
                                    const updated = tosData.filter((_, i) => i !== idx);
                                    setTosData(recalculateTOSMath(updated, tosTotalItems));
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {tosData.length > 0 && (
                      <tfoot className="font-extrabold bg-slate-100 border-t-2 border-slate-900 text-slate-900">
                        <tr className="text-center font-black">
                          <td className="border-r border-slate-900 p-2.5 text-right uppercase tracking-wider text-xs">
                            {t.totalBlueprint}
                          </td>
                          <td className="border-r border-slate-900 p-2 font-mono text-xs text-slate-900">
                            {totalDays}
                          </td>
                          <td className="border-r border-slate-900 p-2 font-mono text-xs text-slate-900">
                            {totalWeight.toFixed(1)}%
                          </td>
                          <td className="border-r border-slate-900 p-2 bg-sky-100 text-sky-950 font-mono text-xs">
                            {totalAllocatedItems}
                          </td>
                          {colSums.map((sumVal, colIdx) => (
                            <td key={colIdx} className="border-r border-slate-300 p-2 font-mono text-slate-900">
                              {sumVal || "-"}
                            </td>
                          ))}
                          <td className="p-2 text-slate-900 font-mono text-xs">
                            1-{totalAllocatedItems}
                          </td>
                          <td className="no-print"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* SIGNATURE CLEARANCE SIGN-OFF BLOCK */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-6 border-t-2 border-slate-200">
                  <div className="space-y-4 text-left">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">{t.preparedBy}</span>
                    <div className="border-b-2 border-slate-900 pb-1 font-black text-slate-900 text-xs">
                      {tosPreparedBy || "_____________________"}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Teacher / Instructor</span>
                  </div>
                  
                  <div className="space-y-4 text-left">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">{t.checkedBy}</span>
                    <div className="border-b-2 border-slate-900 pb-1 font-black text-slate-900 text-xs">
                      {tosCheckedBy || "_____________________"}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Department Head</span>
                  </div>

                  <div className="space-y-4 text-left">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">{t.approvedBy}</span>
                    <div className="border-b-2 border-slate-900 pb-1 font-black text-slate-900 text-xs">
                      {tosApprovedBy || "_____________________"}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">School Principal</span>
                  </div>
                </div>

                {/* STAMP FOOTER */}
                <div className="mt-8 border-t-2 border-dashed border-slate-200 pt-4 flex flex-wrap justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>REELSYSTEM EVALUATION PLATFORM • SIGNATURE SEAL REQUIRED</span>
                  <span>SINGLE-PAGE ASSESSMENT MATRIX BLUEPRINT</span>
                </div>
              </div>
            </div>

          </div>
        );
      })()}

      {/* ======================================================================== */}
      {/* 2. RUBRIC MATRIX SYNTHESIZER PANEL */}
      {/* ======================================================================== */}
      {activeSubTab === "rubrics" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* RUBRICS SIDEBAR CONTROLS */}
          <div className="lg:col-span-4 space-y-6 no-print">
            <div className="bg-white rounded-2xl border-4 border-slate-900 p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
              
              {/* LANGUAGE SWITCH */}
              <div className="flex justify-between items-center bg-slate-50 border-2 border-slate-900 p-1.5 rounded-xl">
                <span className="text-[10px] font-black tracking-wide text-slate-600 uppercase pl-1">
                  Language / Wika:
                </span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setRubricLanguage("en")}
                    className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all border ${
                      rubricLanguage === "en" 
                        ? "bg-slate-900 text-white border-slate-900" 
                        : "bg-white text-slate-700 hover:bg-slate-200 border-slate-200"
                    }`}
                  >
                    English
                  </button>
                  <button 
                    onClick={() => setRubricLanguage("tl")}
                    className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all border ${
                      rubricLanguage === "tl" 
                        ? "bg-slate-900 text-white border-slate-900" 
                        : "bg-white text-slate-700 hover:bg-slate-200 border-slate-200"
                    }`}
                  >
                    Tagalog
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileCode className="w-5 h-5 text-indigo-700" />
                  <h3 className="text-lg font-black text-slate-900 uppercase">Rubric Architect</h3>
                </div>
                <p className="text-[11px] text-slate-500 font-bold leading-normal">
                  Synthesize distinct analytical evaluation dimensions with concrete, observable performance cell descriptions.
                </p>
              </div>

              <hr className="border-t-2 border-slate-100" />

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">
                    {rubricLanguage === "en" ? "Assignment Title" : "Pamagat ng Gawain"}
                  </label>
                  <input 
                    type="text" 
                    value={rubricTitle} 
                    onChange={(e) => setRubricTitle(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">
                    {rubricLanguage === "en" ? "Subject / Course" : "Asignatura / Kurso"}
                  </label>
                  <input 
                    type="text" 
                    value={rubricSubject} 
                    onChange={(e) => setRubricSubject(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">
                      {rubricLanguage === "en" ? "Grade Level" : "Target na Antas"}
                    </label>
                    <select 
                      value={rubricGradeLevel}
                      onChange={(e) => setRubricGradeLevel(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black bg-white"
                    >
                      <option>Elementary</option>
                      <option>Junior High</option>
                      <option>Senior High</option>
                      <option>Higher Ed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">
                      {rubricLanguage === "en" ? "Scale Matrix (Tiers)" : "Lapad ng Matrix (Tiers)"}
                    </label>
                    <select 
                      value={rubricScaleWidth}
                      onChange={(e) => setRubricScaleWidth(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-black bg-white"
                    >
                      <option value="3">3 Tiers</option>
                      <option value="4">4 Tiers</option>
                      <option value="5">5 Tiers</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">
                    {rubricLanguage === "en" ? "Core Pillars / Criteria" : "Mga Pamantayan"}
                  </label>
                  <textarea 
                    value={rubricPillars} 
                    onChange={(e) => setRubricPillars(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-medium focus:outline-none"
                    placeholder="Content Mastery, Organization, Language Mechanics, Creativity..."
                  />
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Comma separated list of row criteria.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-black tracking-wide uppercase text-slate-600 mb-1">
                    {rubricLanguage === "en" ? "Custom Directives" : "Iba pang tagubilin"}
                  </label>
                  <textarea 
                    value={rubricCustomNotes} 
                    onChange={(e) => setRubricCustomNotes(e.target.value)}
                    rows={2}
                    placeholder="Optional rules (e.g. emphasize strict references, spelling)..."
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              <hr className="border-t-2 border-slate-100" />

              <div className="space-y-2">
                <button 
                  onClick={handleGenerateRubrics}
                  disabled={rubricLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white border-2 border-slate-900 font-black py-3 rounded-xl text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-2 cursor-pointer"
                >
                  {rubricLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SYNTHESIZING MATRIX SCALE...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{rubricLanguage === "en" ? "SYNTHESIZE FRAMEWORK MATRIX" : "SURIIN AT BUUIN ANG MATRIX"}</span>
                    </>
                  )}
                </button>
                
                <button 
                  onClick={triggerPrint}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-900 font-black py-2.5 rounded-xl text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>{rubricLanguage === "en" ? "PRINT / SAVE RUBRIC PDF" : "IPRINT / I-SAVE ANG PDF"}</span>
                </button>

                <a 
                  href="/reelsystem-rubric-criteria-generator.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-pink-50 hover:bg-pink-100 text-pink-700 border-2 border-slate-900 font-black py-2.5 rounded-xl text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-2 text-center"
                >
                  <FileCode className="w-4 h-4 text-pink-600" />
                  <span>{rubricLanguage === "en" ? "OPEN STANDALONE BUILDER" : "BUKSAN STANDALONE BUILDER"}</span>
                </a>
              </div>

              {rubricError && (
                <div className="bg-red-50 border-2 border-red-500 p-3 rounded-xl text-xs font-bold text-red-700 flex gap-1.5 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{rubricError}</span>
                </div>
              )}
            </div>
          </div>

          {/* RUBRICS PRINT-READY CANVA PREVIEW */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_rgba(0,0,0,1)] p-6 md:p-8">
              
              {/* Header section matching student metadata layout */}
              <div className="border-b-4 border-slate-900 pb-5 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-2">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                      {rubricData?.assignmentTitle || rubricTitle}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-bold">
                      {rubricLanguage === "en" ? "Subject:" : "Asignatura:"} <span className="text-slate-800">{rubricSubject}</span> | {rubricLanguage === "en" ? "Grade Level:" : "Antas:"} <span className="text-slate-800">{rubricGradeLevel}</span>
                    </p>
                  </div>
                  <span className="bg-indigo-100 border-2 border-indigo-500 text-indigo-900 font-black text-[10px] tracking-widest px-2.5 py-0.5 rounded uppercase">
                    {rubricLanguage === "en" ? "Analytical Evaluation Matrix" : "Suring Analytical na Matrix"}
                  </span>
                </div>

                {/* Simulated Student Name Fields matching provided code style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-[11px] font-bold">
                  <div className="border-b border-slate-300 pb-1 flex justify-between">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">Student Name:</span>
                    <span className="w-3/4 border-b border-dashed border-slate-400 h-4"></span>
                  </div>
                  <div className="border-b border-slate-300 pb-1 flex justify-between">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">Evaluator / Teacher:</span>
                    <span className="w-3/4 border-b border-dashed border-slate-400 h-4"></span>
                  </div>
                  <div className="border-b border-slate-300 pb-1 flex justify-between">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">Date Scored:</span>
                    <span className="w-3/4 border-b border-dashed border-slate-400 h-4"></span>
                  </div>
                  <div className="border-b border-slate-300 pb-1 flex justify-between">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">Total Matrix Score:</span>
                    <span className="text-indigo-900 font-black text-xs">________ / 100%</span>
                  </div>
                </div>
              </div>

              {/* DYNAMIC RUBRIC TABLE MATRIX */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-slate-900 text-[11px] text-slate-900">
                  <thead>
                    <tr className="bg-indigo-50 border-b-2 border-slate-900 text-slate-900 font-black text-center">
                      <th className="border-r border-slate-900 p-2.5 text-left w-1/4 font-black">
                        {rubricLanguage === "en" ? "Evaluation Criterion" : "Pamantayan"}
                      </th>
                      {rubricData?.scaleLevels.map((lvl, index) => (
                        <th key={index} className="border-r border-slate-900 p-2 font-black text-center">
                          <div className="font-extrabold text-slate-900 uppercase text-[10px]">{lvl.levelName}</div>
                          <div className="text-[9px] text-indigo-700 font-bold">Score: {lvl.score} pts</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rubricData?.rubricRows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-slate-900 hover:bg-slate-50/50 transition-colors">
                        <td className="border-r border-slate-900 p-3 align-top">
                          <div className="font-extrabold text-indigo-950 text-xs mb-1 uppercase tracking-tight">{row.criterionTitle}</div>
                          <div className="text-[10px] text-slate-500 font-medium leading-relaxed">{row.criterionDefinition}</div>
                        </td>
                        {rubricData.scaleLevels.map((_, sIdx) => {
                          const descriptorKey = `level_${sIdx + 1}`;
                          const descriptorText = row.descriptors[descriptorKey] || row.descriptors[`level_${sIdx + 1}`] || "-";
                          return (
                            <td key={sIdx} className="border-r border-slate-900 p-2.5 text-slate-700 font-medium leading-relaxed text-[10px] align-top">
                              {descriptorText}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TEACHER FEEDBACK BLOCK */}
              <div className="mt-6 border-4 border-slate-900 p-4 rounded-xl bg-slate-50/50">
                <h4 className="text-[10px] font-black uppercase text-indigo-950 tracking-wider mb-2">
                  {rubricLanguage === "en" ? "Teacher Evaluator Comments & Feedback" : "Mga Puna at Feedback ng Guro"}
                </h4>
                <div className="h-16 border border-dashed border-slate-400 rounded-lg"></div>
              </div>

              {/* PRINT STYLE FOOTER */}
              <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">
                <span>REELSYSTEM PRINT-READY A4 TEMPLATE</span>
                <span>AUTHORIZED EDUCATIONAL ENGINE</span>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ======================================================================== */}
      {/* 3. JUDGING SCORECARD CRITERIA SYNTHESIZER PANEL */}
      {/* ======================================================================== */}
      {activeSubTab === "scorecard" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SCORECARD SIDEBAR CONTROLS */}
          <div className="lg:col-span-4 space-y-6 no-print">
            <div className="bg-white rounded-2xl border-4 border-slate-900 p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Table className="w-5 h-5 text-rose-500" />
                <h3 className="font-extrabold text-slate-900 uppercase tracking-tight text-sm">
                  Scorecard Parameters
                </h3>
              </div>

              {/* Language Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" /> Language / Wika
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setScorecardLanguage("en")}
                    className={`py-1.5 px-3 rounded-lg border-2 text-xs font-bold transition-all ${
                      scorecardLanguage === "en"
                        ? "bg-rose-100 border-rose-600 text-rose-800"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setScorecardLanguage("fil")}
                    className={`py-1.5 px-3 rounded-lg border-2 text-xs font-bold transition-all ${
                      scorecardLanguage === "fil"
                        ? "bg-rose-100 border-rose-600 text-rose-800"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    Filipino / Tagalog
                  </button>
                </div>
              </div>

              {/* School Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  School Name / Pangalan ng Paaralan
                </label>
                <input
                  type="text"
                  value={scorecardSchool}
                  onChange={(e) => setScorecardSchool(e.target.value)}
                  className="w-full text-xs font-bold border-2 border-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  placeholder="e.g. ReelSystem High School"
                />
              </div>

              {/* Event Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Event / Project Title
                </label>
                <input
                  type="text"
                  value={scorecardTitle}
                  onChange={(e) => setScorecardTitle(e.target.value)}
                  className="w-full text-xs font-bold border-2 border-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  placeholder="e.g. High School Science Fair"
                />
              </div>

              {/* Context Mode */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Evaluation Context Mode
                </label>
                <select
                  value={scorecardContextMode}
                  onChange={(e) => setScorecardContextMode(e.target.value)}
                  className="w-full text-xs font-bold border-2 border-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                >
                  <option value="School Competition">School Competition / Contest</option>
                  <option value="Cultural/Talent Showcase">Cultural/Talent Showcase</option>
                  <option value="Classroom Project Performance">Classroom Project Performance</option>
                  <option value="Pageant/Attire Runway">Pageant/Attire Runway</option>
                </select>
              </div>

              {/* Judge / Evaluator Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Judge / Evaluator Name
                </label>
                <input
                  type="text"
                  value={scorecardJudge}
                  onChange={(e) => setScorecardJudge(e.target.value)}
                  className="w-full text-xs font-bold border-2 border-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  placeholder="e.g. Judge Jane Doe"
                />
              </div>

              {/* Focus Keywords */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Special Judging Focus Keywords
                </label>
                <textarea
                  value={scorecardKeywords}
                  onChange={(e) => setScorecardKeywords(e.target.value)}
                  rows={3}
                  className="w-full text-xs border-2 border-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium"
                  placeholder="e.g. Poster delivery, hypothesis formulation..."
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateScorecard}
                disabled={scorecardLoading}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-black py-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all duration-150 uppercase tracking-wider text-xs flex items-center justify-center gap-2"
              >
                {scorecardLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Scorecard</span>
                  </>
                )}
              </button>

              {scorecardError && (
                <div className="bg-red-50 text-red-700 text-[10px] font-bold p-3 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{scorecardError}</span>
                </div>
              )}
            </div>

            {/* Quick Helper Tips */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-rose-500" /> Quick Hint
              </span>
              <p className="leading-relaxed font-medium">
                The generator uses high-precision artificial intelligence to craft optimal weights summing to <strong>exactly 100%</strong>. If offline or online limits are hit, a flawless local curriculum engine generates standard criteria instantly!
              </p>
            </div>
          </div>

          {/* SCORECARD A4 PORTRAIT SHEET PREVIEW */}
          <div className="lg:col-span-8">
            {/* Top Toolbar */}
            <div className="bg-slate-50 rounded-2xl border-2 border-slate-300 p-3 flex justify-between items-center mb-4 no-print gap-3">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Live Preview (A4 Portrait Sheet)</span>
              </div>
              {scorecardData && (
                <button
                  onClick={handlePrintScorecard}
                  className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2 border-2 border-slate-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Scorecard</span>
                </button>
              )}
            </div>

            {/* A4 Sheet Canvas */}
            <div 
              id="scorecardPrintableSection"
              className="w-full bg-white border-4 border-slate-900 rounded-2xl shadow-[8px_8px_0px_rgba(0,0,0,1)] p-8 md:p-12 min-h-[842px] relative overflow-visible flex flex-col justify-between"
            >
              {!scorecardData ? (
                /* Empty / State Indicator */
                <div className="flex flex-col items-center justify-center text-center py-20 my-auto">
                  <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center border-4 border-slate-900 shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-6">
                    <Table className="w-8 h-8 text-rose-600" />
                  </div>
                  <h4 className="font-black text-slate-800 text-lg uppercase tracking-wide">
                    {scorecardLanguage === "en" ? "Ready for Synthesis" : "Handa nang Buuin"}
                  </h4>
                  <p className="text-slate-500 font-medium text-xs max-w-sm mt-2 leading-relaxed">
                    {scorecardLanguage === "en" 
                      ? "Enter your competition details in the control panel and click 'Generate Scorecard' to synthesize an elegant judging scorecard!" 
                      : "Ipasok ang mga detalye ng patimpalak sa control panel at i-click ang 'Generate Scorecard' upang lumikha ng isang magandang papel-hatulan!"}
                  </p>
                </div>
              ) : (
                /* Real Print Sheet rendering */
                <div className="space-y-6">
                  {/* Decorative double border box */}
                  <div className="border-4 border-slate-900 p-6 rounded-xl relative overflow-visible">
                    
                    {/* Official Exam Header */}
                    <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{scorecardSchool}</h4>
                      <h1 className="font-black text-slate-900 text-xl md:text-2xl uppercase tracking-tight">
                        {scorecardLanguage === "en" ? "OFFICIAL JUDGING SCORECARD" : "OPISYAL NA PAPEL-HATULAN"}
                      </h1>
                      <div className="inline-block px-3 py-1 bg-rose-100 border-2 border-slate-900 text-[10px] font-black uppercase rounded-full">
                        {scorecardContextMode}
                      </div>
                    </div>

                    {/* Metadata boxes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs font-bold text-slate-700">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          {scorecardLanguage === "en" ? "Event / Topic" : "Patimpalak / Paksa"}
                        </span>
                        <p className="text-slate-900 font-extrabold truncate">{scorecardData.title}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          {scorecardLanguage === "en" ? "Evaluator / Judge" : "Tagahatol / Guro"}
                        </span>
                        <p className="text-slate-900 font-extrabold truncate">{scorecardJudge || "__________________"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          {scorecardLanguage === "en" ? "Participant No." : "Kalahok Blg."}
                        </span>
                        <p className="text-slate-900 font-black tracking-widest text-sm"># ______________</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          {scorecardLanguage === "en" ? "Date & Venue" : "Petsa at Lugar"}
                        </span>
                        <p className="text-slate-900 font-medium">__________________</p>
                      </div>
                    </div>

                  </div>

                  {/* Core Criteria Evaluation Matrix */}
                  <div className="border-4 border-slate-900 rounded-xl overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider border-b-2 border-slate-900">
                          <th className="p-3 w-1/4">{scorecardLanguage === "en" ? "Criterion" : "Pamantayan"}</th>
                          <th className="p-3 w-5/12">{scorecardLanguage === "en" ? "Description & Observables" : "Deskripsyon at Obserbasyon"}</th>
                          <th className="p-3 text-center w-1/12">{scorecardLanguage === "en" ? "Weight" : "Timbang"}</th>
                          <th className="p-3 text-center w-2/12 bg-slate-800">{scorecardLanguage === "en" ? "Score (Max 10)" : "Puntos (Sukat 10)"}</th>
                          <th className="p-3 text-center w-2/12 bg-slate-750">{scorecardLanguage === "en" ? "Weighted Score" : "Kalkulado"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scorecardData.criteria.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-900 hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 align-top border-r border-slate-900">
                              <div className="font-extrabold text-slate-900 text-xs uppercase tracking-tight">{item.criterion}</div>
                            </td>
                            <td className="p-3 align-top border-r border-slate-900 text-[10px] font-medium text-slate-500 leading-relaxed">
                              {item.definition}
                            </td>
                            <td className="p-3 align-top border-r border-slate-900 text-center font-black text-slate-800 text-xs">
                              {item.weight}%
                            </td>
                            <td className="p-3 align-middle border-r border-slate-900 text-center bg-slate-50 font-mono text-sm text-slate-300 font-bold">
                              [ &nbsp; &nbsp; &nbsp; &nbsp; ]
                            </td>
                            <td className="p-3 align-middle text-center bg-slate-50/50 font-mono text-xs text-slate-300 font-bold">
                              _____ / {item.weight / 10}
                            </td>
                          </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="bg-slate-100 font-black text-slate-900 text-xs">
                          <td className="p-3 text-right" colSpan={2}>
                            {scorecardLanguage === "en" ? "TOTAL EVALUATION RATING:" : "KABUUANG MARKA:"}
                          </td>
                          <td className="p-3 text-center border-r border-slate-900">
                            100%
                          </td>
                          <td className="p-3 text-center border-r border-slate-900 bg-slate-100 font-mono text-slate-400">
                            [ &nbsp; &nbsp; &nbsp; ]
                          </td>
                          <td className="p-3 text-center bg-slate-200 text-sm font-black text-slate-900">
                            __________ %
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Comments and Judge Signature Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Judge Notes */}
                    <div className="border-4 border-slate-900 p-4 rounded-xl space-y-2 bg-slate-50/50">
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        {scorecardLanguage === "en" ? "Judge Notes & Suggestions" : "Mga Tala at Mungkahi ng Tagahatol"}
                      </h4>
                      <div className="space-y-2">
                        <div className="border-b border-dashed border-slate-400 h-6"></div>
                        <div className="border-b border-dashed border-slate-400 h-6"></div>
                        <div className="border-b border-dashed border-slate-400 h-6"></div>
                      </div>
                    </div>

                    {/* Official Verification Slot */}
                    <div className="border-4 border-slate-900 p-4 rounded-xl flex flex-col justify-between bg-white text-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Official Judge Verification
                      </span>
                      <div className="pt-6">
                        <p className="font-extrabold text-slate-900 text-xs underline decoration-2 underline-offset-4 uppercase">
                          {scorecardJudge || "_______________________________"}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                          Signature over Printed Name
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Print Style Footer Info */}
                  <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 font-extrabold tracking-widest uppercase">
                    <span>REELSYSTEM PRINT-READY EXECUTIVE CARD</span>
                    <span>JUDGING ID: #{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================================== */}
      {/* 4. CLASSROOM WORKSHEET GENERATOR PANEL */}
      {/* ======================================================================== */}
      {activeSubTab === "worksheets" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* WORKSHEETS SIDEBAR CONTROLS */}
          <div className="lg:col-span-4 space-y-6 no-print">
            <div className="bg-white rounded-2xl border-4 border-slate-900 p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 uppercase tracking-tight text-sm">
                  Worksheet Blueprint
                </h3>
              </div>

              {/* Game Mode / Tab selector */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 border-2 border-slate-900 rounded-xl">
                <button
                  onClick={() => setWorksheetTab("wordsearch")}
                  className={`py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                    worksheetTab === "wordsearch"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Word Search
                </button>
                <button
                  onClick={() => setWorksheetTab("scramble")}
                  className={`py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                    worksheetTab === "scramble"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Scramble
                </button>
                <button
                  onClick={() => setWorksheetTab("crossword")}
                  className={`py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                    worksheetTab === "crossword"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Crossword
                </button>
              </div>

              {/* Language Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" /> Language / Wika
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setWorksheetLanguage("en")}
                    className={`py-1 px-3 rounded-lg border-2 text-[10px] font-bold transition-all ${
                      worksheetLanguage === "en"
                        ? "bg-indigo-50 border-indigo-600 text-indigo-800"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setWorksheetLanguage("fil")}
                    className={`py-1 px-3 rounded-lg border-2 text-[10px] font-bold transition-all ${
                      worksheetLanguage === "fil"
                        ? "bg-indigo-50 border-indigo-600 text-indigo-800"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    Filipino
                  </button>
                </div>
              </div>

              {/* Worksheet School */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  School Name
                </label>
                <input
                  type="text"
                  value={worksheetSchool}
                  onChange={(e) => setWorksheetSchool(e.target.value)}
                  className="w-full text-xs font-bold border-2 border-slate-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Worksheet Title / Topic */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Worksheet Title / Topic Keywords
                </label>
                <input
                  type="text"
                  value={worksheetTitle}
                  onChange={(e) => setWorksheetTitle(e.target.value)}
                  className="w-full text-xs font-bold border-2 border-slate-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Science Terms"
                />
              </div>

              {/* Worksheet Subtitle */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={worksheetSubtitle}
                  onChange={(e) => setWorksheetSubtitle(e.target.value)}
                  className="w-full text-xs font-bold border-2 border-slate-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Worksheet Instructions */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Instructions for Students
                </label>
                <input
                  type="text"
                  value={worksheetInstructions}
                  onChange={(e) => setWorksheetInstructions(e.target.value)}
                  className="w-full text-xs border-2 border-slate-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                />
              </div>

              {/* Settings based on Tab */}
              {worksheetTab === "wordsearch" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Grid Dimensions
                  </label>
                  <select
                    value={wordsearchSize}
                    onChange={(e) => setWordsearchSize(Number(e.target.value))}
                    className="w-full text-xs font-bold border-2 border-slate-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value={10}>Compact (10 x 10)</option>
                    <option value={12}>Standard (12 x 12)</option>
                    <option value={14}>Expansive (14 x 14)</option>
                  </select>
                </div>
              )}

              {worksheetTab === "scramble" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Layout Columns
                  </label>
                  <select
                    value={scrambleCols}
                    onChange={(e) => setScrambleCols(Number(e.target.value))}
                    className="w-full text-xs font-bold border-2 border-slate-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value={1}>1 Column List</option>
                    <option value={2}>2 Columns Grid (Saves Space)</option>
                  </select>
                </div>
              )}

              {/* Word List Input for Word Search and Scramble */}
              {worksheetTab !== "crossword" ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Vocabulary Words (one per line)
                  </label>
                  <textarea
                    value={worksheetWordsText}
                    onChange={(e) => setWorksheetWordsText(e.target.value)}
                    rows={6}
                    className="w-full text-xs font-mono border-2 border-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="CELL&#10;GENE&#10;ORGANISM"
                  />
                </div>
              ) : (
                /* Word and Clue Input for Crosswords */
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Words & Clues (WORD: CLUE, one per line)
                  </label>
                  <textarea
                    value={crosswordCluesText}
                    onChange={(e) => setCrosswordCluesText(e.target.value)}
                    rows={6}
                    className="w-full text-xs border-2 border-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                    placeholder="CELL: Basic unit of life&#10;GENE: Inherited unit"
                  />
                </div>
              )}

              {/* Show Answers Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">Include Teacher Answer Key</span>
                <input
                  type="checkbox"
                  checked={showWorksheetAnswers}
                  onChange={(e) => setShowWorksheetAnswers(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-900 rounded focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleTriggerLocalWorksheet}
                  className="bg-white hover:bg-slate-50 text-slate-900 font-extrabold py-2 px-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all duration-150 uppercase tracking-wider text-[9px] flex items-center justify-center gap-1.5"
                >
                  <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Local Draft</span>
                </button>
                <button
                  onClick={handleAiEnrichWorksheet}
                  disabled={worksheetLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black py-2 px-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all duration-150 uppercase tracking-wider text-[9px] flex items-center justify-center gap-1.5"
                >
                  {worksheetLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>AI Enrich</span>
                </button>
              </div>

              {worksheetError && (
                <div className="bg-red-50 text-red-700 text-[10px] font-bold p-3 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{worksheetError}</span>
                </div>
              )}
            </div>

            {/* Hint Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Interactive Blueprint
              </span>
              <p className="leading-relaxed font-medium">
                Our advanced grid alignment engine runs completely client-side. Word Searches fit perfectly in random directions, and Crosswords use crossing algorithms! Click &quot;Teacher Key&quot; to toggle letter guides.
              </p>
            </div>
          </div>

          {/* WORKSHEET LIVE PRINT PREVIEW */}
          <div className="lg:col-span-8">
            <div className="bg-slate-50 rounded-2xl border-2 border-slate-300 p-3 flex justify-between items-center mb-4 no-print gap-3">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Worksheet Live A4 Canvas</span>
              </div>
              <button
                onClick={handlePrintWorksheet}
                className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2 border-2 border-slate-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Worksheet</span>
              </button>
            </div>

            {/* A4 Printable Sheet container */}
            <div 
              id="worksheetPrintableCanvas"
              className="w-full bg-white border-4 border-slate-900 rounded-2xl shadow-[8px_8px_0px_rgba(0,0,0,1)] p-8 md:p-12 min-h-[842px] relative overflow-visible flex flex-col justify-between"
            >
              {/* Show Empty state if no generated structure */}
              {((worksheetTab === "wordsearch" && !generatedWordsearch) ||
                (worksheetTab === "scramble" && generatedScramble.length === 0) ||
                (worksheetTab === "crossword" && !generatedCrossword)) ? (
                <div className="flex flex-col items-center justify-center text-center py-20 my-auto">
                  <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center border-4 border-slate-900 shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-6">
                    <BookOpen className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h4 className="font-black text-slate-800 text-lg uppercase tracking-wide">
                    Ready to Build Puzzle
                  </h4>
                  <p className="text-slate-500 font-medium text-xs max-w-sm mt-2 leading-relaxed">
                    Click &quot;Local Draft&quot; to instantly build the puzzle from your custom word lists, or &quot;AI Enrich&quot; to let Gemini generate the vocabulary!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Traditional Student Exam Header */}
                  <div className="border-4 border-slate-900 p-4 rounded-xl">
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-3 text-center">
                      <div className="text-left">
                        <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{worksheetSchool}</h4>
                        <h1 className="font-black text-slate-950 text-base md:text-lg uppercase tracking-tight">
                          {worksheetTitle}
                        </h1>
                        <span className="text-[10px] text-slate-500 font-bold italic">{worksheetSubtitle}</span>
                      </div>
                      <div className="text-right">
                        <div className="inline-block px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-[8px] font-extrabold uppercase rounded-full text-indigo-800">
                          {worksheetTab.toUpperCase()} EDITION
                        </div>
                      </div>
                    </div>

                    {/* Standard Exam Identification Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-extrabold text-slate-700">
                      <div>Name: ______________________</div>
                      <div>Section: ___________________</div>
                      <div>Date: ______________________</div>
                      <div className="text-right text-slate-900 font-black">Score: ________ / 10</div>
                    </div>
                  </div>

                  {/* Student Instructions */}
                  <div className="bg-slate-50 border-2 border-slate-900 p-3 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="bg-slate-900 text-white rounded text-[9px] font-black px-1.5 py-0.5 uppercase">
                      GUIDE
                    </span>
                    <p className="font-medium italic text-slate-700">{worksheetInstructions}</p>
                  </div>

                  {/* Puzzle Core Display Grid */}
                  
                  {/* WORD SEARCH PUZZLE */}
                  {worksheetTab === "wordsearch" && generatedWordsearch && (
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <div className="bg-white border-4 border-slate-900 p-4 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                          <div 
                            className="grid gap-0.5 bg-slate-200 border border-slate-300 p-0.5"
                            style={{
                              gridTemplateColumns: `repeat(${wordsearchSize}, minmax(0, 1fr))`,
                              width: wordsearchSize * 26 + "px"
                            }}
                          >
                            {generatedWordsearch.grid.map((row, rIdx) => 
                              row.map((char, cIdx) => {
                                const isAnswer = showWorksheetAnswers && generatedWordsearch.answerGrid?.[rIdx]?.[cIdx];
                                return (
                                  <div 
                                    key={`${rIdx}-${cIdx}`}
                                    className={`aspect-square flex items-center justify-center font-black font-mono text-xs select-none border border-slate-100 uppercase transition-all duration-150 ${
                                      isAnswer 
                                        ? "bg-pink-200 text-pink-900 font-extrabold scale-105 shadow-[0_0_4px_rgba(236,72,153,0.3)] z-10" 
                                        : "bg-white text-slate-800"
                                    }`}
                                  >
                                    {char}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Word Bank section */}
                      <div className="border-2 border-slate-900 rounded-xl p-4 bg-slate-50">
                        <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">
                          Vocabulary Word Bank (Find these hidden terms!)
                        </h4>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {generatedWordsearch.wordList.map((word, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <span className="w-3.5 h-3.5 rounded border border-slate-400 flex-shrink-0 bg-white"></span>
                              <span className={generatedWordsearch.placedWords.includes(word) ? "text-slate-850" : "text-slate-300 line-through font-medium"}>
                                {word}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SCRAMBLE PUZZLE */}
                  {worksheetTab === "scramble" && generatedScramble.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <div className={`grid gap-4 ${scrambleCols === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                        {generatedScramble.map((item, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center gap-3 border-2 border-slate-900 rounded-lg p-3 bg-white hover:bg-slate-50 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                          >
                            <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs font-mono">
                              {idx + 1}
                            </span>
                            <div className="flex-1 space-y-1">
                              <span className="font-mono font-black text-indigo-950 uppercase tracking-[0.25em] text-sm block">
                                {item.scrambled}
                              </span>
                              <div className="border-b border-dashed border-slate-400 h-6"></div>
                              {showWorksheetAnswers && (
                                <span className="text-[9px] text-rose-600 font-extrabold block">
                                  Answer Key: {item.original}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CROSSWORD PUZZLE */}
                  {worksheetTab === "crossword" && generatedCrossword && (
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <div className="bg-slate-950 border-4 border-slate-950 p-3 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] inline-block">
                          <div 
                            className="grid gap-[1px]"
                            style={{
                              gridTemplateColumns: `repeat(${generatedCrossword.dim}, minmax(0, 1fr))`,
                              width: generatedCrossword.dim * 24 + "px"
                            }}
                          >
                            {generatedCrossword.grid.map((row, rIdx) => 
                              row.map((char, cIdx) => {
                                const isBlack = char === "";
                                const indexNum = generatedCrossword.numberGrid[rIdx][cIdx];
                                return (
                                  <div 
                                    key={`${rIdx}-${cIdx}`}
                                    className={`aspect-square relative flex items-center justify-center font-extrabold text-[10px] font-mono select-none uppercase ${
                                      isBlack ? "bg-slate-900 text-slate-900" : "bg-white border border-slate-100 text-slate-900"
                                    }`}
                                  >
                                    {indexNum > 0 && (
                                      <span className="absolute top-0.5 left-0.5 text-[6px] font-black text-slate-500 leading-none">
                                        {indexNum}
                                      </span>
                                    )}
                                    {!isBlack && showWorksheetAnswers && char}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Across and Down clues */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-2 border-slate-900 rounded-xl p-4 bg-slate-50">
                        {/* Across Clues Column */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black uppercase text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1">
                            <Grid className="w-3.5 h-3.5 text-indigo-600" /> Across / Pahalang
                          </h4>
                          <ul className="space-y-1.5 text-[10px] text-slate-700 font-medium">
                            {generatedCrossword.acrossClues.map((item, idx) => (
                              <li key={idx} className="leading-relaxed">
                                <span className="font-extrabold text-slate-950 mr-1">({item.num})</span>
                                {item.clue}
                                {showWorksheetAnswers && (
                                  <span className="text-rose-600 font-bold ml-1">[{item.word}]</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Down Clues Column */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black uppercase text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1">
                            <Grid className="w-3.5 h-3.5 text-indigo-600" /> Down / Pababa
                          </h4>
                          <ul className="space-y-1.5 text-[10px] text-slate-700 font-medium">
                            {generatedCrossword.downClues.map((item, idx) => (
                              <li key={idx} className="leading-relaxed">
                                <span className="font-extrabold text-slate-950 mr-1">({item.num})</span>
                                {item.clue}
                                {showWorksheetAnswers && (
                                  <span className="text-rose-600 font-bold ml-1">[{item.word}]</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signatures & Footer block */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 mt-6">
                    <div className="text-xs font-bold text-slate-700">
                      <span>Prepared by:</span>
                      <p className="underline underline-offset-4 decoration-slate-400 mt-2">_____________________________</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Classroom Evaluator</p>
                    </div>
                    <div className="text-right text-xs font-bold text-slate-700">
                      <span>Checked by:</span>
                      <p className="underline underline-offset-4 decoration-slate-400 mt-2">_____________________________</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Department Head / Principal</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[8px] text-slate-400 font-extrabold tracking-widest uppercase">
                    <span>REELSYSTEM OFFLINE-READY EXAM TEMPLATE</span>
                    <span>WORKSHEET REF: #{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>

                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

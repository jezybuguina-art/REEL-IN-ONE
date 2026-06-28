import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";
import { createRequire } from "module";
// @ts-ignore
const requireFn = typeof require !== "undefined" ? require : createRequire(import.meta.url);

async function pdfParse(buffer: Buffer): Promise<{ text: string }> {
  try {
    const pdfParseRaw = requireFn("pdf-parse");
    // 1. Check if it's the modern class-based API first (v2.4.5+)
    const PDFParseClass = pdfParseRaw?.PDFParse || (pdfParseRaw?.default && pdfParseRaw?.default?.PDFParse);
    if (PDFParseClass) {
      console.log("[Parser] Running universal parser: modern class-based PDFParse");
      const instance = new PDFParseClass({ data: buffer });
      const textResult = await instance.getText();
      return { text: textResult?.text || "" };
    }
    // 2. Legacy function-based pdf-parse
    if (typeof pdfParseRaw === "function") {
      console.log("[Parser] Running universal parser: legacy function-based pdf-parse");
      const result = await pdfParseRaw(buffer);
      return { text: result?.text || "" };
    }
    // 3. Legacy default-wrapped pdf-parse
    if (pdfParseRaw?.default && typeof pdfParseRaw.default === "function") {
      console.log("[Parser] Running universal parser: legacy default-wrapped function-based pdf-parse");
      const result = await pdfParseRaw.default(buffer);
      return { text: result?.text || "" };
    }
    throw new Error("No usable PDF parsing class or function exports found in pdf-parse.");
  } catch (err: any) {
    console.error("[Parser Error] Universal pdfParse helper failure:", err);
    throw err;
  }
}

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

// Lazy initialization of the Google Gen AI client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is missing. " +
      "Please configure your Gemini API Key in the Secrets panel in AI Studio."
    );
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

interface GenerateContentParams {
  contents: any;
  config?: any;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateContentWithFallback(params: GenerateContentParams): Promise<any> {
  const ai = getGeminiClient();
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro", "gemini-1.5-pro"];
  
  let lastError: any = null;
  for (const model of modelsToTry) {
    let attempts = 0;
    const maxRetryAttempts = 3; // exactly 3 retry attempts max
    while (attempts <= maxRetryAttempts) {
      try {
        console.log(`[Gemini Engine] Querying model: ${model} (Attempt ${attempts + 1})`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        attempts++;
        const isTransient503 = err.status === 503 || 
                               (err.message && (err.message.includes("503") || err.message.toLowerCase().includes("unavailable") || err.message.toLowerCase().includes("demand")));
        
        if (isTransient503 && attempts <= maxRetryAttempts) {
          const waitTime = Math.pow(2, attempts) * 1000 + Math.floor(Math.random() * 500);
          console.warn(`[Gemini Engine Transient Warning] Model ${model} returned 503. Retrying in ${waitTime}ms (Retry Attempt ${attempts} of ${maxRetryAttempts})...`);
          await delay(waitTime);
          continue;
        }

        console.warn(`[Gemini Engine Warning] Model ${model} failed after attempt ${attempts}:`, err.message || err);
        lastError = err;
        
        // Stop and throw if the error is 400 (Bad Request) like schema validator mismatch or invalid parameter so we don't try fallback models
        if (err.status === 400 || (err.message && (err.message.includes("schema") || err.message.includes("invalid argument") || err.message.includes("400")))) {
          throw err;
        }
        break; // break retry loop, try next fallback model
      }
    }
  }
  throw lastError || new Error("All Gemini models failed to generate content.");
}

async function generateContentStreamWithFallback(params: GenerateContentParams): Promise<any> {
  const ai = getGeminiClient();
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro", "gemini-1.5-pro"];
  
  let lastError: any = null;
  for (const model of modelsToTry) {
    let attempts = 0;
    const maxRetryAttempts = 3; // exactly 3 retry attempts max
    while (attempts <= maxRetryAttempts) {
      try {
        console.log(`[Gemini Stream Engine] Querying stream for model: ${model} (Attempt ${attempts + 1})`);
        const responseStream = await ai.models.generateContentStream({
          model,
          contents: params.contents,
          config: params.config,
        });
        return responseStream;
      } catch (err: any) {
        attempts++;
        const isTransient503 = err.status === 503 || 
                               (err.message && (err.message.includes("503") || err.message.toLowerCase().includes("unavailable") || err.message.toLowerCase().includes("demand")));
        
        if (isTransient503 && attempts <= maxRetryAttempts) {
          const waitTime = Math.pow(2, attempts) * 1000 + Math.floor(Math.random() * 500);
          console.warn(`[Gemini Stream Engine Transient Warning] Model ${model} returned 503. Retrying in ${waitTime}ms (Retry Attempt ${attempts} of ${maxRetryAttempts})...`);
          await delay(waitTime);
          continue;
        }

        console.warn(`[Gemini Stream Engine Warning] Model ${model} failed after attempt ${attempts}:`, err.message || err);
        lastError = err;
        break; // break retry loop, try next model
      }
    }
  }
  throw lastError || new Error("All Gemini streaming models failed.");
}

// ============================================================================
// API ENDPOINTS FOR REEL IN ONE
// ============================================================================

// 1. Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "REELINONE_ENGINES", system: "REELSYSTEM" });
});

// 2. AI Lesson Plan Fields Generator (Fills form fields based on simple input)
app.post("/api/lesson/generate-fields", async (req, res) => {
  try {
    const { topic, gradeLevel, subject, competency, contentStandards, performanceStandards } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: "Lesson topic is required." });
    }

    const ai = getGeminiClient();
    const prompt = `
      You are an expert curriculum planner specializing in DepEd (Department of Education, Philippines) curriculum standards.
      Please help me generate the specific content fields for a 4-session lesson block.
      
      Lesson Topic: ${topic}
      Grade Level: ${gradeLevel || "Not specified"}
      Subject: ${subject || "Not specified"}
      Learning Competency: ${competency || "Not specified"}
      Content Standards: ${contentStandards || "Not specified"}
      Performance Standards: ${performanceStandards || "Not specified"}

      CRITICAL INSTRUCTION FOR MULTI-SESSION DISTINCTNESS:
      This is a 4-session lesson plan. To prevent identical copy-paste rows in our 4-column master planner, you MUST structure your responses for ALL fields so that they contain exactly 4 separate/numbered lines (one per line, starting with 1., 2., 3., 4.). 
      Each line MUST represent a progressive, highly tailored, and completely unique detail for Session 1, Session 2, Session 3, and Session 4 respectively.
      The content of each session's row must be deeply and directly connected to that session's corresponding learning objective. Do not duplicate concepts or text across sessions.

      Required Content Mapping:
      1. objectives: Generate exactly 4 progressive learning objectives (one per line, prefixed with 1., 2., 3., 4.).
         - e.g., Session 1 foundational concept, Session 2 practical application, Session 3 peer collaborative design, Session 4 independent evaluation.
      2. preLesson: Generate exactly 4 distinct pre-lesson warmup/drill exercises (one per line, prefixed with 1., 2., 3., 4.) tailored to each objective.
      3. lessonFlow: Generate exactly 4 distinct step-by-step instructional pathways (one per line, prefixed with 1., 2., 3., 4.) detailing how to teach that day's objective.
      4. materials: Generate exactly 4 sets of specific learning materials (one per line, prefixed with 1., 2., 3., 4.) needed for each session.
      5. references: DepEd references or curriculum page source indications (one per line/session, prefixed with 1., 2., 3., 4.).
      6. background: Describe learner's specific readiness/prior knowledge focus for each session (one per line, prefixed with 1., 2., 3., 4.).
      7. setup: Arrangement instructions or learning cluster guidance for each session (one per line, prefixed with 1., 2., 3., 4.).
      8. integration: Linkages to other focus areas, Values Education, or sciences (one per line, prefixed with 1., 2., 3., 4.).
      9. assessmentPlan: Specific formative evaluations (exit ticket, oral check, peer check) (one per line, prefixed with 1., 2., 3., 4.) evaluating that session's objective.
      10. extendedLearning: Simple daily homework or extension activities (one per line, prefixed with 1., 2., 3., 4.).
      11. reflectionQuestions: Self-evaluative teacher reflection prompts (one per line, prefixed with 1., 2., 3., 4.).

      Respond STRICTLY with a JSON object structure reflecting these exact keys to populate the educational planner:
      {
        "objectives": "1. [Objective 1]\\n2. [Objective 2]\\n3. [Objective 3]\\n4. [Objective 4]",
        "preLesson": "1. [Warmup 1]\\n2. [Warmup 2]\\n3. [Warmup 3]\\n4. [Warmup 4]",
        "lessonFlow": "1. [Instructional steps 1]\\n2. [Instructional steps 2]\\n3. [Instructional steps 3]\\n4. [Instructional steps 4]",
        "materials": "1. [Materials 1]\\n2. [Materials 2]\\n3. [Materials 3]\\n4. [Materials 4]",
        "references": "1. [References 1]\\n2. [References 2]\\n3. [References 3]\\n4. [References 4]",
        "background": "1. [Background 1]\\n2. [Background 2]\\n3. [Background 3]\\n4. [Background 4]",
        "setup": "1. [Setup 1]\\n2. [Setup 2]\\n3. [Setup 3]\\n4. [Setup 4]",
        "integration": "1. [Integration 1]\\n2. [Integration 2]\\n3. [Integration 3]\\n4. [Integration 4]",
        "assessmentPlan": "1. [Assessment 1]\\n2. [Assessment 2]\\n3. [Assessment 3]\\n4. [Assessment 4]",
        "extendedLearning": "1. [Extended learning 1]\\n2. [Extended learning 2]\\n3. [Extended learning 3]\\n4. [Extended learning 4]",
        "reflectionQuestions": "1. [Reflection prompt 1]\\n2. [Reflection prompt 2]\\n3. [Reflection prompt 3]\\n4. [Reflection prompt 4]"
      }
    `;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objectives: { type: Type.STRING },
            preLesson: { type: Type.STRING },
            lessonFlow: { type: Type.STRING },
            materials: { type: Type.STRING },
            references: { type: Type.STRING },
            background: { type: Type.STRING },
            setup: { type: Type.STRING },
            integration: { type: Type.STRING },
            assessmentPlan: { type: Type.STRING },
            extendedLearning: { type: Type.STRING },
            reflectionQuestions: { type: Type.STRING },
          },
          required: [
            "objectives", "preLesson", "lessonFlow", "materials", "references", "background", 
            "setup", "integration", "assessmentPlan", "extendedLearning", "reflectionQuestions"
          ]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No output generated from Gemini model.");
    }

    res.json(JSON.parse(outputText.trim()));
  } catch (error: any) {
    console.error("AI Lesson plan field generator error:", error);
    res.status(500).json({ error: error.message || "Failed to generate lesson fields." });
  }
});

app.post("/api/lesson/generate-only-objectives", async (req, res) => {
  try {
    const { topic, gradeLevel, subject, competency, contentStandards, performanceStandards, sessionCount } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Lesson topic is required." });
    }
    const count = parseInt(sessionCount) || 4;
    const prompt = `
      You are an expert curriculum planner specializing in DepEd (Department of Education, Philippines) MATATAG curriculum guidelines.
      Please generate exactly ${count} highly action-oriented, specific learning objectives (one per line, numbered 1. to ${count}.) based on the following topic and parameters.
      
      Topic: ${topic}
      Grade Level: ${gradeLevel || "Not specified"}
      Subject: ${subject || "Not specified"}
      Competency: ${competency || "Not specified"}
      Content Standards: ${contentStandards || "Not specified"}
      Performance Standards: ${performanceStandards || "Not specified"}
      
      Guidelines:
      - The objectives MUST be progressive (e.g. from foundational comprehension, application, up to design/synthesis or evaluation).
      - Conforms to Bloom's taxonomy but adapted to DepEd MATATAG's learner-centric approach.
      - Keep them brief, highly clear, and action-oriented (using action verbs like Identify, Describe, Analyze, Demonstrate, Evaluate).
      
      Output ONLY a string containing the numbered objectives. No other surrounding conversational text or markdown blocks, e.g.
      1. Define objective one
      2. Construct objective two
    `;

    const response = await generateContentWithFallback({
      contents: prompt,
    });

    const objectivesText = response.text || "";
    res.json({ objectives: objectivesText.trim() });
  } catch (error: any) {
    console.error("AI Generate Objectives error:", error);
    res.status(500).json({ error: error.message || "Failed to generate objectives." });
  }
});

app.post("/api/lesson/unpack-objectives", async (req, res) => {
  try {
    const { objectives, gradeLevel, subject } = req.body;
    if (!objectives) {
      return res.status(400).json({ error: "Objectives text is required to unpack." });
    }

    const ai = getGeminiClient();
    const prompt = `
      You are an expert curriculum developer specializing in DepEd MATATAG standards. Your task is to take the user-provided learning objective(s) and "unpack" them.
      Unpacking means taking complex or multi-layered classroom targets and breaking them down into clearer, simpler, and highly operational dimensions so that teachers can easily teach and measure them.
      
      Input Objectives:
      ${objectives}
      
      Grade/Subject Context: ${gradeLevel || "Not specified"} - ${subject || "Not specified"}

      For each distinct learning objective parsed from the text, break it down into a highly structured representation containing:
      - original: The exact text of the objective
      - knowledge: 2-3 specific content pieces the learner must understand (bullet points)
      - skills: 2-3 specific micro-skills the learner must demonstrate (bullet points)
      - simplifiedText: A plain-english, jargon-free simplification of the objective (1-2 sentences maximum, extremely clear)
      - milestones: 2 to 3 chronological steps or progressive milestones to build up to this objective.
      - suggestedActivity: A highly engaging, interactive, active-learning classroom activity designed for this objective.
      - assessmentIdea: A quick formative assessment/verification check to see if they got it.

      Respond STRICTLY with a JSON array corresponding to the unpacked list of objectives matching the schema.
    `;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              original: { type: Type.STRING },
              knowledge: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              simplifiedText: { type: Type.STRING },
              milestones: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              suggestedActivity: { type: Type.STRING },
              assessmentIdea: { type: Type.STRING }
            },
            required: [
              "original", "knowledge", "skills", "simplifiedText", "milestones", "suggestedActivity", "assessmentIdea"
            ]
          }
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No output generated from Gemini model.");
    }

    res.json(JSON.parse(outputText.trim()));
  } catch (error: any) {
    console.error("AI Unpack Objectives error:", error);
    res.status(500).json({ error: error.message || "Failed to unpack objectives." });
  }
});

// 2.5. File Content Extractor (DOCX, PDF, or Images JPEG/PNG)
app.post("/api/lesson/parse-file", async (req, res) => {
  try {
    const { fileBase64, fileName, mimeType } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: "File data (base64) is required." });
    }

    const typeLower = (mimeType || "").toLowerCase();
    const nameLower = (fileName || "").toLowerCase();

    // Word Document Handling (.docx)
    if (typeLower.includes("wordprocessingml") || typeLower.includes("msword") || nameLower.endsWith(".docx")) {
      console.log(`[Parser] Processing DOCX file: ${fileName || "document.docx"}`);
      const buffer = Buffer.from(fileBase64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      
      if (!result.value || result.value.trim().length === 0) {
        return res.status(400).json({ error: "No readable text content found in the Word document. The file might be empty or consist only of unsupported graphical elements." });
      }

      return res.json({ text: result.value });
    }

    // PDF or Image Multi-Modal Handling via Gemini
    if (typeLower.includes("pdf") || typeLower.includes("image") || typeLower.startsWith("image/") || nameLower.endsWith(".pdf") || nameLower.endsWith(".png") || nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg") || nameLower.endsWith(".webp")) {
      console.log(`[Parser] Processing Multimodal ${typeLower} via Gemini/pdf-parse: ${fileName || "file"}`);
      const ai = getGeminiClient();

      let targetMimeType = typeLower;
      if (nameLower.endsWith(".pdf")) targetMimeType = "application/pdf";
      else if (nameLower.endsWith(".png")) targetMimeType = "image/png";
      else if (nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")) targetMimeType = "image/jpeg";
      else if (nameLower.endsWith(".webp")) targetMimeType = "image/webp";

      // 1. If PDF, try high-reliability local extraction first to bypass any Gemini API Upload blocks
      if (targetMimeType === "application/pdf" || nameLower.endsWith(".pdf")) {
        try {
          console.log(`[Parser] Attempting high-reliability local text extraction on PDF: ${fileName}`);
          const buffer = Buffer.from(fileBase64, "base64");
          const parsedData = await pdfParse(buffer);
          const rawText = parsedData.text || "";
          
          if (rawText.trim().length > 30) {
            let structuredText = "";
            try {
              console.log(`[Parser] Local pdf-parse succeeded! Extracted ${rawText.trim().length} characters of raw text. Formatting beautiful Markdown via Gemini text engine...`);
              
              const prompt = `You are an expert curriculum assistant specialized in reformatting, structuring, and restoring lesson plans.
Below is the raw text extracted from a lesson plan PDF document:

--- START OF RAW TEXT ---
${rawText}
--- END OF RAW TEXT ---

Analyze and reformat this raw content into beautiful, highly readable, structured Markdown. 
Guidelines:
- Maintain all school headers, objectives, daily flows, tables, and lists exactly as specified in the original content.
- Fix broken layouts, bad alignments, and spacing issues common in raw PDF textual extractions.
- Do NOT summarize or omit any sections. Reconstruct everything in full detail.
- Return ONLY the structured Markdown output. No introductions, headers, or pleasantries.`;

              const formatResponse = await generateContentWithFallback({
                contents: prompt,
              });

              structuredText = formatResponse.text || "";
            } catch (formatErr: any) {
              console.warn("[Parser Warning] Reformatting via Gemini failed (API restriction/key limits), returning raw text directly:", formatErr.message || formatErr);
            }

            if (structuredText && structuredText.trim().length > 0) {
              console.log("[Parser] Formatting successfully restored via Gemini text engine.");
              return res.json({ text: structuredText });
            }
            
            console.log("[Parser] Returning raw extracted text directly due to formatting skip/fallback.");
            return res.json({ text: rawText });
          }
          console.log(`[Parser] Local extraction yielded too little text. Proceeding to Gemini multimodal workflow.`);
        } catch (pdfErr: any) {
          console.error("[Parser Warning] Local pdf-parse failed, falling back to Gemini multimodal parser:", pdfErr.message || pdfErr);
        }
      }

      // 2. Multimodal Fallback for Scanned files & Images
      try {
        const filePart = {
          inlineData: {
            mimeType: targetMimeType || "application/pdf",
            data: fileBase64,
          },
        };

        const promptPart = {
          text: `You are an expert curriculum assistant specialized in transcriptions and educational parsing.
Analyze the attached file (which is a lesson plan document, scan, or photo) and extract ALL content exactly as written.
Ensure you recover the learning standards, objectives, daily flow, activities, assessments, and teacher notes.
Structure the extracted output in clean, highly readable Markdown, maintaining tables and lists where applicable.
Do NOT summarize. Do NOT skip any section. Return ONLY the transcribed content without any introductions, pleasantries, or metadata wrappers.`
        };

        const response = await generateContentWithFallback({
          contents: { parts: [filePart, promptPart] },
        });

        const extractedText = response.text;
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error("Gemini parser failed to extract readable text content from the file.");
        }

        return res.json({ text: extractedText });
      } catch (geminiErr: any) {
        console.error("[Parser Error] Gemini multimodal extraction failed:", geminiErr);
        
        const errMsg = geminiErr.message || String(geminiErr);
        if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("does not have permission") || geminiErr.status === 403) {
          throw new Error("The uploaded file requires advanced OCR scanning. However, the Gemini API key provided has an API restriction/permission limit preventing binary uploads (403 Permission Denied).\n\nPlease try using a downloadable digital (text-based) PDF, or copy and paste the text directly into the original text editor below.");
        }
        
        throw geminiErr;
      }
    }

    // Fallback for standard text-based files sent to backend
    if (typeLower.includes("text") || typeLower.includes("json") || nameLower.endsWith(".txt") || nameLower.endsWith(".md") || nameLower.endsWith(".json") || nameLower.endsWith(".html")) {
      console.log(`[Parser] Decoding plain text files: ${fileName || "text.txt"}`);
      const textDecoded = Buffer.from(fileBase64, "base64").toString("utf-8");
      return res.json({ text: textDecoded });
    }

    return res.status(400).json({ error: `Unsupported file format. Please upload .docx, .pdf, or image files (png/jpg).` });

  } catch (error: any) {
    console.error("File Parser endpoint error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred during document parsing." });
  }
});

// Helper to parse Markdown (especially Markdown Tables) into clean styled HTML to match "Print-Ready" templates.
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
  // Replace bold **text**
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Replace italic *text*
  parsed = parsed.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // Replace simple links [text](url)
  parsed = parsed.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' style='color:#b91c1c; text-decoration:underline;'>$1</a>");
  // Convert newlines to break tags for clean display in HTML tables/cells
  parsed = parsed.replace(/\n/g, "<br/>");
  return parsed;
}

function renderHtmlTableFromPayload(rows: string[][]): string {
  if (rows.length === 0) return "";
  
  let headerHtml = "";
  let bodyHtml = "";

  const headers = rows[0];
  headerHtml += "<tr style='background-color: #2c3e50; color: white;'>";
  headers.forEach(h => {
    headerHtml += `<th style='border: 1px solid #bdc3c7; padding: 10px; font-weight: 800; text-align: left; font-size: 12px; color: white;'>${parseInlineMarkdown(h)}</th>`;
  });
  headerHtml += "</tr>";

  for (let i = 1; i < rows.length; i++) {
    const isEven = i % 2 === 0;
    const bg = isEven ? "#f2f2f2" : "#ffffff";
    bodyHtml += `<tr style='background-color: ${bg};'>`;
    rows[i].forEach(cell => {
      bodyHtml += `<td style='border: 1px solid #bdc3c7; padding: 8px; vertical-align: top; font-size: 11.5px; color: #1e293b; line-height: 1.4;'>${parseInlineMarkdown(cell)}</td>`;
    });
    bodyHtml += "</tr>";
  }

  // Inject a printable style tag above the table for landscape rendering support
  return `
    <div style="overflow-x: auto; margin: 15px 0;">
      <style>
        @page { size: landscape; margin: 0.5in; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          table-layout: fixed; /* Ensures columns stay even */
          margin-bottom: 12px;
        }
        th { 
          background-color: #2c3e50; 
          color: white !important; 
          padding: 10px; 
          font-weight: 800;
        }
        td { 
          border: 1px solid #bdc3c7; 
          padding: 8px; 
          vertical-align: top; 
        }
        /* Alternating row colors for readability */
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

    // Markdown Table Detection
    if (line.startsWith("|")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      
      if (line.includes("---")) {
        continue;
      }

      const cols = line
        .split("|")
        .map(c => c.trim())
        .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

      if (!inTable) {
        inTable = true;
      }
      tableRows.push(cols);
      continue;
    } else {
      if (inTable) {
        html += renderHtmlTableFromPayload(tableRows);
        tableRows.length = 0;
        inTable = false;
      }
    }

    // Bullet points list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html += "<ul style='padding-left: 20px; list-style-type: disc; margin: 8px 0;'>";
        inList = true;
      }
      const itemText = line.substring(2);
      html += `<li style='margin-bottom:4px;'>${parseInlineMarkdown(itemText)}</li>`;
      continue;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    }

    if (line === "") {
      html += "<br />";
      continue;
    }

    // Headings
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

  if (inTable) {
    html += renderHtmlTableFromPayload(tableRows);
  }
  if (inList) {
    html += "</ul>";
  }

  return html;
}

// 3. Educational Format Converter (MATATAG, Lesson Exemplar, ILAW & other standards)
app.post("/api/lesson/convert", async (req, res) => {
  try {
    const { sourceFormat, targetFormat, content, additionalInstructions, profile, schoolLogo } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Source lesson plan content is required." });
    }

    const ai = getGeminiClient();

    const systemInstructions = `
      You are an expert curriculum architect for the REEL-IN-ONE app. Your goal is to analyze the user's provided lesson plan/material and convert it into a highly structured, 4-session ILAW comprehensive weekly plan containing non-repeating, specific weekly columns.

      MANDATORY DECOMPOSITION LOGIC ACROSS 4 SESSIONS:
      Decompose the learning progression across four distinct sessions:
      - Session 1: Acquisition (Foundational knowledge, basic exploration/theory)
      - Session 2: Integration (Connecting concepts, bridging knowledge to application)
      - Session 3: Collaborative Performance (Group engagement, team projects or student-led exercises)
      - Session 4: Independent Mastery (Individualized evaluations, assessments, self-led application)

      Ensure all mapped content satisfies these strict guidelines:
      1. Contextual Variance: The 'learningContext' cell MUST be unique for each session, reflecting student progress from Session 1 to Session 4.
      2. No copy-pasting: Avoid repetition in 'preLesson', 'lessonFlow', or 'materialsSelected' across columns.
      3. Assessment Content: For 'formativeEvaluation', you MUST provide a concrete, specific question or test task. Under no circumstances should you output generic text like "matching test". Format exactly like this: "Sample Activity: [activity text] | Sample Question: [precise question string]".
      4. Avoid placeholder entries: If certain information is missing (e.g. Content Standards or Teacher name), do not leave blank; extrapolate or suggest standard curriculum goals matching the topic.
    `;

    const prompt = `
      Analyze the source material and return a fully detailed 4-Session ILAW mapped JSON block.
      
      Source Material Content:
      ${content}

      Source Format Type: ${sourceFormat || "Not Specified"}
      Target Format requested: ${targetFormat || "ILAW Format"}
      Custom User Guidelines: ${additionalInstructions || "None."}

      JSON Output Schema Requirement:
      You MUST return your output strictly in JSON format. The object structure must exactly contain:
      {
        "topic": "Extracted topic or suggested title",
        "subject": "Extracted subject learning area",
        "teacher": "Extracted teacher name or a standard default like 'Teacher in Charge'",
        "gradeSchool": "Extracted grade level and school name or standard placeholder",
        "syllabusWindow": "Syllabus window, e.g. Quarter 1, Week 3 or equivalent dates",
        "materials": "Main generalized list of curriculum materials",
        "competency": "Extracted learning competency statement from standard",
        "contentStandards": "Extracted or inferred Content Standards",
        "performanceStandards": "Extracted or inferred Performance Standards",
        "session1": {
          "objective": "Session 1 specific learning objective",
          "learningContext": "Progression context starting at Session 1",
          "preLesson": "Warm-up activity / drill list as bullet points",
          "lessonFlow": "Direct classroom step-by-step instruction log",
          "materialsSelected": "Materials for Session 1",
          "syllabusIntegrations": "Integration with other subjects, core values, or syllabus links",
          "formativeEvaluation": "Sample Activity: [Title] | Sample Question: [Specific item]",
          "extendedAssignment": "Syllabus homework or extended assignment",
          "reflectionPrompt": "Specific cognitive reflection item"
        },
        "session2": {
          "objective": "Session 2 specific learning objective",
          "learningContext": "Progression context bridging concepts",
          "preLesson": "Conceptual warm-up drill list as bullet points",
          "lessonFlow": "Active application instruction steps",
          "materialsSelected": "Materials for Session 2",
          "syllabusIntegrations": "Integration or values mapped",
          "formativeEvaluation": "Sample Activity: [Title] | Sample Question: [Specific item]",
          "extendedAssignment": "Syllabus homework or extended assignment",
          "reflectionPrompt": "Reflection item"
        },
        "session3": {
          "objective": "Session 3 specific learning objective",
          "learningContext": "Progression context during collaborative stage",
          "preLesson": "Cooperative/team exploration drill points",
          "lessonFlow": "Collaborative group project guidance steps",
          "materialsSelected": "Materials for Session 3",
          "syllabusIntegrations": "Integration or values mapped",
          "formativeEvaluation": "Sample Activity: [Title] | Sample Question: [Specific item]",
          "extendedAssignment": "Syllabus homework or extended assignment",
          "reflectionPrompt": "Reflection item"
        },
        "session4": {
          "objective": "Session 4 specific learning objective",
          "learningContext": "Progression context for independent mastery",
          "preLesson": "Self-led check / silent warmup point",
          "lessonFlow": "Independent evaluation session steps",
          "materialsSelected": "Materials for Session 4",
          "syllabusIntegrations": "Integration or values mapped",
          "formativeEvaluation": "Sample Activity: [Title] | Sample Question: [Specific item]",
          "extendedAssignment": "Final extended exit assignment",
          "reflectionPrompt": "Meta-cognitive reflection item"
        }
      }
    `;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        temperature: 0.15,
        systemInstruction: systemInstructions,
        responseMimeType: "application/json"
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Gemini conversion failed to produce raw outputs.");
    }

    try {
      const data = JSON.parse(outputText);
      
      // Inject the stunning, screenshot-accurate ILAW Weekly Plan HTML template
      const styledHtml = `
<div class="ilaw-weekly-plan-container" style="font-family: system-ui, -apple-system, sans-serif; background: #ffffff; padding: 20px; border: 4px solid #921415; border-radius: 8px; color: #1e293b;">
  <!-- DepEd Header Seal with Sync Logo Support (Centered with Logos on Top) -->
  <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px double #921415; padding-bottom: 12px; font-family: system-ui, -apple-system, sans-serif;">
    <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 8px;">
      <img src="https://upload.wikimedia.org/wikipedia/commons/f/fb/Seal_of_the_Department_of_Education_of_the_Philippines.svg" alt="DepEd Logo" style="width: 50px; height: 50px; object-fit: contain;" referrerPolicy="no-referrer">
      ${schoolLogo ? `<img src="${schoolLogo}" alt="School Logo" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;">` : ""}
    </div>
    <div style="font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Republic of the Philippines</div>
    <div style="font-size: 18px; font-weight: 900; color: #921415; text-transform: uppercase; margin: 2px 0; line-height: 1.2;">Department of Education</div>
    <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 0.8px; line-height: 1.2;">REELSYSTEM EDUCATIONAL PARTNER NETWORK</div>
    <div style="font-size: 11px; font-weight: 900; color: #921415; margin-top: 5px; letter-spacing: 0.3px; line-height: 1.2;">REEL IN ONE — ILAW COMPREHENSIVE WEEKLY PLAN</div>
  </div>

  <!-- Meta Info Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 2.5px solid #921415;">
    <tbody>
      <tr>
        <td style="width: 22%; background-color: #fdf2f2; border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 850; color: #921415;">Lesson Topic/Title</td>
        <td style="width: 78%; border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 600; color: #000000; outline: none;" contenteditable="true">${data.topic || ""}</td>
      </tr>
      <tr>
        <td style="background-color: #fdf2f2; border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 850; color: #921415;">Learning Area / Subject</td>
        <td style="border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 600; color: #000000; outline: none;" contenteditable="true">${profile?.subject || data.subject || ""}</td>
      </tr>
      <tr>
        <td style="background-color: #fdf2f2; border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 850; color: #921415;">Teacher in Charge</td>
        <td style="border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 600; color: #000000; outline: none;" contenteditable="true">${profile?.teacherName || data.teacher || ""}</td>
      </tr>
      <tr>
        <td style="background-color: #fdf2f2; border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 850; color: #921415;">Grade Level & School</td>
        <td style="border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 600; color: #000000; outline: none;" contenteditable="true">${(profile?.gradeLevel || profile?.schoolName) ? `${profile.gradeLevel || ""}${profile.gradeLevel && profile.schoolName ? " — " : ""}${profile.schoolName || ""}` : (data.gradeSchool || "")}</td>
      </tr>
      <tr>
        <td style="background-color: #fdf2f2; border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 850; color: #921415;">Syllabus Window</td>
        <td style="border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 600; color: #000000; outline: none;" contenteditable="true">${data.syllabusWindow || ""}</td>
      </tr>
      <tr>
        <td style="background-color: #fdf2f2; border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 850; color: #921415;">Curriculum Materials</td>
        <td style="border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 600; color: #000000; outline: none;" contenteditable="true">${data.materials || ""}</td>
      </tr>
      <tr>
        <td style="background-color: #fdf2f2; border: 1.5px solid #921415; padding: 7px 10px; font-size: 11.5px; font-weight: 850; color: #921415;">AI Grounding Statement</td>
        <td style="border: 1.5px solid #921415; padding: 7px 10px; font-size: 10px; font-style: italic; color: #475569; line-height: 1.4;">
          This lesson plan structure was generated and detailed using REEL IN ONE AI ENGINES to assist the educator with DepEd learning alignment and explicit step logic mappings under the REELSYSTEM school companion standard.
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Giant ILAW Grid Matrix -->
  <table style="width: 100%; border-collapse: collapse; border: 3px solid #921415; table-layout: fixed;">
    <tbody>
      <!-- I. INTENTIONS -->
      <tr style="background-color: #921415; color: white;">
        <td colspan="5" style="border: 1.5px solid #921415; padding: 10px 12px; font-size: 13px; font-weight: 900; text-align: left; color: white;">
          💡 I. INTENTIONS. Meaningful learnings are anchored in how we structure them. We decide what learners must master by the end of the lesson block.
        </td>
      </tr>
      <tr style="background: #ffffff;">
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top; width: 18%;">
          DepEd Core Standards
        </td>
        <td colspan="4" style="border: 1.5px solid #921415; padding: 8px 10px; font-size: 11px; color: #000000; line-height: 1.4; vertical-align: top; outline: none;" contenteditable="true">
          <strong>Learning Competency:</strong> ${data.competency || ""}<br/><br/>
          <strong>Content Standards:</strong> ${data.contentStandards || ""}<br/><br/>
          <strong>Performance Standards:</strong> ${data.performanceStandards || ""}
        </td>
      </tr>
      <tr style="background-color: #fdf2f2;">
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 900; text-align: left; color: #921415; width: 18%;">
          Section Logic Mappings
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 900; text-align: left; color: #921415; width: 20.5%;">
          Session 1 (Acquisition)
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 900; text-align: left; color: #921415; width: 20.5%;">
          Session 2 (Integration)
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 900; text-align: left; color: #921415; width: 20.5%;">
          Session 3 (Collaborative Performance)
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 900; text-align: left; color: #921415; width: 20.5%;">
          Session 4 (Independent Mastery)
        </td>
      </tr>
      <!-- Objectives -->
      <tr>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top;">
          Objectives:
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session1.objective)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session2.objective)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session3.objective)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session4.objective)}
        </td>
      </tr>
      <!-- Learning Context -->
      <tr>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top;">
          Learning Context:
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session1.learningContext)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session2.learningContext)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session3.learningContext)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session4.learningContext)}
        </td>
      </tr>

      <!-- II. LEARNING EXPERIENCES -->
      <tr style="background-color: #921415; color: white;">
        <td colspan="5" style="border: 1.5px solid #921415; padding: 10px 12px; font-size: 13px; font-weight: 900; text-align: left; color: white;">
          🌿 II. LEARNING EXPERIENCES. Designing a thoughtful student-centered learning pathway where each step builds master understanding.
        </td>
      </tr>
      <!-- Pre-Lesson Warmup -->
      <tr>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top;">
          Pre-Lesson (Warmup):
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session1.preLesson)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session2.preLesson)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session3.preLesson)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session4.preLesson)}
        </td>
      </tr>
      <!-- Lesson Flow -->
      <tr>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top;">
          Lesson Flow (Logic):
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session1.lessonFlow)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session2.lessonFlow)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session3.lessonFlow)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session4.lessonFlow)}
        </td>
      </tr>
      <!-- Materials Selected -->
      <tr>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top;">
          Materials Selected:
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session1.materialsSelected)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session2.materialsSelected)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session3.materialsSelected)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session4.materialsSelected)}
        </td>
      </tr>
      <!-- Syllabus Integrations -->
      <tr>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top;">
          Syllabus Integrations:
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session1.syllabusIntegrations)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session2.syllabusIntegrations)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session3.syllabusIntegrations)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session4.syllabusIntegrations)}
        </td>
      </tr>

      <!-- III. ASSESSMENT -->
      <tr style="background-color: #921415; color: white;">
        <td colspan="5" style="border: 1.5px solid #921415; padding: 10px 12px; font-size: 13px; font-weight: 900; text-align: left; color: white;">
          🎯 III. ASSESSMENT. Gathering tangible deliverables which display factual mastery and guide immediate teaching coaching response.
        </td>
      </tr>
      <!-- Formative Evaluations -->
      <tr>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top;">
          Formative Evaluations:
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session1.formativeEvaluation)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session2.formativeEvaluation)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session3.formativeEvaluation)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session4.formativeEvaluation)}
        </td>
      </tr>

      <!-- IV. WAYS FORWARD -->
      <tr style="background-color: #921415; color: white;">
        <td colspan="5" style="border: 1.5px solid #921415; padding: 10px 12px; font-size: 13px; font-weight: 900; text-align: left; color: white;">
          🚀 IV. WAYS FORWARD. Reflections for continuous alignment. Pause, reflect, and detail opportunities beyond the bell.
        </td>
      </tr>
      <!-- Extended Assignments -->
      <tr>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top;">
          Extended Assignments:
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session1.extendedAssignment)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session2.extendedAssignment)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session3.extendedAssignment)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session4.extendedAssignment)}
        </td>
      </tr>
      <!-- Reflection Prompts -->
      <tr>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 11px; font-weight: 850; color: #921415; background-color: #fdf2f2; vertical-align: top;">
          Reflection Prompts:
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session1.reflectionPrompt)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session2.reflectionPrompt)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session3.reflectionPrompt)}
        </td>
        <td style="border: 1.5px solid #921415; padding: 8px; font-size: 10.5px; vertical-align: top; color: #000000; line-height: 1.4; outline: none;" contenteditable="true">
          ${parseInlineMarkdown(data.session4.reflectionPrompt)}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Bottom Signatures row matching look in picture -->
  <div style="margin-top: 25px; border: 2.5px solid #921415; padding: 12px; border-radius: 6px; background: #fafafa;">
    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11.5px; font-weight: 700; color: #1e293b;">
      <div style="border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px;">
        <span style="color: #921415;">Prepared and Written By:</span> <span style="font-weight: 500; font-family: monospace;">${profile?.preparedBy ? `${profile.preparedBy} (${profile.preparedPosition || ""})` : (profile?.teacherName || data.teacher || "[Not Specified]")}</span>
      </div>
      <div style="border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px;">
        <span style="color: #921415;">Checked and Reviewed By:</span> <span style="font-weight: 500; font-family: monospace;">${profile?.checkedBy ? `${profile.checkedBy} (${profile.checkedPosition || ""})` : "[REELSYSTEM EDUCATIONAL CO-LEAD]"}</span>
      </div>
      <div>
        <span style="color: #921415;">Approved for Execution:</span> <span style="font-weight: 500; font-family: monospace;">${profile?.approvedBy ? `${profile.approvedBy} (${profile.approvedPosition || ""})` : "[DEPED REGION PRINCIPAL / OFFICE IN CHARGE]"}</span>
      </div>
    </div>
  </div>
</div>
      `;

      res.json({ convertedContent: styledHtml, rawContent: outputText });
    } catch (parseErr) {
      console.warn("Could not parse output as JSON, falling back to clean Markdown conversion:", parseErr);
      // Fallback: If Gemini didn't return perfect JSON or it failed to parse, use standard Markdown converter
      const htmlOutput = convertMarkdownToHtml(outputText);
      res.json({ convertedContent: htmlOutput, rawContent: outputText });
    }
  } catch (error: any) {
    console.error("AI Format Converter error:", error);
    res.status(500).json({ error: error.message || "Failed to convert format." });
  }
});

// 3.5 Objective-Based Matrix Table Generator (Tailored & Unique details per Objective)
app.post("/api/lesson/generate-matrix-table", async (req, res) => {
  try {
    const { objectives, topic, subject, gradeLevel } = req.body;

    if (!objectives) {
      return res.status(400).json({ error: "Learning objectives are required." });
    }

    const ai = getGeminiClient();
    const prompt = `
      You are an expert curriculum architect specializing in ILAW (Intentions, Learning Experiences, Assessment, Ways Forward) curriculum planning.
      
      Generate a comprehensive lesson plan table based on the provided learning objectives.
      
      Lesson Topic/Title: ${topic || "Not Specified"}
      Subject Area: ${subject || "Not Specified"}
      Grade Level: ${gradeLevel || "Not Specified"}
      
      Learning Objectives Provided:
      ${objectives}

      YOUR CRITICAL TASK:
      For EVERY single objective provided above, you must create a UNIQUE, separate, and highly tailored row in the output Markdown Table.
      
      The table MUST structure the mapping of sections with these exact columns:
      | Objective | Learning Context | Pre-Lesson | Lesson Flow | Materials | Syllabus Integrations | Extended Assignments | Reflection Prompts |

      CONSTRAINTS:
      1. Under NO circumstances should you repeat or reuse the same text or generic placeholder phrases for different objectives.
      2. Each and every cell in the row must be deeply, contextually, and specifically relevant to the particular learning objective of that row.
      3. Provide highly actionable, detailed instructional steps and real-world integration ideas.
      4. Avoid repetitive language or duplicate layouts across different sections or objectives.
      
      Output ONLY the Markdown Table without any introductory or concluding logs or conversational responses.
    `;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        temperature: 0.2 // As recommended by user pro-tip!
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Failed to generate the objective matrix table.");
    }

    const htmlOutput = convertMarkdownToHtml(outputText);
    res.json({ matrixTable: htmlOutput, rawTable: outputText });
  } catch (error: any) {
    console.error("AI Objective Matrix Table error:", error);
    res.status(500).json({ error: error.message || "Failed to generate objective-based lesson plan table." });
  }
});

// 3.6 4-Session Lesson Planner Stream Endpoint (Bypasses timeout limits beautifully)
app.post("/api/lesson/generate-matrix-table-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const { objectives, topic, subject, gradeLevel, option } = req.body;

    if (!objectives) {
      res.write(`data: ${JSON.stringify({ error: "Learning objectives are required." })}\n\n`);
      res.end();
      return;
    }

    const ai = getGeminiClient();
    
    let prompt = "";
    if (option === "4-session") {
      prompt = `
        You are an expert curriculum architect for the REEL-IN-ONE app. Your goal is to generate high-fidelity, session-specific lesson plans in a table format.
        
        Lesson Topic: ${topic || "Not Specified"}
        Subject Area: ${subject || "Not Specified"}
        Grade Level: ${gradeLevel || "Not Specified"}
        Objectives:
        ${objectives}

        MANDATORY LOGIC FOR MULTIPLE SESSIONS:

        Decomposition: You must decompose the learning arc across 4 sessions:
        - Session 1: Acquisition (Foundational knowledge)
        - Session 2: Integration (Bridging knowledge to application)
        - Session 3: Collaborative Performance (Group or peer-based application)
        - Session 4: Independent Mastery (Individualized evaluation)

        Contextual Variance: The 'Learning Context' MUST be unique for each session. It must reflect the student's progress as they move from Session 1 to Session 4.

        Assessment Content: For 'Formative Evaluations,' you must NOT use descriptions. You must provide a concrete sample assessment.
        Format: 'Sample Activity: [Task description] | Sample Question: [Specific question/prompt]'.

        Constraint: Each session column must contain unique content. Do not copy-paste 'Lesson Flow' or 'Materials' from the previous column. Use the objective(s) to derive specific materials (e.g., if the objective is 'Identifying Main Idea', materials must specify 'Paragraphs about [Topic]' rather than generic 'informational paragraphs').

        Output Format:
        Always output a Markdown table with these exact headers:
        | Session | Objective | Learning Context | Lesson Flow | Materials | Formative Evaluation (Sample) |
        
        Output ONLY the Markdown Table. Do not include any standard chat pleasantries or conversational intros/outros.
      `;
    } else {
      prompt = `
        You are an expert curriculum architect specializing in ILAW (Intentions, Learning Experiences, Assessment, Ways Forward) curriculum planning.
        
        Generate a comprehensive lesson plan table based on the provided learning objectives.
        
        Lesson Topic/Title: ${topic || "Not Specified"}
        Subject Area: ${subject || "Not Specified"}
        Grade Level: ${gradeLevel || "Not Specified"}
        Learning Objectives Provided:
        ${objectives}

        YOUR CRITICAL TASK:
        For EVERY single objective provided above, you must create a UNIQUE, separate, and highly tailored row in the output Markdown Table.
        
        The table MUST structure the mapping of sections with these exact columns:
        | Objective | Learning Context | Pre-Lesson | Lesson Flow | Materials | Syllabus Integrations | Extended Assignments | Reflection Prompts |

        CONSTRAINTS:
        1. Under NO circumstances should you repeat or reuse the same text or generic placeholder phrases for different objectives.
        2. Each and every cell in the row must be deeply, contextually, and specifically relevant to the particular learning objective of that row.
        3. Provide highly actionable, detailed instructional steps and real-world integration ideas.
        4. Avoid repetitive language or duplicate layouts across different sections or objectives.
        
        Output ONLY the Markdown Table. Do not include any standard chat pleasantries or conversational intros/outros.
      `;
    }

    const responseStream = await generateContentStreamWithFallback({
      contents: prompt,
      config: {
        temperature: 0.3
      }
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("Matrix Streaming error:", err);
    res.write(`data: ${JSON.stringify({ error: err.message || "Failed during streaming generation." })}\n\n`);
    res.end();
  }
});

// 4. AI Assistant / Search Engine with real-time Google Search Grounding to find reliable web sources
app.post("/api/assistant/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "User message is required." });
    }

    const ai = getGeminiClient();

    // Construct history parts if available
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach((chat: any) => {
        contents.push({
          role: chat.role === "user" ? "user" : "model",
          parts: [{ text: chat.content }],
        });
      });
    }
    
    // Add the current user query
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction: `
          You are the official REEL IN ONE AI Assistant powered by REELSYSTEM, designed to support professional educators with planning, resource generation, and general curriculum consultation.
          
          You are equipped with Google Search Grounding to find high-quality lesson exemplars, official PH Department of Education MATATAG Curriculum resources, guides, division templates, worksheets, and subject references in real-time.
          
          When writing answers:
          - Incorporate live factual data, teaching ideas, and exact curriculum standards from searched sources.
          - Speak professionally, encouragingly, and insightfully.
          - Avoid clinical developer jargon.
          - Never mention internal workspace settings, file paths (like /src/types.ts), or system-specific tokens.
          - Structure your answers elegantly using markdown, bullet points, or simple HTML tables where helpful.
          - Include citations naturally.
        `,
        // Enable Google Search routing
        tools: [{ googleSearch: {} }],
      },
    });

    // Extract text content
    const textOutput = response.text || "No response text was generated.";

    // Extract search query grounding metadata to list sources to the user
    const sources: any[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata && groundingMetadata.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          sources.push({
            title: chunk.web.title || "Web Reference",
            url: chunk.web.uri,
            snippet: chunk.web.snippet || ""
          });
        }
      });
    }

    // De-duplicate sources
    const uniqueSources = Array.from(new Map(sources.map((item) => [item.url, item])).values());

    res.json({
      reply: textOutput,
      sources: uniqueSources,
    });
  } catch (error: any) {
    console.error("AI Assistant Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat response." });
  }
});


// 3.7 AI Table of Specifications (TOS) Generator Endpoint
app.post("/api/lesson/generate-tos", async (req, res) => {
  try {
    const { subject, gradeLevel, totalItems, rowCount, curriculumNotes } = req.body;

    if (!subject) {
      return res.status(400).json({ error: "Subject/Course Title is required." });
    }

    const budget = parseInt(totalItems) || 30;
    const rows = parseInt(rowCount) || 4;

    const prompt = `
You are an expert psychometrician, curriculum designer, and educational assessment developer specializing in standard K-12 and Higher Education testing frameworks (e.g., Bloom's Taxonomy, PISA, and Webb's Depth of Knowledge).

Your objective is to generate a structurally sound, mathematically precise Table of Specifications (TOS) blueprint based on the user's input parameters.

### INPUT PARAMETERS:
- Subject/Course Title: ${subject}
- Grade Level / Target Audience: ${gradeLevel || "Not Specified"}
- Total Exam Item Budget: ${budget}
- Target Number of Competencies/Rows: ${rows}
- Curriculum Notes / Raw Focus Topics: ${curriculumNotes || "None"}

### CRITICAL CORE INSTRUCTIONS & CONSTRAINTS:

1. COMPETENCY DRAFTING (Column 1):
   - Do not use generic names like "Topic 1". Generate authentic, standard-aligned learning objectives using observable behavioral verbs (e.g., "Analyze...", "Evaluate...", "Differentiate...", "Execute...").
   - Tie these competencies directly to the user's input subject and notes.

2. MATHEMATICAL TIMING & WEIGHTING (Columns 2 & 3):
   - Assign a realistic number of "Days Taught" or "Instructional Hours" to each competency. 
   - Mathematically compute the exact percentage weight for each row: (Competency Days / Total Days) * 100.
   - The sum of all weights must equal exactly 100%.

3. COGNITIVE DOMAIN DISTRIBUTION (Columns 5 through 10):
   - Calculate the total items for each row: Round(Weight % * Total Exam Item Budget). The sum of all items across rows MUST equal the Total Exam Item Budget exactly.
   - Distribute those items across the 6 levels of Bloom's Taxonomy based on an educational cognitive balance standard (e.g., 60% Lower-Order/LOTS like Remembering, Understanding, Applying; and 40% Higher-Order/HOTS like Analyzing, Evaluating, Creating).
   - Ensure the sub-items (bloomLevels: remembering, understanding, applying, analyzing, evaluating, creating) in each row sum up perfectly to that row's allocated item count (totalRowItems).

4. SEQUENTIAL ITEM PLACEMENT MAPPING (Column 11):
   - Map a continuous, unbroken chain of item numbers across the rows (e.g., Row 1: Items 1-5; Row 2: Items 6-14; Row 3: Item 15). No overlapping numbers, no gaps, and the final index must stop exactly at the Total Exam Item Budget.

### EXPECTED OUTPUT FORMAT:
Return a clean, valid JSON array containing the row objects so the application can render them into a beautiful table interface instantly. Use this exact JSON structure:

[
  {
    "competency": "String (Full pedagogical learning objective statement)",
    "daysTaught": Integer,
    "weightPercent": Float,
    "totalRowItems": Integer,
    "bloomLevels": {
      "remembering": Integer,
      "understanding": Integer,
      "applying": Integer,
      "analyzing": Integer,
      "evaluating": Integer,
      "creating": Integer
    },
    "itemPlacement": "String (e.g., '1-5' or '6')"
  }
]

Do not return conversational text, explanations, or markdown boxes outside of the raw JSON array.
`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Failed to generate the TOS content.");
    }

    const data = JSON.parse(outputText);
    res.json(data);
  } catch (error: any) {
    console.error("AI TOS Generator error:", error);
    res.status(500).json({ error: error.message || "Failed to generate Table of Specifications." });
  }
});


// 3.8 AI Rubric Generator Endpoint
app.post("/api/lesson/generate-rubric", async (req, res) => {
  try {
    const { assignmentTitle, gradeLevel, criteriaCount, scaleLevels, customInstructions } = req.body;

    if (!assignmentTitle) {
      return res.status(400).json({ error: "Assignment Title is required." });
    }

    const count = parseInt(criteriaCount) || 3;
    const prompt = `
You are an expert curriculum design specialist, performance assessment evaluator, and instructional designer specializing in authentic assessment design (e.g., standard analytic rubrics, holistic evaluation matrices, and developmental scale tiers).

Your objective is to generate a comprehensive, highly descriptive Analytic Rubric based on the task description and parameters provided by the user.

### INPUT PARAMETERS:
- Assignment / Performance Task: ${assignmentTitle}
- Target Grade / Education Level: ${gradeLevel || "Not Specified"}
- Evaluation Dimensions / Criteria Count: ${count}
- Grading Scale Tiers: ${JSON.stringify(scaleLevels || ["Beginning", "Developing", "Proficient", "Advanced"])}
- Custom Instructions / Specific Priorities: ${customInstructions || "None"}

### CRITICAL CORE INSTRUCTIONS & CONSTRAINTS:

1. DEFINING CORE EVALUATION CRITERIA (Rows):
   - Isolate distinct, non-overlapping dimensions of performance (e.g., Content Mastery, Structural Design, Delivery/Execution, Technical Precision). Each criterion must be clearly defined by what it assesses.
   - Create exactly ${count} criteria rows.

2. QUANTIFIABLE performance LEVELS (Columns):
   - Establish a clean developmental scale from the highest level (Exemplary/Advanced) down to the baseline level (Beginning/Unsatisfactory).
   - Assign clear, progressive point values or weights if requested.

3. OBSERVABLE & MEASUREABLE DESCRIPTORS (Cells):
   - **Crucial Rule:** Avoid vague or subjective modifier words alone (e.g., do not just write "Excellent grammar" for Tier 4 and "Good grammar" for Tier 3). 
   - Use concrete, observable behaviors or evidence (e.g., Tier 4: "Contains 0-2 minor grammatical errors that do not affect readability." Tier 3: "Contains 3-5 grammatical errors that occasionally distract the reader.").
   - Ensure the description change between consecutive tiers is logical and sequential.

### EXPECTED OUTPUT FORMAT:
Return a clean, valid structured JSON object containing the rubric parameters so the frontend application can map and render it directly into a beautiful grid table workspace interface. Use this exact JSON schema:

{
  "assignmentTitle": "String (Optimized title of the task)",
  "scaleLevels": [
    { "levelName": "String (e.g., Exemplary)", "score": Integer }
  ],
  "rubricRows": [
    {
      "criterionTitle": "String (Name of the performance metric)",
      "criterionDefinition": "String (Brief explanation of what is measured)",
      "descriptors": {
        "level_1": "String (Concrete description for the lowest tier cell)",
        "level_2": "String (Concrete description for the secondary tier cell)",
        "level_3": "String (Concrete description for the tertiary tier cell)",
        "level_4": "String (Concrete description for the highest tier cell)",
        "level_5": "String (Concrete description for the highest tier cell if 5 tiers are used)"
      }
    }
  ]
}

Note: Populate "descriptors" with "level_1", "level_2", ..., "level_k" matching the count of scaleLevels provided (e.g., N = ${scaleLevels ? scaleLevels.length : 4}).

Do not return conversational text, intro/outro commentary, or formatting tags outside of the raw JSON code array.
`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Failed to generate the Rubric content.");
    }

    const data = JSON.parse(outputText);
    res.json(data);
  } catch (error: any) {
    console.error("AI Rubric Generator error:", error);
    res.status(500).json({ error: error.message || "Failed to generate Rubric." });
  }
});


// 3.9 AI Unpack Competency to Lesson Plan Endpoint
app.post("/api/lesson/unpack-to-lesson-plan", async (req, res) => {
  try {
    const { competency, gradeLevel, subject, duration, lang } = req.body;
    if (!competency) {
      return res.status(400).json({ error: "Learning competency is required to unpack." });
    }

    const languagePrompt = lang === "fil" 
      ? "Please generate all text in beautiful, grammatically correct and official Filipino/Tagalog (e.g., Mga Layunin, Pamamaraan, and description contents)."
      : "Please generate all text in English.";

    const prompt = `
You are an expert curriculum design specialist, lesson planner, and instructional developer specializing in the Philippine Department of Education (DepEd) MATATAG curriculum guidelines.

Your task is to unpack the provided Raw Learning Competency into a beautifully structured, comprehensive Semi-Detailed Lesson Plan (DLL/DLP) aligned with DepEd standards.

### INPUT DATA:
- Raw Competency: ${competency}
- Subject: ${subject || "Not Specified"}
- Grade Level: ${gradeLevel || "Not Specified"}
- Duration: ${duration || "60 Minutes"}

### LANGUAGE INSTRUCTIONS:
${languagePrompt}

### SPECIFIC LESSON PLAN DIMENSIONS TO GENERATE:
1. **Content/Topic (Maaaring Paksa)**: Derive a clear, concise lesson topic title based on the competency.
2. **I. Objectives (Mga Layunin)**: Unpack the competency into three clear and explicit dimensions:
   - **Knowledge (Cognitive/Kaalaman)**: What facts, concepts, or theories must the learners understand?
   - **Skills (Psychomotor/Kasanayan)**: What operations, behaviors, or technical skills must they practice and demonstrate?
   - **Attitudes/Values (Affective/Saloobin at Pagpapahalaga)**: What moral values, attitudes, and appreciation should be developed?
3. **II. Content (Nilalaman)**: (Will match topic)
4. **III. Learning Resources (Mga Kagamitang Panturo)**: List 3-4 standard, high-quality materials, curriculum guide page references, references to teacher guides, PPT games, or flashcard prerequisites.
5. **IV. Procedures (Pamamaraan)**: Structurally outline a highly cohesive 4Cs instructional delivery sequence:
   - **Hook/Activity (Panimulang Gawain / Pagganyak)**: Active classroom engagement or review.
   - **Analysis/Discussion (Pagsusuri / Talakayan)**: Guided questions analyzing the hook/activity and introducing new content.
   - **Abstraction/Concept Fixation (Paghahalaw / Pagtalakay ng Konsepto)**: Synthesizing concepts, deep explanation of standard subject matter.
   - **Application/Assessment (Paglalapat / Pagtataya)**: Practical applications, student activities, and a quick formative assessment.

### EXPECTED OUTPUT SCHEMA:
Return a clean, valid JSON object following this exact schema:
{
  "topic": "Concise lesson topic/title",
  "objectives": {
    "knowledge": "Paragraph or bulleted targets detailing cognitive knowledge (maximum 3 bullet points)",
    "skills": "Paragraph or bulleted targets detailing psychomotor/skills (maximum 3 bullet points)",
    "attitudes": "Paragraph or bulleted targets detailing affective/attitudes and values (maximum 3 bullet points)"
  },
  "resources": [
    "Resource item 1 (e.g., MATATAG English Curriculum Guide p. 14)",
    "Resource item 2 (e.g., Presentation Slides on Main Idea and Details)",
    "Resource item 3 (e.g., Worksheets and Paragraph Handouts)"
  ],
  "procedures": {
    "hook": "Detailed, highly operational procedural instructions for the teacher on how to introduce the topic and grab attention with a fun hook/activity.",
    "analysis": "Actionable instructions and 2-3 specific guide questions the teacher should ask the students to dissect the hook and link to the standard concept.",
    "abstraction": "Clear, deep pedagogical content explanation and rules/examples of the lesson's main concept for teacher delivery.",
    "application": "Active performance task instructions for students and a quick formative assessment drill to evaluate student learning."
  }
}

Do not return conversational text, explanations, or markdown code wraps outside of the raw JSON code block.
`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Failed to unpack competency to lesson plan.");
    }

    const data = JSON.parse(outputText);
    res.json(data);
  } catch (error: any) {
    console.error("AI Lesson Plan Unpacker Error:", error);
    res.status(500).json({ error: error.message || "Failed to unpack competency." });
  }
});


// 3.10 AI Scorecard Generator Endpoint
app.post("/api/lesson/generate-scorecard", async (req, res) => {
  try {
    const { title, contextMode, keywords, lang } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Event Title or Topic is required." });
    }

    const languagePrompt = lang === "fil"
      ? "Please generate all criteria names, descriptions, and titles in grammatically correct and elegant Filipino/Tagalog (e.g., Pamantayan, Deskripsyon)."
      : "Please generate all criteria names, descriptions, and titles in English.";

    const prompt = `
You are an expert curriculum designer, contest adjudicator, and rubric specialist.
Your task is to generate 4 to 5 professional judging criteria for an official executive judging scorecard.

### EVENT / TASK INFO:
- Title/Topic: ${title}
- Context Mode: ${contextMode || "School Competition"}
- Focus Keywords: ${keywords || "None"}

### LANGUAGE:
${languagePrompt}

### SPECIFIC RULES:
- Generate exactly 4 to 5 core criteria.
- Each criterion must have a clear name, a detailed observable definition (1-2 sentences), and a percentage weight.
- CRITICAL: The weights of all generated criteria MUST sum to exactly 100%.

### EXPECTED OUTPUT SCHEMA:
Return a clean, valid JSON object following this exact schema:
{
  "title": "Cleaned Event or Topic Title",
  "criteria": [
    {
      "criterion": "Name of the criterion (e.g., Creativity / Pagkamalikhain)",
      "definition": "Clear description of what judges should look for",
      "weight": 25
    }
  ]
}

Do not return conversational text, explanations, or markdown code wraps outside of the raw JSON code block.
`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Failed to generate scorecard criteria.");
    }

    const data = JSON.parse(outputText);
    res.json(data);
  } catch (error: any) {
    console.error("AI Scorecard Generator Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate scorecard." });
  }
});


// 3.10b AI Worksheet Generator Content Enrichment Endpoint
app.post("/api/lesson/generate-worksheet-content", async (req, res) => {
  try {
    const { topic, type, lang } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic/Subject is required." });
    }

    const languagePrompt = lang === "fil"
      ? "Please generate all titles, descriptions, words, and clues in grammatically correct and elegant Filipino/Tagalog."
      : "Please generate all titles, descriptions, words, and clues in English.";

    const prompt = `
You are an expert curriculum planner and classroom game designer.
Your task is to generate educational vocabulary words and clues/definitions for a classroom worksheet puzzle (${type || "word search"}).

### TOPIC/SUBJECT:
${topic}

### LANGUAGE:
${languagePrompt}

### SPECIFIC RULES:
- Generate exactly 8 to 10 vocabulary words.
- All words must be between 3 and 12 characters long.
- Words must contain only alphabetic characters (A-Z), no spaces, hyphens, or special characters.
- For each word, generate a clear, age-appropriate educational clue, definition, or question (1 sentence).

### EXPECTED OUTPUT SCHEMA:
Return a clean, valid JSON object following this exact schema:
{
  "title": "Cleaned Topic Title",
  "subtitle": "Short descriptive subtitle",
  "instructions": "Simple instruction for students",
  "words": [
    {
      "word": "CELL",
      "clue": "The basic structural unit of all living organisms."
    }
  ]
}

Do not return conversational text, explanations, or markdown code wraps outside of the raw JSON code block.
`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Failed to generate worksheet vocabulary.");
    }

    const data = JSON.parse(outputText);
    res.json(data);
  } catch (error: any) {
    console.error("AI Worksheet Generator Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate worksheet content." });
  }
});


// 3.11 AI Citation Enrichment Endpoint
app.post("/api/lesson/enrich-citation", async (req, res) => {
  try {
    const { style, sourceType, contributors, year, title, publisher, edition, pages, doi, url } = req.body;
    
    const prompt = `
You are a master academic bibliographer and citation checker.
Your task is to review the following citation metadata and:
1. Correct any spelling mistakes or formatting inconsistencies.
2. Complete or predict missing fields (like publisher, year, or page ranges) if possible based on the title/URL.
3. Return the fully formatted APA, MLA, or Chicago citation, alongside a list of suggested improvements.

### INPUT METADATA:
- Style: ${style || "APA"}
- Source Type: ${sourceType || "Book"}
- Contributors: ${JSON.stringify(contributors || [])}
- Year: ${year || ""}
- Title: ${title || ""}
- Publisher: ${publisher || ""}
- Edition: ${edition || ""}
- Pages: ${pages || ""}
- DOI: ${doi || ""}
- URL: ${url || ""}

### EXPECTED OUTPUT SCHEMA:
Return a clean, valid JSON object following this exact schema:
{
  "formattedCitation": "The complete properly formatted text string (use standard formatting with italics/punctuation as applicable)",
  "enrichedFields": {
    "year": "corrected or predicted year",
    "title": "polished title",
    "publisher": "corrected publisher",
    "pages": "corrected page range",
    "url": "validated url"
  },
  "suggestions": [
    "Suggestion 1: e.g. Added missing publisher based on standard records.",
    "Suggestion 2: e.g. Formatted title to title case according to style guide rules."
  ]
}

Do not return conversational text, explanations, or markdown code wraps outside of the raw JSON code block.
`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Failed to enrich citation.");
    }

    const data = JSON.parse(outputText);
    res.json(data);
  } catch (error: any) {
    console.error("AI Citation Enrichment Error:", error);
    res.status(500).json({ error: error.message || "Failed to enrich citation." });
  }
});


// ============================================================================
// FRONTEND STATIC VITE MIDDLEWARE SETUP
// ============================================================================
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    console.log("Wiring up Vite Dev Server Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving build artifacts in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`REEL IN ONE Web Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();

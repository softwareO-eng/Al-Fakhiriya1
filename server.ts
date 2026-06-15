import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY not found. Document OCR extraction will fail.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Since we are sending Base64 strings, we need a larger body limit
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API route for extracting expiry
  app.post("/api/extract-document", async (req, res) => {
    try {
      if (!ai) {
        res.status(500).json({ error: "Gemini API key is not configured" });
        return;
      }

      const { fileData, mimeType, entityType } = req.body;
      if (!fileData || !mimeType) {
        res.status(400).json({ error: "Missing fileData or mimeType" });
        return;
      }

      const prompt = `
        You are an advanced multilingual OCR scanner for a professional fleet management system.
        The document belongs to a: ${entityType || 'Truck'} (Truck or Driver).
        Your task is to scan the provided document image or PDF file and extract high-precision dates and names.

        Please analyze the text carefully:
        1. "type": Identify the name or type of the document (such as "Istamara", "Driving Licence", "Medical Certificate", "Insurance", "Melem Card", "Safety Sticker", "5th Wheel Expiry"). We support both English and Arabic (e.g. "إستمارة", "رخصة السير", "رخصة القيادة", "التأمين").
        2. "issueDate": Find the document's Issue Date. Specify in "YYYY-MM-DD" format. Return null if not explicitly found.
        3. "expiryDate": Find the Expiry / Expiration Date (e.g. "Expiry", "Expires on", "End Date", "تاريخ الانتهاء", "تاريخ انتهاء", "ينتهي في", "صالح لغاية"). Specify in "YYYY-MM-DD" format. Return null if not explicitly found.
        4. "hasNoExpiry": Set to true if there is zero expiry or if it is a lifetime/permanent document, otherwise false.

        CRITICAL FOR GULF DOCUMENTS (e.g. Saudi Arabia, UAE, etc.):
        - Documents often list both Hijri (Islamic, e.g. 1445 or 1446 or 1447) and Gregorian dates.
        - You MUST isolate and extract the GREGORIAN date for the "issueDate" and "expiryDate"! (For example: if a date is 1447-06-15 and another is 2026-06-15, choose 2026-06-15).
        - If only Hijri dates are present, convert or translate the Hijri date to its corresponding Gregorian date format in YYYY-MM-DD (e.g. 1446-12-11 corresponds to approx June 2025).

        IMPORTANT: Your output must be a clean, valid and raw JSON object. Do not include any explanation, conversational text, or markdown formatting blocks (e.g. do NOT wrap in \`\`\`json). Output exactly the JSON object matching this schema:
        {
          "type": "Name or classification of the document",
          "issueDate": "YYYY-MM-DD or null",
          "expiryDate": "YYYY-MM-DD or null",
          "hasNoExpiry": false
        }
      `;

      // Extract base64 part if it contains a data URI scheme
      const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { role: "user", parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType } }
            ] 
          }
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      const text = response.text || "{}";
      
      // Clean up markdown block if model adds them anyway
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
      }

      let parsed;
      try {
        parsed = JSON.parse(cleanedText);
      } catch (parseErr) {
        console.error("JSON parsing failed for AI output:", text);
        res.status(500).json({ error: "The AI returned an invalid response structure. Please try again." });
        return;
      }

      res.json(parsed);
    } catch (error: any) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: error.message || "Failed to process document" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
        You are a document OCR assistant for fleet management.
        The entity type is ${entityType} (Truck or Driver).
        Look at this document and extract its key details.
        Respond ONLY with a valid JSON object matching this schema:
        {
          "type": "Name or Type of document (e.g. Istamara, Driving Licence, Medical Certificate, Insurance)",
          "issueDate": "YYYY-MM-DD or null if not found",
          "expiryDate": "YYYY-MM-DD or null if it has no expiry or not found",
          "hasNoExpiry": boolean (true if it clearly states lifetime or no expiry, otherwise false)
        }
      `;

      // Extract base64 part if it contains a data URI scheme
      const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
      const parsed = JSON.parse(text);

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

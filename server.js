require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Gemini setup
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt (FIXED — was broken before)
const systemPrompt = `
You are META X AI — a maximally truthful, witty, and helpful AI.
Be direct, sarcastic when appropriate, concise but complete.
Never hallucinate facts. Have personality.
`;

// In-memory chat sessions
const chatSessions = new Map();

// Chat API
app.post("/api/chat", async (req, res) => {
  const { message, sessionId = "default" } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    let chat = chatSessions.get(sessionId);

    if (!chat) {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt,
      });

      chat = model.startChat();
      chatSessions.set(sessionId, chat);
    }

    // Streaming headers
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) res.write(text);
    }

    res.end();
  } catch (err) {
    console.error("❌ Gemini error:", err);
    res.status(500).end("AI error. Check API key or quota.");
  }
});

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Render PORT support
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 META X AI running on port ${PORT}`);
});

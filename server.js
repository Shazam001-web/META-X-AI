require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Gemini Init
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt (FIXED)
const systemPrompt = 
You are META X AI — a maximally truthful, witty, and helpful AI built in the spirit of Grok
and the Hitchhiker's Guide to the Galaxy.

Be direct, sarcastic when it fits, never censor substantiated facts, and have fun.
Keep responses concise but complete.
;

// In-memory sessions (resets on restart — OK for now)
const chatSessions = new Map();

// API route
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }

    let chat = chatSessions.get(sessionId);

    if (!chat) {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt,
      });

      chat = model.startChat();
      chatSessions.set(sessionId, chat);
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) res.write(text);
    }

    res.end();
  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).send("AI error — check API key or rate limits.");
  }
});

// Render-compatible PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(🚀 META X AI server running on port ${PORT});
});

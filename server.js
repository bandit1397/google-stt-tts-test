const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json());

/* ======================
   Gemini API
====================== */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ======================
   번역 함수
====================== */
async function translate(text, target = "en") {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash"
    });

    const prompt = `
Translate naturally.

Target language: ${target}

Text:
${text}

Return only translated sentence.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
}

/* ======================
   Socket.IO (A/B 통역)
====================== */
io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, role }) => {
        socket.join(roomId);

        socket.roomId = roomId;
        socket.role = role;

        console.log(`Joined room: ${roomId}, role: ${role}`);
    });

    socket.on("speech", async (data) => {
        try {
            const { text, roomId } = data;

            console.log("Original:", text);

            // 테스트 번역 (Gemini 막힐 경우 대비)
            const translated = "[TEST] " + text;

            console.log("Translated:", translated);

            /* ======================
               🔥 핵심 수정 부분
               (role 필터 제거 → 안정적 broadcast)
            ====================== */

            io.to(roomId).emit("my-text", text);
            io.to(roomId).emit("translated-text", translated);

        } catch (err) {
            console.error("speech error:", err);
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

/* ======================
   서버 실행
====================== */
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

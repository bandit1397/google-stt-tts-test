const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json());

// ======================
// Gemini 설정
// ======================
const genAI = new GoogleGenerativeAI("api=key");

// ======================
// 번역 API
// ======================
app.post("/translate", async (req, res) => {
    try {
        const { text, target } = req.body;

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
        const translated = response.text().trim();

        console.log("Korean:", text);
        console.log("English:", translated);

        res.json({
            translated: translated
        });

    } catch (err) {
        console.error("Translation Error:", err);

        res.status(500).json({
            translated: "translation error"
        });
    }
});

// ======================
// WebRTC signaling
// ======================
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    socket.on("offer", (data) => {
        socket.to(data.room).emit("offer", data.offer);
    });

    socket.on("answer", (data) => {
        socket.to(data.room).emit("answer", data.answer);
    });

    socket.on("ice-candidate", (data) => {
        socket.to(data.room).emit("ice-candidate", data.candidate);
    });
});

// ======================
// 서버 실행
// ======================
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
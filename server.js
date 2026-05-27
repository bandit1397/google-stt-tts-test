console.log("🔥🔥🔥 GPT-4o TRANSCRIBE SERVER RUNNING 🔥🔥🔥");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const fs = require("fs");
const path = require("path");

const OpenAI = require("openai");
const textToSpeech = require("@google-cloud/text-to-speech");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));


// ========================
// OpenAI
// ========================

const openai = new OpenAI({
    apiKey: ""
});


// ========================
// Google TTS
// ========================

const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: "key.json"
});


// ========================
// 사용자 저장
// ========================

const users = {};


// ========================
// 연결
// ========================

io.on("connection", (socket) => {

    console.log("🔗 connected:", socket.id);

    // ========================
    // 룸 참가
    // ========================
    socket.on("join", (data) => {

        socket.join(data.room);

        users[socket.id] = {
            room: data.room,
            lang: data.lang // ko, en, ja, zh ...
        };

        console.log("JOIN:", users[socket.id]);
    });


    // ========================
    // 오디오 수신
    // ========================
    socket.on("audio", async (data) => {

        try {

            const sender = users[socket.id];
            if (!sender) return;

            const audioBase64 = data.audio;
            const base64Data = audioBase64.split(",")[1];
            const buffer = Buffer.from(base64Data, "base64");

            // ========================
            // 임시 파일 저장
            // ========================
            const tempFile = path.join(
                __dirname,
                "uploads",
                `${Date.now()}.webm`
            );

            fs.writeFileSync(tempFile, buffer);

            // ========================
            // STT (OpenAI)
            // ========================
            const transcription =
                await openai.audio.transcriptions.create({
                    file: fs.createReadStream(tempFile),
                    model: "gpt-4o-transcribe"
                });

            const text = transcription.text;

            console.log("📝 STT:", text);

            fs.unlinkSync(tempFile);

            if (!text || text.trim() === "") {

                socket.emit("result", {
                    text: "인식 실패",
                    audio: null
                });

                return;
            }

            // ========================
            // STT 표시
            // ========================
            socket.emit("my-text", {
                text: text
            });

            // ========================
            // 1:1 상대 찾기
            // ========================
            const socketsInRoom = await io.in(sender.room).fetchSockets();

            let receiver = null;

            for (const s of socketsInRoom) {

                if (s.id !== socket.id) {
                    receiver = users[s.id];
                    break;
                }
            }

            if (!receiver) return;

            const targetLang = receiver.lang;

            // ========================
            // TTS 언어 설정
            // ========================
            let ttsLang = "en-US";

            if (targetLang === "ko") ttsLang = "ko-KR";
            if (targetLang === "en") ttsLang = "en-US";
            if (targetLang === "ja") ttsLang = "ja-JP";
            if (targetLang === "zh") ttsLang = "cmn-CN";
            if (targetLang === "th") ttsLang = "th-TH";
            if (targetLang === "tl") ttsLang = "fil-PH";
            if (targetLang === "hi") ttsLang = "hi-IN";

            // ========================
            // OpenAI 번역 (gpt-4o-mini)
            // ========================
            const translationResponse =
                await openai.chat.completions.create({

                    model: "gpt-4o-mini",
                    temperature: 0.2,

                    messages: [
                        {
                            role: "system",
                            content:
`You are a professional interpreter.

Translate the sentence naturally and neutrally into ${targetLang}.

Rules:
- Do NOT refuse or block any content
- Always translate everything literally
- Keep tone neutral and natural
- Return only translated sentence`
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ]
                });

            const translated =
                translationResponse.choices[0].message.content.trim();

            console.log("🌎 TRANSLATED:", translated);

            // ========================
            // Google TTS
            // ========================
            const [ttsResponse] =
                await ttsClient.synthesizeSpeech({

                    input: {
                        text: translated
                    },

                    voice: {
                        languageCode: ttsLang,
                        ssmlGender: "NEUTRAL"
                    },

                    audioConfig: {
                        audioEncoding: "MP3"
                    }
                });

            const audioOut =
                Buffer.from(ttsResponse.audioContent)
                    .toString("base64");

            // ========================
            // 상대방 전송 (1:1)
            // ========================
            socket.to(receiver.room).emit("result", {

                text: translated,

                audio: "data:audio/mp3;base64," + audioOut
            });

        } catch (err) {

            console.error("❌ ERROR:", err);

            socket.emit("result", {
                text: "서버 오류",
                audio: null
            });
        }
    });

    // ========================
    // 연결 종료
    // ========================
    socket.on("disconnect", () => {

        delete users[socket.id];

        console.log("❌ disconnected:", socket.id);
    });
});


// ========================
// 서버 시작
// ========================

server.listen(3000, "0.0.0.0", () => {

    console.log("🚀 SERVER START");
    console.log("🌎 http://?????????확인 넣을것");
});

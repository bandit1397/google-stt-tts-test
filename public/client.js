const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

recognition.lang = "ko-KR";
recognition.continuous = true;
recognition.interimResults = false;

recognition.onresult = async (event) => {

    const text = event.results[event.results.length - 1][0].transcript;

    console.log("Korean:", text);

    // 서버로 번역 요청
    const res = await fetch("/translate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text,
            target: "English"
        })
    });

    const data = await res.json();

    console.log("English:", data.translated);

    // 화면 표시
    const div = document.createElement("div");
    div.innerHTML = `
        <p>🇰🇷 ${text}</p>
        <p>🇺🇸 ${data.translated}</p>
        <hr>
    `;
    document.body.appendChild(div);
};

recognition.start();
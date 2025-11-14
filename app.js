// frontend/static/js/app.js

const backendUrl = "http://localhost:5000"; // change if backend lives elsewhere
const chatEl = document.getElementById("chat");
const micBtn = document.getElementById("micBtn");
const sendBtn = document.getElementById("sendBtn");
const textInput = document.getElementById("textInput");

let conversationHistory = []; // optional: keep messages as {role,content}

// Utility: append message to chat
function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user" : "assistant");
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Send message to backend
async function sendMessage(message) {
  appendMessage("user", message);
  textInput.value = "";

  // send to backend
  try {
    const res = await fetch(`${backendUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: conversationHistory, // optional: you can keep context
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      appendMessage("assistant", "Error: " + (data.error || res.statusText));
      return;
    }

    const reply = data.reply || "(no reply)";
    appendMessage("assistant", reply);

    // update conversation history (simple approach)
    conversationHistory.push({ role: "user", content: message });
    conversationHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    appendMessage("assistant", "Network error: " + err.message);
  }
}

// Handlers
sendBtn.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (text) sendMessage(text);
});
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const text = textInput.value.trim();
    if (text) sendMessage(text);
  }
});

// SpeechRecognition setup
let recognition = null;
let listening = false;

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.textContent = "Mic not supported";
    return null;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false; // single result per click
  recognition.interimResults = true;
  recognition.lang = "en-US"; // change if needed

  let interimTranscript = "";

  recognition.onstart = () => {
    listening = true;
    micBtn.textContent = "🎙️ Listening...";
    micBtn.classList.add("listening");
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    interimTranscript = "";
    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) finalTranscript += res[0].transcript;
      else interimTranscript += res[0].transcript;
    }

    // Show interim in input box
    textInput.value = finalTranscript || interimTranscript;
  };

  recognition.onerror = (event) => {
    console.warn("SpeechRecognition error", event.error);
    listening = false;
    micBtn.textContent = "🎤 Start";
  };

  recognition.onend = () => {
    listening = false;
    micBtn.textContent = "🎤 Start";
    // send if there's text in input
    const text = textInput.value.trim();
    if (text) {
      sendMessage(text);
    }
  };

  return recognition;
}

recognition = setupSpeechRecognition();

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (!listening) {
    try {
      recognition.start();
    } catch (e) {
      // sometimes start() called while already running throws
      console.error(e);
    }
  } else {
    recognition.stop();
  }
});

// Health check on load
(async function healthCheck() {
  try {
    const r = await fetch(`${backendUrl}/api/health`);
    if (!r.ok) {
      console.warn("Backend health check failed");
    }
  } catch (e) {
    console.warn("Could not reach backend:", e.message);
  }
})();

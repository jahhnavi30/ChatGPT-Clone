import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

# Get API key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("Set the OPENAI_API_KEY environment variable (see .env.example)")

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# Flask app
app = Flask(__name__)
CORS(app)  # allow requests from frontend

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True)
    message = data.get("message", "").strip()
    history = data.get("history", [])

    if not message:
        return jsonify({"error": "Empty message"}), 400

    # Build messages for Chat API
    messages = []
    system_prompt = data.get("system_prompt") or "You are a helpful assistant."
    messages.append({"role": "system", "content": system_prompt})

    if isinstance(history, list):
        messages.extend(history)

    messages.append({"role": "user", "content": message})

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",  # or "gpt-4o", "gpt-4-turbo", etc.
            messages=messages,
            max_tokens=600,
            temperature=0.7,
        )

        assistant_text = resp.choices[0].message.content.strip()

        return jsonify({
            "reply": assistant_text,
            "usage": resp.usage.dict() if resp.usage else {}
        })

    except Exception as e:
        # Log the error on the server but don't leak details to frontend
        print("Error in /api/chat:", str(e))
        return jsonify({"error": "Something went wrong with the AI request."}), 500

if __name__ == "__main__":
    # For development only. In production use gunicorn/uvicorn
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)

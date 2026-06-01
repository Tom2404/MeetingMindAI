# MeetingMind AI - Installation and Configuration Guide

This document provides step-by-step instructions on how to install the system, set up the `.env` file, configure the Google Gemini API Key, and set up local AI models using Ollama.

---

## 1. System Requirements

Before you begin, ensure that your computer has the following tools installed:

*   **Node.js (LTS 18+):** Required to run the Frontend interface.
*   **Python (3.10+):** Required to run the FastAPI Backend server. Make sure to check the "Add Python to PATH" option during installation.
*   **FFmpeg:** Mandatory for the backend to process, slice, and convert audio files into the standard 16kHz mono format.
    *   *Windows:* Download the ZIP file from the official FFmpeg website, extract it, and add the path of the `bin` folder to your system's `Path` environment variable.
    *   *macOS:* Install via Homebrew by running: `brew install ffmpeg`.
    *   *Linux:* Install via package manager: `sudo apt update && sudo apt install ffmpeg`.

---

## 2. Installing Dependencies (Monorepo Setup)

The project is structured as a Monorepo. You can install all dependencies for both Frontend and Backend with a single command:

1.  Open your Terminal (or PowerShell) at the project root directory (the `MeetingMindAI` folder).
2.  Run the following command:
    ```bash
    npm run install:all
    ```

**What this command does automatically:**
*   Installs `concurrently` in the root folder to support running both servers in parallel.
*   Navigates to the `frontend` directory and installs NPM packages (`npm install`).
*   Navigates to the `backend` directory, creates a Python virtual environment (`.venv`), and installs all required libraries from `requirements.txt` (`pip install -r requirements.txt`).

---

## 3. Setting Up the .env File and API Key

The backend reads configuration settings from a `.env` file located in the root of the project (`MeetingMindAI/.env`).

### Steps to create and configure the .env file:

1.  In the project root folder (`MeetingMindAI`), create a new file named `.env` (or copy from `backend/.env.example`).
2.  Open the `.env` file in a text editor and fill in the following parameters:

```env
# Database Configuration (Defaults to SQLite which runs locally with no extra installation)
DATABASE_URL="sqlite:///./meetingmind.db"

# Security Configuration for JWT Token Encryption
SECRET_KEY="meetingmind_secret_key_123456"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Admin bootstrap (optional)
# If set, the backend will auto-create/update this admin account at startup.
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change_me"
ADMIN_EMAIL="admin@local"

# Cloud AI Configuration (Google Gemini) - Leave empty if running 100% Offline
GEMINI_API_KEY="AIzaSy_YOUR_GEMINI_API_KEY_HERE"

# Local AI Configuration (Ollama) - Leave empty if using Cloud AI exclusively
OLLAMA_MODEL="qwen2.5:7b-instruct"
```

### How to get a Google Gemini API Key:

If you want to use the Cloud mode for maximum transcription speed and automatic speaker identification (Speaker Diarization):
1.  Go to: [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Sign in with your Google account.
3.  Click the **"Create API Key"** button.
4.  Copy the generated key string (starts with `AIzaSy...`) and paste it into the `GEMINI_API_KEY` variable in your `.env` file.

---

## 4. Setting Up Local AI (Ollama)

The system supports running fully offline for data security. Follow these steps to set up local AI:

1.  **Download Ollama:** Visit [https://ollama.com/](https://ollama.com/) to download and install the version compatible with your OS.
2.  **Launch Ollama:** Ensure the Ollama application is running in the background (check for the icon in your system tray).
3.  **Download the Model:** Open your Command Prompt (CMD) or Terminal and run the following command to download the model (this is a one-time process, download size is ~2GB to 4.7GB):
    *   *Recommended for Vietnamese and general tasks (Qwen 2.5):*
        ```bash
        ollama run qwen2.5:7b-instruct
        ```
    *   *Or the lightweight model from Meta (Llama 3.2):*
        ```bash
        ollama run llama3.2
        ```
4.  **Declare in `.env`:** Update the `OLLAMA_MODEL` variable in your `.env` file to match the model name you downloaded (e.g., `OLLAMA_MODEL="qwen2.5:7b-instruct"` or `OLLAMA_MODEL="llama3.2"`).

---

## 5. Starting the Application

Once you have completed installation and configured the `.env` file, you can start both the Backend and Frontend servers concurrently using one of the following methods:

### Method 1: Using NPM (Recommended)
At the project root directory, open your Terminal and run:
```bash
npm start
```
This command automatically starts both servers in parallel in a single console:
*   Backend API runs at: `http://localhost:8000`
*   Frontend interface runs at: `http://localhost:5173`

### Method 2: Using the Python Script
Run the following command at the project root directory:
```bash
python start.py
```

Once the servers are running, open your web browser and navigate to **`http://localhost:5173`** to access the dashboard.

---

## 6. How the System Switches Between Local and Cloud Modes

The system is designed to automatically detect and adapt to your configuration:

*   **Speech-To-Text (STT) Processing:**
    *   The backend automatically checks the `GEMINI_API_KEY` variable in your `.env` file.
    *   If a valid API key is found, the system uses Google Gemini API for fast transcription and speaker diarization.
    *   If the key is empty, the system automatically falls back to using **Faster-Whisper** running locally on your computer.
*   **LLM Summary Processing:**
    *   In the meeting details view, the backend calls the LLM configured to process summaries and extract actionable JSON items.
    *   If you choose to use Ollama, ensure that Ollama is running and that the model declared in `.env` has been downloaded successfully.

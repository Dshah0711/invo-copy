# InvoAI — Smart Invoice Generator

A full-stack AI-powered invoice management platform built with the MERN stack.

## Features
- 📄 **Invoice Generator** — Create professional GST invoices with PDF export
- 🤖 **AI Vendor Invoice Parser** — Upload vendor invoices; Gemini AI extracts all data
- 📊 **Analytics Dashboard** — Revenue charts, status breakdowns, top clients
- 📧 **Email Automation** — Auto-send invoices and overdue reminders
- 👥 **Client Management** — Save and reuse client details
- 🔐 **JWT Authentication** — Secure login with refresh token rotation

## Tech Stack
- **Frontend:** React + Vite + TailwindCSS + Recharts
- **Backend:** Node.js + Express + MongoDB (Atlas)
- **AI:** Google Gemini 1.5 Flash
- **PDF:** Puppeteer
- **Email:** Nodemailer (Gmail)

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/Dshah0711/InvoAi.git
cd InvoAi
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env   # Fill in your credentials
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

### 4. Environment Variables (server/.env)
```
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/invoai
JWT_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=InvoAI <your_gmail@gmail.com>
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

## Running
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

# YouTube Clone — Full-Stack Video Platform

A modern, full-featured YouTube-style video platform with video streaming, channel management, video conferencing (WebRTC), subscription tiers, and engagement features.

---

## Features

- **Video Streaming & Player**: Custom HTML5 video player with keyboard shortcuts, multi-speed playback, timeline scrubbing, subtitles/captions with auto-translation, and double-click gestures.
- **Video Upload & Processing**: Video upload support with thumbnail generation, category tagging, and automated caption extraction.
- **Real-Time Video Meetings**: Built-in video call and screen-sharing system (`/meet`) powered by WebRTC and Socket.io.
- **Channel & Content Management**: Channel creation, video listing, channel subscriptions, and profile customization.
- **Engagement & Community**: Comments with moderation, nested replies, likes/dislikes, watch later, and watch history.
- **Tiered Subscriptions & Payments**: Bronze, Silver, and Gold membership tiers with Razorpay checkout integration and invoice receipts.
- **Account Security & Quotas**: Email OTP login verification, multi-device session history, and tier-based daily video download/watch quotas.

---

## Tech Stack

### Client
- **Framework**: Next.js (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Radix UI primitives, Lucide Icons
- **Real-time / Media**: Socket.io Client, WebRTC APIs
- **Auth & Services**: Firebase Authentication, Axios

### Server
- **Runtime**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io (Signaling for WebRTC)
- **Services**: Razorpay (Payments), Brevo (Transactional Email / OTP), Multer (File Uploads)

---

## Project Structure

```
├── client/              # Next.js frontend application
│   ├── src/
│   │   ├── app/         # App router pages & routes
│   │   ├── components/  # Reusable UI & feature components
│   │   ├── hooks/       # Custom React hooks (WebRTC, MediaRecorder, etc.)
│   │   └── lib/         # Context providers, Firebase & API clients
│   └── public/          # Static assets & sample media
├── server/              # Express.js backend API & Socket server
│   ├── config/          # Environment configuration
│   ├── controller/      # Route controllers (Auth, Video, Meeting, etc.)
│   ├── model/           # Mongoose data models
│   ├── routes/          # Express route definitions
│   ├── socket/          # Socket.io event handlers
│   └── utils/           # Helper utilities (Email, Captions, Security)
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or MongoDB Atlas)
- npm or yarn

### 1. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory (refer to `server/.env.example`):

```env
PORT=5000
MONGODB_URI="mongodb://localhost:27017/youtube-clone"
FRONTEND_URI="http://localhost:3000"
RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
BREVO_API_KEY="your_brevo_api_key"
BREVO_USER_NAME="Your App Name"
BREVO_USER_MAIL="noreply@example.com"
```

Start the backend server:

```bash
npm run dev # or npm start
```

### 2. Frontend Setup

```bash
cd client
npm install
```

Create a `.env` file in the `client` directory (refer to `client/.env.example`):

```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"
NEXT_PUBLIC_RAZORPAY_KEY_ID="your_razorpay_key_id"
```

Start the frontend development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

This project is licensed under the MIT License.

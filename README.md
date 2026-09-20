# YouTube Clone — Full-Stack Video Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Platform-red?style=for-the-badge&logo=youtube)](https://ytcloneclient.onrender.com/)

A modern, full-featured YouTube-style video platform with HLS video streaming, channel management, WebRTC video conferencing (`/meet`), tiered subscriptions (Razorpay), OTP security challenges, and comprehensive engagement features.

---

## Live Deployment

- **Frontend App**: [https://ytcloneclient.onrender.com/](https://ytcloneclient.onrender.com/)
- **Backend API**: [https://youtube-clone-server.onrender.com/](https://youtube-clone-server.onrender.com/)

---

## Features

- **Adaptive Video Player & Streaming**: Custom HTML5/HLS video player supporting multi-speed playback, timeline scrubbing, resolution gating (360p up to 4K based on subscription tier), automated caption extraction, and multi-language translation.
- **Video Upload & Processing**: Video uploads with automated thumbnail generation, category tagging, and HLS transcoding.
- **Real-Time Video Meetings**: Built-in video call, chat, and screen-sharing system (`/meet`) powered by WebRTC and Socket.io.
- **Channel & Content Management**: Channel creation, video management, channel subscriptions, and profile customization.
- **Engagement & Community**: Comments with 15-min edit window, nested replies, soft-delete, like/dislike reactions, and channel owner moderation.
- **Tiered Subscriptions & Payments**: Free, Bronze, Silver, and Gold membership tiers with Razorpay checkout integration and automatic PDF/email invoice receipts.
- **Security & Quotas**: Email OTP challenge verification on unfamiliar devices/locations, device session history, and tier-based daily video download and watch time quotas.

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
- **Security & Rate Limiting**: Helmet, Express Rate Limit, JsonWebToken, Timing-safe Crypto
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
│   ├── middleware/      # Auth & role verification middlewares
│   ├── model/           # Mongoose data models
│   ├── routes/          # Express route definitions
│   ├── socket/          # Socket.io event handlers
│   ├── tests/           # Automated security & integration test suites
│   └── utils/           # Helper utilities (Email, Captions, Security, Firebase)
├── LICENSE              # MIT License
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
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your_jwt_secret_key_here"
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
BREVO_API_KEY="your_brevo_api_key"
BREVO_USER_NAME="YouTube Clone"
BREVO_USER_MAIL="noreply@example.com"
GROQ_API_KEY="your_groq_api_key"
```

Start the backend server:

```bash
npm run dev # for development with nodemon
# or
npm start   # for production with node
```

Run test suite:

```bash
npm test
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

## Known Limitations

- **Ephemeral Storage on Cloud Free Tiers**: On containerized host platforms (such as Render's free tier), uploaded media files and HLS segments stored in `server/uploads/` reside on the container's local disk and are ephemeral across container restarts. For permanent production deployments, cloud object storage (AWS S3, Google Cloud Storage, or Cloudinary) is recommended.
- **Razorpay Test Mode**: The default integration uses Razorpay Test Mode keys for payments and sandbox webhook simulations.

---

## License

This project is licensed under the [MIT License](LICENSE).

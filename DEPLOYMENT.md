# Foodswipe Production Deployment Guide 🚀

To make the app live, you need to set the following environment variables on your hosting platforms (Render for Backend, Vercel for Frontend).

## 1. Backend (Render.com)
Set these in **Dashboard > Environment**:

| Variable | Description |
|----------|-------------|
| `PORT` | Set to `5000` (or leave default) |
| `NODE_ENV` | `production` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random string for security |
| `PUSHER_APP_ID` | Your Pusher App ID |
| `PUSHER_KEY` | Your Pusher Key |
| `PUSHER_SECRET` | Your Pusher Secret |
| `PUSHER_CLUSTER` | Your Pusher Cluster (e.g., `ap2`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Your Firebase Service Account JSON (as a single line string) |

## 2. Frontend (Vercel.com)
Set these in **Project Settings > Environment Variables**:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://foodswipe-6178.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://foodswipe-6178.onrender.com` |
| `NEXT_PUBLIC_PUSHER_KEY` | Your Pusher Key |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Your Pusher Cluster |

---

### **Verification Steps**
1. **CORS Check**: Ensure the Vercel URL is added to `allowedOrigins` in `backend/server.js`.
2. **Build Test**: Run `npm run build` locally in both folders to ensure no errors.
3. **Pusher Check**: Real-time notifications only work if Pusher keys are identical on both ends.

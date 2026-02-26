import { onRequest } from "firebase-functions/v2/https";
import app from "./server/server.js"; // We will copy server here

// Export the Express app as a Cloud Function named 'api'
export const api = onRequest({
    region: "us-central1", // Or your preferred region
    memory: "512MiB",
    timeoutSeconds: 60
}, app);
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
dotenv.config();

import serviceAccount from "../serviceAccountKey.json"assert { type: "json" };;
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = getFirestore();
export { admin, db };

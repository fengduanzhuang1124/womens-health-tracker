import axios from "axios";
import { getAuth } from "firebase/auth";

const API = axios.create({
  baseURL: "https://us-central1-womens-health-tracker.cloudfunctions.net/api",
  headers: {
    "Content-Type": "application/json",
},
});
API.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
export default API;

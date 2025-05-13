import {admin} from "../config/firebaseAdmin.js";

// 验证 Firebase token 的中间件
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({error: "No token provided"});
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // user's information add to req
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(403).json({error: "Invalid token"});
  }
};

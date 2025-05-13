// import { db } from "./config/firebaseAdmin.js";


// export async function getUserData(uid) {
//     try {
//         const userRef = db.collection("users").doc(uid);
//         const userDoc = await userRef.get();
//         return userDoc.exists ? userDoc.data() : null;
//     } catch (error) {
//         console.error("Error fetching user data:", error);
//         return null;
//     }
// }


// export async function createUserData(uid, name, email) {
//     try {
//         const userRef = db.collection("users").doc(uid);
//         await userRef.set({
//             name: name,
//             email: email,
//             createdAt: new Date(),
//         });
//         return { success: true, message: "User created successfully" };
//     } catch (error) {
//         console.error("Error creating user data:", error);
//         return { success: false, message: error.message };
//     }
// }
// controllers/userController.js
import {db, admin} from "../config/firebaseAdmin.js";

export const createUser = async (req, res) => {
  try {
    const {uid, name, email} = req.body;
    const userRef = db.collection("users").doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      await userRef.set({
        name,
        email,
        createdAt: new Date(),
        authMethods: ["google"],
      });
      return res.status(201).json({message: "User created successfully"});
    } else {
      await userRef.update({
        authMethods: admin.firestore.FieldValue.arrayUnion("google"),
      });
      return res.status(200).json({message: "User already exists, authMethods updated"});
    }
  } catch (error) {
    res.status(500).json({error: error.message});
  }
};

export const getUser = async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.params.uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).send("User not found");
    }

    res.status(200).json(doc.data());
  } catch (error) {
    res.status(500).send(error.message);
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({error: "No user ID found in token."});

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({error: "User not found"});

    res.json(userDoc.data());
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({error: error.message});
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({error: "No user ID found in token."});

    const {height, age, gender, activityLevel} = req.body;

    // Define the fields to update
    const updateData = {};

    // Only include fields that are provided in the request
    if (height !== undefined) updateData.height = Number(height);
    if (age !== undefined) updateData.age = Number(age);
    if (gender) updateData.gender = gender;
    if (activityLevel) updateData.activityLevel = activityLevel;

    // Update user document
    await db.collection("users").doc(uid).update(updateData);

    res.status(200).json({message: "Profile updated successfully"});
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({error: error.message});
  }
};

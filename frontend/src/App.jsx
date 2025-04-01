import { useEffect } from "react";
import { auth, db } from "./firebase";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register"; 
import Dashboard from "./components/page/Dashboard";

console.log("App.js Loaded");

function App() {
  useEffect(() => {
    if (!auth || !db) {
      console.error("Firebase 未初始化成功！");
    } else {
      console.log("Firebase Auth:", auth);
      console.log("Firebase Firestore:", db);
    }
  }, []);
  

  return (
    <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </Router>
  );
}

export default App;

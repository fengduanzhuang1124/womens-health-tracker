import React, { useState } from "react";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom"; 
 import { createUserWithEmailAndPassword ,GoogleAuthProvider, signInWithPopup } from "firebase/auth";
 import "../../styles/LoginRegister.css";
 import API from "../../api";
 import headerDecor from "../../assets/signcat.gif"; 
const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;


       await API.post("/api/users", {
        uid: user.uid,
        name: name,
        email: user.email,
      });

  
      // if (!response.ok) throw new Error("Failed to save user data");

      alert("Register succefully,please login");
      navigate("/"); 
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

       await API.post("/api/users", {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
      });

      // if (!response.ok) throw new Error("Failed to save user data");

      alert("Google Login successful");
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="auth-container">
       <img src={headerDecor} alt="decor" className="auth-header-image" />
      <h2>Register</h2>
      <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleRegister}>Register</button>
      <button onClick={handleGoogleLogin}>Sign in with Google</button>

      <p>Already have an account? <a href="/">Login</a></p>
    </div>
  );
};

export default Register;

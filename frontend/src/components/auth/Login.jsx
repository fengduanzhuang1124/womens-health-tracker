import React, { useState } from "react";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../../styles/LoginRegister.css";
import API from "../../api";
import headerDecor from "../../assets/avatar-girl.png"; 
const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
   
    const navigate = useNavigate();
    
    const handleEmailLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert("Login successful");
            navigate("/dashboard");
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
    
           
    
            alert("Google Login successful");
            navigate("/dashboard");  
        } catch (error) {
            alert(error.message);
        }
    };
    
    return (
        <div  className="auth-container">
            <img src={headerDecor} alt="decor" className="auth-header-image" />
            <h2>User Login</h2>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleEmailLogin}>Email Login</button>
            <button onClick={handleGoogleLogin}>Google Login</button>
            <p>Don't have an account? <a href="/register">Register</a></p>

        </div>
    );
};

export default Login;

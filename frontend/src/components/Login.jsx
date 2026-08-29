import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Preferences } from "@capacitor/preferences";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const login = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      alert("Please enter username and password");
      return;
    }

    try {
      const response = await fetch(
        "https://fullstack-todo-app-qocm.onrender.com/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      await Preferences.set({
        key: "token",
        value: data.token,
      });

      await Preferences.set({
        key: "username",
        value: data.username,
      });

      navigate("/todo");
    } catch (error) {
      console.log(error);
      alert("Server error. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <h1>Login</h1>

        <form onSubmit={login}>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
          />

          <button type="submit">
            Login
          </button>

        </form>

        <p>
          Don't have an account?{" "}
          <Link to="/register">
            Register
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;
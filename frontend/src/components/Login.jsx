import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Preferences } from "@capacitor/preferences";

const API_URL =
  "https://fullstack-todo-app-qocm.onrender.com";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const login = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      alert("Please enter username and password");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Invalid username or password"
        );

        setLoading(false);
        return;
      }

      // Save login
      await Preferences.set({
        key: "token",
        value: data.token,
      });

      await Preferences.set({
        key: "username",
        value: data.username,
      });

      setLoading(false);

      navigate("/todo");

    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      setLoading(false);

      alert(
        "Cannot connect to server. Make sure the backend is running."
      );
    }
  };

  return (
    <div className="auth-container">

      <div className="auth-card">

        <h1>Welcome Back</h1>

        <p className="auth-subtitle">
          Login to manage your todos
        </p>

        <form onSubmit={login}>

          <label>
            Username
          </label>

          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
          />

          <label>
            Password
          </label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
          />

          <button
            type="submit"
            className="primary-btn"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

        <p className="auth-footer">
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
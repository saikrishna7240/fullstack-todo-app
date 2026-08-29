import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const register = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      alert("Please enter username and password");
      return;
    }

    try {
      const response = await fetch(
        "https://fullstack-todo-app-qocm.onrender.com/register",
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

      alert("Registration successful!");

      navigate("/login");
    } catch (error) {
      console.log(error);
      alert("Server error. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <h1>Register</h1>

        <form onSubmit={register}>

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
            Register
          </button>

        </form>

        <p>
          Already have an account?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Register;
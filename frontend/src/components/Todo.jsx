import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Todo() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");

  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  const API_URL = "https://fullstack-todo-app-qocm.onrender.com";

  const getTodos = async () => {
    try {
      const response = await fetch(`${API_URL}/todos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      const data = await response.json();

      setTodos(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    getTodos();
  }, []);

  const addTodo = async () => {
    if (!title.trim()) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/todos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
        }),
      });

      const newTodo = await response.json();

      setTodos((previousTodos) => [
        ...previousTodos,
        newTodo,
      ]);

      setTitle("");
    } catch (error) {
      console.log(error);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTodos((previousTodos) =>
        previousTodos.filter((todo) => todo.id !== id)
      );
    } catch (error) {
      console.log(error);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
  <div className="todo-container">

    <div className="todo-header">
      <div>
        <h1>My Todos</h1>
        <p>Welcome, {username}</p>
      </div>

      <button
        className="logout-btn"
        onClick={logout}
      >
        Logout
      </button>
    </div>

    <div className="todo-input">
      <input
        type="text"
        placeholder="What needs to be done?"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <button onClick={addTodo}>
        Add
      </button>
    </div>

    <ul className="todo-list">
      {todos.map((todo) => (
        <li
          className="todo-item"
          key={todo.id}
        >
          <span>{todo.title}</span>

          <button
            className="delete-btn"
            onClick={() => deleteTodo(todo.id)}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>

  </div>
);
}

export default Todo;
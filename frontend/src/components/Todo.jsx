import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Todo() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");

  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  const API_URL = "http://localhost:5000";

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
    <div>
      <h1>Todo App</h1>

      <h3>Welcome, {username}</h3>

      <button onClick={logout}>
        Logout
      </button>

      <hr />

      <input
        type="text"
        placeholder="Enter todo"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <button onClick={addTodo}>
        Add Todo
      </button>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {todo.title}

            <button
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
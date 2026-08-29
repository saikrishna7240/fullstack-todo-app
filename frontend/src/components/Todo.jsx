import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Preferences } from "@capacitor/preferences";
import { LocalNotifications } from "@capacitor/local-notifications";

const API_URL =
  "https://fullstack-todo-app-qocm.onrender.com";

function Todo() {
  const [todos, setTodos] = useState([]);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueTime, setDueTime] = useState("");
  const [status, setStatus] = useState("Yet to Do");

  const [editingId, setEditingId] = useState(null);

  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  // =========================
  // LOAD SAVED LOGIN
  // =========================

  useEffect(() => {
    const loadUser = async () => {
      try {
        const tokenResult = await Preferences.get({
          key: "token",
        });

        const usernameResult = await Preferences.get({
          key: "username",
        });

        if (!tokenResult.value) {
          navigate("/login");
          return;
        }

        setToken(tokenResult.value);
        setUsername(usernameResult.value || "");

        await getTodos(tokenResult.value);
      } catch (error) {
        console.log(error);
        navigate("/login");
      }
    };

    loadUser();
  }, []);

  // =========================
  // GET TODOS
  // =========================

  const getTodos = async (savedToken) => {
    try {
      const response = await fetch(`${API_URL}/todos`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (response.status === 401) {
        await logout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to get todos");
        return;
      }

      setTodos(data);
    } catch (error) {
      console.log(error);
      alert("Cannot connect to server");
    }
  };

  // =========================
  // NOTIFICATION PERMISSION
  // =========================

  const requestNotificationPermission = async () => {
    try {
      const permission =
        await LocalNotifications.requestPermissions();

      if (permission.display !== "granted") {
        alert(
          "Please allow notifications to receive Todo reminders."
        );

        return false;
      }

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  // =========================
  // SCHEDULE NOTIFICATION
  // =========================

  const scheduleReminder = async (todo) => {
    if (!todo.due_time) {
      return;
    }

    const reminderDate = new Date(todo.due_time);

    if (isNaN(reminderDate.getTime())) {
      return;
    }

    if (reminderDate <= new Date()) {
      return;
    }

    const allowed =
      await requestNotificationPermission();

    if (!allowed) {
      return;
    }

    try {
      await LocalNotifications.cancel({
        notifications: [
          {
            id: Number(todo.id),
          },
        ],
      });
    } catch (error) {
      console.log(error);
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Number(todo.id),
            title: "Todo Reminder",
            body: `${todo.title} • ${
              todo.priority || "Medium"
            } priority`,
            schedule: {
              at: reminderDate,
              allowWhileIdle: true,
            },
          },
        ],
      });
    } catch (error) {
      console.log(error);
    }
  };

  // =========================
  // ADD TODO
  // =========================

  const addTodo = async () => {
    if (!title.trim()) {
      alert("Please enter a Todo");
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
          title: title.trim(),
          priority,
          due_time: dueTime
            ? new Date(dueTime).toISOString()
            : null,
          status,
        }),
      });

      const newTodo = await response.json();

      if (!response.ok) {
        alert(
          newTodo.message || "Failed to add Todo"
        );
        return;
      }

      setTodos((previousTodos) => [
        ...previousTodos,
        newTodo,
      ]);

      await scheduleReminder(newTodo);

      clearForm();
    } catch (error) {
      console.log(error);
      alert("Cannot connect to server");
    }
  };

  // =========================
  // START EDIT
  // =========================

  const startEdit = (todo) => {
    setEditingId(todo.id);

    setTitle(todo.title || "");

    setPriority(
      todo.priority || "Medium"
    );

    setStatus(
      todo.status || "Yet to Do"
    );

    if (todo.due_time) {
      const date = new Date(todo.due_time);

      if (!isNaN(date.getTime())) {
        const localDate = new Date(
          date.getTime() -
            date.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16);

        setDueTime(localDate);
      } else {
        setDueTime("");
      }
    } else {
      setDueTime("");
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // UPDATE TODO
  // =========================

  const updateTodo = async () => {
    if (!title.trim()) {
      alert("Please enter a Todo");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/todos/${editingId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            title: title.trim(),
            priority,
            due_time: dueTime
              ? new Date(dueTime).toISOString()
              : null,
            status,
          }),
        }
      );

      const updatedTodo =
        await response.json();

      if (!response.ok) {
        alert(
          updatedTodo.message ||
            "Failed to update Todo"
        );
        return;
      }

      setTodos((previousTodos) =>
        previousTodos.map((todo) =>
          todo.id === editingId
            ? updatedTodo
            : todo
        )
      );

      await scheduleReminder(updatedTodo);

      clearForm();
    } catch (error) {
      console.log(error);
      alert("Cannot connect to server");
    }
  };

  // =========================
  // DELETE TODO
  // =========================

  const deleteTodo = async (id) => {
    try {
      const response = await fetch(
        `${API_URL}/todos/${id}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();

        alert(
          data.message ||
            "Failed to delete Todo"
        );

        return;
      }

      try {
        await LocalNotifications.cancel({
          notifications: [
            {
              id: Number(id),
            },
          ],
        });
      } catch (error) {
        console.log(error);
      }

      setTodos((previousTodos) =>
        previousTodos.filter(
          (todo) => todo.id !== id
        )
      );
    } catch (error) {
      console.log(error);
      alert("Cannot connect to server");
    }
  };

  // =========================
  // CLEAR FORM
  // =========================

  const clearForm = () => {
    setTitle("");
    setPriority("Medium");
    setDueTime("");
    setStatus("Yet to Do");
    setEditingId(null);
  };

  // =========================
  // LOGOUT
  // =========================

  const logout = async () => {
    await Preferences.remove({
      key: "token",
    });

    await Preferences.remove({
      key: "username",
    });

    navigate("/login");
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="todo-container">

      {/* HEADER */}

      <div className="todo-header">
        <div>
          <h1>My Todos</h1>

          <p>
            Welcome back,{" "}
            <strong>{username}</strong>
          </p>
        </div>

        <button
          className="logout-btn"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      {/* ADD / EDIT */}

      <div className="todo-form">

        <h2>
          {editingId
            ? "Edit Todo"
            : "Add Todo"}
        </h2>

        <input
          type="text"
          placeholder="What needs to be done?"
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
        />

        <div className="form-row">

          <div>
            <label>
              Priority
            </label>

            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value)
              }
            >
              <option value="Low">
                Low
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="High">
                High
              </option>
            </select>
          </div>

          <div>
            <label>
              Reminder
            </label>

            <input
              type="datetime-local"
              value={dueTime}
              onChange={(event) =>
                setDueTime(event.target.value)
              }
            />
          </div>

        </div>

        <label>
          Status
        </label>

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
        >
          <option value="Yet to Do">
            Yet to Do
          </option>

          <option value="In Progress">
            In Progress
          </option>

          <option value="Completed">
            Completed
          </option>
        </select>

        <div className="form-buttons">

          <button
            className="primary-btn"
            onClick={
              editingId
                ? updateTodo
                : addTodo
            }
          >
            {editingId
              ? "Update Todo"
              : "Add Todo"}
          </button>

          {editingId && (
            <button
              className="cancel-btn"
              onClick={clearForm}
            >
              Cancel
            </button>
          )}

        </div>

      </div>

      {/* TODO LIST */}

      <div className="todo-section">

        <div className="todo-count">
          {todos.length}{" "}
          {todos.length === 1
            ? "Todo"
            : "Todos"}
        </div>

        {todos.length === 0 ? (
          <div className="empty-state">
            <h3>No Todos yet</h3>

            <p>
              Add your first task above.
            </p>
          </div>
        ) : (
          <ul className="todo-list">

            {todos.map((todo) => {

              const todoPriority =
                todo.priority || "Medium";

              const todoStatus =
                todo.status || "Yet to Do";

              const priorityClass =
                todoPriority.toLowerCase();

              const statusClass =
                todoStatus
                  .toLowerCase()
                  .replace(/\s+/g, "-");

              return (
                <li
                  className="todo-item"
                  key={todo.id}
                >

                  <div className="todo-content">

                    <div className="todo-title-row">

                      <span
                        className={`priority-dot ${priorityClass}`}
                      ></span>

                      <h3>
                        {todo.title}
                      </h3>

                    </div>

                    <div className="todo-meta">

                      <span
                        className={`priority-badge ${priorityClass}`}
                      >
                        {todoPriority}
                      </span>

                      <span
                        className={`status-badge ${statusClass}`}
                      >
                        {todoStatus}
                      </span>

                    </div>

                    {todo.due_time && (
                      <p className="todo-time">
                        🕒{" "}
                        {new Date(
                          todo.due_time
                        ).toLocaleString()}
                      </p>
                    )}

                  </div>

                  <div className="todo-actions">

                    <button
                      className="edit-btn"
                      onClick={() =>
                        startEdit(todo)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() =>
                        deleteTodo(todo.id)
                      }
                    >
                      Delete
                    </button>

                  </div>

                </li>
              );
            })}

          </ul>
        )}

      </div>

    </div>
  );
}

export default Todo;
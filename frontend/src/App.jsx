import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Register from "./components/Register";
import Login from "./components/Login";
import Todo from "./components/Todo";

function App() {
  return (
    <HashRouter>
      <Routes>

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/todo"
          element={<Todo />}
        />

        <Route
          path="*"
          element={<Navigate to="/login" />}
        />

      </Routes>
    </HashRouter>
  );
}

export default App;
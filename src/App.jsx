import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./context/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function App() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Checking your session...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <Register />}
      />

      <Route
        path="/"
        element={user ? <Dashboard /> : <Navigate to="/login" replace />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

import { Suspense, lazy } from "react";
import "./App.css";
// import Dashboard from "./modules/dashboard/Index";
import Loader from "./components/Loader/Index";
// import Form from "./modules/form/Index";
import {
  Routes,
  Route,
  BrowserRouter,
  Navigate,
  useLocation,
} from "react-router-dom";
const Dashboard = lazy(() => import("./modules/dashboard/Index"));
const Form = lazy(() => import("./modules/form/Index"));

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem("user:token") != null || false;
  const location = useLocation();

  if (
    !isLoggedIn &&
    !["/users/sign_in", "/users/sign_up"].includes(location.pathname)
  ) {
    return <Navigate to="/users/sign_in" />;
  }

  if (
    isLoggedIn &&
    ["/users/sign_in", "/users/sign_up"].includes(location.pathname)
  ) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <div className="bg-secondary h-screen flex justify-center items-center">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/sign_in"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <Form isSignInPage={true} />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/sign_up"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <Form isSignInPage={false} />
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

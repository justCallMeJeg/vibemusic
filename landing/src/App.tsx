import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import Hero from "./components/hero";

const router = createBrowserRouter(
  [
    { path: "/", element: <Hero /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
);

export default function App() {
  return <RouterProvider router={router} />;
}

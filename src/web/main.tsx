import { createRoot } from "react-dom/client";
import App from "./app";
import "./styles/tokens.css";
import "./styles/binder-tokens.css";
createRoot(document.getElementById("root")!).render(<App />);

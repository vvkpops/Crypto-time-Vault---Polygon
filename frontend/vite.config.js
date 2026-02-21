import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",  // Force IPv4 — fixes "localhost can't be reached" on Windows
    port: 5173,
  },
});

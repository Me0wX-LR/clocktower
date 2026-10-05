import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function llmProxy(): Plugin {
  return {
    name: "llm-proxy",
    configureServer(server) {
      server.middlewares.use("/api/chat", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("method");
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
              baseUrl?: string;
              apiKey?: string;
              model?: string;
              temperature?: number;
              messages?: { role: string; content: string }[];
            };
            const base = (body.baseUrl || "").replace(/\/$/, "");
            if (!base || !body.apiKey || !body.model) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "缺少模型位址、金鑰或模型名稱" }));
              return;
            }
            const r = await fetch(`${base}/chat/completions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${body.apiKey}`,
              },
              body: JSON.stringify({
                model: body.model,
                temperature: body.temperature ?? 0.9,
                messages: body.messages ?? [],
              }),
            });
            const text = await r.text();
            res.statusCode = r.status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), llmProxy()],
  server: { host: "0.0.0.0", port: 8080, strictPort: true },
});

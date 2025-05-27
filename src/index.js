// api/src/index.js

const express = require("express");
const rotas = require("./rotas");
const cors = require("cors");
const app = express();

app.use(
  cors({
    // CRÍTICO: Liste os domínios permitidos explicitamente
    origin: [
      "https://projeto-cubos.vercel.app", // <-- SUBSTITUA ESTE PELO DOMÍNIO REAL DO SEU FRONTEND NO VERCEL
      "http://localhost:5173", // Para desenvolvimento local do frontend Vite
      "http://localhost:3000", // Para desenvolvimento local do backend (se você rodar ele localmente)
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Quais métodos HTTP são permitidos
    allowedHeaders: ["Content-Type", "Authorization", "x-cubos-token"], // Adicione quaisquer outros cabeçalhos personalizados que você usa
  })
);

app.use(express.json());

app.use(rotas);

// Use a variável de ambiente PORT do Render (ou 3000 para fallback local)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});

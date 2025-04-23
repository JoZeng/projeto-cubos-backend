const express = require("express");
const rotas = require("./rotas");
const cors = require("cors");
const app = express();

app.use(
  cors({
    origin: true,
  })
);
app.use(express.json());

app.use(rotas);

app.listen(3000);

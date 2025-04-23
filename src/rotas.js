const express = require("express");
const { login } = require("./controladores/login");

const {
  verificarEmail,
  cadastrarUsuario,
  obterPerfilUsuario,
  atualizarPerfilUsuario,
} = require("./controladores/usuario");

const {
  cadastrarCliente,
  listarClientes,
  detalharCliente,
  editarCliente,
} = require("./controladores/clientes");

const {
  cadastrarCobranca,
  listarCobrancas,
  listarCobrancasPorCliente,
  editarCobranca,
  deletarCobranca,
} = require("./controladores/cobrancas");

const { filtroAutenticacao } = require("./intermediarios/autenticacao");

const rotas = express();
rotas.get("/verificar-email", verificarEmail);
rotas.post("/usuario", cadastrarUsuario);
rotas.post("/login", login);

rotas.use(filtroAutenticacao);

rotas.get("/usuario", obterPerfilUsuario);
rotas.put("/usuario", atualizarPerfilUsuario);

rotas.post("/clientes", cadastrarCliente);
rotas.get("/clientes", listarClientes);

rotas.put("/clientes/:id", editarCliente);

rotas.post("/cobrancas", cadastrarCobranca);
rotas.get("/cobrancas", listarCobrancas);
rotas.get("/cobrancas/cliente/:id", listarCobrancasPorCliente);
rotas.put("/cobrancas/:id", editarCobranca);
rotas.delete("/cobrancas/:id", deletarCobranca);
rotas.get("/clientes/:id", detalharCliente);
module.exports = rotas;

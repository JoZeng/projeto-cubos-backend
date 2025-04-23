const { query } = require("../bancodedados/conexao");
const bcrypt = require("bcrypt");

const verificarEmail = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ mensagem: "E-mail é obrigatório." });
  }

  try {
    const resultado = await query("SELECT * FROM usuarios WHERE email = $1", [
      email,
    ]);

    if (resultado.rowCount > 0) {
      return res.status(400).json({ mensagem: "E-mail já está cadastrado." });
    }

    return res.status(200).json({ existe: false });
  } catch (error) {
    return res.status(500).json({ mensagem: `Erro interno: ${error.message}` });
  }
};

const cadastrarUsuario = async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res
      .status(400)
      .json({ mensagem: "Todos os campos são obrigatórios" });
  }

  try {
    const usuario = await query("select * from usuarios where email = $1", [
      email,
    ]);

    if (usuario.rowCount > 0) {
      return res
        .status(400)
        .json({ errors: { email: "O e-mail já existe cadastrado." } });
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    const queryCadastro =
      "insert into usuarios (nome, email, senha) values ($1, $2, $3) returning *";
    const paramCadastro = [nome, email, senhaCriptografada];
    const usuarioCadastrado = await query(queryCadastro, paramCadastro);

    if (usuarioCadastrado.rowCount <= 0) {
      return res
        .status(500)
        .json({ mensagem: `Erro interno: ${error.message}` });
    }

    const { senha: _, ...cadastro } = usuarioCadastrado.rows[0];

    return res.status(201).json(cadastro);
  } catch (error) {
    return res.status(500).json({ mensagem: `Erro interno: ${error.message}` });
  }
};

const obterPerfilUsuario = async (req, res) => {
  return res.json(req.usuario);
};

const atualizarPerfilUsuario = async (req, res) => {
  const { usuario } = req;
  const { nome, email, senha, cpf, telefone } = req.body;

  if (!nome || !email || !senha) {
    return res
      .status(400)
      .json({ mensagem: "Todos os campos são obrigatórios" });
  }

  try {
    const emailExistente = await query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );
    if (
      emailExistente.rowCount > 0 &&
      emailExistente.rows[0].id !== usuario.id
    ) {
      return res
        .status(400)
        .json({ errors: { email: "O e-mail já existe cadastrado." } });
    }

    if (cpf && cpf.length !== 11) {
      return res
        .status(400)
        .json({ errors: { cpf: "CPF deve ter 11 caracteres." } });
    }

    if (telefone && telefone.length !== 11) {
      return res
        .status(400)
        .json({ errors: { telefone: "Telefone deve ter 11 caracteres." } });
    }

    if (cpf) {
      const cpfExistente = await query(
        "SELECT * FROM usuarios WHERE cpf = $1 AND id <> $2",
        [cpf, usuario.id]
      );

      if (cpfExistente.rowCount > 0) {
        return res.status(400).json({ errors: { cpf: "CPF já cadastrado." } });
      }
    }

    if (telefone) {
      const telefoneExistente = await query(
        "SELECT * FROM usuarios WHERE telefone = $1 AND id <> $2",
        [telefone, usuario.id]
      );

      if (telefoneExistente.rowCount > 0) {
        return res
          .status(400)
          .json({ errors: { telefone: "Telefone já cadastrado." } });
      }
    }

    const telefoneFormatado = telefone?.trim() || null;
    const cpfFormatado = cpf?.trim() || null;

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    const queryAtualizacao = `
    UPDATE usuarios SET nome = $1, email = $2, senha = $3, cpf = $4, telefone = $5 WHERE id = $6
  `;
    const paramAtualizacao = [
      nome,
      email,
      senhaCriptografada,
      cpfFormatado,
      telefoneFormatado,
      usuario.id,
    ];

    await query(queryAtualizacao, paramAtualizacao);

    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);

    return res.status(500).json({ mensagem: `Erro interno: ${error.message}` });
  }
};

module.exports = {
  verificarEmail,
  cadastrarUsuario,
  obterPerfilUsuario,
  atualizarPerfilUsuario,
};

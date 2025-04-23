const { query } = require("../bancodedados/conexao");

const cadastrarCobranca = async (req, res) => {
  let { cliente_id, descricao, status, valor, vencimento } = req.body;

  // Validação de campos obrigatórios
  if (!cliente_id || !descricao || !status || !valor || !vencimento) {
    return res.status(400).json({
      mensagem: "Todos os campos obrigatórios devem ser preenchidos.",
    });
  }

  // Validação de status original
  if (status !== "pago" && status !== "pendente") {
    return res
      .status(400)
      .json({ mensagem: "O status deve ser 'pago' ou 'pendente'." });
  }

  // Atualiza status para vencida se for o caso
  if (status === "pendente" && new Date(vencimento) < new Date()) {
    status = "vencida";
  }

  try {
    // Verifica se o cliente existe
    const clienteExiste = await query("SELECT * FROM clientes WHERE id = $1", [
      cliente_id,
    ]);

    if (clienteExiste.rowCount === 0) {
      return res.status(404).json({ mensagem: "Cliente não encontrado." });
    }

    // Insere a cobrança
    const queryInsercao = `
      INSERT INTO cobrancas (cliente_id, descricao, status, valor, vencimento)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const params = [cliente_id, descricao, status, valor, vencimento];

    const novaCobranca = await query(queryInsercao, params);

    return res.status(201).json({
      mensagem: "Cobrança cadastrada com sucesso.",
      cobranca: novaCobranca.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: `Erro interno: ${error.message}`,
    });
  }
};

const listarCobrancas = async (req, res) => {
  try {
    const resultado = await query(
      `SELECT 
        cobrancas.id,
        clientes.nome AS cliente_nome,
        cobrancas.cliente_id,
        cobrancas.descricao,
        cobrancas.valor,
        cobrancas.vencimento,
        cobrancas.status
      FROM cobrancas
      JOIN clientes ON cobrancas.cliente_id = clientes.id`
    );

    return res.status(200).json(resultado.rows);
  } catch (error) {
    return res.status(500).json({ mensagem: "Erro interno no servidor." });
  }
};

const listarCobrancasPorCliente = async (req, res) => {
  const { id } = req.params;

  try {
    // Verifica se o cliente existe
    const cliente = await query("SELECT * FROM clientes WHERE id = $1", [id]);

    if (cliente.rows.length === 0) {
      // Se o cliente não existir, retorna um array vazio sem erro
      return res.status(200).json({ cobrancas: [] });
    }

    // Busca as cobranças associadas ao cliente
    const cobrancas = await query(
      "SELECT * FROM cobrancas WHERE cliente_id = $1 ORDER BY vencimento DESC",
      [id]
    );

    // Se não houver cobranças, retorna um array vazio
    return res.status(200).json({ cobrancas: cobrancas.rows });
  } catch (error) {
    // Caso ocorra um erro, retorna um erro genérico
    return res
      .status(500)
      .json({ mensagem: `Erro ao buscar cobranças: ${error.message}` });
  }
};

const editarCobranca = async (req, res) => {
  const { id } = req.params;
  let { descricao, status, valor, vencimento } = req.body;

  // Validação dos campos obrigatórios
  if (!descricao || !status || !valor || !vencimento) {
    return res.status(400).json({
      mensagem: "Todos os campos obrigatórios devem ser preenchidos.",
    });
  }

  // Validação de status
  if (status !== "pago" && status !== "pendente") {
    return res
      .status(400)
      .json({ mensagem: "O status deve ser 'pago' ou 'pendente'." });
  }

  // Atualiza status para vencida se necessário
  if (status === "pendente" && new Date(vencimento) < new Date()) {
    status = "vencida";
  }

  try {
    // Verifica se a cobrança existe
    const cobrancaExistente = await query(
      "SELECT * FROM cobrancas WHERE id = $1",
      [id]
    );

    if (cobrancaExistente.rowCount === 0) {
      return res.status(404).json({ mensagem: "Cobrança não encontrada." });
    }

    // Atualiza a cobrança
    const queryAtualizacao = `
      UPDATE cobrancas
      SET descricao = $1, status = $2, valor = $3, vencimento = $4
      WHERE id = $5
      RETURNING *;
    `;

    const params = [descricao, status, valor, vencimento, id];

    const cobrancaAtualizada = await query(queryAtualizacao, params);

    return res.status(200).json({
      mensagem: "Cobrança atualizada com sucesso.",
      cobranca: cobrancaAtualizada.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: `Erro ao atualizar cobrança: ${error.message}`,
    });
  }
};

const deletarCobranca = async (req, res) => {
  const { id } = req.params;

  try {
    // Verifica se a cobrança existe
    const cobranca = await query("SELECT * FROM cobrancas WHERE id = $1", [id]);

    if (cobranca.rowCount === 0) {
      return res.status(404).json({ mensagem: "Cobrança não encontrada." });
    }

    // Verifica se a cobrança está paga (não permitir deletar)
    if (cobranca.rows[0].status === "pago") {
      return res
        .status(400)
        .json({ mensagem: "Cobranças pagas não podem ser excluídas." });
    }

    // Deleta a cobrança
    await query("DELETE FROM cobrancas WHERE id = $1", [id]);

    return res.status(200).json({ mensagem: "Cobrança deletada com sucesso." });
  } catch (error) {
    return res.status(500).json({
      mensagem: `Erro ao deletar cobrança: ${error.message}`,
    });
  }
};

module.exports = {
  cadastrarCobranca,
  listarCobrancas,
  listarCobrancasPorCliente,
  editarCobranca,
  deletarCobranca,
};

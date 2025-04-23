const { query } = require("../bancodedados/conexao");

const cadastrarCliente = async (req, res) => {
  const {
    nome,
    email,
    cpf,
    telefone,
    cep,
    endereco,
    complemento,
    bairro,
    cidade,
    estado,
  } = req.body;
  const { usuario } = req;

  if (!nome || !email || !cpf || !telefone) {
    return res.status(400).json({
      mensagem: "Todos os campos obrigatórios devem ser preenchidos.",
    });
  }

  try {
    const emailExistente = await query(
      "SELECT * FROM clientes WHERE email = $1 AND usuario_id = $2",
      [email, usuario.id]
    );
    if (emailExistente.rowCount > 0) {
      return res.status(400).json({ email: "O e-mail já está cadastrado." });
    }

    const cpfExistente = await query(
      "SELECT * FROM clientes WHERE cpf = $1 AND usuario_id = $2",
      [cpf, usuario.id]
    );
    if (cpfExistente.rowCount > 0) {
      return res.status(400).json({ cpf: "O CPF já está cadastrado." });
    }

    const telExistente = await query(
      "SELECT * FROM clientes WHERE telefone = $1 AND usuario_id = $2",
      [telefone, usuario.id]
    );
    if (telExistente.rowCount > 0) {
      return res
        .status(400)
        .json({ telefone: "O telefone já está cadastrado." });
    }

    const queryCadastro = `
      INSERT INTO clientes (
        nome, email, cpf, telefone, cep, endereco, complemento,
        bairro, cidade, estado, usuario_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const parametrosCadastro = [
      nome,
      email,
      cpf,
      telefone,
      cep,
      endereco,
      complemento,
      bairro,
      cidade,
      estado,
      usuario.id,
    ];

    const clienteCadastrado = await query(queryCadastro, parametrosCadastro);

    if (clienteCadastrado.rowCount <= 0) {
      return res.status(500).json({ mensagem: "Erro ao cadastrar cliente." });
    }

    return res.status(201).json(clienteCadastrado.rows[0]);
  } catch (error) {
    return res.status(500).json({ mensagem: `Erro interno: ${error.message}` });
  }
};

const listarClientes = async (req, res) => {
  const { usuario } = req;
  const pagina = Number(req.query.pagina) || 1;
  const limite = Number(req.query.limite) || 10;
  const todos = req.query.todos;
  try {
    let clientesQuery;
    let params;

    if (todos === "true") {
      clientesQuery = `
        SELECT id, nome, email, cpf, telefone, cep, endereco, complemento, bairro, cidade, estado 
        FROM clientes 
        WHERE usuario_id = $1
        ORDER BY id
      `;
      params = [usuario.id];
    } else {
      const offset = (pagina - 1) * limite;
      clientesQuery = `
        SELECT id, nome, email, cpf, telefone, cep, endereco, complemento, bairro, cidade, estado 
        FROM clientes 
        WHERE usuario_id = $1
        ORDER BY id
        LIMIT $2 OFFSET $3
      `;
      params = [usuario.id, limite, offset];
    }

    const resultado = await query(clientesQuery, params);
    const clientes = resultado.rows;

    const idsClientes = clientes.map((c) => c.id);
    let cobrancas = [];

    if (idsClientes.length > 0) {
      const placeholders = idsClientes.map((_, i) => `$${i + 1}`).join(", ");
      const consultaCobrancas = `
        SELECT * FROM cobrancas
        WHERE cliente_id IN (${placeholders})
      `;
      const cobrancasResult = await query(consultaCobrancas, idsClientes);
      cobrancas = cobrancasResult.rows;
    }

    const clientesComStatus = clientes.map((cliente) => {
      const cobrancasDoCliente = cobrancas.filter(
        (cobranca) => cobranca.cliente_id === cliente.id
      );

      let totalPago = 0;
      let totalVencido = 0;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      cobrancasDoCliente.forEach((c) => {
        const status = c.status?.trim().toLowerCase();
        const vencimento = new Date(c.vencimento);
        vencimento.setHours(0, 0, 0, 0);

        if (status === "pago") {
          totalPago += Number(c.valor);
        } else if (status === "pendente" && vencimento < hoje) {
          totalVencido += Number(c.valor);
        }
      });

      return {
        ...cliente,
        status: totalVencido > 0 ? "inadimplente" : "em dia",
        totalPago,
        totalVencido,
        cobrancas: cobrancasDoCliente,
      };
    });

    // Se for todos, retorna sem paginação
    if (String(todos) === "true") {
      return res.status(200).json({
        clientes: clientesComStatus,
        total: clientesComStatus.length,
      });
    }

    // Caso com paginação
    const countResult = await query(
      `SELECT COUNT(*) FROM clientes WHERE usuario_id = $1`,
      [usuario.id]
    );
    const total = parseInt(countResult.rows[0].count);

    return res.status(200).json({
      clientes: clientesComStatus,
      total,
      pagina: Number(pagina),
      limite: Number(limite),
      totalPaginas: Math.ceil(total / limite),
    });
  } catch (error) {
    return res.status(500).json({ mensagem: `Erro interno: ${error.message}` });
  }
};

const detalharCliente = async (req, res) => {
  const { id } = req.params;

  try {
    const clienteResult = await query("SELECT * FROM clientes WHERE id = $1", [
      id,
    ]);
    if (clienteResult.rowCount === 0) {
      return res.status(404).json({ mensagem: "Cliente não encontrado." });
    }

    // Retorna as cobranças, caso existam, senão retorna um array vazio
    const cobrancasResult = await query(
      "SELECT * FROM cobrancas WHERE cliente_id = $1 ORDER BY vencimento DESC",
      [id]
    );

    return res.status(200).json({
      cliente: clienteResult.rows[0],
      cobrancas: cobrancasResult.rows.length ? cobrancasResult.rows : [], // Garante que a resposta seja um array
    });
  } catch (error) {
    return res.status(500).json({ mensagem: `Erro interno: ${error.message}` });
  }
};

const editarCliente = async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    email,
    cpf,
    telefone,
    cep,
    endereco,
    complemento,
    bairro,
    cidade,
    estado,
  } = req.body;
  const { usuario } = req;

  if (!nome || !email || !cpf || !telefone) {
    return res.status(400).json({
      mensagem: "Todos os campos obrigatórios devem ser preenchidos.",
    });
  }

  try {
    const clienteExistente = await query(
      "SELECT * FROM clientes WHERE id = $1 AND usuario_id = $2",
      [id, usuario.id]
    );
    if (clienteExistente.rowCount === 0) {
      return res.status(404).json({ mensagem: "Cliente não encontrado." });
    }

    const emailDuplicado = await query(
      "SELECT * FROM clientes WHERE email = $1 AND id != $2 AND usuario_id = $3",
      [email, id, usuario.id]
    );
    if (emailDuplicado.rowCount > 0) {
      return res.status(400).json({ email: "O email já está cadastrado." });
    }

    const cpfDuplicado = await query(
      "SELECT * FROM clientes WHERE cpf = $1 AND id != $2 AND usuario_id = $3",
      [cpf, id, usuario.id]
    );
    if (cpfDuplicado.rowCount > 0) {
      return res.status(400).json({ cpf: "O CPF já está cadastrado." });
    }

    const telefoneDuplicado = await query(
      "SELECT * FROM clientes WHERE telefone = $1 AND id != $2 AND usuario_id = $3",
      [telefone, id, usuario.id]
    );
    if (telefoneDuplicado.rowCount > 0) {
      return res.status(400).json({
        telefone: "O telefone já está cadastrado.",
      });
    }

    const queryAtualizacao = `
      UPDATE clientes
      SET nome = $1,
          email = $2,
          cpf = $3,
          telefone = $4,
          cep = $5,
          endereco = $6,
          complemento = $7,
          bairro = $8,
          cidade = $9,
          estado = $10
      WHERE id = $11 AND usuario_id = $12
      RETURNING *
    `;

    const valoresAtualizacao = [
      nome,
      email,
      cpf,
      telefone,
      cep,
      endereco,
      complemento,
      bairro,
      cidade,
      estado,
      id,
      usuario.id,
    ];

    const resultado = await query(queryAtualizacao, valoresAtualizacao);

    if (resultado.rowCount === 0) {
      return res
        .status(400)
        .json({ mensagem: "Não foi possível atualizar o cliente." });
    }

    return res.status(200).json({
      mensagem: "Cliente atualizado com sucesso.",
      cliente: resultado.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ mensagem: `Erro interno: ${error.message}` });
  }
};

module.exports = {
  cadastrarCliente,
  listarClientes,
  detalharCliente,
  editarCliente,
};

const { query } = require('../bancodedados/conexao')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'Email e senha são obrigatórios' });
    }

    try {
        const { rowCount, rows } = await query('select * from usuarios where email = $1', [email]);

        if (rowCount <= 0) {
            return res.status(400).json({ mensagem: 'Email ou senha estão incorretas' });
        }

        const [usuario] = rows;

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.status(400).json({ mensagem: 'Email ou senha estão incorretas' });
        }

        const token = jwt.sign({ id: usuario.id }, 'senhaSeguraParaToken', { expiresIn: '8h' });

        const { senha: _, ...dadosUsuario } = usuario;

        return res.status(200).json({
            usuario: dadosUsuario,
            token
        });
    } catch (error) {
        return res.status(500).json({ mensagem: `Erro interno: ${error.message}` });
    }
}

module.exports = {
    login
}
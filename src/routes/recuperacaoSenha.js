// Rotas da recuperação de senha: /api/recuperar-senha/*
const express = require('express');
const supabase = require('../config/database');
const { enviarCodigoRecuperacao } = require('../services/email');
const { solicitarRecuperacao, redefinirSenha } = require('../services/recuperacaoSenha');

const router = express.Router();

// 1) Usuário informa o e-mail e recebe o código
router.post('/solicitar', async (req, res) => {
    const { status, body } = await solicitarRecuperacao({
        email: req.body.email,
        supabase,
        enviarCodigo: enviarCodigoRecuperacao
    });
    return res.status(status).json(body);
});

// 2) Usuário informa o código recebido e a nova senha
router.post('/confirmar', async (req, res) => {
    const { status, body } = await redefinirSenha({
        email: req.body.email,
        codigo: req.body.codigo,
        novaSenha: req.body.novaSenha,
        supabase
    });
    return res.status(status).json(body);
});

module.exports = router;

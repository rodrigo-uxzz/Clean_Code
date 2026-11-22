
require('dotenv').config();

const express = require('express');
const path = require('path');
const supabase = require('./src/config/database');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos (HTML, CSS, JS e imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Página de recuperação de senha
app.get('/recuperar-senha', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'recuperar-senha.html'));
});

// API de recuperação de senha (solicitar código e redefinir)
app.use('/api/recuperar-senha', require('./src/routes/recuperacaoSenha'));

// API de login
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Validação dos campos
        if (
            typeof email !== 'string' ||
            typeof senha !== 'string' ||
            !email.trim() ||
            !senha
        ) {
            return res.status(400).json({
                success: false,
                message: 'Informe e-mail e senha.'
            });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .select('role')
            .eq('email', email)
            .eq('senha', senha)
            .single();

         if (error) {
            console.error('ERRO SUPABASE:', {
                code: error.code,
                message: error.message,
                details: error.details
            });
        
            return res.status(500).json({
                success: false,
                message: 'Erro ao consultar o Supabase.'
            });
        }
        
        if (!data) {
            console.log('LOGIN: nenhum usuário encontrado');
        
            return res.status(401).json({
                success: false,
                message: 'E-mail ou senha inválidos.'
            });
        }

        return res.status(200).json({
            success: true,
            role: data.role,
            message: `Bem-vindo! Acesso liberado como ${data.role}.`
        });

    } catch (error) {
        console.error('Erro na API de login:', error);

        return res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.'
        });
    }
});

// Configuração da porta
const PORT = process.env.PORT || 3000;

// Execução local do servidor
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

// Exportação para ambientes de hospedagem
module.exports = app;

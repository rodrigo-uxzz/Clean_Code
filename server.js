
require('dotenv').config();

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const supabase = require('./src/config/database');

const app = express();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não configurada no .env');
}

//  MIDDLEWARES 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//  VERIFICAR AUTENTICAÇÃO 
function verificarAutenticacao(req, res, next) {
    const token = req.cookies.cc_session;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        next();
    } catch (erro) {
        res.clearCookie('cc_session', { path: '/' });
        return res.redirect('/login');
    }
}

//  VERIFICAR PERFIL    
function verificarPerfil(role) {
    return (req, res, next) => {
        if (req.usuario.role !== role) {
            return res.status(403).send('Acesso negado.');
        }

        next();
    };
}

//  PÁGINAS PÚBLICAS 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/recuperar-senha', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'public', 'recuperar-senha.html')
    );
});

//  PÁGINAS PROTEGIDAS 
app.get(
    '/aluno.html',
    verificarAutenticacao,
    verificarPerfil('aluno'),
    (req, res) => {
        res.set('Cache-Control', 'no-store');

        res.sendFile(
            path.join(__dirname, 'private', 'aluno.html')
        );
    }
);

app.get(
    '/professor.html',
    verificarAutenticacao,
    verificarPerfil('professor'),
    (req, res) => {
        res.set('Cache-Control', 'no-store');

        res.sendFile(
            path.join(__dirname, 'private', 'professor.html')
        );
    }
);

//  API DE RECUPERAÇÃO DE SENHA 
app.use(
    '/api/recuperar-senha',
    require('./src/routes/recuperacaoSenha')
);

//  API DE LOGIN 
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

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

        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('id, role')
            .eq('email', email.trim())
            .eq('senha', senha)
            .maybeSingle();

        if (error) {
            console.error('Erro Supabase:', error);

            return res.status(500).json({
                success: false,
                message: 'Erro ao consultar o Supabase.'
            });
        }

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'E-mail ou senha inválidos.'
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                role: usuario.role
            },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.cookie('cc_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 2 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            role: usuario.role,
            message: `Bem-vindo! Acesso liberado como ${usuario.role}.`
        });

    } catch (erro) {
        console.error('Erro na API de login:', erro);

        return res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.'
        });
    }
});

//  VERIFICAR SESSÃO 
app.get('/api/sessao', (req, res) => {
    const token = req.cookies.cc_session;

    if (!token) {
        return res.status(401).json({
            autenticado: false
        });
    }

    try {
        const usuario = jwt.verify(token, JWT_SECRET);

        return res.json({
            autenticado: true,
            role: usuario.role
        });
    } catch {
        return res.status(401).json({
            autenticado: false
        });
    }
});

//  LOGOUT 
app.post('/api/logout', (req, res) => {
    res.clearCookie('cc_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });

    res.set('Cache-Control', 'no-store');

    return res.json({
        success: true,
        message: 'Logout realizado com sucesso.'
    });
});

//  ARQUIVOS PÚBLICOS 
// Manter depois das rotas protegidas.
app.use(express.static(
    path.join(__dirname, 'public'),
    { index: false }
));

//  SERVIDOR 
const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

module.exports = app;

const express = require('express');
const path = require('path');
// 1. Atualizamos o caminho do database
const supabase = require('./src/config/database'); 

const app = express();

app.use(express.json());

// 2. Avisamos o Express que os arquivos estáticos (CSS, IMG) agora estão na pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// 3. Atualizamos as rotas para buscar os HTMLs dentro da pasta 'public'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// A rota da API continua igual
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    
    const { data, error } = await supabase
        .from('usuarios')
        .select('role')
        .eq('email', email)
        .eq('senha', senha)
        .single(); 

    if (error || !data) {
        return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    res.json({ 
        success: true, 
        role: data.role, 
        message: `Bem-vindo! Acesso liberado como ${data.role}.` 
    });
});

const PORT = 3000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Servidor rodando internamente em http://127.0.0.1:${PORT}`);
});
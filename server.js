const express = require('express');
const path = require('path');
const app = express();

// Permite que o servidor entenda JSON enviado pelo frontend
app.use(express.json());

// Serve os arquivos estáticos (CSS, imagens e HTML)
app.use(express.static(__dirname));

// Rota principal: entrega a landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota da página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Rota da API que valida o login
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    
    // Lógica básica de validação (mock)
    if (email === 'admin@cleancode.com' && senha === '123456') {
        res.json({ success: true, message: 'Login realizado com sucesso!' });
    } else {
        res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
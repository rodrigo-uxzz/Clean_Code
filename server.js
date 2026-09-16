const express = require('express');
const path = require('path');
const app = express();

const supabase = require('./database');

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
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    
    // Consulta a tabela 'usuarios' no Supabase
    const { data, error } = await supabase
        .from('usuarios')
        .select('role')
        .eq('email', email)
        .eq('senha', senha)
        .single(); // Espera retornar apenas 1 usuário

    // LIGANDO O LOG DE ERRO AQUI:
    if (error) {
        console.log("Erro retornado pelo Supabase:", error);
    }
    
    if (error || !data) {
        return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    // Retorna o sucesso e a 'role' para o frontend redirecionar corretamente
    res.json({ 
        success: true, 
        role: data.role, 
        message: `Bem-vindo! Acesso liberado como ${data.role}.` 
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
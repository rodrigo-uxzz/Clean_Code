# Mentor de Clean Code 🧠💻

Este é o repositório do projeto **Mentor de Clean Code**, um sistema desenvolvido para auxiliar alunos e professores na análise e evolução de práticas de programação, fornecendo feedback estrutural e arquitetural sobre algoritmos.

## 🗂️ Estrutura do Projeto

O projeto segue uma arquitetura baseada em Node.js para a API e arquivos estáticos para o frontend.

```text
Clean_Code/
├── public/              # Arquivos estáticos do Frontend (HTML, CSS, Imagens)
├── src/                 # Código do Backend
│   └── config/          # Configurações (ex: database.js)
├── server.js            # Ponto de entrada da aplicação Node.js
├── package.json         # Dependências do projeto
└── .env                 # Variáveis de ambiente (NÃO VERSIONADO)
```

## 🚀 Pré-requisitos

Antes de iniciar, certifique-se de ter as seguintes ferramentas instaladas em sua máquina:
* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) (Versão 18 ou superior)
* Conta no [Supabase](https://supabase.com/) para o banco de dados.

## ⚙️ Configuração do Ambiente

**1. Clone o repositório:**
```bash
git clone [https://github.com/rodrigo-uxzz/Clean_Code.git](https://github.com/rodrigo-uxzz/Clean_Code.git)
cd Clean_Code
```

**2. Instale as dependências:**
```bash
npm install
```

**3. Configure as Variáveis de Ambiente:**
Crie um arquivo chamado `.env` na raiz do projeto e adicione suas credenciais do Supabase:

```text
SUPABASE_URL=[https://sua-url-aqui.supabase.co](https://sua-url-aqui.supabase.co)
SUPABASE_KEY=sua-anon-key-aqui
```

## 🗄️ Configuração do Banco de Dados

Caso esteja configurando o Supabase do zero, execute o script SQL abaixo no **SQL Editor** para criar as tabelas e inserir os dados de teste:

```sql
-- Criação da tabela de Usuários
CREATE TABLE usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('aluno', 'professor')) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Cria a tabela de Submissões de Código
CREATE TABLE submissoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aluno_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo_fonte TEXT NOT NULL,
    feedback_ia TEXT,
    pontos_atencao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Permissão de leitura/escrita para a API (Testes de desenvolvimento)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Usuários de teste
INSERT INTO usuarios (nome, email, senha, role) VALUES
('Professor Teste', 'admin@cleancode.com', '123456', 'professor'),
('Aluno Teste', 'aluno@cleancode.com', '123456', 'aluno')
ON CONFLICT (email) DO NOTHING;
```

## 🖥️ Executando a Aplicação

Para iniciar o servidor de desenvolvimento, rode o comando:

```bash
node server.js
```

Acesse no seu navegador: 👉 `http://127.0.0.1:3000`

### 🔑 Credenciais de Teste
* **Visão do Professor:** `admin@cleancode.com` | Senha: `123456`
* **Visão do Aluno:** `aluno@cleancode.com` | Senha: `123456`

## 🛠️ Tecnologias Utilizadas
* **Backend:** Node.js, Express
* **Frontend:** HTML5, CSS3, JavaScript
* **Banco de Dados & Autenticação:** Supabase (PostgreSQL)

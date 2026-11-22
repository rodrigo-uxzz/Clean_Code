const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.RECUPERACAO_SECRET = 'segredo-de-teste';

const { hashCodigo } = require('../src/services/codigoRecuperacao');
const { solicitarRecuperacao, redefinirSenha } = require('../src/services/recuperacaoSenha');

// Supabase falso em memória, com a API encadeável usada pelo serviço.
function criarSupabaseFalso(tabelasIniciais) {
    const tabelas = JSON.parse(JSON.stringify(tabelasIniciais));
    let seq = 0;

    function builder(nome) {
        const estado = { filtros: [], ordem: null, limite: null, operacao: 'select', valores: null };
        const linhasFiltradas = () => {
            let linhas = (tabelas[nome] || []).filter((l) =>
                estado.filtros.every(([c, v]) => l[c] === v)
            );
            if (estado.ordem) {
                const [col, desc] = estado.ordem;
                linhas = [...linhas].sort((a, b) => (a[col] < b[col] ? 1 : -1) * (desc ? 1 : -1));
            }
            if (estado.limite != null) linhas = linhas.slice(0, estado.limite);
            return linhas;
        };

        const api = {
            select() { return api; },
            eq(col, val) { estado.filtros.push([col, val]); return api; },
            order(col, opts = {}) { estado.ordem = [col, opts.ascending === false]; return api; },
            limit(n) { estado.limite = n; return api; },
            insert(valor) { estado.operacao = 'insert'; estado.valores = valor; return api; },
            update(valor) { estado.operacao = 'update'; estado.valores = valor; return api; },
            async maybeSingle() {
                const r = await api.then((x) => x);
                return { data: r.data[0] ?? null, error: null };
            },
            then(resolve, reject) {
                try {
                    if (estado.operacao === 'insert') {
                        const linha = { id: `id${++seq}`, criado_em: new Date(Date.now() + seq).toISOString(), ...estado.valores };
                        tabelas[nome] = [...(tabelas[nome] || []), linha];
                        return resolve({ data: [linha], error: null });
                    }
                    const alvo = linhasFiltradas();
                    if (estado.operacao === 'update') {
                        alvo.forEach((l) => Object.assign(l, estado.valores));
                    }
                    return resolve({ data: alvo, error: null });
                } catch (e) {
                    return reject(e);
                }
            },
        };
        return api;
    }

    return { tabelas, from: (nome) => builder(nome) };
}

const usuarioBase = () => ({
    usuarios: [{ id: 'u1', nome: 'Aluno Teste', email: 'aluno@cleancode.com', senha: '123456' }],
    recuperacao_senha: [],
});

let mensagensEnviadas;
const enviarCodigoFalso = async ({ para, codigo }) => {
    mensagensEnviadas.push({ para, codigo });
};

beforeEach(() => {
    mensagensEnviadas = [];
});

test('solicitar: e-mail inválido retorna 400', async () => {
    const r = await solicitarRecuperacao({ email: 'nao-é-email', supabase: criarSupabaseFalso(usuarioBase()), enviarCodigo: enviarCodigoFalso });
    assert.equal(r.status, 400);
});

test('solicitar: e-mail não cadastrado retorna a mesma resposta e não envia nada', async () => {
    const supabase = criarSupabaseFalso(usuarioBase());
    const existente = await solicitarRecuperacao({ email: 'aluno@cleancode.com', supabase, enviarCodigo: enviarCodigoFalso });
    const inexistente = await solicitarRecuperacao({ email: 'ninguem@x.com', supabase, enviarCodigo: enviarCodigoFalso });

    assert.equal(existente.status, 200);
    assert.deepEqual(existente.body, inexistente.body);
    assert.equal(mensagensEnviadas.length, 1);
    assert.equal(mensagensEnviadas[0].para, 'aluno@cleancode.com');
});

test('solicitar: guarda apenas o hash do código, com validade de 15 minutos', async () => {
    const supabase = criarSupabaseFalso(usuarioBase());
    const agora = Date.parse('2026-11-21T10:00:00Z');
    await solicitarRecuperacao({ email: 'aluno@cleancode.com', supabase, enviarCodigo: enviarCodigoFalso, agora });

    const [registro] = supabase.tabelas.recuperacao_senha;
    const { codigo } = mensagensEnviadas[0];
    assert.match(codigo, /^\d{6}$/);
    assert.notEqual(registro.codigo_hash, codigo);
    assert.equal(registro.codigo_hash, hashCodigo(codigo));
    assert.equal(new Date(registro.expira_em).getTime(), agora + 15 * 60 * 1000);
});

test('solicitar: um novo pedido invalida o código anterior', async () => {
    const supabase = criarSupabaseFalso(usuarioBase());
    await solicitarRecuperacao({ email: 'aluno@cleancode.com', supabase, enviarCodigo: enviarCodigoFalso });
    const primeiro = mensagensEnviadas[0].codigo;
    await solicitarRecuperacao({ email: 'aluno@cleancode.com', supabase, enviarCodigo: enviarCodigoFalso });

    const [antigo, novo] = supabase.tabelas.recuperacao_senha;
    assert.equal(antigo.usado, true);
    assert.equal(novo.usado, false);

    const r = await redefinirSenha({ email: 'aluno@cleancode.com', codigo: primeiro, novaSenha: 'nova123', supabase });
    assert.equal(r.status, 400);
});

test('solicitar: falha no envio de e-mail não muda a resposta', async () => {
    const supabase = criarSupabaseFalso(usuarioBase());
    const quebrado = async () => { throw new Error('SMTP fora'); };
    const r = await solicitarRecuperacao({ email: 'aluno@cleancode.com', supabase, enviarCodigo: quebrado });
    assert.equal(r.status, 200);
});

test('confirmar: fluxo feliz troca a senha e torna o código de uso único', async () => {
    const supabase = criarSupabaseFalso(usuarioBase());
    await solicitarRecuperacao({ email: 'aluno@cleancode.com', supabase, enviarCodigo: enviarCodigoFalso });
    const { codigo } = mensagensEnviadas[0];

    const r = await redefinirSenha({ email: 'aluno@cleancode.com', codigo, novaSenha: 'nova123', supabase });
    assert.equal(r.status, 200);
    assert.equal(supabase.tabelas.usuarios[0].senha, 'nova123');

    const repetido = await redefinirSenha({ email: 'aluno@cleancode.com', codigo, novaSenha: 'outra456', supabase });
    assert.equal(repetido.status, 400);
    assert.equal(supabase.tabelas.usuarios[0].senha, 'nova123');
});

test('confirmar: código errado incrementa tentativas e é bloqueado após o limite', async () => {
    const supabase = criarSupabaseFalso(usuarioBase());
    await solicitarRecuperacao({ email: 'aluno@cleancode.com', supabase, enviarCodigo: enviarCodigoFalso });
    const correto = mensagensEnviadas[0].codigo;
    const errado = correto === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) {
        const r = await redefinirSenha({ email: 'aluno@cleancode.com', codigo: errado, novaSenha: 'nova123', supabase });
        assert.equal(r.status, 400);
    }
    // Mesmo com o código certo, o registro já foi bloqueado
    const r = await redefinirSenha({ email: 'aluno@cleancode.com', codigo: correto, novaSenha: 'nova123', supabase });
    assert.equal(r.status, 400);
    assert.equal(supabase.tabelas.usuarios[0].senha, '123456');
});

test('confirmar: código expirado é rejeitado', async () => {
    const supabase = criarSupabaseFalso(usuarioBase());
    const agora = Date.parse('2026-11-21T10:00:00Z');
    await solicitarRecuperacao({ email: 'aluno@cleancode.com', supabase, enviarCodigo: enviarCodigoFalso, agora });
    const { codigo } = mensagensEnviadas[0];

    const depois = agora + 16 * 60 * 1000;
    const r = await redefinirSenha({ email: 'aluno@cleancode.com', codigo, novaSenha: 'nova123', supabase, agora: depois });
    assert.equal(r.status, 400);
});

test('confirmar: valida formato do código e tamanho da nova senha', async () => {
    const supabase = criarSupabaseFalso(usuarioBase());
    const base = { email: 'aluno@cleancode.com', supabase };
    assert.equal((await redefinirSenha({ ...base, codigo: '12345', novaSenha: 'nova123' })).status, 400);
    assert.equal((await redefinirSenha({ ...base, codigo: 'abcdef', novaSenha: 'nova123' })).status, 400);
    assert.equal((await redefinirSenha({ ...base, codigo: '123456', novaSenha: '123' })).status, 400);
});

test('confirmar: e-mail inexistente retorna a mesma mensagem de código inválido', async () => {
    const supabase = criarSupabaseFalso(usuarioBase());
    const r = await redefinirSenha({ email: 'ninguem@x.com', codigo: '123456', novaSenha: 'nova123', supabase });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /inválido ou expirado/);
});

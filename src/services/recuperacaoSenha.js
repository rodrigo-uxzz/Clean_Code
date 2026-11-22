// Regras do fluxo "esqueci minha senha".
// Recebe o cliente do banco e o envio de e-mail por parâmetro para facilitar testes.
const {
    CODIGO_VALIDADE_MS,
    MAX_TENTATIVAS,
    gerarCodigo,
    hashCodigo,
    hashesIguais
} = require('./codigoRecuperacao');

const TABELA = 'recuperacao_senha';
const MSG_SOLICITACAO =
    'Se o e-mail estiver cadastrado, enviaremos um código de recuperação em instantes.';
const MSG_CODIGO_INVALIDO = 'Código inválido ou expirado. Solicite um novo código.';
const MSG_ERRO_INTERNO = 'Erro interno no servidor.';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resposta(status, success, message) {
    return { status, body: { success, message } };
}

async function buscarUsuarioPorEmail(supabase, email) {
    return supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('email', email)
        .maybeSingle();
}

// Sempre devolve a mesma mensagem quando o e-mail não existe,
// para não revelar quais contas estão cadastradas.
async function solicitarRecuperacao({
    email,
    supabase,
    enviarCodigo,
    agora = Date.now()
}) {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return resposta(400, false, 'Informe um e-mail válido.');
    }

    const emailLimpo = email.trim();

    try {
        const { data: usuario, error } = await buscarUsuarioPorEmail(supabase, emailLimpo);
        if (error) throw error;

        if (!usuario) {
            return resposta(200, true, MSG_SOLICITACAO);
        }

        // Invalida códigos anteriores ainda não usados.
        const { error: erroInvalidar } = await supabase
            .from(TABELA)
            .update({ usado: true })
            .eq('usuario_id', usuario.id)
            .eq('usado', false);
        if (erroInvalidar) throw erroInvalidar;

        const codigo = gerarCodigo();

        const { error: erroInsert } = await supabase.from(TABELA).insert({
            usuario_id: usuario.id,
            codigo_hash: hashCodigo(codigo),
            expira_em: new Date(agora + CODIGO_VALIDADE_MS).toISOString(),
            tentativas: 0,
            usado: false
        });
        if (erroInsert) throw erroInsert;

        try {
            await enviarCodigo({ para: usuario.email, nome: usuario.nome, codigo });
        } catch (erroEmail) {
            // Falha de envio não deve alterar a resposta: o usuário veria a diferença.
            console.error('Falha ao enviar e-mail de recuperação:', erroEmail);
        }

        return resposta(200, true, MSG_SOLICITACAO);
    } catch (erro) {
        console.error('Erro ao solicitar recuperação de senha:', erro);
        return resposta(500, false, MSG_ERRO_INTERNO);
    }
}

async function redefinirSenha({
    email,
    codigo,
    novaSenha,
    supabase,
    agora = Date.now()
}) {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return resposta(400, false, 'Informe um e-mail válido.');
    }
    if (typeof codigo !== 'string' || !/^\d{6}$/.test(codigo.trim())) {
        return resposta(400, false, 'O código deve ter 6 dígitos.');
    }
    if (typeof novaSenha !== 'string' || novaSenha.length < 6) {
        return resposta(400, false, 'A nova senha deve ter pelo menos 6 caracteres.');
    }

    try {
        const { data: usuario, error: erroUsuario } = await buscarUsuarioPorEmail(
            supabase,
            email.trim()
        );
        if (erroUsuario) throw erroUsuario;
        if (!usuario) {
            return resposta(400, false, MSG_CODIGO_INVALIDO);
        }

        const { data: registro, error: erroRegistro } = await supabase
            .from(TABELA)
            .select('id, codigo_hash, expira_em, tentativas')
            .eq('usuario_id', usuario.id)
            .eq('usado', false)
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (erroRegistro) throw erroRegistro;

        const expirado = !registro || new Date(registro.expira_em).getTime() < agora;
        if (expirado || registro.tentativas >= MAX_TENTATIVAS) {
            if (registro) {
                await supabase.from(TABELA).update({ usado: true }).eq('id', registro.id);
            }
            return resposta(400, false, MSG_CODIGO_INVALIDO);
        }

        const codigoCorreto = hashesIguais(hashCodigo(codigo.trim()), registro.codigo_hash);
        if (!codigoCorreto) {
            const novasTentativas = registro.tentativas + 1;
            await supabase
                .from(TABELA)
                .update({
                    tentativas: novasTentativas,
                    usado: novasTentativas >= MAX_TENTATIVAS
                })
                .eq('id', registro.id);
            return resposta(400, false, MSG_CODIGO_INVALIDO);
        }

        // Marca o código como usado antes de trocar a senha (uso único).
        const { error: erroMarcar } = await supabase
            .from(TABELA)
            .update({ usado: true })
            .eq('id', registro.id);
        if (erroMarcar) throw erroMarcar;

        const { error: erroSenha } = await supabase
            .from('usuarios')
            .update({ senha: novaSenha })
            .eq('id', usuario.id);
        if (erroSenha) throw erroSenha;

        return resposta(200, true, 'Senha redefinida com sucesso. Você já pode fazer login.');
    } catch (erro) {
        console.error('Erro ao redefinir senha:', erro);
        return resposta(500, false, MSG_ERRO_INTERNO);
    }
}

module.exports = { solicitarRecuperacao, redefinirSenha };

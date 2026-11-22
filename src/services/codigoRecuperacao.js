// Geração e verificação dos códigos de recuperação de senha.
// O código nunca é guardado em texto puro: só o HMAC dele vai para o banco.
const crypto = require('crypto');

const CODIGO_VALIDADE_MS = 15 * 60 * 1000; // 15 minutos
const MAX_TENTATIVAS = 5;

function obterSegredo() {
    const segredo = process.env.RECUPERACAO_SECRET;
    if (!segredo) {
        throw new Error('RECUPERACAO_SECRET não está configurada.');
    }
    return segredo;
}

// Código numérico de 6 dígitos gerado com CSPRNG.
function gerarCodigo() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashCodigo(codigo) {
    return crypto
        .createHmac('sha256', obterSegredo())
        .update(String(codigo))
        .digest('hex');
}

// Comparação em tempo constante.
function hashesIguais(a, b) {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
    CODIGO_VALIDADE_MS,
    MAX_TENTATIVAS,
    gerarCodigo,
    hashCodigo,
    hashesIguais
};

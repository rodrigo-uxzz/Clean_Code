// Envio de e-mails via SMTP (nodemailer).
// Configuração por variáveis de ambiente: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.

let transporte = null;

function obterTransporte() {
    if (!transporte) {
        // Carregado sob demanda para que o restante da aplicação funcione sem o pacote.
        const nodemailer = require('nodemailer');
        const porta = Number(process.env.SMTP_PORT || 587);

        transporte = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: porta,
            secure: porta === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    return transporte;
}

async function enviarEmail({ para, assunto, texto, html }) {
    return obterTransporte().sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: para,
        subject: assunto,
        text: texto,
        html
    });
}

async function enviarCodigoRecuperacao({ para, nome, codigo }) {
    const saudacao = nome ? `Olá, ${nome}!` : 'Olá!';

    return enviarEmail({
        para,
        assunto: 'Código para recuperar sua senha - Clean Code',
        texto:
            `${saudacao}\n\n` +
            `Seu código de recuperação de senha é: ${codigo}\n\n` +
            `Ele expira em 15 minutos. Se você não solicitou a recuperação, ignore este e-mail.`,
        html:
            `<p>${saudacao}</p>` +
            `<p>Seu código de recuperação de senha é:</p>` +
            `<p style="font-size:28px;font-weight:bold;letter-spacing:6px;">${codigo}</p>` +
            `<p>Ele expira em 15 minutos. Se você não solicitou a recuperação, ignore este e-mail.</p>`
    });
}

module.exports = { enviarEmail, enviarCodigoRecuperacao };

// Fluxo de recuperação de senha em duas etapas:
// 1) envia o e-mail e recebe o código; 2) informa o código e a nova senha.

const formSolicitar = document.getElementById("formSolicitar");
const formConfirmar = document.getElementById("formConfirmar");
const emailInput = document.getElementById("emailRecuperacao");
const codigoInput = document.getElementById("codigoRecuperacao");
const novaSenhaInput = document.getElementById("novaSenha");
const confirmarSenhaInput = document.getElementById("confirmarSenha");
const btnSolicitar = document.getElementById("btnSolicitar");
const btnConfirmar = document.getElementById("btnConfirmar");
const btnReenviar = document.getElementById("btnReenviar");
const mensagem = document.getElementById("mensagemRecuperacao");

let emailAtual = "";

function mostrarMensagem(texto, sucesso = false) {
    mensagem.innerText = texto;
    mensagem.classList.toggle("mensagem-sucesso", sucesso);
}

function bloquear(botao, bloqueado, textoCarregando) {
    botao.disabled = bloqueado;
    if (bloqueado) {
        botao.dataset.textoOriginal = botao.innerText;
        botao.innerText = textoCarregando;
    } else if (botao.dataset.textoOriginal) {
        botao.innerText = botao.dataset.textoOriginal;
    }
}

async function chamarApi(caminho, dados) {
    const response = await fetch(caminho, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
    });
    return response.json();
}

async function solicitarCodigo(email) {
    bloquear(btnSolicitar, true, "Enviando...");
    bloquear(btnReenviar, true, "Enviando...");
    try {
        const result = await chamarApi("/api/recuperar-senha/solicitar", { email });
        mostrarMensagem(result.message, result.success);
        if (result.success) {
            emailAtual = email;
            formSolicitar.hidden = true;
            formConfirmar.hidden = false;
            codigoInput.focus();
        }
    } catch (erro) {
        mostrarMensagem("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
        bloquear(btnSolicitar, false);
        bloquear(btnReenviar, false);
    }
}

formSolicitar.addEventListener("submit", (e) => {
    e.preventDefault();
    solicitarCodigo(emailInput.value.trim());
});

btnReenviar.addEventListener("click", () => {
    solicitarCodigo(emailAtual);
});

formConfirmar.addEventListener("submit", async (e) => {
    e.preventDefault();

    const novaSenha = novaSenhaInput.value;
    if (novaSenha !== confirmarSenhaInput.value) {
        mostrarMensagem("As senhas não coincidem.");
        return;
    }

    bloquear(btnConfirmar, true, "Redefinindo...");
    try {
        const result = await chamarApi("/api/recuperar-senha/confirmar", {
            email: emailAtual,
            codigo: codigoInput.value.trim(),
            novaSenha,
        });
        mostrarMensagem(result.message, result.success);
        if (result.success) {
            formConfirmar.hidden = true;
            setTimeout(() => {
                window.location.href = "/login";
            }, 2500);
        }
    } catch (erro) {
        mostrarMensagem("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
        bloquear(btnConfirmar, false);
    }
});

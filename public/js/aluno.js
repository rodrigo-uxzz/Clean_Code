
const menuBotao = document.getElementById("menuHamburguer");
const sidebar = document.getElementById("sidebarAluno");
const overlay = document.getElementById("menuOverlay");

function fecharMenu() {
    sidebar.classList.remove("menu-aberto");
    overlay.classList.remove("overlay-aberto");

    menuBotao.setAttribute("aria-expanded", "false");
    menuBotao.setAttribute("aria-label", "Abrir menu");
}

function alternarMenu() {
    const aberto = sidebar.classList.toggle("menu-aberto");

    overlay.classList.toggle("overlay-aberto", aberto);

    menuBotao.setAttribute("aria-expanded", String(aberto));
    menuBotao.setAttribute(
        "aria-label",
        aberto ? "Fechar menu" : "Abrir menu"
    );
}

menuBotao.addEventListener("click", alternarMenu);
overlay.addEventListener("click", fecharMenu);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        fecharMenu();
    }
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 600) {
        fecharMenu();
    }
});

/* ==========================================================
   REGISTRO.JS - Logica de registro.html
   ==========================================================
   Requiere que comun.js este cargado ANTES que este archivo
   (usa leerLista, guardarLista, marcarCampoInvalido,
   limpiarErroresFormulario, activarLimpiezaAlEscribir,
   esCorreoValido y mostrarMensaje).
   ========================================================== */

/* --------------------------------------------------------
   2) REGISTRO DE USUARIO NUEVO (registro.html)
   -------------------------------------------------------- */

function inicializarRegistro() {
  const formularioRegistro = document.getElementById("form-registro");
  if (!formularioRegistro) return; // si esta pagina no tiene el form, no hacemos nada

  // Apagamos la validacion nativa del navegador (los globitos grises)
  // para poder mostrar los avisos con la estetica de NUBEX
  formularioRegistro.setAttribute("novalidate", "novalidate");
  activarLimpiezaAlEscribir(formularioRegistro);

  formularioRegistro.addEventListener("submit", function (evento) {
    evento.preventDefault(); // evita que la pagina se recargue

    limpiarErroresFormulario(formularioRegistro);

    // Leemos los datos que escribio el usuario
    const inputUsername = document.getElementById("username_nuevo");
    const inputMail = document.getElementById("mail_nuevo");
    const inputPassword = document.getElementById("password_nuevo");

    const username_nuevo = inputUsername.value.trim();
    const mail_nuevo = inputMail.value.trim();
    const password_nuevo = inputPassword.value;

    const mensaje = document.getElementById("mensaje-registro");

    // Validacion campo por campo, marcando en rojo el que este mal
    let formularioValido = true;

    if (username_nuevo === "") {
      marcarCampoInvalido(inputUsername, "Ingresá un nombre de usuario.");
      formularioValido = false;
    }

    if (mail_nuevo === "") {
      marcarCampoInvalido(inputMail, "Ingresá tu correo electrónico.");
      formularioValido = false;
    } else if (!esCorreoValido(mail_nuevo)) {
      marcarCampoInvalido(inputMail, "Ingresá un correo electrónico válido.");
      formularioValido = false;
    }

    if (password_nuevo === "") {
      marcarCampoInvalido(inputPassword, "Ingresá una contraseña.");
      formularioValido = false;
    }

    if (!formularioValido) {
      mostrarMensaje(mensaje, "Revisá los campos marcados en rojo.", "error");
      return;
    }

    // Buscamos si ya existe un usuario con ese mail
    // (comparamos en minuscula para que "Ana@mail.com" y "ana@mail.com"
    // cuenten como el mismo correo)
    const usuarios = leerLista("nubex_usuarios");
    const yaExiste = usuarios.some(function (usuario) {
      return usuario.mail_nuevo.toLowerCase() === mail_nuevo.toLowerCase();
    });

    if (yaExiste) {
      marcarCampoInvalido(inputMail, "Ya existe una cuenta con ese correo.");
      mostrarMensaje(mensaje, "Ya existe una cuenta con ese correo.", "error");
      return;
    }

    // Agregamos el usuario nuevo a la lista y la guardamos
    usuarios.push({ username_nuevo, mail_nuevo, password_nuevo });
    guardarLista("nubex_usuarios", usuarios);

    mostrarMensaje(mensaje, "Cuenta creada con exito. Redirigiendo al login...", "exito");

    // Esperamos un segundo y mandamos al usuario a la pagina de login
    setTimeout(function () {
      window.location.href = "login.html";
    }, 1200);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  inicializarRegistro();
});

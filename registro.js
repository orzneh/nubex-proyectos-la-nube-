/* ==========================================================
   REGISTRO.JS - Logica de registro.html
   ==========================================================
   Requiere que comun.js este cargado antes (expone "Nubex").
   ========================================================== */
(function () {
  "use strict";

  const { ListaStorage, ValidadorFormulario, Reglas, esCorreoValido, mostrarMensaje } = Nubex;
  const usuariosStorage = new ListaStorage("nubex_usuarios");

  class PaginaRegistro {
    constructor() {
      this.formulario = document.getElementById("form-registro");
    }

    init() {
      if (!this.formulario) return; // esta pagina no es registro.html

      this.validador = new ValidadorFormulario(this.formulario);
      this.formulario.addEventListener("submit", (evento) => this.#manejarEnvio(evento));
    }

    #manejarEnvio(evento) {
      evento.preventDefault();
      this.validador.limpiarTodos();

      const inputUsername = document.getElementById("username_nuevo");
      const inputMail = document.getElementById("mail_nuevo");
      const inputPassword = document.getElementById("password_nuevo");
      const mensaje = document.getElementById("mensaje-registro");

      const username_nuevo = inputUsername.value.trim();
      const mail_nuevo = inputMail.value.trim();
      const password_nuevo = inputPassword.value;

      let formularioValido = true;

      // Decision "validar nombre": si esta permitido -> Regla 1 (se guarda);
      // si no -> Regla 2 (se rechaza y se explica por que)
      if (username_nuevo === "") {
        this.validador.marcarInvalido(inputUsername, "Ingresá un nombre de usuario.");
        formularioValido = false;
      } else {
        const validacionNombre = Reglas.validarNombreUsuario(username_nuevo, usuariosStorage.leer());
        if (!validacionNombre.ok) {
          this.validador.marcarInvalido(inputUsername, validacionNombre.motivo);
          formularioValido = false;
        }
      }

      if (mail_nuevo === "") {
        this.validador.marcarInvalido(inputMail, "Ingresá tu correo electrónico.");
        formularioValido = false;
      } else if (!esCorreoValido(mail_nuevo)) {
        this.validador.marcarInvalido(inputMail, "Ingresá un correo electrónico válido.");
        formularioValido = false;
      }

      if (password_nuevo === "") {
        this.validador.marcarInvalido(inputPassword, "Ingresá una contraseña.");
        formularioValido = false;
      }

      if (!formularioValido) {
        mostrarMensaje(mensaje, "Revisá los campos marcados en rojo.", "error");
        return;
      }

      // Comparamos en minuscula para que "Ana@mail.com" y "ana@mail.com"
      // cuenten como el mismo correo
      const usuarios = usuariosStorage.leer();
      const yaExiste = usuarios.some((u) => (u.mail_nuevo || "").toLowerCase() === mail_nuevo.toLowerCase());

      if (yaExiste) {
        this.validador.marcarInvalido(inputMail, "Ya existe una cuenta con ese correo.");
        mostrarMensaje(mensaje, "Ya existe una cuenta con ese correo.", "error");
        return;
      }

      usuarios.push({ username_nuevo, mail_nuevo, password_nuevo });
      usuariosStorage.guardar(usuarios);

      mostrarMensaje(mensaje, "Cuenta creada con éxito. Redirigiendo al login...", "exito");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    }
  }

  document.addEventListener("DOMContentLoaded", () => new PaginaRegistro().init());
})();


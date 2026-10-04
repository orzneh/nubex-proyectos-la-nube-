/* ==========================================================
   LOGIN.JS - Logica de login.html
   ==========================================================
   Requiere que comun.js este cargado antes (expone "Nubex").
   ========================================================== */
(function () {
  "use strict";

  const { ListaStorage, Sesion, ControlIntentos, ValidadorFormulario, esCorreoValido, mostrarMensaje, CONFIG } = Nubex;
  const usuariosStorage = new ListaStorage("nubex_usuarios");

  class PaginaLogin {
    constructor() {
      this.formulario = document.getElementById("form-login");
    }

    init() {
      if (!this.formulario) return;

      this.validador = new ValidadorFormulario(this.formulario);
      this.formulario.addEventListener("submit", (evento) => this.#manejarEnvio(evento));
      this.#inicializarLlaveDeAcceso();
      this.#inicializarAlternarAcceso();
    }

    // Antes las dos formas de entrar (contraseña y llave de acceso) estaban
    // apiladas una debajo de la otra todo el tiempo, lo cual quedaba raro.
    // Ahora arranca mostrando solo el login con contraseña, y este boton
    // alterna hacia la llave de acceso (y viceversa).
    #inicializarAlternarAcceso() {
      const boton = document.getElementById("boton-alternar-acceso");
      const bloqueLlave = document.getElementById("bloque-llave-acceso");
      if (!boton || !bloqueLlave) return;

      boton.addEventListener("click", () => {
        const mostrandoLlave = !bloqueLlave.hidden;

        bloqueLlave.hidden = mostrandoLlave;
        this.formulario.hidden = !mostrandoLlave;
        boton.textContent = mostrandoLlave ? "Usar llave de acceso en su lugar" : "Volver a usar contraseña";

        this.validador.limpiarTodos();
        document.getElementById("mensaje-login").className = "mensaje";
      });
    }

    #manejarEnvio(evento) {
      evento.preventDefault();
      this.validador.limpiarTodos();

      const inputCorreo = document.getElementById("correo_electronico");
      const inputPassword = document.getElementById("password");
      const mensaje = document.getElementById("mensaje-login");

      const correo_electronico = inputCorreo.value.trim();
      const correoClave = correo_electronico.toLowerCase();
      const password = inputPassword.value;

      let formularioValido = true;

      if (correo_electronico === "") {
        this.validador.marcarInvalido(inputCorreo, "Ingresá tu correo electrónico.");
        formularioValido = false;
      } else if (!esCorreoValido(correo_electronico)) {
        this.validador.marcarInvalido(inputCorreo, "Ingresá un correo electrónico válido.");
        formularioValido = false;
      }

      if (password === "") {
        this.validador.marcarInvalido(inputPassword, "Ingresá tu contraseña.");
        formularioValido = false;
      }

      if (!formularioValido) {
        mostrarMensaje(mensaje, "Revisá los campos marcados en rojo.", "error");
        return;
      }

      // El control de intentos es POR CUENTA: cada correo tiene su propio
      // contador, y el bloqueo se vence solo despues de un rato (en vez de
      // quedar bloqueado para siempre, o bloquear a todos los usuarios
      // por los intentos fallidos de uno solo).
      const intentos = new ControlIntentos(correoClave);
      const segundosBloqueo = intentos.segundosDeBloqueo();

      if (segundosBloqueo > 0) {
        mostrarMensaje(
          mensaje,
          `Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en ${segundosBloqueo} segundos.`,
          "error"
        );
        return;
      }

      const usuarios = usuariosStorage.leer();
      const usuarioEncontrado = usuarios.find(
        (u) => u.mail_nuevo.toLowerCase() === correoClave && u.password_nuevo === password
      );

      if (usuarioEncontrado) {
        intentos.reiniciar();
        Sesion.guardar({
          nombre_cliente: usuarioEncontrado.username_nuevo,
          correo_electronico: usuarioEncontrado.mail_nuevo,
        });

        mostrarMensaje(mensaje, `Bienvenido, ${usuarioEncontrado.username_nuevo}. Redirigiendo...`, "exito");
        setTimeout(() => {
          window.location.href = "administrar.html";
        }, 1000);
        return;
      }

      // Login incorrecto: registramos el intento fallido en ESTA cuenta
      const intentosRestantes = intentos.registrarFallo();

      if (intentosRestantes === null) {
        mostrarMensaje(
          mensaje,
          `Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en ${Math.round(CONFIG.TIEMPO_BLOQUEO_MS / 1000)} segundos.`,
          "error"
        );
      } else {
        mostrarMensaje(mensaje, `Correo o contraseña incorrectos. Intentos restantes: ${intentosRestantes}`, "error");
      }
    }

    // Opcion alternativa: entrar sin password, con una "llave de acceso"
    #inicializarLlaveDeAcceso() {
      const boton = document.getElementById("boton-llave-acceso");
      const inputLlave = document.getElementById("llave_acceso");
      if (!boton || !inputLlave) return;

      inputLlave.addEventListener("input", () => this.validador.limpiarInvalido(inputLlave));

      boton.addEventListener("click", () => {
        const mensaje = document.getElementById("mensaje-login");
        const llave_acceso = inputLlave.value.trim();

        if (llave_acceso === "") {
          this.validador.marcarInvalido(inputLlave, "Ingresá tu llave de acceso.");
          mostrarMensaje(mensaje, "Ingresá tu llave de acceso.", "error");
          return;
        }

        this.validador.limpiarInvalido(inputLlave);

        // Para esta demo, cualquier llave no vacia funciona como acceso rapido
        Sesion.guardar({ nombre_cliente: "Invitado", correo_electronico: "" });
        mostrarMensaje(mensaje, "Acceso concedido con llave. Redirigiendo...", "exito");

        setTimeout(() => {
          window.location.href = "administrar.html";
        }, 1000);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => new PaginaLogin().init());
})();

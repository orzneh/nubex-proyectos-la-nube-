/* --------------------------------------------------------
   3) INICIO DE SESION (login.html)
   -------------------------------------------------------- */

function inicializarLogin() {
  const formularioLogin = document.getElementById("form-login");
  if (!formularioLogin) return;

  // Apagamos la validacion nativa del navegador (los globitos grises)
  // para poder mostrar los avisos con la estetica de NUBEX
  formularioLogin.setAttribute("novalidate", "novalidate");
  activarLimpiezaAlEscribir(formularioLogin);

  formularioLogin.addEventListener("submit", function (evento) {
    evento.preventDefault();

    limpiarErroresFormulario(formularioLogin);

    const inputCorreo = document.getElementById("correo_electronico");
    const inputPassword = document.getElementById("password");

    const correo_electronico = inputCorreo.value.trim();
    const correoClave = correo_electronico.toLowerCase(); // usamos minuscula para comparar/guardar
    const password = inputPassword.value;
    const mensaje = document.getElementById("mensaje-login");

    // Validacion campo por campo antes de meternos con la logica de bloqueo
    let formularioValido = true;

    if (correo_electronico === "") {
      marcarCampoInvalido(inputCorreo, "Ingresá tu correo electrónico.");
      formularioValido = false;
    } else if (!esCorreoValido(correo_electronico)) {
      marcarCampoInvalido(inputCorreo, "Ingresá un correo electrónico válido.");
      formularioValido = false;
    }

    if (password === "") {
      marcarCampoInvalido(inputPassword, "Ingresá tu contraseña.");
      formularioValido = false;
    }

    if (!formularioValido) {
      mostrarMensaje(mensaje, "Revisá los campos marcados en rojo.", "error");
      return;
    }

    // num_intentos: ahora se guarda POR CUENTA (antes era un solo contador
    // global, asi que 3 intentos fallidos de cualquiera bloqueaban el
    // login de TODOS los usuarios para siempre. Ahora cada correo tiene
    // su propio contador, y ademas el bloqueo se vence solo despues de
    // TIEMPO_BLOQUEO_MS en vez de quedar bloqueado para siempre).
    const estadoIntentos = leerEstadoIntentos(correoClave);
    const ahora = Date.now();

    if (estadoIntentos.bloqueadoHasta && ahora < estadoIntentos.bloqueadoHasta) {
      const segundosRestantes = Math.ceil((estadoIntentos.bloqueadoHasta - ahora) / 1000);
      mostrarMensaje(
        mensaje,
        "Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en " + segundosRestantes + " segundos.",
        "error"
      );
      return;
    }

    // Si el bloqueo ya vencio, reiniciamos el contador de esa cuenta
    if (estadoIntentos.bloqueadoHasta && ahora >= estadoIntentos.bloqueadoHasta) {
      estadoIntentos.num_intentos = 0;
      estadoIntentos.bloqueadoHasta = 0;
    }

    const usuarios = leerLista("nubex_usuarios");
    const usuarioEncontrado = usuarios.find(function (usuario) {
      return usuario.mail_nuevo.toLowerCase() === correoClave && usuario.password_nuevo === password;
    });

    if (usuarioEncontrado) {
      // Login correcto: reiniciamos el contador de intentos de esta cuenta
      guardarEstadoIntentos(correoClave, { num_intentos: 0, bloqueadoHasta: 0 });

      // Guardamos quien es el "nombre_cliente" logueado actualmente
      const sesion = {
        nombre_cliente: usuarioEncontrado.username_nuevo,
        correo_electronico: usuarioEncontrado.mail_nuevo
      };
      localStorage.setItem("nubex_sesion", JSON.stringify(sesion));

      mostrarMensaje(mensaje, "Bienvenido, " + usuarioEncontrado.username_nuevo + ". Redirigiendo...", "exito");

      setTimeout(function () {
        window.location.href = "administrar.html";
                                            
}, 1000);
    } else {
      // Login incorrecto: sumamos un intento fallido a ESTA cuenta
      estadoIntentos.num_intentos = estadoIntentos.num_intentos + 1;

      if (estadoIntentos.num_intentos >= MAXIMO_INTENTOS) {
        estadoIntentos.bloqueadoHasta = Date.now() + TIEMPO_BLOQUEO_MS;
        guardarEstadoIntentos(correoClave, estadoIntentos);
        mostrarMensaje(
          mensaje,
          "Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en " + Math.round(TIEMPO_BLOQUEO_MS / 1000) + " segundos.",
          "error"
        );
      } else {
        guardarEstadoIntentos(correoClave, estadoIntentos);
        const intentosRestantes = MAXIMO_INTENTOS - estadoIntentos.num_intentos;
        mostrarMensaje(
          mensaje,
          "Correo o contraseña incorrectos. Intentos restantes: " + intentosRestantes,
          "error"
        );
      }
    }
  });

  // Boton de "llave de acceso" (opcion de entrar sin password)
  const botonLlaveAcceso = document.getElementById("boton-llave-acceso");
  if (botonLlaveAcceso) {
    const inputLlave = document.getElementById("llave_acceso");
    if (inputLlave) {
      inputLlave.addEventListener("input", function () {
        limpiarCampoInvalido(inputLlave);
      });
    }

    botonLlaveAcceso.addEventListener("click", function () {
      const llave_acceso = inputLlave.value.trim();
      const mensaje = document.getElementById("mensaje-login");

      if (llave_acceso === "") {
        marcarCampoInvalido(inputLlave, "Ingresá tu llave de acceso.");
        mostrarMensaje(mensaje, "Ingresá tu llave de acceso.", "error");
        return;
      }

      limpiarCampoInvalido(inputLlave);

      // Para esta demo, cualquier llave no vacia funciona como acceso rapido
      const sesion = { nombre_cliente: "Invitado", correo_electronico: "" };
      localStorage.setItem("nubex_sesion", JSON.stringify(sesion));
      mostrarMensaje(mensaje, "Acceso concedido con llave. Redirigiendo...", "exito");

      setTimeout(function () {
        window.location.href = "administrar.html";
      }, 1000);
    });
  }
}

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

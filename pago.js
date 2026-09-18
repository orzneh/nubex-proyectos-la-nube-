/* ==========================================================
   PAGO.JS - Logica de pago.html
   ==========================================================
   Requiere que comun.js este cargado ANTES que este archivo
   (usa marcarCampoInvalido, limpiarErroresFormulario,
   activarLimpiezaAlEscribir, mostrarMensaje y activarSuscripcion).
   ========================================================== */

/* --------------------------------------------------------
   5) PAGO (pago.html)
   -------------------------------------------------------- */

function inicializarPago() {
  const formularioPago = document.getElementById("form-pago");
  if (!formularioPago) return;

  // Apagamos la validacion nativa del navegador (los globitos grises)
  // para poder mostrar los avisos con la estetica de NUBEX
  formularioPago.setAttribute("novalidate", "novalidate");
  activarLimpiezaAlEscribir(formularioPago);

  // Mostramos en pantalla que plan se esta pagando
  const planElegido = localStorage.getItem("nubex_plan_elegido") || "Plan Normal";
  const etiquetaPlan = document.getElementById("etiqueta-plan-elegido");
  if (etiquetaPlan) {
    etiquetaPlan.textContent = planElegido;
  }

  // Formateo automatico del vencimiento (MM/AA): el usuario solo escribe
  // numeros y la barra "/" se inserta sola despues del mes, fija, sin que
  // la pueda borrar por separado ni escribir letras u otros caracteres ahi.
  const inputExpiracion = document.getElementById("expir_tarjeta");
  if (inputExpiracion) {
    inputExpiracion.addEventListener("input", function () {
      // Nos quedamos solo con los digitos que escribio, maximo 4 (MMAA)
      const soloNumeros = inputExpiracion.value.replace(/\D/g, "").slice(0, 4);

      if (soloNumeros.length >= 3) {
        // Ya hay mes completo (2 digitos): metemos la barra fija y seguimos con el año
        inputExpiracion.value = soloNumeros.slice(0, 2) + "/" + soloNumeros.slice(2);
      } else {
        inputExpiracion.value = soloNumeros;
      }
    });

    // Si el usuario aprieta Backspace justo despues de la barra, borramos
    // tambien el digito del mes en el mismo golpe (asi no queda la barra
    // "pegada" sin poder borrar el mes que tiene atras)
    inputExpiracion.addEventListener("keydown", function (evento) {
      const cursor = inputExpiracion.selectionStart;
      if (evento.key === "Backspace" && inputExpiracion.value[cursor - 1] === "/") {
        evento.preventDefault();
        inputExpiracion.value =
          inputExpiracion.value.slice(0, cursor - 2) + inputExpiracion.value.slice(cursor);
        inputExpiracion.selectionStart = inputExpiracion.selectionEnd = cursor - 2;
      }
    });
  }

  formularioPago.addEventListener("submit", function (evento) {
    evento.preventDefault();

    limpiarErroresFormulario(formularioPago);

    const inputNombre = document.getElementById("nombre_suscriptor");
    const inputTarjeta = document.getElementById("num_tarjeta");
    const inputExpiracion = document.getElementById("expir_tarjeta");
    const inputCvv = document.getElementById("cvv_tarjeta");
    const inputDireccion = document.getElementById("direc_user");
    const inputPais = document.getElementById("pais");
    const inputProvincia = document.getElementById("provincia");
    const inputCodigoPostal = document.getElementById("codigo_postal");

    const nombre_suscriptor = inputNombre.value.trim();
    const num_tarjeta = inputTarjeta.value.trim();
    const expir_tarjeta = inputExpiracion.value.trim();
    const cvv_tarjeta = inputCvv.value.trim();
    const direc_user = inputDireccion.value.trim();
    const pais = inputPais.value.trim();
    const provincia = inputProvincia.value.trim();
    const codigo_postal = inputCodigoPostal.value.trim();

    const mensaje = document.getElementById("mensaje-pago");

    // Validacion campo por campo, marcando en rojo el que este mal
    let formularioValido = true;

    if (nombre_suscriptor === "") {
      marcarCampoInvalido(inputNombre, "Ingresá el nombre del titular.");
      formularioValido = false;
    }

    if (num_tarjeta === "") {
      marcarCampoInvalido(inputTarjeta, "Ingresá el número de tarjeta.");
      formularioValido = false;
    } else if (num_tarjeta.length !== 16 || isNaN(num_tarjeta)) {
      marcarCampoInvalido(inputTarjeta, "El número de tarjeta debe tener 16 dígitos.");
      formularioValido = false;
    }

    if (expir_tarjeta === "") {
      marcarCampoInvalido(inputExpiracion, "Ingresá el vencimiento.");
      formularioValido = false;
    } else if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(expir_tarjeta)) {
      marcarCampoInvalido(inputExpiracion, "Usá el formato MM/AA.");
      formularioValido = false;
    }

    if (cvv_tarjeta === "") {
      marcarCampoInvalido(inputCvv, "Ingresá el CVV.");
      formularioValido = false;
    } else if (cvv_tarjeta.length !== 3 || isNaN(cvv_tarjeta)) {
      marcarCampoInvalido(inputCvv, "El CVV debe tener 3 dígitos.");
      formularioValido = false;
    }

    if (direc_user === "") {
      marcarCampoInvalido(inputDireccion, "Ingresá tu dirección.");
      formularioValido = false;
    }

    if (pais === "") {
      marcarCampoInvalido(inputPais, "Ingresá tu país.");
      formularioValido = false;
    }

    if (provincia === "") {
      marcarCampoInvalido(inputProvincia, "Ingresá tu provincia.");
      formularioValido = false;
    }

    if (codigo_postal === "") {
      marcarCampoInvalido(inputCodigoPostal, "Ingresá tu código postal.");
      formularioValido = false;
    } else if (codigo_postal.length < 3) {
      marcarCampoInvalido(inputCodigoPostal, "El código postal es demasiado corto.");
      formularioValido = false;
    }

    if (!formularioValido) {
      mostrarMensaje(mensaje, "Revisá los campos marcados en rojo.", "error");
      return;
    }

    // "Guardamos" los datos del suscriptor (en un caso real, esto nunca
    // se guarda como texto plano: aca es solo para fines educativos)
    const datosSuscriptor = { nombre_suscriptor, num_tarjeta, expir_tarjeta, cvv_tarjeta, direc_user, pais, provincia, codigo_postal };
    localStorage.setItem("nubex_datos_suscriptor", JSON.stringify(datosSuscriptor));

    activarSuscripcion(planElegido);

    mostrarMensaje(mensaje, "Pago aprobado. Activando tu suscripcion...", "exito");

    setTimeout(function () {
      window.location.href = "administrar.html";
    }, 1200);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  inicializarPago();
});

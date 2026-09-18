/* ==========================================================
   SOPORTE.JS - Logica de soporte.html
   ==========================================================
   Requiere que comun.js este cargado ANTES que este archivo
   (usa leerLista, guardarLista, marcarCampoInvalido,
   limpiarErroresFormulario, activarLimpiezaAlEscribir y
   mostrarMensaje).
   ========================================================== */

/* --------------------------------------------------------
   7) SOPORTE (soporte.html)
   -------------------------------------------------------- */

function inicializarSoporte() {
  const formularioSoporte = document.getElementById("form-soporte");
  if (!formularioSoporte) return;

  // Apagamos la validacion nativa del navegador (los globitos grises)
  // para poder mostrar los avisos con la estetica de NUBEX
  formularioSoporte.setAttribute("novalidate", "novalidate");
  activarLimpiezaAlEscribir(formularioSoporte);

  formularioSoporte.addEventListener("submit", function (evento) {
    evento.preventDefault();

    limpiarErroresFormulario(formularioSoporte);

    const inputNombre = document.getElementById("nombre_user");
    const inputTelefono = document.getElementById("num_tel_user");
    const inputSolicitud = document.getElementById("solicitud_user");

    const nombre_user = inputNombre.value.trim();
    const num_tel_user = inputTelefono.value.trim();
    const solicitud_user = inputSolicitud.value.trim();

    const mensaje = document.getElementById("mensaje-soporte");

    let formularioValido = true;

    if (nombre_user === "") {
      marcarCampoInvalido(inputNombre, "Ingresá tu nombre.");
      formularioValido = false;
    }

    if (num_tel_user === "") {
      marcarCampoInvalido(inputTelefono, "Ingresá tu número de teléfono.");
      formularioValido = false;
    }

    if (solicitud_user === "") {
      marcarCampoInvalido(inputSolicitud, "Contanos en qué te podemos ayudar.");
      formularioValido = false;
    }

    if (!formularioValido) {
      mostrarMensaje(mensaje, "Revisá los campos marcados en rojo.", "error");
      return;
    }

    // Guardamos la solicitud en una lista de "tickets" de soporte
    const tickets = leerLista("nubex_tickets_soporte");
    tickets.push({
      nombre_user,
      num_tel_user,
      solicitud_user,
      comentario_despues_llamada: "" // se completa despues, cuando el admin llame
    });
    guardarLista("nubex_tickets_soporte", tickets);

    mostrarMensaje(mensaje, "Tu solicitud fue enviada. Te contactaremos pronto.", "exito");
    formularioSoporte.reset();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  inicializarSoporte();
});

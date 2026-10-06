/* ==========================================================
   SOPORTE.JS - Logica de soporte.html
   ==========================================================
   Requiere que comun.js este cargado antes (expone "Nubex").
   ========================================================== */
(function () {
  "use strict";

  const { ListaStorage, ValidadorFormulario, mostrarMensaje, requerirSesion } = Nubex;
  const ticketsStorage = new ListaStorage("nubex_tickets_soporte");

  class PaginaSoporte {
    constructor() {
      this.formulario = document.getElementById("form-soporte");
    }

    init() {
      if (!this.formulario) return;
      if (!requerirSesion()) return;
      this.validador = new ValidadorFormulario(this.formulario);
      this.formulario.addEventListener("submit", (evento) => this.#manejarEnvio(evento));
    }

    #manejarEnvio(evento) {
      evento.preventDefault();
      this.validador.limpiarTodos();

      const inputNombre = document.getElementById("nombre_user");
      const inputTelefono = document.getElementById("num_tel_user");
      const inputSolicitud = document.getElementById("solicitud_user");
      const mensaje = document.getElementById("mensaje-soporte");

      const nombre_user = inputNombre.value.trim();
      const num_tel_user = inputTelefono.value.trim();
      const solicitud_user = inputSolicitud.value.trim();

      let formularioValido = true;

      if (nombre_user === "") {
        this.validador.marcarInvalido(inputNombre, "Ingresá tu nombre.");
        formularioValido = false;
      }

      if (num_tel_user === "") {
        this.validador.marcarInvalido(inputTelefono, "Ingresá tu número de teléfono.");
        formularioValido = false;
      }

      if (solicitud_user === "") {
        this.validador.marcarInvalido(inputSolicitud, "Contanos en qué te podemos ayudar.");
        formularioValido = false;
      }

      if (!formularioValido) {
        mostrarMensaje(mensaje, "Revisá los campos marcados en rojo.", "error");
        return;
      }

      // Guardamos la solicitud en la lista de "tickets" de soporte
      const tickets = ticketsStorage.leer();
      tickets.push({
        nombre_user,
        num_tel_user,
        solicitud_user,
        comentario_despues_llamada: "", // se completa despues, cuando el admin llame
      });
      ticketsStorage.guardar(tickets);

      mostrarMensaje(mensaje, "Tu solicitud fue enviada. Te contactaremos pronto.", "exito");
      this.formulario.reset();
    }
  }

  document.addEventListener("DOMContentLoaded", () => new PaginaSoporte().init());
})();

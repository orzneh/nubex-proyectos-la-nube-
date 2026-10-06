/* ==========================================================
   SOPORTE.JS - Logica de soporte.html
   ==========================================================
   Requiere que comun.js este cargado antes (expone "Nubex").
   ========================================================== */
(function () {
  "use strict";

  const { ListaStorage, Sesion, ValidadorFormulario, Reglas, EsperaEntreEnvios, formatearTiempoRestante, mostrarMensaje, requerirSesion } = Nubex;
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
      const inputTipo = document.getElementById("tipo_consulta");
      const inputTelefono = document.getElementById("num_tel_user");
      const inputSolicitud = document.getElementById("solicitud_user");
      const mensaje = document.getElementById("mensaje-soporte");

      // Decision "enviar consultas": si ya envio una -> Regla 17 (rechazar por 6 horas)
      const identidad = Sesion.identidad() || "invitado";
      const espera = new EsperaEntreEnvios("soporte", identidad);
      const restante = espera.milisRestantes();
      if (restante > 0) {
        mostrarMensaje(
          mensaje,
          `Ya enviaste una consulta. Podés enviar otra dentro de ${formatearTiempoRestante(restante)}.`,
          "error"
        );
        return;
      }

      const tipo_consulta = inputTipo.value;
      const nombre_user = inputNombre.value.trim();
      const num_tel_user = inputTelefono.value.trim();
      const solicitud_user = inputSolicitud.value.trim();

      let formularioValido = true;

      if (nombre_user === "") {
        this.validador.marcarInvalido(inputNombre, "Ingresá tu nombre.");
        formularioValido = false;
      }

      if (tipo_consulta === "") {
        this.validador.marcarInvalido(inputTipo, "Elegí si es una pregunta o un reporte de error.");
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

      // Evento "revisar mensaje": si es una pregunta (Regla 14) o un reporte
      // de error (Regla 15) se acepta; si es irrelevante -> Regla 16 (rechazar)
      if (!Reglas.esConsultaRelevante(solicitud_user)) {
        this.validador.marcarInvalido(inputSolicitud, "Describí tu pregunta o el problema con un poco más de detalle.");
        mostrarMensaje(mensaje, "Tu mensaje no parece una consulta ni un reporte de error, así que no fue enviado.", "error");
        return;
      }

      // Guardamos la solicitud en la lista de "tickets" de soporte
      const tickets = ticketsStorage.leer();
      tickets.push({
        usuario: identidad,
        tipo_consulta, // "pregunta" (regla 14) o "error" (regla 15)
        fecha: new Date().toISOString(),
        nombre_user,
        num_tel_user,
        solicitud_user,
        comentario_despues_llamada: "", // se completa despues, cuando el admin llame
      });
      ticketsStorage.guardar(tickets);
      espera.registrar();

      mostrarMensaje(mensaje, "Tu solicitud fue enviada. Te contactaremos pronto.", "exito");
      this.formulario.reset();
    }
  }

  document.addEventListener("DOMContentLoaded", () => new PaginaSoporte().init());
})();


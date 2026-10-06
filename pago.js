/* ==========================================================
   PAGO.JS - Logica de pago.html
   ==========================================================
   Requiere que comun.js este cargado antes (expone "Nubex").
   ========================================================== */
(function () {
  "use strict";

  const { ValidadorFormulario, Espacio, Reglas, mostrarMensaje, requerirSesion } = Nubex;

  class PaginaPago {
    constructor() {
      this.formulario = document.getElementById("form-pago");
    }

    init() {
      if (!this.formulario) return;
      if (!requerirSesion()) return;

      this.validador = new ValidadorFormulario(this.formulario);
      this.planElegido = localStorage.getItem("nubex_plan_elegido") || "Plan Normal";

      // Regla 3: el plan gratuito se concede directo, no pasa por el pago
      if (this.planElegido === "Plan Gratuito") {
        Espacio.activarSuscripcion(this.planElegido);
        window.location.replace("administrar.html");
        return;
      }

      const etiquetaPlan = document.getElementById("etiqueta-plan-elegido");
      if (etiquetaPlan) etiquetaPlan.textContent = this.planElegido;

      this.#inicializarFormatoVencimiento();
      this.formulario.addEventListener("submit", (evento) => this.#manejarEnvio(evento));
    }

    // Formateo automatico del vencimiento (MM/AA): el usuario solo escribe
    // numeros y la barra "/" se inserta sola despues del mes.
    #inicializarFormatoVencimiento() {
      const inputExpiracion = document.getElementById("expir_tarjeta");
      if (!inputExpiracion) return;

      inputExpiracion.addEventListener("input", () => {
        const soloNumeros = inputExpiracion.value.replace(/\D/g, "").slice(0, 4);
        inputExpiracion.value =
          soloNumeros.length >= 3 ? `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2)}` : soloNumeros;
      });

      // Si el usuario aprieta Backspace justo despues de la barra, se borra
      // tambien el digito del mes en el mismo golpe
      inputExpiracion.addEventListener("keydown", (evento) => {
        const cursor = inputExpiracion.selectionStart;
        if (evento.key === "Backspace" && inputExpiracion.value[cursor - 1] === "/") {
          evento.preventDefault();
          inputExpiracion.value = inputExpiracion.value.slice(0, cursor - 2) + inputExpiracion.value.slice(cursor);
          inputExpiracion.selectionStart = inputExpiracion.selectionEnd = cursor - 2;
        }
      });
    }

    #manejarEnvio(evento) {
      evento.preventDefault();
      this.validador.limpiarTodos();

      const campos = {
        nombre_suscriptor: document.getElementById("nombre_suscriptor"),
        num_tarjeta: document.getElementById("num_tarjeta"),
        expir_tarjeta: document.getElementById("expir_tarjeta"),
        cvv_tarjeta: document.getElementById("cvv_tarjeta"),
        direc_user: document.getElementById("direc_user"),
        pais: document.getElementById("pais"),
        provincia: document.getElementById("provincia"),
        codigo_postal: document.getElementById("codigo_postal"),
      };

      const valores = Object.fromEntries(
        Object.entries(campos).map(([clave, input]) => [clave, input.value.trim()])
      );

      const mensaje = document.getElementById("mensaje-pago");
      let formularioValido = true;

      const marcarError = (campo, texto) => {
        this.validador.marcarInvalido(campos[campo], texto);
        formularioValido = false;
      };

      if (valores.nombre_suscriptor === "") marcarError("nombre_suscriptor", "Ingresá el nombre del titular.");

      if (valores.num_tarjeta === "") {
        marcarError("num_tarjeta", "Ingresá el número de tarjeta.");
      } else if (valores.num_tarjeta.length !== 16 || isNaN(valores.num_tarjeta)) {
        marcarError("num_tarjeta", "El número de tarjeta debe tener 16 dígitos.");
      }

      if (valores.expir_tarjeta === "") {
        marcarError("expir_tarjeta", "Ingresá el vencimiento.");
      } else if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(valores.expir_tarjeta)) {
        marcarError("expir_tarjeta", "Usá el formato MM/AA.");
      } else if (!Reglas.vencimientoVigente(valores.expir_tarjeta)) {
        marcarError("expir_tarjeta", "La tarjeta está vencida.");
      }

      if (valores.cvv_tarjeta === "") {
        marcarError("cvv_tarjeta", "Ingresá el CVV.");
      } else if (valores.cvv_tarjeta.length !== 3 || isNaN(valores.cvv_tarjeta)) {
        marcarError("cvv_tarjeta", "El CVV debe tener 3 dígitos.");
      }

      if (valores.direc_user === "") marcarError("direc_user", "Ingresá tu dirección.");
      if (valores.pais === "") marcarError("pais", "Ingresá tu país.");
      if (valores.provincia === "") marcarError("provincia", "Ingresá tu provincia.");

      if (valores.codigo_postal === "") {
        marcarError("codigo_postal", "Ingresá tu código postal.");
      } else if (valores.codigo_postal.length < 3) {
        marcarError("codigo_postal", "El código postal es demasiado corto.");
      }

      // Evento "corroborar datos de la tarjeta": si son incorrectos -> Regla 4 (rechazar)
      if (!formularioValido) {
        mostrarMensaje(mensaje, "Pago rechazado: revisá los campos marcados en rojo.", "error");
        return;
      }

      // Evento "corroborar si la tarjeta esta habilitada":
      // no lo esta -> Regla 5 (rechazar); si lo esta -> Regla 6 (aceptar)
      if (!Reglas.tarjetaHabilitada(valores.num_tarjeta)) {
        this.validador.marcarInvalido(campos.num_tarjeta, "Esta tarjeta no está habilitada.");
        mostrarMensaje(mensaje, "Pago rechazado: la tarjeta no está habilitada para operar. Probá con otra.", "error");
        return;
      }

      // "Guardamos" los datos del suscriptor (en un caso real, esto nunca se
      // guarda en texto plano: aca es solo para fines educativos)
      localStorage.setItem("nubex_datos_suscriptor", JSON.stringify(valores));

      Espacio.activarSuscripcion(this.planElegido);
      mostrarMensaje(mensaje, "Pago aprobado. Activando tu suscripción...", "exito");

      setTimeout(() => {
        window.location.href = "administrar.html";
      }, 1200);
    }
  }

  document.addEventListener("DOMContentLoaded", () => new PaginaPago().init());
})();


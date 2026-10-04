/* ==========================================================
   COMPRAR.JS - Logica de comprar.html
   ==========================================================
   Requiere que comun.js este cargado antes (expone "Nubex").
   ========================================================== */
(function () {
  "use strict";

  const { Espacio } = Nubex;

  class PaginaComprar {
    constructor() {
      this.botonesPlan = document.querySelectorAll(".boton-elegir-plan");
    }

    init() {
      if (this.botonesPlan.length === 0) return;
      this.botonesPlan.forEach((boton) => {
        boton.addEventListener("click", () => this.#elegirPlan(boton));
      });
    }

    #elegirPlan(boton) {
      // Cada boton tiene un atributo data-plan con el nombre del plan
      const plan = boton.getAttribute("data-plan");
      localStorage.setItem("nubex_plan_elegido", plan);

      if (plan === "Plan Gratuito") {
        // El plan gratuito no necesita pago, se activa directo
        Espacio.activarSuscripcion(plan);
        window.location.href = "administrar.html";
      } else {
        window.location.href = "pago.html";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => new PaginaComprar().init());
})();

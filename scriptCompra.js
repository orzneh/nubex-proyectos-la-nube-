/* --------------------------------------------------------
   4) COMPRAR PLAN (comprar.html)
   -------------------------------------------------------- */

function inicializarComprar() {
  const botonesPlan = document.querySelectorAll(".boton-elegir-plan");
  if (botonesPlan.length === 0) return;

  botonesPlan.forEach(function (boton) {
    boton.addEventListener("click", function () {
      // Cada boton tiene un atributo data-plan con el nombre del plan
      const suscripcion = boton.getAttribute("data-plan");

      // Guardamos el plan elegido para usarlo en la pagina de pago
      localStorage.setItem("nubex_plan_elegido", suscripcion);

      if (suscripcion === "Plan Gratuito") {
        // El plan gratuito no necesita pago, activamos directo
        activarSuscripcion(suscripcion);
        window.location.href = "administrar.html";
      } else {
        window.location.href = "pago.html";
      }
    });
  });
}

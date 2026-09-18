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

// ⭐ NUEVO: deja el campo con SOLO letras, espacios, tildes y ñ. Cualquier
// numero o simbolo que se escriba (o se pegue) se descarta en el momento.
function permitirSoloLetras(input) {
  if (!input) return;
  input.addEventListener("input", function () {
    const valorLimpio = input.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
    if (valorLimpio !== input.value) {
      input.value = valorLimpio;
    }
  });
}

// ⭐ NUEVO: deja el campo con SOLO digitos (0-9), hasta un maximo de
// caracteres. Cualquier letra o simbolo que se escriba (o se pegue) se
// descarta en el momento.
function permitirSoloNumeros(input, maximoDigitos) {
  if (!input) return;
  input.addEventListener("input", function () {
    const valorLimpio = input.value.replace(/\D/g, "").slice(0, maximoDigitos);
    if (valorLimpio !== input.value) {
      input.value = valorLimpio;
    }
  });
}

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

  // ⭐ NUEVO: solo dejamos escribir letras (y espacios, tildes, ñ) en los
  // campos que son de texto libre pero NO deberian aceptar numeros ni
  // simbolos: nombre del titular, pais y provincia.
  permitirSoloLetras(document.getElementById("nombre_suscriptor"));
  permitirSoloLetras(document.getElementById("pais"));
  permitirSoloLetras(document.getElementById("provincia"));

  // ⭐ NUEVO: el numero de tarjeta y el CVV solo aceptan digitos mientras
  // se escribe (antes se podian escribir letras y recien se avisaba al
  // enviar el formulario).
  permitirSoloNumeros(document.getElementById("num_tarjeta"), 16);
  permitirSoloNumeros(document.getElementById("cvv_tarjeta"), 3);

  // direc_user y direc2_user quedan como texto libre a proposito: una
  // direccion puede tener numeros, letras y simbolos (calle, altura,
  // piso, depto, etc), asi que no se les aplica ningun filtro.

  // Formateo y validacion en tiempo real del vencimiento (MM/AA): el
  // usuario solo puede escribir numeros, y ademas el campo NO deja
  // pasar meses que no existen (solo 01 a 12). Si escribe un mes de
  // un solo digito mayor a 1 (ej: "7"), se autocompleta como "07".
  const inputExpiracion = document.getElementById("expir_tarjeta");
  if (inputExpiracion) {
    inputExpiracion.addEventListener("input", function () {
      const numerosEscritos = inputExpiracion.value.replace(/\D/g, "");

      // Vamos construyendo el valor digito por digito, sin dejar pasar
      // ningun mes invalido, hasta un maximo de 4 digitos (MM + AA)
      let digitosLimpios = "";

      for (let i = 0; i < numerosEscritos.length && digitosLimpios.length < 4; i++) {
        const digito = numerosEscritos[i];

        if (digitosLimpios.length === 0) {
          // Primer digito del mes
          if (digito === "0" || digito === "1") {
            digitosLimpios += digito;
          } else {
            // Meses de un solo digito (2 al 9): los autocompletamos con
            // un 0 adelante (ej: escribe "7" y queda "07")
            digitosLimpios += "0" + digito;
          }
        } else if (digitosLimpios.length === 1) {
          const primerDigitoMes = digitosLimpios[0];
          if (primerDigitoMes === "0") {
            // Mes 01-09: el segundo digito no puede ser 0 (no existe el mes 00)
            if (digito !== "0") {
              digitosLimpios += digito;
            }
          } else {
            // primerDigitoMes === "1": solo existen los meses 10, 11 y 12
            if (digito === "0" || digito === "1" || digito === "2") {
              digitosLimpios += digito;
            }
          }
        } else {
          // Los dos digitos del año: cualquier numero del 0 al 9 es valido aca
          digitosLimpios += digito;
        }
      }

      if (digitosLimpios.length >= 3) {
        // Ya hay mes completo (2 digitos): metemos la barra fija y seguimos con el año
        inputExpiracion.value = digitosLimpios.slice(0, 2) + "/" + digitosLimpios.slice(2);
      } else {
        inputExpiracion.value = digitosLimpios;
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
    } else {
      // ⭐ NUEVO: aunque el formato MM/AA este bien escrito, chequeamos
      // que sea una fecha que tenga sentido: ni una tarjeta ya vencida,
      // ni un año demasiado lejano en el futuro.
      const partesVencimiento = expir_tarjeta.split("/");
      const mesTarjeta = parseInt(partesVencimiento[0], 10);
      const anioTarjeta = 2000 + parseInt(partesVencimiento[1], 10);

      const fechaActual = new Date();
      const anioActual = fechaActual.getFullYear();
      const mesActual = fechaActual.getMonth() + 1;

      if (anioTarjeta < anioActual || (anioTarjeta === anioActual && mesTarjeta < mesActual)) {
        marcarCampoInvalido(inputExpiracion, "La tarjeta está vencida.");
        formularioValido = false;
      } else if (anioTarjeta > anioActual + 20) {
        marcarCampoInvalido(inputExpiracion, "El año de vencimiento no es válido.");
        formularioValido = false;
      }
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

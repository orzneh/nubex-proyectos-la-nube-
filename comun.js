/* ==========================================================
   COMUN.JS - Codigo compartido por TODAS las paginas de NUBEX
   ==========================================================
   Antes todo esto vivia mezclado dentro de script.js. Se separo
   en un archivo por pagina para que sea mas facil de mantener,
   pero las funciones y constantes de este archivo las usa mas
   de una pagina (por eso quedan aca, en un archivo comun que
   se carga SIEMPRE, antes que el archivo propio de cada pagina).

   Este archivo debe ir cargado en el <head> o <body> de cada
   HTML ANTES que el script propio de esa pagina, por ejemplo:

     <script src="comun.js"></script>
     <script src="login.js"></script>
   ========================================================== */

/* --------------------------------------------------------
   1) CONSTANTES Y "BASE DE DATOS" EN localStorage
   -------------------------------------------------------- */

// Guarda cual seccion del panel "Administrar" esta activa ahora mismo
// (recientes, cargas, papelera, configuracion, ayuda o almacenamiento).
// Se usa para poder "refrescar" la vista actual sin saltar a otra seccion.
let seccionActual = "recientes";

// Numero maximo de intentos de acceso permitidos (num_intentos)
const MAXIMO_INTENTOS = 3;

// Cuanto tiempo queda bloqueada una cuenta despues de superar el
// maximo de intentos fallidos (en milisegundos). Pasado este tiempo
// se desbloquea sola.
const TIEMPO_BLOQUEO_MS = 30000; // 30 segundos

// Espacio total disponible segun el plan contratado (en GB).
// Estas cantidades vienen de la pagina "Comprar".
const ESPACIO_POR_PLAN = {
  "Plan Gratuito": 500,
  "Plan Normal": 1000,
  "Plan Premium": 5000 // "ilimitado" lo simulamos con un numero grande
};

// Funcion chica que lee una lista guardada en localStorage.
// Si todavia no existe, devuelve una lista vacia [].
function leerLista(nombreClave) {
  const datosGuardados = localStorage.getItem(nombreClave);
  if (datosGuardados === null) {
    return [];
  }
  return JSON.parse(datosGuardados);
}

// Funcion chica que guarda una lista en localStorage.
function guardarLista(nombreClave, lista) {
  localStorage.setItem(nombreClave, JSON.stringify(lista));
}

// Lee el estado de intentos fallidos de UNA cuenta puntual (identificada
// por su correo en minuscula). Si no existe todavia, devuelve un estado
// "limpio" con 0 intentos y sin bloqueo.
function leerEstadoIntentos(correoClave) {
  const datos = localStorage.getItem("nubex_intentos_" + correoClave);
  if (datos === null) {
    return { num_intentos: 0, bloqueadoHasta: 0 };
  }
  return JSON.parse(datos);
}

// Guarda el estado de intentos fallidos de una cuenta puntual.
function guardarEstadoIntentos(correoClave, estado) {
  localStorage.setItem("nubex_intentos_" + correoClave, JSON.stringify(estado));
}

/* --------------------------------------------------------
   1.1) VALIDACION DE FORMULARIOS CON LA ESTETICA DE NUBEX
   -------------------------------------------------------- 
   Antes, cuando dejabas un campo obligatorio vacio o mal
   cargado, el navegador mostraba su propio globito gris de
   aviso ("Complete este campo", "Please fill out this
   field"), que no tiene nada que ver con el estilo del
   sitio. Estas funciones lo reemplazan: marcan el campo en
   rojo (el mismo rojo que ya usan los .mensaje.error) y
   escriben el aviso justo abajo del campo, en un texto
   chico con la misma tipografia del resto de la pagina. */

// Marca un campo como invalido y le escribe un mensajito abajo
function marcarCampoInvalido(input, texto) {
  if (!input) return;
  input.classList.add("campo-invalido");

  let avisoCampo = input.parentElement.querySelector(".error-campo");
  if (!avisoCampo) {
    avisoCampo = document.createElement("div");
    avisoCampo.className = "error-campo";
    input.insertAdjacentElement("afterend", avisoCampo);
  }
  avisoCampo.textContent = texto;
}

// Le saca la marca de invalido a un campo puntual (y borra su aviso)
function limpiarCampoInvalido(input) {
  if (!input) return;
  input.classList.remove("campo-invalido");
  const avisoCampo = input.parentElement.querySelector(".error-campo");
  if (avisoCampo) avisoCampo.remove();
}

// Limpia TODOS los avisos de un formulario (se usa al principio de
// cada intento de envio, para no ir acumulando avisos viejos)
function limpiarErroresFormulario(formulario) {
  formulario.querySelectorAll(".campo-invalido").forEach(function (campo) {
    campo.classList.remove("campo-invalido");
  });
  formulario.querySelectorAll(".error-campo").forEach(function (aviso) {
    aviso.remove();
  });
}

// Hace que el aviso de un campo desaparezca apenas el usuario empieza
// a corregirlo (mejor que dejarlo marcado en rojo hasta el proximo envio)
function activarLimpiezaAlEscribir(formulario) {
  formulario.querySelectorAll("input, textarea, select").forEach(function (campo) {
    campo.addEventListener("input", function () {
      limpiarCampoInvalido(campo);
    });
  });
}

// Valida que un texto tenga forma de correo electronico (chequeo
// simple, solo para mostrar un aviso mas claro que "campo invalido")
function esCorreoValido(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);
}

/* --------------------------------------------------------
   2) MENSAJES DE EXITO / ERROR (usado por todos los formularios)
   -------------------------------------------------------- */

function mostrarMensaje(elementoMensaje, texto, tipo) {
  if (!elementoMensaje) return;
  elementoMensaje.textContent = texto;
  elementoMensaje.className = "mensaje mostrar " + tipo; // tipo = "exito" o "error"
}

/* --------------------------------------------------------
   3) ESPACIO / ARCHIVOS / SUSCRIPCION (usado por comprar, pago
      y administrar)
   -------------------------------------------------------- */

// Devuelve la extension de un archivo en mayusculas (ej: "informe.pdf" -> "PDF")
function obtenerExtension(nombreArchivo) {
  const partes = nombreArchivo.split(".");
  if (partes.length < 2) return "ARCHIVO";
  return partes[partes.length - 1].toUpperCase();
}

// Funcion que guarda la suscripcion activa y recalcula el espacio libre
function activarSuscripcion(suscripcion) {
  localStorage.setItem("nubex_suscripcion", suscripcion);
  recalcularEspacio();
}


// Recalcula espacio_ocup y espacio_libre segun los archivos guardados
function recalcularEspacio() {
  const archivos_subidos = leerLista("nubex_archivos");
  const suscripcion = localStorage.getItem("nubex_suscripcion") || "Plan Gratuito";

  // Sumamos el tamaño de todos los archivos subidos
  let espacio_ocup = 0;
  archivos_subidos.forEach(function (archivo) {
    espacio_ocup = espacio_ocup + archivo.tamano;
  });

  const espacioTotal = ESPACIO_POR_PLAN[suscripcion] || ESPACIO_POR_PLAN["Plan Gratuito"];
  const espacio_libre = Math.max(0, espacioTotal - espacio_ocup);

  localStorage.setItem("nubex_espacio_ocup", String(espacio_ocup));
  localStorage.setItem("nubex_espacio_libre", String(espacio_libre));

  actualizarBarraEspacio();
}

// Actualiza la barra visual de espacio usado (si esta en la pagina)
function actualizarBarraEspacio() {
  const relleno = document.getElementById("barra-espacio-relleno");
  const texto = document.getElementById("texto-espacio");
  if (!relleno || !texto) return;

  const suscripcion = localStorage.getItem("nubex_suscripcion") || "Plan Gratuito";
  const espacioTotal = ESPACIO_POR_PLAN[suscripcion] || ESPACIO_POR_PLAN["Plan Gratuito"];
  const espacio_ocup = parseInt(localStorage.getItem("nubex_espacio_ocup") || "0");

  const porcentaje = Math.min(100, Math.round((espacio_ocup / espacioTotal) * 100));
  relleno.style.width = porcentaje + "%";
  texto.textContent = espacio_ocup + " GB usados de " + espacioTotal + " GB (" + suscripcion + ")";
}

/* --------------------------------------------------------
   4) LIMPIEZA DE MENSAJES VIEJOS AL VOLVER A LA PAGINA
   -------------------------------------------------------- 
   Bug: si el usuario envia el formulario (aparece el cartel de
   "exito" o "error") y despues navega a otra pagina y vuelve para
   atras con el boton "Atras" del navegador, el navegador NO vuelve
   a cargar la pagina de cero: la restaura tal cual quedo desde una
   memoria interna (bfcache). Como es una restauracion, el evento
   "DOMContentLoaded" no se dispara de nuevo, entonces nada limpia
   el cartel viejo y se queda pegado ahi para siempre.

   El evento "pageshow" SI se dispara siempre, tanto en una carga
   normal como en una restauracion desde bfcache, asi que lo usamos
   para ocultar cualquier mensaje y aviso de campo que haya quedado
   de una visita anterior. */
window.addEventListener("pageshow", function () {
  document.querySelectorAll(".mensaje").forEach(function (elementoMensaje) {
    elementoMensaje.textContent = "";
    elementoMensaje.className = "mensaje"; // le sacamos "mostrar", "exito" y "error"
  });

  document.querySelectorAll(".campo-invalido").forEach(function (campo) {
    campo.classList.remove("campo-invalido");
  });

  document.querySelectorAll(".error-campo").forEach(function (aviso) {
    aviso.remove();
  });
});

/* ==========================================================
   COMUN.JS - Codigo compartido por TODAS las paginas de NUBEX
   ==========================================================
   Este archivo expone un unico objeto global, "Nubex", con
   todas las clases y funciones que comparten las demas paginas
   (ver abajo el objeto que arma el "return"). Todo lo demas
   vive ENCERRADO dentro de esta funcion y no se filtra afuera,
   asi que ningun otro archivo puede chocar por accidente con un
   nombre de variable que use aca adentro.

   Debe cargarse ANTES que el script propio de cada pagina:

     <script src="comun.js"></script>
     <script src="login.js"></script>
*/
const Nubex = (function () {
  "use strict";

  /* --------------------------------------------------------
     CONFIGURACION / CONSTANTES
     -------------------------------------------------------- */
  const CONFIG = Object.freeze({
    MAXIMO_INTENTOS: 3,
    TIEMPO_BLOQUEO_MS: 30000, // 30 segundos
    ESPACIO_POR_PLAN: {
      "Plan Gratuito": 500,
      "Plan Normal": 1000,
      "Plan Premium": 5000, // "ilimitado" simulado con un numero grande
    },
  });

  /* --------------------------------------------------------
     ListaStorage - una lista guardada en localStorage como JSON
     --------------------------------------------------------
     Antes, si por algun motivo el JSON guardado quedaba corrupto
     (por ejemplo, el navegador se quedo sin espacio a mitad de un
     guardado, o alguien edito localStorage a mano desde las
     herramientas de desarrollador), un simple JSON.parse() roto
     tiraba abajo TODO el script de la pagina sin ningun aviso, y
     el sitio "andaba mal" sin explicacion aparente. Ahora leer()
     y guardar() nunca revientan: si algo sale mal, avisan por
     consola y siguen funcionando con una lista vacia en vez de
     romper el resto del sitio. */
  class ListaStorage {
    constructor(clave) {
      this.clave = clave;
    }

    leer() {
      try {
        const guardado = localStorage.getItem(this.clave);
        if (guardado === null) return [];
        const datos = JSON.parse(guardado);
        return Array.isArray(datos) ? datos : [];
      } catch (error) {
        console.warn(`NUBEX: no se pudo leer "${this.clave}" de localStorage, se usa una lista vacia.`, error);
        return [];
      }
    }

    guardar(lista) {
      try {
        localStorage.setItem(this.clave, JSON.stringify(lista));
        return true;
      } catch (error) {
        console.warn(`NUBEX: no se pudo guardar "${this.clave}" en localStorage.`, error);
        return false;
      }
    }
  }

  /* --------------------------------------------------------
     Sesion - sesion del cliente logueado (nubex_sesion)
     -------------------------------------------------------- */
  class Sesion {
    static obtener() {
      try {
        const datos = localStorage.getItem("nubex_sesion");
        return datos ? JSON.parse(datos) : null;
      } catch (error) {
        console.warn("NUBEX: la sesion guardada estaba corrupta, se trata como si no hubiera sesion.", error);
        return null;
      }
    }

    static guardar(sesion) {
      try {
        localStorage.setItem("nubex_sesion", JSON.stringify(sesion));
        return true;
      } catch (error) {
        console.warn("NUBEX: no se pudo guardar la sesion.", error);
        return false;
      }
    }

    static cerrar() {
      localStorage.removeItem("nubex_sesion");
    }
  }

  /* --------------------------------------------------------
     ControlIntentos - intentos fallidos de login, por cuenta
     -------------------------------------------------------- */
  class ControlIntentos {
    constructor(correoClave) {
      this.correoClave = correoClave;
      this.clave = "nubex_intentos_" + correoClave;
    }

    #leer() {
      try {
        const datos = localStorage.getItem(this.clave);
        return datos ? JSON.parse(datos) : { num_intentos: 0, bloqueadoHasta: 0 };
      } catch (error) {
        console.warn("NUBEX: estado de intentos corrupto, se reinicia.", error);
        return { num_intentos: 0, bloqueadoHasta: 0 };
      }
    }

    #guardar(estado) {
      try {
        localStorage.setItem(this.clave, JSON.stringify(estado));
      } catch (error) {
        console.warn("NUBEX: no se pudo guardar el estado de intentos.", error);
      }
    }

    // Devuelve cuantos segundos de bloqueo quedan (0 si no esta bloqueada)
    segundosDeBloqueo() {
      const estado = this.#leer();
      const ahora = Date.now();
      if (estado.bloqueadoHasta && ahora < estado.bloqueadoHasta) {
        return Math.ceil((estado.bloqueadoHasta - ahora) / 1000);
      }
      return 0;
    }

    // Registra un intento fallido. Devuelve cuantos intentos quedan,
    // o null si con este intento la cuenta quedo bloqueada.
    registrarFallo() {
      const estado = this.#leer();
      const ahora = Date.now();

      // Si el bloqueo anterior ya vencio, arrancamos de cero
      if (estado.bloqueadoHasta && ahora >= estado.bloqueadoHasta) {
        estado.num_intentos = 0;
        estado.bloqueadoHasta = 0;
      }

      estado.num_intentos += 1;

      if (estado.num_intentos >= CONFIG.MAXIMO_INTENTOS) {
        estado.bloqueadoHasta = ahora + CONFIG.TIEMPO_BLOQUEO_MS;
        this.#guardar(estado);
        return null;
      }

      this.#guardar(estado);
      return CONFIG.MAXIMO_INTENTOS - estado.num_intentos;
    }

    reiniciar() {
      this.#guardar({ num_intentos: 0, bloqueadoHasta: 0 });
    }
  }

  /* --------------------------------------------------------
     ValidadorFormulario - avisos de campo invalido con la
     estetica de NUBEX, en vez del globito nativo del navegador
     -------------------------------------------------------- */
  class ValidadorFormulario {
    constructor(formulario) {
      this.formulario = formulario;
      // Apagamos la validacion nativa del navegador para poder
      // mostrar los avisos con la estetica propia del sitio
      this.formulario.setAttribute("novalidate", "novalidate");
      this.#activarLimpiezaAlEscribir();
    }

    #activarLimpiezaAlEscribir() {
      this.formulario.querySelectorAll("input, textarea, select").forEach((campo) => {
        campo.addEventListener("input", () => this.limpiarInvalido(campo));
      });
    }

    marcarInvalido(input, texto) {
      if (!input) return;
      input.classList.add("campo-invalido");

      let aviso = input.parentElement.querySelector(".error-campo");
      if (!aviso) {
        aviso = document.createElement("div");
        aviso.className = "error-campo";
        input.insertAdjacentElement("afterend", aviso);
      }
      aviso.textContent = texto;
    }

    limpiarInvalido(input) {
      if (!input) return;
      input.classList.remove("campo-invalido");
      const aviso = input.parentElement.querySelector(".error-campo");
      if (aviso) aviso.remove();
    }

    limpiarTodos() {
      this.formulario.querySelectorAll(".campo-invalido").forEach((campo) => {
        campo.classList.remove("campo-invalido");
      });
      this.formulario.querySelectorAll(".error-campo").forEach((aviso) => aviso.remove());
    }
  }

  // Validacion simple de forma de correo electronico
  function esCorreoValido(texto) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);
  }

  /* --------------------------------------------------------
     Mensajes de exito / error (usado por todos los formularios)
     -------------------------------------------------------- */
  function mostrarMensaje(elementoMensaje, texto, tipo) {
    if (!elementoMensaje) return;
    elementoMensaje.textContent = texto;
    elementoMensaje.className = "mensaje mostrar " + tipo; // tipo = "exito" o "error"
  }

  /* --------------------------------------------------------
     Espacio / archivos / suscripcion
     -------------------------------------------------------- */

  // Extension de un archivo en mayusculas (ej: "informe.pdf" -> "PDF")
  function obtenerExtension(nombreArchivo) {
    const partes = nombreArchivo.split(".");
    if (partes.length < 2) return "ARCHIVO";
    return partes[partes.length - 1].toUpperCase();
  }

  const BYTES_POR_GB = 1024 ** 3;

  // Convierte una cantidad de bytes en un texto legible, eligiendo
  // la unidad que mas sentido tenga (B, KB, MB o GB). Antes todo
  // archivo subido se redondeaba a un minimo de "1 GB" fijo, sin
  // importar su tamaño real; ahora se guarda y se muestra el
  // tamaño verdadero del archivo.
  function formatearTamano(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes >= BYTES_POR_GB) return (bytes / BYTES_POR_GB).toFixed(2) + " GB";
    if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
    return Math.round(bytes) + " B";
  }

  const archivosStorage = new ListaStorage("nubex_archivos");

  class Espacio {
    // Tamaño total del plan, en GB (para mostrarlo tal cual en pantalla)
    static totalDelPlanGB(plan) {
      return CONFIG.ESPACIO_POR_PLAN[plan] || CONFIG.ESPACIO_POR_PLAN["Plan Gratuito"];
    }

    // Lo mismo, pero en bytes (para comparar contra el tamaño real de los archivos)
    static totalDelPlanBytes(plan) {
      return Espacio.totalDelPlanGB(plan) * BYTES_POR_GB;
    }

    static planActual() {
      return localStorage.getItem("nubex_suscripcion") || "Plan Gratuito";
    }

    // Suma el tamaño REAL (en bytes) de todos los archivos guardados
    static ocupadoBytes() {
      return archivosStorage.leer().reduce((total, archivo) => total + (archivo.tamanoBytes || 0), 0);
    }

    // Guarda la suscripcion activa y recalcula el espacio libre
    static activarSuscripcion(plan) {
      localStorage.setItem("nubex_suscripcion", plan);
      Espacio.recalcular();
    }

    // Recalcula espacio_ocup / espacio_libre (en bytes) segun los
    // archivos guardados, y refresca la barra visual si esta en la pagina
    static recalcular() {
      const plan = Espacio.planActual();
      const ocupado = Espacio.ocupadoBytes();
      const total = Espacio.totalDelPlanBytes(plan);
      const libre = Math.max(0, total - ocupado);

      localStorage.setItem("nubex_espacio_ocup_bytes", String(ocupado));
      localStorage.setItem("nubex_espacio_libre_bytes", String(libre));

      Espacio.actualizarBarra();
    }

    // Actualiza la barra visual de espacio usado (si esta en la pagina)
    static actualizarBarra() {
      const relleno = document.getElementById("barra-espacio-relleno");
      const texto = document.getElementById("texto-espacio");
      if (!relleno || !texto) return;

      const plan = Espacio.planActual();
      const totalGB = Espacio.totalDelPlanGB(plan);
      const totalBytes = Espacio.totalDelPlanBytes(plan);
      const ocupado = parseInt(localStorage.getItem("nubex_espacio_ocup_bytes") || "0", 10);
      const porcentaje = totalBytes > 0 ? Math.min(100, (ocupado / totalBytes) * 100) : 0;

      relleno.style.width = porcentaje + "%";
      texto.textContent = `${formatearTamano(ocupado)} usados de ${totalGB} GB (${plan})`;
    }
  }

  /* --------------------------------------------------------
     Link "Cuenta" de la navbar: siempre apuntaba a login.html,
     sin importar si ya habia una sesion iniciada. Esto hace que
     si ya iniciaste sesion, apretar "Cuenta" te mande directo al
     panel de Administrar en vez de pedirte el login de nuevo, y
     ademas muestra tu nombre en vez del texto generico "Cuenta".
     -------------------------------------------------------- */
  function inicializarNavbarCuenta() {
    const enlace = document.querySelector(".navbar-cuenta");
    const sesion = Sesion.obtener();
    if (!enlace || !sesion) return; // sin sesion, se deja el link a login.html tal cual esta

    enlace.setAttribute("href", "administrar.html");

    const etiqueta = enlace.querySelector(".etiqueta-cuenta, #etiqueta-nombre-cliente");
    if (etiqueta) etiqueta.textContent = sesion.nombre_cliente || "Cuenta";

    if (sesion.avatar) {
      const icono = enlace.querySelector(".icono-usuario");
      if (icono) icono.textContent = sesion.avatar;
    }
  }

  document.addEventListener("DOMContentLoaded", inicializarNavbarCuenta);

  /* --------------------------------------------------------
     Limpieza de mensajes viejos al volver a la pagina
     --------------------------------------------------------
     Si el usuario envia un formulario (aparece el cartel de
     "exito" o "error") y despues navega a otra pagina y vuelve
     para atras con el boton "Atras", el navegador puede
     restaurar la pagina desde una memoria interna (bfcache) sin
     volver a cargarla de cero. En ese caso "DOMContentLoaded" no
     se dispara de nuevo y el cartel viejo quedaria pegado para
     siempre. "pageshow" SI se dispara siempre (carga normal o
     restauracion), asi que lo usamos para limpiar todo rastro de
     una visita anterior. */
  window.addEventListener("pageshow", () => {
    document.querySelectorAll(".mensaje").forEach((el) => {
      el.textContent = "";
      el.className = "mensaje";
    });
    document.querySelectorAll(".campo-invalido").forEach((campo) => {
      campo.classList.remove("campo-invalido");
    });
    document.querySelectorAll(".error-campo").forEach((aviso) => aviso.remove());
  });

  /* --------------------------------------------------------
     Lo unico que este archivo expone al resto del sitio
     -------------------------------------------------------- */
  return {
    CONFIG,
    ListaStorage,
    Sesion,
    ControlIntentos,
    ValidadorFormulario,
    Espacio,
    esCorreoValido,
    mostrarMensaje,
    obtenerExtension,
    formatearTamano,
  };
})();

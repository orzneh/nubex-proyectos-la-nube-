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

    // ---- Reglas de los diagramas (arbol-*.drawio) ----
    // Regla 8: el Plan Normal acepta directorios de hasta 50 GB
    LIMITE_DIRECTORIO_PLAN_NORMAL_GB: 50,
    // Regla 8.5: el Plan Normal permite 5 archivos comprimidos por mes
    COMPRIMIDOS_POR_MES_PLAN_NORMAL: 5,
    // Reglas 13 y 17: tras publicar un comentario / enviar una consulta
    // hay que esperar 6 horas para volver a hacerlo
    ESPERA_ENTRE_ENVIOS_MS: 6 * 60 * 60 * 1000,
    // Regla 1/2: condiciones del nombre de usuario
    NOMBRE_USUARIO_MIN: 3,
    NOMBRE_USUARIO_MAX: 10,
    NOMBRES_RESERVADOS: ["admin", "administrador", "nubex", "soporte", "root", "invitado"],
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
        if (!Array.isArray(datos)) return [];

        // Ademas de que el JSON este bien formado, cada elemento tiene que
        // ser un objeto de verdad. Un "null" o un dato con forma vieja/rota
        // suelto en la lista (restos de pruebas anteriores, versiones
        // viejas del sitio, etc.) antes rompia en silencio cualquier
        // pantalla que despues intentara leer un campo de ese elemento.
        return datos.filter((item) => item !== null && typeof item === "object");
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

    // Identificador estable de quien esta logueado (el correo si tiene
    // cuenta real; si entro con llave de acceso, el nombre "Invitado").
    // Se usa para las esperas de 6 horas (reglas 13 y 17).
    static identidad() {
      const sesion = Sesion.obtener();
      if (!sesion) return null;
      return (sesion.correo_electronico || sesion.nombre_cliente || "invitado").toLowerCase();
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
     REGLAS DE NEGOCIO (arbol-*.drawio)
     --------------------------------------------------------
     Cada funcion devuelve { ok: true } o { ok: false, motivo }.
     Los numeros de regla (R1, R7.5, R13...) son los de los diagramas.
     -------------------------------------------------------- */

  // "gratuito" | "normal" | "premium" (cualquier plan desconocido cuenta como gratuito)
  function categoriaPlan(plan) {
    if (plan === "Plan Premium") return "premium";
    if (plan === "Plan Normal") return "normal";
    return "gratuito";
  }

  const EXTENSIONES_COMPRIMIDAS = ["ZIP", "RAR", "7Z", "TAR", "GZ", "TGZ", "BZ2", "XZ"];

  function esArchivoComprimido(nombreArchivo) {
    return EXTENSIONES_COMPRIMIDAS.includes(obtenerExtension(nombreArchivo));
  }

  // "5 h 59 min" / "12 min", para avisar cuanto falta de una espera
  function formatearTiempoRestante(ms) {
    let horas = Math.floor(ms / 3600000);
    let minutos = Math.ceil((ms % 3600000) / 60000);
    if (minutos === 60) {
      horas += 1;
      minutos = 0;
    }
    if (horas === 0) return `${Math.max(1, minutos)} min`;
    return minutos === 0 ? `${horas} h` : `${horas} h ${minutos} min`;
  }

  // Espera de 6 horas entre envios, por usuario y por tipo ("comentario" / "soporte")
  class EsperaEntreEnvios {
    constructor(tipo, identidad) {
      this.clave = `nubex_espera_${tipo}_${identidad}`;
    }

    milisRestantes() {
      try {
        const ultimo = Number(localStorage.getItem(this.clave));
        if (!ultimo) return 0;
        return Math.max(0, ultimo + CONFIG.ESPERA_ENTRE_ENVIOS_MS - Date.now());
      } catch (error) {
        console.warn("NUBEX: no se pudo leer la espera entre envios.", error);
        return 0;
      }
    }

    registrar() {
      try {
        localStorage.setItem(this.clave, String(Date.now()));
      } catch (error) {
        console.warn("NUBEX: no se pudo guardar la espera entre envios.", error);
      }
    }
  }

  // Cuantos archivos comprimidos subio el usuario en el mes en curso (regla 8.5).
  // Es un contador aparte: borrar el archivo no devuelve la cuota del mes.
  class CuotaComprimidos {
    static #mesActual() {
      const ahora = new Date();
      return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
    }

    static cantidadDelMes() {
      try {
        const datos = JSON.parse(localStorage.getItem("nubex_comprimidos_mes") || "null");
        return datos && datos.mes === CuotaComprimidos.#mesActual() ? Number(datos.cantidad) || 0 : 0;
      } catch (error) {
        console.warn("NUBEX: contador de comprimidos corrupto, se reinicia.", error);
        return 0;
      }
    }

    static registrar() {
      try {
        localStorage.setItem(
          "nubex_comprimidos_mes",
          JSON.stringify({ mes: CuotaComprimidos.#mesActual(), cantidad: CuotaComprimidos.cantidadDelMes() + 1 })
        );
      } catch (error) {
        console.warn("NUBEX: no se pudo guardar el contador de comprimidos.", error);
      }
    }
  }

  const Reglas = {
    // Registro - Decision "validar nombre": R1 guardar / R2 rechazar
    validarNombreUsuario(nombre, usuarios = []) {
      const { NOMBRE_USUARIO_MIN: min, NOMBRE_USUARIO_MAX: max, NOMBRES_RESERVADOS } = CONFIG;
      if (nombre.length < min || nombre.length > max) {
        return { ok: false, motivo: `El nombre de usuario debe tener entre ${min} y ${max} caracteres.` };
      }
      if (!/^[\p{L}\p{N}_.-]+$/u.test(nombre)) {
        return { ok: false, motivo: "Usá solo letras, números, guion, guion bajo o punto (sin espacios)." };
      }
      if (NOMBRES_RESERVADOS.includes(nombre.toLowerCase())) {
        return { ok: false, motivo: "Ese nombre de usuario no está permitido." };
      }
      if (usuarios.some((u) => (u.username_nuevo || "").toLowerCase() === nombre.toLowerCase())) {
        return { ok: false, motivo: "Ese nombre de usuario ya está en uso." };
      }
      return { ok: true };
    },

    // Compra - "corroborar datos de la tarjeta": el vencimiento (MM/AA) no puede haber pasado
    vencimientoVigente(texto) {
      const coincidencia = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(texto);
      if (!coincidencia) return false;
      const mes = Number(coincidencia[1]);
      const anio = 2000 + Number(coincidencia[2]);
      const hoy = new Date();
      // La tarjeta vale hasta el ultimo dia del mes de vencimiento
      return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1);
    },

    // Compra - "corroborar si la tarjeta esta habilitada": R5 rechazar / R6 aceptar.
    // No hay banco real: se simula la consulta, y las tarjetas que terminan en
    // 0000 figuran como NO habilitadas (sirve para probar la regla 5).
    tarjetaHabilitada(numero) {
      return !numero.endsWith("0000");
    },

    // Personalizar el perfil (avatar, nombre para mostrar, bio) - Decision
    // "el usuario puede personalizarse": al intentarlo se verifica el plan.
    // Segun arbol-personalisar-nubex.drawio: plan gratuito -> R22 (aceptar);
    // plan de pago -> R23 (rechazar).
    evaluarPersonalizacion(plan) {
      if (categoriaPlan(plan) === "gratuito") return { ok: true };
      return {
        ok: false,
        motivo: `Tu ${plan} no permite personalizar el perfil. Esa opción está disponible solo con el Plan Gratuito.`,
      };
    },

    // Subida - Decision "subir directorios": R7 / R8 / R9
    evaluarSubidaDirectorio(plan, tamanoBytes) {
      const categoria = categoriaPlan(plan);
      if (categoria === "gratuito") {
        return { ok: false, motivo: "El Plan Gratuito no permite subir carpetas. Mejorá tu plan desde Comprar." };
      }
      if (categoria === "normal") {
        const limiteBytes = CONFIG.LIMITE_DIRECTORIO_PLAN_NORMAL_GB * BYTES_POR_GB;
        if (tamanoBytes > limiteBytes) {
          return {
            ok: false,
            motivo: `El Plan Normal acepta carpetas de hasta ${CONFIG.LIMITE_DIRECTORIO_PLAN_NORMAL_GB} GB. Esta pesa ${formatearTamano(tamanoBytes)}. Con el Plan Premium no hay límite.`,
          };
        }
      }
      return { ok: true }; // premium: sin limite (R9)
    },

    // Subida - Decision "subir archivos comprimidos": R7.5 / R8.5 / R9.5
    evaluarSubidaComprimido(plan) {
      const categoria = categoriaPlan(plan);
      if (categoria === "gratuito") {
        return { ok: false, motivo: "El Plan Gratuito no permite subir archivos comprimidos. Mejorá tu plan desde Comprar." };
      }
      if (categoria === "normal" && CuotaComprimidos.cantidadDelMes() >= CONFIG.COMPRIMIDOS_POR_MES_PLAN_NORMAL) {
        return {
          ok: false,
          motivo: `Ya subiste ${CONFIG.COMPRIMIDOS_POR_MES_PLAN_NORMAL} archivos comprimidos este mes, que es el máximo del Plan Normal. Con el Plan Premium no hay límite.`,
        };
      }
      return { ok: true };
    },

    // Comentarios - Evento "comprobar las normas": R11 rechazar / R12 publicar
    validarComentario(texto) {
      if (texto.length < 5) {
        return { ok: false, motivo: "El comentario es demasiado corto (mínimo 5 caracteres)." };
      }
      if (/https?:\/\/|www\./i.test(texto)) {
        return { ok: false, motivo: "No se permiten enlaces en los comentarios." };
      }
      if (/(.)\1{9,}/u.test(texto)) {
        return { ok: false, motivo: "El comentario parece spam (caracteres repetidos)." };
      }
      const prohibidas = ["idiota", "estupido", "estúpido", "imbecil", "imbécil", "mierda"];
      const minusculas = texto.toLowerCase();
      if (prohibidas.some((palabra) => minusculas.includes(palabra))) {
        return { ok: false, motivo: "El comentario incumple las normas de convivencia (lenguaje ofensivo)." };
      }
      return { ok: true };
    },

    // Soporte - Evento "revisar mensaje": si no parece una pregunta ni un
    // reporte de error se considera irrelevante (R16 rechazar)
    esConsultaRelevante(texto) {
      const palabras = texto.split(/\s+/).filter((palabra) => /\p{L}{2,}/u.test(palabra));
      return texto.length >= 15 && palabras.length >= 3 && !/(.)\1{9,}/u.test(texto);
    },
  };

  /* --------------------------------------------------------
     Corta el acceso a una pagina si no hay sesion iniciada. Es una
     segunda capa de seguridad ademas del script que ya corre en el
     <head> de cada pagina protegida (administrar, comprar, pago,
     soporte): ese script corta ANTES de que se dibuje nada, este
     ademas valida que la sesion guardada sea realmente valida
     (no un dato corrupto) antes de dejar seguir a la pagina.
     -------------------------------------------------------- */
  function requerirSesion() {
    if (!Sesion.obtener()) {
      window.location.replace("login.html");
      return false;
    }
    return true;
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
    requerirSesion,
    Reglas,
    EsperaEntreEnvios,
    CuotaComprimidos,
    esArchivoComprimido,
    formatearTiempoRestante,
  };
})();

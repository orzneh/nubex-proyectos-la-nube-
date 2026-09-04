/* ==========================================================
   SCRIPT.JS - Logica de NUBEX
   ==========================================================
   Este archivo es compartido por TODAS las paginas del sitio.
   Como no tenemos una base de datos real, usamos el
   "localStorage" del navegador para guardar la informacion:
   funciona como una caja donde guardamos texto que sigue
   estando ahi aunque se cierre o recargue la pagina.

   Los nombres de las variables estan tomados del
   "diccionario de datos" que armamos con la profesora, para
   que sea facil relacionar el codigo con el DFD:

     nombre_cliente, password, correo_electronico,
     llave_acceso, num_intentos, mail_nuevo, password_nuevo,
     username_nuevo, nombre_suscriptor, num_tarjeta,
     expir_tarjeta, cvv_tarjeta, direc_user, direc2_user,
     pais, provincia, codigo_postal, suscripcion,
     archivos_subidos, papelera_archivos, espacio_ocup,
     espacio_libre, archivos_comp, num_tel_user,
     comentario_despues_llamada, nombre_user, solicitud_user
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
   2) REGISTRO DE USUARIO NUEVO (registro.html)
   -------------------------------------------------------- */

function inicializarRegistro() {
  const formularioRegistro = document.getElementById("form-registro");
  if (!formularioRegistro) return; // si esta pagina no tiene el form, no hacemos nada

  // Apagamos la validacion nativa del navegador (los globitos grises)
  // para poder mostrar los avisos con la estetica de NUBEX
  formularioRegistro.setAttribute("novalidate", "novalidate");
  activarLimpiezaAlEscribir(formularioRegistro);

  formularioRegistro.addEventListener("submit", function (evento) {
    evento.preventDefault(); // evita que la pagina se recargue

    limpiarErroresFormulario(formularioRegistro);

    // Leemos los datos que escribio el usuario
    const inputUsername = document.getElementById("username_nuevo");
    const inputMail = document.getElementById("mail_nuevo");
    const inputPassword = document.getElementById("password_nuevo");

    const username_nuevo = inputUsername.value.trim();
    const mail_nuevo = inputMail.value.trim();
    const password_nuevo = inputPassword.value;

    const mensaje = document.getElementById("mensaje-registro");

    // Validacion campo por campo, marcando en rojo el que este mal
    let formularioValido = true;

    if (username_nuevo === "") {
      marcarCampoInvalido(inputUsername, "Ingresá un nombre de usuario.");
      formularioValido = false;
    }

    if (mail_nuevo === "") {
      marcarCampoInvalido(inputMail, "Ingresá tu correo electrónico.");
      formularioValido = false;
    } else if (!esCorreoValido(mail_nuevo)) {
      marcarCampoInvalido(inputMail, "Ingresá un correo electrónico válido.");
      formularioValido = false;
    }

    if (password_nuevo === "") {
      marcarCampoInvalido(inputPassword, "Ingresá una contraseña.");
      formularioValido = false;
    }

    if (!formularioValido) {
      mostrarMensaje(mensaje, "Revisá los campos marcados en rojo.", "error");
      return;
    }

    // Buscamos si ya existe un usuario con ese mail
    // (comparamos en minuscula para que "Ana@mail.com" y "ana@mail.com"
    // cuenten como el mismo correo)
    const usuarios = leerLista("nubex_usuarios");
    const yaExiste = usuarios.some(function (usuario) {
      return usuario.mail_nuevo.toLowerCase() === mail_nuevo.toLowerCase();
    });

    if (yaExiste) {
      marcarCampoInvalido(inputMail, "Ya existe una cuenta con ese correo.");
      mostrarMensaje(mensaje, "Ya existe una cuenta con ese correo.", "error");
      return;
    }

    // Agregamos el usuario nuevo a la lista y la guardamos
    usuarios.push({ username_nuevo, mail_nuevo, password_nuevo });
    guardarLista("nubex_usuarios", usuarios);

    mostrarMensaje(mensaje, "Cuenta creada con exito. Redirigiendo al login...", "exito");

    // Esperamos un segundo y mandamos al usuario a la pagina de login
    setTimeout(function () {
      window.location.href = "login.html";
    }, 1200);
  });
}

/* --------------------------------------------------------
   3) INICIO DE SESION (login.html)
   -------------------------------------------------------- */

function inicializarLogin() {
  const formularioLogin = document.getElementById("form-login");
  if (!formularioLogin) return;

  // Apagamos la validacion nativa del navegador (los globitos grises)
  // para poder mostrar los avisos con la estetica de NUBEX
  formularioLogin.setAttribute("novalidate", "novalidate");
  activarLimpiezaAlEscribir(formularioLogin);

  formularioLogin.addEventListener("submit", function (evento) {
    evento.preventDefault();

    limpiarErroresFormulario(formularioLogin);

    const inputCorreo = document.getElementById("correo_electronico");
    const inputPassword = document.getElementById("password");

    const correo_electronico = inputCorreo.value.trim();
    const correoClave = correo_electronico.toLowerCase(); // usamos minuscula para comparar/guardar
    const password = inputPassword.value;
    const mensaje = document.getElementById("mensaje-login");

    // Validacion campo por campo antes de meternos con la logica de bloqueo
    let formularioValido = true;

    if (correo_electronico === "") {
      marcarCampoInvalido(inputCorreo, "Ingresá tu correo electrónico.");
      formularioValido = false;
    } else if (!esCorreoValido(correo_electronico)) {
      marcarCampoInvalido(inputCorreo, "Ingresá un correo electrónico válido.");
      formularioValido = false;
    }

    if (password === "") {
      marcarCampoInvalido(inputPassword, "Ingresá tu contraseña.");
      formularioValido = false;
    }

    if (!formularioValido) {
      mostrarMensaje(mensaje, "Revisá los campos marcados en rojo.", "error");
      return;
    }

    // num_intentos: ahora se guarda POR CUENTA (antes era un solo contador
    // global, asi que 3 intentos fallidos de cualquiera bloqueaban el
    // login de TODOS los usuarios para siempre. Ahora cada correo tiene
    // su propio contador, y ademas el bloqueo se vence solo despues de
    // TIEMPO_BLOQUEO_MS en vez de quedar bloqueado para siempre).
    const estadoIntentos = leerEstadoIntentos(correoClave);
    const ahora = Date.now();

    if (estadoIntentos.bloqueadoHasta && ahora < estadoIntentos.bloqueadoHasta) {
      const segundosRestantes = Math.ceil((estadoIntentos.bloqueadoHasta - ahora) / 1000);
      mostrarMensaje(
        mensaje,
        "Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en " + segundosRestantes + " segundos.",
        "error"
      );
      return;
    }

    // Si el bloqueo ya vencio, reiniciamos el contador de esa cuenta
    if (estadoIntentos.bloqueadoHasta && ahora >= estadoIntentos.bloqueadoHasta) {
      estadoIntentos.num_intentos = 0;
      estadoIntentos.bloqueadoHasta = 0;
    }

    const usuarios = leerLista("nubex_usuarios");
    const usuarioEncontrado = usuarios.find(function (usuario) {
      return usuario.mail_nuevo.toLowerCase() === correoClave && usuario.password_nuevo === password;
    });

    if (usuarioEncontrado) {
      // Login correcto: reiniciamos el contador de intentos de esta cuenta
      guardarEstadoIntentos(correoClave, { num_intentos: 0, bloqueadoHasta: 0 });

      // Guardamos quien es el "nombre_cliente" logueado actualmente
      const sesion = {
        nombre_cliente: usuarioEncontrado.username_nuevo,
        correo_electronico: usuarioEncontrado.mail_nuevo
      };
      localStorage.setItem("nubex_sesion", JSON.stringify(sesion));

      mostrarMensaje(mensaje, "Bienvenido, " + usuarioEncontrado.username_nuevo + ". Redirigiendo...", "exito");

      setTimeout(function () {
        window.location.href = "administrar.html";
      }, 1000);
    } else {
      // Login incorrecto: sumamos un intento fallido a ESTA cuenta
      estadoIntentos.num_intentos = estadoIntentos.num_intentos + 1;

      if (estadoIntentos.num_intentos >= MAXIMO_INTENTOS) {
        estadoIntentos.bloqueadoHasta = Date.now() + TIEMPO_BLOQUEO_MS;
        guardarEstadoIntentos(correoClave, estadoIntentos);
        mostrarMensaje(
          mensaje,
          "Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en " + Math.round(TIEMPO_BLOQUEO_MS / 1000) + " segundos.",
          "error"
        );
      } else {
        guardarEstadoIntentos(correoClave, estadoIntentos);
        const intentosRestantes = MAXIMO_INTENTOS - estadoIntentos.num_intentos;
        mostrarMensaje(
          mensaje,
          "Correo o contraseña incorrectos. Intentos restantes: " + intentosRestantes,
          "error"
        );
      }
    }
  });

  // Boton de "llave de acceso" (opcion de entrar sin password)
  const botonLlaveAcceso = document.getElementById("boton-llave-acceso");
  if (botonLlaveAcceso) {
    const inputLlave = document.getElementById("llave_acceso");
    if (inputLlave) {
      inputLlave.addEventListener("input", function () {
        limpiarCampoInvalido(inputLlave);
      });
    }

    botonLlaveAcceso.addEventListener("click", function () {
      const llave_acceso = inputLlave.value.trim();
      const mensaje = document.getElementById("mensaje-login");

      if (llave_acceso === "") {
        marcarCampoInvalido(inputLlave, "Ingresá tu llave de acceso.");
        mostrarMensaje(mensaje, "Ingresá tu llave de acceso.", "error");
        return;
      }

      limpiarCampoInvalido(inputLlave);

      // Para esta demo, cualquier llave no vacia funciona como acceso rapido
      const sesion = { nombre_cliente: "Invitado", correo_electronico: "" };
      localStorage.setItem("nubex_sesion", JSON.stringify(sesion));
      mostrarMensaje(mensaje, "Acceso concedido con llave. Redirigiendo...", "exito");

      setTimeout(function () {
        window.location.href = "administrar.html";
      }, 1000);
    });
  }
}

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

/* --------------------------------------------------------
   5) PAGO (pago.html)
   -------------------------------------------------------- */

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

// Funcion que guarda la suscripcion activa y recalcula el espacio libre
function activarSuscripcion(suscripcion) {
  localStorage.setItem("nubex_suscripcion", suscripcion);
  recalcularEspacio();
}

/* --------------------------------------------------------
   6) PANEL "ADMINISTRAR" - GESTOR DE ARCHIVOS (administrar.html)
   -------------------------------------------------------- */

function inicializarAdministrar() {
  const contenedorArchivos = document.getElementById("lista-archivos");
  if (!contenedorArchivos) return; // esta pagina no es administrar.html

  // Mostramos el nombre del usuario logueado (nombre_cliente) si existe
  const sesion = JSON.parse(localStorage.getItem("nubex_sesion") || "null");
  const etiquetaUsuario = document.getElementById("etiqueta-nombre-cliente");
  if (etiquetaUsuario && sesion) {
    etiquetaUsuario.textContent = sesion.nombre_cliente;
  }

  // Cuando se elige un archivo con el input de tipo "file", lo agregamos
  const inputSubirArchivo = document.getElementById("input-subir-archivo");
  if (inputSubirArchivo) {
    inputSubirArchivo.addEventListener("change", function () {
      const archivoElegido = inputSubirArchivo.files[0];
      if (!archivoElegido) return;

      subirArchivo(archivoElegido.name, archivoElegido.size);
      inputSubirArchivo.value = ""; // limpiamos el input para poder subir de nuevo
    });
  }

  // Los botones del menu lateral cambian que lista se muestra (Recientes,
  // Cargas, Papelera...) usando el atributo data-seccion
  const botonesMenu = document.querySelectorAll(".menu-item[data-seccion]");
  botonesMenu.forEach(function (boton) {
    boton.addEventListener("click", function () {
      botonesMenu.forEach(function (b) {
        b.classList.remove("activo");
      });
      boton.classList.add("activo");
      mostrarSeccion(boton.getAttribute("data-seccion"));
    });
  });

  // Dibujamos la seccion inicial (Recientes) y la barra de espacio
  mostrarSeccion("recientes");
  actualizarBarraEspacio();
}

// Agrega un archivo nuevo a "archivos_subidos" y recalcula el espacio.
// Antes esta funcion agregaba el archivo SIEMPRE, sin fijarse si ya
// habia llegado al limite del plan contratado. Ahora primero calcula
// si entra, y si no hay espacio, corta y avisa sin agregar nada.
function subirArchivo(nombreArchivo, tamanoBytes) {
  const archivos_subidos = leerLista("nubex_archivos");
  const mensajeAdmin = document.getElementById("mensaje-admin");

  // Convertimos el tamaño de bytes a "GB simulados" chiquitos para la demo
  const tamanoSimuladoGB = Math.max(1, Math.round(tamanoBytes / 100000));

  // Espacio que ya se esta usando, segun los archivos actuales
  let espacio_ocup_actual = 0;
  archivos_subidos.forEach(function (archivo) {
    espacio_ocup_actual = espacio_ocup_actual + archivo.tamano;
  });

  const suscripcion = localStorage.getItem("nubex_suscripcion") || "Plan Gratuito";
  const espacioTotal = ESPACIO_POR_PLAN[suscripcion] || ESPACIO_POR_PLAN["Plan Gratuito"];

  // Si sumar este archivo nuevo se pasa del total del plan, no lo dejamos subir
  if (espacio_ocup_actual + tamanoSimuladoGB > espacioTotal) {
    const espacioDisponible = Math.max(0, espacioTotal - espacio_ocup_actual);
    mostrarMensaje(
      mensajeAdmin,
      "No hay espacio suficiente para subir \"" + nombreArchivo + "\". Te quedan " + espacioDisponible +
        " GB libres en tu " + suscripcion + ". Borrá archivos o mejorá tu plan desde Comprar.",
      "error"
    );
    return; // cortamos aca: el archivo NO se agrega
  }

  if (mensajeAdmin) {
    mensajeAdmin.className = "mensaje"; // ocultamos cualquier mensaje de error anterior
  }

  archivos_subidos.push({
    nombre: nombreArchivo,
    tipo: obtenerExtension(nombreArchivo),
    tamano: tamanoSimuladoGB
  });

  guardarLista("nubex_archivos", archivos_subidos);
  recalcularEspacio();
  mostrarSeccion("recientes");

  // Marcamos "Recientes" como la seccion activa en el menu
  document.querySelectorAll(".menu-item[data-seccion]").forEach(function (b) {
    b.classList.toggle("activo", b.getAttribute("data-seccion") === "recientes");
  });
}

// Devuelve la extension de un archivo en mayusculas (ej: "informe.pdf" -> "PDF")
function obtenerExtension(nombreArchivo) {
  const partes = nombreArchivo.split(".");
  if (partes.length < 2) return "ARCHIVO";
  return partes[partes.length - 1].toUpperCase();
}

// Mueve un archivo de "archivos_subidos" a "papelera_archivos".
// Antes esto ademas te mandaba a la vista de Papelera. Ahora el archivo
// se sigue moviendo a la papelera igual (para poder restaurarlo despues),
// pero la pantalla se queda en la seccion en la que estabas (Recientes o
// Cargas), solo se actualiza la lista para que el archivo desaparezca.
function moverAPapelera(indice) {
  const archivos_subidos = leerLista("nubex_archivos");
  const papelera_archivos = leerLista("nubex_papelera");

  const archivo = archivos_subidos.splice(indice, 1)[0];
  papelera_archivos.push(archivo);

  guardarLista("nubex_archivos", archivos_subidos);
  guardarLista("nubex_papelera", papelera_archivos);
  recalcularEspacio();
  mostrarSeccion(seccionActual); // nos quedamos donde estabamos, no saltamos a papelera
}

// Restaura un archivo de la papelera de vuelta a "archivos_subidos"
function restaurarArchivo(indice) {
  const archivos_subidos = leerLista("nubex_archivos");
  const papelera_archivos = leerLista("nubex_papelera");

  const archivo = papelera_archivos.splice(indice, 1)[0];
  archivos_subidos.push(archivo);

  guardarLista("nubex_archivos", archivos_subidos);
  guardarLista("nubex_papelera", papelera_archivos);
  recalcularEspacio();
  mostrarSeccion(seccionActual);
}

// Elimina definitivamente un archivo de la papelera
function eliminarDefinitivo(indice) {
  const papelera_archivos = leerLista("nubex_papelera");
  papelera_archivos.splice(indice, 1);
  guardarLista("nubex_papelera", papelera_archivos);
  recalcularEspacio();
  mostrarSeccion(seccionActual);
}

// Comparte un archivo: lo copia a la lista "archivos_comp"
function compartirArchivo(indice) {
  const archivos_subidos = leerLista("nubex_archivos");
  const archivos_comp = leerLista("nubex_compartidos");

  archivos_comp.push(archivos_subidos[indice]);
  guardarLista("nubex_compartidos", archivos_comp);
  alert("Archivo compartido con exito.");
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

// Decide que panel mostrar segun la seccion elegida del menu lateral.
// Antes esta funcion SOLO sabia dibujar archivos (recientes/cargas/
// papelera); "Configuración", "Ayuda y comentarios" y "Almacenamiento"
// no hacian nada porque ni siquiera tenian data-seccion en el HTML.
function mostrarSeccion(nombreSeccion) {
  const panelArchivos = document.getElementById("panel-archivos");
  const panelConfiguracion = document.getElementById("panel-configuracion");
  const panelAyuda = document.getElementById("panel-ayuda");
  const panelAlmacenamiento = document.getElementById("panel-almacenamiento");
  const titulo = document.getElementById("titulo-seccion");
  if (!panelArchivos) return; // esta pagina no es administrar.html

  seccionActual = nombreSeccion; // recordamos que seccion quedo activa

  // Ocultamos todos los paneles y despues mostramos solo el que corresponde
  [panelArchivos, panelConfiguracion, panelAyuda, panelAlmacenamiento].forEach(function (panel) {
    if (panel) panel.style.display = "none";
  });

  if (nombreSeccion === "recientes" || nombreSeccion === "cargas" || nombreSeccion === "papelera") {
    panelArchivos.style.display = "block";
    titulo.textContent =
      nombreSeccion === "recientes" ? "Recientes" :
      nombreSeccion === "cargas" ? "Cargas" : "Papelera";
    dibujarListaArchivos(nombreSeccion);
  } else if (nombreSeccion === "configuracion") {
    panelConfiguracion.style.display = "block";
    titulo.textContent = "Configuración";
    dibujarConfiguracion();
  } else if (nombreSeccion === "ayuda") {
    panelAyuda.style.display = "block";
    titulo.textContent = "Ayuda y comentarios";
    dibujarAyuda();
  } else if (nombreSeccion === "almacenamiento") {
    panelAlmacenamiento.style.display = "block";
    titulo.textContent = "Almacenamiento";
    dibujarAlmacenamiento();
  }
}

// Dibuja en pantalla la lista de archivos (Recientes / Cargas / Papelera).
// Esta es la logica que antes vivia adentro de mostrarSeccion.
function dibujarListaArchivos(nombreSeccion) {
  const contenedor = document.getElementById("lista-archivos");
  if (!contenedor) return;

  let listaAMostrar = [];
  let permitirAcciones = "normal"; // "normal" = mover a papelera / compartir | "papelera" = restaurar / eliminar

  if (nombreSeccion === "recientes" || nombreSeccion === "cargas") {
    listaAMostrar = leerLista("nubex_archivos");
    permitirAcciones = "normal";
  } else if (nombreSeccion === "papelera") {
    listaAMostrar = leerLista("nubex_papelera");
    permitirAcciones = "papelera";
  }

  contenedor.innerHTML = ""; // limpiamos lo que estaba dibujado antes

  if (listaAMostrar.length === 0) {
    contenedor.innerHTML = "<p>No hay archivos para mostrar aca todavia.</p>";
    return;
  }

  listaAMostrar.forEach(function (archivo, indice) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "archivo-tarjeta";

    let botonesAccion = "";
    if (permitirAcciones === "normal") {
      botonesAccion =
        '<button class="boton boton-chico" onclick="moverAPapelera(' + indice + ')">Eliminar</button>' +
        '<button class="boton boton-chico" onclick="compartirArchivo(' + indice + ')">Compartir</button>';
    } else {
      botonesAccion =
        '<button class="boton boton-chico" onclick="restaurarArchivo(' + indice + ')">Restaurar</button>' +
        '<button class="boton boton-chico" onclick="eliminarDefinitivo(' + indice + ')">Borrar</button>';
    }

    tarjeta.innerHTML =
      '<div class="archivo-icono">📄</div>' +
      '<div class="archivo-tipo">' + archivo.tipo + '</div>' +
      '<div class="archivo-nombre">' + archivo.nombre + '</div>' +
      '<div class="archivo-acciones">' + botonesAccion + '</div>';

    contenedor.appendChild(tarjeta);
  });
}

/* --------------------------------------------------------
   6.1) SECCION "CONFIGURACIÓN" (antes vacia, ahora con funcion real)
   -------------------------------------------------------- */

// Dibuja el formulario de configuracion: cambiar nombre para mostrar,
// cambiar contraseña, y cerrar sesion.
function dibujarConfiguracion() {
  const panel = document.getElementById("panel-configuracion");
  if (!panel) return;

  const sesion = JSON.parse(localStorage.getItem("nubex_sesion") || "null");

  if (!sesion) {
    panel.innerHTML = "<p>Iniciá sesión para ver esta sección.</p>";
    return;
  }

  // Si entro con "llave de acceso" no tiene una cuenta real con password
  const tieneCuentaReal = Boolean(sesion.correo_electronico);

  panel.innerHTML =
    '<div class="campo-formulario">' +
      '<label for="config-nombre">Nombre para mostrar</label>' +
      '<input type="text" id="config-nombre" maxlength="20" value="' + sesion.nombre_cliente + '">' +
    '</div>' +
    '<button id="boton-guardar-nombre" class="boton boton-primario">Guardar nombre</button>' +
    '<hr style="margin:26px 0; border:none; border-top:1px solid var(--color-gris-linea);">' +
    (tieneCuentaReal
      ? '<div class="campo-formulario">' +
          '<label for="config-pass-actual">Contraseña actual</label>' +
          '<input type="password" id="config-pass-actual" maxlength="20">' +
        '</div>' +
        '<div class="campo-formulario">' +
          '<label for="config-pass-nueva">Contraseña nueva</label>' +
          '<input type="password" id="config-pass-nueva" maxlength="20">' +
        '</div>' +
        '<button id="boton-cambiar-pass" class="boton boton-primario">Cambiar contraseña</button>' +
        '<hr style="margin:26px 0; border:none; border-top:1px solid var(--color-gris-linea);">'
      : '<p style="color:var(--color-texto-mutado); font-size:13px;">Entraste con llave de acceso, así que no tenés contraseña para cambiar.</p>') +
    '<button id="boton-cerrar-sesion" class="boton" style="width:100%;">Cerrar sesión</button>';

  // Guardar nombre nuevo
  document.getElementById("boton-guardar-nombre").addEventListener("click", function () {
    const mensajeAdmin = document.getElementById("mensaje-admin");
    const nuevoNombre = document.getElementById("config-nombre").value.trim();

    if (nuevoNombre === "") {
      mostrarMensaje(mensajeAdmin, "El nombre no puede estar vacío.", "error");
      return;
    }

    const sesionActual = JSON.parse(localStorage.getItem("nubex_sesion"));
    sesionActual.nombre_cliente = nuevoNombre;
    localStorage.setItem("nubex_sesion", JSON.stringify(sesionActual));

    // Si tiene cuenta real, tambien actualizamos su registro de usuario
    if (sesionActual.correo_electronico) {
      const usuarios = leerLista("nubex_usuarios");
      const usuario = usuarios.find(function (u) {
        return u.mail_nuevo.toLowerCase() === sesionActual.correo_electronico.toLowerCase();
      });
      if (usuario) {
        usuario.username_nuevo = nuevoNombre;
        guardarLista("nubex_usuarios", usuarios);
      }
    }

    const etiquetaUsuario = document.getElementById("etiqueta-nombre-cliente");
    if (etiquetaUsuario) etiquetaUsuario.textContent = nuevoNombre;

    mostrarMensaje(mensajeAdmin, "Nombre actualizado con éxito.", "exito");
  });

  // Cambiar contraseña (solo si tiene cuenta real)
  const botonCambiarPass = document.getElementById("boton-cambiar-pass");
  if (botonCambiarPass) {
    botonCambiarPass.addEventListener("click", function () {
      const mensajeAdmin = document.getElementById("mensaje-admin");
      const passActual = document.getElementById("config-pass-actual").value;
      const passNueva = document.getElementById("config-pass-nueva").value;

      if (passActual === "" || passNueva === "") {
        mostrarMensaje(mensajeAdmin, "Completá los dos campos de contraseña.", "error");
        return;
      }

      const usuarios = leerLista("nubex_usuarios");
      const usuario = usuarios.find(function (u) {
        return u.mail_nuevo.toLowerCase() === sesion.correo_electronico.toLowerCase();
      });

      if (!usuario || usuario.password_nuevo !== passActual) {
        mostrarMensaje(mensajeAdmin, "La contraseña actual es incorrecta.", "error");
        return;
      }

      usuario.password_nuevo = passNueva;
      guardarLista("nubex_usuarios", usuarios);

      document.getElementById("config-pass-actual").value = "";
      document.getElementById("config-pass-nueva").value = "";
      mostrarMensaje(mensajeAdmin, "Contraseña actualizada con éxito.", "exito");
    });
  }

  // Cerrar sesion
  document.getElementById("boton-cerrar-sesion").addEventListener("click", function () {
    localStorage.removeItem("nubex_sesion");
    window.location.href = "login.html";
  });
}

/* --------------------------------------------------------
   6.2) SECCION "AYUDA Y COMENTARIOS" (antes vacia, ahora con funcion real)
   -------------------------------------------------------- */

// Dibuja unas preguntas frecuentes fijas + un formulario para dejar
// comentarios/consultas, que se guardan en localStorage y se listan aca abajo.
function dibujarAyuda() {
  const panel = document.getElementById("panel-ayuda");
  if (!panel) return;

  const comentarios = leerLista("nubex_comentarios_ayuda");

  let listaComentariosHtml = "";
  if (comentarios.length === 0) {
    listaComentariosHtml = '<p style="color:var(--color-texto-mutado); font-size:13px;">Todavía no dejaste ningún comentario.</p>';
  } else {
    listaComentariosHtml = comentarios.slice().reverse().map(function (comentario) {
      return '<div class="archivo-tarjeta" style="width:auto; text-align:left; margin-bottom:12px;">' +
        '<div style="font-size:12px; color:var(--color-texto-mutado); margin-bottom:6px;">' + comentario.fecha + '</div>' +
        '<div>' + comentario.texto + '</div>' +
        '</div>';
    }).join("");
  }

  panel.innerHTML =
    '<div style="margin-bottom:30px;">' +
      '<h3>Preguntas frecuentes</h3>' +
      '<p><strong>¿Cómo subo un archivo?</strong><br>Andá a Recientes o Cargas y hacé clic en la zona de subida.</p>' +
      '<p><strong>¿Cómo libero espacio?</strong><br>Movés archivos a la papelera, los borrás definitivamente, o mejorás tu plan desde Comprar.</p>' +
      '<p><strong>¿Cómo cambio mi contraseña?</strong><br>Desde la sección Configuración del menú.</p>' +
    '</div>' +
    '<div class="campo-formulario">' +
      '<label for="comentario-ayuda">Dejanos tu comentario o consulta</label>' +
      '<textarea id="comentario-ayuda" rows="4" maxlength="500"></textarea>' +
    '</div>' +
    '<button id="boton-enviar-comentario" class="boton boton-primario">Enviar comentario</button>' +
    '<div style="margin-top:26px;">' +
      '<h3>Tus comentarios anteriores</h3>' +
      listaComentariosHtml +
    '</div>';

  document.getElementById("boton-enviar-comentario").addEventListener("click", function () {
    const mensajeAdmin = document.getElementById("mensaje-admin");
    const texto = document.getElementById("comentario-ayuda").value.trim();

    if (texto === "") {
      mostrarMensaje(mensajeAdmin, "Escribí un comentario antes de enviarlo.", "error");
      return;
    }

    const lista = leerLista("nubex_comentarios_ayuda");
    lista.push({ texto: texto, fecha: new Date().toLocaleString() });
    guardarLista("nubex_comentarios_ayuda", lista);

    mostrarMensaje(mensajeAdmin, "Gracias por tu comentario.", "exito");
    dibujarAyuda(); // volvemos a dibujar para que aparezca el comentario nuevo
  });
}

/* --------------------------------------------------------
   6.3) SECCION "ALMACENAMIENTO" (antes vacia, ahora con funcion real)
   -------------------------------------------------------- */

// Muestra el plan actual, el espacio usado/libre, cuantos archivos hay
// en la papelera, y un resumen del espacio ocupado por tipo de archivo.
function dibujarAlmacenamiento() {
  const panel = document.getElementById("panel-almacenamiento");
  if (!panel) return;

  const archivos_subidos = leerLista("nubex_archivos");
  const papelera_archivos = leerLista("nubex_papelera");
  const suscripcion = localStorage.getItem("nubex_suscripcion") || "Plan Gratuito";
  const espacioTotal = ESPACIO_POR_PLAN[suscripcion] || ESPACIO_POR_PLAN["Plan Gratuito"];
  const espacio_ocup = parseInt(localStorage.getItem("nubex_espacio_ocup") || "0");
  const espacio_libre = Math.max(0, espacioTotal - espacio_ocup);
  const porcentaje = Math.min(100, Math.round((espacio_ocup / espacioTotal) * 100));

  // Agrupamos los archivos subidos por tipo de extension
  const porTipo = {};
  archivos_subidos.forEach(function (archivo) {
    if (!porTipo[archivo.tipo]) {
      porTipo[archivo.tipo] = { cantidad: 0, tamano: 0 };
    }
    porTipo[archivo.tipo].cantidad += 1;
    porTipo[archivo.tipo].tamano += archivo.tamano;
  });

  const tipos = Object.keys(porTipo);
  let tarjetasTipo = "";
  if (tipos.length === 0) {
    tarjetasTipo = '<p style="color:var(--color-texto-mutado); font-size:13px;">Todavía no subiste archivos.</p>';
  } else {
    tarjetasTipo = '<div class="fila-archivos">' + tipos.map(function (tipo) {
      const info = porTipo[tipo];
      return '<div class="archivo-tarjeta">' +
        '<div class="archivo-icono">📄</div>' +
        '<div class="archivo-tipo">' + tipo + '</div>' +
        '<div style="font-size:12px; margin-top:6px;">' + info.cantidad + ' archivo(s)</div>' +
        '<div style="font-size:12px;">' + info.tamano + ' GB</div>' +
        '</div>';
    }).join("") + '</div>';
  }

  panel.innerHTML =
    '<p><strong>Plan actual:</strong> ' + suscripcion + '</p>' +
    '<div class="barra-espacio-contenedor"><div class="barra-espacio-relleno" style="width:' + porcentaje + '%;"></div></div>' +
    '<p style="font-size:13px; color:var(--color-texto-mutado);">' +
      espacio_ocup + ' GB usados de ' + espacioTotal + ' GB (' + espacio_libre + ' GB libres)' +
    '</p>' +
    '<p><strong>Archivos en papelera:</strong> ' + papelera_archivos.length + '</p>' +
    '<h3 style="margin-top:26px;">Espacio por tipo de archivo</h3>' +
    tarjetasTipo +
    '<a href="comprar.html" class="boton boton-primario" style="display:inline-block; margin-top:26px;">Mejorar mi plan</a>';
}

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

/* --------------------------------------------------------
   8) FUNCION AUXILIAR PARA MOSTRAR MENSAJES DE EXITO / ERROR
   -------------------------------------------------------- */

function mostrarMensaje(elementoMensaje, texto, tipo) {
  if (!elementoMensaje) return;
  elementoMensaje.textContent = texto;
  elementoMensaje.className = "mensaje mostrar " + tipo; // tipo = "exito" o "error"
}

/* --------------------------------------------------------
   9) PUNTO DE ENTRADA: se ejecuta cuando la pagina termina
      de cargar, y llama a las funciones de cada seccion.
      Cada funcion se "auto-cancela" si no encuentra sus
      elementos en la pagina actual, asi que es seguro
      llamarlas a todas desde cualquier pagina.
   -------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", function () {
  inicializarRegistro();
  inicializarLogin();
  inicializarComprar();
  inicializarPago();
  inicializarAdministrar();
  inicializarSoporte();
});

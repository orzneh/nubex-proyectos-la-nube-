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
     ATT: Mateo Velazquez, terrible capo ese chabon
   ========================================================== */

/* --------------------------------------------------------
   1) CONSTANTES Y "BASE DE DATOS" EN localStorage
   -------------------------------------------------------- */

// Numero maximo de intentos de acceso permitidos (num_intentos)
const MAXIMO_INTENTOS = 3;

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

/* --------------------------------------------------------
   2) REGISTRO DE USUARIO NUEVO (registro.html)
   -------------------------------------------------------- */

function inicializarRegistro() {
  const formularioRegistro = document.getElementById("form-registro");
  if (!formularioRegistro) return; // si esta pagina no tiene el form, no hacemos nada

  formularioRegistro.addEventListener("submit", function (evento) {
    evento.preventDefault(); // evita que la pagina se recargue

    // Leemos los datos que escribio el usuario
    const username_nuevo = document.getElementById("username_nuevo").value.trim();
    const mail_nuevo = document.getElementById("mail_nuevo").value.trim();
    const password_nuevo = document.getElementById("password_nuevo").value;

    const mensaje = document.getElementById("mensaje-registro");

    // Validacion basica: ningun campo obligatorio puede estar vacio
    if (username_nuevo === "" || mail_nuevo === "" || password_nuevo === "") {
      mostrarMensaje(mensaje, "Completa todos los campos obligatorios.", "error");
      return;
    }

    // Buscamos si ya existe un usuario con ese mail
    const usuarios = leerLista("nubex_usuarios");
    const yaExiste = usuarios.some(function (usuario) {
      return usuario.mail_nuevo === mail_nuevo;
    });

    if (yaExiste) {
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

  formularioLogin.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const correo_electronico = document.getElementById("correo_electronico").value.trim();
    const password = document.getElementById("password").value;
    const mensaje = document.getElementById("mensaje-login");

    // num_intentos: contamos los intentos fallidos guardados
    let num_intentos = parseInt(localStorage.getItem("nubex_num_intentos") || "0");

    if (num_intentos >= MAXIMO_INTENTOS) {
      mostrarMensaje(mensaje, "Cuenta bloqueada por demasiados intentos fallidos.", "error");
      return;
    }

    const usuarios = leerLista("nubex_usuarios");
    const usuarioEncontrado = usuarios.find(function (usuario) {
      return usuario.mail_nuevo === correo_electronico && usuario.password_nuevo === password;
    });

    if (usuarioEncontrado) {
      // Login correcto: reiniciamos el contador de intentos
      localStorage.setItem("nubex_num_intentos", "0");

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
      // Login incorrecto: sumamos un intento fallido
      num_intentos = num_intentos + 1;
      localStorage.setItem("nubex_num_intentos", String(num_intentos));

      const intentosRestantes = MAXIMO_INTENTOS - num_intentos;
      mostrarMensaje(
        mensaje,
        "Correo o contraseña incorrectos. Intentos restantes: " + intentosRestantes,
        "error"
      );
    }
  });

  // Boton de "llave de acceso" (opcion de entrar sin password)
  const botonLlaveAcceso = document.getElementById("boton-llave-acceso");
  if (botonLlaveAcceso) {
    botonLlaveAcceso.addEventListener("click", function () {
      const llave_acceso = document.getElementById("llave_acceso").value.trim();
      const mensaje = document.getElementById("mensaje-login");

      if (llave_acceso === "") {
        mostrarMensaje(mensaje, "Ingresa tu llave de acceso.", "error");
        return;
      }

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

  // Mostramos en pantalla que plan se esta pagando
  const planElegido = localStorage.getItem("nubex_plan_elegido") || "Plan Normal";
  const etiquetaPlan = document.getElementById("etiqueta-plan-elegido");
  if (etiquetaPlan) {
    etiquetaPlan.textContent = planElegido;
  }

  formularioPago.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const nombre_suscriptor = document.getElementById("nombre_suscriptor").value.trim();
    const num_tarjeta = document.getElementById("num_tarjeta").value.trim();
    const expir_tarjeta = document.getElementById("expir_tarjeta").value.trim();
    const cvv_tarjeta = document.getElementById("cvv_tarjeta").value.trim();
    const direc_user = document.getElementById("direc_user").value.trim();
    const pais = document.getElementById("pais").value.trim();
    const provincia = document.getElementById("provincia").value.trim();
    const codigo_postal = document.getElementById("codigo_postal").value.trim();

    const mensaje = document.getElementById("mensaje-pago");

    // Validacion sencilla del numero de tarjeta (16 digitos) y del cvv (3 digitos)
    if (num_tarjeta.length !== 16 || isNaN(num_tarjeta)) {
      mostrarMensaje(mensaje, "El numero de tarjeta debe tener 16 digitos.", "error");
      return;
    }
    if (cvv_tarjeta.length !== 3 || isNaN(cvv_tarjeta)) {
      mostrarMensaje(mensaje, "El CVV debe tener 3 digitos.", "error");
      return;
    }
    if (nombre_suscriptor === "" || direc_user === "" || pais === "" || provincia === "" || codigo_postal === "") {
      mostrarMensaje(mensaje, "Completa todos los campos obligatorios.", "error");
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

// Agrega un archivo nuevo a "archivos_subidos" y recalcula el espacio
function subirArchivo(nombreArchivo, tamanoBytes) {
  const archivos_subidos = leerLista("nubex_archivos");

  // Convertimos el tamaño de bytes a "GB simulados" chiquitos para la demo
  const tamanoSimuladoGB = Math.max(1, Math.round(tamanoBytes / 100000));

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

// Mueve un archivo de "archivos_subidos" a "papelera_archivos"
function moverAPapelera(indice) {
  const archivos_subidos = leerLista("nubex_archivos");
  const papelera_archivos = leerLista("nubex_papelera");

  const archivo = archivos_subidos.splice(indice, 1)[0];
  papelera_archivos.push(archivo);

  guardarLista("nubex_archivos", archivos_subidos);
  guardarLista("nubex_papelera", papelera_archivos);
  recalcularEspacio();
  mostrarSeccion("papelera");
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
  mostrarSeccion("papelera");
}

// Elimina definitivamente un archivo de la papelera
function eliminarDefinitivo(indice) {
  const papelera_archivos = leerLista("nubex_papelera");
  papelera_archivos.splice(indice, 1);
  guardarLista("nubex_papelera", papelera_archivos);
  recalcularEspacio();
  mostrarSeccion("papelera");
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

// Dibuja en pantalla la lista de archivos segun la seccion elegida
function mostrarSeccion(nombreSeccion) {
  const contenedor = document.getElementById("lista-archivos");
  const titulo = document.getElementById("titulo-seccion");
  if (!contenedor) return;

  let listaAMostrar = [];
  let permitirAcciones = "normal"; // "normal" = mover a papelera / compartir | "papelera" = restaurar / eliminar

  if (nombreSeccion === "recientes" || nombreSeccion === "cargas") {
    listaAMostrar = leerLista("nubex_archivos");
    titulo.textContent = nombreSeccion === "recientes" ? "Recientes" : "Cargas";
    permitirAcciones = "normal";
  } else if (nombreSeccion === "papelera") {
    listaAMostrar = leerLista("nubex_papelera");
    titulo.textContent = "Papelera";
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
   7) SOPORTE (soporte.html)
   -------------------------------------------------------- */

function inicializarSoporte() {
  const formularioSoporte = document.getElementById("form-soporte");
  if (!formularioSoporte) return;

  formularioSoporte.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const nombre_user = document.getElementById("nombre_user").value.trim();
    const num_tel_user = document.getElementById("num_tel_user").value.trim();
    const solicitud_user = document.getElementById("solicitud_user").value.trim();

    const mensaje = document.getElementById("mensaje-soporte");

    if (nombre_user === "" || num_tel_user === "" || solicitud_user === "") {
      mostrarMensaje(mensaje, "Completa todos los campos obligatorios.", "error");
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

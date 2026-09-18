/* ==========================================================
   ADMINISTRAR.JS - Logica de administrar.html
   ==========================================================
   Requiere que comun.js este cargado ANTES que este archivo
   (usa leerLista, guardarLista, mostrarMensaje, obtenerExtension,
   recalcularEspacio, actualizarBarraEspacio y ESPACIO_POR_PLAN).
   ========================================================== */

// Guarda cual seccion del panel "Administrar" esta activa ahora mismo
// (recientes, cargas, papelera, configuracion, ayuda o almacenamiento).
// Se usa para poder "refrescar" la vista actual sin saltar a otra seccion.
let seccionActual = "recientes";

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

  // Ocultamos/limpiamos el mensaje general del panel (mensaje-admin).
  // Este mensaje esta afuera de los paneles de abajo, asi que si no lo
  // limpiamos aca, el cartel de "comentario enviado", "nombre actualizado",
  // etc. se queda pegado en pantalla aunque cambies a otra seccion del menu.
  const mensajeAdmin = document.getElementById("mensaje-admin");
  if (mensajeAdmin) {
    mensajeAdmin.textContent = "";
    mensajeAdmin.className = "mensaje";
  }

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

document.addEventListener("DOMContentLoaded", function () {
  inicializarAdministrar();
});

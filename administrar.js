/* ==========================================================
   ADMINISTRAR.JS - Logica de administrar.html
   ==========================================================
   Requiere que comun.js este cargado antes (expone "Nubex").
   Toda la logica del panel vive encapsulada en la clase
   PanelAdministrar: que seccion esta activa es un ATRIBUTO
   PRIVADO de la instancia (#seccionActual), no una variable
   global, asi que no puede llegar a chocar con nada de otro
   archivo.

   Los botones de cada tarjeta de archivo (Eliminar, Compartir,
   Restaurar, Borrar) ya no usan onclick="..." en el HTML
   generado: se identifican con atributos data-accion/data-indice
   y un unico listener delegado en el contenedor los atiende.
   ========================================================== */
(function () {
  "use strict";

  const { ListaStorage, Sesion, Espacio, obtenerExtension, mostrarMensaje, formatearTamano } = Nubex;

  // Opciones de avatar para el perfil (no hay subida de fotos reales en
  // este proyecto, asi que se elige entre un set de emojis)
  const AVATARES = ["👤", "🙂", "😎", "🦊", "🐱", "🚀", "🌙", "⭐", "🐼", "🌵"];

  const archivosStorage = new ListaStorage("nubex_archivos");
  const papeleraStorage = new ListaStorage("nubex_papelera");
  const comentariosStorage = new ListaStorage("nubex_comentarios_ayuda");
  const usuariosStorage = new ListaStorage("nubex_usuarios");

  class PanelAdministrar {
    #seccionActual = "recientes";

    constructor() {
      this.contenedorArchivos = document.getElementById("lista-archivos");
      this.mensajeAdmin = document.getElementById("mensaje-admin");
      this.titulo = document.getElementById("titulo-seccion");
      this.paneles = {
        archivos: document.getElementById("panel-archivos"),
        configuracion: document.getElementById("panel-configuracion"),
        ayuda: document.getElementById("panel-ayuda"),
        almacenamiento: document.getElementById("panel-almacenamiento"),
      };
    }

    init() {
      if (!this.contenedorArchivos) return; // esta pagina no es administrar.html
      if (!Sesion.exigir()) return; // toda la pagina requiere sesion

      // El nombre en la navbar ("Cuenta" -> nombre del cliente) y el href
      // del link ya los resuelve comun.js para TODAS las paginas, no hace
      // falta repetirlo aca.
      this.#inicializarSubidaDeArchivos();
      this.#inicializarMenuLateral();
      this.#inicializarAccionesDeArchivos();
      this.#inicializarLinkCuenta();

      this.mostrarSeccion("recientes");
      Espacio.actualizarBarra();
    }

    // Si ya estoy parado en Administrar, apretar "Cuenta" en la navbar no
    // tiene sentido que recargue la pagina: directamente salta a la
    // seccion de Configuración, que es donde vive todo lo de la cuenta.
    #inicializarLinkCuenta() {
      const enlaceCuenta = document.querySelector(".navbar-cuenta");
      if (!enlaceCuenta) return;

      enlaceCuenta.addEventListener("click", (evento) => {
        evento.preventDefault();
        document.querySelectorAll(".menu-item[data-seccion]").forEach((b) => {
          b.classList.toggle("activo", b.getAttribute("data-seccion") === "configuracion");
        });
        this.mostrarSeccion("configuracion");
      });
    }

    #inicializarSubidaDeArchivos() {
      const input = document.getElementById("input-subir-archivo");
      if (!input) return;

      input.addEventListener("change", () => {
        if (!Sesion.exigir()) return;
        const archivo = input.files[0];
        if (!archivo) return;
        this.subirArchivo(archivo.name, archivo.size);
        input.value = ""; // limpiamos para poder subir de nuevo el mismo archivo
      });
    }

    #inicializarMenuLateral() {
      const botones = document.querySelectorAll(".menu-item[data-seccion]");
      botones.forEach((boton) => {
        boton.addEventListener("click", () => {
          botones.forEach((b) => b.classList.remove("activo"));
          boton.classList.add("activo");
          this.mostrarSeccion(boton.getAttribute("data-seccion"));
        });
      });
    }

    // Un unico listener delegado para todos los botones de las tarjetas de
    // archivo (eliminar / compartir / restaurar / borrar), en vez de un
    // onclick="..." distinto por cada boton generado dinamicamente.
    #inicializarAccionesDeArchivos() {
      this.contenedorArchivos.addEventListener("click", (evento) => {
        const boton = evento.target.closest("[data-accion]");
        if (!boton) return;
        if (!Sesion.exigir()) return;

        const indice = Number(boton.dataset.indice);
        const acciones = {
          papelera: () => this.moverAPapelera(indice),
          compartir: () => this.compartirArchivo(indice),
          restaurar: () => this.restaurarArchivo(indice),
          "borrar-definitivo": () => this.eliminarDefinitivo(indice),
        };

        acciones[boton.dataset.accion]?.();
      });
    }

    /* ----------------------------------------------------
       Archivos: subir / mover a papelera / restaurar / borrar / compartir
       ---------------------------------------------------- */

    // Agrega un archivo nuevo si entra en el espacio del plan contratado;
    // si no entra, avisa y no agrega nada. Usa el tamaño REAL del archivo
    // (en bytes, tal cual lo reporta el navegador), no un numero inventado.
    subirArchivo(nombreArchivo, tamanoBytes) {
      const archivos = archivosStorage.leer();

      const ocupadoActual = archivos.reduce((total, a) => total + (a.tamanoBytes || 0), 0);
      const plan = Espacio.planActual();
      const totalBytes = Espacio.totalDelPlanBytes(plan);

      if (ocupadoActual + tamanoBytes > totalBytes) {
        const disponible = Math.max(0, totalBytes - ocupadoActual);
        mostrarMensaje(
          this.mensajeAdmin,
          `No hay espacio suficiente para subir "${nombreArchivo}" (${formatearTamano(tamanoBytes)}). Te quedan ${formatearTamano(disponible)} libres en tu ${plan}. Borrá archivos o mejorá tu plan desde Comprar.`,
          "error"
        );
        return;
      }

      this.mensajeAdmin.className = "mensaje"; // ocultamos cualquier error anterior

      archivos.push({
        nombre: nombreArchivo,
        tipo: obtenerExtension(nombreArchivo),
        tamanoBytes,
      });
      archivosStorage.guardar(archivos);
      Espacio.recalcular();

      document.querySelectorAll(".menu-item[data-seccion]").forEach((b) => {
        b.classList.toggle("activo", b.getAttribute("data-seccion") === "recientes");
      });
      this.mostrarSeccion("recientes");
    }

    // Mueve un archivo a la papelera, sin saltar de seccion
    moverAPapelera(indice) {
      const archivos = archivosStorage.leer();
      const papelera = papeleraStorage.leer();

      papelera.push(archivos.splice(indice, 1)[0]);
      archivosStorage.guardar(archivos);
      papeleraStorage.guardar(papelera);
      Espacio.recalcular();
      this.mostrarSeccion(this.#seccionActual);
    }

    restaurarArchivo(indice) {
      const archivos = archivosStorage.leer();
      const papelera = papeleraStorage.leer();

      archivos.push(papelera.splice(indice, 1)[0]);
      archivosStorage.guardar(archivos);
      papeleraStorage.guardar(papelera);
      Espacio.recalcular();
      this.mostrarSeccion(this.#seccionActual);
    }

    eliminarDefinitivo(indice) {
      const papelera = papeleraStorage.leer();
      papelera.splice(indice, 1);
      papeleraStorage.guardar(papelera);
      Espacio.recalcular();
      this.mostrarSeccion(this.#seccionActual);
    }

    compartirArchivo(indice) {
      const archivos = archivosStorage.leer();
      const compartidos = new ListaStorage("nubex_compartidos");
      const lista = compartidos.leer();

      lista.push(archivos[indice]);
      compartidos.guardar(lista);
      alert("Archivo compartido con éxito.");
    }

    /* ----------------------------------------------------
       Navegacion entre secciones del menu lateral
       ---------------------------------------------------- */

    mostrarSeccion(nombreSeccion) {
      this.#seccionActual = nombreSeccion;

      Object.values(this.paneles).forEach((panel) => {
        if (panel) panel.style.display = "none";
      });

      // El mensaje general esta fuera de los paneles: si no lo limpiamos
      // aca, un cartel de "nombre actualizado" o "comentario enviado"
      // quedaria pegado en pantalla al cambiar de seccion.
      this.mensajeAdmin.textContent = "";
      this.mensajeAdmin.className = "mensaje";

      const titulos = {
        recientes: "Recientes",
        cargas: "Cargas",
        papelera: "Papelera",
        configuracion: "Configuración",
        ayuda: "Ayuda y comentarios",
        almacenamiento: "Almacenamiento",
      };
      this.titulo.textContent = titulos[nombreSeccion] ?? "";

      if (["recientes", "cargas", "papelera"].includes(nombreSeccion)) {
        this.paneles.archivos.style.display = "block";
        this.#dibujarListaArchivos(nombreSeccion);
      } else if (nombreSeccion === "configuracion") {
        this.paneles.configuracion.style.display = "block";
        this.#dibujarConfiguracion();
      } else if (nombreSeccion === "ayuda") {
        this.paneles.ayuda.style.display = "block";
        this.#dibujarAyuda();
      } else if (nombreSeccion === "almacenamiento") {
        this.paneles.almacenamiento.style.display = "block";
        this.#dibujarAlmacenamiento();
      }
    }

    /* ----------------------------------------------------
       Recientes / Cargas / Papelera
       ---------------------------------------------------- */
    #dibujarListaArchivos(nombreSeccion) {
      const esPapelera = nombreSeccion === "papelera";
      const lista = esPapelera ? papeleraStorage.leer() : archivosStorage.leer();

      if (lista.length === 0) {
        this.contenedorArchivos.innerHTML = `<p class="sin-archivos">No hay archivos para mostrar acá todavía.</p>`;
        return;
      }

      this.contenedorArchivos.innerHTML = lista
        .map((archivo, indice) => this.#tarjetaArchivoHtml(archivo, indice, esPapelera))
        .join("");
    }

    #tarjetaArchivoHtml(archivo, indice, esPapelera) {
      const botones = esPapelera
        ? `<button class="boton boton-chico" data-accion="restaurar" data-indice="${indice}">Restaurar</button>
           <button class="boton boton-chico" data-accion="borrar-definitivo" data-indice="${indice}">Borrar</button>`
        : `<button class="boton boton-chico" data-accion="papelera" data-indice="${indice}">Eliminar</button>
           <button class="boton boton-chico" data-accion="compartir" data-indice="${indice}">Compartir</button>`;

      return `
        <div class="archivo-tarjeta">
          <div class="archivo-icono">📄</div>
          <div class="archivo-tipo">${archivo.tipo}</div>
          <div class="archivo-nombre">${archivo.nombre}</div>
          <div class="archivo-tamano">${formatearTamano(archivo.tamanoBytes || 0)}</div>
          <div class="archivo-acciones">${botones}</div>
        </div>`;
    }

    /* ----------------------------------------------------
       Configuracion / Perfil: avatar, nombre, bio, contraseña, cerrar sesion
       ---------------------------------------------------- */
    #dibujarConfiguracion() {
      const panel = this.paneles.configuracion;
      const sesion = Sesion.obtener();

      if (!sesion) {
        panel.innerHTML = `<p>Iniciá sesión para ver esta sección.</p>`;
        return;
      }

      // Si entro con "llave de acceso" no tiene una cuenta real con password
      const tieneCuentaReal = Boolean(sesion.correo_electronico);
      const avatarActual = sesion.avatar || "👤";

      const avataresHtml = AVATARES.map(
        (emoji) =>
          `<button type="button" class="avatar-opcion${emoji === avatarActual ? " seleccionado" : ""}" data-avatar="${emoji}" aria-label="Usar este avatar">${emoji}</button>`
      ).join("");

      panel.innerHTML = `
        <div class="panel-subseccion">
          <h3>Perfil</h3>
          <div class="perfil-cabecera">
            <div class="perfil-avatar-grande" id="perfil-avatar-preview">${avatarActual}</div>
            <div class="perfil-cabecera-texto">
              <p>Elegí un avatar y cómo te queremos mostrar en el sitio.</p>
            </div>
          </div>
          <div class="selector-avatares">${avataresHtml}</div>

          <div class="campo-formulario">
            <label for="config-nombre">Nombre para mostrar</label>
            <input type="text" id="config-nombre" maxlength="20" value="${sesion.nombre_cliente}">
          </div>
          <div class="campo-formulario">
            <label for="config-bio">Bio (opcional)</label>
            <textarea id="config-bio" rows="2" maxlength="140" placeholder="Contanos algo sobre vos">${sesion.bio || ""}</textarea>
          </div>
          ${tieneCuentaReal ? `<div class="campo-info"><span class="etiqueta">Correo</span><span>${sesion.correo_electronico}</span></div>` : ""}

          <button id="boton-guardar-perfil" class="boton boton-primario">Guardar perfil</button>
        </div>

        ${
          tieneCuentaReal
            ? `<div class="panel-subseccion">
                 <h3>Seguridad</h3>
                 <div class="campo-formulario">
                   <label for="config-pass-actual">Contraseña actual</label>
                   <input type="password" id="config-pass-actual" maxlength="20">
                 </div>
                 <div class="campo-formulario">
                   <label for="config-pass-nueva">Contraseña nueva</label>
                   <input type="password" id="config-pass-nueva" maxlength="20">
                 </div>
                 <button id="boton-cambiar-pass" class="boton boton-primario">Cambiar contraseña</button>
               </div>`
            : `<p class="texto-ayuda-panel">Entraste con llave de acceso, así que no tenés contraseña para cambiar.</p>`
        }

        <button id="boton-cerrar-sesion" class="boton" style="width:100%;">Cerrar sesión</button>`;

      // El avatar elegido se guarda en esta variable hasta que se aprieta
      // "Guardar perfil"; el preview grande se actualiza al toque.
      let avatarSeleccionado = avatarActual;
      panel.querySelectorAll(".avatar-opcion").forEach((boton) => {
        boton.addEventListener("click", () => {
          avatarSeleccionado = boton.dataset.avatar;
          panel.querySelectorAll(".avatar-opcion").forEach((b) => b.classList.remove("seleccionado"));
          boton.classList.add("seleccionado");
          document.getElementById("perfil-avatar-preview").textContent = avatarSeleccionado;
        });
      });

      document.getElementById("boton-guardar-perfil").addEventListener("click", () => {
        if (!Sesion.exigir()) return;
        this.#guardarPerfil(sesion, avatarSeleccionado);
      });

      const botonCambiarPass = document.getElementById("boton-cambiar-pass");
      if (botonCambiarPass) {
        botonCambiarPass.addEventListener("click", () => {
          if (!Sesion.exigir()) return;
          this.#cambiarPassword(sesion);
        });
      }

      document.getElementById("boton-cerrar-sesion").addEventListener("click", () => {
        Sesion.cerrar();
        window.location.href = "login.html";
      });
    }

    #guardarPerfil(sesion, avatarElegido) {
      const nuevoNombre = document.getElementById("config-nombre").value.trim();
      const nuevaBio = document.getElementById("config-bio").value.trim();

      if (nuevoNombre === "") {
        mostrarMensaje(this.mensajeAdmin, "El nombre no puede estar vacío.", "error");
        return;
      }

      sesion.nombre_cliente = nuevoNombre;
      sesion.bio = nuevaBio;
      sesion.avatar = avatarElegido;
      Sesion.guardar(sesion);

      // Si tiene cuenta real, actualizamos tambien su registro de usuario
      if (sesion.correo_electronico) {
        const usuarios = usuariosStorage.leer();
        const usuario = usuarios.find((u) => u.mail_nuevo.toLowerCase() === sesion.correo_electronico.toLowerCase());
        if (usuario) {
          usuario.username_nuevo = nuevoNombre;
          usuariosStorage.guardar(usuarios);
        }
      }

      this.#actualizarNavbarCuenta(sesion);
      mostrarMensaje(this.mensajeAdmin, "Perfil actualizado con éxito.", "exito");
    }

    // Refleja el nombre y el avatar elegidos en el link "Cuenta" de la navbar
    #actualizarNavbarCuenta(sesion) {
      const etiqueta = document.getElementById("etiqueta-nombre-cliente");
      if (etiqueta) etiqueta.textContent = sesion.nombre_cliente;

      const icono = document.querySelector(".navbar-cuenta .icono-usuario");
      if (icono && sesion.avatar) icono.textContent = sesion.avatar;
    }

    #cambiarPassword(sesion) {
      const passActual = document.getElementById("config-pass-actual").value;
      const passNueva = document.getElementById("config-pass-nueva").value;

      if (passActual === "" || passNueva === "") {
        mostrarMensaje(this.mensajeAdmin, "Completá los dos campos de contraseña.", "error");
        return;
      }

      const usuarios = usuariosStorage.leer();
      const usuario = usuarios.find((u) => u.mail_nuevo.toLowerCase() === sesion.correo_electronico.toLowerCase());

      if (!usuario || usuario.password_nuevo !== passActual) {
        mostrarMensaje(this.mensajeAdmin, "La contraseña actual es incorrecta.", "error");
        return;
      }

      usuario.password_nuevo = passNueva;
      usuariosStorage.guardar(usuarios);

      document.getElementById("config-pass-actual").value = "";
      document.getElementById("config-pass-nueva").value = "";
      mostrarMensaje(this.mensajeAdmin, "Contraseña actualizada con éxito.", "exito");
    }

    /* ----------------------------------------------------
       Ayuda y comentarios
       ---------------------------------------------------- */
    #dibujarAyuda() {
      const panel = this.paneles.ayuda;
      const comentarios = comentariosStorage.leer();

      const listaComentariosHtml =
        comentarios.length === 0
          ? `<p class="texto-ayuda-panel">Todavía no dejaste ningún comentario.</p>`
          : comentarios
              .slice()
              .reverse()
              .map(
                (c) => `
                <div class="comentario-tarjeta">
                  <div class="comentario-fecha">${c.fecha}</div>
                  <div>${c.texto}</div>
                </div>`
              )
              .join("");

      panel.innerHTML = `
        <div style="margin-bottom:30px;">
          <h3>Preguntas frecuentes</h3>
          <p><strong>¿Cómo subo un archivo?</strong><br>Andá a Recientes o Cargas y hacé clic en la zona de subida.</p>
          <p><strong>¿Cómo libero espacio?</strong><br>Movés archivos a la papelera, los borrás definitivamente, o mejorás tu plan desde Comprar.</p>
          <p><strong>¿Cómo cambio mi contraseña?</strong><br>Desde la sección Configuración del menú.</p>
        </div>
        <div class="campo-formulario">
          <label for="comentario-ayuda">Dejanos tu comentario o consulta</label>
          <textarea id="comentario-ayuda" rows="4" maxlength="500"></textarea>
        </div>
        <button id="boton-enviar-comentario" class="boton boton-primario">Enviar comentario</button>
        <div style="margin-top:26px;">
          <h3>Tus comentarios anteriores</h3>
          ${listaComentariosHtml}
        </div>`;

      document.getElementById("boton-enviar-comentario").addEventListener("click", () => {
        if (!Sesion.exigir()) return;
        const texto = document.getElementById("comentario-ayuda").value.trim();

        if (texto === "") {
          mostrarMensaje(this.mensajeAdmin, "Escribí un comentario antes de enviarlo.", "error");
          return;
        }

        const lista = comentariosStorage.leer();
        lista.push({ texto, fecha: new Date().toLocaleString() });
        comentariosStorage.guardar(lista);

        mostrarMensaje(this.mensajeAdmin, "Gracias por tu comentario.", "exito");
        this.#dibujarAyuda(); // volvemos a dibujar para que aparezca el comentario nuevo
      });
    }

    /* ----------------------------------------------------
       Almacenamiento: resumen de plan, espacio y archivos por tipo
       ---------------------------------------------------- */
    #dibujarAlmacenamiento() {
      const panel = this.paneles.almacenamiento;
      const archivos = archivosStorage.leer();
      const papelera = papeleraStorage.leer();
      const plan = Espacio.planActual();
      const totalGB = Espacio.totalDelPlanGB(plan);
      const totalBytes = Espacio.totalDelPlanBytes(plan);
      const ocupado = parseInt(localStorage.getItem("nubex_espacio_ocup_bytes") || "0", 10);
      const libre = Math.max(0, totalBytes - ocupado);
      const porcentaje = totalBytes > 0 ? Math.min(100, (ocupado / totalBytes) * 100) : 0;

      const porTipo = {};
      archivos.forEach((archivo) => {
        porTipo[archivo.tipo] ??= { cantidad: 0, tamanoBytes: 0 };
        porTipo[archivo.tipo].cantidad += 1;
        porTipo[archivo.tipo].tamanoBytes += archivo.tamanoBytes || 0;
      });

      const tipos = Object.keys(porTipo);
      const tarjetasTipo =
        tipos.length === 0
          ? `<p class="texto-ayuda-panel">Todavía no subiste archivos.</p>`
          : `<div class="fila-archivos">${tipos
              .map(
                (tipo) => `
                <div class="archivo-tarjeta">
                  <div class="archivo-icono">📄</div>
                  <div class="archivo-tipo">${tipo}</div>
                  <div style="font-size:12px; margin-top:6px;">${porTipo[tipo].cantidad} archivo(s)</div>
                  <div class="archivo-tamano">${formatearTamano(porTipo[tipo].tamanoBytes)}</div>
                </div>`
              )
              .join("")}</div>`;

      panel.innerHTML = `
        <div class="resumen-almacenamiento">
          <p><strong>Plan actual:</strong> ${plan}</p>
          <div class="barra-espacio-contenedor"><div class="barra-espacio-relleno" style="width:${porcentaje}%;"></div></div>
          <p class="texto-ayuda-panel">${formatearTamano(ocupado)} usados de ${totalGB} GB (${formatearTamano(libre)} libres)</p>
          <p><strong>Archivos en papelera:</strong> ${papelera.length}</p>
        </div>
        <h3 style="margin-top:26px;">Espacio por tipo de archivo</h3>
        ${tarjetasTipo}
        <a href="comprar.html" class="boton boton-primario" style="display:inline-block; margin-top:26px;">Mejorar mi plan</a>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => new PanelAdministrar().init());
})();

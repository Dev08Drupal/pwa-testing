#!/usr/bin/env node

const chokidar = require("chokidar");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Configuración
const config = {
  scssDir: "./scss",
  cssDir: "./css",
  componentsDir: "./scss/components",
};

let isBuilding = false;
let buildQueue = new Set();

/**
 * Ejecutar comando y mostrar resultado
 */
function execCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 ${description}...`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error en ${description}:`, error.message);
        reject(error);
        return;
      }

      if (stderr) {
        console.warn(`⚠️  Advertencia en ${description}:`, stderr);
      }

      if (stdout) {
        console.log(stdout);
      }

      console.log(`✅ ${description} completado`);
      resolve();
    });
  });
}

/**
 * Procesar cola de builds
 */
async function processBuildQueue() {
  if (isBuilding || buildQueue.size === 0) {
    return;
  }

  isBuilding = true;
  const tasks = Array.from(buildQueue);
  buildQueue.clear();

  console.log("\n🚀 Procesando cambios:", tasks.join(", "));

  try {
    // Compilar Sass
    if (tasks.includes("sass")) {
      await execCommand("sass scss:css --style expanded", "Compilando Sass");
    }

    // PostCSS
    if (tasks.includes("postcss")) {
      await execCommand("postcss css/*.css --use autoprefixer -d css/", "Procesando CSS base");
      await execCommand("postcss css/components/**/*.css --use autoprefixer -d css/components/", "Procesando CSS componentes");
    }

    // Regenerar librerías
    if (tasks.includes("libraries")) {
      await execCommand("node build-libraries.js", "Regenerando librerías");
    }

    console.log("✨ Build completado exitosamente\n");
  } catch (error) {
    console.error("❌ Error durante el build:", error.message);
  } finally {
    isBuilding = false;

    // Procesar nueva cola si hay más cambios
    setTimeout(processBuildQueue, 100);
  }
}

/**
 * Manejar cambios en archivos
 */
function handleFileChange(filePath, eventType) {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(`📁 ${eventType}: ${relativePath}`);

  // Determinar qué acciones tomar
  if (filePath.includes("/scss/")) {
    buildQueue.add("sass");
    buildQueue.add("postcss");

    // Si es un archivo de componente, regenerar librerías
    if (filePath.includes("/scss/components/")) {
      buildQueue.add("libraries");
    }
  }

  // Procesar cola después de un pequeño delay (debounce)
  setTimeout(processBuildQueue, 500);
}

/**
 * Configurar watchers
 */
function setupWatchers() {
  console.log("👀 Iniciando sistema de watch...\n");

  // Watch archivos SCSS
  const scssWatcher = chokidar.watch(["./scss/**/*.scss"], {
    ignoreInitial: true,
    persistent: true,
  });

  scssWatcher
    .on("add", (filePath) => handleFileChange(filePath, "Añadido"))
    .on("change", (filePath) => handleFileChange(filePath, "Modificado"))
    .on("unlink", (filePath) => {
      handleFileChange(filePath, "Eliminado");
      // Si se elimina un componente, regenerar librerías
      if (filePath.includes("/scss/components/")) {
        buildQueue.add("libraries");
      }
    });

  // Watch configuraciones de build
  const configWatcher = chokidar.watch(["./build-libraries.js", "./package.json", "./postcss.config.js"], {
    ignoreInitial: true,
    persistent: true,
  });

  configWatcher.on("change", (filePath) => {
    console.log(`🔧 Configuración modificada: ${path.relative(process.cwd(), filePath)}`);
    buildQueue.add("libraries");
    setTimeout(processBuildQueue, 500);
  });

  console.log("✅ Watchers configurados");
  console.log("📦 Watching:");
  console.log("  - scss/**/*.scss");
  console.log("  - build-libraries.js");
  console.log("  - package.json");
  console.log("  - postcss.config.js");
  console.log("\n🎯 Listo para detectar cambios...\n");
}

/**
 * Build inicial
 */
async function initialBuild() {
  console.log("🔨 Ejecutando build inicial...\n");

  try {
    // Limpiar directorio CSS
    if (fs.existsSync(config.cssDir)) {
      await execCommand("rimraf css", "Limpiando CSS existente");
    }

    // Build completo
    await execCommand("sass scss:css --style expanded", "Compilando Sass");
    await execCommand("postcss css/*.css --use autoprefixer -d css/", "Procesando CSS base");
    await execCommand("postcss css/components/**/*.css --use autoprefixer -d css/components/", "Procesando CSS componentes");
    await execCommand("node build-libraries.js", "Generando librerías");

    console.log("✅ Build inicial completado\n");
  } catch (error) {
    console.error("❌ Error en build inicial:", error.message);
    process.exit(1);
  }
}

/**
 * Función principal
 */
async function main() {
  console.log("🚀 Iniciando sistema de desarrollo automatizado\n");

  // Verificar que existan las dependencias
  if (!fs.existsSync("./node_modules")) {
    console.log("📦 Instalando dependencias...");
    await execCommand("npm install", "Instalando dependencias");
  }

  // Build inicial
  await initialBuild();

  // Configurar watchers
  setupWatchers();

  // Manejar señales de terminación
  process.on("SIGINT", () => {
    console.log("\n🛑 Deteniendo watchers...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 Deteniendo watchers...");
    process.exit(0);
  });
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, setupWatchers, processBuildQueue };

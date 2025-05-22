#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Configuración
const config = {
  scssComponentsDir: "./scss/components",
  cssComponentsDir: "./css/components",
  tempDir: "./temp-partials",
};

/**
 * Crear archivos temporales para compilar partials
 */
function createTempFilesForPartials() {
  console.log("🔄 Creando archivos temporales para compilar partials...");

  // Crear directorio temporal
  if (!fs.existsSync(config.tempDir)) {
    fs.mkdirSync(config.tempDir, { recursive: true });
  }

  const tempFiles = [];

  // Buscar todos los archivos partial (_*.scss)
  function findPartials(dir, relativePath = "") {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);

    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const itemRelativePath = path.join(relativePath, item);

      if (fs.statSync(fullPath).isDirectory()) {
        // Recursivo para subdirectorios
        findPartials(fullPath, itemRelativePath);
      } else if (item.startsWith("_") && item.endsWith(".scss")) {
        // Es un partial
        const componentName = item.replace(/^_/, "").replace(/\.scss$/, "");
        const folderName = path.basename(path.dirname(fullPath));

        // Crear archivo temporal que importe el partial
        const tempFileName = `${folderName}-${componentName}.scss`;
        const tempFilePath = path.join(config.tempDir, tempFileName);

        // Ruta relativa desde el archivo temporal al partial
        const partialPath = path.relative(config.tempDir, fullPath).replace(/\\/g, "/");

        const tempContent = `// Archivo temporal para compilar partial
@import '${partialPath}';
`;

        fs.writeFileSync(tempFilePath, tempContent);

        tempFiles.push({
          tempFile: tempFilePath,
          originalPartial: fullPath,
          componentName: componentName,
          folderName: folderName,
          outputPath: path.join(config.cssComponentsDir, folderName, `${componentName}.css`),
        });

        console.log(`   📄 ${folderName}/_${componentName}.scss → ${tempFileName}`);
      }
    });
  }

  findPartials(config.scssComponentsDir);

  return tempFiles;
}

/**
 * Compilar archivos temporales
 */
function compilePartials(tempFiles) {
  console.log("\n🔨 Compilando partials...");

  const promises = tempFiles.map((fileInfo) => {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(fileInfo.outputPath);

      // Crear directorio de salida si no existe
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const command = `sass "${fileInfo.tempFile}" "${fileInfo.outputPath}" --style expanded --load-path=scss`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`   ❌ Error compilando ${fileInfo.componentName}:`, error.message);
          reject(error);
          return;
        }

        if (stderr) {
          console.warn(`   ⚠️  Advertencia en ${fileInfo.componentName}:`, stderr);
        }

        console.log(`   ✅ ${fileInfo.folderName}/${fileInfo.componentName}.css`);
        resolve();
      });
    });
  });

  return Promise.all(promises);
}

/**
 * Limpiar archivos temporales
 */
function cleanupTempFiles() {
  console.log("\n🧹 Limpiando archivos temporales...");

  if (fs.existsSync(config.tempDir)) {
    fs.rmSync(config.tempDir, { recursive: true, force: true });
    console.log("   ✅ Archivos temporales eliminados");
  }
}

/**
 * Función principal
 */
async function main() {
  console.log("🚀 Compilando partials de componentes...\n");

  try {
    // Crear archivos temporales
    const tempFiles = createTempFilesForPartials();

    if (tempFiles.length === 0) {
      console.log("⚠️  No se encontraron archivos partial para compilar");
      return;
    }

    // Compilar
    await compilePartials(tempFiles);

    // Limpiar
    cleanupTempFiles();

    console.log(`\n✨ ¡${tempFiles.length} archivos compilados exitosamente!`);
  } catch (error) {
    console.error("\n❌ Error durante la compilación:", error.message);
    cleanupTempFiles(); // Limpiar incluso en caso de error
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main, createTempFilesForPartials, compilePartials };

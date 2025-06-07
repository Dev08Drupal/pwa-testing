const path = require("path");
const glob = require("glob");
const fs = require("fs");
const TerserPlugin = require("terser-webpack-plugin");

// Función para encontrar automáticamente todos los archivos JS
function getEntries() {
  const entries = {};
  // Busca todos los archivos .js en js/src y sus subdirectorios
  const files = glob.sync("./js/src/**/*.js").filter((file) => {
    // Verifica que el archivo exista
    return fs.existsSync(file);
  });

  if (files.length === 0) {
    console.log("⚠️  No se encontraron archivos JS en js/src/");
    console.log("   Creando entrada por defecto...");
    // Crea un archivo JS por defecto si no existe ninguno
    const defaultDir = "./js/src";
    const defaultFile = "./js/src/main.js";
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    if (!fs.existsSync(defaultFile)) {
      fs.writeFileSync(
        defaultFile,
        `// Archivo JS principal
console.log('Tema PWA Testing inicializado');
// Drupal behavior example
(function (Drupal) {
  'use strict';
  Drupal.behaviors.pwaTestingMain = {
    attach: function (context, settings) {
      console.log('PWA Testing theme loaded');
    }
  };
})(Drupal);
`
      );
    }
    entries["main"] = defaultFile;
  } else {
    files.forEach((file) => {
      // Usa path.resolve para obtener la ruta absoluta
      const absolutePath = path.resolve(__dirname, file);
      // Calcula el path relativo desde js/src
      const relativePath = path.relative(path.resolve(__dirname, "./js/src"), absolutePath);
      // Normaliza para usar / en lugar de \ en Windows
      const normalizedPath = relativePath.replace(/\\/g, "/");
      // Remueve la extensión .js
      const name = normalizedPath.replace(/\.js$/, "");
      entries[name] = absolutePath;
    });
  }

  console.log("📦 Archivos JS encontrados:", Object.keys(entries));
  return entries;
}

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";
  const isDevCompressed = argv.watch && isProduction; // Detecta si es dev-compressed

  return {
    entry: getEntries(),
    output: {
      path: path.resolve(__dirname, "js/dist"),
      filename: (pathData) => {
        // Mantiene la estructura de carpetas en el output
        const name = pathData.chunk.name;
        return isProduction ? `${name}.min.js` : `${name}.js`;
      },
      clean: true,
    },
    devtool: isProduction && !isDevCompressed ? false : "source-map", // Source maps en dev-compressed
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              // Solo elimina console.log en build de producción real, no en dev-compressed
              drop_console: isProduction && !isDevCompressed,
            },
            format: {
              comments: false, // Elimina comentarios
            },
          },
          extractComments: false,
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        },
      ],
    },
    watch: argv.mode === "development" || isDevCompressed,
    watchOptions: {
      ignored: /node_modules/,
      poll: 1000,
    },
  };
};

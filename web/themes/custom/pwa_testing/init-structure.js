// init-structure.js
const fs = require("fs");
const path = require("path");

// Estructura de carpetas a crear
const directories = [
  "js/src",
  "js/src/components/paragraph",
  "js/src/components/blocks",
  "js/src/components/forms",
  "js/src/utils",
  "scss/components/paragraph",
  "scss/components/blocks",
  "scss/components/forms",
  "scss/base",
  "scss/utilities",
];

// Archivos ejemplo a crear
const exampleFiles = {
  "js/src/main.js": `// Archivo JS principal
console.log('Tema PWA Testing inicializado');

// Drupal behavior example
(function (Drupal) {
  'use strict';

  Drupal.behaviors.pwaTestingMain = {
    attach: function (context, settings) {
      console.log('PWA Testing theme loaded');
    }
  };

})(Drupal);`,

  "js/src/components/paragraph/text-image.js": `// Text Image Paragraph Component
(function (Drupal) {
  'use strict';

  Drupal.behaviors.textImageParagraph = {
    attach: function (context, settings) {
      const textImageElements = context.querySelectorAll('.paragraph--type--text-image');
      
      textImageElements.forEach(element => {
        console.log('Text Image paragraph initialized');
        
        // Ejemplo: lazy loading de imágenes
        const images = element.querySelectorAll('img');
        images.forEach(img => {
          if ('loading' in HTMLImageElement.prototype) {
            img.loading = 'lazy';
          }
        });
      });
    }
  };

})(Drupal);`,

  "scss/style.scss": `// Archivo SCSS principal con sintaxis moderna
@use 'base/reset';
@use 'utilities/variables';

// Componentes
@use 'components/paragraph/text-image';`,

  "scss/utilities/_variables.scss": `// Variables SCSS modernas
$primary-color: #007bff !default;
$secondary-color: #6c757d !default;
$text-color: #333 !default;
$background-color: #fff !default;
$border-radius: 8px !default;
$spacing-unit: 1rem !default;

// También exportamos como CSS custom properties
:root {
  --primary-color: #{$primary-color};
  --secondary-color: #{$secondary-color};
  --text-color: #{$text-color};
  --background-color: #{$background-color};
  --border-radius: #{$border-radius};
  --spacing-unit: #{$spacing-unit};
}`,

  "scss/base/_reset.scss": `// Reset básico moderno
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background-color);
}

img {
  max-width: 100%;
  height: auto;
}

a {
  text-decoration: none;
  color: var(--primary-color);
  
  &:hover {
    text-decoration: underline;
  }
}`,

  "scss/components/paragraph/text-image.scss": `// Text Image Paragraph simple y funcional
@use '../../utilities/variables' as vars;

.paragraph--type--text-image {
  display: flex;
  align-items: center;
  gap: calc(vars.$spacing-unit * 2);
  margin: calc(vars.$spacing-unit * 2) 0;
  
  .field--name-field-image {
    flex: 1;
    
    img {
      width: 100%;
      height: auto;
      border-radius: vars.$border-radius;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }
  
  .field--name-field-text {
    flex: 1;
    
    h2, h3 {
      color: vars.$text-color;
      margin-bottom: vars.$spacing-unit;
      font-weight: 600;
    }
    
    p {
      line-height: 1.6;
      color: vars.$text-color;
      margin-bottom: vars.$spacing-unit;
    }
    
    .btn {
      background-color: vars.$primary-color;
      color: white;
      padding: calc(vars.$spacing-unit * 0.5) vars.$spacing-unit;
      border: none;
      border-radius: vars.$border-radius;
      cursor: pointer;
      transition: opacity 0.2s ease;
      text-decoration: none;
      display: inline-block;
      
      &:hover {
        opacity: 0.9;
      }
    }
  }
  
  // Responsive sin mixin
  @media (max-width: 768px) {
    flex-direction: column;
    gap: vars.$spacing-unit;
    
    .field--name-field-image,
    .field--name-field-text {
      flex: none;
      width: 100%;
    }
  }
  
  // Variante con imagen a la derecha
  &.image-right {
    flex-direction: row-reverse;
  }
}`,

  "scss/utilities/_mixins.scss": `// Mixins SCSS
@mixin button-style($bg-color: var(--primary-color)) {
  background-color: $bg-color;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
}`,

  "scss/components/paragraph/text-image.scss": `// Text Image Paragraph con @use moderno
@use '../../utilities/variables' as vars;
@use '../../utilities/mixins' as mix;

.paragraph--type--text-image {
  display: flex;
  align-items: center;
  gap: calc(vars.$spacing-unit * 2);
  margin: calc(vars.$spacing-unit * 2) 0;
  
  .field--name-field-image {
    flex: 1;
    
    img {
      width: 100%;
      height: auto;
      border-radius: vars.$border-radius;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }
  
  .field--name-field-text {
    flex: 1;
    
    h2, h3 {
      color: vars.$text-color;
      margin-bottom: vars.$spacing-unit;
      font-weight: 600;
    }
    
    p {
      line-height: 1.6;
      color: vars.$text-color;
      margin-bottom: vars.$spacing-unit;
    }
    
    .btn {
      @include mix.button-style();
    }
  }
  
  // Variante con imagen a la derecha
  &.image-right {
    flex-direction: row-reverse;
  }
}`,
};

console.log("🚀 Inicializando estructura de carpetas...");

// Crear directorios
directories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log("✅ Carpeta creada:", dir);
  } else {
    console.log("📁 Carpeta ya existe:", dir);
  }
});

// Crear archivos ejemplo
Object.entries(exampleFiles).forEach(([filePath, content]) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log("📄 Archivo creado:", filePath);
  } else {
    console.log("📋 Archivo ya existe:", filePath);
  }
});

console.log("\n✨ Estructura inicializada correctamente!");
console.log("\n📋 Próximos pasos:");
console.log("1. npm run dev - Para desarrollo");
console.log("2. npm run build - Para producción");
console.log("\n🎯 Archivos listos para editar:");
console.log("- scss/components/paragraph/text-image.scss");
console.log("- js/src/components/paragraph/text-image.js");

// Text Image Paragraph Component
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

})(Drupal);
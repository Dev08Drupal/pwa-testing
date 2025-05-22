<?php

/**
 * @file
 * Funciones automáticamente generadas para el tema pwa_testing
 * 
 * ESTE ARCHIVO ES GENERADO AUTOMÁTICAMENTE POR build-libraries.js
 * No editar manualmente - los cambios se perderán en el próximo build
 * 
 * Generado: 2025-05-22T04:12:32.776Z
 */

use Drupal\Core\Form\FormStateInterface;

/**
 * Auto-attach libraries for paragraphs.
 */
function pwa_testing_auto_preprocess_paragraph(&$variables) {
  $paragraph = $variables['paragraph'];
  $bundle = $paragraph->bundle();
  
  // Mapear tipos de párrafo a librerías (generado automáticamente)
  $paragraph_libraries = [
    'text_image' => 'pwa_testing/paragraph-text-image',
  ];
  
  // Cargar librería específica del párrafo
  if (isset($paragraph_libraries[$bundle])) {
    $variables['#attached']['library'][] = $paragraph_libraries[$bundle];
  }
  
  // Añadir clases CSS específicas
  $variables['attributes']['class'][] = 'paragraph';
  $variables['attributes']['class'][] = 'paragraph--type--' . str_replace('_', '-', $bundle);
  $variables['attributes']['class'][] = 'paragraph--view-mode--' . $variables['view_mode'];
}


<?php

/**
 * @file
 * Configuración específica para Render.com
 */

// Verificar si estamos en Render.com
if (getenv('RENDER') === 'true') {

  // Configuración de base de datos desde DATABASE_URL
  $database_url = getenv('DATABASE_URL');
  if ($database_url) {
    // Parsear DATABASE_URL de Render (formato: postgresql://user:pass@host:port/dbname)
    $db_parts = parse_url($database_url);

    $databases['default']['default'] = [
      'database' => isset($db_parts['path']) ? ltrim($db_parts['path'], '/') : 'drupal',
      'username' => isset($db_parts['user']) ? $db_parts['user'] : 'drupal',
      'password' => isset($db_parts['pass']) ? $db_parts['pass'] : '',
      'host' => isset($db_parts['host']) ? $db_parts['host'] : 'localhost',
      'port' => isset($db_parts['port']) ? $db_parts['port'] : 5432,
      'driver' => 'pgsql',
      'prefix' => '',
      'collation' => 'utf8mb4_general_ci',
      'namespace' => 'Drupal\\pgsql\\Driver\\Database\\pgsql',
    ];
  }

  // Hash salt desde variable de entorno
  $hash_salt = getenv('HASH_SALT');
  if ($hash_salt) {
    $settings['hash_salt'] = $hash_salt;
  }

  // Trusted host patterns
  $render_app_name = getenv('RENDER_SERVICE_NAME');
  if ($render_app_name) {
    $settings['trusted_host_patterns'] = [
      '^' . preg_quote($render_app_name) . '\.onrender\.com$',
      '^www\.' . preg_quote($render_app_name) . '\.onrender\.com$',
    ];
  }

  // Configuración de archivos
  $settings['file_public_path'] = 'sites/default/files';
  $settings['file_private_path'] = 'sites/default/files/private';
  $settings['file_temp_path'] = 'sites/default/files/tmp';

  // Configuración de directorios
  $settings['config_sync_directory'] = '../config';

  // Configuración de rendimiento para producción
  $config['system.performance']['cache']['page']['max_age'] = 3600;
  $config['system.performance']['css']['preprocess'] = TRUE;
  $config['system.performance']['css']['gzip'] = TRUE;
  $config['system.performance']['js']['preprocess'] = TRUE;
  $config['system.performance']['js']['gzip'] = TRUE;
  $config['system.performance']['response']['gzip'] = TRUE;

  // Deshabilitar mensajes de error en producción
  $config['system.logging']['error_level'] = 'hide';

  // Configuración de sesiones
  $settings['session_write_interval'] = 180;

  // Configuración HTTPS
  $settings['reverse_proxy'] = TRUE;
  $settings['reverse_proxy_addresses'] = ['127.0.0.1'];
  $settings['reverse_proxy_trusted_headers'] =
    \Symfony\Component\HttpFoundation\Request::HEADER_X_FORWARDED_FOR |
    \Symfony\Component\HttpFoundation\Request::HEADER_X_FORWARDED_HOST |
    \Symfony\Component\HttpFoundation\Request::HEADER_X_FORWARDED_PORT |
    \Symfony\Component\HttpFoundation\Request::HEADER_X_FORWARDED_PROTO;

  // PWA - Configuración para modo dev
  $config['pwa.config']['offline_page'] = '/offline';
  $config['pwa.config']['cache_version'] = time();

  // Habilitar agregación de CSS/JS
  $config['system.performance']['css']['preprocess'] = TRUE;
  $config['system.performance']['js']['preprocess'] = TRUE;

  // Configuración de caché
  $settings['cache']['default'] = 'cache.backend.database';

  // Configurar el servicio de caché de entidades
  $settings['cache']['bins']['entity'] = 'cache.backend.database';
  $settings['cache']['bins']['menu'] = 'cache.backend.database';
  $settings['cache']['bins']['render'] = 'cache.backend.database';
  $settings['cache']['bins']['data'] = 'cache.backend.database';
  $settings['cache']['bins']['discovery'] = 'cache.backend.database';
  $settings['cache']['bins']['dynamic_page_cache'] = 'cache.backend.database';
  $settings['cache']['bins']['bootstrap'] = 'cache.backend.database';
  $settings['cache']['bins']['config'] = 'cache.backend.database';

  // Modo de estado del sitio
  $config['system.site']['name'] = 'PWA Drupal 11';

  // Configuración para desarrollo PWA
  if (getenv('ENVIRONMENT') === 'development') {
    // Deshabilitar caché para desarrollo
    $config['system.performance']['css']['preprocess'] = FALSE;
    $config['system.performance']['js']['preprocess'] = FALSE;
    $settings['cache']['bins']['render'] = 'cache.backend.null';
    $settings['cache']['bins']['dynamic_page_cache'] = 'cache.backend.null';
    $settings['cache']['bins']['page'] = 'cache.backend.null';

    // Mostrar errores en desarrollo
    $config['system.logging']['error_level'] = 'verbose';
  }
}

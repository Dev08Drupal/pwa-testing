<?php

/**
 * Load services definition file.
 */
$settings['container_yamls'][] = __DIR__ . '/services.yml';

/**
 * Include the Pantheon-specific settings file.
 *
 * n.b. The settings.pantheon.php file makes some changes
 *      that affect all environments that this site
 *      exists in.  Always include this file, even in
 *      a local development environment, to ensure that
 *      the site settings remain consistent.
 */
include __DIR__ . "/settings.pantheon.php";

/**
 * Skipping permissions hardening will make scaffolding
 * work better, but will also raise a warning when you
 * install Drupal.
 *
 * https://www.drupal.org/project/drupal/issues/3091285
 */
// $settings['skip_permissions_hardening'] = TRUE;

/**
 * If there is a local settings file, then include it
 */
$local_settings = __DIR__ . "/settings.local.php";
if (file_exists($local_settings)) {
  include $local_settings;
}

// Bypass automático para advertencia de Pantheon
if (isset($_ENV['PANTHEON_ENVIRONMENT']) && $_ENV['PANTHEON_ENVIRONMENT'] === 'dev') {
  // Si no existe la cookie y no es una request AJAX/API
  if (!isset($_COOKIE['Deterrence-Bypass']) && !isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    // Solo para requests normales de navegador
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (strpos($user_agent, 'Mozilla') !== false) {
      setcookie('Deterrence-Bypass', '1', [
        'expires' => time() + 86400,
        'path' => '/',
        'domain' => '.pantheonsite.io',
        'secure' => true,
        'httponly' => false,
        'samesite' => 'Lax'
      ]);

      // Solo redirigir si no es manifest.json o service worker
      $request_uri = $_SERVER['REQUEST_URI'] ?? '';
      if (!in_array($request_uri, ['/manifest.json', '/service-worker-data', '/sw.js'])) {
        header('Location: ' . $request_uri);
        exit;
      }
    }
  }
}

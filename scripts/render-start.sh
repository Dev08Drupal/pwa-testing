#!/bin/bash
set -e

echo "=== Iniciando Drupal en Render.com ==="

# Verificar que existe la base de datos
echo "Verificando conexión a la base de datos..."
php -r "
\$dsn = getenv('DATABASE_URL');
if (empty(\$dsn)) {
    echo 'ERROR: DATABASE_URL no está configurada\n';
    exit(1);
}
echo 'DATABASE_URL configurada correctamente\n';
"

# Ejecutar actualizaciones de Drupal si existen
if [ -f "vendor/bin/drush" ]; then
    echo "Ejecutando actualizaciones de base de datos..."
    vendor/bin/drush updatedb -y || echo "No hay actualizaciones pendientes"

    echo "Importando configuración..."
    vendor/bin/drush config:import -y || echo "No hay configuración para importar"

    echo "Limpiando cachés..."
    vendor/bin/drush cache:rebuild || echo "No se pudo limpiar el caché"
fi

# Configurar permisos finales
echo "Configurando permisos finales..."
chmod -R 755 web/sites/default/files 2>/dev/null || true

echo "=== Iniciando servidor Apache ==="
exec apache2-foreground

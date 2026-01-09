#!/bin/bash
set -e

echo "=== Iniciando build de Drupal para Render.com ==="

# Instalar dependencias de Composer
echo "Instalando dependencias de Composer..."
composer install --no-dev --optimize-autoloader --no-interaction

# Crear directorios necesarios
echo "Creando directorios necesarios..."
mkdir -p web/sites/default/files
mkdir -p web/sites/default/files/tmp
mkdir -p web/sites/default/files/private

# Configurar permisos
echo "Configurando permisos..."
chmod -R 755 web/sites/default/files

echo "=== Build completado exitosamente ==="

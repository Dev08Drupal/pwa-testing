#!/bin/bash
set -e

echo "=== Descargando archivos desde backup ==="

# URL del archivo comprimido (configurar esta variable)
FILES_URL="${FILES_BACKUP_URL:-}"

# Directorio de destino
FILES_DIR="/app/web/sites/default/files"

# Verificar que la URL está configurada
if [ -z "$FILES_URL" ]; then
    echo "⚠ FILES_BACKUP_URL no está configurada"
    echo "Saltando descarga de archivos..."
    exit 0
fi

echo "URL de descarga: $FILES_URL"

# Crear directorio temporal
TMP_DIR=$(mktemp -d)
DOWNLOAD_FILE="$TMP_DIR/files.tar.gz"

echo "Descargando archivos..."
if curl -L "$FILES_URL" -o "$DOWNLOAD_FILE" --progress-bar; then
    echo "✓ Descarga completada"
else
    echo "✗ Error al descargar archivos"
    rm -rf "$TMP_DIR"
    exit 1
fi

# Verificar que el archivo se descargó correctamente
if [ ! -f "$DOWNLOAD_FILE" ]; then
    echo "✗ Archivo no encontrado después de descarga"
    rm -rf "$TMP_DIR"
    exit 1
fi

FILE_SIZE=$(du -h "$DOWNLOAD_FILE" | cut -f1)
echo "Tamaño del archivo descargado: $FILE_SIZE"

# Extraer archivos
echo "Extrayendo archivos..."
if tar -xzf "$DOWNLOAD_FILE" -C "$FILES_DIR" 2>/dev/null; then
    echo "✓ Archivos extraídos"
else
    echo "⚠ Advertencia: Algunos archivos no se pudieron extraer"
fi

# Ajustar permisos
echo "Ajustando permisos..."
chown -R www-data:www-data "$FILES_DIR" || true
chmod -R 775 "$FILES_DIR" || true

# Limpiar
rm -rf "$TMP_DIR"

echo "✓ Archivos restaurados exitosamente"

# Mostrar estadísticas
FILE_COUNT=$(find "$FILES_DIR" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$FILES_DIR" | cut -f1)
echo ""
echo "Estadísticas:"
echo "  Archivos: $FILE_COUNT"
echo "  Tamaño total: $TOTAL_SIZE"
echo ""

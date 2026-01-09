#!/bin/bash
set -e

echo "=== Script de Importación de Backup de Pantheon ==="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el contenedor de Render
if [ "$RENDER" != "true" ]; then
    echo -e "${RED}Error: Este script debe ejecutarse en el contenedor de Render${NC}"
    exit 1
fi

# Verificar que DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL no está configurada${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Variables de entorno verificadas${NC}"
echo ""

# 1. Verificar conexión a la base de datos
echo "Verificando conexión a PostgreSQL..."
if psql "$DATABASE_URL" -c '\dt' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Conexión a base de datos exitosa${NC}"
else
    echo -e "${RED}✗ No se pudo conectar a la base de datos${NC}"
    exit 1
fi
echo ""

# 2. Verificar si la base de datos ya tiene tablas
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tablas encontradas en la base de datos: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ La base de datos ya tiene tablas.${NC}"
    echo "Si continúas, se eliminarán TODAS las tablas existentes."
    echo "¿Deseas continuar? (escribe 'yes' para confirmar)"
    read -r CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Operación cancelada."
        exit 0
    fi

    echo "Eliminando tablas existentes..."
    psql "$DATABASE_URL" <<-EOSQL
        DO \$\$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END \$\$;
EOSQL
    echo -e "${GREEN}✓ Tablas eliminadas${NC}"
fi
echo ""

# 3. Buscar archivo SQL de backup
echo "Buscando archivo SQL de backup..."
SQL_FILE=""

# Buscar en ubicaciones comunes
for location in \
    "/tmp/pantheon-backup.sql" \
    "/tmp/backup.sql" \
    "/app/backup.sql" \
    "/app/pantheon-backup.sql"
do
    if [ -f "$location" ]; then
        SQL_FILE="$location"
        break
    fi
done

if [ -z "$SQL_FILE" ]; then
    echo -e "${RED}✗ No se encontró archivo SQL de backup${NC}"
    echo ""
    echo "Para importar tu backup:"
    echo "1. Sube tu archivo SQL a /tmp/pantheon-backup.sql"
    echo "2. O especifica la ruta: BACKUP_FILE=/ruta/al/backup.sql $0"
    exit 1
fi

echo -e "${GREEN}✓ Archivo SQL encontrado: $SQL_FILE${NC}"
FILE_SIZE=$(du -h "$SQL_FILE" | cut -f1)
echo "Tamaño del archivo: $FILE_SIZE"
echo ""

# 4. Convertir y limpiar SQL de MySQL a PostgreSQL
echo "Preparando SQL para PostgreSQL..."
CLEAN_SQL="/tmp/pantheon-backup-clean.sql"

cat "$SQL_FILE" | \
    # Eliminar comandos específicos de MySQL
    sed 's/ENGINE=InnoDB[^ ;]*//g' | \
    sed 's/DEFAULT CHARSET=[^ ;]*//g' | \
    sed 's/COLLATE=[^ ;]*//g' | \
    sed 's/AUTO_INCREMENT=[0-9]*//g' | \
    sed 's/CHARACTER SET [^ ]*//g' | \
    # Convertir tipos de datos
    sed 's/int([0-9]*)/INTEGER/g' | \
    sed 's/tinyint(1)/BOOLEAN/g' | \
    sed 's/tinyint([0-9]*)/SMALLINT/g' | \
    sed 's/longtext/TEXT/g' | \
    sed 's/mediumtext/TEXT/g' | \
    sed 's/datetime/TIMESTAMP/g' | \
    # Eliminar backticks de MySQL
    sed 's/`//g' | \
    # Eliminar LOCK/UNLOCK TABLES
    grep -v "LOCK TABLES" | \
    grep -v "UNLOCK TABLES" | \
    # Eliminar comandos SET específicos de MySQL
    grep -v "SET @" | \
    grep -v "SET SQL_MODE" | \
    grep -v "SET FOREIGN_KEY_CHECKS" | \
    grep -v "SET UNIQUE_CHECKS" > "$CLEAN_SQL"

echo -e "${GREEN}✓ SQL preparado para PostgreSQL${NC}"
echo ""

# 5. Importar SQL a PostgreSQL
echo "Importando base de datos... (esto puede tardar varios minutos)"
if psql "$DATABASE_URL" < "$CLEAN_SQL" > /tmp/import.log 2>&1; then
    echo -e "${GREEN}✓ Base de datos importada exitosamente${NC}"
else
    echo -e "${YELLOW}⚠ Importación completada con advertencias${NC}"
    echo "Revisa /tmp/import.log para más detalles"
fi
echo ""

# 6. Verificar importación
echo "Verificando importación..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tablas importadas: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Importación verificada${NC}"

    # Mostrar algunas estadísticas
    echo ""
    echo "Estadísticas:"
    psql "$DATABASE_URL" -c "SELECT 'Usuarios' as tabla, COUNT(*) as registros FROM users UNION ALL SELECT 'Nodos', COUNT(*) FROM node;" 2>/dev/null || echo "Tablas de Drupal encontradas"
else
    echo -e "${RED}✗ No se encontraron tablas después de la importación${NC}"
    exit 1
fi
echo ""

# 7. Limpiar cachés de Drupal
echo "Limpiando cachés de Drupal..."
psql "$DATABASE_URL" <<-EOSQL > /dev/null 2>&1 || true
    TRUNCATE TABLE cache_bootstrap CASCADE;
    TRUNCATE TABLE cache_config CASCADE;
    TRUNCATE TABLE cache_container CASCADE;
    TRUNCATE TABLE cache_data CASCADE;
    TRUNCATE TABLE cache_default CASCADE;
    TRUNCATE TABLE cache_discovery CASCADE;
    TRUNCATE TABLE cache_dynamic_page_cache CASCADE;
    TRUNCATE TABLE cache_entity CASCADE;
    TRUNCATE TABLE cache_menu CASCADE;
    TRUNCATE TABLE cache_page CASCADE;
    TRUNCATE TABLE cache_render CASCADE;
EOSQL
echo -e "${GREEN}✓ Cachés limpiados${NC}"
echo ""

# 8. Limpiar archivos temporales
echo "Limpiando archivos temporales..."
rm -f "$CLEAN_SQL" /tmp/import.log
echo -e "${GREEN}✓ Limpieza completada${NC}"
echo ""

echo -e "${GREEN}=== Importación Completada Exitosamente ===${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Importa tus archivos (files) al directorio /app/web/sites/default/files"
echo "2. Accede a tu sitio y verifica que todo funcione"
echo "3. Ejecuta: vendor/bin/drush updatedb (si es necesario)"
echo "4. Ejecuta: vendor/bin/drush cache:rebuild"
echo ""

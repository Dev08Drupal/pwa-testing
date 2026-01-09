# Guía de Migración desde Pantheon a Render.com

Esta guía te ayudará a migrar tu base de datos MySQL y archivos desde Pantheon a Render.com (PostgreSQL).

## Prerrequisitos

- ✅ Backups descargados de Pantheon:
  - Archivo SQL (base de datos MySQL)
  - Archivo files.tar.gz (archivos de Drupal)
- ✅ Servicio desplegado en Render.com
- 🔧 Herramientas necesarias:
  - `pgloader` (para convertir MySQL a PostgreSQL)
  - `psql` (cliente de PostgreSQL)
  - Acceso SSH o terminal

## Paso 1: Preparar la Base de Datos

### 1.1. Instalar pgloader (si no lo tienes)

**En Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install pgloader
```

**En macOS:**
```bash
brew install pgloader
```

**En Windows (WSL):**
```bash
sudo apt-get update && sudo apt-get install pgloader
```

### 1.2. Obtener la URL de conexión a PostgreSQL en Render

1. Ve al dashboard de Render: https://dashboard.render.com
2. Selecciona tu base de datos PostgreSQL: `drupal-db`
3. En la pestaña **Info**, copia el **External Database URL**
   - Formato: `postgresql://user:password@host:port/database`
4. También copia el **Internal Database URL** (la usarás después)

## Paso 2: Convertir e Importar la Base de Datos

### Opción A: Usando pgloader (Recomendado)

#### 2.1. Crear archivo de configuración para pgloader

Crea un archivo llamado `mysql-to-postgres.load`:

```lisp
LOAD DATABASE
     FROM mysql://root@localhost/pantheon_db
     INTO postgresql://[TU_USUARIO]:[TU_PASSWORD]@[HOST]:5432/[DATABASE]

WITH include drop, create tables, create indexes, reset sequences,
     workers = 8, concurrency = 1,
     multiple readers per thread, rows per range = 50000

SET PostgreSQL PARAMETERS
     maintenance_work_mem to '128MB',
     work_mem to '12MB'

CAST type datetime to timestamptz
     drop default drop not null using zero-dates-to-null,
     type date drop not null drop default using zero-dates-to-null,
     type tinyint to boolean using tinyint-to-boolean,
     type year to integer

BEFORE LOAD DO
     $$ ALTER SCHEMA public RENAME TO backup; $$,
     $$ CREATE SCHEMA public; $$

AFTER LOAD DO
     $$ DROP SCHEMA IF EXISTS backup CASCADE; $$;
```

**IMPORTANTE**: Reemplaza:
- `[TU_USUARIO]`, `[TU_PASSWORD]`, `[HOST]`, `[DATABASE]` con los datos del External Database URL de Render

#### 2.2. Importar el SQL de Pantheon a MySQL local (temporal)

Primero necesitas restaurar tu backup en una instancia MySQL local:

```bash
# Crear base de datos temporal en MySQL
mysql -u root -p -e "CREATE DATABASE pantheon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Importar el backup de Pantheon
mysql -u root -p pantheon_db < /ruta/a/tu/backup-pantheon.sql
```

#### 2.3. Ejecutar la conversión con pgloader

```bash
pgloader mysql-to-postgres.load
```

Este proceso puede tomar entre 5-30 minutos dependiendo del tamaño de tu base de datos.

### Opción B: Conversión Manual (Para bases de datos pequeñas)

Si tu base de datos es pequeña (< 100MB) y prefieres hacerlo manualmente:

#### 2.1. Limpiar el SQL de Pantheon

```bash
# Eliminar comandos específicos de MySQL
sed -i 's/ENGINE=InnoDB//g' backup-pantheon.sql
sed -i 's/DEFAULT CHARSET=utf8mb4//g' backup-pantheon.sql
sed -i 's/AUTO_INCREMENT=[0-9]*//g' backup-pantheon.sql

# Convertir tipos de datos comunes
sed -i 's/int(11)/INTEGER/g' backup-pantheon.sql
sed -i 's/tinyint(1)/BOOLEAN/g' backup-pantheon.sql
sed -i 's/longtext/TEXT/g' backup-pantheon.sql
```

#### 2.2. Importar a PostgreSQL en Render

```bash
# Usar el External Database URL de Render
psql "[EXTERNAL_DATABASE_URL]" < backup-pantheon-cleaned.sql
```

## Paso 3: Migrar Archivos

### 3.1. Extraer archivos del backup

```bash
# Crear directorio temporal
mkdir -p /tmp/pantheon-files

# Extraer archivos
tar -xzf files-pantheon-backup.tar.gz -C /tmp/pantheon-files
```

### 3.2. Subir archivos a Render

**Opción A: Usando SSH directo al contenedor (si Render lo permite)**

Render no proporciona SSH directo a web services gratuitos, así que usaremos la Opción B.

**Opción B: Usar rsync vía un script de deploy temporal**

Crea este archivo: `scripts/upload-files.sh`

```bash
#!/bin/bash

# Este script debe ejecutarse DESDE el contenedor de Render
# Lo agregaremos como un comando temporal

TEMP_DIR="/tmp/upload"
FILES_DIR="/app/web/sites/default/files"

# Crear directorio temporal
mkdir -p $TEMP_DIR

# Aquí deberías tener los archivos ya en el contenedor
# (ver instrucciones abajo de cómo subirlos)

# Copiar archivos al directorio correcto
cp -r $TEMP_DIR/* $FILES_DIR/

# Ajustar permisos
chown -R www-data:www-data $FILES_DIR
chmod -R 775 $FILES_DIR

echo "Archivos migrados exitosamente"
```

**Forma Práctica de Subir Archivos:**

1. **Crear un commit con los archivos temporalmente:**

```bash
# EN TU MÁQUINA LOCAL
cd /home/diego_ricaurte/pwa-testing

# Crear directorio temporal para archivos
mkdir -p temp-migration-files

# Copiar archivos extraídos
cp -r /tmp/pantheon-files/* temp-migration-files/

# Agregar al repositorio (TEMPORALMENTE)
git add temp-migration-files/
git commit -m "Temp: Add files for migration"
git push origin master
```

2. **Modificar el Dockerfile temporalmente para copiar los archivos:**

Agregar estas líneas ANTES de la línea `# Copiar el resto de los archivos del proyecto`:

```dockerfile
# Copiar archivos migrados temporalmente
COPY temp-migration-files /app/web/sites/default/files-temp
RUN cp -r /app/web/sites/default/files-temp/* /app/web/sites/default/files/ || true \
    && rm -rf /app/web/sites/default/files-temp
```

3. **Después de que el deploy complete, eliminar los archivos del repo:**

```bash
git rm -r temp-migration-files/
git commit -m "Remove temporary migration files"
git push origin master
```

**Opción C: Subir archivos directamente al disco persistente (Recomendado para archivos grandes)**

Para archivos muy grandes (>500MB), considera:

1. Comprimir los archivos importantes
2. Subirlos a un servicio como Google Drive, Dropbox o AWS S3
3. Crear un script que los descargue durante el deploy:

```bash
#!/bin/bash
# scripts/download-files.sh

FILES_URL="https://tu-url-de-descarga/files.tar.gz"
FILES_DIR="/app/web/sites/default/files"

echo "Descargando archivos..."
curl -L "$FILES_URL" -o /tmp/files.tar.gz

echo "Extrayendo archivos..."
tar -xzf /tmp/files.tar.gz -C $FILES_DIR

echo "Ajustando permisos..."
chown -R www-data:www-data $FILES_DIR
chmod -R 775 $FILES_DIR

rm /tmp/files.tar.gz
echo "Archivos restaurados exitosamente"
```

## Paso 4: Actualizar Configuración de Drupal

Después de importar la BD y archivos:

### 4.1. Conectarte a la base de datos de Render

```bash
# Usar el External Database URL
psql "[EXTERNAL_DATABASE_URL]"
```

### 4.2. Actualizar la configuración de Drupal

```sql
-- Limpiar cachés de Drupal
TRUNCATE cache_bootstrap;
TRUNCATE cache_config;
TRUNCATE cache_container;
TRUNCATE cache_data;
TRUNCATE cache_default;
TRUNCATE cache_discovery;
TRUNCATE cache_dynamic_page_cache;
TRUNCATE cache_entity;
TRUNCATE cache_menu;
TRUNCATE cache_page;
TRUNCATE cache_render;

-- Verificar que las tablas se importaron
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM node;
```

### 4.3. Ejecutar actualizaciones de Drupal (desde Render Shell o localmente)

Si Render proporciona una shell:

```bash
cd /app
vendor/bin/drush updatedb -y
vendor/bin/drush cache:rebuild
vendor/bin/drush config:import -y
```

## Paso 5: Verificación Post-Migración

### 5.1. Verificar el sitio

1. Accede a tu URL de Render: `https://[tu-servicio].onrender.com`
2. Verifica que puedes iniciar sesión
3. Verifica que el contenido se muestra correctamente
4. Verifica que las imágenes cargan

### 5.2. Verificar la base de datos

```sql
-- Conectar a PostgreSQL
psql "[EXTERNAL_DATABASE_URL]"

-- Verificar tablas
\dt

-- Verificar usuarios
SELECT uid, name, mail FROM users_field_data LIMIT 5;

-- Verificar contenido
SELECT nid, title FROM node_field_data LIMIT 10;
```

### 5.3. Verificar archivos

```bash
# Verificar que los archivos existen en el disco persistente
ls -la /app/web/sites/default/files/
```

## Solución de Problemas

### Error: "relation does not exist"
- La tabla no se importó correctamente
- Revisa los logs de pgloader
- Intenta importar tabla por tabla

### Error: "Connection refused"
- Verifica que estás usando el External Database URL correcto
- Verifica que la base de datos esté en estado "Available"

### Imágenes no cargan
- Verifica permisos: `chmod -R 775 web/sites/default/files`
- Verifica ownership: `chown -R www-data:www-data web/sites/default/files`
- Verifica que el disco persistente esté montado correctamente

### Base de datos muy lenta
- PostgreSQL en el tier free tiene límites
- Considera optimizar consultas
- Agrega índices si es necesario

## Notas Importantes

1. **Backup antes de migrar**: Asegúrate de tener backups de todo
2. **Tiempo de inactividad**: Durante la migración, tu sitio no estará disponible
3. **Tamaño de archivos**: El tier free de Render tiene límite de 1GB para el disco
4. **Performance**: PostgreSQL en free tier tiene límites de conexiones y RAM

## Próximos Pasos

Después de una migración exitosa:

1. Actualizar DNS para apuntar a Render (si tienes dominio personalizado)
2. Configurar SSL/HTTPS
3. Configurar backups automáticos
4. Monitorear performance

---

¿Necesitas ayuda con algún paso específico? Consulta el archivo de documentación principal o abre un issue en GitHub.

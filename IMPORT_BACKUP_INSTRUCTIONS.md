# Instrucciones para Importar Backup de Pantheon a Render

## Situación Actual

Tu sitio en Render está desplegado pero:
- ❌ No hay base de datos conectada
- ❌ Drupal intenta hacer instalación nueva
- ✅ El servicio web está funcionando

## Solución en 5 Pasos

### Paso 1: Crear Base de Datos en Render (Manual)

1. Ve a https://dashboard.render.com
2. Clic en **"New +"** → **"PostgreSQL"**
3. Configuración:
   - Name: `drupal-db`
   - Database: `drupal`
   - User: `drupal`
   - Region: Oregon
   - Plan: Free
4. Clic en **"Create Database"**
5. Espera 1-2 minutos hasta que esté "Available" (verde)

### Paso 2: Conectar Base de Datos al Web Service

1. Ve a tu nueva base de datos `drupal-db`
2. Pestaña **"Info"**
3. Copia el **"Internal Database URL"**
   ```
   postgresql://drupal:XXXXX@dpg-XXXXX-a:5432/drupal
   ```
4. Ve a tu web service `drupal-pwa`
5. Pestaña **"Environment"**
6. Busca `DATABASE_URL` y pega la URL que copiaste
7. Guarda → El servicio se redespliegará (2-3 minutos)

### Paso 3: Preparar el Backup para Importación

**En tu máquina local:**

```bash
cd /home/diego_ricaurte/pwa-testing

# Crear directorio para el backup
mkdir -p temp-backup

# Copiar tu backup SQL de Pantheon
cp /ruta/a/tu/backup-pantheon.sql temp-backup/backup.sql

# Comprimir para subirlo más rápido (opcional)
gzip temp-backup/backup.sql
```

### Paso 4: Subir y Ejecutar la Importación

Hay dos métodos:

#### Método A: Usando Render Shell (Si está disponible)

1. Ve a tu web service `drupal-pwa` en Render
2. Busca la opción **"Shell"** o **"Console"**
3. Si está disponible, ábrela y ejecuta:

```bash
# Subir tu backup (necesitarás hacerlo vía scp o similar)
# Una vez el archivo esté en /tmp/pantheon-backup.sql

# Ejecutar el script de importación
bash /app/scripts/import-pantheon-backup.sh
```

#### Método B: Importación Directa desde tu Máquina (Recomendado)

1. **Obtén la External Database URL:**
   - Ve a `drupal-db` en Render
   - Pestaña "Info"
   - Copia todos los datos de conexión:
     - Host
     - Port
     - Database
     - Username
     - Password

2. **Instala PostgreSQL client en tu máquina:**

```bash
# Ubuntu/Debian/WSL
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

3. **Convierte e importa el backup:**

```bash
cd /home/diego_ricaurte/pwa-testing/temp-backup

# Descomprimir si lo comprimiste
gunzip backup.sql.gz

# Limpiar SQL para PostgreSQL
sed -i 's/ENGINE=InnoDB//g' backup.sql
sed -i 's/DEFAULT CHARSET=utf8mb4//g' backup.sql
sed -i 's/AUTO_INCREMENT=[0-9]*//g' backup.sql
sed -i 's/int(11)/INTEGER/g' backup.sql
sed -i 's/tinyint(1)/BOOLEAN/g' backup.sql
sed -i 's/longtext/TEXT/g' backup.sql
sed -i 's/`//g' backup.sql

# Eliminar comandos incompatibles
grep -v "LOCK TABLES" backup.sql > backup-clean.sql
grep -v "SET @" backup-clean.sql > backup-postgres.sql

# Importar a PostgreSQL en Render
psql "postgresql://drupal:PASSWORD@HOST:5432/drupal?sslmode=require" < backup-postgres.sql
```

**Reemplaza:**
- `PASSWORD`: con la contraseña de tu base de datos
- `HOST`: con el hostname externo de tu base de datos

### Paso 5: Importar Archivos (Files)

**Método Temporal (para probar):**

```bash
cd /home/diego_ricaurte/pwa-testing

# Extraer archivos de Pantheon
mkdir -p temp-files
tar -xzf /ruta/a/files-pantheon.tar.gz -C temp-files/

# Copiar a web/sites/default/files
mkdir -p web/sites/default/files
cp -r temp-files/* web/sites/default/files/

# Commit temporalmente
git add web/sites/default/files
git commit -m "Temp: Add files from Pantheon"
git push origin master
```

**Importante:** Esto subirá los archivos a Git, lo cual no es ideal para archivos grandes. Después del deploy:

```bash
# Eliminar del repositorio
git rm -r web/sites/default/files
git commit -m "Remove files from Git"
git push origin master
```

Los archivos permanecerán en el disco persistente de Render.

### Paso 6: Verificar el Sitio

1. **Accede a tu sitio:**
   ```
   https://drupal-pwa.onrender.com
   ```

2. **Si ves la página de instalación de Drupal:**
   - Ignórala, tu base de datos ya está importada
   - Ve directamente a `/user/login`
   - Inicia sesión con tus credenciales de Pantheon

3. **Si todo funciona:**
   - ✅ Puedes iniciar sesión
   - ✅ Ves tu contenido
   - ✅ Las imágenes cargan

4. **Limpiar cachés:**
   ```bash
   # Si tienes acceso al shell de Render
   cd /app
   vendor/bin/drush cache:rebuild
   ```

## Problemas Comunes

### "relation does not exist"
- La tabla no se importó correctamente
- Revisa los errores durante la importación
- Intenta importar de nuevo

### "Connection refused"
- Verifica que usas la External URL correcta
- Verifica que agregaste `?sslmode=require`
- Verifica que la base de datos está "Available"

### "Too many clients"
- El tier free tiene límite de conexiones
- Espera unos minutos y reintenta
- Cierra conexiones anteriores

### Imágenes no cargan
- Verifica que los archivos están en `/app/web/sites/default/files`
- Verifica el disco persistente en Render
- Verifica la variable `file_public_path` en settings.php

## Alternativa: Instalación Nueva

Si prefieres NO importar el backup y hacer una instalación nueva:

1. Ignora todos los pasos anteriores
2. Ve a tu sitio en Render
3. Sigue el asistente de instalación de Drupal
4. Configura manualmente tu sitio

Pero perderás todo el contenido de Pantheon.

## Notas Importantes

- **Backup antes de importar**: Guarda copias de todo
- **Tiempo de importación**: Puede tardar 5-30 minutos dependiendo del tamaño
- **Límites del tier free**:
  - 256 MB RAM para BD
  - 1 GB almacenamiento
  - 512 MB RAM para web service
- **Performance**: PostgreSQL free tier es limitado

## ¿Necesitas Ayuda?

Si encuentras problemas:
1. Revisa los logs en Render Dashboard
2. Verifica las variables de entorno
3. Confirma que la base de datos está conectada

---

Una vez completada la importación, tu sitio de Pantheon estará funcionando en Render.com con tu contenido completo.

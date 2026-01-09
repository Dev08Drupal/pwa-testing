# Cómo Cargar Archivos (Files) a Render.com

## 3 Métodos Disponibles

### Método 1: Via Git (Rápido para archivos < 100MB) ⚡

**Ventajas:**
- ✅ Más rápido y simple
- ✅ No requiere servicios externos

**Desventajas:**
- ⚠️ Solo para archivos pequeños (< 100MB)
- ⚠️ Los archivos quedan en el historial de Git

**Pasos:**

```bash
cd /home/diego_ricaurte/pwa-testing

# 1. Extraer archivos del backup de Pantheon
tar -xzf /ruta/a/pantheon-files-backup.tar.gz -C web/sites/default/files/

# 2. Verificar tamaño
du -sh web/sites/default/files/
# Si es < 100MB, continúa. Si es mayor, usa Método 2 o 3

# 3. Agregar a Git temporalmente
git add web/sites/default/files/
git commit -m "Temp: Add files from Pantheon"
git push origin master
```

**Después del deploy exitoso, eliminar del Git:**

```bash
# Eliminar del tracking de Git (pero mantener los archivos)
git rm -r web/sites/default/files --cached

# Actualizar .gitignore
echo "web/sites/default/files/*" >> .gitignore
echo "!web/sites/default/files/.htaccess" >> .gitignore

git add .gitignore
git commit -m "Remove files from Git, keep in persistent disk"
git push origin master
```

Los archivos permanecerán en el disco persistente de Render.

---

### Método 2: Descarga Automática desde Cloud Storage (Para archivos grandes) ☁️

**Ventajas:**
- ✅ Funciona con archivos de cualquier tamaño
- ✅ No llena el repositorio de Git
- ✅ Se descarga automáticamente en cada deploy

**Desventajas:**
- ⚠️ Requiere subir archivos a un servicio externo
- ⚠️ Tarda más tiempo en el primer deploy

**Pasos:**

#### 2.1. Preparar y Subir Archivos

```bash
cd /ruta/donde/extrajiste/archivos-pantheon

# Comprimir archivos
tar -czf pantheon-files.tar.gz *

# Ver tamaño
du -h pantheon-files.tar.gz
```

#### 2.2. Subir a un Servicio de Cloud

**Opción A: Google Drive**
1. Sube `pantheon-files.tar.gz` a Google Drive
2. Haz clic derecho → Obtener enlace
3. Cambia permisos a "Cualquiera con el enlace"
4. Copia el enlace y conviértelo a descarga directa:

```
Original: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
Directo:  https://drive.google.com/uc?export=download&id=FILE_ID
```

**Opción B: Dropbox**
1. Sube el archivo a Dropbox
2. Obtén el enlace de compartir
3. Cambia `?dl=0` por `?dl=1` al final de la URL

**Opción C: WeTransfer**
1. Sube el archivo
2. Copia el link de descarga

#### 2.3. Configurar en Render

1. Ve a tu Web Service en Render: `drupal-pwa`
2. Ve a **Environment**
3. Agrega esta variable:
   - Key: `FILES_BACKUP_URL`
   - Value: `[LA_URL_QUE_COPIASTE]`
4. Guarda (se redespliegará automáticamente)

El script descargará los archivos automáticamente en el próximo deploy.

---

### Método 3: Subida Manual via SFTP/SCP (Si Render lo permite)

**Nota:** Render free tier generalmente NO proporciona acceso SSH/SFTP directo.

Si tienes acceso a un Shell en Render:

```bash
# Desde tu máquina local
scp -r web/sites/default/files/* user@render-host:/app/web/sites/default/files/
```

---

## Recomendación Según Tamaño

| Tamaño de Files | Método Recomendado |
|-----------------|-------------------|
| < 50 MB         | **Método 1** (Git) |
| 50-500 MB       | **Método 2** (Cloud Storage) |
| > 500 MB        | **Método 2** (Cloud Storage) - Considera optimizar imágenes primero |

---

## Verificación Post-Carga

Después de cargar los archivos:

### 1. Verificar que los archivos están presentes

Si tienes acceso al Shell de Render:
```bash
ls -lh /app/web/sites/default/files/ | head -20
```

### 2. Verificar permisos

```bash
ls -ld /app/web/sites/default/files/
# Debería mostrar: drwxrwxr-x ... www-data www-data
```

### 3. Probar desde el navegador

1. Ve a tu sitio: `https://drupal-pwa.onrender.com`
2. Navega a una página con imágenes
3. Verifica que las imágenes cargan correctamente
4. Abre DevTools (F12) → Network → Ver si hay errores 404

### 4. Verificar tamaño del disco

En Render Dashboard:
- Ve a tu Web Service
- Pestaña **Disks**
- Verifica el espacio usado vs. disponible (1GB en tier free)

---

## Problemas Comunes

### "Imágenes no cargan (404)"

**Solución 1:** Verifica la ruta de archivos
```bash
# En el shell de Render o logs
ls -la /app/web/sites/default/files/
```

**Solución 2:** Verifica permisos
```bash
chmod -R 775 /app/web/sites/default/files/
chown -R www-data:www-data /app/web/sites/default/files/
```

**Solución 3:** Limpia caché de Drupal
```bash
vendor/bin/drush cache:rebuild
```

### "Disco lleno"

El tier free de Render tiene 1GB de disco. Si tus archivos son muy grandes:

1. **Optimiza imágenes:**
   ```bash
   # Instalar herramientas
   sudo apt-get install jpegoptim optipng

   # Optimizar JPG
   find web/sites/default/files/ -type f -name "*.jpg" -exec jpegoptim --max=85 {} \;

   # Optimizar PNG
   find web/sites/default/files/ -type f -name "*.png" -exec optipng {} \;
   ```

2. **Elimina archivos innecesarios:**
   - CSS/JS cacheados (se regeneran automáticamente)
   - Versiones múltiples de imágenes (image styles se regeneran)
   - Archivos temporales

### "Download failed" en logs

1. Verifica que la URL es de descarga directa
2. Verifica que el archivo aún existe en el cloud storage
3. Prueba descargar el archivo manualmente con curl:
   ```bash
   curl -L "[TU_URL]" -o test.tar.gz
   ```

---

## Limpieza Post-Migración

Una vez que todo funcione correctamente:

### Si usaste Método 1 (Git):
```bash
# Ya lo hiciste al eliminar del tracking
git log --all --full-history -- web/sites/default/files/
```

### Si usaste Método 2 (Cloud Storage):
- Puedes eliminar `FILES_BACKUP_URL` de las variables de entorno
- Los archivos permanecerán en el disco persistente
- Solo se descargarían de nuevo si eliminas el archivo `.downloaded`

---

## Scripts Automáticos Creados

- **[scripts/download-files.sh](scripts/download-files.sh)** - Descarga archivos desde URL
- **[scripts/render-start.sh](scripts/render-start.sh)** - Modificado para descargar automáticamente

---

## Próximos Pasos

1. ✅ Carga los archivos usando tu método preferido
2. ✅ Verifica que las imágenes cargan en el sitio
3. ✅ Importa tu base de datos (ver [IMPORT_BACKUP_INSTRUCTIONS.md](IMPORT_BACKUP_INSTRUCTIONS.md))
4. ✅ Accede a `/user/login` y verifica tu contenido

---

¿Necesitas ayuda con algún paso específico?

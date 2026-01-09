# Guía de Despliegue en Render.com

Esta guía te ayudará a desplegar tu aplicación Drupal 11 con PWA en Render.com usando el tier gratuito.

## Prerrequisitos

- Cuenta en [Render.com](https://render.com)
- Cuenta en GitHub
- Repositorio Git configurado: `git@github.com:Dev08Drupal/pwa-testing.git`

## Paso 1: Preparar el repositorio

1. Asegúrate de tener todos los archivos necesarios:
   - ✅ `Dockerfile`
   - ✅ `render.yaml`
   - ✅ `scripts/render-build.sh`
   - ✅ `scripts/render-start.sh`
   - ✅ `web/sites/default/settings.render.php`

2. Agrega el remote de GitHub (si aún no lo has hecho):
   ```bash
   git remote add origin git@github.com:Dev08Drupal/pwa-testing.git
   ```

3. Haz commit de todos los archivos:
   ```bash
   git add .
   git commit -m "Add Render.com deployment configuration"
   git push -u origin master
   ```

## Paso 2: Crear el servicio en Render.com

### Opción A: Usando render.yaml (Recomendado)

1. Inicia sesión en [Render.com](https://dashboard.render.com)
2. Ve a **Dashboard** → **New** → **Blueprint**
3. Conecta tu repositorio de GitHub: `Dev08Drupal/pwa-testing`
4. Render detectará automáticamente el archivo `render.yaml`
5. Asigna un nombre único para tu servicio (ej: `drupal-pwa-dev`)
6. Haz clic en **Apply** para crear los servicios

### Opción B: Manual

Si prefieres configurar manualmente:

#### 2.1. Crear la base de datos PostgreSQL

1. Ve a **Dashboard** → **New** → **PostgreSQL**
2. Configura:
   - **Name**: `drupal-db`
   - **Database**: `drupal`
   - **User**: `drupal`
   - **Region**: Oregon (o tu región preferida)
   - **Plan**: Free
3. Haz clic en **Create Database**
4. Espera a que la base de datos esté lista

#### 2.2. Crear el servicio web

1. Ve a **Dashboard** → **New** → **Web Service**
2. Conecta tu repositorio: `Dev08Drupal/pwa-testing`
3. Configura:
   - **Name**: `drupal-pwa` (o el nombre que prefieras)
   - **Region**: Oregon (misma que la base de datos)
   - **Branch**: `master`
   - **Runtime**: Docker
   - **Plan**: Free

## Paso 3: Configurar Variables de Entorno

En el dashboard de tu servicio web en Render.com, ve a **Environment** y agrega:

### Variables requeridas:

1. **RENDER**
   - Valor: `true`

2. **ENVIRONMENT**
   - Valor: `production` (o `development` para modo dev)

3. **HASH_SALT**
   - Clic en **Generate** para crear uno automático
   - O usa un valor personalizado seguro

4. **DATABASE_URL**
   - Si usaste Blueprint: Se configura automáticamente
   - Si es manual: Ve a tu base de datos PostgreSQL → **Info** → Copia el "Internal Database URL"
   - Formato: `postgresql://user:password@host:5432/database`

5. **RENDER_SERVICE_NAME**
   - Valor: El nombre de tu servicio (ej: `drupal-pwa`)

## Paso 4: Configurar Disco Persistente (para archivos subidos)

1. En tu servicio web, ve a **Disks**
2. Haz clic en **Add Disk**
3. Configura:
   - **Name**: `drupal-files`
   - **Mount Path**: `/app/web/sites/default/files`
   - **Size**: 1 GB (máximo en plan free)
4. Guarda los cambios

## Paso 5: Desplegar

1. Render comenzará a construir y desplegar automáticamente
2. El proceso incluye:
   - Construir la imagen Docker
   - Instalar dependencias de Composer
   - Configurar directorios
   - Iniciar Apache

3. Monitorea los logs en tiempo real en la sección **Logs**

## Paso 6: Configuración Post-Despliegue

Una vez que el servicio esté **Live**:

### 6.1. Obtener la URL de tu sitio

Tu sitio estará disponible en: `https://[nombre-servicio].onrender.com`

### 6.2. Importar base de datos (si vienes de Pantheon)

Si necesitas migrar tu base de datos desde Pantheon:

1. En Pantheon, exporta tu base de datos
2. Conecta a tu base de datos en Render usando el External Database URL:
   ```bash
   psql [EXTERNAL_DATABASE_URL]
   ```
3. Importa tu base de datos (puede requerir conversión de MySQL a PostgreSQL)

### 6.3. Configurar Drupal

Accede a tu sitio y verifica:

1. **Trusted Hosts**: Actualiza si es necesario en el dashboard de Render
2. **PWA Module**: Verifica que esté habilitado
3. **Service Worker**: Verifica que se esté generando correctamente
4. **Caché**: En modo production, el caché debe estar habilitado

## Paso 7: Configurar PWA en Modo Dev

Para trabajar con tu PWA en modo desarrollo:

1. Cambia la variable de entorno **ENVIRONMENT** a `development`
2. Esto deshabilitará los cachés y mostrará errores detallados
3. Redespliega el servicio

## Solución de Problemas

### El sitio no carga
- Verifica los logs en Render Dashboard → Tu servicio → Logs
- Verifica que DATABASE_URL esté configurada correctamente
- Verifica que HASH_SALT esté configurada

### Error de base de datos
- Confirma que la base de datos PostgreSQL esté en estado "Available"
- Verifica la conexión con el Internal Database URL
- Revisa los permisos del usuario de base de datos

### Archivos subidos no persisten
- Asegúrate de haber configurado el disco persistente
- Verifica que el mount path sea `/app/web/sites/default/files`

### PWA no funciona
- Verifica que el módulo PWA esté habilitado en Drupal
- Confirma que tu sitio esté usando HTTPS (Render lo hace automáticamente)
- Revisa el Service Worker en Chrome DevTools

### Build falla
- Revisa los logs del build
- Verifica que los scripts tengan permisos de ejecución
- Confirma que composer.json sea válido

## Actualizaciones y Despliegues

Para actualizar tu sitio:

1. Haz cambios en tu código local
2. Commit y push a GitHub:
   ```bash
   git add .
   git commit -m "Descripción de cambios"
   git push origin master
   ```
3. Render detectará los cambios y desplegará automáticamente

## Ventajas del Plan Free de Render

- ✅ 750 horas/mes de tiempo de ejecución
- ✅ HTTPS automático
- ✅ Deploys automáticos desde GitHub
- ✅ PostgreSQL incluida (90 días de retención)
- ✅ 1GB de disco persistente
- ✅ Perfecto para desarrollo y pruebas de PWA

## Limitaciones del Plan Free

- ⚠️ El servicio se duerme después de 15 minutos de inactividad
- ⚠️ Primera carga después de dormir puede tomar ~30 segundos
- ⚠️ 512MB RAM para el web service
- ⚠️ 0.1 CPU compartida

## Recursos Adicionales

- [Documentación de Render](https://render.com/docs)
- [Drupal 11 Documentation](https://www.drupal.org/docs/11)
- [PWA Module Documentation](https://www.drupal.org/project/pwa)

## Soporte

Si encuentras problemas:
1. Revisa los logs en Render Dashboard
2. Consulta la documentación de Render
3. Revisa los issues en el repositorio de GitHub

---

¡Tu sitio Drupal 11 con PWA está listo para desarrollo en Render.com! 🚀

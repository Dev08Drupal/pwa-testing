# Dockerfile para Drupal 11 en Render.com
FROM php:8.3-apache

# Configurar variables de entorno
ENV APACHE_DOCUMENT_ROOT=/app/web

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libpq-dev \
    libicu-dev \
    libonig-dev \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar extensiones PHP requeridas por Drupal 11
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    gd \
    pdo \
    pdo_mysql \
    pdo_pgsql \
    pgsql \
    opcache \
    zip \
    intl \
    mbstring \
    xml \
    bcmath

# Configurar Apache
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && a2enmod rewrite headers expires

# Instalar Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Configurar PHP para Drupal
RUN { \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=8'; \
    echo 'opcache.max_accelerated_files=4000'; \
    echo 'opcache.revalidate_freq=60'; \
    echo 'opcache.fast_shutdown=1'; \
    echo 'opcache.enable=1'; \
    echo 'opcache.enable_cli=1'; \
    echo 'memory_limit=256M'; \
    echo 'upload_max_filesize=64M'; \
    echo 'post_max_size=64M'; \
    echo 'max_execution_time=300'; \
    } > /usr/local/etc/php/conf.d/drupal.ini

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos necesarios para composer install
COPY composer.json composer.lock* ./
COPY upstream-configuration ./upstream-configuration
COPY patches ./patches

# Instalar dependencias de Composer
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Copiar el resto de los archivos del proyecto
COPY . /app/

# Ejecutar scripts post-install de Composer
RUN composer run-script post-install-cmd --no-interaction || true

# Crear directorios necesarios y establecer permisos
RUN mkdir -p /app/web/sites/default/files \
    && mkdir -p /app/web/sites/default/files/tmp \
    && mkdir -p /app/web/sites/default/files/private \
    && chown -R www-data:www-data /app/web/sites/default/files \
    && chmod -R 775 /app/web/sites/default/files

# Exponer puerto
EXPOSE 80

# Comando de inicio
CMD ["apache2-foreground"]

FROM php:8.2-apache

# Install requirements and SQLite PDO
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libzip-dev unzip git libsqlite3-dev \
  && docker-php-ext-install pdo_sqlite \
  && a2enmod rewrite \
  && rm -rf /var/lib/apt/lists/*

# Install composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application
COPY . /var/www/html

# Install PHP dependencies
RUN if [ -f composer.json ]; then composer install --no-dev --no-interaction --prefer-dist || true; fi

# Ensure data directory exists and is writable
RUN mkdir -p /var/www/html/data && chown -R www-data:www-data /var/www/html/data

EXPOSE 80

CMD ["apache2-foreground"]

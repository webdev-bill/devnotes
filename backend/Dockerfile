# Development image only — not hardened or optimized for production.
# Uses PHP's built-in server (via `artisan serve`), not php-fpm + nginx,
# to keep the local dev stack simple. We'll revisit this before deploying.
FROM php:8.4-cli

# libpq-dev is needed to compile the pdo_pgsql extension against PostgreSQL's
# client library; git/unzip/zip are needed by Composer to fetch packages.
RUN apt-get update && apt-get install -y \
    libpq-dev \
    git \
    unzip \
    zip \
    && docker-php-ext-install pdo pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

# Copy the official Composer binary instead of installing it via apt/curl.
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copied at build time so the image is runnable standalone; in local dev
# docker-compose.yml bind-mounts ./backend over this, and the host's own
# vendor/ (already installed) is what actually gets used at runtime.
COPY . .

RUN composer install --no-interaction --prefer-dist --optimize-autoloader

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

# Използваме официалния Node.js image с Alpine Linux за по-малък размер
FROM node:20-alpine

# Задаваме работната директория в контейнера
WORKDIR /app

# Копираме package.json и package-lock.json (ако съществува)
COPY package*.json ./

# Инсталираме само production зависимостите
RUN npm ci --only=production

# Копираме останалата част от кода на приложението
COPY . .

# Дефинираме аргументите, които ще се използват при build time
ARG API_PORT
ARG DB_URL
ARG FRONTEND_SERVER
ARG OPENAI_API_KEY
ARG JWT_SECRET
ARG JWT_REFRESH_SECRET
ARG ACCESS_TOKEN_EXPIRE
ARG REFRESH_TOKEN_EXPIRE
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG SMTP_HOST
ARG SMTP_PORT
ARG SMTP_SECURE
ARG SMTP_USER
ARG SMTP_PASS
ARG SMTP_FROM
ARG AWS_REGION
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_S3_BUCKET_NAME
ARG GOOGLE_APPLICATION_CREDENTIALS
ARG GOOGLE_STORAGE_BUCKET_NAME
ARG GOOGLE_PROJECT_ID
ARG TENANT_ID
ARG CLIENT_ID
ARG CLIENT_SECRET
ARG SUBDOMAIN

# Задаваме environment променливите
ENV API_PORT=$API_PORT \
    DB_URL=$DB_URL \
    FRONTEND_SERVER=$FRONTEND_SERVER \
    OPENAI_API_KEY=$OPENAI_API_KEY \
    JWT_SECRET=$JWT_SECRET \
    JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET \
    ACCESS_TOKEN_EXPIRE=$ACCESS_TOKEN_EXPIRE \
    REFRESH_TOKEN_EXPIRE=$REFRESH_TOKEN_EXPIRE \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET \
    SMTP_HOST=$SMTP_HOST \
    SMTP_PORT=$SMTP_PORT \
    SMTP_SECURE=$SMTP_SECURE \
    SMTP_USER=$SMTP_USER \
    SMTP_PASS=$SMTP_PASS \
    SMTP_FROM=$SMTP_FROM \
    AWS_REGION=$AWS_REGION \
    AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
    AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
    AWS_S3_BUCKET_NAME=$AWS_S3_BUCKET_NAME \
    GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_APPLICATION_CREDENTIALS \
    GOOGLE_STORAGE_BUCKET_NAME=$GOOGLE_STORAGE_BUCKET_NAME \
    GOOGLE_PROJECT_ID=$GOOGLE_PROJECT_ID \
    TENANT_ID=$TENANT_ID \
    CLIENT_ID=$CLIENT_ID \
    CLIENT_SECRET=$CLIENT_SECRET \
    SUBDOMAIN=$SUBDOMAIN

# Проверяваме версиите на Node.js и npm
RUN node --version && npm --version

# Създаваме non-root потребител за по-добра сигурност
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 \
    && chown -R nodejs:nodejs /app

# Превключваме към non-root потребителя
USER nodejs

# Отваряме порта, на който ще слуша приложението
EXPOSE $API_PORT

# Стартираме приложението
CMD ["npm", "start"]

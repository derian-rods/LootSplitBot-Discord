# Usa la imagen oficial de Node.js con la versión 22.9.0
FROM node:22.9.0

# Establece el directorio de trabajo en /app
WORKDIR /app

# Copia el archivo package.json y package-lock.json al directorio de trabajo
COPY package*.json ./

# Copia todos los archivos del proyecto al directorio de trabajo
COPY . .

# Instala las dependencias de la aplicación
RUN npm install


# Expone el puerto en el que la aplicación se ejecutará
EXPOSE 8080/tcp

# Comando para iniciar la aplicación
RUN npm start
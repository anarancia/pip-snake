FROM nginx:alpine
COPY index.html style.css app.js snake.js /usr/share/nginx/html/

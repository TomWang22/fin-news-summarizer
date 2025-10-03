# infra/nginx.Dockerfile
FROM nginx:1.25-alpine

# Drop the default config that ships with the image
RUN rm -f /etc/nginx/conf.d/default.conf

# Our server config (conf.d style)
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf

# Ship the already-built frontend (vite build) into the image
COPY frontend/dist /usr/share/nginx/html

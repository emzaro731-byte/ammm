FROM nginx:1.27-alpine

COPY website/ /usr/share/nginx/html/
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 10000

ENTRYPOINT ["/docker-entrypoint.sh"]

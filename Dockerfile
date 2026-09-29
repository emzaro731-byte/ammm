FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app

COPY pubspec.yaml ./
RUN flutter pub get

COPY . .
RUN flutter pub get
RUN flutter analyze
RUN flutter build web --release

FROM nginx:alpine
COPY --from=build /app/build/web /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

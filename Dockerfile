FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app
COPY . .
RUN flutter create . --platforms=web --project-name exampilot_ai
RUN flutter pub get
ARG SUPABASE_URL=""
ARG SUPABASE_PUBLISHABLE_KEY=""
RUN flutter build web --release --dart-define=SUPABASE_URL="$SUPABASE_URL" --dart-define=SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY"
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/web /usr/share/nginx/html
EXPOSE 10000
CMD ["nginx", "-g", "daemon off;"]

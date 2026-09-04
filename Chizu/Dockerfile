# syntax=docker/dockerfile:1

FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

COPY gradlew .
COPY gradlew.bat .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src

RUN chmod +x gradlew \
    && ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=build /app/build/libs/*.jar app.jar

RUN mkdir -p /app/uploads/userImg /app/uploads/reviewImg \
    && chown -R spring:spring /app

USER spring:spring

EXPOSE 8080

ENV FILE_UPLOAD_DIR=/app/uploads

ENTRYPOINT ["java", "-jar", "/app/app.jar"]

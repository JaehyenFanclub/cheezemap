package org.example.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

public final class DotEnvLoader {

    private DotEnvLoader() {
    }

    public static void loadIfAbsent() {
        findDotEnvFile().ifPresent(DotEnvLoader::apply);
    }

    private static Optional<Path> findDotEnvFile() {
        Path dir = Path.of("").toAbsolutePath().normalize();
        for (int depth = 0; depth < 5 && dir != null; depth++) {
            Path candidate = dir.resolve(".env");
            if (Files.isRegularFile(candidate)) {
                return Optional.of(candidate);
            }
            dir = dir.getParent();
        }
        return Optional.empty();
    }

    private static void apply(Path file) {
        try {
            List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
            for (String rawLine : lines) {
                String line = stripBom(rawLine).trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }

                int separatorIndex = line.indexOf('=');
                if (separatorIndex <= 0) {
                    continue;
                }

                String key = line.substring(0, separatorIndex).trim();
                String value = unquote(line.substring(separatorIndex + 1).trim());
                if (System.getenv(key) == null && System.getProperty(key) == null) {
                    System.setProperty(key, value);
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load " + file, ex);
        }
    }

    private static String stripBom(String value) {
        if (!value.isEmpty() && value.charAt(0) == '\uFEFF') {
            return value.substring(1);
        }
        return value;
    }

    private static String unquote(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }
}

package org.example.common.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageStorageService {

    public enum ImageFolder {
        USER("userImg"),
        REVIEW("reviewImg");

        private final String folderName;

        ImageFolder(String folderName) {
            this.folderName = folderName;
        }

        public String folderName() {
            return folderName;
        }
    }

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
    );

    private final Path uploadRoot;

    public ImageStorageService(@Value("${file.upload-dir}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadRoot.resolve(ImageFolder.USER.folderName()));
            Files.createDirectories(uploadRoot.resolve(ImageFolder.REVIEW.folderName()));
        } catch (IOException e) {
            throw new IllegalStateException("이미지 저장 폴더를 생성할 수 없습니다.", e);
        }
    }

    public String store(MultipartFile file, ImageFolder folder) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("이미지 파일이 비어 있습니다.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("지원하지 않는 이미지 형식입니다. (jpeg, png, gif, webp)");
        }

        String extension = resolveExtension(file.getOriginalFilename(), contentType);
        String filename = UUID.randomUUID() + extension;
        Path destination = uploadRoot.resolve(folder.folderName()).resolve(filename);

        try {
            Files.createDirectories(destination.getParent());
            file.transferTo(destination);
        } catch (IOException e) {
            throw new IllegalArgumentException("이미지 저장에 실패했습니다.");
        }

        return "/" + folder.folderName() + "/" + filename;
    }

    public void deleteByStoredPath(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            return;
        }

        String normalized = storedPath.startsWith("/") ? storedPath.substring(1) : storedPath;
        Path filePath = uploadRoot.resolve(normalized).normalize();
        if (!filePath.startsWith(uploadRoot)) {
            return;
        }

        try {
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
            // 파일 삭제 실패는 요청 전체를 실패시키지 않음
        }
    }

    private String resolveExtension(String originalFilename, String contentType) {
        if (originalFilename != null) {
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < originalFilename.length() - 1) {
                return originalFilename.substring(dotIndex).toLowerCase();
            }
        }

        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}

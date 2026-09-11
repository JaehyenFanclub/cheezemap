package org.example.common.service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class ImageStorageService {

    public enum ImageFolder {
        USER("userImg"),
        REVIEW("reviewImg"),
        PLACE("placeImg"),
        MENU("menuImg");

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

    private final S3Client s3Client;
    private final String bucket;
    private final String publicBaseUrl;

    public ImageStorageService(
            S3Client s3Client,
            @Value("${aws.s3.bucket}") String bucket,
            @Value("${aws.s3.region}") String region,
            @Value("${aws.s3.public-base-url:}") String publicBaseUrl
    ) {
        this.s3Client = s3Client;
        this.bucket = bucket == null ? "" : bucket.trim();
        this.publicBaseUrl = resolvePublicBaseUrl(publicBaseUrl, this.bucket, region);
    }

    public String store(MultipartFile file, ImageFolder folder) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("이미지 파일이 비어 있습니다.");
        }
        if (bucket.isBlank()) {
            throw new IllegalStateException("S3 버킷이 설정되지 않았습니다.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("지원하지 않는 이미지 형식입니다. (jpeg, png, gif, webp)");
        }

        String extension = resolveExtension(file.getOriginalFilename(), contentType);
        String key = folder.folderName() + "/" + UUID.randomUUID() + extension;

        try (InputStream inputStream = file.getInputStream()) {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .build(),
                    RequestBody.fromInputStream(inputStream, file.getSize())
            );
        } catch (IOException | RuntimeException e) {
            throw new IllegalArgumentException("이미지 저장에 실패했습니다.");
        }

        return publicBaseUrl + "/" + key;
    }

    public void deleteByStoredPath(String storedPath) {
        if (storedPath == null || storedPath.isBlank() || bucket.isBlank()) {
            return;
        }

        String key = extractKey(storedPath);
        if (key == null) {
            return;
        }

        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build());
        } catch (RuntimeException ignored) {
            // 파일 삭제 실패는 요청 전체를 실패시키지 않음
        }
    }

    private String resolvePublicBaseUrl(String publicBaseUrl, String bucket, String region) {
        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            return trimTrailingSlash(publicBaseUrl.trim());
        }
        return "https://" + bucket + ".s3." + region + ".amazonaws.com";
    }

    private String extractKey(String storedPath) {
        String value = stripQuery(storedPath.trim());
        if (value.startsWith("http://") || value.startsWith("https://")) {
            if (publicBaseUrl != null && value.startsWith(publicBaseUrl + "/")) {
                return value.substring(publicBaseUrl.length() + 1);
            }

            try {
                String path = URI.create(value).getPath();
                if (path == null || path.isBlank()) {
                    return null;
                }
                String key = path.startsWith("/") ? path.substring(1) : path;
                if (key.startsWith(bucket + "/")) {
                    key = key.substring(bucket.length() + 1);
                }
                return isManagedKey(key) ? key : null;
            } catch (IllegalArgumentException e) {
                return null;
            }
        }

        String key = value.startsWith("/") ? value.substring(1) : value;
        return isManagedKey(key) ? key : null;
    }

    private boolean isManagedKey(String key) {
        for (ImageFolder folder : ImageFolder.values()) {
            if (key.startsWith(folder.folderName() + "/")) {
                return true;
            }
        }
        return false;
    }

    private String stripQuery(String value) {
        int queryIndex = value.indexOf('?');
        return queryIndex >= 0 ? value.substring(0, queryIndex) : value;
    }

    private String trimTrailingSlash(String value) {
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
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

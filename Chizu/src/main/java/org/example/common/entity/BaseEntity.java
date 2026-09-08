package org.example.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
@MappedSuperclass
public abstract class BaseEntity {

    @Column(nullable = false)
    private boolean deleted = false;

    @Column
    private LocalDateTime deletedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(updatable = false)
    private Long createdBy;

    private Long updatedBy;

    public boolean isDeleted() {
        return deleted;
    }

    public void markCreated(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        this.deleted = false;
        this.deletedAt = null;
        this.createdAt = now;
        this.updatedAt = now;
        this.createdBy = userId;
        this.updatedBy = userId;
    }

    public void markUpdated(Long userId) {
        this.updatedAt = LocalDateTime.now();
        this.updatedBy = userId;
    }

    protected void markDeleted() {
        LocalDateTime now = LocalDateTime.now();
        this.deleted = true;
        this.deletedAt = now;
        this.updatedAt = now;
    }

    protected void clearDeleted() {
        this.deleted = false;
        this.deletedAt = null;
    }
}

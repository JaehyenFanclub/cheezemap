package org.example.autoPlace.Repository;

import org.example.autoPlace.Entity.AutoPlace;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AutoPlaceRepository extends JpaRepository<AutoPlace, String> {
}

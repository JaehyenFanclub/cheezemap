package org.example.route.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.example.route.service.NavitimeRouteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/route")
@RequiredArgsConstructor
@Tag(name = "Route", description = "대중교통 경로 검색 API")
public class NavitimeRouteController {

    private final NavitimeRouteService navitimeRouteService;

    @Operation(summary = "NAVITIME 대중교통 경로 검색")
    @GetMapping("/transit")
    public Map<String, Object> searchTransit(
            @Parameter(description = "출발지 lat,lng", example = "35.681236,139.767125")
            @RequestParam String start,
            @Parameter(description = "도착지 lat,lng", example = "35.658034,139.701636")
            @RequestParam String goal,
            @Parameter(description = "출발 시각 YYYY-MM-DDTHH:mm:ss")
            @RequestParam(required = false) String startTime
    ) {
        return navitimeRouteService.searchTransit(start, goal, startTime);
    }
}

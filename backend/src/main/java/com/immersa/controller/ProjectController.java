package com.immersa.controller;

import com.immersa.model.Project;
import com.immersa.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public List<Project> getAllProjects() {
        return projectService.getAllProjects();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable UUID id) {
        return projectService.getProjectById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Project createProject(@RequestBody Map<String, String> payload) {
        String name = payload.getOrDefault("name", "Untitled Project");
        String description = payload.get("description");
        return projectService.createProject(name, description);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable UUID id, @RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        String description = (String) payload.get("description");
        // sceneConfig might be a JSON object, we expect a stringified JSON or we simply
        // store the raw map as string if we used a library
        // For simplicity, let's assume the frontend sends a string or map.
        // If it's a Map, we should deserialize it to String. But simple approach:
        // expect 'sceneConfig' as string or Map.

        String sceneConfig = null;
        if (payload.containsKey("sceneConfig")) {
            Object configObj = payload.get("sceneConfig");
            if (configObj instanceof String) {
                sceneConfig = (String) configObj;
            } else {
                // 使用 ObjectMapper 正确序列化 JSON
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    sceneConfig = mapper.writeValueAsString(configObj);
                } catch (Exception e) {
                    sceneConfig = "{}";
                }
            }
        }

        try {
            return ResponseEntity.ok(projectService.updateProject(id, name, description, sceneConfig));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id) {
        projectService.deleteProject(id);
        return ResponseEntity.ok().build();
    }
}

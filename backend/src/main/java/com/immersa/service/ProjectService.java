package com.immersa.service;

import com.immersa.model.Project;
import com.immersa.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public Optional<Project> getProjectById(UUID id) {
        return projectRepository.findById(id);
    }

    public Project createProject(String name, String description) {
        Project project = new Project();
        project.setName(name);
        project.setDescription(description);
        // Default empty config or preset can be set here
        project.setSceneConfig("{}");
        return projectRepository.save(project);
    }

    public Project updateProject(UUID id, String name, String description, String sceneConfig) {
        return projectRepository.findById(id).map(project -> {
            if (name != null)
                project.setName(name);
            if (description != null)
                project.setDescription(description);
            if (sceneConfig != null)
                project.setSceneConfig(sceneConfig);
            return projectRepository.save(project);
        }).orElseThrow(() -> new RuntimeException("Project not found with id " + id));
    }

    public void deleteProject(UUID id) {
        projectRepository.deleteById(id);
    }
}

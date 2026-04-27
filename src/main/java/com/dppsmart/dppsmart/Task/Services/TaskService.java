package com.dppsmart.dppsmart.Task.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.Task.DTO.CreateTaskDto;
import com.dppsmart.dppsmart.Task.DTO.TaskResponseDto;
import com.dppsmart.dppsmart.Task.DTO.UpdateTaskDto;
import com.dppsmart.dppsmart.Task.DTO.UpdateTaskStatusDto;
import com.dppsmart.dppsmart.Task.Entities.Task;
import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import com.dppsmart.dppsmart.Task.Mapper.TaskMapper;
import com.dppsmart.dppsmart.Task.Repositories.TaskRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final OrganizationRepository organizationRepository;
    private final EmployeesRepository employeesRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public TaskResponseDto create(CreateTaskDto dto) {
        User user = getCurrentUser();

        if (!organizationRepository.existsById(dto.getOrganizationId())) {
            throw new NotFoundException("Organization not found");
        }
        if (!permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        Task task = new Task();
        task.setId(NanoIdUtils.randomNanoId());
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setOrganizationId(dto.getOrganizationId());
        task.setAssignedEmployeeIds(dto.getAssignedEmployeeIds() != null ? dto.getAssignedEmployeeIds() : new ArrayList<>());
        task.setStatus(dto.getStatus());
        task.setPriority(dto.getPriority());
        task.setProgress(dto.getProgress() != null ? dto.getProgress() : 0);
        task.setDueDate(dto.getDueDate());
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        task.setCreatedBy(user.getEmail());
        task.setUpdatedBy(user.getEmail());

        return TaskMapper.toDto(taskRepository.save(task));
    }

    public TaskResponseDto update(UpdateTaskDto dto) {
        User user = getCurrentUser();

        Task task = taskRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Task not found"));

        if (!permissionService.canAccessOrganization(user, task.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this task");
        }

        if (dto.getTitle() != null && !dto.getTitle().isBlank()) task.setTitle(dto.getTitle());
        if (dto.getDescription() != null) task.setDescription(dto.getDescription());
        if (dto.getOrganizationId() != null && !dto.getOrganizationId().isBlank()) {
            if (!organizationRepository.existsById(dto.getOrganizationId()))
                throw new NotFoundException("Organization not found");
            task.setOrganizationId(dto.getOrganizationId());
        }
        if (dto.getAssignedEmployeeIds() != null) task.setAssignedEmployeeIds(dto.getAssignedEmployeeIds());
        if (dto.getStatus() != null) task.setStatus(dto.getStatus());
        if (dto.getPriority() != null) task.setPriority(dto.getPriority());
        if (dto.getProgress() != null) task.setProgress(dto.getProgress());
        if (dto.getDueDate() != null) task.setDueDate(dto.getDueDate());

        task.setUpdatedAt(LocalDateTime.now());
        task.setUpdatedBy(user.getEmail());

        return TaskMapper.toDto(taskRepository.save(task));
    }

    public TaskResponseDto updateStatus(String id, UpdateTaskStatusDto dto) {
        User user = getCurrentUser();

        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        if (user.getRole() == Roles.EMPLOYEE) {
            boolean isAssigned = task.getAssignedEmployeeIds() != null &&
                    employeesRepository.findByOrganizationId(task.getOrganizationId())
                            .stream()
                            .anyMatch(e -> e.getCreatedBy() != null && e.getCreatedBy().equals(user.getEmail()));
            if (!isAssigned && !permissionService.canAccessOrganization(user, task.getOrganizationId())) {
                throw new ForbiddenException("You are not allowed to update this task");
            }
        } else if (!permissionService.canAccessOrganization(user, task.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this task");
        }

        task.setStatus(dto.getStatus());
        if (dto.getProgress() != null) task.setProgress(dto.getProgress());
        if (dto.getStatus() == TaskStatus.DONE) task.setProgress(100);
        if (dto.getStatus() == TaskStatus.TODO) task.setProgress(0);

        task.setUpdatedAt(LocalDateTime.now());
        task.setUpdatedBy(user.getEmail());

        return TaskMapper.toDto(taskRepository.save(task));
    }

    public TaskResponseDto getById(String id) {
        User user = getCurrentUser();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        if (!permissionService.canAccessOrganization(user, task.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access this task");
        }
        return TaskMapper.toDto(task);
    }

    public List<TaskResponseDto> getAll() {
        User user = getCurrentUser();
        return taskRepository.findAll().stream()
                .filter(t -> permissionService.canAccessOrganization(user, t.getOrganizationId()))
                .map(TaskMapper::toDto)
                .toList();
    }

    public List<TaskResponseDto> getByOrganization(String organizationId) {
        User user = getCurrentUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }
        return taskRepository.findByOrganizationId(organizationId)
                .stream()
                .map(TaskMapper::toDto)
                .toList();
    }

    public List<TaskResponseDto> getByEmployee(String employeeId) {
        User user = getCurrentUser();
        return taskRepository.findByAssignedEmployeeIdsContaining(employeeId)
                .stream()
                .filter(t -> permissionService.canAccessOrganization(user, t.getOrganizationId()))
                .map(TaskMapper::toDto)
                .toList();
    }

    public void delete(String id) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.EMPLOYEE || user.getRole() == Roles.CLIENT) {
            throw new ForbiddenException("You are not allowed to delete tasks");
        }
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        if (!permissionService.canAccessOrganization(user, task.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this task");
        }
        taskRepository.deleteById(id);
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

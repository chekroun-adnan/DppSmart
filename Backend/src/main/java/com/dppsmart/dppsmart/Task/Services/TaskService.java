package com.dppsmart.dppsmart.Task.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.Task.DTO.*;
import com.dppsmart.dppsmart.Task.Entities.Task;
import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import com.dppsmart.dppsmart.Task.Entities.TaskTimelineEvent;
import com.dppsmart.dppsmart.Task.Mapper.TaskMapper;
import com.dppsmart.dppsmart.Task.Repositories.TaskRepository;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepEntity;
import com.dppsmart.dppsmart.Production.Repositories.ProductionStepEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static com.dppsmart.dppsmart.Task.Entities.TaskStatus.*;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final OrganizationRepository organizationRepository;
    private final EmployeesRepository employeesRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;
    private final ProductionStepEntityRepository productionStepEntityRepository;

    public TaskResponseDto create(CreateTaskDto dto) {
        User user = getCurrentUser();
        if (!organizationRepository.existsById(dto.getOrganizationId())) {
            throw new NotFoundException("Organization not found");
        }
        if (!permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        Task task = buildTaskFromDto(dto, new Task());
        task.setId(NanoIdUtils.randomNanoId());
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        task.setCreatedBy(user.getEmail());
        task.setUpdatedBy(user.getEmail());

        addTimelineEvent(task, "CREATED", "Task created", user, null, null, null);
        Task saved = taskRepository.save(task);
        auditService.log("Task", saved.getId(), "CREATE", saved.getOrganizationId(), null, "Task created: " + saved.getTitle());
        notifyAssignment(saved, user);
        return TaskMapper.toDto(saved);
    }

    public TaskResponseDto update(UpdateTaskDto dto) {
        User user = getCurrentUser();
        Task task = taskRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Task not found"));
        if (!permissionService.canAccessOrganization(user, task.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this task");
        }

        String prevEmployee = task.getAssignedEmployeeId();
        TaskStatus prevStatus = task.getStatus();
        buildTaskFromDto(dto, task);
        task.setUpdatedAt(LocalDateTime.now());
        task.setUpdatedBy(user.getEmail());

        if (dto.getStatus() != null && dto.getStatus() != prevStatus) {
            addTimelineEvent(task, "STATUS_CHANGE", "Status changed to " + dto.getStatus(), user, null, null, null);
        }
        if (dto.getAssignedEmployeeId() != null && !dto.getAssignedEmployeeId().equals(prevEmployee)) {
            addTimelineEvent(task, "ASSIGNMENT", "Task assigned", user, null, null, null);
        }

        Task saved = taskRepository.save(task);
        auditService.log("Task", saved.getId(), "UPDATE", saved.getOrganizationId(), null, "Task updated: " + saved.getTitle());
        notifyAssignment(saved, user);
        return TaskMapper.toDto(saved);
    }

    public TaskResponseDto updateStatus(String id, UpdateTaskStatusDto dto) {
        User user = getCurrentUser();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        if (user.getRole() == Roles.EMPLOYEE && !user.getEmail().equals(task.getAssignedEmployeeId())) {
            boolean isAssigned = task.getAssignedEmployeeId() != null &&
                    employeesRepository.findById(task.getAssignedEmployeeId())
                            .map(e -> e.getEmail().equals(user.getEmail())).orElse(false);
            if (!isAssigned && !permissionService.canAccessOrganization(user, task.getOrganizationId())) {
                throw new ForbiddenException("You are not allowed to update this task");
            }
        } else if (!permissionService.canAccessOrganization(user, task.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this task");
        }

        TaskStatus newStatus = dto.getStatus() != null ? dto.getStatus() : task.getStatus();
        TaskStatus oldStatus = task.getStatus();

        task.setStatus(newStatus);
        task.setUpdatedAt(LocalDateTime.now());
        task.setUpdatedBy(user.getEmail());

        if (dto.getCompletedQuantity() != null) {
            int completed = task.getCompletedQuantity() != null ? task.getCompletedQuantity() : 0;
            task.setCompletedQuantity(completed + dto.getCompletedQuantity());
            int req = task.getRequiredQuantity() != null ? task.getRequiredQuantity() : 0;
            int newCompleted = task.getCompletedQuantity();
            task.setRemainingQuantity(Math.max(0, req - newCompleted));
            task.setCompletionPercentage(req > 0 ? Math.min(100, (int) Math.round((newCompleted * 100.0) / req)) : 0);
            addTimelineEvent(task, "PROGRESS", "Progress reported: +" + dto.getCompletedQuantity(), user,
                    completed, task.getCompletedQuantity(), dto.getNotes());
        }

        if (dto.getCompletionPercentage() != null) {
            int prev = task.getCompletionPercentage() != null ? task.getCompletionPercentage() : 0;
            task.setCompletionPercentage(dto.getCompletionPercentage());
            addTimelineEvent(task, "PROGRESS", "Progress updated to " + dto.getCompletionPercentage() + "%", user,
                    prev, dto.getCompletionPercentage(), dto.getNotes());
        }

        if (newStatus == IN_PROGRESS && oldStatus != IN_PROGRESS) {
            task.setActualStart(LocalDateTime.now());
            addTimelineEvent(task, "STARTED", "Task started", user, null, null, null);
        }

        if (newStatus == PAUSED && oldStatus != PAUSED) {
            addTimelineEvent(task, "PAUSED", "Task paused", user, null, null, null);
        }

        if (newStatus == COMPLETED && oldStatus != COMPLETED) {
            task.setActualEnd(LocalDateTime.now());
            task.setCompletionPercentage(100);
            task.setCompletedQuantity(task.getRequiredQuantity());
            task.setRemainingQuantity(0);
            if (task.getActualStart() != null) {
                task.setActualDurationMinutes((int) ChronoUnit.MINUTES.between(task.getActualStart(), task.getActualEnd()));
            }
            addTimelineEvent(task, "COMPLETED", "Task completed", user, null, null, null);
        }

        if (newStatus == CANCELLED) {
            addTimelineEvent(task, "CANCELLED", "Task cancelled", user, null, null, null);
        }

        if (newStatus == BLOCKED) {
            addTimelineEvent(task, "BLOCKED", "Task blocked", user, null, null, dto.getNotes());
        }

        Task saved = taskRepository.save(task);
        auditService.log("Task", saved.getId(), "STATUS_CHANGE", saved.getOrganizationId(), null,
                "Task status changed from " + oldStatus + " to " + newStatus + ": " + saved.getTitle());

        if (!Objects.equals(newStatus, oldStatus)) {
            notificationService.createNotification(
                    user.getId(),
                    "Task Status Updated",
                    saved.getTitle() + " is now " + newStatus,
                    com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.TASK,
                    "/tasks/" + saved.getId()
            );
        }

        return TaskMapper.toDto(saved);
    }

    public void reportProgress(String id, int quantity, String notes) {
        User user = getCurrentUser();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        if (!permissionService.canAccessOrganization(user, task.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this task");
        }

        int completed = task.getCompletedQuantity() != null ? task.getCompletedQuantity() : 0;
        task.setCompletedQuantity(completed + quantity);
        int req = task.getRequiredQuantity() != null ? task.getRequiredQuantity() : 0;
        task.setRemainingQuantity(Math.max(0, req - task.getCompletedQuantity()));
        task.setCompletionPercentage(req > 0 ? Math.min(100, (int) Math.round((task.getCompletedQuantity() * 100.0) / req)) : 0);
        task.setUpdatedAt(LocalDateTime.now());
        task.setUpdatedBy(user.getEmail());

        if (task.getStatus() == PLANNED || task.getStatus() == READY) {
            task.setStatus(IN_PROGRESS);
            task.setActualStart(LocalDateTime.now());
            addTimelineEvent(task, "STARTED", "Task started with progress report", user, null, null, notes);
        }

        addTimelineEvent(task, "PROGRESS", "Progress reported: +" + quantity, user, completed, task.getCompletedQuantity(), notes);

        if (task.getCompletedQuantity() >= req && req > 0) {
            task.setStatus(COMPLETED);
            task.setActualEnd(LocalDateTime.now());
            task.setCompletionPercentage(100);
            task.setRemainingQuantity(0);
            if (task.getActualStart() != null) {
                task.setActualDurationMinutes((int) ChronoUnit.MINUTES.between(task.getActualStart(), task.getActualEnd()));
            }
            addTimelineEvent(task, "COMPLETED", "Task auto-completed (all quantity produced)", user, null, null, null);
        }

        taskRepository.save(task);
        auditService.log("Task", task.getId(), "PROGRESS", task.getOrganizationId(), null,
                "Progress reported: +" + quantity + " on " + task.getTitle());

        syncOperationProgress(task);
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
        return taskRepository.findByOrganizationId(organizationId).stream()
                .map(TaskMapper::toDto)
                .toList();
    }

    public List<TaskResponseDto> getByEmployee(String employeeId) {
        User user = getCurrentUser();
        if (!permissionService.canAccessOrganization(user, user.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed");
        }
        return taskRepository.findByAssignedEmployeeId(employeeId).stream()
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
        auditService.log("Task", id, "DELETE", task.getOrganizationId(), null, "Task deleted: " + task.getTitle());
    }


    public TaskDashboardDto getDashboard(String organizationId) {
        User user = getCurrentUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("Access denied");
        }

        List<Task> allTasks = taskRepository.findByOrganizationId(organizationId);
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        long totalTasks = allTasks.size();
        long assignedToday = allTasks.stream()
                .filter(t -> t.getCreatedAt() != null && t.getCreatedAt().isAfter(startOfDay) && t.getCreatedAt().isBefore(endOfDay))
                .count();
        long inProgress = allTasks.stream().filter(t -> t.getStatus() == IN_PROGRESS).count();
        long completedToday = allTasks.stream()
                .filter(t -> t.getStatus() == COMPLETED && t.getUpdatedAt() != null
                        && t.getUpdatedAt().isAfter(startOfDay) && t.getUpdatedAt().isBefore(endOfDay))
                .count();
        long blockedTasks = allTasks.stream().filter(t -> t.getStatus() == BLOCKED).count();
        long overdueTasks = allTasks.stream()
                .filter(t -> t.getPlannedEnd() != null && t.getPlannedEnd().isBefore(LocalDateTime.now())
                        && t.getStatus() != COMPLETED && t.getStatus() != CANCELLED)
                .count();
        long tasksDueToday = allTasks.stream()
                .filter(t -> t.getPlannedEnd() != null && t.getPlannedEnd().isAfter(startOfDay)
                        && t.getPlannedEnd().isBefore(endOfDay) && t.getStatus() != COMPLETED && t.getStatus() != CANCELLED)
                .count();

        List<Task> completed = allTasks.stream()
                .filter(t -> t.getStatus() == COMPLETED && t.getActualDurationMinutes() != null)
                .toList();
        double avgCompletion = completed.isEmpty() ? 0 :
                completed.stream().mapToInt(t -> t.getActualDurationMinutes() != null ? t.getActualDurationMinutes() : 0).average().orElse(0);

        List<DepartmentWorkloadDto> deptWorkload = buildDepartmentWorkload(allTasks, organizationId);
        List<EmployeeWorkloadDto> empWorkload = buildEmployeeWorkload(allTasks, organizationId);

        return TaskDashboardDto.builder()
                .totalTasks(totalTasks).assignedToday(assignedToday)
                .inProgress(inProgress).completedToday(completedToday)
                .blockedTasks(blockedTasks).overdueTasks(overdueTasks)
                .tasksDueToday(tasksDueToday).averageCompletionTime(avgCompletion)
                .departmentWorkload(deptWorkload).employeeWorkload(empWorkload)
                .build();
    }

    public List<OverdueTaskDto> getOverdueTasks(String organizationId) {
        User user = getCurrentUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("Access denied");
        }

        LocalDateTime now = LocalDateTime.now();
        return taskRepository.findByOrganizationId(organizationId).stream()
                .filter(t -> t.getPlannedEnd() != null && t.getPlannedEnd().isBefore(now)
                        && t.getStatus() != COMPLETED && t.getStatus() != CANCELLED)
                .map(t -> OverdueTaskDto.builder()
                        .taskId(t.getId()).title(t.getTitle())
                        .employeeName(t.getAssignedEmployeeName())
                        .departmentName(t.getAssignedDepartmentName())
                        .orderReference(t.getOrderReference())
                        .delayMinutes(t.getDelayMinutes() != null ? t.getDelayMinutes() : (int) ChronoUnit.MINUTES.between(t.getPlannedEnd(), now))
                        .plannedEnd(t.getPlannedEnd())
                        .priority(t.getPriority() != null ? t.getPriority().name() : "MEDIUM")
                        .build())
                .sorted(Comparator.comparingLong(OverdueTaskDto::getDelayMinutes).reversed())
                .toList();
    }


    public TaskResponseDto generateFromOperation(ProductionStepEntity step, String organizationId, String orderRef) {
        if (step.getOperationName() == null) return null;

        String existingTaskId = null;
        List<Task> existing = taskRepository.findByOperationId(step.getId());
        if (!existing.isEmpty()) {
            existingTaskId = existing.get(0).getId();
        }

        if (existingTaskId != null) {
            Task existingTask = taskRepository.findById(existingTaskId).orElse(null);
            if (existingTask != null) {
                existingTask.setCompletionPercentage(step.getCompletionPercentage() != null ? step.getCompletionPercentage().intValue() : null);
                existingTask.setCompletedQuantity(step.getCompletedQuantity());
                existingTask.setRemainingQuantity(step.getRemainingQuantity());
                existingTask.setStatus(mapStepStatusToTaskStatus(step.getStatus()));
                existingTask.setUpdatedAt(LocalDateTime.now());
                Task saved = taskRepository.save(existingTask);
                return TaskMapper.toDto(saved);
            }
        }

        Task task = new Task();
        task.setId(NanoIdUtils.randomNanoId());
        task.setTitle(step.getOperationName());
        task.setTaskType(com.dppsmart.dppsmart.Task.Entities.TaskType.PRODUCTION);
        task.setPriority(com.dppsmart.dppsmart.Task.Entities.TaskPriority.MEDIUM);
        task.setStatus(mapStepStatusToTaskStatus(step.getStatus()));
        task.setOrganizationId(organizationId);
        task.setAssignedEmployeeId(step.getAssignedEmployee());
        task.setAssignedEmployeeName(step.getAssignedEmployeeName());
        task.setAssignedDepartmentId(step.getResponsibleDepartment());
        task.setAssignedDepartmentName(step.getResponsibleDepartment());
        task.setProductionOrderId(step.getProductionOrderId());
        task.setOperationId(step.getId());
        task.setOperationName(step.getOperationName());
        task.setPlannedStart(step.getPlannedStartTime());
        task.setPlannedEnd(step.getPlannedEndTime());
        task.setRequiredQuantity(step.getRequiredQuantity());
        task.setCompletedQuantity(step.getCompletedQuantity() != null ? step.getCompletedQuantity() : 0);
        task.setRemainingQuantity(step.getRemainingQuantity());
        task.setCompletionPercentage(step.getCompletionPercentage() != null ? step.getCompletionPercentage().intValue() : null);
        task.setEstimatedDurationMinutes(step.getPlannedDurationMinutes());
        task.setActualDurationMinutes(step.getActualDurationMinutes());
        task.setOrderReference(orderRef);
        task.setNotes(step.getInstructions());
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        task.setCreatedBy("system");
        task.setUpdatedBy("system");
        addTimelineEvent(task, "AUTO_GENERATED", "Auto-generated from production operation", null, null, null, null);

        Task saved = taskRepository.save(task);
        return TaskMapper.toDto(saved);
    }

    public void syncOperationProgress(Task task) {
        if (task.getOperationId() == null) return;
        productionStepEntityRepository.findById(task.getOperationId()).ifPresent(step -> {
            step.setCompletedQuantity(task.getCompletedQuantity());
            step.setRemainingQuantity(task.getRemainingQuantity());
            step.setCompletionPercentage(task.getCompletionPercentage() != null ? task.getCompletionPercentage().doubleValue() : null);
            step.setStatus(mapTaskStatusToStepStatus(task.getStatus()));
            productionStepEntityRepository.save(step);
        });
    }


    public Map<String, Object> getEmployeeDashboard(String employeeId, String organizationId) {
        User user = getCurrentUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("Access denied");
        }

        List<Task> myTasks = taskRepository.findByAssignedEmployeeId(employeeId).stream()
                .filter(t -> organizationId.equals(t.getOrganizationId()))
                .toList();

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);

        long tasksToday = myTasks.stream()
                .filter(t -> t.getPlannedStart() != null && t.getPlannedStart().isAfter(todayStart) && t.getPlannedStart().isBefore(todayEnd))
                .count();
        long inProgress = myTasks.stream().filter(t -> t.getStatus() == IN_PROGRESS).count();
        long overdue = myTasks.stream()
                .filter(t -> t.getPlannedEnd() != null && t.getPlannedEnd().isBefore(LocalDateTime.now())
                        && t.getStatus() != COMPLETED && t.getStatus() != CANCELLED)
                .count();
        long completedToday = myTasks.stream()
                .filter(t -> t.getStatus() == COMPLETED && t.getUpdatedAt() != null
                        && t.getUpdatedAt().isAfter(todayStart) && t.getUpdatedAt().isBefore(todayEnd))
                .count();
        int producedQty = myTasks.stream()
                .filter(t -> t.getStatus() == COMPLETED && t.getUpdatedAt() != null
                        && t.getUpdatedAt().isAfter(todayStart) && t.getUpdatedAt().isBefore(todayEnd))
                .mapToInt(t -> t.getCompletedQuantity() != null ? t.getCompletedQuantity() : 0)
                .sum();
        long totalCompleted = myTasks.stream().filter(t -> t.getStatus() == COMPLETED).count();

        double efficiency = 0;
        if (totalCompleted > 0) {
            long onTime = myTasks.stream()
                    .filter(t -> t.getStatus() == COMPLETED && (t.getPlannedEnd() == null || t.getActualEnd() == null
                            || !t.getActualEnd().isAfter(t.getPlannedEnd())))
                    .count();
            efficiency = Math.round((onTime * 100.0) / totalCompleted);
        }

        int totalDuration = myTasks.stream()
                .filter(t -> t.getActualDurationMinutes() != null)
                .mapToInt(t -> t.getActualDurationMinutes()).sum();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tasksToday", tasksToday);
        result.put("inProgress", inProgress);
        result.put("overdue", overdue);
        result.put("completedToday", completedToday);
        result.put("producedQuantityToday", producedQty);
        result.put("hoursWorked", Math.round(totalDuration / 60.0 * 10.0) / 10.0);
        result.put("efficiency", efficiency);
        result.put("totalTasks", myTasks.size());
        return result;
    }


    private Task buildTaskFromDto(UpdateTaskDto dto, Task task) {
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setTaskType(dto.getTaskType() != null ? dto.getTaskType() : com.dppsmart.dppsmart.Task.Entities.TaskType.CUSTOM);
        if (dto.getStatus() != null) task.setStatus(dto.getStatus());
        if (dto.getPriority() != null) task.setPriority(dto.getPriority());
        if (dto.getAssignedEmployeeId() != null) task.setAssignedEmployeeId(dto.getAssignedEmployeeId());
        task.setAssignedEmployeeName(dto.getAssignedEmployeeName());
        task.setAssignedDepartmentId(dto.getAssignedDepartmentId());
        task.setAssignedDepartmentName(dto.getAssignedDepartmentName());
        task.setOrderId(dto.getOrderId());
        task.setOrderReference(dto.getOrderReference());
        task.setProductionOrderId(dto.getProductionOrderId());
        task.setOperationId(dto.getOperationId());
        task.setOperationName(dto.getOperationName());
        task.setPlannedStart(dto.getPlannedStart());
        task.setPlannedEnd(dto.getPlannedEnd());
        if (dto.getCompletionPercentage() != null) {
            task.setCompletionPercentage(dto.getCompletionPercentage());
        }
        if (dto.getRequiredQuantity() != null) task.setRequiredQuantity(dto.getRequiredQuantity());
        if (dto.getCompletedQuantity() != null) {
            task.setCompletedQuantity(dto.getCompletedQuantity());
            int req = task.getRequiredQuantity() != null ? task.getRequiredQuantity() : 0;
            task.setRemainingQuantity(Math.max(0, req - dto.getCompletedQuantity()));
        }
        if (dto.getEstimatedDurationMinutes() != null) task.setEstimatedDurationMinutes(dto.getEstimatedDurationMinutes());
        if (dto.getActualDurationMinutes() != null) task.setActualDurationMinutes(dto.getActualDurationMinutes());
        if (dto.getDelayMinutes() != null) task.setDelayMinutes(dto.getDelayMinutes());
        task.setNotes(dto.getNotes());
        if (task.getTimeline() == null) {
            task.setTimeline(new ArrayList<>());
        }
        return task;
    }

    private Task buildTaskFromDto(CreateTaskDto dto, Task task) {
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setTaskType(dto.getTaskType() != null ? dto.getTaskType() : com.dppsmart.dppsmart.Task.Entities.TaskType.CUSTOM);
        task.setStatus(dto.getStatus());
        task.setPriority(dto.getPriority());
        task.setOrganizationId(dto.getOrganizationId());
        task.setAssignedEmployeeId(dto.getAssignedEmployeeId());
        task.setAssignedEmployeeName(dto.getAssignedEmployeeName());
        task.setAssignedDepartmentId(dto.getAssignedDepartmentId());
        task.setAssignedDepartmentName(dto.getAssignedDepartmentName());
        task.setOrderId(dto.getOrderId());
        task.setOrderReference(dto.getOrderReference());
        task.setProductionOrderId(dto.getProductionOrderId());
        task.setOperationId(dto.getOperationId());
        task.setOperationName(dto.getOperationName());
        task.setPlannedStart(dto.getPlannedStart());
        task.setPlannedEnd(dto.getPlannedEnd());

        if (dto.getCompletionPercentage() != null) {
            task.setCompletionPercentage(dto.getCompletionPercentage());
        } else {
            task.setCompletionPercentage(0);
        }

        task.setRequiredQuantity(dto.getRequiredQuantity());
        int completed = dto.getCompletedQuantity() != null ? dto.getCompletedQuantity() : 0;
        task.setCompletedQuantity(completed);
        int req = dto.getRequiredQuantity() != null ? dto.getRequiredQuantity() : 0;
        task.setRemainingQuantity(Math.max(0, req - completed));
        task.setEstimatedDurationMinutes(dto.getEstimatedDurationMinutes());
        task.setNotes(dto.getNotes());

        if (task.getTimeline() == null) {
            task.setTimeline(new ArrayList<>());
        }

        return task;
    }

    private void addTimelineEvent(Task task, String eventType, String label, User user,
                                   Integer prevVal, Integer newVal, String notes) {
        if (task.getTimeline() == null) {
            task.setTimeline(new ArrayList<>());
        }
        TaskTimelineEvent event = TaskTimelineEvent.builder()
                .eventType(eventType)
                .label(label)
                .employeeId(user != null ? user.getId() : "system")
                .employeeName(user != null ? user.getName() : "System")
                .previousValue(prevVal)
                .newValue(newVal)
                .notes(notes)
                .timestamp(LocalDateTime.now())
                .build();
        task.getTimeline().add(event);
    }

    private void notifyAssignment(Task saved, User user) {
        if (saved.getAssignedEmployeeId() != null) {
            employeesRepository.findById(saved.getAssignedEmployeeId()).ifPresent(emp -> {
                userRepository.findByEmail(emp.getEmail()).ifPresent(u -> {
                    notificationService.createNotification(
                            u.getId(), "Task Assigned",
                            "You have been assigned: " + saved.getTitle(),
                            com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.TASK,
                            "/my-tasks"
                    );
                });
            });
        }
    }

    private TaskStatus mapStepStatusToTaskStatus(com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus stepStatus) {
        if (stepStatus == null) return PLANNED;
        return switch (stepStatus) {
            case PLANNED -> PLANNED;
            case READY -> READY;
            case IN_PROGRESS -> IN_PROGRESS;
            case PENDING, WAITING -> PLANNED;
            case BLOCKED -> BLOCKED;
            case OVERDUE -> IN_PROGRESS;
            case SKIPPED -> CANCELLED;
            case COMPLETED -> COMPLETED;
        };
    }

    private com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus mapTaskStatusToStepStatus(TaskStatus taskStatus) {
        if (taskStatus == null) return com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus.PLANNED;
        return switch (taskStatus) {
            case PLANNED, READY -> com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus.READY;
            case IN_PROGRESS -> com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus.IN_PROGRESS;
            case PAUSED -> com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus.PLANNED;
            case BLOCKED -> com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus.BLOCKED;
            case COMPLETED, DONE -> com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus.COMPLETED;
            case CANCELLED -> com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus.SKIPPED;
            case UNDER_REVIEW -> com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus.PLANNED;
        };
    }

    private List<DepartmentWorkloadDto> buildDepartmentWorkload(List<Task> allTasks, String orgId) {
        Map<String, List<Task>> byDept = allTasks.stream()
                .filter(t -> t.getAssignedDepartmentId() != null)
                .collect(Collectors.groupingBy(Task::getAssignedDepartmentId));

        List<DepartmentWorkloadDto> result = new ArrayList<>();
        for (Map.Entry<String, List<Task>> entry : byDept.entrySet()) {
            String deptId = entry.getKey();
            List<Task> deptTasks = entry.getValue();
            String deptName = deptTasks.stream()
                    .map(Task::getAssignedDepartmentName)
                    .filter(Objects::nonNull)
                    .findFirst().orElse(deptId);
            long active = deptTasks.stream()
                    .filter(t -> t.getStatus() == IN_PROGRESS || t.getStatus() == PAUSED || t.getStatus() == READY)
                    .count();
            int empCount = (int) deptTasks.stream()
                    .map(Task::getAssignedEmployeeId)
                    .filter(Objects::nonNull)
                            .distinct().count();
            int capacity = Math.max(empCount, 1);
            double util = Math.round((active * 100.0) / Math.max(capacity * 3, 1));

            result.add(DepartmentWorkloadDto.builder()
                    .departmentId(deptId).departmentName(deptName)
                    .activeTasks(active).totalTasks(deptTasks.size())
                    .capacity(capacity).utilizationPercent(util)
                    .build());
        }
        return result;
    }

    private List<EmployeeWorkloadDto> buildEmployeeWorkload(List<Task> allTasks, String orgId) {
        Map<String, List<Task>> byEmp = allTasks.stream()
                .filter(t -> t.getAssignedEmployeeId() != null)
                .collect(Collectors.groupingBy(Task::getAssignedEmployeeId));

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);

        List<EmployeeWorkloadDto> result = new ArrayList<>();
        for (Map.Entry<String, List<Task>> entry : byEmp.entrySet()) {
            String empId = entry.getKey();
            List<Task> empTasks = entry.getValue();
            String empName = empTasks.stream()
                    .map(Task::getAssignedEmployeeName)
                    .filter(Objects::nonNull)
                    .findFirst().orElse(empId);
            String deptName = empTasks.stream()
                    .map(Task::getAssignedDepartmentName)
                    .filter(Objects::nonNull)
                    .findFirst().orElse("");
            long assigned = empTasks.size();
            long active = empTasks.stream()
                    .filter(t -> t.getStatus() == IN_PROGRESS || t.getStatus() == PAUSED)
                    .count();
            long completedToday = empTasks.stream()
                    .filter(t -> t.getStatus() == COMPLETED && t.getUpdatedAt() != null
                            && t.getUpdatedAt().isAfter(todayStart) && t.getUpdatedAt().isBefore(todayEnd))
                    .count();
            long totalCompleted = empTasks.stream().filter(t -> t.getStatus() == COMPLETED).count();
            double efficiency = totalCompleted > 0 ? Math.round((empTasks.stream()
                    .filter(t -> t.getStatus() == COMPLETED && (t.getPlannedEnd() == null || t.getActualEnd() == null
                            || !t.getActualEnd().isAfter(t.getPlannedEnd())))
                    .count() * 100.0) / totalCompleted) : 0;

            result.add(EmployeeWorkloadDto.builder()
                    .employeeId(empId).employeeName(empName)
                    .assignedTasks(assigned).activeTasks(active)
                    .completedToday(completedToday).efficiencyPercent(efficiency)
                    .capacity(8).utilizationPercent(Math.round((active * 100.0) / 8))
                    .departmentName(deptName)
                    .build());
        }
        return result;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

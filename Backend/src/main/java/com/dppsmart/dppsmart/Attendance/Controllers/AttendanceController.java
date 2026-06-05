package com.dppsmart.dppsmart.Attendance.Controllers;

import com.dppsmart.dppsmart.Attendance.DTO.AttendanceResponseDto;
import com.dppsmart.dppsmart.Attendance.DTO.CheckInDto;
import com.dppsmart.dppsmart.Attendance.Services.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/check-in")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<AttendanceResponseDto> checkIn(@RequestBody @Valid CheckInDto dto) {
        return ResponseEntity.ok(attendanceService.checkIn(dto));
    }

    @PostMapping("/check-out/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<AttendanceResponseDto> checkOut(@PathVariable String employeeId) {
        return ResponseEntity.ok(attendanceService.checkOut(employeeId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<AttendanceResponseDto>> getAll() {
        return ResponseEntity.ok(attendanceService.getAll());
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<AttendanceResponseDto>> getByEmployee(@PathVariable String employeeId) {
        return ResponseEntity.ok(attendanceService.getByEmployee(employeeId));
    }

    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<AttendanceResponseDto>> getByOrganization(@PathVariable String organizationId) {
        return ResponseEntity.ok(attendanceService.getByOrganization(organizationId));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AttendanceResponseDto>> getMyAttendance() {
        return ResponseEntity.ok(attendanceService.getMyAttendance());
    }

    @PostMapping("/check-out/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AttendanceResponseDto> checkOutSelf() {
        return ResponseEntity.ok(attendanceService.checkOutSelf());
    }
}

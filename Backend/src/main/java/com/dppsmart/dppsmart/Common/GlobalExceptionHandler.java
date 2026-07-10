package com.dppsmart.dppsmart.Common;

import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.RateLimit.RateLimitException;
import jakarta.validation.ConstraintViolationException;
import org.apache.catalina.connector.ClientAbortException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiError> handleForbidden(ForbiddenException ex) {
        ex.printStackTrace(); return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of("FORBIDDEN", ex.getMessage()));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiError> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of("BAD_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of("VALIDATION_ERROR", "Validation failed", fieldErrors));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of("VALIDATION_ERROR", ex.getMessage()));
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ApiError> handleRateLimit(RateLimitException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .header("X-RateLimit-Remaining", "0")
                .body(ApiError.of("RATE_LIMIT_EXCEEDED", ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
        ex.printStackTrace(); return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of("ACCESS_DENIED", "You do not have permission to perform this action."));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of("INVALID_CREDENTIALS", "Invalid email or password."));
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ApiError> handleLocked(LockedException ex) {
        ex.printStackTrace(); return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of("ACCOUNT_LOCKED", "Account is temporarily locked. Please try again later."));
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handleDisabled(DisabledException ex) {
        ex.printStackTrace(); return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of("ACCOUNT_DISABLED", "Account is disabled. Please contact support."));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of("AUTHENTICATION_FAILED", "Authentication failed. Please log in again."));
    }

    @ExceptionHandler({
            AsyncRequestNotUsableException.class,
            ClientAbortException.class
    })
    public void handleClientAbort(Exception ex) {
    }

    @ExceptionHandler(HttpMessageNotWritableException.class)
    public ResponseEntity<ApiError> handleMessageNotWritable(HttpMessageNotWritableException ex) {
        if (isClientAbort(ex)) return null;
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of("INTERNAL_ERROR", "Failed to write response"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex) {
        if (isClientAbort(ex)) return null;
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of("INTERNAL_ERROR",
                        ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred"));
    }

    private boolean isClientAbort(Throwable ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof ClientAbortException || current instanceof AsyncRequestNotUsableException) {
                return true;
            }
            String message = current.getMessage();
            if (message != null && message.toLowerCase().contains("broken pipe")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}

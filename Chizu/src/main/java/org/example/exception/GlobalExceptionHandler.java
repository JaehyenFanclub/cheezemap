package org.example.exception;

import org.example.common.dto.MsgResponse;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<MsgResponse> handleIllegalArgument(IllegalArgumentException ex) {
        String message = ex.getMessage() == null ? "잘못된 요청입니다." : ex.getMessage();

        if (isUnauthorizedTokenMessage(message)) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new MsgResponse(message, "401"));
        }

        return ResponseEntity
                .badRequest()
                .body(new MsgResponse(message, "400"));
    }

    private boolean isUnauthorizedTokenMessage(String message) {
        return message.contains("유효하지 않은 토큰")
                || message.contains("이미 로그아웃된 토큰")
                || message.contains("토큰은 필수");
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public MsgResponse handleMissingHeader(MissingRequestHeaderException ex) {
        return new MsgResponse(ex.getHeaderName() + " 헤더는 필수입니다.", "400");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public MsgResponse handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return new MsgResponse(message, "400");
    }

    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public MsgResponse handleBindException(BindException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return new MsgResponse(message, "400");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public MsgResponse handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return new MsgResponse("사진 최대 용량이 초과되어 업로드할 수 없습니다. (장당 최대 10MB)", "400");
    }
}

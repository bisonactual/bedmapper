use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::{mpsc, watch};
use uuid::Uuid;

use crate::calibration;
use crate::models::*;
use crate::project;
use crate::sidecar;
use crate::state::*;

// ── Camera Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_camera_backends() -> Result<Vec<BackendInfo>, String> {
    let mut backends = Vec::new();
    if cfg!(target_os = "windows") {
        backends.push(BackendInfo {
            name: "opencv-dshow".to_string(),
            available: true,
            platform: std::env::consts::OS.to_string(),
            description: "OpenCV through Windows DirectShow. Current default for this Arducam UVC camera.".to_string(),
        });
        backends.push(BackendInfo {
            name: "opencv-msmf".to_string(),
            available: true,
            platform: std::env::consts::OS.to_string(),
            description: "OpenCV through Windows Media Foundation. Experimental here; Windows Camera uses a better native path than OpenCV MSMF exposes.".to_string(),
        });
        backends.push(BackendInfo {
            name: "arducam-sdk".to_string(),
            available: false,
            platform: std::env::consts::OS.to_string(),
            description: "Arducam vendor SDK is not installed/configured for this build.".to_string(),
        });
    } else {
        backends.push(BackendInfo {
            name: "opencv-sidecar".to_string(),
            available: true,
            platform: std::env::consts::OS.to_string(),
            description: "OpenCV camera backend through the native C++ vision sidecar".to_string(),
        });
    }
    Ok(backends)
}

#[tauri::command]
pub async fn select_camera_backend(
    state: State<'_, AppState>,
    backend_name: String,
) -> Result<(), String> {
    let mut project = state.project.write().await;
    project.camera_backend = backend_name;
    Ok(())
}

#[tauri::command]
pub async fn enumerate_cameras(state: State<'_, AppState>) -> Result<Vec<CameraInfo>, String> {
    let project = state.project.read().await;
    sidecar::list_cameras(&project.camera_backend)
}

#[tauri::command]
pub async fn open_camera(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    device_index: i32,
    width: i32,
    height: i32,
    fourcc: String,
    fps: f64,
) -> Result<CameraOpenResult, String> {
    // Close existing camera if open
    close_camera_inner(&state).await;

    let backend_name = {
        let project = state.project.read().await;
        project.camera_backend.clone()
    };
    let mut vision = sidecar::VisionSidecar::start(backend_name)?;
    let opened = vision.open_camera(device_index, width, height, &fourcc, fps)?;
    let actual_w = opened.actual_width;
    let actual_h = opened.actual_height;
    let actual_fourcc = opened.actual_fourcc.clone();
    let actual_fps = opened.actual_fps;

    // Set up channels
    let (frame_tx, frame_rx) = watch::channel::<Option<Arc<Vec<u8>>>>(None);
    let (cmd_tx, mut cmd_rx) = mpsc::channel::<CameraCommand>(32);

    // Spawn camera thread
    let app_handle = app.clone();
    let thread = std::thread::spawn(move || {
        let mut consecutive_frame_errors = 0usize;
        let mut warmup_good_frames = 0usize;
        loop {
            // Check for commands (non-blocking)
            match cmd_rx.try_recv() {
                Ok(CameraCommand::Stop) => break,
                Ok(CameraCommand::CaptureFrame(reply)) => {
                    let _ = reply.send(vision.capture_frame());
                }
                Ok(CameraCommand::GetControls(reply)) => {
                    let result = vision.get_camera_controls();
                    let _ = reply.send(result);
                }
                Ok(CameraCommand::SetControl { control_key, value }) => {
                    let _ = vision.set_camera_control(&control_key, value);
                }
                Ok(CameraCommand::SetAutoControl {
                    control_key,
                    enabled,
                }) => {
                    let _ = vision.set_auto_control(&control_key, enabled);
                }
                Ok(CameraCommand::RefreshAutofocus(reply)) => {
                    let result = vision.set_auto_control("focus_auto", true);
                    if result.is_ok() {
                        warmup_good_frames = 0;
                    }
                    let _ = reply.send(result);
                }
                Err(tokio::sync::mpsc::error::TryRecvError::Disconnected) => break,
                Err(tokio::sync::mpsc::error::TryRecvError::Empty) => {}
            }

            // Capture frame for preview
            match vision.capture_frame() {
                Ok(frame_bytes) => {
                    consecutive_frame_errors = 0;
                    let bytes = Arc::new(frame_bytes);
                    let _ = frame_tx.send(Some(bytes.clone()));

                    if warmup_good_frames < 20 {
                        warmup_good_frames += 1;
                        std::thread::sleep(std::time::Duration::from_millis(33));
                        continue;
                    }

                    // Emit to frontend
                    use base64::Engine;
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&*bytes);
                    let _ = app_handle.emit("camera:frame", b64);
                }
                Err(e) => {
                    consecutive_frame_errors += 1;
                    if consecutive_frame_errors >= 8 {
                        let _ = app_handle.emit(
                            "camera:error",
                            format!(
                                "Camera frame read failed {} times in a row: {}",
                                consecutive_frame_errors, e
                            ),
                        );
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(40));
                    continue;
                }
            }

            // ~15 fps
            std::thread::sleep(std::time::Duration::from_millis(66));
        }

        vision.close_camera();
    });

    let cam_handle = CameraThreadHandle {
        thread,
        frame_rx,
        cmd_tx,
    };

    *state.camera.write().await = Some(cam_handle);

    // Update project
    let mut project = state.project.write().await;
    project.camera_index = Some(device_index);
    project.camera_width = actual_w;
    project.camera_height = actual_h;
    project.camera_fourcc = actual_fourcc.clone();
    project.camera_fps = actual_fps;

    Ok(CameraOpenResult {
        actual_width: actual_w,
        actual_height: actual_h,
        actual_fourcc,
        actual_fps,
    })
}

#[tauri::command]
pub async fn close_camera(state: State<'_, AppState>) -> Result<(), String> {
    close_camera_inner(&state).await;
    Ok(())
}

async fn close_camera_inner(state: &AppState) {
    let mut cam = state.camera.write().await;
    if let Some(handle) = cam.take() {
        let _ = handle.cmd_tx.send(CameraCommand::Stop).await;
        let _ = handle.thread.join();
    }
}

#[tauri::command]
pub async fn get_camera_capabilities(
    state: State<'_, AppState>,
) -> Result<CameraCapabilities, String> {
    // We can't call get_capabilities on the handle directly since it's in the thread.
    // Return basic info from the project.
    let project = state.project.read().await;
    Ok(CameraCapabilities {
        resolutions: vec![Resolution {
            width: project.camera_width,
            height: project.camera_height,
        }],
        formats: vec!["MJPG".to_string(), "YUYV".to_string()],
    })
}

#[tauri::command]
pub async fn refresh_autofocus(state: State<'_, AppState>) -> Result<(), String> {
    let cam = state.camera.read().await;
    if let Some(ref handle) = *cam {
        let (reply_tx, reply_rx) = tokio::sync::oneshot::channel();
        handle
            .cmd_tx
            .send(CameraCommand::RefreshAutofocus(reply_tx))
            .await
            .map_err(|e| e.to_string())?;
        reply_rx.await.map_err(|e| e.to_string())?
    } else {
        Err("No camera open".to_string())
    }
}

#[tauri::command]
pub async fn get_camera_controls(state: State<'_, AppState>) -> Result<Vec<CameraControl>, String> {
    let cam = state.camera.read().await;
    if let Some(ref handle) = *cam {
        let (reply_tx, reply_rx) = tokio::sync::oneshot::channel();
        handle
            .cmd_tx
            .send(CameraCommand::GetControls(reply_tx))
            .await
            .map_err(|e| e.to_string())?;
        reply_rx.await.map_err(|e| e.to_string())?
    } else {
        Err("No camera open".to_string())
    }
}

#[tauri::command]
pub async fn set_camera_control(
    state: State<'_, AppState>,
    control_key: String,
    value: i32,
) -> Result<(), String> {
    let cam = state.camera.read().await;
    if let Some(ref handle) = *cam {
        handle
            .cmd_tx
            .send(CameraCommand::SetControl { control_key, value })
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No camera open".to_string())
    }
}

#[tauri::command]
pub async fn set_auto_control(
    state: State<'_, AppState>,
    control_key: String,
    enabled: bool,
) -> Result<(), String> {
    let cam = state.camera.read().await;
    if let Some(ref handle) = *cam {
        handle
            .cmd_tx
            .send(CameraCommand::SetAutoControl {
                control_key,
                enabled,
            })
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No camera open".to_string())
    }
}

// ── Calibration Board Commands ───────────────────────────────────────────────

#[tauri::command]
pub async fn generate_charuco_board(
    state: State<'_, AppState>,
    name: Option<String>,
    config: CharucoConfig,
    paper_width_mm: f64,
    paper_height_mm: f64,
    pixels_per_mm: f64,
) -> Result<BoardGenerationResult, String> {
    let board_id = Uuid::new_v4().to_string();
    let board_name = name
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| {
            format!(
                "{}x{} {}mm {}",
                config.squares_x,
                config.squares_y,
                trim_mm(config.square_length_mm),
                config.dictionary_name
            )
        });
    let file_stem = format!("{}-{}", sanitize_filename(&board_name), &board_id[..8]);
    let file_name = format!("{}.png", file_stem);
    let svg_file_name = format!("{}.svg", file_stem);
    let board_dir = project::generated_boards_dir();
    std::fs::create_dir_all(&board_dir).map_err(|e| e.to_string())?;
    let output_path = board_dir.join(file_name);
    let output_svg_path = board_dir.join(svg_file_name);
    let output_path_string = output_path.to_string_lossy().to_string();
    let output_svg_path_string = output_svg_path.to_string_lossy().to_string();

    let result = sidecar::generate_charuco_board(
        &config,
        &output_path_string,
        &output_svg_path_string,
        pixels_per_mm,
    )?;
    let board = GeneratedCharucoBoard {
        id: board_id,
        name: board_name,
        config: config.clone(),
        paper_width_mm,
        paper_height_mm,
        board_width_mm: result.width_px as f64 / pixels_per_mm,
        board_height_mm: result.height_px as f64 / pixels_per_mm,
        path: output_path_string,
        svg_path: result.svg_path.clone(),
        width_px: result.width_px,
        height_px: result.height_px,
        verification_corner_count: result.verification_corner_count,
        verification_passed: result.verification_passed,
    };

    {
        let mut project_state = state.project.write().await;
        project_state.charuco_config = config.clone();
        project_state.generated_boards.push(board.clone());
        project::save_project(&project_state, None)?;
    }

    Ok(BoardGenerationResult {
        board: Some(board),
        ..result
    })
}

#[tauri::command]
pub async fn list_generated_charuco_boards(
    state: State<'_, AppState>,
) -> Result<Vec<GeneratedCharucoBoard>, String> {
    let project = state.project.read().await;
    Ok(project.generated_boards.clone())
}

#[tauri::command]
pub async fn get_generated_charuco_board_image(
    state: State<'_, AppState>,
    board_id: String,
) -> Result<String, String> {
    let path = {
        let project = state.project.read().await;
        project
            .generated_boards
            .iter()
            .find(|board| board.id == board_id)
            .map(|board| board.path.clone())
            .ok_or_else(|| format!("Generated board '{}' not found", board_id))?
    };
    let bytes = std::fs::read(&path).map_err(|e| format!("Could not read {}: {}", path, e))?;
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}

#[tauri::command]
pub async fn clear_intrinsics_calibration_frames(state: State<'_, AppState>) -> Result<(), String> {
    state.calibration_frames.write().await.clear();
    state.calibration_detections.write().await.clear();
    Ok(())
}

#[tauri::command]
pub async fn list_intrinsics_calibration_frames(
    state: State<'_, AppState>,
) -> Result<Vec<CalibrationFrameSummary>, String> {
    let detections = state.calibration_detections.read().await;
    Ok(detections
        .iter()
        .enumerate()
        .map(|(idx, detection)| calibration_frame_summary(idx, detection))
        .collect())
}

#[tauri::command]
pub async fn view_intrinsics_calibration_frame(
    state: State<'_, AppState>,
    frame_index: usize,
) -> Result<String, String> {
    let frames = state.calibration_frames.read().await;
    let bytes = frames
        .get(frame_index.saturating_sub(1))
        .ok_or_else(|| format!("Frame {} not found", frame_index))?;
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:image/jpeg;base64,{}", b64))
}

#[tauri::command]
pub async fn delete_intrinsics_calibration_frame(
    state: State<'_, AppState>,
    frame_index: usize,
) -> Result<Vec<CalibrationFrameSummary>, String> {
    let index = frame_index
        .checked_sub(1)
        .ok_or_else(|| "Frame indexes start at 1".to_string())?;
    {
        let mut frames = state.calibration_frames.write().await;
        if index >= frames.len() {
            return Err(format!("Frame {} not found", frame_index));
        }
        frames.remove(index);
    }
    {
        let mut detections = state.calibration_detections.write().await;
        if index < detections.len() {
            detections.remove(index);
        }
    }
    list_intrinsics_calibration_frames(state).await
}

#[tauri::command]
pub async fn capture_intrinsics_frame(
    state: State<'_, AppState>,
    board_id: String,
) -> Result<CalibrationFrameResult, String> {
    let frame_bytes = capture_current_frame(&state).await?;
    let board = {
        let project = state.project.read().await;
        project
            .generated_boards
            .iter()
            .find(|board| board.id == board_id)
            .cloned()
            .ok_or_else(|| "Select a generated board before capturing.".to_string())?
    };

    let detection = calibration::detect_charuco_in_jpeg(&frame_bytes, &board.config)?;
    let accepted = detection.corner_count >= 4;
    let expected_corner_count =
        ((board.config.squares_x - 1) * (board.config.squares_y - 1)).max(0) as usize;
    let rejection_reason = if accepted {
        None
    } else {
        Some(format!(
            "Only {} ChArUco corners detected. Move the board into view or improve lighting.",
            detection.corner_count
        ))
    };

    let mut frames = state.calibration_frames.write().await;
    let mut detections = state.calibration_detections.write().await;
    let frame_index = frames.len() + 1;

    if accepted {
        frames.push(frame_bytes);
        detections.push(CalibrationDetectionFrame {
            board_id: board.id.clone(),
            board_name: board.name.clone(),
            config: board.config.clone(),
            corners: detection.corners,
            ids: detection.ids,
        });
    }

    Ok(CalibrationFrameResult {
        frame_index,
        board_id: board.id,
        board_name: board.name,
        corner_count: detection.corner_count,
        expected_corner_count,
        total_frames: frames.len(),
        accepted,
        rejection_reason,
    })
}

#[tauri::command]
pub async fn compute_intrinsics_calibration(
    state: State<'_, AppState>,
) -> Result<IntrinsicsResult, String> {
    let (image_size, px_per_mm) = {
        let project = state.project.read().await;
        (
            (project.camera_width, project.camera_height),
            workspace_px_per_mm(&project.workspace),
        )
    };

    let detections = state.calibration_detections.read().await.clone();
    let result =
        calibration::compute_intrinsics_from_board_frames(&detections, image_size, px_per_mm)?;

    *state.intrinsics.write().await = Some(result.intrinsics.clone());

    {
        let mut project_state = state.project.write().await;
        project_state.intrinsics = Some(result.intrinsics.clone());
        project::save_project(&project_state, None)?;
    }

    Ok(result)
}

fn calibration_frame_summary(
    idx: usize,
    detection: &CalibrationDetectionFrame,
) -> CalibrationFrameSummary {
    let expected_corner_count =
        ((detection.config.squares_x - 1) * (detection.config.squares_y - 1)).max(0) as usize;
    let mut flags = Vec::new();
    if detection.corners.len() * 4 < expected_corner_count {
        flags.push("Low corner coverage".to_string());
    }

    CalibrationFrameSummary {
        frame_index: idx + 1,
        board_id: detection.board_id.clone(),
        board_name: detection.board_name.clone(),
        corner_count: detection.corners.len(),
        expected_corner_count,
        reprojection_error_px: None,
        approx_error_mm: None,
        quality_label: "Not computed".to_string(),
        quality_level: "neutral".to_string(),
        flags,
    }
}

fn workspace_px_per_mm(workspace: &WorkspaceDefinition) -> Option<f64> {
    let rect = workspace.image_rect.as_ref()?;
    let width_mm = (workspace.x_max - workspace.x_min).abs();
    let height_mm = (workspace.y_max - workspace.y_min).abs();
    if width_mm <= 0.0 || height_mm <= 0.0 {
        return None;
    }

    let top = point_distance(&rect.corners[0], &rect.corners[1]);
    let right = point_distance(&rect.corners[1], &rect.corners[2]);
    let bottom = point_distance(&rect.corners[2], &rect.corners[3]);
    let left = point_distance(&rect.corners[3], &rect.corners[0]);
    let px_per_mm_x = ((top + bottom) / 2.0) / width_mm;
    let px_per_mm_y = ((left + right) / 2.0) / height_mm;

    if px_per_mm_x.is_finite() && px_per_mm_y.is_finite() {
        Some((px_per_mm_x + px_per_mm_y) / 2.0)
    } else {
        None
    }
}

fn point_distance(a: &Point2D, b: &Point2D) -> f64 {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    (dx * dx + dy * dy).sqrt()
}

fn sanitize_filename(name: &str) -> String {
    let mut out = String::new();
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        } else if ch == '-' || ch == '_' || ch.is_whitespace() {
            out.push('-');
        }
    }
    while out.contains("--") {
        out = out.replace("--", "-");
    }
    out.trim_matches('-').to_string()
}

fn trim_mm(value: f64) -> String {
    if (value.fract()).abs() < 1e-9 {
        format!("{}", value as i64)
    } else {
        format!("{:.2}", value)
    }
}

async fn capture_current_frame(state: &AppState) -> Result<Vec<u8>, String> {
    let cam = state.camera.read().await;
    if let Some(ref handle) = *cam {
        let (reply_tx, reply_rx) = tokio::sync::oneshot::channel();
        handle
            .cmd_tx
            .send(CameraCommand::CaptureFrame(reply_tx))
            .await
            .map_err(|e| e.to_string())?;
        reply_rx.await.map_err(|e| e.to_string())?
    } else {
        Err("No camera open".to_string())
    }
}

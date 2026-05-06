use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use uuid::Uuid;

use crate::models::{
    BoardGenerationResult, CalibrationDetectionFrame, CameraControl, CameraInfo, CameraOpenResult,
    CharucoConfig, CharucoDetectionResult, IntrinsicsResult,
};

pub fn generate_charuco_board(
    config: &CharucoConfig,
    output_path: &str,
    output_svg_path: &str,
    pixels_per_mm: f64,
) -> Result<BoardGenerationResult, String> {
    let request = json!({
        "id": Uuid::new_v4().to_string(),
        "method": "generate_charuco_board",
        "params": {
            "squares_x": config.squares_x,
            "squares_y": config.squares_y,
            "square_length_mm": config.square_length_mm,
            "marker_length_mm": config.marker_length_mm,
            "dictionary_name": config.dictionary_name,
            "legacy_pattern": config.legacy_pattern,
            "output_path": output_path,
            "output_svg_path": output_svg_path,
            "pixels_per_mm": pixels_per_mm,
        }
    });

    let response = call_sidecar(&request)?;
    serde_json::from_value(response).map_err(|e| e.to_string())
}

pub fn list_cameras(backend_name: &str) -> Result<Vec<CameraInfo>, String> {
    let request = json!({
        "id": Uuid::new_v4().to_string(),
        "method": "list_cameras",
        "params": {
            "backend_name": backend_name,
        }
    });
    let response = call_sidecar(&request)?;
    serde_json::from_value(response).map_err(|e| e.to_string())
}

pub fn detect_charuco_jpeg(
    jpeg_bytes: &[u8],
    config: &CharucoConfig,
) -> Result<CharucoDetectionResult, String> {
    use base64::Engine;
    let request = json!({
        "id": Uuid::new_v4().to_string(),
        "method": "detect_charuco_jpeg",
        "params": {
            "squares_x": config.squares_x,
            "squares_y": config.squares_y,
            "square_length_mm": config.square_length_mm,
            "marker_length_mm": config.marker_length_mm,
            "dictionary_name": config.dictionary_name,
            "legacy_pattern": config.legacy_pattern,
            "jpeg_base64": base64::engine::general_purpose::STANDARD.encode(jpeg_bytes),
        }
    });
    let response = call_sidecar(&request)?;
    serde_json::from_value(response).map_err(|e| e.to_string())
}

pub fn compute_intrinsics(
    detections: &[CalibrationDetectionFrame],
    image_size: (i32, i32),
    px_per_mm: Option<f64>,
) -> Result<IntrinsicsResult, String> {
    let frames: Vec<Value> = detections
        .iter()
        .enumerate()
        .map(|(idx, detection)| {
            json!({
                "frame_index": idx + 1,
                "board_id": detection.board_id,
                "board_name": detection.board_name,
                "squares_x": detection.config.squares_x,
                "squares_y": detection.config.squares_y,
                "square_length_mm": detection.config.square_length_mm,
                "corners": detection.corners.iter().map(|point| json!([point.x, point.y])).collect::<Vec<_>>(),
                "ids": detection.ids,
            })
        })
        .collect();
    let request = json!({
        "id": Uuid::new_v4().to_string(),
        "method": "compute_intrinsics",
        "params": {
            "image_width": image_size.0,
            "image_height": image_size.1,
            "px_per_mm": px_per_mm,
            "frames": frames,
        }
    });
    let response = call_sidecar(&request)?;
    serde_json::from_value(response).map_err(|e| e.to_string())
}

pub struct VisionSidecar {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<std::process::ChildStdout>,
    backend_name: String,
}

impl VisionSidecar {
    pub fn start(backend_name: impl Into<String>) -> Result<Self, String> {
        let sidecar_path = find_sidecar()?;
        let backend_name = backend_name.into();
        let mut command = Command::new(&sidecar_path);
        command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        configure_sidecar_env(&mut command, sidecar_path.parent());
        hide_sidecar_window(&mut command);

        let mut child = command
            .spawn()
            .map_err(|e| format!("Failed to start {}: {}", sidecar_path.display(), e))?;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Could not open sidecar stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Could not open sidecar stdout".to_string())?;
        Ok(Self {
            child,
            stdin,
            stdout: BufReader::new(stdout),
            backend_name,
        })
    }

    pub fn open_camera(
        &mut self,
        device_index: i32,
        width: i32,
        height: i32,
        fourcc: &str,
        fps: f64,
    ) -> Result<CameraOpenResult, String> {
        let response = self.request(json!({
            "id": Uuid::new_v4().to_string(),
            "method": "open_camera",
            "params": {
                "device_index": device_index,
                "width": width,
                "height": height,
                "fourcc": fourcc,
                "fps": fps,
                "backend_name": self.backend_name,
            }
        }))?;
        serde_json::from_value(response).map_err(|e| e.to_string())
    }

    pub fn capture_frame(&mut self) -> Result<Vec<u8>, String> {
        let response = self.request(json!({
            "id": Uuid::new_v4().to_string(),
            "method": "capture_frame",
            "params": {}
        }))?;
        let b64 = response
            .get("jpeg_base64")
            .and_then(Value::as_str)
            .ok_or_else(|| "Sidecar capture response missing jpeg_base64".to_string())?;
        use base64::Engine;
        base64::engine::general_purpose::STANDARD
            .decode(b64)
            .map_err(|e| e.to_string())
    }

    pub fn get_camera_controls(&mut self) -> Result<Vec<CameraControl>, String> {
        let response = self.request(json!({
            "id": Uuid::new_v4().to_string(),
            "method": "get_camera_controls",
            "params": {}
        }))?;
        serde_json::from_value(response).map_err(|e| e.to_string())
    }

    pub fn set_camera_control(&mut self, control_key: &str, value: i32) -> Result<(), String> {
        self.request(json!({
            "id": Uuid::new_v4().to_string(),
            "method": "set_camera_control",
            "params": {
                "control_key": control_key,
                "value": value,
            }
        }))?;
        Ok(())
    }

    pub fn set_auto_control(&mut self, control_key: &str, enabled: bool) -> Result<(), String> {
        self.request(json!({
            "id": Uuid::new_v4().to_string(),
            "method": "set_auto_control",
            "params": {
                "control_key": control_key,
                "enabled": enabled,
            }
        }))?;
        Ok(())
    }

    pub fn close_camera(&mut self) {
        let _ = self.request(json!({
            "id": Uuid::new_v4().to_string(),
            "method": "close_camera",
            "params": {}
        }));
    }

    fn request(&mut self, request: Value) -> Result<Value, String> {
        writeln!(self.stdin, "{}", request).map_err(|e| e.to_string())?;
        self.stdin.flush().map_err(|e| e.to_string())?;

        let mut line = String::new();
        let bytes = self
            .stdout
            .read_line(&mut line)
            .map_err(|e| e.to_string())?;
        if bytes == 0 {
            return Err("Vision sidecar closed stdout".to_string());
        }
        parse_envelope(&line)
    }
}

impl Drop for VisionSidecar {
    fn drop(&mut self) {
        self.close_camera();
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn call_sidecar(request: &Value) -> Result<Value, String> {
    let sidecar_path = find_sidecar()?;
    let mut command = Command::new(&sidecar_path);
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_sidecar_env(&mut command, sidecar_path.parent());
    hide_sidecar_window(&mut command);

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to start {}: {}", sidecar_path.display(), e))?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| "Could not open sidecar stdin".to_string())?;
        writeln!(stdin, "{}", request).map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(format!(
            "Vision sidecar exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
    let line = stdout
        .lines()
        .find(|line| !line.trim().is_empty())
        .ok_or_else(|| {
            format!(
                "Vision sidecar returned no JSON. stderr: {}",
                String::from_utf8_lossy(&output.stderr)
            )
        })?;
    parse_envelope(line)
}

fn parse_envelope(line: &str) -> Result<Value, String> {
    let envelope: Value = serde_json::from_str(line).map_err(|e| {
        format!(
            "Vision sidecar returned invalid JSON: {}. response: {}",
            e, line
        )
    })?;

    if envelope.get("ok").and_then(Value::as_bool) == Some(true) {
        envelope
            .get("result")
            .cloned()
            .ok_or_else(|| "Vision sidecar response did not include result".to_string())
    } else {
        Err(envelope
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Vision sidecar returned an unknown error")
            .to_string())
    }
}

#[cfg(windows)]
fn hide_sidecar_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_sidecar_window(_command: &mut Command) {}

fn configure_sidecar_env(command: &mut Command, sidecar_dir: Option<&std::path::Path>) {
    let mut library_paths = Vec::new();
    if let Some(sidecar_dir) = sidecar_dir {
        library_paths.push(sidecar_dir.to_path_buf());
        library_paths.push(sidecar_dir.join("lib"));
    }

    if let Ok(vcpkg_root) = std::env::var("VCPKG_ROOT") {
        library_paths.push(PathBuf::from(vcpkg_root).join("installed/x64-windows/bin"));
    }
    library_paths.push(PathBuf::from(
        r"C:\Users\Owl\git\vcpkg\installed\x64-windows\bin",
    ));

    let existing_path = std::env::var_os("PATH").unwrap_or_default();
    let mut paths: Vec<PathBuf> = std::env::split_paths(&existing_path).collect();
    for path in &library_paths {
        if path.exists() && !paths.iter().any(|existing| existing == path) {
            paths.insert(0, path.clone());
        }
    }
    if let Ok(joined) = std::env::join_paths(paths) {
        command.env("PATH", joined);
    }

    #[cfg(target_os = "linux")]
    prepend_library_path(command, "LD_LIBRARY_PATH", &library_paths);

    #[cfg(target_os = "macos")]
    prepend_library_path(command, "DYLD_LIBRARY_PATH", &library_paths);
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn prepend_library_path(command: &mut Command, key: &str, library_paths: &[PathBuf]) {
    let existing = std::env::var_os(key).unwrap_or_default();
    let mut paths: Vec<PathBuf> = std::env::split_paths(&existing).collect();
    for path in library_paths.iter().rev() {
        if path.exists() && !paths.iter().any(|existing| existing == path) {
            paths.insert(0, path.clone());
        }
    }
    if let Ok(joined) = std::env::join_paths(paths) {
        command.env(key, joined);
    }
}

fn find_sidecar() -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var("BEDMAPPER_VISION_SIDECAR") {
        let path = PathBuf::from(path);
        if path.exists() {
            return Ok(path);
        }
    }

    let exe_name = if cfg!(windows) {
        "bedmapper-vision.exe"
    } else {
        "bedmapper-vision"
    };
    let mut candidates = Vec::new();
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(dir) = current_exe.parent() {
            candidates.push(dir.join(exe_name));
            candidates.push(dir.join("resources").join("vision").join(exe_name));
            candidates.push(dir.join("vision").join(exe_name));
            candidates.push(dir.join("../resources/vision").join(exe_name));
            candidates.push(dir.join("../Resources/resources/vision").join(exe_name));
            candidates.push(dir.join("../Resources/vision").join(exe_name));
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(
            cwd.join("../src-native/bedmapper-vision/build/Release")
                .join(exe_name),
        );
        candidates.push(
            cwd.join("../src-native/bedmapper-vision/build/Debug")
                .join(exe_name),
        );
        candidates.push(
            cwd.join("../src-native/bedmapper-vision/build")
                .join(exe_name),
        );
    }
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(repo_root) = manifest_dir.parent() {
        candidates.push(
            repo_root
                .join("src-native/bedmapper-vision/build/Release")
                .join(exe_name),
        );
        candidates.push(
            repo_root
                .join("src-native/bedmapper-vision/build/Debug")
                .join(exe_name),
        );
        candidates.push(
            repo_root
                .join("src-native/bedmapper-vision/build")
                .join(exe_name),
        );
    }

    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.clone());
        }
    }

    Err(format!(
        "Vision sidecar not found. Build it with CMake or set BEDMAPPER_VISION_SIDECAR. Looked in: {}",
        candidates
            .iter()
            .map(|path| path.display().to_string())
            .collect::<Vec<_>>()
            .join(", ")
    ))
}

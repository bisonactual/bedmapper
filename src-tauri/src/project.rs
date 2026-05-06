use crate::models::Project;
use std::path::PathBuf;

/// Platform-specific config directory for project storage.
pub fn config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("bedmapper")
}

pub fn generated_boards_dir() -> PathBuf {
    config_dir().join("boards")
}

fn default_project_path() -> PathBuf {
    config_dir().join("project.json")
}

/// Load project from disk. Falls back to defaults on missing/corrupt file.
pub fn load_project(path: Option<&str>) -> Project {
    let path = path.map(PathBuf::from).unwrap_or_else(default_project_path);

    match std::fs::read_to_string(&path) {
        Ok(contents) => match serde_json::from_str::<Project>(&contents) {
            Ok(project) => project,
            Err(e) => {
                eprintln!(
                    "Corrupt project file: {}. Backing up and using defaults.",
                    e
                );
                let backup = path.with_extension("json.bak");
                let _ = std::fs::rename(&path, &backup);
                Project::default()
            }
        },
        Err(_) => Project::default(),
    }
}

/// Save project to disk.
pub fn save_project(project: &Project, path: Option<&str>) -> Result<(), String> {
    let path = path.map(PathBuf::from).unwrap_or_else(default_project_path);

    std::fs::create_dir_all(path.parent().unwrap_or(&PathBuf::from(".")))
        .map_err(|e| format!("Cannot create config dir: {}", e))?;

    let json = serde_json::to_string_pretty(project)
        .map_err(|e| format!("Serialization failed: {}", e))?;

    // Atomic write via temp file
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, &json).map_err(|e| format!("Cannot write project file: {}", e))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("Cannot rename temp file: {}", e))?;

    Ok(())
}

/// Export project to a user-specified path.
pub fn export_project(project: &Project, path: &str) -> Result<(), String> {
    save_project(project, Some(path))
}

/// Import project from a user-specified path.
pub fn import_project(path: &str) -> Result<Project, String> {
    let contents = std::fs::read_to_string(path).map_err(|e| format!("Cannot read file: {}", e))?;
    serde_json::from_str(&contents).map_err(|e| format!("Invalid project file: {}", e))
}

/// Reset to defaults.
pub fn reset_project() -> Project {
    Project::default()
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use bedmapper_desktop::commands;
use bedmapper_desktop::project;
use bedmapper_desktop::state::AppState;

fn main() {
    let project = project::load_project(None);
    let app_state = AppState::new(project);

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::list_camera_backends,
            commands::select_camera_backend,
            commands::enumerate_cameras,
            commands::open_camera,
            commands::close_camera,
            commands::get_camera_capabilities,
            commands::get_camera_controls,
            commands::set_camera_control,
            commands::set_auto_control,
            commands::refresh_autofocus,
            commands::generate_charuco_board,
            commands::list_generated_charuco_boards,
            commands::get_generated_charuco_board_image,
            commands::clear_intrinsics_calibration_frames,
            commands::list_intrinsics_calibration_frames,
            commands::view_intrinsics_calibration_frame,
            commands::delete_intrinsics_calibration_frame,
            commands::capture_intrinsics_frame,
            commands::compute_intrinsics_calibration,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

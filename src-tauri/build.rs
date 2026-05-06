fn main() {
    println!("cargo::rustc-check-cfg=cfg(ocvrs_has_inherent_feature_algorithm_hint)");
    link_vcpkg_opencv_on_windows();
    tauri_build::build()
}

fn link_vcpkg_opencv_on_windows() {
    let target = std::env::var("TARGET").unwrap_or_default();
    if !target.contains("windows-msvc") {
        return;
    }

    let Ok(vcpkg_root) = std::env::var("VCPKG_ROOT") else {
        return;
    };

    let profile = std::env::var("PROFILE").unwrap_or_default();
    let (lib_dir, suffix) = if profile == "debug" {
        ("debug/lib", "4d")
    } else {
        ("lib", "4")
    };

    let lib_path = format!("{}/installed/x64-windows/{}", vcpkg_root, lib_dir);
    println!("cargo:rustc-link-search=native={}", lib_path);

    for module in [
        "core",
        "imgproc",
        "imgcodecs",
        "videoio",
        "calib3d",
        "objdetect",
        "features2d",
        "flann",
        "video",
        "dnn",
    ] {
        println!("cargo:rustc-link-lib=opencv_{}{}", module, suffix);
        println!(
            "cargo:rustc-link-arg={}/opencv_{}{}.lib",
            lib_path, module, suffix
        );
    }
}

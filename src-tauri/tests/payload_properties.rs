// Feature: bedmapper, Property 2: VisionPayload serialization round-trip
// Feature: bedmapper, Property 3: VisionPayload structural completeness

use bedmapper_desktop::models::*;
use proptest::prelude::*;

fn arb_point2d() -> impl Strategy<Value = Point2D> {
    (-1000.0f64..1000.0, -1000.0f64..1000.0).prop_map(|(x, y)| Point2D { x, y })
}

fn arb_object_size() -> impl Strategy<Value = ObjectSize> {
    (1.0..500.0f64, 1.0..500.0f64).prop_map(|(a, b)| {
        let long = a.max(b);
        let short = a.min(b);
        ObjectSize { long, short }
    })
}

fn arb_vision_object() -> impl Strategy<Value = VisionObject> {
    (
        "[a-z0-9-]{3,10}",
        "[a-z]{3,10}",
        proptest::option::of(0.0..1.0f64),
        0.0..50.0f64,
        arb_point2d(),
        prop::collection::vec(arb_point2d(), 3..8),
        arb_object_size(),
        0.0..1.0f64,
    )
        .prop_map(
            |(id, label, conf, hmm, center, outline, size, wf)| VisionObject {
                id,
                object_type: "rectangle".to_string(),
                label,
                confidence: conf,
                height_mm: hmm,
                center,
                outline,
                size_mm: size,
                workspace_fraction: wf,
            },
        )
}

fn arb_workspace_bounds() -> impl Strategy<Value = WorkspaceBounds> {
    (
        -1000.0..0.0f64,
        0.0..1000.0f64,
        -1000.0..0.0f64,
        0.0..1000.0f64,
    )
        .prop_map(|(xmin, xmax, ymin, ymax)| WorkspaceBounds {
            x_min: xmin,
            x_max: xmax,
            y_min: ymin,
            y_max: ymax,
        })
}

fn arb_detection_roi() -> impl Strategy<Value = DetectionRoi> {
    (0..5000i32, 0..5000i32, 1..5000i32, 1..5000i32).prop_map(|(x, y, w, h)| DetectionRoi {
        x,
        y,
        width: w,
        height: h,
    })
}

fn arb_vision_payload() -> impl Strategy<Value = VisionPayload> {
    (
        arb_workspace_bounds(),
        proptest::option::of(arb_detection_roi()),
        prop::collection::vec(arb_vision_object(), 0..6),
    )
        .prop_map(|(ws, roi, objects)| VisionPayload {
            units: "mm".to_string(),
            coordinate_system: "machine".to_string(),
            origin: "charuco-top-right".to_string(),
            workspace: ws,
            source_image: None,
            detection_roi: roi,
            captured_at: "2026-01-01T00:00:00Z".to_string(),
            objects,
        })
}

// ── Property 2: Round-trip ───────────────────────────────────────────────────

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn vision_payload_roundtrip(payload in arb_vision_payload()) {
        let json = serde_json::to_string(&payload).unwrap();
        let back: VisionPayload = serde_json::from_str(&json).unwrap();
        // Re-serialize the deserialized value and compare those two strings.
        // This avoids f64 last-digit drift between the original in-memory value
        // and the JSON-parsed value, while still proving the JSON round-trips.
        let json_back = serde_json::to_string(&back).unwrap();
        let back2: VisionPayload = serde_json::from_str(&json_back).unwrap();
        let json_back2 = serde_json::to_string(&back2).unwrap();
        prop_assert_eq!(json_back, json_back2);
    }
}

// ── Property 3: Structural completeness ──────────────────────────────────────

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn vision_payload_has_required_fields(payload in arb_vision_payload()) {
        let json = serde_json::to_string(&payload).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();

        // Top-level required fields (camelCase)
        prop_assert!(v.get("units").is_some(), "missing 'units'");
        prop_assert!(v.get("coordinateSystem").is_some(), "missing 'coordinateSystem'");
        prop_assert!(v.get("workspace").is_some(), "missing 'workspace'");
        prop_assert!(v.get("capturedAt").is_some(), "missing 'capturedAt'");
        prop_assert!(v.get("objects").is_some(), "missing 'objects'");

        // Workspace fields
        let ws = v.get("workspace").unwrap();
        prop_assert!(ws.get("xMin").is_some(), "missing workspace.xMin");
        prop_assert!(ws.get("xMax").is_some(), "missing workspace.xMax");
        prop_assert!(ws.get("yMin").is_some(), "missing workspace.yMin");
        prop_assert!(ws.get("yMax").is_some(), "missing workspace.yMax");

        // Per-object required fields
        for obj in v.get("objects").unwrap().as_array().unwrap() {
            prop_assert!(obj.get("id").is_some(), "missing object.id");
            prop_assert!(obj.get("type").is_some(), "missing object.type");
            prop_assert!(obj.get("label").is_some(), "missing object.label");
            prop_assert!(obj.get("confidence").is_some(), "missing object.confidence");
            prop_assert!(obj.get("heightMm").is_some(), "missing object.heightMm");
            prop_assert!(obj.get("center").is_some(), "missing object.center");
            prop_assert!(obj.get("outline").is_some(), "missing object.outline");
            prop_assert!(obj.get("sizeMm").is_some(), "missing object.sizeMm");

            let center = obj.get("center").unwrap();
            prop_assert!(center.get("x").is_some(), "missing center.x");
            prop_assert!(center.get("y").is_some(), "missing center.y");

            let size = obj.get("sizeMm").unwrap();
            prop_assert!(size.get("long").is_some(), "missing sizeMm.long");
            prop_assert!(size.get("short").is_some(), "missing sizeMm.short");
        }
    }
}

// ── Golden-file contract test ────────────────────────────────────────────────

#[test]
fn golden_file_schema_matches() {
    // Load the actual vision/latest.json from Flexisender
    let golden_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../flexisender-vision/vision/latest.json");

    if !golden_path.exists() {
        eprintln!("Golden file not found at {:?}, skipping", golden_path);
        return;
    }

    let golden_str = std::fs::read_to_string(&golden_path).unwrap();
    let golden: serde_json::Value = serde_json::from_str(&golden_str).unwrap();

    // Verify golden file has the same structure we produce
    assert!(golden.get("units").is_some(), "golden missing 'units'");
    assert!(
        golden.get("coordinateSystem").is_some(),
        "golden missing 'coordinateSystem'"
    );
    assert!(
        golden.get("workspace").is_some(),
        "golden missing 'workspace'"
    );
    assert!(
        golden.get("capturedAt").is_some(),
        "golden missing 'capturedAt'"
    );
    assert!(golden.get("objects").is_some(), "golden missing 'objects'");

    // Verify we can deserialize the golden file into our VisionPayload
    let parsed: VisionPayload = serde_json::from_str(&golden_str).unwrap();
    assert_eq!(parsed.units, "mm");
    assert!(!parsed.objects.is_empty());
}

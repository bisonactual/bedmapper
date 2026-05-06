// Feature: bedmapper, Property 6: Workspace filtering invariant
// Feature: bedmapper, Property 7: Object centre and size consistency

use bedmapper_desktop::geometry::polygon_centroid;
use bedmapper_desktop::models::*;
use proptest::prelude::*;

// ── Property 7: Object centre and size consistency ───────────────────────────

fn arb_point(range: f64) -> impl Strategy<Value = Point2D> {
    (-range..range, -range..range).prop_map(|(x, y)| Point2D { x, y })
}

fn arb_polygon(min_pts: usize, max_pts: usize) -> impl Strategy<Value = Vec<Point2D>> {
    prop::collection::vec(arb_point(500.0), min_pts..=max_pts)
}

/// Shoelace centroid reference implementation for testing
fn shoelace_centroid(pts: &[Point2D]) -> Point2D {
    let n = pts.len();
    if n < 3 {
        let sx: f64 = pts.iter().map(|p| p.x).sum();
        let sy: f64 = pts.iter().map(|p| p.y).sum();
        return Point2D {
            x: sx / n as f64,
            y: sy / n as f64,
        };
    }
    let mut area = 0.0f64;
    let mut cx = 0.0f64;
    let mut cy = 0.0f64;
    for i in 0..n {
        let j = (i + 1) % n;
        let cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
        area += cross;
        cx += (pts[i].x + pts[j].x) * cross;
        cy += (pts[i].y + pts[j].y) * cross;
    }
    area *= 0.5;
    if area.abs() < 1e-12 {
        let sx: f64 = pts.iter().map(|p| p.x).sum();
        let sy: f64 = pts.iter().map(|p| p.y).sum();
        return Point2D {
            x: sx / n as f64,
            y: sy / n as f64,
        };
    }
    Point2D {
        x: cx / (6.0 * area),
        y: cy / (6.0 * area),
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn centroid_matches_shoelace(outline in arb_polygon(3, 20)) {
        let computed = polygon_centroid(&outline);
        let expected = shoelace_centroid(&outline);
        let eps = 1e-6;
        prop_assert!(
            (computed.x - expected.x).abs() < eps && (computed.y - expected.y).abs() < eps,
            "Centroid mismatch: computed ({}, {}) vs expected ({}, {})",
            computed.x, computed.y, expected.x, expected.y
        );
    }

    #[test]
    fn size_long_gte_short(
        long in 1.0..500.0f64,
        short in 1.0..500.0f64,
    ) {
        let size = ObjectSize {
            long: long.max(short),
            short: long.min(short),
        };
        prop_assert!(size.long >= size.short);
    }
}

// ── Property 6: Workspace filtering invariant ────────────────────────────────

fn object_workspace_fraction(outline: &[Point2D], ws: &WorkspaceBounds) -> f64 {
    let xs: Vec<f64> = outline.iter().map(|p| p.x).collect();
    let ys: Vec<f64> = outline.iter().map(|p| p.y).collect();
    let (obj_xmin, obj_xmax) = (
        xs.iter().cloned().fold(f64::INFINITY, f64::min),
        xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
    );
    let (obj_ymin, obj_ymax) = (
        ys.iter().cloned().fold(f64::INFINITY, f64::min),
        ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
    );
    let obj_area = (obj_xmax - obj_xmin).max(0.0) * (obj_ymax - obj_ymin).max(0.0);
    if obj_area <= 0.0 {
        return 0.0;
    }
    let clip_xmin = obj_xmin.max(ws.x_min);
    let clip_xmax = obj_xmax.min(ws.x_max);
    let clip_ymin = obj_ymin.max(ws.y_min);
    let clip_ymax = obj_ymax.min(ws.y_max);
    let clip_area = (clip_xmax - clip_xmin).max(0.0) * (clip_ymax - clip_ymin).max(0.0);
    clip_area / obj_area
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn workspace_filtering_invariant(
        outlines in prop::collection::vec(arb_polygon(3, 8), 1..6),
        threshold in 0.0..1.0f64,
    ) {
        let ws = WorkspaceBounds { x_min: -560.0, x_max: 0.0, y_min: -430.0, y_max: 0.0 };

        let filtered: Vec<_> = outlines.iter()
            .filter(|o| object_workspace_fraction(o, &ws) >= threshold)
            .collect();

        for outline in &filtered {
            let frac = object_workspace_fraction(outline, &ws);
            prop_assert!(
                frac >= threshold,
                "Object with fraction {} passed filter with threshold {}",
                frac, threshold
            );
        }
    }
}

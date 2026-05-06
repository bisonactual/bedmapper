// Feature: bedmapper, Property 9: Board-to-machine coordinate round-trip

use bedmapper_desktop::geometry::{board_to_machine, machine_to_board};
use bedmapper_desktop::models::*;
use proptest::prelude::*;

fn arb_origin_corner() -> impl Strategy<Value = OriginCorner> {
    prop_oneof![
        Just(OriginCorner::TopLeft),
        Just(OriginCorner::TopRight),
        Just(OriginCorner::BottomLeft),
        Just(OriginCorner::BottomRight),
    ]
}

fn arb_origin_config() -> impl Strategy<Value = OriginConfig> {
    (
        arb_origin_corner(),
        any::<bool>(),
        -500.0..500.0f64,
        -500.0..500.0f64,
    )
        .prop_map(|(corner, swap, ox, oy)| OriginConfig {
            origin_corner: corner,
            swap_xy: swap,
            offset_x_mm: ox,
            offset_y_mm: oy,
        })
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn board_machine_roundtrip(
        mx in -1000.0..1000.0f64,
        my in -1000.0..1000.0f64,
        bw in 50.0..500.0f64,
        bh in 50.0..500.0f64,
        origin in arb_origin_config(),
    ) {
        let machine_pt = Point2D { x: mx, y: my };
        let board_pt = machine_to_board(&machine_pt, bw, bh, &origin);
        let back = board_to_machine(&board_pt, bw, bh, &origin);

        let eps = 1e-6;
        prop_assert!(
            (back.x - machine_pt.x).abs() < eps && (back.y - machine_pt.y).abs() < eps,
            "Round-trip failed: ({}, {}) -> ({}, {}) -> ({}, {})",
            machine_pt.x, machine_pt.y, board_pt.x, board_pt.y, back.x, back.y
        );
    }
}

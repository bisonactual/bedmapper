// Feature: bedmapper, Property 5: Board square count fits paper bounds

use bedmapper_desktop::calibration::squares_for_paper;
use proptest::prelude::*;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn board_squares_fit_paper(
        paper_w in 50.0..2000.0f64,
        paper_h in 50.0..2000.0f64,
    ) {
        // Square size must allow at least 2 squares (ChArUco minimum)
        let max_sq = (paper_w.min(paper_h) / 2.0).min(100.0);
        prop_assume!(max_sq >= 5.0);
        let square_size = 5.0 + (max_sq - 5.0) * 0.5; // midpoint of valid range

        let (sx, sy) = squares_for_paper(paper_w, paper_h, square_size);

        // Squares must fit
        prop_assert!(
            (sx as f64) * square_size <= paper_w,
            "{}*{} = {} > paper_w {}", sx, square_size, (sx as f64) * square_size, paper_w
        );
        prop_assert!(
            (sy as f64) * square_size <= paper_h,
            "{}*{} = {} > paper_h {}", sy, square_size, (sy as f64) * square_size, paper_h
        );

        // Adding one more must exceed (unless at minimum 2)
        if sx > 2 {
            prop_assert!(((sx + 1) as f64) * square_size > paper_w);
        }
        if sy > 2 {
            prop_assert!(((sy + 1) as f64) * square_size > paper_h);
        }
    }
}

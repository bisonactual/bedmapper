use crate::models::*;

/// Compute homography from image points to world (bed) points.
pub fn homography_from_points(
    image_points: &[Point2D],
    world_points: &[Point2D],
) -> Result<Vec<Vec<f64>>, String> {
    if image_points.len() < 4 || world_points.len() < 4 {
        return Err("At least 4 point pairs required for homography".to_string());
    }

    let mut a = [[0.0f64; 8]; 8];
    let mut b = [0.0f64; 8];

    for i in 0..4 {
        let x = image_points[i].x;
        let y = image_points[i].y;
        let u = world_points[i].x;
        let v = world_points[i].y;
        let r = i * 2;

        a[r] = [x, y, 1.0, 0.0, 0.0, 0.0, -u * x, -u * y];
        b[r] = u;
        a[r + 1] = [0.0, 0.0, 0.0, x, y, 1.0, -v * x, -v * y];
        b[r + 1] = v;
    }

    let h = solve_8x8(a, b)?;
    Ok(vec![
        vec![h[0], h[1], h[2]],
        vec![h[3], h[4], h[5]],
        vec![h[6], h[7], 1.0],
    ])
}

/// Transform 2D points using a 3x3 homography matrix.
pub fn transform_points(
    points: &[Point2D],
    homography: &[Vec<f64>],
) -> Result<Vec<Point2D>, String> {
    if homography.len() != 3 || homography.iter().any(|row| row.len() != 3) {
        return Err("Homography must be 3x3".to_string());
    }

    points
        .iter()
        .map(|point| {
            let denom = homography[2][0] * point.x + homography[2][1] * point.y + homography[2][2];
            if denom.abs() < 1e-12 {
                return Err("Homography transform produced a point at infinity".to_string());
            }
            Ok(Point2D {
                x: (homography[0][0] * point.x + homography[0][1] * point.y + homography[0][2])
                    / denom,
                y: (homography[1][0] * point.x + homography[1][1] * point.y + homography[1][2])
                    / denom,
            })
        })
        .collect()
}

/// Convert board coordinates to machine coordinates.
pub fn board_to_machine(
    point: &Point2D,
    board_width_mm: f64,
    board_height_mm: f64,
    origin: &OriginConfig,
) -> Point2D {
    let bx = point.x;
    let by = point.y;

    let (mut mx, mut my) = match origin.origin_corner {
        OriginCorner::TopRight => (bx - board_width_mm, -by),
        OriginCorner::TopLeft => (-bx, -by),
        OriginCorner::BottomRight => (bx - board_width_mm, by - board_height_mm),
        OriginCorner::BottomLeft => (-bx, by - board_height_mm),
    };

    if origin.swap_xy {
        std::mem::swap(&mut mx, &mut my);
    }

    Point2D {
        x: mx + origin.offset_x_mm,
        y: my + origin.offset_y_mm,
    }
}

/// Convert machine coordinates to board coordinates (inverse of board_to_machine).
pub fn machine_to_board(
    point: &Point2D,
    board_width_mm: f64,
    board_height_mm: f64,
    origin: &OriginConfig,
) -> Point2D {
    let mut mx = point.x - origin.offset_x_mm;
    let mut my = point.y - origin.offset_y_mm;

    if origin.swap_xy {
        std::mem::swap(&mut mx, &mut my);
    }

    let (bx, by) = match origin.origin_corner {
        OriginCorner::TopRight => (mx + board_width_mm, -my),
        OriginCorner::TopLeft => (-mx, -my),
        OriginCorner::BottomRight => (mx + board_width_mm, my + board_height_mm),
        OriginCorner::BottomLeft => (-mx, my + board_height_mm),
    };

    Point2D { x: bx, y: by }
}

/// Compute area-weighted polygon centroid using the shoelace formula.
pub fn polygon_centroid(points: &[Point2D]) -> Point2D {
    let n = points.len();
    if n == 0 {
        return Point2D { x: 0.0, y: 0.0 };
    }
    if n < 3 {
        let sx: f64 = points.iter().map(|p| p.x).sum();
        let sy: f64 = points.iter().map(|p| p.y).sum();
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
        let cross = points[i].x * points[j].y - points[j].x * points[i].y;
        area += cross;
        cx += (points[i].x + points[j].x) * cross;
        cy += (points[i].y + points[j].y) * cross;
    }

    area *= 0.5;
    if area.abs() < 1e-12 {
        let sx: f64 = points.iter().map(|p| p.x).sum();
        let sy: f64 = points.iter().map(|p| p.y).sum();
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

fn solve_8x8(mut a: [[f64; 8]; 8], mut b: [f64; 8]) -> Result<[f64; 8], String> {
    for col in 0..8 {
        let mut pivot = col;
        for row in (col + 1)..8 {
            if a[row][col].abs() > a[pivot][col].abs() {
                pivot = row;
            }
        }
        if a[pivot][col].abs() < 1e-12 {
            return Err("Could not compute homography from degenerate points".to_string());
        }
        if pivot != col {
            a.swap(pivot, col);
            b.swap(pivot, col);
        }

        let div = a[col][col];
        for c in col..8 {
            a[col][c] /= div;
        }
        b[col] /= div;

        for row in 0..8 {
            if row == col {
                continue;
            }
            let factor = a[row][col];
            for c in col..8 {
                a[row][c] -= factor * a[col][c];
            }
            b[row] -= factor * b[col];
        }
    }
    Ok(b)
}

"""Country map for the studio: GeoJSON borders -> SVG paths, for the `geo` scene.

    python geo_map.py config.json out.json

config.json:
  source       GeoJSON file (relative to the config), e.g. historical borders for 1914
  bbox         [west, south, east, north] in degrees
  size         [width, height] in pixels
  regions      {id: {"name": NAME in the GeoJSON, "label": "TEXT", "at": [lon, lat]}}
  points       {id: {"at": [lon, lat], "label": "Text"}}
  attribution  the short credit drawn on the map
  credit       the full credit line for the description (with the licence link)
Every other land feature is drawn as plain land.
"""
import json
import math
import sys
from pathlib import Path


def main():
    cfg_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    geo = json.loads((cfg_path.parent / cfg["source"]).read_text(encoding="utf-8"))
    w, s, e, n = cfg["bbox"]
    width, height = cfg["size"]
    kx = math.cos(math.radians((s + n) / 2))  # equirectangular, true to scale at the mid latitude
    scale = min(width / ((e - w) * kx), height / (n - s))
    ox = (width - (e - w) * kx * scale) / 2
    oy = (height - (n - s) * scale) / 2

    def xy(lon, lat):
        return (round(ox + (lon - w) * kx * scale, 1), round(oy + (n - lat) * scale, 1))

    def paths(geom):
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        out = []
        for poly in polys:
            for ring in poly:
                lons, lats = [p[0] for p in ring], [p[1] for p in ring]
                if max(lons) < w - 5 or min(lons) > e + 5 or max(lats) < s - 5 or min(lats) > n + 5:
                    continue  # nowhere near the frame
                pts, last = [], None
                for lon, lat in ring:
                    p = xy(lon, lat)
                    if last is None or abs(p[0] - last[0]) + abs(p[1] - last[1]) >= 1.5:
                        pts.append(p)
                        last = p
                if len(pts) >= 3:
                    out.append("M" + " L".join(f"{x},{y}" for x, y in pts) + " Z")
        return out

    by_name = {r["name"]: rid for rid, r in cfg["regions"].items()}
    regions = {rid: {"label": r["label"], "center": xy(*r["at"]), "paths": []} for rid, r in cfg["regions"].items()}
    land = []
    for f in geo["features"]:
        if not f.get("geometry"):
            continue
        rid = by_name.get(f["properties"].get("NAME"))
        (regions[rid]["paths"] if rid else land).extend(paths(f["geometry"]))
    points = {pid: {"label": p.get("label", ""), "x": xy(*p["at"])[0], "y": xy(*p["at"])[1]}
              for pid, p in cfg.get("points", {}).items()}
    out = {"size": [width, height], "attribution": cfg["attribution"],
           "credit": cfg.get("credit", cfg["attribution"]), "land": land,
           "regions": regions, "points": points}
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    missing = [rid for rid, r in regions.items() if not r["paths"]]
    print(f"{len(regions)} regions, {len(land)} land paths -> {out_path}" + (f"  MISSING: {missing}" if missing else ""))


if __name__ == "__main__":
    main()

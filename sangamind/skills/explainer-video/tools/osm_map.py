"""Turn an OpenStreetMap extract into a flat, animatable map for Remotion.

    python osm_map.py <area.osm> <map.config.json> <out.json>

Get the .osm with the OSM API (small areas):
    https://api.openstreetmap.org/api/0.6/map?bbox=<west>,<south>,<east>,<north>

The config names the frame and what to draw on top (all lat/lon, nothing in pixels):
    {"center": [lat, lon], "width_m": 1200, "size": [1920, 1080],
     "road_classes": {"major": [...highway values], "minor": [...]},
     "routes": {"name": {"follow": "street name", "from": [lat, lon], "to": [lat, lon]} or {"points": [[lat, lon], ...]}},
     "markers": {"name": {"at": [lat, lon], "label": "Town Hall"}},
     "labels": [{"text": "Appel Quay", "at": [lat, lon], "angle": 0}]}

Output: roads and water as SVG path strings in frame pixels, routes as point lists (so they can be
drawn progressively), markers and labels as points. Map data (c) OpenStreetMap contributors, ODbL.
"""
import json
import math
import sys
import xml.etree.ElementTree as ET


def load(osm_path):
    root = ET.parse(osm_path).getroot()
    nodes = {n.get("id"): (float(n.get("lat")), float(n.get("lon"))) for n in root.iter("node")}
    ways = []
    for w in root.iter("way"):
        tags = {t.get("k"): t.get("v") for t in w.iter("tag")}
        pts = [nodes[nd.get("ref")] for nd in w.iter("nd") if nd.get("ref") in nodes]
        if len(pts) >= 2:
            ways.append((tags, pts))
    return ways


def projector(cfg):
    lat0, lon0 = cfg["center"]
    w, h = cfg["size"]
    m_per_deg_lat = 111_320
    m_per_deg_lon = 111_320 * math.cos(math.radians(lat0))
    px_per_m = w / cfg["width_m"]

    def p(lat, lon):
        return (round(w / 2 + (lon - lon0) * m_per_deg_lon * px_per_m, 1),
                round(h / 2 - (lat - lat0) * m_per_deg_lat * px_per_m, 1))
    return p


def path_d(points):
    return "M" + " L".join(f"{x},{y}" for x, y in points)


def visible(points, size, margin=200):
    w, h = size
    return any(-margin <= x <= w + margin and -margin <= y <= h + margin for x, y in points)


def follow_street(ways, name, start, end, p):
    """Points of a named street between two lat/lon points, ordered from start to end."""
    pts = {pt for tags, wp in ways if tags.get("name") == name and tags.get("highway") for pt in wp}
    if not pts:
        raise SystemExit(f"street not found in the extract: {name}")
    (la, lo), (lb, lob) = start, end
    dx, dy = lob - lo, lb - la
    length2 = dx * dx + dy * dy

    def t(pt):  # position along the start->end line, 0..1
        return ((pt[1] - lo) * dx + (pt[0] - la) * dy) / length2

    def off(pt):  # distance from the line, to drop the other carriageway / side streets
        tt = t(pt)
        return math.hypot(pt[1] - (lo + tt * dx), pt[0] - (la + tt * dy))

    chosen = sorted((pt for pt in pts if 0 <= t(pt) <= 1 and off(pt) < 0.00035), key=t)
    line = [start] + chosen + [end]
    return [p(*pt) for pt in line]


def main():
    osm_path, cfg_path, out_path = sys.argv[1:4]
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    p = projector(cfg)
    size = cfg["size"]
    ways = load(osm_path)
    classes = cfg["road_classes"]
    out = {"size": size, "attribution": "Map data (c) OpenStreetMap contributors",
           "credit": "Map data (c) OpenStreetMap contributors, ODbL: https://www.openstreetmap.org/copyright",
           "water": [], "roads": {k: [] for k in classes}, "routes": {}, "markers": {}, "labels": []}
    for tags, pts in ways:
        proj = [p(*pt) for pt in pts]
        if not visible(proj, size):
            continue
        if tags.get("natural") == "water" or tags.get("water") == "river":
            out["water"].append(path_d(proj) + " Z")
        for cls, values in classes.items():
            if tags.get("highway") in values:
                out["roads"][cls].append(path_d(proj))
    for name, r in cfg.get("routes", {}).items():
        pts = follow_street(ways, r["follow"], r["from"], r["to"], p) if "follow" in r else [p(*x) for x in r["points"]]
        out["routes"][name] = pts
    for name, m in cfg.get("markers", {}).items():
        x, y = p(*m["at"])
        out["markers"][name] = {"x": x, "y": y, "label": m.get("label", "")}
    for lab in cfg.get("labels", []):
        x, y = p(*lab["at"])
        out["labels"].append({"text": lab["text"], "x": x, "y": y, "angle": lab.get("angle", 0)})
    json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{out_path}: {len(out['water'])} water, " + ", ".join(f"{len(v)} {k} roads" for k, v in out["roads"].items())
          + f", routes {list(out['routes'])}")


if __name__ == "__main__":
    main()

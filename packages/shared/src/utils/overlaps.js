"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slotsOverlap = slotsOverlap;
exports.sectionOverlaps = sectionOverlaps;
function slotsOverlap(a, b) {
    if (a.day !== b.day)
        return false;
    return a.startMin < b.endMin && b.startMin < a.endMin;
}
function sectionOverlaps(a, b) {
    for (var _i = 0, _a = a.timeSlots; _i < _a.length; _i++) {
        var sa = _a[_i];
        for (var _b = 0, _c = b.timeSlots; _b < _c.length; _b++) {
            var sb = _c[_b];
            if (slotsOverlap(sa, sb))
                return true;
        }
    }
    return false;
}

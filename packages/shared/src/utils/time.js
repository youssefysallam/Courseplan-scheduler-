"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayOrder = void 0;
exports.minutesToHHMM = minutesToHHMM;
exports.dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function minutesToHHMM(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    var hh = String(h).padStart(2, "0");
    var mm = String(m).padStart(2, "0");
    return "".concat(hh, ":").concat(mm);
}

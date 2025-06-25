"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.generateExportId = generateExportId;
// lib/idGenerator.ts
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var TABLE_PREFIXES = {
    ASG: 'AssignmentCache',
    LOG: 'AuditLog',
    EXP: 'ExpenseRecord',
    ITM: 'Item',
    ITX: 'ItemTransaction',
    RCP: 'Receipt',
    RCI: 'ReceiptItem',
    REV: 'RevenueRecord',
    RAL: 'ReceiptAuditLog',
    REX: 'ReceiptExport',
    RSC: 'ReceiptStorageConfig',
    CAT: 'GlobalCategory',
    SRC: 'GlobalSource',
    PAY: 'GlobalPaymentStatus',
    TERM: 'GlobalTerms',
    UNIT: 'GlobalItemUnit',
    PMT: 'GlobalPaymentMethod',
    RST: 'GlobalReimbursementStatus'
};
function generateId(prefix) {
    return __awaiter(this, void 0, void 0, function () {
        var tableName;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tableName = TABLE_PREFIXES[prefix];
                    if (!tableName)
                        throw new Error("Invalid table prefix: ".concat(prefix));
                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var sequence;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tx.sequence.upsert({
                                            where: { name: prefix },
                                            update: { value: { increment: 1 } },
                                            create: { name: prefix, value: 1 },
                                        })];
                                    case 1:
                                        sequence = _a.sent();
                                        return [2 /*return*/, "FTMS-".concat(prefix, "-").concat(String(sequence.value).padStart(8, '0'))];
                                }
                            });
                        }); })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function generateExportId() {
    return __awaiter(this, void 0, void 0, function () {
        var today, dateStr;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    today = new Date();
                    dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var dailyKey, sequence;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        dailyKey = "XPT-".concat(dateStr);
                                        return [4 /*yield*/, tx.sequence.upsert({
                                                where: { name: dailyKey },
                                                update: { value: { increment: 1 } },
                                                create: { name: dailyKey, value: 1 },
                                            })];
                                    case 1:
                                        sequence = _a.sent();
                                        return [2 /*return*/, "FTMS-XPT-".concat(dateStr, "-").concat(String(sequence.value).padStart(4, '0'))];
                                }
                            });
                        }); })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}

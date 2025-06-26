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
var client_1 = require("@prisma/client");
var idGenerator_1 = require("../lib/idGenerator");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var categories, _i, categories_1, _a, name_1, modules, category_id, statuses, statusMap, _loop_1, _b, statuses_1, _c, name_2, modules, _d, _e, _f, _g, name_3, id, sources, _h, sources_1, _j, name_4, modules, source_id, terms, _k, terms_1, _l, name_5, modules, id, itemUnits, _m, itemUnits_1, name_6, id, paymentMethods, _o, paymentMethods_1, name_7, id, paymentStatuses, _p, paymentStatuses_1, name_8, id;
        return __generator(this, function (_q) {
            switch (_q.label) {
                case 0:
                    categories = [
                        { name: 'Fuel', modules: ['expense', 'receipt'] },
                        { name: 'Vehicle_Parts', modules: ['expense', 'receipt'] },
                        { name: 'Tools', modules: ['expense', 'receipt'] },
                        { name: 'Equipment', modules: ['expense', 'receipt'] },
                        { name: 'Supplies', modules: ['expense', 'receipt'] },
                        { name: 'Multiple_Categories', modules: ['expense', 'receipt'] },
                        { name: 'Boundary', modules: ['revenue'] },
                        { name: 'Percentage', modules: ['revenue'] },
                        { name: 'Bus_Rental', modules: ['revenue'] },
                    ];
                    _i = 0, categories_1 = categories;
                    _q.label = 1;
                case 1:
                    if (!(_i < categories_1.length)) return [3 /*break*/, 5];
                    _a = categories_1[_i], name_1 = _a.name, modules = _a.modules;
                    return [4 /*yield*/, (0, idGenerator_1.generateId)('CAT')];
                case 2:
                    category_id = _q.sent();
                    return [4 /*yield*/, prisma.globalCategory.upsert({
                            where: { name: name_1 },
                            update: { applicable_modules: modules },
                            create: { category_id: category_id, name: name_1, applicable_modules: modules, is_deleted: false },
                        })];
                case 3:
                    _q.sent();
                    _q.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5:
                    statuses = [
                        { name: 'Paid', modules: ['receipt'] },
                        { name: 'Pending', modules: ['receipt'] },
                        { name: 'Dued', modules: ['receipt'] },
                        { name: 'PENDING', modules: ['reimbursement'] },
                        { name: 'APPROVED', modules: ['reimbursement'] },
                        { name: 'REJECTED', modules: ['reimbursement'] },
                        { name: 'PAID', modules: ['reimbursement'] },
                    ];
                    statusMap = {};
                    _loop_1 = function (name_2, modules) {
                        if (!statusMap[name_2])
                            statusMap[name_2] = new Set();
                        modules.forEach(function (m) { return statusMap[name_2].add(m); });
                    };
                    for (_b = 0, statuses_1 = statuses; _b < statuses_1.length; _b++) {
                        _c = statuses_1[_b], name_2 = _c.name, modules = _c.modules;
                        _loop_1(name_2, modules);
                    }
                    _d = statusMap;
                    _e = [];
                    for (_f in _d)
                        _e.push(_f);
                    _g = 0;
                    _q.label = 6;
                case 6:
                    if (!(_g < _e.length)) return [3 /*break*/, 10];
                    _f = _e[_g];
                    if (!(_f in _d)) return [3 /*break*/, 9];
                    name_3 = _f;
                    return [4 /*yield*/, (0, idGenerator_1.generateId)('RST')];
                case 7:
                    id = _q.sent();
                    return [4 /*yield*/, prisma.globalReimbursementStatus.upsert({
                            where: { name: name_3 },
                            update: { applicable_modules: Array.from(statusMap[name_3]) },
                            create: { id: id, name: name_3, applicable_modules: Array.from(statusMap[name_3]), is_deleted: false },
                        })];
                case 8:
                    _q.sent();
                    _q.label = 9;
                case 9:
                    _g++;
                    return [3 /*break*/, 6];
                case 10:
                    sources = [
                        { name: 'Manual_Entry', modules: ['receipt'] },
                        { name: 'OCR_Camera', modules: ['receipt'] },
                        { name: 'OCR_File', modules: ['receipt'] },
                        { name: 'Boundary_Assignment', modules: ['revenue'] },
                        { name: 'Percentage_Assignment', modules: ['revenue'] },
                        { name: 'Bus_Rental_Assignment', modules: ['revenue'] },
                        { name: 'Receipt', modules: ['expense'] },
                        { name: 'Operations', modules: ['expense'] },
                        { name: 'Other', modules: ['expense'] },
                    ];
                    _h = 0, sources_1 = sources;
                    _q.label = 11;
                case 11:
                    if (!(_h < sources_1.length)) return [3 /*break*/, 15];
                    _j = sources_1[_h], name_4 = _j.name, modules = _j.modules;
                    return [4 /*yield*/, (0, idGenerator_1.generateId)('SRC')];
                case 12:
                    source_id = _q.sent();
                    return [4 /*yield*/, prisma.globalSource.upsert({
                            where: { name: name_4 },
                            update: { applicable_modules: modules },
                            create: { source_id: source_id, name: name_4, applicable_modules: modules, is_deleted: false },
                        })];
                case 13:
                    _q.sent();
                    _q.label = 14;
                case 14:
                    _h++;
                    return [3 /*break*/, 11];
                case 15:
                    terms = [
                        { name: 'Net_15', modules: ['receipt'] },
                        { name: 'Net_30', modules: ['receipt'] },
                        { name: 'Net_60', modules: ['receipt'] },
                        { name: 'Net_90', modules: ['receipt'] },
                        { name: 'Cash', modules: ['receipt'] },
                    ];
                    _k = 0, terms_1 = terms;
                    _q.label = 16;
                case 16:
                    if (!(_k < terms_1.length)) return [3 /*break*/, 20];
                    _l = terms_1[_k], name_5 = _l.name, modules = _l.modules;
                    return [4 /*yield*/, (0, idGenerator_1.generateId)('TERM')];
                case 17:
                    id = _q.sent();
                    return [4 /*yield*/, prisma.globalTerms.upsert({
                            where: { name: name_5 },
                            update: {},
                            create: { id: id, name: name_5, applicable_modules: modules, is_deleted: false },
                        })];
                case 18:
                    _q.sent();
                    _q.label = 19;
                case 19:
                    _k++;
                    return [3 /*break*/, 16];
                case 20:
                    itemUnits = [
                        'piece', 'box', 'pack', 'liter', 'gallon', 'milliliter', 'kilogram', 'gram', 'meter', 'foot', 'roll', 'set', 'pair'
                    ];
                    _m = 0, itemUnits_1 = itemUnits;
                    _q.label = 21;
                case 21:
                    if (!(_m < itemUnits_1.length)) return [3 /*break*/, 25];
                    name_6 = itemUnits_1[_m];
                    return [4 /*yield*/, (0, idGenerator_1.generateId)('UNIT')];
                case 22:
                    id = _q.sent();
                    return [4 /*yield*/, prisma.globalItemUnit.upsert({
                            where: { name: name_6 },
                            update: {},
                            create: { id: id, name: name_6, is_deleted: false },
                        })];
                case 23:
                    _q.sent();
                    _q.label = 24;
                case 24:
                    _m++;
                    return [3 /*break*/, 21];
                case 25:
                    paymentMethods = [
                        { name: 'CASH', modules: ['expense'] },
                        { name: 'REIMBURSEMENT', modules: ['expense'] },
                    ];
                    _o = 0, paymentMethods_1 = paymentMethods;
                    _q.label = 26;
                case 26:
                    if (!(_o < paymentMethods_1.length)) return [3 /*break*/, 30];
                    name_7 = paymentMethods_1[_o].name;
                    return [4 /*yield*/, (0, idGenerator_1.generateId)('PMT')];
                case 27:
                    id = _q.sent();
                    return [4 /*yield*/, prisma.globalPaymentMethod.upsert({
                            where: { name: name_7 },
                            update: {},
                            create: { id: id, name: name_7, is_deleted: false },
                        })];
                case 28:
                    _q.sent();
                    _q.label = 29;
                case 29:
                    _o++;
                    return [3 /*break*/, 26];
                case 30:
                    paymentStatuses = [
                        { name: 'Paid' },
                        { name: 'Pending' },
                        { name: 'Dued' },
                    ];
                    _p = 0, paymentStatuses_1 = paymentStatuses;
                    _q.label = 31;
                case 31:
                    if (!(_p < paymentStatuses_1.length)) return [3 /*break*/, 35];
                    name_8 = paymentStatuses_1[_p].name;
                    return [4 /*yield*/, (0, idGenerator_1.generateId)('PAY')];
                case 32:
                    id = _q.sent();
                    return [4 /*yield*/, prisma.globalPaymentStatus.upsert({
                            where: { name: name_8 },
                            update: {},
                            create: { id: id, name: name_8, is_deleted: false },
                        })];
                case 33:
                    _q.sent();
                    _q.label = 34;
                case 34:
                    _p++;
                    return [3 /*break*/, 31];
                case 35:
                    console.log('Seeded all global tables.');
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) {
    console.error(e);
    process.exit(1);
}).finally(function () { return prisma.$disconnect(); });

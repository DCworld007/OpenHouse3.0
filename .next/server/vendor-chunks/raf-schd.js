"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/raf-schd";
exports.ids = ["vendor-chunks/raf-schd"];
exports.modules = {

/***/ "(ssr)/./node_modules/raf-schd/dist/raf-schd.esm.js":
/*!****************************************************!*\
  !*** ./node_modules/raf-schd/dist/raf-schd.esm.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\nvar rafSchd = function rafSchd(fn) {\n    var lastArgs = [];\n    var frameId = null;\n    var wrapperFn = function wrapperFn() {\n        for(var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++){\n            args[_key] = arguments[_key];\n        }\n        lastArgs = args;\n        if (frameId) {\n            return;\n        }\n        frameId = requestAnimationFrame(function() {\n            frameId = null;\n            fn.apply(void 0, lastArgs);\n        });\n    };\n    wrapperFn.cancel = function() {\n        if (!frameId) {\n            return;\n        }\n        cancelAnimationFrame(frameId);\n        frameId = null;\n    };\n    return wrapperFn;\n};\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (rafSchd);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvcmFmLXNjaGQvZGlzdC9yYWYtc2NoZC5lc20uanMiLCJtYXBwaW5ncyI6Ijs7OztBQUFBLElBQUlBLFVBQVUsU0FBU0EsUUFBUUMsRUFBRTtJQUMvQixJQUFJQyxXQUFXLEVBQUU7SUFDakIsSUFBSUMsVUFBVTtJQUVkLElBQUlDLFlBQVksU0FBU0E7UUFDdkIsSUFBSyxJQUFJQyxPQUFPQyxVQUFVQyxNQUFNLEVBQUVDLE9BQU8sSUFBSUMsTUFBTUosT0FBT0ssT0FBTyxHQUFHQSxPQUFPTCxNQUFNSyxPQUFRO1lBQ3ZGRixJQUFJLENBQUNFLEtBQUssR0FBR0osU0FBUyxDQUFDSSxLQUFLO1FBQzlCO1FBRUFSLFdBQVdNO1FBRVgsSUFBSUwsU0FBUztZQUNYO1FBQ0Y7UUFFQUEsVUFBVVEsc0JBQXNCO1lBQzlCUixVQUFVO1lBQ1ZGLEdBQUdXLEtBQUssQ0FBQyxLQUFLLEdBQUdWO1FBQ25CO0lBQ0Y7SUFFQUUsVUFBVVMsTUFBTSxHQUFHO1FBQ2pCLElBQUksQ0FBQ1YsU0FBUztZQUNaO1FBQ0Y7UUFFQVcscUJBQXFCWDtRQUNyQkEsVUFBVTtJQUNaO0lBRUEsT0FBT0M7QUFDVDtBQUVBLGlFQUFlSixPQUFPQSxFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vb3BlbmhvdXNlLy4vbm9kZV9tb2R1bGVzL3JhZi1zY2hkL2Rpc3QvcmFmLXNjaGQuZXNtLmpzPzhhY2UiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIHJhZlNjaGQgPSBmdW5jdGlvbiByYWZTY2hkKGZuKSB7XG4gIHZhciBsYXN0QXJncyA9IFtdO1xuICB2YXIgZnJhbWVJZCA9IG51bGw7XG5cbiAgdmFyIHdyYXBwZXJGbiA9IGZ1bmN0aW9uIHdyYXBwZXJGbigpIHtcbiAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IG5ldyBBcnJheShfbGVuKSwgX2tleSA9IDA7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgIGFyZ3NbX2tleV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgfVxuXG4gICAgbGFzdEFyZ3MgPSBhcmdzO1xuXG4gICAgaWYgKGZyYW1lSWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmcmFtZUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uICgpIHtcbiAgICAgIGZyYW1lSWQgPSBudWxsO1xuICAgICAgZm4uYXBwbHkodm9pZCAwLCBsYXN0QXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgd3JhcHBlckZuLmNhbmNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIWZyYW1lSWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZShmcmFtZUlkKTtcbiAgICBmcmFtZUlkID0gbnVsbDtcbiAgfTtcblxuICByZXR1cm4gd3JhcHBlckZuO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcmFmU2NoZDtcbiJdLCJuYW1lcyI6WyJyYWZTY2hkIiwiZm4iLCJsYXN0QXJncyIsImZyYW1lSWQiLCJ3cmFwcGVyRm4iLCJfbGVuIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiYXJncyIsIkFycmF5IiwiX2tleSIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsImFwcGx5IiwiY2FuY2VsIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/raf-schd/dist/raf-schd.esm.js\n");

/***/ })

};
;
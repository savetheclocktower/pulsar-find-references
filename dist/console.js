"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = exports.debug = exports.warn = exports.log = void 0;
const TAG = '[find-references]';
let isEnabled = false;
atom.config.observe('pulsar-find-references.advanced.enableDebugLogging', (value) => {
    isEnabled = value;
});
function log(...args) {
    if (!isEnabled)
        return;
    return console.log(TAG, ...args);
}
exports.log = log;
function warn(...args) {
    if (!isEnabled)
        return;
    return console.warn(TAG, ...args);
}
exports.warn = warn;
function debug(...args) {
    if (!isEnabled)
        return;
    return console.debug(TAG, ...args);
}
exports.debug = debug;
function error(...args) {
    if (!isEnabled)
        return;
    return console.error(TAG, ...args);
}
exports.error = error;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2xpYi9jb25zb2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLE1BQU0sR0FBRyxHQUFHLG1CQUFtQixDQUFDO0FBRWhDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUV0QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDakIsb0RBQW9ELEVBQ3BELENBQUMsS0FBSyxFQUFFLEVBQUU7SUFDUixTQUFTLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLENBQUMsQ0FDRixDQUFDO0FBRUYsU0FBZ0IsR0FBRyxDQUFDLEdBQUcsSUFBUztJQUM5QixJQUFJLENBQUMsU0FBUztRQUFFLE9BQU87SUFDdkIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFIRCxrQkFHQztBQUVELFNBQWdCLElBQUksQ0FBQyxHQUFHLElBQVM7SUFDL0IsSUFBSSxDQUFDLFNBQVM7UUFBRSxPQUFPO0lBQ3ZCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUNwQyxDQUFDO0FBSEQsb0JBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsR0FBRyxJQUFTO0lBQ2hDLElBQUksQ0FBQyxTQUFTO1FBQUUsT0FBTztJQUN2QixPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDckMsQ0FBQztBQUhELHNCQUdDO0FBRUQsU0FBZ0IsS0FBSyxDQUFDLEdBQUcsSUFBUztJQUNoQyxJQUFJLENBQUMsU0FBUztRQUFFLE9BQU87SUFDdkIsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFIRCxzQkFHQyIsInNvdXJjZXNDb250ZW50IjpbIlxuY29uc3QgVEFHID0gJ1tmaW5kLXJlZmVyZW5jZXNdJztcblxubGV0IGlzRW5hYmxlZCA9IGZhbHNlO1xuXG5hdG9tLmNvbmZpZy5vYnNlcnZlKFxuICAncHVsc2FyLWZpbmQtcmVmZXJlbmNlcy5hZHZhbmNlZC5lbmFibGVEZWJ1Z0xvZ2dpbmcnLFxuICAodmFsdWUpID0+IHtcbiAgICBpc0VuYWJsZWQgPSB2YWx1ZTtcbiAgfVxuKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxvZyguLi5hcmdzOiBhbnkpIHtcbiAgaWYgKCFpc0VuYWJsZWQpIHJldHVybjtcbiAgcmV0dXJuIGNvbnNvbGUubG9nKFRBRywgLi4uYXJncyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YXJuKC4uLmFyZ3M6IGFueSkge1xuICBpZiAoIWlzRW5hYmxlZCkgcmV0dXJuO1xuICByZXR1cm4gY29uc29sZS53YXJuKFRBRywgLi4uYXJncyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWJ1ZyguLi5hcmdzOiBhbnkpIHtcbiAgaWYgKCFpc0VuYWJsZWQpIHJldHVybjtcbiAgcmV0dXJuIGNvbnNvbGUuZGVidWcoVEFHLCAuLi5hcmdzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVycm9yKC4uLmFyZ3M6IGFueSkge1xuICBpZiAoIWlzRW5hYmxlZCkgcmV0dXJuO1xuICByZXR1cm4gY29uc29sZS5lcnJvcihUQUcsIC4uLmFyZ3MpO1xufVxuIl19
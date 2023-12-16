"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = exports.debug = exports.warn = exports.log = void 0;
const TAG = '[find-references]';
let isEnabled = false;
atom.config.observe('pulsar-find-references.advanced.enableDebugLogging', (value) => {
    console.warn('enableDebugLogging?', value);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2xpYi9jb25zb2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLE1BQU0sR0FBRyxHQUFHLG1CQUFtQixDQUFDO0FBRWhDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUV0QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDakIsb0RBQW9ELEVBQ3BELENBQUMsS0FBSyxFQUFFLEVBQUU7SUFDUixPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzNDLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFDcEIsQ0FBQyxDQUNGLENBQUM7QUFHRixTQUFnQixHQUFHLENBQUMsR0FBRyxJQUFTO0lBQzlCLElBQUksQ0FBQyxTQUFTO1FBQUUsT0FBTztJQUN2QixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUhELGtCQUdDO0FBRUQsU0FBZ0IsSUFBSSxDQUFDLEdBQUcsSUFBUztJQUMvQixJQUFJLENBQUMsU0FBUztRQUFFLE9BQU87SUFDdkIsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFIRCxvQkFHQztBQUVELFNBQWdCLEtBQUssQ0FBQyxHQUFHLElBQVM7SUFDaEMsSUFBSSxDQUFDLFNBQVM7UUFBRSxPQUFPO0lBQ3ZCLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUNyQyxDQUFDO0FBSEQsc0JBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsR0FBRyxJQUFTO0lBQ2hDLElBQUksQ0FBQyxTQUFTO1FBQUUsT0FBTztJQUN2QixPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDckMsQ0FBQztBQUhELHNCQUdDIiwic291cmNlc0NvbnRlbnQiOlsiXG5jb25zdCBUQUcgPSAnW2ZpbmQtcmVmZXJlbmNlc10nO1xuXG5sZXQgaXNFbmFibGVkID0gZmFsc2U7XG5cbmF0b20uY29uZmlnLm9ic2VydmUoXG4gICdwdWxzYXItZmluZC1yZWZlcmVuY2VzLmFkdmFuY2VkLmVuYWJsZURlYnVnTG9nZ2luZycsXG4gICh2YWx1ZSkgPT4ge1xuICAgIGNvbnNvbGUud2FybignZW5hYmxlRGVidWdMb2dnaW5nPycsIHZhbHVlKTtcbiAgICBpc0VuYWJsZWQgPSB2YWx1ZTtcbiAgfVxuKTtcblxuXG5leHBvcnQgZnVuY3Rpb24gbG9nKC4uLmFyZ3M6IGFueSkge1xuICBpZiAoIWlzRW5hYmxlZCkgcmV0dXJuO1xuICByZXR1cm4gY29uc29sZS5sb2coVEFHLCAuLi5hcmdzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdhcm4oLi4uYXJnczogYW55KSB7XG4gIGlmICghaXNFbmFibGVkKSByZXR1cm47XG4gIHJldHVybiBjb25zb2xlLndhcm4oVEFHLCAuLi5hcmdzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYnVnKC4uLmFyZ3M6IGFueSkge1xuICBpZiAoIWlzRW5hYmxlZCkgcmV0dXJuO1xuICByZXR1cm4gY29uc29sZS5kZWJ1ZyhUQUcsIC4uLmFyZ3MpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXJyb3IoLi4uYXJnczogYW55KSB7XG4gIGlmICghaXNFbmFibGVkKSByZXR1cm47XG4gIHJldHVybiBjb25zb2xlLmVycm9yKFRBRywgLi4uYXJncyk7XG59XG4iXX0=
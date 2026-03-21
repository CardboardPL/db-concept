export function isPlainObject(val) {
    if (typeof val !== 'object' || val == null) {
        return false;
    }
    const prototype = Object.getPrototypeOf(val);
    return (prototype === null || prototype === Object.prototype);
}
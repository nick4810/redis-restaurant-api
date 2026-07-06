export const getKeyName = (...args: string[]): string => {
    return `urn:key:${args.join(':')}`;
};
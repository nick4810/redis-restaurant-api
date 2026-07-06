export const getKeyName = (...args: string[]): string => {
    return `urn:key:${args.join(':')}`;
};

export const restaurantKeyById = (id: string) => getKeyName('restaurants', id);
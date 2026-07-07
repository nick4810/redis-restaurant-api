export const getKeyName = (...args: string[]): string => {
    return `urn:key:${args.join(':')}`;
};

export const restaurantKeyById = (id: string) => getKeyName('restaurants', id);
export const reviewKeyById = (id: string) => getKeyName('reviews', id);
export const reviewDetailsKeyById = (id: string) => getKeyName('review-details', id);
export const cuisinesKey = getKeyName('cuisines');
export const cuisineKey = (name: string) => getKeyName('cuisines', name);
export const restaurantCuisinesKeyById = (id: string) => getKeyName('restaurant_cuisines', id);
export const restaurantsByRatingKey = getKeyName('restaurants_by_rating');
export const weatherKeyByRestaurantId = (id: string) => getKeyName('weather', id);
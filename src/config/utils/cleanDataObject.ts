export function cleandata<T extends object>(data:T):Partial<T>{
    return Object.fromEntries(
        Object.entries(data).filter(([__dirname,v])=>v !== undefined)
    ) as Partial<T>;
}
export function splitList<T>(array: T[], unitLength: number) {
    const list: T[][] = [];

    for (
        let i = 0, current: T[];
        (current = array.slice(unitLength * i, unitLength * ++i)).length ===
        unitLength;

    )
        list.push(current);

    return list;
}

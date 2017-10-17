export class TestUtils {

    public static flattenJson(target: any, filters: string[] = []): string {
        let defaultFilters: string[] = ['$metadata', 'Etag', 'ETag', '$modified'];
        defaultFilters = defaultFilters.concat(filters);
        if (target && (typeof target === 'string' || typeof target === 'number' || typeof target === 'boolean')) {
            return target.toString();
        }
        const result: string[] = [];
        const get = (element) => {
            const type = typeof element;
            if (['boolean', 'number', 'string'].indexOf(type) > -1) {
                result.push(element.toString());
                return;
            }
            if (element instanceof Array) {
                for (const i in element) {
                    if (true) {
                        get(element[i]);
                    }
                }
                return;
            }
            for (const i in element) {
                if (defaultFilters.indexOf(i) > -1) {
                    continue;
                }
                result.push(i.toString());
                get(element[i]);
            }
        };
        get(target);
        return result.sort().join(',');
    }

}
// Memoization of Collator creation
const collatorMap: { [locale: string]: Intl.Collator } = {};

const getCollator = (locale: string) => collatorMap[locale] || (collatorMap[locale] = new Intl.Collator(locale, { sensitivity: "base" }));

// Memoization of comparison function, taking a 3-tuple of locale.string.string
const comparisonMap: { [locale: string]: { [a: string]: { [b: string]: number } } } = {};

// Wrapper around collator.compare that attempts to reuse memoized comparison
const compare = (a: string, b: string, locale: string) => {
    if (!comparisonMap[locale]) {
        comparisonMap[locale] = {};
    }

    if (!comparisonMap[locale][a]) {
        const comparison = getCollator(locale).compare(a, b);
        comparisonMap[locale][a] = { [b]: comparison };
        return comparison;
    } else {
        return comparisonMap[locale][a][b] || (comparisonMap[locale][a][b] = getCollator(locale).compare(a, b));
    }
};

// Used to track algorithm state:
// * @original: the object to be sorted
// * @key: the result of mapping the object ot a sortable key
// * @index: how far the algorithm has progressed when processing characters
type RadixStateObject<T> = { original: T; key: string; index: number };

// Locale-aware, memoized Radix sorting of input strings
export function radixSort<T>(inputs: T[], locale: string, toKey: (obj: T) => string): T[] {
    const endKey = "_End_";

    // Results array is mutated as inner function recursively processes the input
    const results = new Array(inputs.length);
    let resultIndex = 0;

    function radixSortInner(inputOrStateObjects: (T | RadixStateObject<T>)[], locale, nested): void {
        // Step 1: Collect suffix of strings, bucketed by first character
        const buckets = {};
        // We iterate through strings (e.g. ["Aaron", "Bob", "Billy"]) and bucket as { "A": ["aron"], "B", ["ob", "illy"]}.
        inputOrStateObjects.forEach(inputOrStateObject => {
            // inputOrStateObjects is raw on first pass, otherwise state object, e.g. { original: {name: "Dave"}, key: "Dave", index: 1 };
            // This is done to avoid an unnecesary extra pass through the data, converting input into the correct state, before processing
            let state: RadixStateObject<T>;
            if (nested) {
                state = inputOrStateObject as RadixStateObject<T>;
            } else {
                const input = inputOrStateObject as T;
                state = { original: input, key: toKey(input), index: 0 };
            }

            // Grab the character we are processing, using @index from state
            const character = state.key[state.index] ? state.key[state.index] : endKey;

            // Update the state so that we are now pointing at the next character in further iterations
            state.index++;

            if (!buckets[character]) {
                buckets[character] = [state];
            } else {
                buckets[character].push(state);
            }
        });

        // Step 2: Recursively process each bucket in order, except terminal characters which are emitted beforehand.
        (buckets[endKey] || []).forEach(terminal => (results[resultIndex++] = terminal.original));
        Object.keys(buckets)
            .filter(char => char !== endKey)
            .sort((a, b) => compare(a, b, locale))
            .forEach(char => radixSortInner(buckets[char], locale, true));
    }

    radixSortInner(inputs, locale, false);
    return results;
}

// Locale-aware, memoized Radix sorting of input strings
function radixSort(inputs, locale, toKey){
  const orderMetadataKey = "_Order_";
  const endKey = "_End_";

  // Results array is mutated as inner function recursively processes the input
  const results = new Array(inputs.length);
  let resultIndex = 0;

  function radixSortInner(inputOrStateObjects, locale, nested) {
    // Step 1: Collect suffix of strings, bucketed by first character
    const buckets = {};
    inputOrStateObjects.forEach(inputOrStateObject => {
        // inputOrStateObjects is raw on first pass, otherwise state object, e.g. { original: {name: "Dave"}, key: "Dave", index: 1 };
        const state = nested ? inputOrStateObject : { original: inputOrStateObject, key: toKey(inputOrStateObject), index: 0};
        const indexedChar = state.key[state.index];
        const firstChar = indexedChar ? indexedChar : endKey;
        state.index++;

        if (!buckets[firstChar]) {
          buckets[firstChar] = [state];
        } else {
          buckets[firstChar].push(state);
        }
    });
    
    // Step 2: Recursively process each bucket in order, except terminal characters which are emitted.
    const chars = (buckets[endKey] ? [endKey] : []).concat(
      Object.keys(buckets)
        .filter(char => char !== endKey)
        .sort((a, b) => compare(a, b, locale)))
  
    
    chars.forEach(char => {
      if (char === endKey) {
        buckets[endKey].forEach(terminal => results[resultIndex++] = terminal.original)
      } else {
        radixSortInner(buckets[char], locale, true)
      }
    })
  }

  radixSortInner(inputs, locale, false);
  return results;
}

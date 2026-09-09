const stopWords = new Set('a an and are as at be by can do does for from how i in is it me my of on or our should that the their this to use we what when where which while with would you your'.split(' '));
export const tokenize = text => [...new Set((text.toLocaleLowerCase('en').match(/[\p{L}\p{N}_]+/gu) || []).filter(term => !stopWords.has(term)))];


const fs = require('fs'); 
let c;

// fix sorting.ts
c = fs.readFileSync('src/lib/engines/dsa/sorting.ts', 'utf8');
c = c.replace(/return quads\.map\(\(q, index\) => \(\{ line: index \+ 1, semanticOperationId: q\.semantic, text: q\[lang\] \}\)\);/g, "return quads.map((q, index) => ({ id: 'L' + index, number: index + 1, semanticOperationId: q.semantic || undefined, text: q[lang] }));");
fs.writeFileSync('src/lib/engines/dsa/sorting.ts', c);

// fix queue.ts
c = fs.readFileSync('src/lib/engines/dsa/queue.ts', 'utf8');
c = c.replace(/current: auxSpace/g, 'current: 1');
c = c.replace(/predictions: \[\],/g, '');
fs.writeFileSync('src/lib/engines/dsa/queue.ts', c);

// fix hashTable.ts
c = fs.readFileSync('src/lib/engines/dsa/hashTable.ts', 'utf8');
c = c.replace(/return quads\.map\(\(q, index\) => \(\{ line: index \+ 1, semanticOperationId: q\.semantic, text: q\[lang\] \}\)\);/g, "return quads.map((q, index) => ({ id: 'L' + index, number: index + 1, semanticOperationId: q.semantic || undefined, text: q[lang] }));");
c = c.replace(/explanation,\n\s+stateBefore: before,/g, 'stateBefore: before,');
c = c.replace(/arithmetic: /g, 'read: ');
c = c.replace(/as RuntimeCell\[\];/g, 'as unknown as RuntimeCell[];');
c = c.replace(/output: \{ current: peakOutput, peak: peakOutput, unit: 'elements' \}\n\s+\}\n\s+\};/g, "output: { current: peakOutput, peak: peakOutput, unit: 'elements' }\n      },\n      assumptions: Array.from(complexityCase.assumptions),\n      derivation: []\n    };");
fs.writeFileSync('src/lib/engines/dsa/hashTable.ts', c);

// fix search.ts
c = fs.readFileSync('src/lib/engines/dsa/search.ts', 'utf8');
c = c.replace(/type: 'array-element'/g, "type: 'array-cell'");
c = c.replace(/explanation,\n\s+stateBefore: before,/g, 'stateBefore: before,');
c = c.replace(/arithmetic: /g, 'read: ');
fs.writeFileSync('src/lib/engines/dsa/search.ts', c);

// fix deque.ts
c = fs.readFileSync('src/lib/engines/dsa/deque.ts', 'utf8');
c = c.replace(/\{ line: currentLine\+\+, text: sq\[lang\], semanticOperationId: sq\.semantic \}/g, "{ id: 'L' + currentLine, number: currentLine++, text: sq[lang], semanticOperationId: sq.semantic || undefined }");
fs.writeFileSync('src/lib/engines/dsa/deque.ts', c);

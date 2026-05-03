# citations.js Refactor Progress

- [x] Add SKELETON_COUNT as a named constant at the top of the file with a comment explaining what it controls
- [x] Cache all DOM elements once inside DOMContentLoaded instead of querying them repeatedly
- [x] Remove all console.log statements — none existed; only console.error (kept)
- [x] Add null guards before any DOM operation where the element may not exist — already present; no changes needed
- [x] Consistent 2-space indentation throughout — already consistent; no changes needed

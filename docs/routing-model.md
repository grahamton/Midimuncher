# Routing model

Concept
- Patchbay style directed graph.

Each route can apply
- Channel remap
- Message type filters
- CC whitelist blacklist
- Clock thinning

Execution
- Routing runs in Electron main process.
- UI only edits graph and observes activity.

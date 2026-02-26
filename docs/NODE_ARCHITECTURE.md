# Node Architecture Principles

This document outlines the core architectural principles for the Node System in e-Nexus. All new node implementations MUST adhere to these rules.

## The 5 Commandments of Nodes

### 1. A Node must represent an execution boundary, not a capability.
- **Do:** Create nodes that perform a specific unit of work (e.g., "Generate Image", "Process Text").
- **Don't:** Create "Feature Flag" nodes that just toggle settings elsewhere without processing data.
- **Why:** This ensures the graph represents the actual flow of data and execution, making it debuggable and understandable.

### 2. A Node must NOT perform reasoning unless strictly required.
- **Do:** Implement deterministic logic based on inputs and configuration.
- **Don't:** Embed complex "guessing" logic or hidden heuristics that change behavior unpredictably.
- **Exception:** Agentic nodes (e.g., "Script Agent") whose *purpose* is reasoning are exempt, but their I/O contract must still be explicit.
- **Why:** Predictability is key for a creative tool. The user should be in control.

### 3. A Node must have a clear input/output contract.
- **Do:** Explicitly define `getInputs()` and `getOutputs()` with typed ports (`DataType.STRING`, `DataType.IMAGE`, etc.).
- **Don't:** Use side-channels, global state, or hidden dependencies to pass data between nodes.
- **Why:** This allows the engine to validate connections, visualize data flow, and optimize execution.

### 4. A Node must be reusable across workflows.
- **Do:** Design nodes to be generic (e.g., "Image Generator" rather than "My Specific Campaign Image Generator").
- **Don't:** Hardcode logic specific to one single project or use case inside the node class.
- **Why:** Reusability reduces code duplication and allows users to build diverse workflows from a standard library of blocks.

### 5. A Node must not know who the end user is.
- **Do:** Accept user-specific data (like API keys or preferences) via `ExecutionContext` or Settings passed at runtime.
- **Don't:** Import `UserContext` or access `localStorage` directly inside the Node's `execute` method to fetch user identity.
- **Why:** This ensures the node engine can run in any context (server-side, different user sessions, automated tests) without tight coupling to the frontend auth system.

## Application in Recent Refactoring

The refactoring of the `IconGenerator` (ProIconGenNode) demonstrates these principles:

- **Before:** The node contained internal form state for "Prompt" and "Reference Image" that was hidden from the graph (Violation of Rule 1 & 3).
- **After:**
    - `IconPromptNode`: A dedicated input node.
    - `IconRefImageNode`: A dedicated input node.
    - `ProIconGenNode`: Pure execution unit taking explicit inputs from the above nodes.
    - `ImageReceiverNode`: Pure display unit for the output.

This separation of concerns aligns perfectly with the architecture, making the flow visible and flexible.

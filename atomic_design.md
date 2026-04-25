# MRI_ESC - Atomic Design Structure

This document outlines the atomic structure for the `mri_esc` resource refactor, ensuring complete modularity and scalability.

## 🎨 Web-Side (UI)

### 1. Atoms (Primitive Components)
The smallest building blocks of our UI.
- **`ui-icon`**: Wrapper for FontAwesome icons with consistent sizing.
- **`ui-button`**: Standard buttons with variants (primary, danger, gold, ghost).
- **`ui-badge`**: Small status labels (Active, Expired, Online, ADM).
- **`ui-input`**: Basic text and number input fields.
- **`ui-slider`**: Range inputs for fine-tuning values.
- **`ui-toggle`**: Animated switches for boolean settings.
- **`ui-typography`**: Set of pre-defined text styles (H1, H2, Body, Small, Money).
- **`ui-avatar`**: Circle image container with VIP crown overlay.

### 2. Molecules (Composite Components)
Groups of atoms working together.
- **`profile-summary`**: Avatar + Name + ID + Job label.
- **`finance-item`**: Wallet/Bank icon + Label + Formatted value.
- **`nav-link`**: Icon + Label + Active state indicator + Optional Badge.
- **`metric-card`**: Icon + Title + Value + Contextual sub-label.
- **`command-row`**: Command name + Description + Execute button.
- **`search-bar`**: Icon + Input field with clear action.
- **`timer-display`**: Circular SVG progress + Time string + Label.
- **`plan-row`**: Benefit description + Free status + VIP status.

### 3. Organisms (Complex Sections)
Self-contained modules that form distinct parts of the interface.
- **`sidebar`**: Combines Logo, Profile, Finances, Navigation, and Footer.
- **`hero-banner`**: Dynamic top section for the VIP tab with FX and status info.
- **`stats-grid`**: Collection of metric cards (Salary, Inventory, Coins, etc.).
- **`command-list`**: Search bar + Scrollable container of command rows.
- **`crosshair-studio`**: Canvas preview + Grouped controls for size, gap, color.
- **`admin-data-table`**: Filterable list of VIP records with action buttons.
- **`vip-comparison`**: Table-like structure comparing different plan tiers.

### 4. Templates (Layout Patterns)
Page-level layout structures.
- **`dashboard-template`**: Sidebar + Content Panel with grid layout.
- **`admin-template`**: Specialized layout for management tools with sub-tabs.
- **`modal-template`**: Overlay backdrop + Centered action dialog.

### 5. Pages (State Instances)
Specific views populated with real data.
- **`inicio-view`**: Personal greeting + Quick access cards.
- **`vip-view`**: Subscription details + Benefits + Comparisons.
- **`comandos-view`**: Searchable utility and animation commands.
- **`mira-view`**: Crosshair customization interface.
- **`admin-view`**: VIP management and plan configuration dashboard.

---

## 📜 Script-Side (Lua)

### 1. Atoms (Shared Utilities)
- **`utils.lua`**: String manipulation, math helpers, money/date formatters.
- **`db_wrapper.lua`**: Simplified MySQL interface for async/pcall queries.
- **`perms.lua`**: Centralized permission checks (ACE, QBX, Config).

### 2. Molecules (Logic Fragments)
- **`vip_logic.lua`**: Calculate expiration, days active, and salary progression.
- **`mira_logic.lua`**: Encode/Decode crosshair settings.
- **`player_adapter.lua`**: Mapping QBX PlayerData to UI-friendly structure.

### 3. Organisms (Domain Controllers)
- **`vip_controller.lua`**: Handles grant, revoke, and extend operations.
- **`paycheck_service.lua`**: Manages the salary thread and timer synchronization.
- **`admin_api.lua`**: Server-side logic for the Admin Panel sub-tabs.
- **`crosshair_provider.lua`**: Persistence layer for custom crosshairs.

## 4. Directory Structure (Proposed)
```text
mri_esc/
├── fxmanifest.lua
├── atomic_design.md
├── config/
│   └── config.lua
├── modules/
│   └── vip-manager/
│       ├── client/
│       │   └── nui.lua (Callback Atoms)
│       └── server/
│           ├── callbacks.lua (Organism)
│           ├── controller.lua (Molecules)
│           ├── database.lua (Atoms/Initialization)
│           └── paycheck.lua (Service Organism)
├── script/
│   ├── client-side/
│   │   ├── modules/
│   │   │   ├── crosshair.lua
│   │   │   └── nui_bridge.lua
│   │   └── client.lua (Entry Point)
│   ├── server-side/
│   │   ├── controllers/
│   │   │   └── admin_controller.lua
│   │   ├── core/
│   │   │   └── players.lua
│   │   ├── utils/
│   │   │   └── permissions.lua
│   │   └── server.lua (Entry Point)
```

### 4. Templates (Communication Layer)
- **`nui_bridge.lua`**: Registry for all NUI Callbacks and messages.
- **`net_events.lua`**: Registry for all Cross-Resource/Network events.

### 5. Pages (Initialization)
- **`init.lua`**: Entry point, dependency verification, and core startup sequence.

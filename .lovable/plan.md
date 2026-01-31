

# WMC Track Intelligence Platform

A purpose-built spatial intelligence and operations platform for World Moto Clash race tracks and events, featuring a race-aware GEO editor, live operations view, and media intelligence layer.

---

## Phase 1: Foundation & Authentication

### Core Application Shell
- Dark, motorsport-grade UI with high-contrast styling and WMC branding
- Main navigation with access to all four views: Track Editor, Event Ops View, Media Intelligence, Fan Experience Preview
- Role-aware navigation (views enabled/disabled based on user role)
- Responsive layout optimized for desktop control room environments

### Salesforce Authentication Integration
- Login page with credential validation via SFDC endpoints (matching your existing pattern)
- Role extraction from Salesforce user data (Race Engineering, Race Operations, Media & Broadcast, WMC Admin)
- Session management and protected routes
- Role-based access control:
  - **Race Engineering**: Full Track Editor access
  - **Race Operations**: Event Ops View + read-only editor
  - **Media & Broadcast**: Media Intelligence + read-only views
  - **WMC Admin**: Full access to all views + Settings

---

## Phase 2: Track Editor (Primary Authoring Mode)

### Three-Panel Layout
**Left Panel — Feature Toolbox**
- Drawing tools for race-specific features:
  - Track Centerline (polyline) & Track Surface (polygon)
  - Sectors, Braking Zones, Runoff Areas
  - Pit Lane, Start/Finish
  - Marshal Posts, Medical Posts
  - Camera Positions, Safety Vehicle Routes
  - Restricted Areas, Fan Zones, Temporary Structures
- Tool selection with visual feedback
- Feature type icons and labels

**Center Canvas — Map View**
- Mapbox GL JS for 2D editing and drawing
- Toggle button for Cesium 3D preview (read-only)
- Drawing modes: Draw, Edit vertices, Move, Delete, Duplicate
- Snap-to-track functionality for precise alignment
- Distance, curvature, and segment length overlays
- Event-scoped geometry display
- Layer visibility controls

**Right Panel — Feature Inspector**
- Feature properties when selected:
  - Name, Feature Type
  - Event & Track association
  - Safety Level
  - Visibility flags (Ops / Broadcast / Fan)
  - Status: Draft / Published / Archived
  - Version number
  - Last edited by / timestamp
- Inline editing for metadata
- Rules applied display

### Save & Publish Workflow
- Auto-save drafts (visible only to author)
- Publish action creates immutable version
- Version history with ability to view previous configurations
- Status indicators in feature list

---

## Phase 3: Event Ops View (Race Week Control Room)

### Read-Only Operations Display
- Published track geometry as base layer
- All safety-critical features displayed:
  - Track + sectors with color-coded status
  - Marshal posts with status indicators
  - Medical posts and routes
  - Safety zones with real-time status (green/yellow/red)
  - Restricted areas highlighted

### Interactive Operations Features
- Click zone → view rules and escalation path
- Click camera position → placeholder feed preview panel
- Incident logging with timestamp and location
- Zone status indicators (visual color changes)
- Time-based filtering for reviewing events

### Operations Dashboard
- Active alerts panel
- Zone status summary
- Quick access to critical locations

---

## Phase 4: Media Intelligence View

### Broadcast Planning Tools
- Camera positions displayed as point features
- Camera cones/frustums as directional polygons
- Drone flight corridors with altitude info
- No-fly zones clearly marked
- Line-of-sight analysis overlays

### Playback Mode
- Lap/time selector
- View geometry and positions as of selected moment
- Uses published versions only
- Timeline scrubbing for replay analysis

---

## Phase 5: Fan Experience Preview

### Public View Simulation
- Simplified track layout (public-safe version)
- Allowed viewing zones highlighted
- VIP areas marked
- Restricted areas hidden from view
- Simplified styling matching WMC digital properties

### Validation Tools
- Toggle between internal and public views
- Preview how geometry appears to fans
- Check that sensitive areas are properly hidden

---

## Data Architecture

### Mock Data Layer (Initial)
- All features stored as GeoJSON with complete metadata
- Feature structure matching Salesforce schema:
  - Geometry (Point / LineString / Polygon)
  - Feature Type, Event ID, Track ID
  - Visibility flags, Status, Version
  - Safety rules, Media metadata, Fan access flags
- Local state management for CRUD operations
- Sample track configurations for testing

### Salesforce-Ready Structure
- API interface designed for direct Salesforce swap
- GeoJSON exchange format for all geometry
- Versioning and publishing workflow compatible with SFDC records

---

## Design System

- Dark theme with high-contrast safety colors
- Motorsport-grade typography and iconography
- Zone status colors: Green (clear), Yellow (caution), Red (danger)
- Minimal chrome to maximize map canvas space
- WMC branding throughout
- No consumer map UI patterns — professional control room aesthetic


# Tasks Kanban Board Plugin

An Obsidian plugin that provides a Kanban board view for managing tasks from the Tasks plugin with drag-and-drop functionality.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Supported Task Formats](#supported-task-formats)
  - [Task Metadata](#task-metadata)
  - [Example Task](#example-task)
  - [Enhanced Task Display](#enhanced-task-display)
  - [Task Editing](#task-editing)
  - [Drag & Drop](#drag--drop)
  - [Multiple Boards](#multiple-boards)
  - [Board Configuration Options](#board-configuration-options)
  - [Example Board Configurations](#example-board-configurations)
  - [Swimlanes](#swimlanes)
- [Commands](#commands)
- [Settings](#settings)
  - [Board Management](#board-management)
  - [Board Configuration](#board-configuration)
  - [Settings Access](#settings-access)
- [Development](#development)
- [License](#license)

## Features

- **Multiple Boards**: Create and manage unlimited custom boards with independent configurations
- **Enhanced Kanban Board**: Visualize your tasks in columns with optimized layout and spacing
- **Improved Drag & Drop**: Large drop zones covering entire columns for easy task movement
- **Tasks Integration**: Automatically reads and updates task status from markdown files
- **Comprehensive Date Support**: Start dates (🛫), scheduled dates (⏰), and due dates (📅)
- **Task Edit Modal**: Full-featured editing with all task properties in a clean interface
- **Clean Task Display**: Hierarchical card layout with prominent task text and organized metadata
- **Source File Integration**: Direct links to source files with one-click navigation
- **Linked Notes**: Show and navigate to linked notes directly from task cards
- **Tag Filtering**: Filter tasks per board to show only specific tagged tasks
- **Auto-Sizing Swimlanes**: Swimlanes automatically adjust height to fit their content
- **Due Date Sorting**: Sort tasks within columns by due date
- **Custom Column Sorting**: Define custom column order for each board
- **Board Switching**: Quick board selection with dropdown in the view
- **Responsive Design**: Works on different screen sizes with optimized touch targets
- **Real-time Updates**: Board and settings automatically refresh when configurations change

## Installation

1. Copy the plugin files to your vault's `.obsidian/plugins/tasks-kanban/` directory
2. Enable the plugin in Obsidian's Community Plugins settings
3. Use the ribbon icon or command palette to open the Kanban board

## Usage

### Supported Task Formats

The plugin recognizes standard markdown task formats:

```markdown
- [ ] Todo task
- [/] In progress task  
- [x] Completed task
- [-] Cancelled task
```

### Task Metadata

The plugin supports comprehensive task metadata:

- **Start Date**: `🛫 2024-01-10` - When the task should be started
- **Scheduled Date**: `⏰2024-01-12` - When the task is scheduled to be worked on
- **Due Date**: `📅 2024-01-15` - When the task must be completed
- **Priorities**: `🔺 High`, `🔼 Medium`, `🔽 Low`
- **Tags**
- **Linked Notes**: `[[Note Name]]` or `[[Note Name|Display Text]]`

### Example Task

```markdown
- [ ] Review project proposal [[Meeting Notes]] 🛫 2024-01-10 ⏰ 2024-01-12 📅 2024-01-15 🔺 #work #urgent
```

### Enhanced Task Display

Tasks are displayed with a clean, hierarchical card layout:

**Card Structure:**
1. **Primary Task Text** (large, prominent) - Clean text without metadata
2. **Source File Link** (📄 filename) - Clickable link to source file
3. **Date Information** - Start, scheduled, and due dates on separate lines
4. **Linked Notes** (🔗 links) - Clickable navigation to referenced notes
5. **Tags** (#hashtags) - Organized at the bottom

**Display Example:**
```
Review project proposal and update timeline    [large, bold]
📄 Project Tasks                               [clickable link]
🛫 2024-01-10                                 [start date]
⏰ 2024-01-12                                 [scheduled date]
📅 2024-01-15                                 [due date]
🔗 Meeting Notes                              [clickable link]
#work #urgent                                 [tags]
```

### Task Editing

**Task Edit Modal:**
- Click the 📝 button on any task card to open the comprehensive edit modal
- Edit all task properties: text, status, dates, priority, tags, and linked notes
- Date pickers for easy start, scheduled, and due date selection
- Changes are automatically saved back to the source markdown file
- Real-time board updates after editing

**Navigation Options:**
- **Source File**: Click the 📄 source file link to jump to the task in its source file
- **Linked Notes**: Click the 🔗 linked note icons to open referenced notes
- **Direct Edit**: Use the edit modal for comprehensive task management

### Drag & Drop

**Enhanced Drop Zones:**
- Large, intuitive drop zones covering entire column areas
- Visual feedback when dragging over valid drop targets
- Smooth task movement between columns and swimlanes
- Automatic file updates and board refresh after moves

### Multiple Boards

Create and manage multiple boards for different workflows:

- **Board Creation**: Add unlimited custom boards with unique configurations
- **Board Switching**: Use the dropdown selector at the top of the Kanban view to switch between boards instantly
- **Independent Settings**: Each board has its own columns, filters, and swimlane configurations
- **No Global Current Board**: Board selection is view-specific, no need for global "current board" settings
- **Persistent Configuration**: Board settings are automatically saved and restored
- **Real-time Sync**: All open views automatically refresh when board configurations change

### Board Configuration Options

Each board can be customized with:

- **Custom Columns**: Define column names and order (e.g., "Backlog", "Active", "Review", "Done")
- **Tag Filtering**: Show only tasks with specific tags (e.g., `#work`, `#personal`)
- **Swimlane Settings**: Enable/disable swimlanes with custom tag-based grouping
- **Due Date Sorting**: Toggle automatic sorting by due dates
- **Column Sorting**: Define custom column order for task organization

### Example Board Configurations

**Work Board:**
- Columns: `Backlog`, `In Progress`, `Code Review`, `Testing`, `Done`
- Tag Filter: `#work`
- Swimlanes: By project (`#project-alpha`, `#project-beta`)
- Due Date Sorting: Enabled

**Personal Board:**
- Columns: `Todo`, `This Week`, `Done`
- Tag Filter: `#personal`
- Swimlanes: Disabled
- Due Date Sorting: Enabled

**Team Board:**
- Columns: `Planned`, `Active`, `Blocked`, `Review`, `Complete`
- Tag Filter: None (shows all tasks)
- Swimlanes: By team member (`#alice`, `#bob`, `#charlie`)
- Due Date Sorting: Disabled

### Swimlanes

Organize tasks into horizontal swimlanes based on tags (configurable per board):

- **Enable Swimlanes**: Toggle in board configuration
- **Configure Swimlanes**: Set up custom swimlanes with specific tag conditions
- **Tag Matching**: Tasks are automatically assigned to swimlanes based on their tags
- **Cross-Swimlane Movement**: Drag tasks between different swimlanes and columns
- **Auto-Sizing**: Swimlanes automatically adjust their height to fit all task cards
- **Per-Board Settings**: Each board can have different swimlane configurations
- **Responsive Layout**: Maintains consistent column alignment across all swimlanes

Example swimlane configuration:
- **Work Tasks**: Tags `work`, `project`
- **Personal Tasks**: Tags `personal`, `home`
- **Urgent Tasks**: Tags `urgent`, `critical`

## Commands

- **Open Tasks Kanban Board**: Opens the Kanban board view

## Settings

The plugin provides comprehensive settings for board management and customization:

### Board Management
- **Board List**: View all created boards with their configurations and summary information
- **Add New Board**: Create new boards with custom settings
- **Edit Board**: Modify existing board configurations
- **Delete Board**: Remove boards (protection against deleting the last board)
- **Live Updates**: Settings changes automatically refresh all open Kanban views

### Board Configuration

Each board can be independently configured with:

#### Basic Settings
- **Board Name**: Custom name for identification
- **Columns**: Comma-separated list of column names (e.g., "Todo, In Progress, Done")
- **Tag Filters**: Filter tasks to show only those with specific tags
- **Sort by Due Date**: Automatically sort tasks within columns by due date (earliest first)

#### Swimlane Settings (Per Board)
- **Enable Swimlanes**: Toggle swimlane view on/off for this board
- **Swimlane Configuration**: Add, edit, and delete swimlanes for this board
  - **Swimlane Name**: Display name for the swimlane
  - **Tags**: Comma-separated list of tags that assign tasks to this swimlane
  - **Enabled**: Toggle individual swimlanes on/off

#### Advanced Features (Per Board)
- **Tag-Based Filtering**: Only show tasks that match the board's tag filters
- **Tag-Based Grouping**: Tasks are automatically grouped into swimlanes based on matching tags
- **Fallback Swimlane**: Tasks without matching tags appear in the "Other" swimlane
- **Custom Column Order**: Define the order in which columns are displayed
- **Drag & Drop**: Move tasks between any combination of columns and swimlanes
- **Auto-Refresh**: Board view updates automatically when settings are modified
- **Clean Task Display**: Enhanced task rendering with source note links and clean text

### Settings Access

1. Open Obsidian Settings
2. Navigate to "Community Plugins"
3. Find "Tasks Kanban Board" and click the settings icon
4. Manage your boards and configurations

## Development

To build the plugin:

```bash
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

## License

MIT
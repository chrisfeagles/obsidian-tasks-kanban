import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, Modal } from 'obsidian';
import { KanbanView, VIEW_TYPE_KANBAN } from './src/kanban-view';

export interface Swimlane {
	name: string;
	tags: string[];
	enabled: boolean;
}

export interface KanbanBoard {
	id: string;
	name: string;
	columns: string[];
	tagFilters: string[];
	swimlanesEnabled: boolean;
	swimlanes: Swimlane[];
	sortByDueDate: boolean;
	columnSortOrder: string[];
	maxCompletedItems: number;
}

export interface TasksKanbanSettings {
	boards: KanbanBoard[];
	// Legacy settings for migration
	defaultColumns?: string[];
	taskStatusMapping?: { [key: string]: string };
	swimlanesEnabled?: boolean;
	swimlanes?: Swimlane[];
	sortByDueDate?: boolean;
	currentBoardId?: string; // Keep for migration, but don't use
}

const DEFAULT_BOARD: KanbanBoard = {
	id: 'default',
	name: 'Default Board',
	columns: ['Todo', 'In Progress', 'Done'],
	tagFilters: [],
	swimlanesEnabled: false,
	swimlanes: [
		{ name: 'Work Tasks', tags: ['work'], enabled: true },
		{ name: 'Personal Tasks', tags: ['personal'], enabled: true }
	],
	sortByDueDate: true,
	columnSortOrder: ['Todo', 'In Progress', 'Done'],
	maxCompletedItems: 50
};

const DEFAULT_SETTINGS: TasksKanbanSettings = {
	boards: [DEFAULT_BOARD]
};

export default class TasksKanbanPlugin extends Plugin {
	settings: TasksKanbanSettings;
	private settingsChangeCallbacks: Set<() => void> = new Set();

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_KANBAN,
			(leaf) => new KanbanView(leaf, this)
		);

		this.addRibbonIcon('kanban-square', 'Open Tasks Kanban', (evt: MouseEvent) => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-tasks-kanban',
			name: 'Open Tasks Kanban Board',
			callback: () => {
				this.activateView();
			}
		});

		this.addCommand({
			id: 'open-tasks-kanban-window',
			name: 'Open Tasks Kanban Board in New Window',
			callback: () => {
				this.activateViewInNewWindow();
			}
		});

		this.addSettingTab(new TasksKanbanSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_KANBAN);
	}

	async loadSettings() {
		const loadedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
		
		// Migrate legacy settings to new board structure
		this.migrateLegacySettings();
	}

	migrateLegacySettings() {
		// If we have legacy settings but no boards, migrate them
		if (this.settings.defaultColumns && (!this.settings.boards || this.settings.boards.length === 0)) {
			const migratedBoard: KanbanBoard = {
				id: 'default',
				name: 'Default Board',
				columns: this.settings.defaultColumns,
				tagFilters: [],
				swimlanesEnabled: this.settings.swimlanesEnabled || false,
				swimlanes: this.settings.swimlanes || [],
				sortByDueDate: this.settings.sortByDueDate || false,
				columnSortOrder: this.settings.defaultColumns,
				maxCompletedItems: 50
			};
			
			this.settings.boards = [migratedBoard];
			
			// Clean up legacy settings
			delete this.settings.defaultColumns;
			delete this.settings.taskStatusMapping;
			delete this.settings.swimlanesEnabled;
			delete this.settings.swimlanes;
			delete this.settings.sortByDueDate;
			delete this.settings.currentBoardId; // Remove this as well
			
			this.saveSettings();
		}
	}

	getDefaultBoard(): KanbanBoard {
		return this.settings.boards[0] || DEFAULT_BOARD;
	}

	getBoardById(id: string): KanbanBoard | undefined {
		return this.settings.boards.find(b => b.id === id);
	}

	addBoard(board: KanbanBoard) {
		this.settings.boards.push(board);
		this.saveSettings();
	}

	updateBoard(board: KanbanBoard) {
		const index = this.settings.boards.findIndex(b => b.id === board.id);
		if (index !== -1) {
			this.settings.boards[index] = board;
			this.saveSettings();
		}
	}

	deleteBoard(id: string) {
		if (this.settings.boards.length <= 1) return; // Don't delete the last board
		
		this.settings.boards = this.settings.boards.filter(b => b.id !== id);
		this.saveSettings();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.notifySettingsChanged();
	}

	registerSettingsChangeCallback(callback: () => void) {
		this.settingsChangeCallbacks.add(callback);
	}

	unregisterSettingsChangeCallback(callback: () => void) {
		this.settingsChangeCallbacks.delete(callback);
	}

	private notifySettingsChanged() {
		this.settingsChangeCallbacks.forEach(callback => callback());
	}

	async activateView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_KANBAN);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			// Create a new tab in the main area instead of sidebar
			leaf = workspace.getLeaf('tab');
			await leaf?.setViewState({ type: VIEW_TYPE_KANBAN, active: true });
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async activateViewInNewWindow() {
		const { workspace } = this.app;
		
		// Create a new window
		const newLeaf = workspace.getLeaf('window');
		await newLeaf?.setViewState({ type: VIEW_TYPE_KANBAN, active: true });
		
		if (newLeaf) {
			workspace.revealLeaf(newLeaf);
		}
	}
}

class TasksKanbanSettingTab extends PluginSettingTab {
	plugin: TasksKanbanPlugin;

	constructor(app: App, plugin: TasksKanbanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Tasks Kanban Board Settings' });

		// Board Management Section
		containerEl.createEl('h3', { text: 'Board Management' });


		// Board List
		this.plugin.settings.boards.forEach((board, index) => {
			const boardDiv = containerEl.createDiv({ cls: 'setting-item' });
			
			const infoDiv = boardDiv.createDiv({ cls: 'setting-item-info' });
			infoDiv.createDiv({ cls: 'setting-item-name', text: board.name });
			const descParts = [`${board.columns.length} columns`];
			if (board.tagFilters.length > 0) descParts.push(`Tags: ${board.tagFilters.join(', ')}`);
			if (board.swimlanesEnabled) descParts.push('Swimlanes enabled');
			infoDiv.createDiv({ cls: 'setting-item-description', text: descParts.join(' • ') });
			
			const controlDiv = boardDiv.createDiv({ cls: 'setting-item-control' });
			
			// Edit button
			const editBtn = controlDiv.createEl('button', { text: 'Edit', cls: 'mod-cta' });
			editBtn.addEventListener('click', () => {
				this.editBoard(board);
			});
			
			// Delete button (only if more than one board)
			if (this.plugin.settings.boards.length > 1) {
				const deleteBtn = controlDiv.createEl('button', { text: 'Delete', cls: 'mod-warning' });
				deleteBtn.addEventListener('click', async () => {
					this.plugin.deleteBoard(board.id);
					this.display();
				});
			}
		});

		// Add New Board
		new Setting(containerEl)
			.setName('Add New Board')
			.setDesc('Create a new board with custom configuration')
			.addButton(button => button
				.setButtonText('Add Board')
				.setCta()
				.onClick(() => {
					this.addNewBoard();
				}));
	}

	editBoard(board: KanbanBoard): void {
		const modal = new BoardModal(this.app, board, async (updatedBoard) => {
			this.plugin.updateBoard(updatedBoard);
			this.display();
		});
		modal.open();
	}

	addNewBoard(): void {
		const newBoard: KanbanBoard = {
			id: `board_${Date.now()}`,
			name: 'New Board',
			columns: ['Todo', 'In Progress', 'Done'],
			tagFilters: [],
			swimlanesEnabled: false,
			swimlanes: [],
			sortByDueDate: false,
			columnSortOrder: ['Todo', 'In Progress', 'Done'],
			maxCompletedItems: 50
		};
		const modal = new BoardModal(this.app, newBoard, async (board) => {
			this.plugin.addBoard(board);
			this.display();
		});
		modal.open();
	}
}

class BoardModal extends Modal {
	board: KanbanBoard;
	onSubmit: (board: KanbanBoard) => void;
	swimlaneContainer: HTMLElement;

	constructor(app: App, board: KanbanBoard, onSubmit: (board: KanbanBoard) => void) {
		super(app);
		this.board = { ...board, swimlanes: [...board.swimlanes] }; // Deep copy
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Configure Board' });

		new Setting(contentEl)
			.setName('Board Name')
			.setDesc('The display name for this board')
			.addText(text => text
				.setPlaceholder('Enter board name')
				.setValue(this.board.name)
				.onChange((value) => {
					this.board.name = value;
				}));

		new Setting(contentEl)
			.setName('Columns')
			.setDesc('Comma-separated list of column names')
			.addText(text => text
				.setPlaceholder('Todo, In Progress, Done')
				.setValue(this.board.columns.join(', '))
				.onChange((value) => {
					this.board.columns = value.split(',').map(s => s.trim()).filter(s => s);
					this.board.columnSortOrder = [...this.board.columns];
				}));

		new Setting(contentEl)
			.setName('Tag Filters')
			.setDesc('Only show tasks with these tags (leave empty for all tasks)')
			.addText(text => text
				.setPlaceholder('work, urgent, project')
				.setValue(this.board.tagFilters.join(', '))
				.onChange((value) => {
					this.board.tagFilters = value.split(',').map(s => s.trim()).filter(s => s);
				}));

		new Setting(contentEl)
			.setName('Sort by Due Date')
			.setDesc('Sort tasks within columns by due date (earliest first)')
			.addToggle(toggle => toggle
				.setValue(this.board.sortByDueDate)
				.onChange((value) => {
					this.board.sortByDueDate = value;
				}));

		new Setting(contentEl)
			.setName('Max Completed Items')
			.setDesc('Maximum number of completed tasks to show (0 for unlimited)')
			.addText(text => text
				.setPlaceholder('50')
				.setValue(this.board.maxCompletedItems.toString())
				.onChange((value) => {
					const num = parseInt(value) || 0;
					this.board.maxCompletedItems = Math.max(0, num);
				}));

		new Setting(contentEl)
			.setName('Enable Swimlanes')
			.setDesc('Group tasks into swimlanes based on tags')
			.addToggle(toggle => toggle
				.setValue(this.board.swimlanesEnabled)
				.onChange((value) => {
					this.board.swimlanesEnabled = value;
					this.refreshSwimlaneSection();
				}));

		this.createSwimlaneSection();

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Save')
				.setCta()
				.onClick(() => {
					this.onSubmit(this.board);
					this.close();
				}))
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => {
					this.close();
				}));
	}

	createSwimlaneSection() {
		this.swimlaneContainer = this.contentEl.createDiv({ cls: 'swimlane-section' });
		this.refreshSwimlaneSection();
	}

	refreshSwimlaneSection() {
		if (!this.swimlaneContainer) return;
		
		this.swimlaneContainer.empty();

		if (this.board.swimlanesEnabled) {
			this.swimlaneContainer.createEl('h4', { text: 'Swimlane Configuration' });

			this.board.swimlanes.forEach((swimlane, index) => {
				const swimlaneDiv = this.swimlaneContainer.createDiv({ cls: 'setting-item' });
				
				const infoDiv = swimlaneDiv.createDiv({ cls: 'setting-item-info' });
				infoDiv.createDiv({ cls: 'setting-item-name', text: `Swimlane: ${swimlane.name}` });
				infoDiv.createDiv({ cls: 'setting-item-description', text: `Tags: ${swimlane.tags.join(', ')}` });
				
				const controlDiv = swimlaneDiv.createDiv({ cls: 'setting-item-control' });
				
				const enableToggle = controlDiv.createEl('input', { type: 'checkbox' });
				enableToggle.checked = swimlane.enabled;
				enableToggle.addEventListener('change', () => {
					this.board.swimlanes[index].enabled = enableToggle.checked;
				});
				
				const editBtn = controlDiv.createEl('button', { text: 'Edit', cls: 'mod-cta' });
				editBtn.addEventListener('click', () => {
					this.editSwimlane(index);
				});
				
				const deleteBtn = controlDiv.createEl('button', { text: 'Delete', cls: 'mod-warning' });
				deleteBtn.addEventListener('click', () => {
					this.board.swimlanes.splice(index, 1);
					this.refreshSwimlaneSection();
				});
			});

			new Setting(this.swimlaneContainer)
				.setName('Add Swimlane')
				.addButton(button => button
					.setButtonText('Add')
					.onClick(() => {
						this.addSwimlane();
					}));
		}
	}

	editSwimlane(index: number): void {
		const swimlane = this.board.swimlanes[index];
		const modal = new SwimlaneModal(this.app, swimlane, (updatedSwimlane) => {
			this.board.swimlanes[index] = updatedSwimlane;
			this.refreshSwimlaneSection();
		});
		modal.open();
	}

	addSwimlane(): void {
		const newSwimlane: Swimlane = { name: 'New Swimlane', tags: [], enabled: true };
		const modal = new SwimlaneModal(this.app, newSwimlane, (swimlane) => {
			this.board.swimlanes.push(swimlane);
			this.refreshSwimlaneSection();
		});
		modal.open();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SwimlaneModal extends Modal {
	swimlane: Swimlane;
	onSubmit: (swimlane: Swimlane) => void;

	constructor(app: App, swimlane: Swimlane, onSubmit: (swimlane: Swimlane) => void) {
		super(app);
		this.swimlane = { ...swimlane }; // Create a copy
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Configure Swimlane' });

		new Setting(contentEl)
			.setName('Swimlane Name')
			.setDesc('The display name for this swimlane')
			.addText(text => text
				.setPlaceholder('Enter swimlane name')
				.setValue(this.swimlane.name)
				.onChange((value) => {
					this.swimlane.name = value;
				}));

		new Setting(contentEl)
			.setName('Tags')
			.setDesc('Comma-separated list of tags that will be included in this swimlane')
			.addText(text => text
				.setPlaceholder('work, urgent, project')
				.setValue(this.swimlane.tags.join(', '))
				.onChange((value) => {
					this.swimlane.tags = value.split(',').map(s => s.trim()).filter(s => s);
				}));

		new Setting(contentEl)
			.setName('Enabled')
			.setDesc('Whether this swimlane is active')
			.addToggle(toggle => toggle
				.setValue(this.swimlane.enabled)
				.onChange((value) => {
					this.swimlane.enabled = value;
				}));

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Save')
				.setCta()
				.onClick(() => {
					this.onSubmit(this.swimlane);
					this.close();
				}))
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => {
					this.close();
				}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
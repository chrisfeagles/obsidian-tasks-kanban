import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import TasksKanbanPlugin from '../main';
import { KanbanBoard } from './kanban-board';
import { TaskParser } from './task-parser';
import { KanbanBoard as BoardConfig } from '../main';

export const VIEW_TYPE_KANBAN = 'tasks-kanban-view';

export class KanbanView extends ItemView {
	plugin: TasksKanbanPlugin;
	board: KanbanBoard;
	taskParser: TaskParser;
	currentBoard: BoardConfig;
	private settingsChangeCallback: () => void;
	private boardSelector: HTMLSelectElement;
	private currentBoardId: string;

	constructor(leaf: WorkspaceLeaf, plugin: TasksKanbanPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.taskParser = new TaskParser(this.app);
		
		// Initialize with first available board
		this.currentBoardId = this.plugin.getDefaultBoard().id;
		
		// Register for settings changes
		this.settingsChangeCallback = () => this.handleSettingsChange();
		this.plugin.registerSettingsChangeCallback(this.settingsChangeCallback);
	}

	getViewType() {
		return VIEW_TYPE_KANBAN;
	}

	getDisplayText() {
		return 'Tasks Kanban Board';
	}

	getIcon() {
		return 'kanban-square';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		
		// Get current board configuration
		this.currentBoard = this.plugin.getBoardById(this.currentBoardId) || this.plugin.getDefaultBoard();
		this.currentBoardId = this.currentBoard.id; // Ensure sync in case of fallback
		
		// Create board selector
		this.createBoardSelector(container);
		
		const boardContainer = container.createDiv({ cls: 'kanban-board-container' });
		
		this.board = new KanbanBoard(
			boardContainer,
			this.currentBoard.columns,
			this.taskParser,
			this.plugin,
			this.currentBoard
		);

		await this.refreshBoard();

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.refreshBoard();
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.refreshBoard();
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.refreshBoard();
				}
			})
		);
	}

	async onClose() {
		// Unregister settings change callback
		if (this.settingsChangeCallback) {
			this.plugin.unregisterSettingsChangeCallback(this.settingsChangeCallback);
		}
	}

	createBoardSelector(container: Element) {
		const selectorContainer = container.createDiv({ cls: 'kanban-board-selector' });
		
		const selectorLabel = selectorContainer.createSpan({ text: 'Board: ', cls: 'kanban-board-selector-label' });
		
		this.boardSelector = selectorContainer.createEl('select', { cls: 'kanban-board-selector-dropdown' });
		
		this.updateBoardSelector();
		
		this.boardSelector.addEventListener('change', async (e) => {
			const selectedBoardId = (e.target as HTMLSelectElement).value;
			await this.switchToBoard(selectedBoardId);
		});
	}

	updateBoardSelector() {
		if (!this.boardSelector) return;
		
		// Clear existing options
		this.boardSelector.empty();
		
		// Add current boards
		this.plugin.settings.boards.forEach(board => {
			const option = this.boardSelector.createEl('option', { value: board.id, text: board.name });
			if (board.id === this.currentBoardId) {
				option.selected = true;
			}
		});
	}

	async switchToBoard(boardId: string) {
		const newBoard = this.plugin.getBoardById(boardId);
		if (!newBoard) return;
		
		this.currentBoard = newBoard;
		this.currentBoardId = boardId;
		
		// Recreate the kanban board with new configuration
		if (this.board) {
			this.board.container.empty();
			this.board = new KanbanBoard(
				this.board.container,
				this.currentBoard.columns,
				this.taskParser,
				this.plugin,
				this.currentBoard
			);
		}
		
		await this.refreshBoard();
	}

	async handleSettingsChange() {
		// Update board selector with any new/removed boards
		this.updateBoardSelector();
		
		// Check if current board still exists
		const currentBoard = this.plugin.getBoardById(this.currentBoardId);
		if (!currentBoard) {
			// Current board was deleted, switch to first available board
			if (this.plugin.settings.boards.length > 0) {
				await this.switchToBoard(this.plugin.settings.boards[0].id);
			}
			return;
		}
		
		// Check if current board configuration changed
		const hasConfigChanged = JSON.stringify(this.currentBoard) !== JSON.stringify(currentBoard);
		
		if (hasConfigChanged) {
			// Board configuration changed, refresh with updated config
			await this.switchToBoard(this.currentBoardId);
		} else {
			// Just refresh with current configuration
			await this.refreshBoard();
		}
	}

	async refreshBoard() {
		if (this.board && this.currentBoard) {
			const tasks = await this.taskParser.getAllTasks(this.currentBoard);
			this.board.updateTasks(tasks);
		}
	}
}
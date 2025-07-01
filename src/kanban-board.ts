import { Notice, TFile, Modal, App, Setting } from 'obsidian';
import { Task, TaskParser } from './task-parser';
import TasksKanbanPlugin from '../main';
import { KanbanBoard as BoardConfig } from '../main';

export class KanbanBoard {
	container: HTMLElement;
	columns: string[];
	taskParser: TaskParser;
	plugin: TasksKanbanPlugin;
	tasks: Task[] = [];
	columnElements: { [key: string]: HTMLElement } = {};
	swimlaneElements: { [key: string]: { [key: string]: HTMLElement } } = {};
	boardConfig: BoardConfig;

	constructor(
		container: HTMLElement,
		columns: string[],
		taskParser: TaskParser,
		plugin: TasksKanbanPlugin,
		boardConfig: BoardConfig
	) {
		this.container = container;
		this.columns = columns;
		this.taskParser = taskParser;
		this.plugin = plugin;
		this.boardConfig = boardConfig;
		this.init();
	}

	init() {
		// Remove any existing board layout classes
		this.container.removeClass('kanban-board');
		this.container.removeClass('kanban-board-swimlanes');
		
		// Add the base class
		this.container.addClass('kanban-board');
		
		// Add swimlane class if enabled
		if (this.boardConfig.swimlanesEnabled) {
			this.container.addClass('kanban-board-swimlanes');
		}
		
		this.createColumns();
	}

	createColumns() {
		if (this.boardConfig.swimlanesEnabled) {
			this.createSwimlaneLayout();
		} else {
			this.createStandardLayout();
		}
	}

	createStandardLayout() {
		this.columns.forEach(columnName => {
			const columnEl = this.container.createDiv({ cls: 'kanban-column' });
			
			const headerEl = columnEl.createDiv({ cls: 'kanban-column-header' });
			headerEl.createSpan({ text: columnName, cls: 'kanban-column-title' });
			
			const tasksEl = columnEl.createDiv({ cls: 'kanban-column-tasks' });
			
			this.columnElements[columnName] = tasksEl;
			
			// Set up drop zone on both the tasks container and the entire column
			this.setupDropZone(tasksEl, columnName);
			this.setupDropZone(columnEl, columnName);
		});
	}

	createSwimlaneLayout() {
		// Create header row with column names
		const headerRow = this.container.createDiv({ cls: 'kanban-header-row' });
		headerRow.createDiv({ cls: 'kanban-swimlane-label' }); // Empty space for swimlane labels
		
		this.columns.forEach(columnName => {
			const headerEl = headerRow.createDiv({ cls: 'kanban-column-header-swimlane' });
			headerEl.createSpan({ text: columnName, cls: 'kanban-column-title' });
		});

		// Get all enabled swimlanes plus 'Other'
		const swimlanes = [...this.boardConfig.swimlanes.filter(s => s.enabled), { name: 'Other', tags: [], enabled: true }];
		
		// Create swimlane rows
		swimlanes.forEach(swimlane => {
			const swimlaneRow = this.container.createDiv({ cls: 'kanban-swimlane-row' });
			
			// Swimlane label
			const labelEl = swimlaneRow.createDiv({ cls: 'kanban-swimlane-label' });
			labelEl.createSpan({ text: swimlane.name, cls: 'kanban-swimlane-title' });
			
			// Create columns for this swimlane
			this.swimlaneElements[swimlane.name] = {};
			this.columns.forEach(columnName => {
				const columnEl = swimlaneRow.createDiv({ cls: 'kanban-column kanban-column-swimlane' });
				const tasksEl = columnEl.createDiv({ cls: 'kanban-column-tasks' });
				
				this.swimlaneElements[swimlane.name][columnName] = tasksEl;
				
				// Set up drop zone on both the tasks container and the entire column
				this.setupDropZone(tasksEl, columnName, swimlane.name);
				this.setupDropZone(columnEl, columnName, swimlane.name);
			});
		});
	}

	updateTasks(tasks: Task[]) {
		this.tasks = tasks;
		this.renderTasks();
	}

	renderTasks() {
		if (this.boardConfig.swimlanesEnabled) {
			this.renderTasksWithSwimlanes();
		} else {
			this.renderTasksStandard();
		}
	}

	renderTasksStandard() {
		Object.values(this.columnElements).forEach(el => el.empty());

		this.tasks.forEach(task => {
			const taskEl = this.createTaskCard(task);
			const columnEl = this.columnElements[task.column];
			if (columnEl) {
				columnEl.appendChild(taskEl);
			}
		});
	}

	renderTasksWithSwimlanes() {
		// Clear all swimlane elements
		Object.values(this.swimlaneElements).forEach(swimlane => {
			Object.values(swimlane).forEach(columnEl => columnEl.empty());
		});

		// Group tasks by swimlane
		const tasksBySwimlane = this.taskParser.getTasksBySwimlane(this.tasks);

		// Render tasks in their respective swimlane columns
		Object.entries(tasksBySwimlane).forEach(([swimlaneName, tasks]) => {
			tasks.forEach(task => {
				const taskEl = this.createTaskCard(task);
				const swimlaneColumns = this.swimlaneElements[swimlaneName];
				if (swimlaneColumns && swimlaneColumns[task.column]) {
					swimlaneColumns[task.column].appendChild(taskEl);
				}
			});
		});
	}

	createTaskCard(task: Task): HTMLElement {
		const cardEl = document.createElement('div');
		cardEl.addClass('kanban-task-card');
		cardEl.draggable = true;
		cardEl.dataset.taskId = task.id;

		const contentEl = cardEl.createDiv({ cls: 'kanban-task-content' });
		
		// 1. Primary task text (largest, clean text only)
		if (task.cleanText) {
			const primaryTextEl = contentEl.createDiv({ cls: 'kanban-task-primary-text' });
			primaryTextEl.createSpan({ text: task.cleanText });
		}
		
		// 2. Source note link (second line)
		const sourceEl = contentEl.createDiv({ cls: 'kanban-task-source' });
		const sourceLink = sourceEl.createSpan({ text: `📄 ${task.sourceNote}`, cls: 'kanban-task-source-link' });
		sourceLink.addEventListener('click', (e) => {
			e.stopPropagation();
			this.openTaskInFile(task);
		});

		// 3. Dates section (third section)
		if (task.startDate) {
			const startDateEl = contentEl.createDiv({ cls: 'kanban-task-date' });
			startDateEl.createSpan({ text: `🛫 ${task.startDate}` });
		}

		if (task.scheduledDate) {
			const scheduledDateEl = contentEl.createDiv({ cls: 'kanban-task-date' });
			scheduledDateEl.createSpan({ text: `⏰ ${task.scheduledDate}` });
		}

		if (task.dueDate) {
			const dueDateEl = contentEl.createDiv({ cls: 'kanban-task-date' });
			dueDateEl.createSpan({ text: `📅 ${task.dueDate}` });
		}

		// 4. Linked notes (fourth section)
		if (task.linkedNotes.length > 0) {
			const linksEl = contentEl.createDiv({ cls: 'kanban-task-links' });
			task.linkedNotes.forEach(note => {
				const linkEl = linksEl.createSpan({ text: `🔗 ${note}`, cls: 'kanban-task-link' });
				linkEl.addEventListener('click', (e) => {
					e.stopPropagation();
					this.openLinkedNote(note);
				});
			});
		}

		// 5. Tags (bottom section)
		if (task.tags.length > 0) {
			const tagsEl = contentEl.createDiv({ cls: 'kanban-task-tags' });
			task.tags.forEach(tag => {
				const tagEl = tagsEl.createSpan({ text: `#${tag}`, cls: 'kanban-task-tag' });
			});
		}

		const actionsEl = cardEl.createDiv({ cls: 'kanban-task-actions' });
		const editBtn = actionsEl.createEl('button', { text: '📝', cls: 'kanban-task-action-btn' });
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.openTaskEditModal(task);
		});

		this.setupDragEvents(cardEl, task);

		return cardEl;
	}

	private getPriorityIcon(priority: string): string {
		switch (priority) {
			case 'High': return '🔺';
			case 'Medium': return '🔼';
			case 'Low': return '🔽';
			default: return '';
		}
	}

	setupDragEvents(cardEl: HTMLElement, task: Task) {
		// Set up drag events on the card
		cardEl.addEventListener('dragstart', (e) => {
			if (e.dataTransfer) {
				e.dataTransfer.setData('text/plain', task.id);
				cardEl.addClass('dragging');
			}
		});

		cardEl.addEventListener('dragend', () => {
			cardEl.removeClass('dragging');
		});

		// Handle mousedown on the entire card to initiate drag
		cardEl.addEventListener('mousedown', (e) => {
			// Skip if the target is a clickable button
			const target = e.target as HTMLElement;
			if (target.tagName === 'BUTTON' || target.closest('button')) {
				return;
			}
			
			// Skip if the target is a clickable link
			if (target.classList.contains('kanban-task-source-link') || 
				target.classList.contains('kanban-task-link') ||
				target.closest('.kanban-task-source-link') ||
				target.closest('.kanban-task-link')) {
				return;
			}
			
			// Set the card as ready to drag
			cardEl.style.cursor = 'grabbing';
		});

		cardEl.addEventListener('mouseup', () => {
			cardEl.style.cursor = 'grab';
		});
	}

	setupDropZone(columnEl: HTMLElement, columnName: string, swimlaneName?: string) {
		columnEl.addEventListener('dragover', (e) => {
			e.preventDefault();
			columnEl.addClass('drag-over');
		});

		columnEl.addEventListener('dragleave', (e) => {
			if (!columnEl.contains(e.relatedTarget as Node)) {
				columnEl.removeClass('drag-over');
			}
		});

		columnEl.addEventListener('drop', async (e) => {
			e.preventDefault();
			columnEl.removeClass('drag-over');

			const taskId = e.dataTransfer?.getData('text/plain');
			if (taskId) {
				await this.moveTask(taskId, columnName, swimlaneName);
			}
		});
	}

	async moveTask(taskId: string, newColumn: string, newSwimlane?: string) {
		const task = this.tasks.find(t => t.id === taskId);
		if (!task) return;

		const newStatus = this.taskParser.getStatusFromColumn(newColumn);
		
		try {
			await this.taskParser.updateTaskStatus(task, newStatus);
			task.column = newColumn;
			task.status = newStatus;
			
			// Update swimlane if moving between swimlanes
			if (newSwimlane && newSwimlane !== task.swimlane) {
				task.swimlane = newSwimlane;
				new Notice(`Task moved to ${newColumn} in ${newSwimlane}`);
			} else {
				new Notice(`Task moved to ${newColumn}`);
			}
			
			// Re-render the board to show the updated task position
			this.renderTasks();
		} catch (error) {
			new Notice(`Failed to move task: ${error.message}`);
		}
	}

	async openTaskInFile(task: Task) {
		const leaf = this.plugin.app.workspace.getLeaf();
		await leaf.openFile(task.file);
		
		const view = leaf.view;
		if (view && 'editor' in view) {
			const editor = (view as any).editor;
			if (editor) {
				editor.setCursor(task.line, 0);
				editor.focus();
			}
		}
	}

	async openLinkedNote(noteName: string) {
		// First try to find the file by exact path
		let file = this.plugin.app.vault.getAbstractFileByPath(`${noteName}.md`);
		
		// If not found, search by basename
		if (!file) {
			const allFiles = this.plugin.app.vault.getMarkdownFiles();
			file = allFiles.find(f => f.basename === noteName);
		}
		
		if (file instanceof TFile) {
			const leaf = this.plugin.app.workspace.getLeaf();
			await leaf.openFile(file);
		} else {
			new Notice(`Note "${noteName}" not found`);
		}
	}

	openTaskEditModal(task: Task) {
		const modal = new TaskEditModal(this.plugin.app, task, this.taskParser, async (updatedTask) => {
			// Update the task in the tasks array
			const taskIndex = this.tasks.findIndex(t => t.id === task.id);
			if (taskIndex !== -1) {
				this.tasks[taskIndex] = updatedTask;
			}
			
			// Re-render the board to show updated task
			this.renderTasks();
		});
		modal.open();
	}
}

export class TaskEditModal extends Modal {
	task: Task;
	taskParser: TaskParser;
	onSave: (updatedTask: Task) => void;
	
	// Form fields
	taskTextInput: HTMLTextAreaElement;
	startDateInput: HTMLInputElement;
	scheduledDateInput: HTMLInputElement;
	dueDateInput: HTMLInputElement;
	prioritySelect: HTMLSelectElement;
	tagsInput: HTMLInputElement;
	linkedNotesInput: HTMLInputElement;
	statusSelect: HTMLSelectElement;

	constructor(app: App, task: Task, taskParser: TaskParser, onSave: (updatedTask: Task) => void) {
		super(app);
		this.task = { ...task }; // Create a copy
		this.taskParser = taskParser;
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('task-edit-modal');
		contentEl.createEl('h2', { text: 'Edit Task' });

		// Task Text
		new Setting(contentEl)
			.setName('Task Text')
			.setDesc('The main task description')
			.addTextArea(text => {
				this.taskTextInput = text.inputEl;
				text.setValue(this.task.cleanText)
					.setPlaceholder('Enter task description...');
				text.inputEl.rows = 3;
				text.inputEl.style.width = '100%';
				text.inputEl.style.resize = 'vertical';
			});

		// Status
		new Setting(contentEl)
			.setName('Status')
			.setDesc('Task completion status')
			.addDropdown(dropdown => {
				this.statusSelect = dropdown.selectEl;
				dropdown.addOption(' ', 'Todo')
					.addOption('/', 'In Progress')
					.addOption('x', 'Done')
					.addOption('-', 'Cancelled')
					.addOption('?', 'Waiting on Feedback')
					.setValue(this.task.status);
			});

		// Start Date
		new Setting(contentEl)
			.setName('Start Date')
			.setDesc('When the task should be started (🛫)')
			.addText(text => {
				this.startDateInput = text.inputEl;
				text.setValue(this.task.startDate || '')
					.setPlaceholder('2024-01-15');
				text.inputEl.type = 'date';
			});

		// Scheduled Date
		new Setting(contentEl)
			.setName('Scheduled Date')
			.setDesc('When the task is scheduled to be worked on (⏰)')
			.addText(text => {
				this.scheduledDateInput = text.inputEl;
				text.setValue(this.task.scheduledDate || '')
					.setPlaceholder('2024-01-15');
				text.inputEl.type = 'date';
			});

		// Due Date
		new Setting(contentEl)
			.setName('Due Date')
			.setDesc('When the task must be completed (📅)')
			.addText(text => {
				this.dueDateInput = text.inputEl;
				text.setValue(this.task.dueDate || '')
					.setPlaceholder('2024-01-15');
				text.inputEl.type = 'date';
			});

		// Priority
		new Setting(contentEl)
			.setName('Priority')
			.setDesc('Task priority level')
			.addDropdown(dropdown => {
				this.prioritySelect = dropdown.selectEl;
				dropdown.addOption('', 'None')
					.addOption('High', 'High')
					.addOption('Medium', 'Medium')
					.addOption('Low', 'Low')
					.setValue(this.task.priority || '');
			});

		// Tags
		new Setting(contentEl)
			.setName('Tags')
			.setDesc('Comma-separated list of tags (without #)')
			.addText(text => {
				this.tagsInput = text.inputEl;
				text.setValue(this.task.tags.join(', '))
					.setPlaceholder('work, urgent, project');
				text.inputEl.style.width = '100%';
			});

		// Linked Notes
		new Setting(contentEl)
			.setName('Linked Notes')
			.setDesc('Comma-separated list of note names to link')
			.addText(text => {
				this.linkedNotesInput = text.inputEl;
				text.setValue(this.task.linkedNotes.join(', '))
					.setPlaceholder('Meeting Notes, Project Plan');
				text.inputEl.style.width = '100%';
			});

		// Buttons
		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Save')
				.setCta()
				.onClick(() => {
					this.saveTask();
				}))
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => {
					this.close();
				}));
	}

	async saveTask() {
		try {
			// Update task properties from form
			const updatedTask = { ...this.task };
			
			updatedTask.cleanText = this.taskTextInput.value.trim();
			updatedTask.status = this.statusSelect.value;
			updatedTask.startDate = this.startDateInput.value || undefined;
			updatedTask.scheduledDate = this.scheduledDateInput.value || undefined;
			updatedTask.dueDate = this.dueDateInput.value || undefined;
			updatedTask.priority = this.prioritySelect.value || undefined;
			updatedTask.tags = this.tagsInput.value
				.split(',')
				.map(tag => tag.trim())
				.filter(tag => tag.length > 0);
			updatedTask.linkedNotes = this.linkedNotesInput.value
				.split(',')
				.map(note => note.trim())
				.filter(note => note.length > 0);

			// Reconstruct the full task text with metadata
			const fullTaskText = this.reconstructTaskText(updatedTask);
			updatedTask.text = fullTaskText;

			// Update the file
			await this.updateTaskInFile(updatedTask, fullTaskText);
			
			// Update column based on status
			updatedTask.column = this.taskParser.getColumnFromStatus(updatedTask.status);
			
			// Callback to update the UI
			this.onSave(updatedTask);
			
			new Notice('Task updated successfully');
			this.close();
		} catch (error) {
			new Notice(`Failed to update task: ${error.message}`);
		}
	}

	private reconstructTaskText(task: Task): string {
		let text = task.cleanText;
		
		// Add linked notes
		if (task.linkedNotes.length > 0) {
			const noteLinks = task.linkedNotes.map(note => `[[${note}]]`).join(' ');
			text += ` ${noteLinks}`;
		}
		
		// Add start date
		if (task.startDate) {
			text += ` 🛫 ${task.startDate}`;
		}
		
		// Add scheduled date
		if (task.scheduledDate) {
			text += ` ⏰ ${task.scheduledDate}`;
		}
		
		// Add due date
		if (task.dueDate) {
			text += ` 📅 ${task.dueDate}`;
		}
		
		// Add priority
		if (task.priority) {
			const priorityIcon = this.getPriorityIcon(task.priority);
			text += ` ${priorityIcon}`;
		}
		
		// Add tags
		if (task.tags.length > 0) {
			const tagString = task.tags.map(tag => `#${tag}`).join(' ');
			text += ` ${tagString}`;
		}
		
		return text;
	}

	private getPriorityIcon(priority: string): string {
		switch (priority) {
			case 'High': return '🔺';
			case 'Medium': return '🔼';
			case 'Low': return '🔽';
			default: return '';
		}
	}

	private async updateTaskInFile(task: Task, newTaskText: string): Promise<void> {
		const content = await this.app.vault.read(task.file);
		const lines = content.split('\n');
		
		if (lines[task.line]) {
			const currentLine = lines[task.line];
			// Replace the task text while preserving the task structure
			const taskMatch = currentLine.match(/^(\s*-\s+\[)([^\]]+)(\]\s+)(.+)$/);
			if (taskMatch) {
				const [, prefix, , suffix] = taskMatch;
				lines[task.line] = `${prefix}${task.status}${suffix}${newTaskText}`;
			} else {
				// Fallback: replace the entire line
				const indentMatch = currentLine.match(/^(\s*)/);
				const indent = indentMatch ? indentMatch[1] : '';
				lines[task.line] = `${indent}- [${task.status}] ${newTaskText}`;
			}
			
			const newContent = lines.join('\n');
			await this.app.vault.modify(task.file, newContent);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
import { App, TFile } from 'obsidian';
import { Swimlane, KanbanBoard } from '../main';

export interface Task {
	id: string;
	text: string;
	cleanText: string;
	sourceNote: string;
	status: string;
	file: TFile;
	line: number;
	column: string;
	startDate?: string;
	scheduledDate?: string;
	dueDate?: string;
	tags: string[];
	priority?: string;
	linkedNotes: string[];
	swimlane?: string;
}

export class TaskParser {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	async getAllTasks(board?: KanbanBoard): Promise<Task[]> {
		const tasks: Task[] = [];
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const fileTasks = await this.parseTasksFromFile(file);
			tasks.push(...fileTasks);
		}

		let filteredTasks = tasks;

		// Apply tag filters if specified
		if (board && board.tagFilters.length > 0) {
			filteredTasks = this.filterTasksByTags(tasks, board.tagFilters);
		}

		// Assign swimlanes if enabled
		if (board && board.swimlanesEnabled && board.swimlanes) {
			this.assignSwimlanes(filteredTasks, board.swimlanes);
		}

		// Sort by due date if requested
		if (board && board.sortByDueDate) {
			this.sortTasksByDueDate(filteredTasks);
		}

		// Sort columns if custom order is specified
		if (board && board.columnSortOrder.length > 0) {
			this.sortTasksByColumnOrder(filteredTasks, board.columnSortOrder);
		}

		return filteredTasks;
	}

	async parseTasksFromFile(file: TFile): Promise<Task[]> {
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');
		const tasks: Task[] = [];

		lines.forEach((line, lineNumber) => {
			const taskMatch = line.match(/^(\s*)-\s+\[([^\]]+)\]\s+(.+)$/);
			if (taskMatch) {
				const [, indent, status, taskText] = taskMatch;
				
				const task: Task = {
					id: `${file.path}:${lineNumber}`,
					text: taskText.trim(),
					cleanText: this.cleanTaskText(taskText),
					sourceNote: file.basename,
					status: status.trim(),
					file: file,
					line: lineNumber,
					column: this.getColumnFromStatus(status.trim()),
					tags: this.extractTags(taskText),
					startDate: this.extractStartDate(taskText),
					scheduledDate: this.extractScheduledDate(taskText),
					dueDate: this.extractDueDate(taskText),
					priority: this.extractPriority(taskText),
					linkedNotes: this.extractLinkedNotes(taskText)
				};

				tasks.push(task);
			}
		});

		return tasks;
	}

	public getColumnFromStatus(status: string): string {
		switch (status) {
			case ' ':
			case '':
				return 'Todo';
			case '/':
				return 'In Progress';
			case 'x':
			case 'X':
				return 'Done';
			case '-':
				return 'Cancelled';
			case '?':
				return 'Waiting on Feedback';
			default:
				return 'Todo';
		}
	}

	private extractTags(text: string): string[] {
		const tagMatches = text.match(/#[\w-]+/g);
		return tagMatches ? tagMatches.map(tag => tag.slice(1)) : [];
	}

	private extractStartDate(text: string): string | undefined {
		const startDateMatch = text.match(/🛫\s*(\d{4}-\d{2}-\d{2})/);
		return startDateMatch ? startDateMatch[1] : undefined;
	}

	private extractScheduledDate(text: string): string | undefined {
		const scheduledDateMatch = text.match(/⏰\s*(\d{4}-\d{2}-\d{2})/);
		return scheduledDateMatch ? scheduledDateMatch[1] : undefined;
	}

	private extractDueDate(text: string): string | undefined {
		const dueDateMatch = text.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
		return dueDateMatch ? dueDateMatch[1] : undefined;
	}

	private extractPriority(text: string): string | undefined {
		if (text.includes('🔺')) return 'High';
		if (text.includes('🔼')) return 'Medium';
		if (text.includes('🔽')) return 'Low';
		return undefined;
	}

	private extractLinkedNotes(text: string): string[] {
		// Match both [[Note Name]] and [[Note Name|Display Text]] formats
		const linkMatches = text.match(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g);
		if (!linkMatches) return [];
		
		return linkMatches.map(link => {
			// Extract the note name from [[Note Name]] or [[Note Name|Display]]
			const match = link.match(/\[\[([^\]|]+)/);
			return match ? match[1].trim() : '';
		}).filter(note => note.length > 0);
	}

	private cleanTaskText(text: string): string {
		let cleanText = text;
		
		// Remove all linked notes [[Note Name]] and [[Note Name|Display Text]]
		cleanText = cleanText.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '');
		
		// Remove start dates 🛫 2024-01-15
		cleanText = cleanText.replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, '');
		
		// Remove scheduled dates ⏰ 2024-01-15
		cleanText = cleanText.replace(/⏰\s*\d{4}-\d{2}-\d{2}/g, '');
		
		// Remove due dates 📅 2024-01-15
		cleanText = cleanText.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '');
		
		// Remove priority indicators
		cleanText = cleanText.replace(/🔺\s*(High)?/g, '');
		cleanText = cleanText.replace(/🔼\s*(Medium)?/g, '');
		cleanText = cleanText.replace(/🔽\s*(Low)?/g, '');
		
		// Remove tags #tagname
		cleanText = cleanText.replace(/#[\w-]+/g, '');
		
		// Clean up extra whitespace and trim
		cleanText = cleanText.replace(/\s+/g, ' ').trim();
		
		return cleanText;
	}

	async updateTaskStatus(task: Task, newStatus: string): Promise<void> {
		const content = await this.app.vault.read(task.file);
		const lines = content.split('\n');
		
		if (lines[task.line]) {
			const currentLine = lines[task.line];
			const updatedLine = currentLine.replace(/\[([^\]]+)\]/, `[${newStatus}]`);
			lines[task.line] = updatedLine;
			
			const newContent = lines.join('\n');
			await this.app.vault.modify(task.file, newContent);
		}
	}

	getStatusFromColumn(column: string): string {
		switch (column) {
			case 'Todo':
				return ' ';
			case 'In Progress':
				return '/';
			case 'Done':
				return 'x';
			case 'Cancelled':
				return '-';
			case 'Waiting on Feedback':
				return '?';
			default:
				return ' ';
		}
	}

	private assignSwimlanes(tasks: Task[], swimlanes: Swimlane[]): void {
		tasks.forEach(task => {
			// Find the first matching swimlane based on tags
			const matchingSwimlane = swimlanes.find(swimlane => 
				swimlane.enabled && 
				swimlane.tags.some(tag => task.tags.includes(tag))
			);
			
			if (matchingSwimlane) {
				task.swimlane = matchingSwimlane.name;
			} else {
				task.swimlane = 'Other'; // Default swimlane for unmatched tasks
			}
		});
	}

	private sortTasksByDueDate(tasks: Task[]): void {
		tasks.sort((a, b) => {
			// Tasks without due dates go to the end
			if (!a.dueDate && !b.dueDate) return 0;
			if (!a.dueDate) return 1;
			if (!b.dueDate) return -1;
			
			// Compare due dates
			return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
		});
	}

	private filterTasksByTags(tasks: Task[], tagFilters: string[]): Task[] {
		return tasks.filter(task => {
			// Task must have at least one of the filter tags
			return tagFilters.some(filterTag => task.tags.includes(filterTag));
		});
	}

	private sortTasksByColumnOrder(tasks: Task[], columnOrder: string[]): void {
		tasks.sort((a, b) => {
			const aIndex = columnOrder.indexOf(a.column);
			const bIndex = columnOrder.indexOf(b.column);
			
			// If column not found in order, put it at the end
			const aPos = aIndex === -1 ? columnOrder.length : aIndex;
			const bPos = bIndex === -1 ? columnOrder.length : bIndex;
			
			return aPos - bPos;
		});
	}

	getTasksBySwimlane(tasks: Task[]): { [swimlane: string]: Task[] } {
		const tasksBySwimlane: { [swimlane: string]: Task[] } = {};
		
		tasks.forEach(task => {
			const swimlane = task.swimlane || 'Other';
			if (!tasksBySwimlane[swimlane]) {
				tasksBySwimlane[swimlane] = [];
			}
			tasksBySwimlane[swimlane].push(task);
		});
		
		return tasksBySwimlane;
	}
}
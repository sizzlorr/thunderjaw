import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface LoadItem {
  id: string;
  colorName: string;
  colorCode: string;
  groupNames: string;
  comment: string;
  done: boolean;
}

interface StageItem {
  id: string;
  title: string;
  done: boolean;
  loads: LoadItem[];
}

interface AppState {
  stages: StageItem[];
}

interface LoadForm {
  colorName: string;
  colorCode: string;
  groupNames: string;
  comment: string;
}

const STORAGE_KEY = 'thunderjaw-painted-parts-state';
const DEFAULT_COLOR = '#2563eb';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);

  state: AppState = { stages: [] };
  isSaving = false;
  statusMessage = 'Loading saved state…';
  modalStageId: string | null = null;
  editingLoadId: string | null = null;
  loadForm: LoadForm = this.getEmptyLoadForm();
  formSubmitted = false;

  ngOnInit(): void {
    this.loadState();
  }

  get totalLoads(): number {
    return this.state.stages.reduce((count, stage) => count + stage.loads.length, 0);
  }

  get completedLoads(): number {
    return this.state.stages.reduce(
      (count, stage) => count + stage.loads.filter((load) => load.done).length,
      0
    );
  }

  get completedStages(): number {
    return this.state.stages.filter((stage) => stage.done).length;
  }

  get modalTitle(): string {
    return this.editingLoadId ? 'Edit Load' : 'Add Load';
  }

  get activeStage(): StageItem | undefined {
    return this.state.stages.find((stage) => stage.id === this.modalStageId);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.modalStageId) {
      this.closeLoadModal();
    }
  }

  addStage(): void {
    this.state.stages = this.renumberStages([
      ...this.state.stages,
      {
        id: this.createId('stage'),
        title: `Stage ${this.state.stages.length + 1}`,
        done: false,
        loads: []
      }
    ]);
    this.persistState('Stage added.');
  }

  removeStage(stageId: string): void {
    this.state.stages = this.renumberStages(this.state.stages.filter((stage) => stage.id !== stageId));
    this.persistState('Stage removed.');
  }

  toggleStage(stage: StageItem): void {
    const done = !stage.done;
    stage.done = done;
    stage.loads = stage.loads.map((load) => ({ ...load, done }));
    this.persistState(done ? `${stage.title} marked done.` : `${stage.title} marked undone.`);
  }

  openAddLoadModal(stage: StageItem): void {
    this.modalStageId = stage.id;
    this.editingLoadId = null;
    this.loadForm = this.getEmptyLoadForm();
    this.formSubmitted = false;
  }

  openEditLoadModal(stage: StageItem, load: LoadItem): void {
    this.modalStageId = stage.id;
    this.editingLoadId = load.id;
    this.loadForm = {
      colorName: load.colorName,
      colorCode: load.colorCode,
      groupNames: load.groupNames,
      comment: load.comment
    };
    this.formSubmitted = false;
  }

  closeLoadModal(): void {
    this.modalStageId = null;
    this.editingLoadId = null;
    this.loadForm = this.getEmptyLoadForm();
    this.formSubmitted = false;
  }

  saveLoad(): void {
    this.formSubmitted = true;
    if (!this.isLoadFormValid() || !this.activeStage) {
      return;
    }

    const cleanedForm: LoadForm = {
      colorName: this.loadForm.colorName.trim(),
      colorCode: this.loadForm.colorCode || DEFAULT_COLOR,
      groupNames: this.loadForm.groupNames.trim(),
      comment: this.loadForm.comment.trim()
    };

    if (this.editingLoadId) {
      this.activeStage.loads = this.activeStage.loads.map((load) =>
        load.id === this.editingLoadId ? { ...load, ...cleanedForm } : load
      );
      this.persistState('Load updated.');
    } else {
      this.activeStage.loads = [
        ...this.activeStage.loads,
        {
          id: this.createId('load'),
          ...cleanedForm,
          done: false
        }
      ];
      this.persistState('Load added.');
    }

    this.closeLoadModal();
  }

  removeLoad(stage: StageItem, loadId: string): void {
    stage.loads = stage.loads.filter((load) => load.id !== loadId);
    this.persistState('Load removed.');
  }

  toggleLoad(load: LoadItem): void {
    load.done = !load.done;
    this.persistState(load.done ? 'Load marked done.' : 'Load marked undone.');
  }

  trackStage(_index: number, stage: StageItem): string {
    return stage.id;
  }

  trackLoad(_index: number, load: LoadItem): string {
    return load.id;
  }

  isLoadFormValid(): boolean {
    return Boolean(this.loadForm.colorName.trim() && this.loadForm.groupNames.trim());
  }

  private loadState(): void {
    this.http.get<AppState>('/api/state').subscribe({
      next: (state) => {
        this.state = this.normalizeState(state);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.statusMessage = 'Saved to Local Storage.';
      },
      error: () => {
        this.state = this.readLocalState();
        this.statusMessage = 'Using browser local storage fallback. Start the server to save project JSON.';
      }
    });
  }

  private persistState(successMessage: string): void {
    this.state = this.normalizeState(this.state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.isSaving = true;

    this.http.put<AppState>('/api/state', this.state).subscribe({
      next: (savedState) => {
        this.state = this.normalizeState(savedState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.statusMessage = `${successMessage} 'Saved to Local Storage.`;
        this.isSaving = false;
      },
      error: () => {
        this.statusMessage = `${successMessage} Saved locally; project JSON is unavailable.`;
        this.isSaving = false;
      }
    });
  }

  private readLocalState(): AppState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { stages: [] };
    }

    try {
      return this.normalizeState(JSON.parse(raw));
    } catch {
      return { stages: [] };
    }
  }

  private normalizeState(state: unknown): AppState {
    if (!state || typeof state !== 'object' || !Array.isArray((state as AppState).stages)) {
      return { stages: [] };
    }

    return {
      stages: this.renumberStages(
        (state as AppState).stages.map((stage, stageIndex) => ({
          id: typeof stage.id === 'string' ? stage.id : this.createId(`stage-${stageIndex}`),
          title: `Stage ${stageIndex + 1}`,
          done: Boolean(stage.done),
          loads: Array.isArray(stage.loads)
            ? stage.loads.map((load, loadIndex) => ({
                id: typeof load.id === 'string' ? load.id : this.createId(`load-${stageIndex}-${loadIndex}`),
                colorName: typeof load.colorName === 'string' ? load.colorName : '',
                colorCode: /^#[0-9a-f]{6}$/i.test(load.colorCode) ? load.colorCode : DEFAULT_COLOR,
                groupNames: typeof load.groupNames === 'string' ? load.groupNames : '',
                comment: typeof load.comment === 'string' ? load.comment : '',
                done: Boolean(load.done)
              }))
            : []
        }))
      )
    };
  }

  private renumberStages(stages: StageItem[]): StageItem[] {
    return stages.map((stage, index) => ({ ...stage, title: `Stage ${index + 1}` }));
  }

  private getEmptyLoadForm(): LoadForm {
    return {
      colorName: '',
      colorCode: DEFAULT_COLOR,
      groupNames: '',
      comment: ''
    };
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
  }
}


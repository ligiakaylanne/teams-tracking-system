import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { AgentSchema, CheckInSchema, AgentFormData } from '../../schemas/agent.schema';
import { Agent } from '../../services/agent.service';

export interface AgentDialogData {
  agent?: Agent;
  mode: 'create' | 'edit' | 'checkin';
}

@Component({
  selector: 'app-agent-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatDividerModule,
  ],
  templateUrl: './agent-form.component.html',
  styleUrl: './agent-form.component.css'
})
export class AgentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AgentFormComponent>);
  public data: AgentDialogData = inject(MAT_DIALOG_DATA);

  public saving = signal(false);
  public zodErrors = signal<string[]>([]);
  public agentForm!: FormGroup;
  public checkInForm!: FormGroup;
  public title = signal('');
  public titleIcon = signal('');
  public submitLabel = signal('');
  public isCheckInMode = computed(() => this.data.mode === 'checkin');

  ngOnInit(): void {
    this.initForms();
    this.setLabels();
  }

  private initForms(): void {
    this.agentForm = this.fb.group({
      name: [this.data.agent?.name ?? ''],
      registerId: [this.data.agent?.registerId ?? ''],
      status: [this.data.agent?.status ?? 'ATIVO'],
    });

    this.checkInForm = this.fb.group({
      latitude: [null],
      longitude: [null],
    });
  }

  private setLabels(): void {
    const labels: Record<string, any> = {
      create: { title: 'Novo agente de campo', submit: 'Criar agente' },
      edit:   { title: 'Editar agente', submit: 'Salvar alterações' },
      checkin: { title: 'Check-in manual', submit: 'Registrar posição' },
    };
    const l = labels[this.data.mode];
    this.title.set(l.title);
    this.titleIcon.set(l.icon);
    this.submitLabel.set(l.submit);
  }

  public fieldError(field: string): string | null {
    const ctrl = this.agentForm.get(field);
    return (ctrl?.touched && ctrl.errors?.['zodError']) ? ctrl.errors['zodError'] : null;
  }

  public checkInFieldError(field: string): string | null {
    const ctrl = this.checkInForm.get(field);
    return (ctrl?.touched && ctrl.errors?.['zodError']) ? ctrl.errors['zodError'] : null;
  }

  private validateWithZod(): boolean {
    this.zodErrors.set([]);
    this.clearFormErrors();

    if (this.data.mode === 'checkin') {
      const result = CheckInSchema.safeParse(this.checkInForm.getRawValue());
      if (!result.success) {
        result.error.issues.forEach(e => {
          this.checkInForm.get(e.path[0] as string)?.setErrors({ zodError: e.message });
        });
        this.zodErrors.set(result.error.issues.map(e => e.message));
        return false;
      }
    } else {
      const result = AgentSchema.safeParse(this.agentForm.getRawValue());
      if (!result.success) {
        result.error.issues.forEach(e => {
          this.agentForm.get(e.path[0] as string)?.setErrors({ zodError: e.message });
        });
        this.zodErrors.set(result.error.issues.map(e => e.message));
        return false;
      }
    }
    return true;
  }

  private clearFormErrors(): void {
    [this.agentForm, this.checkInForm].forEach(form => {
      Object.keys(form.controls).forEach(key => form.get(key)?.setErrors(null));
    });
  }

  public onSubmit(): void {
    if (!this.validateWithZod()) return;
    this.saving.set(true);
    const payload = this.data.mode === 'checkin' ? this.checkInForm.getRawValue() : this.agentForm.getRawValue();
    this.dialogRef.close({ type: this.data.mode, payload });
  }

  public onCancel(): void { this.dialogRef.close(null); }
}

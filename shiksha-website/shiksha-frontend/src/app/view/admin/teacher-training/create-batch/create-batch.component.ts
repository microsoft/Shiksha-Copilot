import { Component, OnInit, inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { BatchService } from 'src/app/view/admin/teacher-training/batch.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-create-batch',
  templateUrl: './create-batch.component.html',
  styleUrls: ['./create-batch.component.scss']
})
export class CreateBatchComponent implements OnInit {
  batchForm!: FormGroup;
  selectedFile: File | null = null;

  private fb = inject(FormBuilder);
  private batchService = inject(BatchService);
  private router = inject(Router);

  ngOnInit(): void {
    this.batchForm = this.fb.group({
      batchName: ['', Validators.required],
      description: ['', Validators.required],
      scheduleDate: ['', Validators.required],
      trainingType: ['', Validators.required],
      pdfFile: [null]
    });
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.selectedFile = fileList[0];
      this.batchForm.patchValue({ pdfFile: this.selectedFile });
      this.batchForm.get('pdfFile')?.updateValueAndValidity();
    } else {
      this.selectedFile = null;
      this.batchForm.patchValue({ pdfFile: null });
      this.batchForm.get('pdfFile')?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.batchForm.valid) {
      const formData = new FormData();
      formData.append('batchName', this.batchForm.get('batchName')?.value);
      formData.append('description', this.batchForm.get('description')?.value);
      formData.append('scheduleDate', this.batchForm.get('scheduleDate')?.value);
      formData.append('trainingType', this.batchForm.get('trainingType')?.value);
      if (this.selectedFile) {
        formData.append('pdfFile', this.selectedFile, this.selectedFile.name);
      }

      this.batchService.addBatch(formData).subscribe({
        next: (response: unknown) => {
          console.log('Batch Created:', response);
          this.batchForm.reset();
          this.selectedFile = null;
          this.router.navigate(['/admin/teacher-training/view-batch']);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error creating batch:', error);
          // Handle error (e.g., show a toast message)
        }
      });
    } else {
      console.log('Form is invalid or no file selected.');
      this.batchForm.markAllAsTouched();
    }
  }
} 
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Batch, BatchService, Teacher } from 'src/app/view/admin/teacher-training/batch.service';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TeacherAbsentService } from 'src/app/view/admin/teacher-training/teacher-absent.service';
import * as ExcelJS from 'exceljs';
import confetti from 'canvas-confetti';

interface FileWithObjectURL extends File {
  objectURL: string;
}

@Component({
  selector: 'app-view-assigned-teachers',
  templateUrl: './view-assigned-teachers.component.html',
  styleUrls: ['./view-assigned-teachers.component.scss']
})
export class ViewAssignedTeachersComponent implements OnInit, OnDestroy {
  batchId!: string;
  selectedBatch: Batch | null = null;
  batches: Batch[] = [];
  presentTeachers: Teacher[] = [];
  absentTeachers: Teacher[] = [];
  photos: File[] = [];
  private batchSubscription!: Subscription;
  private batchesSubscription!: Subscription;

  // File upload properties
  selectedPhotos: FileWithObjectURL[] = [];
  selectedPdf: File | null = null;
  maxPhotoSize = 5 * 1024 * 1024; // 5MB
  maxPdfSize = 10 * 1024 * 1024; // 10MB
  allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  allowedPdfType = 'application/pdf';
  uploadError: string | null = null;
  URL = window.URL; // Add URL property for image preview
  batchPhotos:any;
  batchPdf:any

  private route = inject(ActivatedRoute);
  private batchService = inject(BatchService);
  private router = inject(Router);
  private teacherAbsentService = inject(TeacherAbsentService);

  ngOnInit(): void {
    this.batchSubscription = this.route.paramMap.subscribe(params => {
      this.batchId = params.get('batchId')!;
      this.fetchBatchDetails(this.batchId);
    });

    // Subscribe to batch service updates
    this.batchesSubscription = this.batchService.batches$.subscribe(batches => {
      if (this.selectedBatch) {
        const updatedBatch = batches.find(b => b._id === this.selectedBatch!._id);
        if (updatedBatch) {
          // Keep existing data and merge with updates
          this.selectedBatch = {
            ...this.selectedBatch,
            ...updatedBatch,
            assignedTeachers: this.selectedBatch.assignedTeachers || [],
            attendance: this.selectedBatch.attendance || []
          };
        }
      }
    });
  }

  fetchBatchDetails(batchId: string): void {
    this.batchService.getBatchById(batchId).subscribe({
      next: async (batch: Batch) => {
        // Initialize with complete data
        this.selectedBatch = {
          ...batch,
          assignedTeachers: batch.assignedTeachers || [],
          attendance: batch.attendance || []
        };

        // Clear previous selections
        this.selectedPhotos = [];
        this.selectedPdf = null;

        this.batchPhotos = batch?.photoPaths;
        this.batchPdf = {name:this.batchService.extractActualFilename(batch?.attendancePdfPath)}

        // Fetch and populate existing photos
        // if (batch.photoPaths && batch.photoPaths.length > 0) {
        //   for (const photoData of batch.photoPaths) {
        //     if (!photoData || !photoData.path) {
        //       // Skip invalid entries
        //       continue;
        //     }
        //     try {
        //       const photoBlob = await this.batchService.getFile(photoData.path).toPromise();
        //       if (photoBlob) {
        //         // Use the mimetype fetched from the backend to create the File object
        //         const photoFile = new File([photoBlob], photoData.path.substring(photoData.path.lastIndexOf('/') + 1), { type: photoData.mimetype });
        //         (photoFile as FileWithObjectURL).objectURL = this.URL.createObjectURL(photoFile);
        //         this.selectedPhotos.push(photoFile as FileWithObjectURL);
        //       }
        //     } catch (error) {
        //       console.error(`Error fetching photo from ${photoData.path}:`, error);
        //     }
        //   }
        // }

        // Fetch and populate existing attendance PDF
        // if (batch.attendancePdfPath) {
        //   try {
        //     const pdfBlob = await this.batchService.getFile(batch.attendancePdfPath).toPromise();
        //     if (pdfBlob) {
        //       this.selectedPdf = new File([pdfBlob], batch.attendancePdfPath.substring(batch.attendancePdfPath.lastIndexOf('/') + 1), { type: pdfBlob.type });
        //     }
        //   } catch (error) {
        //     console.error(`Error fetching PDF from ${batch.attendancePdfPath}:`, error);
        //   }
        // }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching batch details:', error);
        
        if (error.status === 403) {
          alert('Access denied. You can only view batches you created.');
        } else if (error.status === 404) {
          alert('Batch not found.');
        } else if (error.status === 401) {
          alert('Authentication required. Please log in again.');
        } else {
          alert('Error fetching batch details. Please try again.');
        }
        
        this.router.navigate(['/admin/teacher-training/view-batch']);
      }
    });
  }

  getTeacherAttendanceStatus(teacherId: string): boolean {
    if (!this.selectedBatch?.attendance) {
      return false;
    }
    return this.selectedBatch.attendance.includes(teacherId);
  }

  onAttendanceChange(teacherId: string, isPresent: boolean): void {
    if (!this.selectedBatch) {
      console.error('No batch selected for attendance update.');
      return;
    }

    if (this.selectedBatch.isSubmitted) {
      console.warn('Cannot change attendance for a submitted batch.');
      return;
    }

    const batchId = this.selectedBatch._id!;
    const currentAttendance = [...(this.selectedBatch.attendance || [])];
    let updatedAttendance: string[];

    if (isPresent) {
      if (!currentAttendance.includes(teacherId)) {
        updatedAttendance = [...currentAttendance, teacherId];
      } else {
        updatedAttendance = currentAttendance;
      }
    } else {
      updatedAttendance = currentAttendance.filter(id => id !== teacherId);
    }

    // Create a new batch object with updated attendance
    const updatedBatch = {
      ...this.selectedBatch,
      attendance: updatedAttendance
    };

    // Update local state immediately
    this.selectedBatch = updatedBatch;

    // Update server
    this.batchService.updateAttendance(batchId, updatedAttendance).subscribe({
      next: (response: Batch) => {
        // Merge server response with current state
        this.selectedBatch = {
          ...this.selectedBatch,
          ...response,
          assignedTeachers: this.selectedBatch?.assignedTeachers || [],
          attendance: updatedAttendance
        };
        this.batchService.updateBatchInList(this.selectedBatch);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error updating attendance:', error);
        // Revert to previous state
        if (this.selectedBatch) {
          this.selectedBatch = {
            ...this.selectedBatch,
            attendance: currentAttendance
          };
        }
        
        if (error.status === 403) {
          alert('Access denied. You can only update batches you created.');
        } else if (error.status === 404) {
          alert('Batch not found.');
        } else {
          alert('Error updating attendance. Please try again.');
        }
      }
    });
  }

  onRemoveAssignedTeacher(batch: Batch, teacher: Teacher): void {
    if (batch.isSubmitted) {
      console.warn('Cannot remove teachers from a submitted batch.');
      return;
    }

    if (!batch._id || !teacher._id) {
      console.error('Batch ID or Teacher ID is missing.');
      return;
    }

    if (confirm(`Are you sure you want to remove ${teacher.name} from ${batch.batchName}?`)) {
      const currentAttendance = [...(this.selectedBatch?.attendance || [])];
      const updatedAttendance = currentAttendance.filter(id => id !== teacher._id);
      
      this.batchService.removeTeacherFromBatch(batch._id, teacher._id).subscribe({
        next: (updatedBatch: Batch) => {
          this.selectedBatch = {
            ...updatedBatch,
            attendance: updatedAttendance
          };
          this.batchService.updateBatchInList(this.selectedBatch);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error removing teacher from batch:', error);
          
          if (error.status === 403) {
            alert('Access denied. You can only remove teachers from batches you created.');
          } else if (error.status === 404) {
            alert('Batch or teacher not found.');
          } else {
            alert('Error removing teacher from batch. Please try again.');
          }
        }
      });
    }
  }

  onPhotoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      
      // Validate number of photos
      if (this.selectedPhotos.length + files.length > 2) {
        this.uploadError = 'You can only upload a maximum of 2 photos';
        return;
      }

      // Validate each file
      for (const file of files) {
        if (!this.allowedPhotoTypes.includes(file.type)) {
          this.uploadError = 'Only JPG, JPEG, and PNG files are allowed for photos';
          return;
        }
        if (file.size > this.maxPhotoSize) {
          this.uploadError = 'Photo size should not exceed 5MB';
          return;
        }
        // Create object URL immediately and attach it to the file object
        (file as FileWithObjectURL).objectURL = this.URL.createObjectURL(file);
      }

      this.selectedPhotos = [...this.selectedPhotos, ...files.map(file => file as FileWithObjectURL)];
      this.uploadError = null;
    }
  }

  onPdfSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      if (file.type !== this.allowedPdfType) {
        this.uploadError = 'Only PDF files are allowed';
        return;
      }
      if (file.size > this.maxPdfSize) {
        this.uploadError = 'PDF size should not exceed 10MB';
        return;
      }

      this.selectedPdf = file;
      this.uploadError = null;
    }
  }

  removePhoto(index: number): void {
    if (this.selectedPhotos[index] && (this.selectedPhotos[index] as FileWithObjectURL).objectURL) {
      this.URL.revokeObjectURL((this.selectedPhotos[index] as FileWithObjectURL).objectURL);
    }
    this.selectedPhotos.splice(index, 1);
  }

  removePdf(): void {
    this.selectedPdf = null;
  }

  onSaveAndSubmit(batchId: string | undefined): void {
    if (!batchId) {
      console.error('Batch ID is missing.');
      return;
    }

    if (confirm('Are you sure you want to save and submit this batch? Once submitted, it cannot be modified.')) {
      const currentData = {
        assignedTeachers: this.selectedBatch?.assignedTeachers || [],
        attendance: this.selectedBatch?.attendance || []
      };

      // Only upload files if they are selected
      if (this.selectedPhotos.length > 0 || this.selectedPdf) {
        const formData = new FormData();
        this.selectedPhotos.forEach((photo) => {
          formData.append('photos', photo);
        });
        if (this.selectedPdf) {
          formData.append('attendanceSheetFile', this.selectedPdf);
        }

        // First upload files if any
        this.batchService.uploadBatchFiles(batchId, formData).subscribe({
          next: () => {
            this.submitBatch(batchId, currentData);
          },
          error: (error: HttpErrorResponse) => {
            console.error('Error uploading files:', error);
            this.uploadError = 'Error uploading files. Please try again.';
          }
        });
      } else {
        // Submit batch without files
        this.submitBatch(batchId, currentData);
      }
    }
  }

  private submitBatch(batchId: string, currentData: { assignedTeachers: Teacher[]; attendance: string[] }): void {
    this.batchService.submitBatch(batchId).subscribe({
      next: (updatedBatch: Batch) => {
        if (this.selectedBatch) {
          const newBatch: Batch = {
            ...updatedBatch,
            ...currentData
          };
          this.selectedBatch = newBatch;
          this.batchService.updateBatchInList(newBatch);
          
          // Trigger celebration animation after successful submission
          this.triggerCelebration();
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error submitting batch:', error);
        
        if (error.status === 403) {
          alert('Access denied. You can only submit batches you created.');
        } else if (error.status === 404) {
          alert('Batch not found.');
        } else {
          alert('Error submitting batch. Please try again.');
        }
      }
    });
  }

  private triggerCelebration(): void {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  }

  goBack(): void {
    this.router.navigate(['/admin/teacher-training/view-batch']);
  }

  getPresentCount(): number {
    if (!this.selectedBatch?.attendance) {
      return 0;
    }
    // Count only teachers who are both assigned and marked present
    return this.selectedBatch.attendance.filter(teacherId => 
      this.selectedBatch?.assignedTeachers?.some(teacher => teacher._id === teacherId)
    ).length;
  }

  getAbsentCount(): number {
    return this.getAbsentTeachers().length;
  }

  getAbsentTeachers(): Teacher[] {
    if (!this.selectedBatch?.assignedTeachers) {
      return [];
    }
    // Count teachers who are assigned but not marked present
    return this.selectedBatch.assignedTeachers.filter(teacher => 
      !this.selectedBatch?.attendance?.includes(teacher._id!)
    );
  }

  getPresentTeachers(): Teacher[] {
    if (!this.selectedBatch?.attendance || !this.selectedBatch?.assignedTeachers) {
      return [];
    }
    const assignedTeachers = this.selectedBatch.assignedTeachers;
    return this.selectedBatch.attendance.filter(teacherId => 
      assignedTeachers.some(teacher => teacher._id === teacherId)
    ).map(teacherId => assignedTeachers.find(teacher => teacher._id === teacherId))
     .filter((teacher): teacher is Teacher => teacher !== undefined);
  }

  // Convert File to Base64
  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  downloadReport() {
    if (this.selectedBatch && this.selectedBatch._id) {
      const batchId = this.selectedBatch._id;
      this.batchService.downloadBatchExcelReport(batchId).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `teacher-report-${batchId}.xlsx`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
        },
        error: () => {
          alert('Failed to download report');
        }
      });
    } else {
      console.error('Cannot download report: Missing required batch information');
    }
  }

  async generateAttendanceSheet() {
    if (!this.selectedBatch || !this.selectedBatch.assignedTeachers || this.selectedBatch.assignedTeachers.length === 0) {
      alert('No teachers assigned to this batch.');
      return;
    }

    const batch = this.selectedBatch;
    const teachers: Teacher[] = batch.assignedTeachers || [];
    const batchName = batch.batchName || '';
    const batchDate = batch.scheduleDate ? new Date(batch.scheduleDate) : null;
    const formattedDate = batchDate ? batchDate.toLocaleDateString() : '';

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Sheet');

    // Title row
    worksheet.mergeCells('A1', 'H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Attendance Sheet – Batch ${batchName}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };

    // Header row
    const headerRow = worksheet.addRow([
      'S.No', 'Teacher Name', 'Phone', 'Zone', 'District', 'Date', 'Signature'
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

    // Data rows
    for (let idx = 0; idx < teachers.length; idx++) {
      const teacher = teachers[idx];
      worksheet.addRow([
        idx + 1,
        teacher.name || '',
        teacher.phone || '',
        teacher.zone || '',
        teacher.district || '',
        formattedDate,
        '' // Signature column left blank
      ]);
    }

    // Autofit columns
    worksheet.columns.forEach(column => {
      let maxLength = 10;
      if (typeof column.eachCell === 'function') {
        column.eachCell({ includeEmpty: true }, cell => {
          const cellValue = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, cellValue.length + 2);
        });
      }
      column.width = maxLength;
    });

    // Add border to all cells
    worksheet.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: false }, cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Download the Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Sheet_${batchName.replace(/\s+/g, '_')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.batchSubscription) {
      this.batchSubscription.unsubscribe();
    }
    if (this.batchesSubscription) {
      this.batchesSubscription.unsubscribe();
    }

    // Revoke all object URLs to prevent memory leaks
    this.selectedPhotos.forEach(photo => {
      if ((photo as FileWithObjectURL).objectURL) {
        this.URL.revokeObjectURL((photo as FileWithObjectURL).objectURL);
      }
    });
  }
}


import { Component, Inject } from '@angular/core';
import {
  FormBuilder, FormGroup, FormArray, Validators,
  FormControl, AbstractControl, ValidatorFn
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BaselineSurveyService } from 'src/app/core/services/baseline-survey.service';

@Component({
  selector: 'app-baseline-survey',
  templateUrl: './baseline-survey.component.html',
  styleUrls: ['./baseline-survey.component.scss']
})
export class BaselineSurveyComponent {
  surveyForm: FormGroup;
  submitting = false;
  error: string | null = null;

  // Options
  planOptions = ['Paper-based', 'Digital documents (Word/Google Docs/PowerPoint)'];
  deviceOptions = [
    'School desktop/laptop/tablet',
    'Personal desktop/laptop/tablet',
    'Personal mobile phone',
    'Not applicable'
  ];
  weeklyOptions = ['1', '2', '3', '4', 'More than 5'];
  componentOptions = [
    'Hands-on activities',
    'Real-world examples or analogies',
    'Stories',
    'Videos',
    'Others' // "Others" has input
  ];
  timeOptions = ['30 minutes', '60 minutes', '90 minutes', 'Others'];//"Others" has input
  resourceOptions = [
    'Educational websites (Khan Academy)',
    'Diksha',
    'YouTube',
    'Others' // "Others" has input
  ];
  assessOptions = ['30 minutes', '60 minutes', '90 minutes', 'Others']; //"Others" has input

  constructor(
    private fb: FormBuilder,
    private surveyService: BaselineSurveyService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<BaselineSurveyComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.surveyForm = this.fb.group({
      plans: this.fb.array([], [Validators.required, this.minSelectedCheckboxes(1)]),
      devices: this.fb.array([], [Validators.required, this.minSelectedCheckboxes(1)]),
      weeklyLessonPlans: ['', Validators.required],
      lessonPlanComponents: this.fb.array([], [Validators.required, this.minSelectedCheckboxes(1)]),
      timePerLessonPlan: ['', Validators.required],
      resourcesUsed: this.fb.array([], [Validators.required, this.minSelectedCheckboxes(1)]),
      timeForAssessments: ['', Validators.required],
      otherNotes: [''],

      // NEW: "Others" free-text fields
      otherLessonPlanComponent: [''],   // when "Others" is checked in components
      otherResourceUsed: [''],          // when "Others" is checked in resources
      otherTimePerLessonPlan: [''],     // when timePerLessonPlan = "Others"
      otherTimeForAssessments: ['']     // when timeForAssessments = "Others"
    });
  }

  /** Custom validator for minimum selected checkboxes */
  private minSelectedCheckboxes(min: number = 1): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!(control instanceof FormArray)) return null;
      const totalSelected = control.controls
        .map(c => c.value)
        .reduce((prev, next) => (next ? prev + 1 : prev), 0);
      return totalSelected >= min ? null : { required: true };
    };
  }

  toggleArray(controlName: string, value: string): void {
    const formArray = this.surveyForm.get(controlName) as FormArray;
    const index = formArray.value.indexOf(value);
    if (index === -1) {
      formArray.push(new FormControl(value));
    } else {
      formArray.removeAt(index);
    }
    formArray.updateValueAndValidity();
  }

  isChecked(controlName: string, value: string): boolean {
    const formArray = this.surveyForm.get(controlName) as FormArray;
    return formArray.value.includes(value);
  }

  // NEW: convenience getters for showing "Others" inputs
  get showOtherLessonComponent(): boolean {
    return this.isChecked('lessonPlanComponents', 'Others');
  }

  get showOtherResourceUsed(): boolean {
    return this.isChecked('resourcesUsed', 'Others');
  }

  get showOtherTimePerLessonPlan(): boolean {
    return this.surveyForm.get('timePerLessonPlan')?.value === 'Others';
  }

  get showOtherTimeForAssessments(): boolean {
    return this.surveyForm.get('timeForAssessments')?.value === 'Others';
  }

  onSubmit(): void {
    if (this.surveyForm.invalid) {
      this.markTouched(this.surveyForm);
      this.error = 'Please fill in all required fields.';
      return;
    }

    this.submitting = true;
    this.error = null;

    const formValue = this.surveyForm.value;

    // OPTIONAL: if you want to merge "Others" text into arrays,
    // uncomment these lines and adjust your API side if needed.

    // if (formValue.otherLessonPlanComponent) {
    //   formValue.lessonPlanComponents = formValue.lessonPlanComponents
    //     .filter((v: string) => v !== 'Others')
    //     .concat(`Others: ${formValue.otherLessonPlanComponent}`);
    // }
    // if (formValue.otherResourceUsed) {
    //   formValue.resourcesUsed = formValue.resourcesUsed
    //     .filter((v: string) => v !== 'Others')
    //     .concat(`Others: ${formValue.otherResourceUsed}`);
    // }

    this.surveyService.submitSurvey(formValue).subscribe({
      next: (response) => {
        this.submitting = false;
        if (response.success) {
          this.snackBar.open('Survey submitted successfully!', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close(true);
        } else {
          this.error = response.message || 'Failed to submit survey. Please try again.';
        }
      },
      error: (error) => {
        console.error('Error submitting survey:', error);
        this.error = 'An error occurred while submitting the survey. Please try again.';
        this.submitting = false;
      }
    });
  }

  onClose(): void {
    if (this.data?.force) {
      return;
    }
    if (this.surveyForm.dirty) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.dialogRef.close(false);
      }
    } else {
      this.dialogRef.close(false);
    }
  }

  private markTouched(group: FormGroup | FormArray) {
    Object.values(group.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markTouched(control);
      }
    });
  }
}

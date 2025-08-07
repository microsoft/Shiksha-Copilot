import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormControl,
  UntypedFormGroup,
} from '@angular/forms';
import { FormDropDownConfig } from '../../interfaces/form-dropdown.interface';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-form-dropdown',
  standalone: true,
  imports: [CommonModule, NgSelectModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './form-dropdown.component.html',
  styleUrls: ['./form-dropdown.component.scss'],
})
export class FormDropdownComponent implements OnInit {
  @Input() dropDownValues: any[] = [];

  @Input() dropDownControlName!: string;

  @Input() dropDownCtrl!: UntypedFormControl;

  @Input() config!: FormDropDownConfig;

  @Input() submitted = false;

  @Input() mode!: string;

  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();


  formGroupTemp!: UntypedFormGroup;

  /**
   * Angular oninit lifecycle hook used for initialization
   */
  ngOnInit(): void {
    const obj: any = {};
    obj[this.dropDownControlName] = new UntypedFormControl(null);
    this.formGroupTemp = new UntypedFormGroup(obj);
  }

  /**
   * Function to remove chip value
   * @param i index
   */
  removeItem(i:number){
    let updatedArr:string[] = structuredClone(this.dropDownCtrl?.value);
    updatedArr = updatedArr.filter(item => item !== this.dropDownCtrl?.value[i]);
    this.dropDownCtrl?.setValue(updatedArr)
    this.valueChange.emit(updatedArr.join());
  }

  /**
   * Function to emit value change
   * @param val 
   */
  valueSelected(val:any){
    this.valueChange.emit(val);
  }

  public onSelectAll() {
    if (this.config.selectAllValue) {
      let data = this.dropDownValues.map((e) =>
        this.config?.selectAllValue ? e[this.config.selectAllValue] : e
      );
      this.dropDownCtrl.setValue(data);
      this.valueChange.emit(data.toString());
    } else {
      this.dropDownCtrl.setValue(this.dropDownValues);
      this.valueChange.emit(this.dropDownValues.join());
    }
  }

  public onClearAll() {
    this.dropDownCtrl.setValue([]);
    this.valueChange.emit('');
  }

  toggleSelection(item: any) {
    let currentVal = this.dropDownCtrl?.value;
    const index = currentVal.findIndex((i: any) => i === item);
    if (index === -1) {
      currentVal.push(item);
      this.dropDownCtrl.setValue(currentVal);
    } else {
      currentVal.splice(index, 1);
      this.dropDownCtrl.setValue(currentVal);
    }
  }

  toggleSelectAll(event: any) {
    if (event.target.checked) {
      if (this.config.selectAllValue) {
        let data = this.dropDownValues.map((e) =>
          this.config?.selectAllValue ? e[this.config.selectAllValue] : e
        );
        this.dropDownCtrl.setValue(data);
        this.valueChange.emit(data.join());
      } else {
        this.dropDownCtrl.setValue(this.dropDownValues);
        this.valueChange.emit(this.dropDownValues.join());
      }
    } else {
      this.dropDownCtrl.setValue([]);
      this.valueChange.emit('');
    }
  }

  isSelectAll() {
    return this.dropDownCtrl.value?.length === this.dropDownValues?.length;
  }

  isSelected(item: any) {
    return this.dropDownCtrl.value.some((i: any) => i === item);
  }

  public get hasSelections(): boolean {
    return this.dropDownCtrl.value?.length > 0;
  }
}

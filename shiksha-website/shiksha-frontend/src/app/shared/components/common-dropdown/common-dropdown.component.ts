import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropDownConfig } from '../../interfaces/dropdown.interface';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-common-dropdown',
  standalone: true,
  imports: [CommonModule, NgSelectModule, FormsModule, TranslateModule],
  templateUrl: './common-dropdown.component.html',
  styleUrls: ['./common-dropdown.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CommonDropdownComponent),
      multi: true,
    },
  ],
})
export class CommonDropdownComponent implements ControlValueAccessor {
  @Input() dropDownValues: any[] = [];

  @Input() config!: DropDownConfig;

  @Output() valueUpdate: EventEmitter<string> = new EventEmitter<string>();

  selectedItem: any;

  @Input() mode!: string;


  /**
   * Function trigger for dropdown value change
   * @param val change event value
   */
  valueSelected(val: any) {
    this.valueUpdate.emit(this.selectedItem);    
  }
  

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any) {
    this.selectedItem = value;
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }
}

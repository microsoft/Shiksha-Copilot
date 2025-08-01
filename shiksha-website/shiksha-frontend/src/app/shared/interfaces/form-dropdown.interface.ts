export interface FormDropDownConfig {
  isBackground: boolean;
  height: string;
  placeHolderTxt: string;
  disabled?: boolean;
  fieldName: string;
  multi?: boolean;
  clearableOff?: boolean;
  hideLabel?: boolean;
  searchable?: boolean;
  hideChips?: boolean;
  bindLable?: string;
  bindValue?: string;
  chipValueType?: string;
  chipClearableOff?:boolean;
  selectAllOption?:boolean;
  selectAllValue?:string;
  required?: boolean;
  openOnSelect?: boolean;
}
